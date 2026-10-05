const claimInput = document.querySelector('#claimInput');
const charCount = document.querySelector('#charCount');
const investigateButton = document.querySelector('#investigateButton');
const report = document.querySelector('#report');
const toast = document.querySelector('#toast');
const tabs = document.querySelectorAll('.input-tab');
const suggestions = document.querySelectorAll('.suggestion');

function updateCount() {
  charCount.textContent = `${claimInput.value.length.toLocaleString()} / 5,000`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function escapeHtml(value = '') {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function formatDate(value) {
  if (!value) return 'Recent';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderReport(data) {
  const stanceDetails = {
    supports: { icon: '✓', status: 'supporting', tag: 'Supports source', tagClass: 'supports' },
    contradicts: { icon: '×', status: 'contradicting', tag: 'Contradicts claim', tagClass: 'contradicts' },
    context: { icon: '◌', status: 'context', tag: 'Context', tagClass: 'context-tag' }
  };
  const evidence = (data.evidence || []).slice(0, 3).map((item) => {
    const detail = stanceDetails[item.stance] || stanceDetails.context;
    return `<div class="evidence-item"><div class="evidence-status ${detail.status}">${detail.icon}</div><div class="evidence-content"><div class="evidence-title"><strong>${escapeHtml(item.title)}</strong><span class="evidence-tag ${detail.tagClass}">${detail.tag}</span></div><p>${escapeHtml(item.description)}</p><div class="source-line"><span class="source-favicon city">↗</span><span>Live web source</span><span class="source-date">${escapeHtml(formatDate(item.date))}</span></div></div></div>`;
  }).join('');
  const timeline = (data.timeline || []).slice(0, 3).map((item, index) => `<div class="timeline-point ${index === 2 ? 'current' : ''}"><span></span><div><strong>${escapeHtml(formatDate(item.date))}</strong><p>${escapeHtml(item.description)}</p></div></div>`).join('');
  const sources = (data.sources || []).slice(0, 6).map((source) => `<a class="source-link" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)} <span>↗</span></a>`).join('');
  const verdictClass = (data.verdict || '').toLowerCase().includes('false') ? 'false' : (data.verdict || '').toLowerCase().includes('support') ? 'supported' : '';
  report.innerHTML = `<div class="report-header"><div><div class="eyebrow compact"><span class="eyebrow-dot"></span>Live investigation · ${data.aiAssisted ? 'AI assisted' : 'Source scan'}</div><h2>Investigation report</h2></div><div class="report-meta"><span class="status-pill"><span></span>Complete</span><span>Now · ${data.sourceCount} live sources</span><button class="share-button" type="button">↗ Share</button></div></div><div class="report-grid"><article class="verdict-panel"><div class="panel-label">Overall verdict</div><div class="verdict-row"><div class="verdict-icon ${verdictClass}">!</div><div><h3>${escapeHtml(data.verdict || 'Unclear')}</h3><p>${data.aiAssisted ? 'Compared against retrieved web evidence.' : 'Live sources found; AI synthesis is not configured.'}</p></div></div><div class="confidence"><div><span>Confidence</span><strong>${Number(data.confidence) || 0}%</strong></div><div class="confidence-track"><span style="width:${Number(data.confidence) || 0}%"></span></div><small>${data.aiAssisted ? 'Based on source agreement and evidence quality' : 'Heuristic confidence; configure AI for a reasoned verdict'}</small></div></article><article class="summary-panel"><div class="panel-label">The short version</div><p>${escapeHtml(data.summary || 'No summary was returned.')}</p><a href="#evidence" class="text-link">Read the reasoning <span>↓</span></a></article></div><div class="evidence-layout" id="evidence"><div class="evidence-main"><div class="section-heading"><h3>Evidence breakdown</h3><span>${data.evidence?.length || 0} signals analyzed</span></div><div class="evidence-list">${evidence || '<p class="empty-state">No evidence records were returned.</p>'}</div><div class="live-sources"><div class="section-heading"><h3>Open sources</h3><span>Retrieved from the live web</span></div>${sources}</div></div><aside class="timeline-panel"><div class="section-heading"><h3>Timeline</h3><span>Live</span></div><div class="timeline">${timeline || '<p class="empty-state">No dated events found.</p>'}</div></aside></div>`;
}

claimInput.addEventListener('input', updateCount);

suggestions.forEach((suggestion) => {
  suggestion.addEventListener('click', () => {
    claimInput.value = suggestion.dataset.sample;
    updateCount();
    claimInput.focus();
  });
});

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((item) => item.classList.remove('active'));
    tab.classList.add('active');
    claimInput.placeholder = tab.dataset.placeholder;
    if (tab.textContent === 'URL' && !claimInput.value.startsWith('http')) claimInput.value = '';
    updateCount();
    claimInput.focus();
  });
});

investigateButton.addEventListener('click', async () => {
  if (!claimInput.value.trim()) {
    showToast('Add a claim or URL to begin');
    claimInput.focus();
    return;
  }

  document.body.classList.add('is-investigating');
  investigateButton.innerHTML = '<span class="button-icon">✦</span>Reading the evidence <span class="button-arrow">...</span>';
  showToast('Investigation started');
  try {
    const response = await fetch(`${window.TRUTHLENS_API || ''}/api/investigate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input: claimInput.value.trim() })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'The investigation service was unavailable.');
    renderReport(data);
    document.body.classList.remove('is-investigating');
    investigateButton.innerHTML = '<span class="button-icon">✦</span>Investigate claim <span class="button-arrow">→</span>';
    report.classList.add('report-reveal');
    report.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast('Investigation complete');
  } catch (error) {
    document.body.classList.remove('is-investigating');
    investigateButton.innerHTML = '<span class="button-icon">✦</span>Investigate claim <span class="button-arrow">→</span>';
    showToast(error.message);
  }
});

updateCount();
