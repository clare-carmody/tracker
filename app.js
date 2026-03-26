// ─── Config ───────────────────────────────────────────────────────────────────
const DEFAULT_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbynxPKjighg4k5E4mjdnJFsj2bIHZyttKzjiQ6WKaGAxoHART6s90D39reInphmTE0/exec';

// ─── State ────────────────────────────────────────────────────────────────────
let currentStep = 1;
const TOTAL_STEPS = 4;
let currentPosStep = 1;
const POS_TOTAL_STEPS = 2;
let entries = JSON.parse(localStorage.getItem('protocol_entries') || '[]');

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const nowStr = now.toISOString().slice(0, 16);
  document.getElementById('f-date').value = nowStr;
  document.getElementById('pos-date').value = nowStr;

  if (!localStorage.getItem('protocol_sheets_url')) {
    localStorage.setItem('protocol_sheets_url', DEFAULT_SHEETS_URL);
  }

  setupChips();
  setupPositiveChips();
  setupIntensity();
  updateEntryCount();
  showSheetsStatus();

  document.getElementById('obs-form').addEventListener('submit', handleSubmit);
  document.getElementById('pos-form').addEventListener('submit', handlePositiveSubmit);
});

// ─── Chips (incident form) ────────────────────────────────────────────────────
function setupChips() {
  const singleGroups = [
    { gridId: 'chips-lieu',     hiddenId: 'f-lieu' },
    { gridId: 'chips-comport',  hiddenId: 'f-comport' },
    { gridId: 'chips-duree',    hiddenId: 'f-duree' },
    { gridId: 'chips-reaction', hiddenId: 'f-reaction' },
    { gridId: 'chips-fonction', hiddenId: 'f-fonction' },
  ];
  singleGroups.forEach(({ gridId, hiddenId }) => {
    const grid = document.getElementById(gridId);
    const hidden = document.getElementById(hiddenId);
    grid.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        grid.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        hidden.value = chip.dataset.value;
      });
    });
  });

  // Multi-select (antecedents)
  const multiGrid = document.getElementById('chips-ante');
  const multiHidden = document.getElementById('f-ante');
  multiGrid.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('selected');
      const selected = [...multiGrid.querySelectorAll('.chip.selected')]
        .map(c => c.dataset.value);
      multiHidden.value = selected.join(', ');
    });
  });
}

// ─── Chips (positive form) ────────────────────────────────────────────────────
function setupPositiveChips() {
  [
    { gridId: 'pos-chips-lieu',    hiddenId: 'pos-lieu' },
    { gridId: 'pos-chips-comport', hiddenId: 'pos-comport' },
  ].forEach(({ gridId, hiddenId }) => {
    const grid = document.getElementById(gridId);
    const hidden = document.getElementById(hiddenId);
    grid.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        grid.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        hidden.value = chip.dataset.value;
      });
    });
  });
}

function setupIntensity() {
  const hidden = document.getElementById('f-intensite');
  document.querySelectorAll('.intensity-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.intensity-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      hidden.value = btn.dataset.value;
    });
  });
}

// ─── Steps (incident) ─────────────────────────────────────────────────────────
function showStep(n) {
  document.querySelectorAll('#view-form .form-step').forEach(s => s.classList.remove('active'));
  document.querySelector(`#view-form .form-step[data-step="${n}"]`).classList.add('active');
  document.querySelectorAll('#view-form .step').forEach(s => {
    const sn = parseInt(s.dataset.step);
    s.classList.remove('active', 'done');
    if (sn === n) s.classList.add('active');
    else if (sn < n) s.classList.add('done');
  });
  document.getElementById('btn-prev').style.display = n > 1 ? 'inline-flex' : 'none';
  document.getElementById('btn-next').style.display = n < TOTAL_STEPS ? 'inline-flex' : 'none';
  document.getElementById('btn-submit').style.display = n === TOTAL_STEPS ? 'inline-flex' : 'none';
  currentStep = n;
}

function validateStep(n) {
  const required = {
    1: ['f-date', 'f-lieu', 'f-ante'],
    2: ['f-comport', 'f-intensite', 'f-duree'],
    3: ['f-reaction'],
    4: ['f-fonction'],
  };
  let valid = true;
  (required[n] || []).forEach(id => {
    const el = document.getElementById(id);
    if (!el.value.trim()) {
      valid = false;
      el.closest('.field-group')?.classList.add('has-error');
    } else {
      el.closest('.field-group')?.classList.remove('has-error');
    }
  });
  return valid;
}

function nextStep() {
  if (!validateStep(currentStep)) { showToast('Please fill in the required fields', true); return; }
  if (currentStep < TOTAL_STEPS) showStep(currentStep + 1);
}
function prevStep() { if (currentStep > 1) showStep(currentStep - 1); }

// ─── Steps (positive) ─────────────────────────────────────────────────────────
function showPosStep(n) {
  document.querySelectorAll('#view-positive .form-step').forEach(s => s.classList.remove('active'));
  document.querySelector(`#view-positive .form-step[data-step="${n}"]`).classList.add('active');
  document.querySelectorAll('[data-pos-step]').forEach(s => {
    const sn = parseInt(s.dataset.posStep);
    s.classList.remove('active', 'done');
    if (sn === n) s.classList.add('active');
    else if (sn < n) s.classList.add('done');
  });
  document.getElementById('pos-btn-prev').style.display = n > 1 ? 'inline-flex' : 'none';
  document.getElementById('pos-btn-next').style.display = n < POS_TOTAL_STEPS ? 'inline-flex' : 'none';
  document.getElementById('pos-btn-submit').style.display = n === POS_TOTAL_STEPS ? 'inline-flex' : 'none';
  currentPosStep = n;
}

function validatePosStep(n) {
  const required = { 1: ['pos-lieu'], 2: ['pos-comport'] };
  let valid = true;
  (required[n] || []).forEach(id => {
    const el = document.getElementById(id);
    if (!el.value.trim()) {
      valid = false;
      el.closest('.field-group')?.classList.add('has-error');
    } else {
      el.closest('.field-group')?.classList.remove('has-error');
    }
  });
  return valid;
}

function nextPosStep() {
  if (!validatePosStep(currentPosStep)) { showToast('Please fill in the required fields', true); return; }
  if (currentPosStep < POS_TOTAL_STEPS) showPosStep(currentPosStep + 1);
}
function prevPosStep() { if (currentPosStep > 1) showPosStep(currentPosStep - 1); }

// ─── Submit (incident) ────────────────────────────────────────────────────────
async function handleSubmit(e) {
  e.preventDefault();
  if (!validateStep(currentStep)) { showToast('Please fill in the required fields', true); return; }

  const data = {
    id: Date.now(),
    type: 'incident',
    date: document.getElementById('f-date').value,
    setting: document.getElementById('f-lieu').value,
    antecedents: document.getElementById('f-ante').value,
    behaviour: document.getElementById('f-comport').value,
    loggedBy: document.getElementById('f-personnes').value,
    severity: document.getElementById('f-intensite').value,
    duration: document.getElementById('f-duree').value,
    correction: document.getElementById('f-reaction').value,
    cause: document.getElementById('f-fonction').value,
    notes: document.getElementById('f-commentaires').value,
    submittedAt: new Date().toISOString(),
  };

  const btn = document.getElementById('btn-submit');
  btn.disabled = true; btn.textContent = 'Saving…';

  entries.unshift(data);
  localStorage.setItem('protocol_entries', JSON.stringify(entries));
  updateEntryCount();
  await syncToSheets(data);
  lastSavedEntryId = data.id;

  showToast('Incident logged!');
  resetForm();
  showSuggestion('incident', data.behaviour, data.severity);
  btn.disabled = false;
  btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Save entry';
}

function resetForm() {
  document.querySelectorAll('#view-form .chip').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('.intensity-btn').forEach(b => b.classList.remove('selected'));
  ['f-lieu','f-ante','f-comport','f-intensite','f-duree','f-reaction','f-fonction'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('f-personnes').value = '';
  document.getElementById('f-commentaires').value = '';
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('f-date').value = now.toISOString().slice(0, 16);
  document.querySelectorAll('#view-form .field-group').forEach(fg => fg.classList.remove('has-error'));
  showStep(1);
}

// ─── Submit (positive) ────────────────────────────────────────────────────────
async function handlePositiveSubmit(e) {
  e.preventDefault();
  if (!validatePosStep(currentPosStep)) { showToast('Please fill in the required fields', true); return; }

  const data = {
    id: Date.now(),
    type: 'positive',
    date: document.getElementById('pos-date').value,
    setting: document.getElementById('pos-lieu').value,
    loggedBy: document.getElementById('pos-personnes').value,
    behaviour: document.getElementById('pos-comport').value,
    notes: document.getElementById('pos-commentaires').value,
    submittedAt: new Date().toISOString(),
  };

  const btn = document.getElementById('pos-btn-submit');
  btn.disabled = true; btn.textContent = 'Saving…';

  entries.unshift(data);
  localStorage.setItem('protocol_entries', JSON.stringify(entries));
  updateEntryCount();
  await syncToSheets(data);
  lastSavedEntryId = data.id;

  showToast('Good behaviour logged!');
  resetPositiveForm();
  showSuggestion('positive', data.behaviour, null);
  btn.disabled = false;
  btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Save entry';
}

function resetPositiveForm() {
  document.querySelectorAll('#view-positive .chip').forEach(c => c.classList.remove('selected'));
  ['pos-lieu','pos-comport'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('pos-personnes').value = '';
  document.getElementById('pos-commentaires').value = '';
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('pos-date').value = now.toISOString().slice(0, 16);
  document.querySelectorAll('#view-positive .field-group').forEach(fg => fg.classList.remove('has-error'));
  showPosStep(1);
}

// ─── Sheets sync ──────────────────────────────────────────────────────────────
async function syncToSheets(data) {
  const sheetsUrl = localStorage.getItem('protocol_sheets_url');
  if (!sheetsUrl) return;
  try {
    await fetch(sheetsUrl, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (err) { console.warn('Sheets sync failed:', err); }
}

// ─── Views ────────────────────────────────────────────────────────────────────
function showForm() {
  ['view-history','view-positive'].forEach(id => document.getElementById(id).classList.remove('active'));
  document.getElementById('view-form').classList.add('active');
}
function showPositiveForm() {
  ['view-form','view-history'].forEach(id => document.getElementById(id).classList.remove('active'));
  document.getElementById('view-positive').classList.add('active');
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('pos-date').value = now.toISOString().slice(0, 16);
}
function showHistory() {
  ['view-form','view-positive'].forEach(id => document.getElementById(id).classList.remove('active'));
  document.getElementById('view-history').classList.add('active');
  renderHistory();
}

// ─── History ──────────────────────────────────────────────────────────────────
function renderHistory() {
  const list = document.getElementById('history-list');
  const empty = document.getElementById('history-empty');
  list.innerHTML = '';

  if (!entries.length) { empty.classList.add('visible'); return; }
  empty.classList.remove('visible');

  entries.forEach(e => {
    const dateStr = e.date
      ? new Date(e.date).toLocaleString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
      : '—';
    const card = document.createElement('div');

    if (e.type === 'positive') {
      card.className = 'entry-card entry-positive';
      card.innerHTML = `
        <div class="entry-date">${dateStr}</div>
        <div class="entry-main">
          <div class="entry-behavior">${e.behaviour || '—'}</div>
          <div class="entry-meta">
            ${e.setting ? `<span class="tag tag-lieu">${e.setting}</span>` : ''}
            <span class="tag tag-positif">Good behaviour</span>
            ${e.loggedBy ? `<span class="tag tag-lieu">by ${e.loggedBy}</span>` : ''}
          </div>
          ${e.notes ? `<div class="entry-notes">${e.notes}</div>` : ''}
        </div>
        <button class="entry-delete" onclick="deleteEntry(${e.id})" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        </button>
      `;
    } else {
      const sevClass = e.severity === 'Serious' ? 'tag-intensite-3' : e.severity === 'Moderate' ? 'tag-intensite-2' : 'tag-intensite-1';
      card.className = 'entry-card';
      card.innerHTML = `
        <div class="entry-date">${dateStr}</div>
        <div class="entry-main">
          <div class="entry-behavior">${e.behaviour || '—'}</div>
          <div class="entry-meta">
            ${e.setting ? `<span class="tag tag-lieu">${e.setting}</span>` : ''}
            ${e.severity ? `<span class="tag ${sevClass}">${e.severity}</span>` : ''}
            ${e.correction ? `<span class="tag tag-lieu">${e.correction}</span>` : ''}
            ${e.loggedBy ? `<span class="tag tag-lieu">by ${e.loggedBy}</span>` : ''}
          </div>
          ${e.notes ? `<div class="entry-notes">${e.notes}</div>` : ''}
        </div>
        <button class="entry-delete" onclick="deleteEntry(${e.id})" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        </button>
      `;
    }
    list.appendChild(card);
  });
}

function deleteEntry(id) {
  entries = entries.filter(e => e.id !== id);
  localStorage.setItem('protocol_entries', JSON.stringify(entries));
  updateEntryCount();
  renderHistory();
}

function updateEntryCount() {
  document.getElementById('entry-count').textContent = entries.length;
}

// ─── Export CSV ───────────────────────────────────────────────────────────────
function exportCSV() {
  const headers = ['Type','Date','Setting','Antecedents','Behaviour','Logged By','Severity','Duration','Correction','Cause','Notes'];
  const rows = entries.map(e => [
    e.type === 'positive' ? 'Good Behaviour' : 'Incident',
    e.date, e.setting, e.antecedents || '', e.behaviour,
    e.loggedBy || '', e.severity || '', e.duration || '',
    e.correction || '', e.cause || '', e.notes || ''
  ].map(v => `"${(v||'').replace(/"/g,'""')}"`).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `protocol-log_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Config ───────────────────────────────────────────────────────────────────
function showSheetsStatus() {
  const url = localStorage.getItem('protocol_sheets_url');
  document.getElementById('sheets-status-bar')?.remove();

  const bar = document.createElement('div');
  bar.id = 'sheets-status-bar';
  bar.className = `sheets-status ${url ? 'configured' : 'not-configured'}`;
  bar.onclick = openConfig;
  bar.innerHTML = url
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Connected to Google Sheets — click to change`
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Google Sheets not connected — click to set up`;

  const formCard = document.querySelector('#view-form .form-card');
  formCard.parentNode.insertBefore(bar, formCard);
}

function openConfig() {
  document.getElementById('sheets-url').value = localStorage.getItem('protocol_sheets_url') || '';
  document.getElementById('modal-config').classList.add('open');
}
function closeConfig() {
  document.getElementById('modal-config').classList.remove('open');
}
function saveConfig() {
  const url = document.getElementById('sheets-url').value.trim();
  if (url) { localStorage.setItem('protocol_sheets_url', url); showToast('URL saved!'); }
  else { localStorage.removeItem('protocol_sheets_url'); showToast('Config cleared'); }
  closeConfig();
  showSheetsStatus();
}
function handleModalClick(e) { if (e.target === e.currentTarget) closeConfig(); }

// ─── Suggestions ─────────────────────────────────────────────────────────────

const SUGGESTIONS = {

  funishments: [
    "Write \"I will behave\" 50 times with your non-dominant hand",
    "Recite all your rules from memory — restart if you make a mistake",
    "Perform a silly forfeit of Mistress's choosing",
    "Write a short poem about your misbehaviour and read it aloud",
    "Wear something embarrassing at home for the rest of the evening",
    "15 minutes of the most tedious household chore Mistress can find",
    "Stand in the corner and think about what you did — no phone",
    "Write a dramatic confession letter, as over-the-top as possible",
  ],

  minor: [
    "Write a reflection: why this behaviour is unacceptable (minimum one page)",
    "Early bedtime tonight — no exceptions",
    "No social media or entertainment for the rest of the day",
    "20 minutes of a repetitive, boring task chosen by Mistress",
    "Kneel in position for 10 minutes and reflect in silence",
    "Denial of one small daily pleasure of Mistress's choosing",
    "Write \"I will remember my place\" 100 times",
    "A formal verbal apology, delivered on your knees",
  ],

  moderate: [
    "Orgasm denial for 24 hours",
    "No phone or social media privileges for 24 hours",
    "Write a formal written apology — minimum two pages, to be reviewed",
    "Assigned extra chores with a full inspection before approval",
    "Corner time: 30 minutes of silent reflection, no distractions",
    "Wear a humbling item at home until Mistress says otherwise",
    "A cold shower — no warm water",
    "Loss of one regular privilege for 48 hours",
  ],

  serious: [
    "Extended orgasm denial — duration at Mistress's sole discretion",
    "Loss of all non-essential privileges until trust is rebuilt",
    "A formal written confession and apology, to be read aloud to Mistress",
    "Assigned a difficult or unpleasant task with no negotiation",
    "Spanking — if previously negotiated and consented",
    "Restricted freedoms for multiple days, reviewed daily",
    "A detailed written account of the incident and its impact, then discussion",
    "Removal of a comfort object or privilege for one week",
  ],

  rewards: [
    "Genuine verbal praise — \"Good girl\" said with real warmth and pride",
    "Permission to orgasm",
    "A scene built entirely around your favourite kink",
    "Your favourite treat, meal, or snack — your choice",
    "A day off from all service obligations",
    "A new toy or gift chosen by Mistress as a treat",
    "A special outing or activity you've been wanting to do",
    "Removal of a standing punishment",
    "Extra quality time and attention from Mistress",
    "You choose the next activity you do together",
    "A spa, self-care day, or pampering session",
    "Public praise within the dynamic — acknowledged for your good behaviour",
    "A new collar, accessory, or meaningful symbol of Mistress's approval",
  ],
};

let currentSuggestionPool = [];
let currentSuggestionIndex = 0;
let lastSavedEntryId = null;

function getSuggestionPool(type, behaviour, severity) {
  if (type === 'positive') return [...SUGGESTIONS.rewards];

  // Funishments specifically for bratting at minor severity
  if (behaviour === 'Bratting' && severity === 'Minor') {
    return shuffle([...SUGGESTIONS.funishments, ...SUGGESTIONS.minor]);
  }
  if (severity === 'Minor')    return shuffle([...SUGGESTIONS.minor]);
  if (severity === 'Moderate') return shuffle([...SUGGESTIONS.moderate]);
  if (severity === 'Serious')  return shuffle([...SUGGESTIONS.serious]);
  return shuffle([...SUGGESTIONS.minor]);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function showSuggestion(type, behaviour, severity) {
  currentSuggestionPool = getSuggestionPool(type, behaviour, severity);
  currentSuggestionIndex = 0;
  renderSuggestion(type, behaviour);
  document.getElementById('modal-suggestion').classList.add('open');
}

function renderSuggestion(type, behaviour) {
  const isPositive = type === 'positive';
  const isBratting = behaviour === 'Bratting';
  const isFunishment = isBratting && currentSuggestionPool.some(s => SUGGESTIONS.funishments.includes(s));

  document.getElementById('suggestion-icon').textContent  = isPositive ? '⭐' : isFunishment ? '😈' : '⚖️';
  document.getElementById('suggestion-title').textContent = isPositive ? 'Suggested reward' : isBratting ? 'Suggested funishment / punishment' : 'Suggested punishment';
  document.getElementById('suggestion-subtitle').textContent = isPositive ? 'For good behaviour' : `Based on: ${behaviour}`;
  document.getElementById('suggestion-text').textContent  = currentSuggestionPool[currentSuggestionIndex] || '—';
}

function nextSuggestion() {
  currentSuggestionIndex = (currentSuggestionIndex + 1) % currentSuggestionPool.length;
  document.getElementById('suggestion-text').textContent = currentSuggestionPool[currentSuggestionIndex];
}

function closeSuggestion() {
  document.getElementById('modal-suggestion').classList.remove('open');
}

function handleSuggestionOverlayClick(e) {
  if (e.target === e.currentTarget) closeSuggestion();
}

function useSuggestion() {
  const suggestion = currentSuggestionPool[currentSuggestionIndex];
  if (!suggestion || lastSavedEntryId === null) { closeSuggestion(); return; }

  const entry = entries.find(e => e.id === lastSavedEntryId);
  if (entry) {
    const label = entry.type === 'positive' ? 'Reward: ' : 'Suggested: ';
    entry.notes = entry.notes
      ? `${entry.notes}\n${label}${suggestion}`
      : `${label}${suggestion}`;
    localStorage.setItem('protocol_entries', JSON.stringify(entries));
  }
  showToast('Added to entry!');
  closeSuggestion();
}

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimeout;
function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  toast.style.background = isError ? 'var(--danger)' : 'var(--text)';
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}
