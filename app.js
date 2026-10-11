/* ============================================================
   TRUTHLENS — app.js  v2.0
   ============================================================ */

// ── DOM refs ────────────────────────────────────────────────
const claimInput       = document.querySelector('#claimInput');
const charCount        = document.querySelector('#charCount');
const wordCountEl      = document.querySelector('#wordCount');
const investigateBtn   = document.querySelector('#investigateButton');
const reportSection    = document.querySelector('#report');
const toast            = document.querySelector('#toast');
const tabs             = document.querySelectorAll('.input-tab');
const suggestions      = document.querySelectorAll('.suggestion');
const stageCards       = document.querySelectorAll('.stage-card');
const stageConnectors  = document.querySelectorAll('.stage-connector');
const pulseStatus      = document.querySelector('#pulseStatus');
const resetButton      = document.querySelector('#resetButton');
const insightToggle    = document.querySelector('#insightToggle');
const insightPanel     = document.querySelector('#insightPanel');
const themeToggle      = document.querySelector('#themeToggle');
const hamburger        = document.querySelector('#hamburger');
const mobileDrawer     = document.querySelector('#mobileDrawer');
const siteHeader       = document.querySelector('#siteHeader');
const backTop          = document.querySelector('#backTop');
const dropOverlay      = document.querySelector('#dropOverlay');
const ringFill         = document.querySelector('#ringFill');
const footerTime       = document.querySelector('#footerTime');
const shareButton      = document.querySelector('#shareButton');

// ── THEME ───────────────────────────────────────────────────
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  localStorage.setItem('tl-theme', t);
}
applyTheme(localStorage.getItem('tl-theme') || 'light');

themeToggle?.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
});

// ── HEADER SCROLL ───────────────────────────────────────────
window.addEventListener('scroll', () => {
  siteHeader?.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// ── HAMBURGER ───────────────────────────────────────────────
hamburger?.addEventListener('click', () => {
  const open = hamburger.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', String(open));
  mobileDrawer?.classList.toggle('open', open);
  mobileDrawer?.setAttribute('aria-hidden', String(!open));
});

document.querySelectorAll('.drawer-link').forEach(link => {
  link.addEventListener('click', () => {
    hamburger?.classList.remove('open');
    hamburger?.setAttribute('aria-expanded', 'false');
    mobileDrawer?.classList.remove('open');
    mobileDrawer?.setAttribute('aria-hidden', 'true');
  });
});

// ── FOOTER CLOCK ────────────────────────────────────────────
function updateClock() {
  if (!footerTime) return;
  footerTime.textContent = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
}
updateClock();
setInterval(updateClock, 30000);

// ── STAT COUNTER ANIMATION ───────────────────────────────────
function animateCounters() {
  document.querySelectorAll('.stat-value[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    const suffix = el.dataset.suffix || '';
    const duration = 1800;
    const start = performance.now();
    function step(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      const value = Math.round(eased * target);
      el.textContent = value.toLocaleString() + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

// Use IntersectionObserver to trigger when stat card enters view
const statCard = document.querySelector('.hero-stat-card');
if (statCard) {
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { animateCounters(); obs.disconnect(); }
  }, { threshold: 0.3 });
  obs.observe(statCard);
}

// ── HEADLINE CYCLE ANIMATION ─────────────────────────────────
const phrases = ['Then share.', 'Then verify.', 'Then think.', 'Then share.'];
let phraseIdx = 0;
const cycleEl = document.querySelector('#cycleText');

function cyclePhrase() {
  if (!cycleEl) return;
  cycleEl.style.opacity = '0';
  cycleEl.style.transform = 'translateY(8px)';
  window.setTimeout(() => {
    phraseIdx = (phraseIdx + 1) % phrases.length;
    cycleEl.textContent = phrases[phraseIdx];
    cycleEl.style.transition = 'opacity .4s, transform .4s';
    cycleEl.style.opacity = '1';
    cycleEl.style.transform = 'none';
  }, 380);
}
if (cycleEl) {
  cycleEl.style.transition = 'opacity .4s, transform .4s';
  setInterval(cyclePhrase, 3000);
}

// ── TAB INDICATOR ────────────────────────────────────────────
function updateTabIndicator() {
  const activeTab = document.querySelector('.input-tab.active');
  const indicator = document.querySelector('.tab-indicator');
  if (!activeTab || !indicator) return;
  indicator.style.left  = activeTab.offsetLeft + 'px';
  indicator.style.width = activeTab.offsetWidth + 'px';
}
updateTabIndicator();

// ── CHAR / WORD COUNT + RING ─────────────────────────────────
const MAX_CHARS = 5000;
const RING_CIRC = 100;

function updateCount() {
  const len  = claimInput.value.length;
  const words = claimInput.value.trim() ? claimInput.value.trim().split(/\s+/).length : 0;
  charCount.textContent = `${len.toLocaleString()} / ${MAX_CHARS.toLocaleString()}`;
  wordCountEl.textContent = `${words} word${words !== 1 ? 's' : ''}`;

  const pct = len / MAX_CHARS;
  const offset = RING_CIRC - pct * RING_CIRC;
  ringFill.style.strokeDashoffset = offset;
  ringFill.classList.toggle('amber', pct >= 0.8 && pct < 0.95);
  ringFill.classList.toggle('danger', pct >= 0.95);
}
updateCount();
claimInput.addEventListener('input', () => { updateCount(); autoGrow(); });

// Auto-grow textarea
function autoGrow() {
  claimInput.style.height = 'auto';
  claimInput.style.height = Math.min(claimInput.scrollHeight, 360) + 'px';
}

// ── TABS ─────────────────────────────────────────────────────
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    claimInput.placeholder = tab.dataset.placeholder;
    if (tab.textContent.trim().startsWith('URL') && !claimInput.value.startsWith('http')) claimInput.value = '';
    updateCount();
    updateTabIndicator();
    claimInput.focus();
  });
});

// Auto-detect URL paste and switch tab
claimInput.addEventListener('paste', e => {
  window.setTimeout(() => {
    const v = claimInput.value.trim();
    if (/^https?:\/\//i.test(v)) {
      const urlTab = document.querySelector('.input-tab:last-of-type');
      tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      urlTab?.classList.add('active');
      urlTab?.setAttribute('aria-selected', 'true');
      updateTabIndicator();
      showToast('URL detected — switched to URL mode');
    }
    updateCount();
    autoGrow();
  }, 10);
});

// ── DRAG-AND-DROP ────────────────────────────────────────────
let dragCounter = 0;
document.addEventListener('dragenter', e => {
  if (e.dataTransfer.types.includes('text/plain') || e.dataTransfer.types.includes('text/uri-list')) {
    dragCounter++;
    dropOverlay.classList.add('active');
    dropOverlay.removeAttribute('aria-hidden');
  }
});
document.addEventListener('dragleave', () => {
  dragCounter--;
  if (dragCounter <= 0) { dragCounter = 0; dropOverlay.classList.remove('active'); dropOverlay.setAttribute('aria-hidden', 'true'); }
});
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => {
  e.preventDefault();
  dragCounter = 0;
  dropOverlay.classList.remove('active');
  dropOverlay.setAttribute('aria-hidden', 'true');
  const text = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');
  if (text) { claimInput.value = text; updateCount(); autoGrow(); claimInput.focus(); showToast('Content dropped — ready to check'); }
});

// ── SUGGESTIONS ──────────────────────────────────────────────
suggestions.forEach(s => {
  s.addEventListener('click', () => {
    claimInput.value = s.dataset.sample;
    updateCount(); autoGrow();
    setPipeline('claim', 'Ready to scan');
    claimInput.focus();
  });
});

// ── INSIGHT TOGGLE ───────────────────────────────────────────
insightToggle?.addEventListener('click', () => {
  const open = insightToggle.getAttribute('aria-expanded') === 'true';
  insightToggle.setAttribute('aria-expanded', String(!open));
  insightPanel.hidden = open;
  insightToggle.querySelector('b').textContent = open ? '+' : '−';
});

// ── KEYBOARD SHORTCUTS ───────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.target === claimInput) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); investigateBtn.click(); }
    if (e.key === 'Escape') { claimInput.value = ''; updateCount(); autoGrow(); }
    return;
  }
  if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); claimInput.focus(); }
  if (e.key === 'r' || e.key === 'R') { if (!e.ctrlKey && !e.metaKey) window.location.reload(); }
});

// ── PIPELINE ─────────────────────────────────────────────────
const stages = ['claim', 'sources', 'context', 'verdict'];

function setPipeline(stage, message) {
  const activeIdx = stages.indexOf(stage);
  if (pulseStatus) pulseStatus.textContent = message;
  stageCards.forEach((card, i) => {
    card.classList.toggle('active', i === activeIdx);
    card.classList.toggle('complete', i < activeIdx);
  });
  stageConnectors.forEach((c, i) => {
    c.classList.toggle('lit', i < activeIdx);
  });
}

// ── TOAST ────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2800);
}

// ── HELPERS ──────────────────────────────────────────────────
function escapeHtml(v = '') {
  return String(v).replace(/[&<>'"/]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;','/':'&#47;' }[c]));
}
function formatDate(v) {
  if (!v) return 'Recent';
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
function domainLetter(url) {
  try { return new URL(url).hostname.replace('www.','')[0].toUpperCase(); } catch { return 'S'; }
}

// ── RENDER REPORT ─────────────────────────────────────────────
function renderReport(data) {
  // status pill
  document.querySelector('.status-pill').innerHTML = '<span></span>Complete';
  document.querySelector('.report-source-count').textContent = `Now · ${data.sourceCount} live sources`;

  // Verdict gauge
  const conf = Number(data.confidence) || 0;
  const circumference = 314;
  const offset = circumference - (conf / 100) * circumference;
  const gaugeFill = document.querySelector('#gaugeFill');
  window.setTimeout(() => { gaugeFill.style.strokeDashoffset = offset; }, 60);

  // Verdict type
  const vl = (data.verdict || '').toLowerCase();
  const isSupported = vl.includes('support') || vl.includes('true') || vl.includes('confirmed');
  const isFalse = vl.includes('false') || vl.includes('mislead') || vl.includes('incorrect');
  const isUnverified = !isSupported && !isFalse;

  const verdictIcon = document.querySelector('#verdictIcon');
  verdictIcon.textContent = isSupported ? '✓' : isFalse ? '×' : '?';
  verdictIcon.className = 'verdict-icon' + (isSupported ? ' supported' : isUnverified ? ' unverified' : '');

  if (isSupported) { gaugeFill.style.stroke = 'var(--green)'; }
  else if (isFalse) { gaugeFill.style.stroke = 'var(--rust)'; }
  else { gaugeFill.style.stroke = 'var(--gold)'; }

  document.querySelector('#verdictTitle').textContent = data.verdict || 'Unclear';
  const modeLabel = data.analysisMode || (data.aiAssisted ? 'AI assisted' : 'Source scan');
  const modeDetail = data.aiAssisted
    ? 'OpenAI compared the claim against the retrieved evidence.'
    : data.analysisMode === 'AI fallback'
      ? `OpenAI was unavailable. Source scan used${data.analysisWarning ? ' (' + data.analysisWarning + ')' : ''}.`
      : 'No API key configured — source scan used.';
  document.querySelector('#verdictDesc').textContent = modeDetail;

  // Confidence bar
  window.setTimeout(() => {
    document.querySelector('#confBar').style.width = conf + '%';
  }, 100);
  document.querySelector('#confValue').textContent = conf + '%';
  document.querySelector('#confNote').textContent = data.aiAssisted
    ? 'AI confidence based on source agreement and evidence quality'
    : 'Heuristic confidence based on source overlap';

  // Summary
  document.querySelector('#summaryText').innerHTML = escapeHtml(data.summary || 'No summary returned.');
  const textLink = document.querySelector('.text-link');
  if (textLink) { textLink.href = '#evidence'; textLink.innerHTML = 'Read the reasoning <span>&#8595;</span>'; }

  // Evidence
  const stanceMap = {
    supports:    { icon: '✓', cls: 'supporting',   tag: 'Supports',   tagCls: 'supports' },
    contradicts: { icon: '×', cls: 'contradicting', tag: 'Contradicts', tagCls: 'contradicts' },
    context:     { icon: '◌', cls: 'context',       tag: 'Context',    tagCls: 'context-tag' },
  };
  const evidenceList = document.querySelector('#evidenceList');
  const evidenceArr = (data.evidence || []).slice(0, 5);
  document.querySelector('#evidenceCount').textContent = `${evidenceArr.length} signal${evidenceArr.length !== 1 ? 's' : ''} analyzed`;

  evidenceList.innerHTML = evidenceArr.length
    ? evidenceArr.map((item, i) => {
        const d = stanceMap[item.stance] || stanceMap.context;
        const letter = domainLetter(item.url || '');
        return `<div class="evidence-item ${d.cls}" style="animation-delay:${i * 0.08}s">
  <div class="evidence-item-header" role="button" tabindex="0" aria-expanded="false">
    <div class="evidence-status">${d.icon}</div>
    <div class="evidence-title-row">
      <strong>${escapeHtml(item.title)}</strong>
      <div class="evidence-meta">
        <span class="evidence-tag ${d.tagCls}">${d.tag}</span>
        <span class="source-date">${escapeHtml(formatDate(item.date))}</span>
      </div>
    </div>
    <span class="evidence-toggle" aria-hidden="true">&#8964;</span>
  </div>
  <div class="evidence-body">
    <p>${escapeHtml(item.description)}</p>
    <div class="source-line">
      <span class="source-favicon">${escapeHtml(letter)}</span>
      <span>Live web source</span>
      <span class="source-date">${escapeHtml(formatDate(item.date))}</span>
    </div>
    ${item.url ? `<a class="read-source" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">Read source &#8599;</a>` : ''}
  </div>
</div>`;
      }).join('')
    : '<p class="empty-state">No evidence records were returned.</p>';

  // Accordion toggle
  evidenceList.querySelectorAll('.evidence-item-header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.closest('.evidence-item');
      const open = item.classList.toggle('open');
      header.setAttribute('aria-expanded', String(open));
    });
    header.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); header.click(); }
    });
  });

  // Sources
  const sourcesList = document.querySelector('#sourcesList');
  const sourcesArr = (data.sources || []).slice(0, 6);
  sourcesList.innerHTML = sourcesArr.length
    ? sourcesArr.map(s => `<a class="source-link" href="${escapeHtml(s.url)}" target="_blank" rel="noreferrer">${escapeHtml(s.title)} <span>&#8599;</span></a>`).join('')
    : '<p class="empty-state">No sources returned.</p>';

  // Timeline
  const timelineEl = document.querySelector('#timeline');
  const timelineArr = (data.timeline || []).slice(0, 4);
  timelineEl.innerHTML = timelineArr.length
    ? timelineArr.map((item, i) => `<div class="timeline-point ${i === timelineArr.length - 1 ? 'current' : ''}" style="animation-delay:${i * 0.15}s">
  <span></span>
  <div>
    <strong>${escapeHtml(formatDate(item.date))}</strong>
    <p>${escapeHtml(item.description)}</p>
  </div>
</div>`).join('')
    : '<p class="empty-state">No dated events found.</p>';
}

// ── INVESTIGATE ───────────────────────────────────────────────
investigateBtn.addEventListener('click', async () => {
  const input = claimInput.value.trim();
  if (!input) { showToast('Add a claim or URL to begin'); claimInput.focus(); return; }

  document.body.classList.add('is-investigating');
  setPipeline('claim', 'Extracting the claim...');
  investigateBtn.innerHTML = '<span class="button-icon">&#10022;</span> Investigating... <span class="button-arrow">&#8230;</span>';
  showToast('Investigation started');

  const t2 = window.setTimeout(() => setPipeline('sources', 'Scanning live sources...'), 400);
  const t3 = window.setTimeout(() => setPipeline('context', 'Comparing framing...'), 950);

  try {
    const res = await fetch(`${window.TRUTHLENS_API || ''}/api/investigate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Investigation service unavailable.');

    clearTimeout(t2); clearTimeout(t3);
    setPipeline('verdict', 'Evidence weighed ✓');
    document.body.classList.remove('is-investigating');
    investigateBtn.innerHTML = '<span class="button-icon">&#10022;</span> Check this claim <span class="button-arrow">&#8594;</span>';

    renderReport(data);
    reportSection.classList.add('report-reveal');
    window.setTimeout(() => reportSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    showToast('Investigation complete');
  } catch (err) {
    clearTimeout(t2); clearTimeout(t3);
    document.body.classList.remove('is-investigating');
    investigateBtn.innerHTML = '<span class="button-icon">&#10022;</span> Check this claim <span class="button-arrow">&#8594;</span>';
    setPipeline('claim', 'Ready to scan');
    showToast(err.message);
  }
});

// ── SHARE ─────────────────────────────────────────────────────
shareButton?.addEventListener('click', async () => {
  const text = `TruthLens check: ${claimInput.value.trim()}\n${window.location.href}`;
  try { await navigator.clipboard.writeText(text); showToast('Link copied to clipboard'); }
  catch { showToast('Copy unavailable in this browser'); }
});

// ── RESET ─────────────────────────────────────────────────────
resetButton?.addEventListener('click', () => window.location.reload());

// ── BACK TO TOP ───────────────────────────────────────────────
backTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ── INITIAL STATE ─────────────────────────────────────────────
updateCount();
