/* ============================================================
   page-scanner.js — the Scanner page.
   Upload · queue/history · extraction review · document viewer.

   No OCR/extraction engine is connected in this build (see ENGINE in
   data-scanner.js), so nothing here may claim a real scan happened.
   Uploads are validated for real (file type, a real PDF-signature check)
   and added to the queue honestly at 'uploaded'/'queued' — never marked
   processed/extracted, exactly like Email/Messages report a real failed
   send instead of a fake success.
   ============================================================ */

const scanState = {
  currentId: null,
  search: '',
  sort: 'recent',
  filters: { processing: '', extraction: '', review: '', ocr: '', error: '' }
};

const SCAN_SORTS = [
  { key: 'recent',     label: 'Most recently uploaded' },
  { key: 'file',       label: 'File name A–Z' },
  { key: 'company',    label: 'Company A–Z' },
  { key: 'processing', label: 'Processing state' }
];

/* ---------- small helpers ---------- */
function agoMinutes(label) {
  const m = /^(\d+)([mhd])$/.exec(label || '');
  if (!m) return 99999;
  const n = +m[1];
  return m[2] === 'm' ? n : m[2] === 'h' ? n * 60 : n * 1440;
}
function queueItem(id) { return SCAN_QUEUE.find(q => q.id === id); }

const PROC_LABEL = { queued: 'Queued', processing: 'Processing', processed: 'Processed', failed: 'Failed' };
const PROC_CHIP  = { queued: 'neutral', processing: 'progress', processed: 'good', failed: 'bad' };
const EXTR_LABEL = { pending: 'Extraction pending', extracted: 'Extracted', needs_review: 'Needs review', failed: 'Extraction failed' };
const EXTR_CHIP  = { pending: 'neutral', extracted: 'good', needs_review: 'warn', failed: 'bad' };
const REV_LABEL  = { not_reviewed: 'Not reviewed', reviewed: 'Reviewed' };
const REV_CHIP   = { not_reviewed: 'neutral', reviewed: 'good' };
const OCR_LABEL  = { not_run: 'OCR not run', complete: 'OCR complete', failed: 'OCR failed' };
const OCR_CHIP   = { not_run: 'neutral', complete: 'good', failed: 'bad' };

function chip(kind, label) { return `<span class="state-chip ${kind}">${escapeHtml(label)}</span>`; }

/* ============================================================
   QUEUE LIST
   ============================================================ */
function queueItems() {
  const q = scanState.search.trim().toLowerCase();
  const f = scanState.filters;
  let list = SCAN_QUEUE.slice();

  if (q) list = list.filter(it => {
    const stmtMonth = it.extracted && it.extracted.statementMonth ? it.extracted.statementMonth : '';
    return (it.file + ' ' + (it.leadCompany || '') + ' ' + stmtMonth).toLowerCase().includes(q);
  });
  if (f.processing) list = list.filter(it => it.processingState === f.processing);
  if (f.extraction) list = list.filter(it => it.extractionState === f.extraction);
  if (f.review)     list = list.filter(it => it.reviewState === f.review);
  if (f.ocr)        list = list.filter(it => it.ocr.state === f.ocr);
  if (f.error === 'yes') list = list.filter(it => !!it.error);

  const sorters = {
    recent:     (a, b) => agoMinutes(a.uploadedAt) - agoMinutes(b.uploadedAt),
    file:       (a, b) => a.file.localeCompare(b.file),
    company:    (a, b) => (a.leadCompany || '\uffff').localeCompare(b.leadCompany || '\uffff'),
    processing: (a, b) => a.processingState.localeCompare(b.processingState)
  };
  return list.sort(sorters[scanState.sort] || sorters.recent);
}

function activeFilterCount() {
  const f = scanState.filters;
  return Object.values(f).filter(Boolean).length;
}

function renderQueueList() {
  const scroll = document.getElementById('queueScroll');
  const bar = document.getElementById('queueFilterBar');
  const list = queueItems();

  document.getElementById('queueCount').textContent = list.length + ' item' + (list.length === 1 ? '' : 's');

  const n = activeFilterCount();
  const sortLabel = (SCAN_SORTS.find(s => s.key === scanState.sort) || SCAN_SORTS[0]).label;
  const showBar = n > 0 || scanState.sort !== 'recent';
  bar.hidden = !showBar;
  if (showBar) {
    bar.innerHTML = (n ? n + ' filter' + (n === 1 ? '' : 's') + ' · ' : '') + escapeHtml(sortLabel) + '<a id="clearQueueFilters">Clear</a>';
    document.getElementById('clearQueueFilters').addEventListener('click', () => {
      scanState.filters = { processing: '', extraction: '', review: '', ocr: '', error: '' };
      scanState.sort = 'recent';
      renderQueueList();
    });
  }
  document.getElementById('queueFilterBtn').classList.toggle('on', n > 0);

  if (!list.length) {
    scroll.innerHTML = '<div class="queue-list-empty">No documents match your search or filters.</div>';
    return;
  }

  scroll.innerHTML = list.map(it => `
    <div class="queue-row ${it.id === scanState.currentId ? 'selected' : ''}" data-id="${it.id}">
      <div class="qr-icon ${it.error ? 'err' : ''}">${it.error ? ICONS.alertTriangle : ICONS.file}</div>
      <div class="qr-main">
        <div class="qr-top">
          <div class="qr-file">${escapeHtml(it.file)}</div>
          <div class="qr-time">${escapeHtml(it.uploadedAt)} ago</div>
        </div>
        <div class="qr-sub">
          <span class="qr-company ${it.leadCompany ? '' : 'unassoc'}">${escapeHtml(it.leadCompany || 'Needs association')}</span>
          ${chip(PROC_CHIP[it.processingState], PROC_LABEL[it.processingState])}
          ${chip(EXTR_CHIP[it.extractionState], EXTR_LABEL[it.extractionState])}
        </div>
      </div>
    </div>`).join('');

  scroll.querySelectorAll('.queue-row').forEach(row =>
    row.addEventListener('click', () => selectQueueItem(row.dataset.id)));
}

function selectQueueItem(id) {
  scanState.currentId = id;
  renderQueueList();
  renderScanDetail();
}

function openQueueFilterMenu(anchor) {
  const f = scanState.filters;
  const set = (k, v) => { f[k] = (f[k] === v) ? '' : v; renderQueueList(); };
  const items = [
    { heading: true, label: 'Processing state' },
    ...Object.keys(PROC_LABEL).map(k => ({ label: PROC_LABEL[k], active: f.processing === k, onClick: () => set('processing', k) })),
    { sep: true }, { heading: true, label: 'Extraction state' },
    ...Object.keys(EXTR_LABEL).map(k => ({ label: EXTR_LABEL[k], active: f.extraction === k, onClick: () => set('extraction', k) })),
    { sep: true }, { heading: true, label: 'Review state' },
    ...Object.keys(REV_LABEL).map(k => ({ label: REV_LABEL[k], active: f.review === k, onClick: () => set('review', k) })),
    { sep: true }, { heading: true, label: 'OCR state' },
    ...Object.keys(OCR_LABEL).map(k => ({ label: OCR_LABEL[k], active: f.ocr === k, onClick: () => set('ocr', k) })),
    { sep: true }, { heading: true, label: 'Errors' },
    { label: 'Has an error', active: f.error === 'yes', onClick: () => set('error', 'yes') }
  ];
  popMenu(anchor, items, { align: 'left', width: 230 });
}
function openQueueSortMenu(anchor) {
  popMenu(anchor, SCAN_SORTS.map(s => ({
    label: s.label, active: scanState.sort === s.key,
    onClick: () => { scanState.sort = s.key; renderQueueList(); }
  })), { align: 'left', width: 210 });
}

/* ============================================================
   DETAIL / EXTRACTION PANEL
   ============================================================ */
function money(n) { return n == null ? '—' : fmtMoney(n); }

function extractionSectionsHtml(it) {
  const e = it.extracted;
  if (!e) return '<div class="sd-empty-note">Nothing extracted yet — this document is still queued.</div>';

  if (it.docType === 'Application') {
    return `
      <div class="sd-section">
        <div class="sd-section-title">Business</div>
        <div class="field-grid">
          <div class="field-row"><span class="field-label">Legal Company Name</span><span class="field-val">${escapeHtml(e.companyName)}</span></div>
          <div class="field-row"><span class="field-label">DBA</span><span class="field-val">${escapeHtml(e.dba)}</span></div>
          <div class="field-row"><span class="field-label">Time in Business</span><span class="field-val">${escapeHtml(e.timeInBusiness)}</span></div>
          <div class="field-row"><span class="field-label">EIN</span><span class="field-val">${escapeHtml(e.ein)}</span></div>
          <div class="field-row" style="grid-column:1/3"><span class="field-label">Application Address</span><span class="field-val">${escapeHtml(e.applicationAddress)}</span></div>
        </div>
      </div>
      <div class="sd-section">
        <div class="sd-section-title">Applicant</div>
        <div class="field-grid">
          <div class="field-row"><span class="field-label">Name</span><span class="field-val">${escapeHtml(e.ownerName)}</span></div>
          <div class="field-row"><span class="field-label">Title</span><span class="field-val">${escapeHtml(e.title)}</span></div>
          <div class="field-row"><span class="field-label">Mobile</span><span class="field-val">${escapeHtml(e.mobile)}</span></div>
          <div class="field-row"><span class="field-label">Email</span><span class="field-val">${escapeHtml(e.email)}</span></div>
          <div class="field-row"><span class="field-label">Landline</span><span class="field-val">${escapeHtml(e.landline)}</span></div>
        </div>
      </div>
      <div class="sd-section">
        <div class="sd-section-title">Application</div>
        <div class="kv-pairs">
          <div class="kv-pair"><div class="kv-label">Stated Annual Revenue</div><div class="kv-value">${money(e.statedAnnualRevenue)}</div></div>
          <div class="kv-pair"><div class="kv-label">Requested Funding</div><div class="kv-value">${money(e.requestedFunding)}</div></div>
        </div>
        <div class="kv-pairs" style="margin-top:8px">
          <div class="kv-pair"><div class="kv-label">Computed Approval</div><div class="kv-value pos">${money(e.computedApproval)}</div></div>
          <div class="kv-pair"><div class="kv-label">Formula</div><div class="kv-value" style="font-size:11px;font-weight:500">Revenue ↑ $50K + $150K</div></div>
        </div>
      </div>`;
  }

  const balHi = e.endingBalance != null && e.endingBalance > 15000 && it.reviewState === 'reviewed';
  return `
    <div class="sd-section">
      <div class="sd-section-title">Business</div>
      <div class="field-grid">
        <div class="field-row"><span class="field-label">Statement Company Name</span><span class="field-val">${escapeHtml(e.companyName)}</span></div>
        <div class="field-row"><span class="field-label">Owner</span><span class="field-val">${escapeHtml(e.ownerName)}</span></div>
        <div class="field-row" style="grid-column:1/3"><span class="field-label">Business Address</span><span class="field-val">${escapeHtml(e.businessAddress)}</span></div>
      </div>
    </div>
    <div class="sd-section">
      <div class="sd-section-title">Contact <span style="font-weight:400;color:var(--text-muted)">(mobile → email → landline)</span></div>
      <div class="field-grid">
        <div class="field-row"><span class="field-label">Mobile</span><span class="field-val">${escapeHtml(e.mobile)}</span></div>
        <div class="field-row"><span class="field-label">Email</span><span class="field-val">${escapeHtml(e.email)}</span></div>
        <div class="field-row"><span class="field-label">Landline</span><span class="field-val">${escapeHtml(e.landline)}</span></div>
      </div>
    </div>
    <div class="sd-section">
      <div class="sd-section-title">Bank &amp; Statement</div>
      <div class="field-grid">
        <div class="field-row"><span class="field-label">Bank</span><span class="field-val">${escapeHtml(e.bankName)}</span></div>
        <div class="field-row"><span class="field-label">Account</span><span class="field-val">${escapeHtml(e.accountType)} ${escapeHtml(e.accountMasked)}</span></div>
        <div class="field-row"><span class="field-label">Statement Month</span><span class="field-val">${escapeHtml(e.statementMonth)}</span></div>
      </div>
      <div class="kv-pairs">
        <div class="kv-pair"><div class="kv-label">Total Deposits</div><div class="kv-value">${money(e.totalDeposits)}</div></div>
        <div class="kv-pair"><div class="kv-label">Ending Balance</div><div class="kv-value ${balHi ? 'pos' : ''}">${money(e.endingBalance)}</div></div>
      </div>
      ${balHi ? '<div class="sd-section-title" style="margin:6px 0 0"><span class="bal-flag">✓ Ending balance confirmed above $15,000</span></div>' : ''}
    </div>
    <div class="sd-section">
      <div class="sd-section-title">Month-to-Date</div>
      ${e.mtdDeposits == null ? '<div class="sd-empty-note">No month-to-date figure for this statement cycle yet.</div>' : `
      <div class="kv-pairs">
        <div class="kv-pair"><div class="kv-label">MTD Deposits</div><div class="kv-value">${money(e.mtdDeposits)}</div></div>
        <div class="kv-pair"><div class="kv-label">MTD Balance</div><div class="kv-value">${money(e.mtdBalance)}</div></div>
      </div>
      <div class="stmt-asof">as of ${escapeHtml(e.mtdAsOf)}</div>`}
    </div>
    <div class="sd-section">
      <div class="sd-section-title">Daily Cash Flow &amp; Expense</div>
      <div class="finance-block">
        <div class="finance-row"><span class="finance-label">Avg Daily Inflow</span><span class="finance-val">${money(e.avgDailyInflow)}</span></div>
        <div class="finance-row"><span class="finance-label">Avg Daily Outflow</span><span class="finance-val">${money(e.avgDailyOutflow)}</span></div>
        <div class="finance-row"><span class="finance-label">${escapeHtml(e.largestExpenseCategory)}</span><span class="finance-val">${money(e.largestExpenseAmount)}/mo</span></div>
        <div class="finance-row"><span class="finance-label">MCA Lender</span><span class="finance-val">${e.mcaLender ? escapeHtml(e.mcaLender) : 'None detected'}</span></div>
        <div class="finance-row"><span class="finance-label">MCA Burden</span><span class="finance-val ${e.mcaBurden ? 'burden' : ''}">${e.mcaBurden ? money(e.mcaBurden) + '/mo' : 'None'}</span></div>
      </div>
    </div>`;
}

function renderScanDetail() {
  const head = document.getElementById('scanDetailHead');
  const body = document.getElementById('scanDetailBody');
  const it = queueItem(scanState.currentId);
  if (!it) {
    head.innerHTML = '<span class="ph-title-txt">Document</span>';
    body.innerHTML = emptyPanelHtml('No document selected', 'Choose a document from the queue to review its extraction.');
    return;
  }
  head.innerHTML = `
    <span class="ph-title-txt">Document</span>
    <div class="panel-header-actions">
      <button class="icon-btn" id="scanMoreBtn" title="More"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/></svg></button>
    </div>`;

  const canView = it.leadId && it.docKey;
  body.innerHTML = `
  <div class="sd-scroll">
    <div class="sd-identity">
      <div class="sd-file-icon">${it.error ? ICONS.alertTriangle : ICONS.file}</div>
      <div style="min-width:0;flex:1">
        <div class="sd-file-name">${escapeHtml(it.file)}</div>
        <div class="sd-file-meta">${escapeHtml(it.docType)} · ${it.pagesSelected}/${it.pages} pages selected · uploaded ${escapeHtml(it.uploadedAt)} ago</div>
      </div>
      <div class="panel-actions">
        <button class="panel-action-btn primary" id="scanOpenViewer" ${canView ? '' : 'disabled'}>${ICONS.file}View</button>
        <button class="panel-action-btn" id="scanOpenLead" ${it.leadId ? '' : 'disabled'}>${ICONS.external}Open lead</button>
        <button class="panel-action-btn" id="scanReview">${ICONS.edit}Review</button>
      </div>
    </div>

    <div class="sd-chips">
      ${chip(PROC_CHIP[it.processingState], PROC_LABEL[it.processingState])}
      ${chip(EXTR_CHIP[it.extractionState], EXTR_LABEL[it.extractionState])}
      ${chip(REV_CHIP[it.reviewState], REV_LABEL[it.reviewState])}
      ${chip(OCR_CHIP[it.ocr.state], OCR_LABEL[it.ocr.state])}
    </div>

    ${it.error ? `<div class="sd-error-box">${ICONS.alertTriangle}<div>${escapeHtml(it.error)}</div></div>` : ''}

    ${it.flags.length ? `<div class="sd-flags">${it.flags.map(fl => `
      <div class="sd-flag ${fl.state}">
        <div class="flag-dot"></div>
        <div><div class="flag-field">${escapeHtml(fl.field)}</div><div class="flag-note">${escapeHtml(fl.note)}</div></div>
      </div>`).join('')}</div>` : ''}

    ${extractionSectionsHtml(it)}
  </div>`;

  document.getElementById('scanOpenViewer').addEventListener('click', () => { if (canView) openDocViewer(it.leadId, it.docKey); });
  document.getElementById('scanOpenLead').addEventListener('click', () => { if (it.leadId) window.location.href = 'index.html?lead=' + it.leadId; });
  document.getElementById('scanReview').addEventListener('click', () => openReviewModal(it));
  document.getElementById('scanMoreBtn').addEventListener('click', e => { e.stopPropagation(); openRowMoreMenu(e.currentTarget, it); });
}

/* ============================================================
   SECONDARY ACTIONS — all behind the row/detail "more" menu
   ============================================================ */
function openRowMoreMenu(anchor, it) {
  popMenu(anchor, [
    { label: 'Reassign lead / company', icon: ICONS.assign, onClick: () => openReassignModal(it) },
    { label: 'Reprocess document', icon: ICONS.external, onClick: () => runReprocess(it) },
    { label: 'Association history', icon: ICONS.copy, onClick: () => openHistoryModal(it) },
    { sep: true },
    { label: 'Export this document (CSV)', icon: ICONS.download, onClick: () => exportCSV([it]) },
    { sep: true },
    { label: 'Remove from queue', icon: ICONS.trash, danger: true, onClick: () => removeFromQueue(it) }
  ], { align: 'right', width: 220 });
}

function runReprocess(it) {
  if (!ENGINE.connected) {
    toast('No ' + ENGINE.name + ' is connected — nothing to reprocess.');
    return;
  }
}

function removeFromQueue(it) {
  confirmModal('Remove from queue', 'Remove "' + it.file + '" from the Scanner queue? This does not delete anything already saved to the lead.', 'Remove', () => {
    const i = SCAN_QUEUE.indexOf(it);
    if (i > -1) SCAN_QUEUE.splice(i, 1);
    if (scanState.currentId === it.id) scanState.currentId = null;
    renderQueueList(); renderScanDetail();
    toast('Removed from queue');
  });
}

function openReassignModal(it) {
  const m = openModal({
    title: 'Reassign lead / company',
    body: `<div class="form-row"><label>Associated lead</label>
      <select class="text-input" id="reassignSelect">
        <option value="">— Needs association —</option>
        ${LEADS.map(l => `<option value="${l.id}" ${it.leadId === l.id ? 'selected' : ''}>${escapeHtml(l.company)}</option>`).join('')}
      </select></div>
      <p style="font-size:11px;color:var(--text-muted)">Changing this re-associates the document and re-derives its extraction from the selected lead's records.</p>`,
    foot: '<button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" data-save>Save</button>',
    onMount(card, close) {
      card.querySelector('[data-cancel]').addEventListener('click', close);
      card.querySelector('[data-save]').addEventListener('click', () => {
        const sel = card.querySelector('#reassignSelect');
        const newLeadId = sel.value || null;
        const newLead = newLeadId ? getLead(newLeadId) : null;
        const prevCompany = it.leadCompany;
        it.leadId = newLeadId;
        it.leadCompany = newLead ? newLead.company : null;
        it.extracted = (newLead && it.docKey) ? buildExtraction(newLead, it.docKey) : null;
        it.associationHistory = it.associationHistory || [];
        it.associationHistory.push({ from: prevCompany || 'Unassociated', to: it.leadCompany || 'Unassociated', at: 'just now' });
        close();
        renderQueueList(); renderScanDetail();
        toast('Association updated');
      });
    }
  });
}

function openHistoryModal(it) {
  const hist = it.associationHistory || [];
  openModal({
    title: 'Association history',
    body: hist.length
      ? '<div style="display:flex;flex-direction:column;gap:8px">' + hist.map(h =>
          `<div style="font-size:12px;color:var(--text-secondary)"><b style="color:var(--text-primary)">${escapeHtml(h.from)}</b> → <b style="color:var(--text-primary)">${escapeHtml(h.to)}</b><div style="font-size:10.5px;color:var(--text-muted)">${escapeHtml(h.at)}</div></div>`
        ).join('') + '</div>'
      : '<p style="font-size:12px;color:var(--text-muted)">No reassignments recorded for this document yet.</p>',
    foot: '<button class="btn" data-close2>Close</button>',
    onMount(card, close) { card.querySelector('[data-close2]').addEventListener('click', close); }
  });
}

function openReviewModal(it) {
  const e = it.extracted;
  if (!e) {
    openModal({
      title: 'Review & correct',
      body: '<p style="font-size:12px;color:var(--text-muted)">This document has no extraction yet — there is nothing to review.</p>',
      foot: '<button class="btn" data-close2>Close</button>',
      onMount(card, close) { card.querySelector('[data-close2]').addEventListener('click', close); }
    });
    return;
  }
  const editable = it.docType === 'Application'
    ? [['companyName', 'Legal Company Name'], ['ownerName', 'Applicant Name'], ['mobile', 'Mobile'], ['email', 'Email'], ['ein', 'EIN']]
    : [['companyName', 'Statement Company Name'], ['ownerName', 'Owner'], ['mobile', 'Mobile'], ['email', 'Email'], ['bankName', 'Bank Name'], ['totalDeposits', 'Total Deposits'], ['endingBalance', 'Ending Balance']];

  openModal({
    title: 'Review & correct extracted values',
    wide: true,
    body: `<div class="field-grid">${editable.map(([k, label]) =>
        `<div class="form-row"><label>${escapeHtml(label)}</label><input class="text-input" data-k="${k}" value="${escapeHtml(String(e[k] == null ? '' : e[k]))}"></div>`
      ).join('')}</div>
      <p class="mf-note" style="margin-top:6px">Original extracted values are kept in this document's record; corrections apply only after Save.</p>`,
    foot: '<button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" data-save>Save &amp; mark reviewed</button>',
    onMount(card, close) {
      card.querySelector('[data-cancel]').addEventListener('click', close);
      card.querySelector('[data-save]').addEventListener('click', () => {
        card.querySelectorAll('[data-k]').forEach(inp => {
          const k = inp.dataset.k;
          const num = Number(inp.value);
          e[k] = (k === 'totalDeposits' || k === 'endingBalance') && inp.value !== '' && !isNaN(num) ? num : inp.value;
        });
        it.reviewState = 'reviewed';
        if (it.extractionState !== 'failed') it.extractionState = 'extracted';
        it.flags = [];
        close();
        renderQueueList(); renderScanDetail();
        toast('Saved — marked reviewed');
      });
    }
  });
}

/* ============================================================
   SCAN SETTINGS (default page count, OCR default) — popup
   ============================================================ */
function openScanSettingsModal() {
  openModal({
    title: 'Scan settings',
    body: `
      <div class="form-row"><label>Approved default scan page count</label>
        <input class="text-input" type="number" min="1" max="30" id="setPageLimit" value="${prefs.scanPageLimit}"></div>
      <div class="form-row"><label>OCR default</label>
        <select class="text-input" id="setOcrDefault">
          <option value="auto" ${prefs.scanOcrDefault === 'auto' ? 'selected' : ''}>Auto (only when text extraction fails)</option>
          <option value="always" ${prefs.scanOcrDefault === 'always' ? 'selected' : ''}>Always run OCR</option>
          <option value="off" ${prefs.scanOcrDefault === 'off' ? 'selected' : ''}>Off</option>
        </select></div>
      <p style="font-size:11px;color:var(--text-muted)">Uploads past the page limit keep only the selected range — the app will never claim a full scan when pages were excluded.</p>`,
    foot: '<button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" data-save>Save</button>',
    onMount(card, close) {
      card.querySelector('[data-cancel]').addEventListener('click', close);
      card.querySelector('[data-save]').addEventListener('click', () => {
        const n = Math.max(1, Math.min(30, Number(card.querySelector('#setPageLimit').value) || prefs.scanPageLimit));
        prefs.scanPageLimit = n;
        prefs.scanOcrDefault = card.querySelector('#setOcrDefault').value;
        savePrefs();
        close();
        toast('Scan settings saved');
      });
    }
  });
}

/* ============================================================
   EXPORT — CSV of actual extracted data (labelled honestly; no
   XLSX library is loaded, so this never claims to be XLSX)
   ============================================================ */
function exportCSV(items) {
  const rows = items.filter(it => it.extracted).map(it => {
    const e = it.extracted;
    return [it.file, it.leadCompany || '', it.docType, it.processingState, it.extractionState, it.reviewState,
      e.companyName || '', e.ownerName || '', e.mobile || '', e.email || '',
      e.bankName || '', e.statementMonth || '', e.totalDeposits ?? '', e.endingBalance ?? '',
      e.computedApproval ?? ''];
  });
  if (!rows.length) { toast('Nothing extracted yet to export'); return; }
  const header = ['File', 'Lead/Company', 'Doc Type', 'Processing', 'Extraction', 'Review',
    'Company Name', 'Owner', 'Mobile', 'Email', 'Bank', 'Statement Month', 'Total Deposits', 'Ending Balance', 'Computed Approval'];
  const csv = [header, ...rows].map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'scanner-extracted-data.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(rows.length + ' document' + (rows.length === 1 ? '' : 's') + ' exported as CSV');
}

/* ============================================================
   UPLOAD — real client-side validation, no fake success
   ============================================================ */
const ACCEPTED_EXT = ['.pdf', '.png', '.jpg', '.jpeg'];

function readHeaderBytes(file, n) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(new Uint8Array(r.result));
    r.onerror = () => reject(r.error);
    r.readAsArrayBuffer(file.slice(0, n));
  });
}
function bytesStartWith(bytes, str) {
  for (let i = 0; i < str.length; i++) if (bytes[i] !== str.charCodeAt(i)) return false;
  return true;
}

async function handleUploadFiles(fileList) {
  for (const file of Array.from(fileList)) {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    const base = {
      id: 'up-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      file: file.name, leadId: null, leadCompany: null,
      docType: 'Unknown', docKey: null,
      pages: 0, pagesSelected: 0, uploadedAt: 'just now',
      processingState: 'queued', extractionState: 'pending', reviewState: 'not_reviewed',
      ocr: { used: false, state: 'not_run' }, error: null, flags: [], extracted: null, associationHistory: []
    };

    if (!ACCEPTED_EXT.includes(ext)) {
      base.processingState = 'failed';
      base.error = 'Unsupported file type — only PDF, PNG and JPG are accepted.';
      SCAN_QUEUE.unshift(base);
      continue;
    }
    if (ext === '.pdf') {
      try {
        const head = await readHeaderBytes(file, 5);
        if (!bytesStartWith(head, '%PDF-')) {
          base.processingState = 'failed';
          base.error = 'Corrupt or unrecognized file — the PDF signature is missing.';
          SCAN_QUEUE.unshift(base);
          continue;
        }
      } catch (err) {
        base.processingState = 'failed';
        base.error = 'Could not read this file.';
        SCAN_QUEUE.unshift(base);
        continue;
      }
      base.docType = 'Bank Statement';
    } else {
      base.docType = 'Bank Statement';
    }

    base.error = null;
    SCAN_QUEUE.unshift(base);
    toast('Uploaded — no extraction engine connected, so it stays queued', 'warn');
  }
  renderQueueList();
  const first = SCAN_QUEUE[0];
  if (first) selectQueueItem(first.id);
}

function initUpload() {
  const zone = document.getElementById('dropzone');
  const input = document.getElementById('fileInput');
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') input.click(); });
  input.addEventListener('change', () => { if (input.files.length) handleUploadFiles(input.files); input.value = ''; });
  ['dragenter', 'dragover'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.remove('drag'); }));
  zone.addEventListener('drop', e => { if (e.dataTransfer.files.length) handleUploadFiles(e.dataTransfer.files); });
}

/* ============================================================
   INIT
   ============================================================ */
function initScannerPage() {
  bootShell();
  initViewer();
  initUpload();

  const first = queueItems()[0];
  if (first) selectQueueItem(first.id);
  else { renderQueueList(); renderScanDetail(); }

  document.getElementById('queueSearchInput').addEventListener('input', e => {
    scanState.search = e.target.value;
    renderQueueList();
  });
  document.getElementById('queueFilterBtn').addEventListener('click', e => { e.stopPropagation(); openQueueFilterMenu(e.currentTarget); });
  document.getElementById('queueSortBtn').addEventListener('click', e => { e.stopPropagation(); openQueueSortMenu(e.currentTarget); });
  document.getElementById('scanSettingsBtn').addEventListener('click', openScanSettingsModal);

  window.onGlobalSearch = value => { scanState.search = value; renderQueueList(); };
  window.onShellResize = () => refitViewer();
}
document.addEventListener('DOMContentLoaded', initScannerPage);
