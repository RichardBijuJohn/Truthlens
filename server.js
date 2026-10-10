import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const jsonHeaders = { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' };
const userAgent = 'TruthLens/1.0 (evidence research prototype)';

try {
  const envFile = await readFile(join(root, '.env'), 'utf8');
  for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*["']?([^"']*)["']?\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
} catch {
  // Environment variables are optional; source search still works without AI.
}

const port = Number(process.env.PORT || 3000);

function sendJson(response, status, body) {
  response.writeHead(status, jsonHeaders);
  response.end(JSON.stringify(body));
}

function cleanText(value = '') {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/\s+/g, ' ').trim();
}

function extractPage(html, fallbackUrl) {
  const title = cleanText((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || new URL(fallbackUrl).hostname);
  const description = cleanText((html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']*)["']/i) || [])[1] || '');
  const body = cleanText(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' '));
  return { title, description, text: body.slice(0, 10000) };
}

async function fetchArticle(url) {
  try {
    const response = await fetch(url, { headers: { 'user-agent': userAgent }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const html = await response.text();
    return { url, ...extractPage(html, url) };
  } catch {
    return null;
  }
}

async function searchGdelt(query) {
  const endpoint = new URL('https://api.gdeltproject.org/api/v2/doc/doc');
  endpoint.searchParams.set('query', query.slice(0, 500));
  endpoint.searchParams.set('mode', 'artlist');
  endpoint.searchParams.set('maxrecords', '8');
  endpoint.searchParams.set('format', 'json');
  endpoint.searchParams.set('sort', 'datedesc');
  const response = await fetch(endpoint, { headers: { 'user-agent': userAgent }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`GDELT returned ${response.status}`);
  const data = await response.json();
  return (data.articles || []).map((article) => ({
    title: cleanText(article.title || ''),
    url: article.url,
    domain: article.domain || new URL(article.url).hostname,
    date: article.seendate || ''
  })).filter((article) => article.url);
}

async function searchGoogleNews(query) {
  const endpoint = new URL('https://news.google.com/rss/search');
  endpoint.searchParams.set('q', query.slice(0, 300));
  endpoint.searchParams.set('hl', 'en-US');
  endpoint.searchParams.set('gl', 'US');
  endpoint.searchParams.set('ceid', 'US:en');
  const response = await fetch(endpoint, { headers: { 'user-agent': userAgent }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Google News returned ${response.status}`);
  const xml = await response.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 8).map((match) => {
    const item = match[1];
    const read = (tag) => cleanText((item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')) || [])[1] || '');
    const link = read('link');
    const sourceMatch = item.match(/<source[^>]+url=["']([^"']+)["'][^>]*>([\s\S]*?)<\/source>/i);
    const sourceUrl = sourceMatch?.[1] || link;
    return { title: read('title'), url: link, domain: sourceMatch?.[2] ? cleanText(sourceMatch[2]) : (() => { try { return new URL(sourceUrl).hostname; } catch { return 'news.google.com'; } })(), date: read('pubDate') };
  }).filter((article) => article.title && article.url);
}

async function askOpenAI(claim, evidence) {
  if (!process.env.OPENAI_API_KEY) return null;
  const prompt = `You are a careful fact-checking editor. Analyze the claim only against the supplied live source records. Do not invent facts. Return valid JSON with exactly these keys: verdict (one of "Supported", "Likely misleading", "Unclear", "Likely false"), confidence (integer 0-100), summary (2 concise sentences), evidence (array of 3 objects with title, description, stance one of "supports", "contradicts", "context"), timeline (array of objects with date and description). Claim: ${claim}\n\nSources:\n${JSON.stringify(evidence)}`;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.1, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt }] }),
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`AI service returned ${response.status}`);
  const data = await response.json();
  return JSON.parse(data.choices?.[0]?.message?.content || '{}');
}

function heuristicReport(claim, articles, warning = '') {
  const stopWords = new Set(['about', 'after', 'again', 'being', 'could', 'does', 'from', 'have', 'into', 'more', 'should', 'that', 'their', 'there', 'these', 'they', 'this', 'what', 'when', 'where', 'which', 'while', 'with', 'would', 'your', 'claim', 'verify', 'fact', 'true', 'is', 'the', 'and', 'are']);
  const words = claim.toLowerCase().split(/\W+/).filter((word) => word.length > 3 && !stopWords.has(word));
  const scoredArticles = articles.map((article) => {
    const title = article.title.toLowerCase();
    const matches = words.filter((word) => title.includes(word)).length;
    return { article, matches };
  }).sort((left, right) => right.matches - left.matches);
  const matching = scoredArticles.filter((item) => item.matches >= Math.max(1, Math.ceil(words.length * 0.2))).map((item) => item.article);
  const titles = articles.map((article) => article.title.toLowerCase()).join(' ');
  const contradictionSignal = /false|fake|hoax|debunk|misleading|not true|incorrect|denied|denies|fact check/.test(titles);
  const agreement = matching.length / Math.max(articles.length, 1);
  const coverage = words.length ? Math.min(1, matching.reduce((total, article) => total + words.filter((word) => article.title.toLowerCase().includes(word)).length, 0) / (Math.max(matching.length, 1) * words.length)) : 0;
  const sourceDiversity = new Set(matching.map((article) => article.domain)).size / Math.max(matching.length, 1);
  const corroborated = matching.length >= 3 && coverage >= 0.35;
  const contradicted = contradictionSignal && matching.length >= 2;
  const verdict = contradicted ? 'Likely misleading' : corroborated ? 'Supported' : 'Unclear';
  const confidence = verdict === 'Supported'
    ? Math.round(Math.min(94, 48 + agreement * 32 + coverage * 12 + sourceDiversity * 8))
    : verdict === 'Likely misleading'
      ? Math.round(Math.max(12, Math.min(58, 20 + (1 - agreement) * 18 + (1 - coverage) * 14)))
      : Math.round(Math.min(55, 10 + agreement * 24 + coverage * 14 + sourceDiversity * 7));
  const aiMessage = warning.includes('429')
    ? 'OpenAI returned 429 (quota or rate limit), so this is a source scan rather than an AI verdict.'
    : warning
      ? `The AI service could not complete the analysis (${warning}), so this is a source scan.`
      : 'Add OPENAI_API_KEY to have the evidence compared and summarized by an AI fact-checking editor.';
  return {
    verdict,
    confidence,
    summary: `TruthLens found ${articles.length} live article records and ${matching.length} with strong topic overlap. ${aiMessage}`,
    evidence: articles.slice(0, 3).map((article, index) => ({ title: article.title, description: `Live result from ${article.domain}. ${verdict === 'Supported' ? 'This source agrees with the supplied claim topic.' : verdict === 'Likely misleading' ? 'This source contains language that may challenge or qualify the claim.' : 'Open the source to inspect the reporting directly.'}`, stance: verdict === 'Likely misleading' && index === 0 ? 'contradicts' : verdict === 'Supported' ? 'supports' : 'context' })),
    timeline: articles.slice(0, 3).map((article) => ({ date: article.date.slice(0, 8) || 'Recent', description: article.title }))
  };
}

async function investigate(input) {
  const urls = [...new Set(input.match(/https?:\/\/[^\s<>{}\[\]"']+/gi) || [])].slice(0, 5);
  const directSources = (await Promise.all(urls.map(fetchArticle))).filter(Boolean);
  const suppliedText = input.replace(/https?:\/\/[^\s<>{}\[\]"']+/gi, ' ').replace(/\s+/g, ' ').trim();
  const directContext = directSources.map((source) => `${source.title}. ${source.description || source.text.slice(0, 1800)}`).join('\n');
  const claim = [suppliedText, directContext].filter(Boolean).join('\n').slice(0, 5000);
  if (!claim) throw new Error('The supplied URL could not be read. Try pasting the claim or article text as well.');
  let provider = 'GDELT';
  let articles;
  try {
    articles = await searchGdelt(claim);
  } catch {
    provider = 'Google News RSS';
    articles = await searchGoogleNews(claim);
  }
  const fetched = await Promise.all(articles.slice(0, 5).map((article) => fetchArticle(article.url)));
  const records = [
    ...directSources.map((source) => ({ title: source.title, url: source.url, domain: new URL(source.url).hostname, date: '', excerpt: source.description || source.text.slice(0, 600), supplied: true })),
    ...articles.map((article, index) => ({ ...article, excerpt: fetched[index]?.description || fetched[index]?.text.slice(0, 600) || '' }))
  ].filter((source, index, all) => all.findIndex((item) => item.url === source.url) === index);
  let analysis;
  let analysisMode = 'Source scan';
  try {
    analysis = await askOpenAI(claim, records);
    if (!analysis) {
      analysis = heuristicReport(claim, records, 'No API key configured');
    } else {
      analysisMode = 'AI assisted';
    }
  } catch (error) {
    analysis = heuristicReport(claim, records, error.message);
    analysis.warning = error.message;
    analysisMode = 'AI fallback';
  }
  return {
    claim,
    sourceCount: records.length,
    live: true,
    provider,
    aiAssisted: analysisMode === 'AI assisted',
    analysisMode,
    analysisWarning: analysis.warning || '',
    ...analysis,
    sources: records.slice(0, 6)
  };
}

async function serveStatic(request, response) {
  const requested = request.url === '/' ? '/index.html' : request.url.split('?')[0];
  const filePath = normalize(join(root, requested));
  if (!filePath.startsWith(root)) return sendJson(response, 403, { error: 'Forbidden' });
  try {
    const content = await readFile(filePath);
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
    response.writeHead(200, { 'content-type': types[extname(filePath)] || 'application/octet-stream' });
    response.end(content);
  } catch {
    sendJson(response, 404, { error: 'Not found' });
  }
}

createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, { ...jsonHeaders, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' });
    return response.end();
  }
  if (request.method === 'POST' && request.url === '/api/investigate') {
    let body = '';
    for await (const chunk of request) body += chunk;
    try {
      const { input } = JSON.parse(body);
      if (!input || typeof input !== 'string' || input.trim().length < 10) return sendJson(response, 400, { error: 'Enter a claim, article excerpt, or URL.' });
      if (input.length > 5000) return sendJson(response, 400, { error: 'Input must be 5,000 characters or fewer.' });
      return sendJson(response, 200, await investigate(input));
    } catch (error) {
      return sendJson(response, 502, { error: `Investigation failed: ${error.message}` });
    }
  }
  return serveStatic(request, response);
}).listen(port, () => {
  console.log(`TruthLens running at http://localhost:${port}`);
  console.log(process.env.OPENAI_API_KEY ? 'AI verdicts enabled' : 'AI verdicts disabled: add OPENAI_API_KEY to .env');
});
