/* ============================================================
   page-leads.js — the Leads page.
   Lead list · selected lead workspace · communications panel ·
   docked dialer. Loaded only by index.html.
   ============================================================ */

const leadsState = {
  currentLeadId: LEADS[0].id,
  commsTab: 'all',
  searchTerm: '',
  sort: 'recent',
  filters: { rep: '', status: '', bank: '', mca: '', favourites: false },
  dialer: { inCall: false, seconds: 0, timer: null, muted: false, speaker: false, contact: null, number: null },
  keypadDigits: ''
};

const SORTS = [
  { key: 'recent',   label: 'Most recent activity' },
  { key: 'company',  label: 'Company A–Z' },
  { key: 'deposits', label: 'Average deposits, high to low' },
  { key: 'value',    label: 'Deal value, high to low' }
];

/* Relative labels like "1h" / "3d" sort correctly once turned into minutes. */
const AGO_UNITS = { m: 1, h: 60, d: 1440, w: 10080, mo: 43200 };
function agoMinutes(label) {
  const m = String(label).match(/^(\d+)(mo|m|h|d|w)$/);
  return m ? Number(m[1]) * AGO_UNITS[m[2]] : Number.MAX_SAFE_INTEGER;
}

/* ============================================================
   PANEL WIDTHS
   The Lead List is a share of the available width, clamped so it
   is always the smallest of the three panels. Middle and Comms
   then split what is left evenly, so the three always fill 100%.
   ============================================================ */
const LIST_MIN = 300, LIST_MAX = 560, LIST_SHARE = 0.25, HANDLE_W = 5;

function availableWidth() {
  const page = document.getElementById('leadsPage');
  const z = currentScale();
  const w = page ? page.getBoundingClientRect().width / z : 0;
  return w > 0 ? w : Math.max(960, window.innerWidth / z);
}
function clampListWidth(w, avail) {
  /* never bigger than either of the other two panels: list < (avail-list)/2 */
  const maxByRule = Math.floor((avail - 2 * HANDLE_W) / 3) - 1;
  return Math.round(Math.max(LIST_MIN, Math.min(LIST_MAX, maxByRule, w)));
}
function applyPanelWidths() {
  /* prefs.listWidth holds the width the user dragged to (null = automatic).
     It is clamped for display each time rather than written back, so a narrow
     window never permanently shrinks the preference. */
  const avail = availableWidth();
  const list = clampListWidth(prefs.listWidth || avail * LIST_SHARE, avail);
  const half = (avail - list - 2 * HANDLE_W) / 2;
  document.getElementById('leadListPanel').style.width = list + 'px';
  document.getElementById('commsPanel').style.width = half.toFixed(2) + 'px';
}

function setupResize() {
  const handle = document.getElementById('handle1');
  const panel = document.getElementById('leadListPanel');
  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    const z = currentScale();
    const startX = e.clientX, startW = panel.getBoundingClientRect().width / z;
    handle.classList.add('active');
    document.body.style.userSelect = 'none';
    function onMove(ev) {
      prefs.listWidth = startW + (ev.clientX - startX) / z;
      applyPanelWidths();
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      handle.classList.remove('active');
      document.body.style.userSelect = '';
      savePrefs();
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

/* ============================================================
   LEAD LIST
   ============================================================ */
function activeFilterCount() {
  const f = leadsState.filters;
  return ['rep', 'status', 'bank', 'mca'].filter(k => f[k]).length + (f.favourites ? 1 : 0);
}
function filteredLeads() {
  const q = leadsState.searchTerm.trim().toLowerCase();
  const f = leadsState.filters;
  let out = LEADS.filter(l => {
    if (q && !(l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q))) return false;
    if (f.rep && l.rep !== f.rep) return false;
    if (f.status && l.status !== f.status) return false;
    if (f.bank && l.bank !== f.bank) return false;
    if (f.mca === 'yes' && !l.mcaBurden) return false;
    if (f.mca === 'no' && l.mcaBurden) return false;
    if (f.favourites && !l.starred) return false;
    return true;
  });
  const s = leadsState.sort;
  out = out.slice().sort((a, b) => {
    if (s === 'company') return a.company.localeCompare(b.company);
    if (s === 'deposits') return b.avgDeposits - a.avgDeposits;
    if (s === 'value') return b.dealValue - a.dealValue;
    return agoMinutes(a.lastAction) - agoMinutes(b.lastAction);
  });
  return out;
}

function renderLeadList() {
  const scroll = document.getElementById('leadListScroll');
  const bar = document.getElementById('leadFilterBar');
  const list = filteredLeads();
  document.getElementById('leadCount').textContent = list.length + ' lead' + (list.length === 1 ? '' : 's');

  const n = activeFilterCount();
  const sortLabel = (SORTS.find(s => s.key === leadsState.sort) || SORTS[0]).label;
  const showBar = n > 0 || leadsState.sort !== 'recent';
  bar.hidden = !showBar;
  if (showBar) {
    bar.innerHTML = (n ? n + ' filter' + (n === 1 ? '' : 's') + ' · ' : '') + escapeHtml(sortLabel) +
      '<a id="clearFilters">Clear</a>';
    document.getElementById('clearFilters').addEventListener('click', () => {
      leadsState.filters = { rep: '', status: '', bank: '', mca: '', favourites: false };
      leadsState.sort = 'recent';
      renderLeadList();
    });
  }
  document.getElementById('leadFilterBtn').classList.toggle('on', n > 0);

  if (list.length === 0) {
    scroll.innerHTML = '<div class="lead-list-empty">No leads match your search or filters.</div>';
    return;
  }
  scroll.innerHTML = list.map(l => `
    <div class="lead-row ${l.id === leadsState.currentLeadId ? 'selected' : ''}" data-id="${l.id}">
      <span class="lead-row-num">${l.num}</span>
      ${l.starred ? '<span class="lead-row-star" title="Favourite">' + ICONS.starFill + '</span>' : ''}
      ${leadTrackingMark(l)}
      <div class="lead-avatar" style="background:${avatarTint(l.color)};color:${l.color}">${l.initials}</div>
      <div class="lead-row-main">
        <div class="lead-row-top">
          <div class="lead-row-company">${escapeHtml(l.company)}</div>
          <div class="lead-row-value">${fmtMoney(l.dealValue)}</div>
        </div>
        <div class="lead-row-bottom">
          <div class="lead-row-name">${escapeHtml(l.name)}</div>
          <div class="lead-row-time">${l.lastAction} ago</div>
        </div>
      </div>
    </div>`).join('');
  scroll.querySelectorAll('.lead-row').forEach(row =>
    row.addEventListener('click', () => selectLead(row.dataset.id)));
}

/* The newest outbound tracked email for this lead, shown as the same mark the
   Email page uses. Leads with no tracked mail show nothing. */
function leadTrackingMark(l) {
  const threads = l.mailThreads || [];
  let newest = null;
  threads.forEach(t => t.messages.forEach(m => {
    if (m.tracking && (!newest || m.at > newest.at)) newest = m;
  }));
  return newest ? '<span class="lead-row-trk">' + trackingMark(newest.tracking) + '</span>' : '';
}

function selectLead(id) {
  leadsState.currentLeadId = id;
  renderLeadList();
  renderSelectedLead();
  renderComms();
}

function uniqueValues(key) { return [...new Set(LEADS.map(l => l[key]))].sort(); }

function openFilterMenu(anchor) {
  const f = leadsState.filters;
  const set = (k, v) => { f[k] = (f[k] === v) ? '' : v; renderLeadList(); };
  const items = [
    { heading: true, label: 'Assigned rep' },
    ...uniqueValues('rep').map(r => ({ label: r, active: f.rep === r, onClick: () => set('rep', r) })),
    { sep: true }, { heading: true, label: 'Status' },
    ...STATUSES.map(s => ({ label: s, active: f.status === s, onClick: () => set('status', s) })),
    { sep: true }, { heading: true, label: 'Bank' },
    ...uniqueValues('bank').map(b => ({ label: b, active: f.bank === b, onClick: () => set('bank', b) })),
    { sep: true }, { heading: true, label: 'Existing MCA' },
    { label: 'Has an MCA', active: f.mca === 'yes', onClick: () => set('mca', 'yes') },
    { label: 'No MCA', active: f.mca === 'no', onClick: () => set('mca', 'no') },
    { sep: true },
    { label: 'Favourites only', icon: ICONS.star, active: f.favourites,
      onClick: () => { f.favourites = !f.favourites; renderLeadList(); } }
  ];
  popMenu(anchor, items, { align: 'left', width: 220 });
}

function openSortMenu(anchor) {
  popMenu(anchor, SORTS.map(s => ({
    label: s.label, active: leadsState.sort === s.key,
    onClick: () => { leadsState.sort = s.key; renderLeadList(); }
  })), { align: 'left', width: 240 });
}

function openListMoreMenu(anchor) {
  popMenu(anchor, [
    { label: 'Export this list as CSV', icon: ICONS.download, onClick: exportLeadsCsv },
    { label: 'Clear filters and sort', icon: ICONS.close, onClick: () => {
        leadsState.filters = { rep: '', status: '', bank: '', mca: '', favourites: false };
        leadsState.sort = 'recent';
        renderLeadList();
      } }
  ], { align: 'left', width: 220 });
}

function csvCell(v) { return '"' + String(v).replace(/"/g, '""') + '"'; }
function exportLeadsCsv() {
  const rows = filteredLeads();
  const head = ['Company', 'Contact', 'Title', 'Status', 'Rep', 'Bank', 'Avg monthly deposits',
                'Requested funding', 'Current approval', 'MCA lender', 'MCA burden', 'Last action'];
  const body = rows.map(l => [l.company, l.name, l.title, l.status, l.rep, l.bank, l.avgDeposits,
                             l.reqFunding, l.approval, l.mcaLender, l.mcaBurden, l.lastAction]);
  const csv = [head, ...body].map(r => r.map(csvCell).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'leads-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(rows.length + ' lead' + (rows.length === 1 ? '' : 's') + ' exported');
}

/* ============================================================
   SELECTED LEAD PANEL
   ============================================================ */
function contactIconsMobile(num, leadId) {
  return `<span class="contact-icons">
    <button class="cicon-btn" title="Call" data-act="call" data-num="${num}">${ICONS.call}</button>
    <button class="cicon-btn" title="SMS" data-act="sms" data-num="${num}">${ICONS.sms}</button>
    <button class="cicon-btn wa" title="WhatsApp" data-act="wa" data-num="${num}">${ICONS.wa}</button>
  </span>`;
}
function contactIconsLandline(num) {
  return `<span class="contact-icons"><button class="cicon-btn" title="Call" data-act="call" data-num="${num}">${ICONS.call}</button></span>`;
}
function contactIconsEmail(addr) {
  return `<span class="contact-icons"><button class="cicon-btn" title="Email" data-act="email" data-addr="${escapeHtml(addr)}">${ICONS.envelope}</button></span>`;
}

function renderSelectedLead() {
  const body = document.getElementById('selectedLeadBody');
  const l = getLead(leadsState.currentLeadId);
  const starBtn = document.getElementById('leadStarBtn');
  if (!l) {
    body.innerHTML = emptyPanelHtml('No lead selected', 'Choose a lead from the list to see their details here.');
    return;
  }
  starBtn.innerHTML = l.starred ? ICONS.starFill : ICONS.star;
  starBtn.classList.toggle('on', !!l.starred);
  starBtn.title = l.starred ? 'Remove from favourites' : 'Add to favourites';

  body.innerHTML = `
  <div class="sl-scroll">
    <div class="sl-identity">
      <div class="sl-avatar" style="background:${l.color}">${l.initials}</div>
      <div style="min-width:0">
        <div class="sl-company">${escapeHtml(l.company)}</div>
        <div class="sl-owner">${escapeHtml(l.name)}</div>
      </div>
      <div class="panel-actions">
        <button class="panel-action-btn primary" data-act="call" data-num="${l.mobiles[0]}">${ICONS.call}Call</button>
        <button class="panel-action-btn" data-act="sms" data-num="${l.mobiles[0]}">${ICONS.sms}SMS</button>
        <button class="panel-action-btn" data-act="email" data-addr="${escapeHtml(l.emails[0])}">${ICONS.envelope}Email</button>
      </div>
    </div>

    <div class="sl-section">
      <div class="sl-section-title">Company Info</div>
      <div class="field-grid">
        <div class="field-row"><span class="field-label">Industry</span><span class="field-val">${escapeHtml(l.industry)}</span></div>
        <div class="field-row"><span class="field-label">Time in Business</span><span class="field-val">${escapeHtml(l.tib)}</span></div>
        <div class="field-row" style="grid-column:1/3"><span class="field-label">Company Address</span><span class="field-val">${escapeHtml(l.address)}</span></div>
        <div class="field-row"><span class="field-label">Timezone</span><span class="field-val">${escapeHtml(l.tz)}</span></div>
        <div class="field-row"><span class="field-label">Application</span><span class="field-val">On file<button class="inline-file" title="Open application" data-doc="application">${ICONS.file}</button></span></div>
        <div class="field-row"><span class="field-label">Assigned Rep</span><span class="field-val">${escapeHtml(l.rep)}</span></div>
      </div>
      <div class="kv-pairs">
        <div class="kv-pair"><div class="kv-label">Requested Funding</div><div class="kv-value">${fmtMoney(l.reqFunding)}</div></div>
        <div class="kv-pair"><div class="kv-label">Current Approval</div><div class="kv-value pos">${fmtMoney(l.approval)}</div></div>
      </div>
    </div>

    <div class="sl-section">
      <div class="sl-section-title">Bank Statements</div>
      ${l.statements.map(st => `<div class="stmt-row">
        <span class="stmt-month" data-doc="${st.key}">${escapeHtml(st.month)}</span>
        <button class="stmt-pdf" title="Open ${escapeHtml(st.month)} statement" data-doc="${st.key}">${ICONS.file}</button>
        <div class="stmt-figs">
          <div class="stmt-fig"><div class="sf-label">Total Deposits</div><div class="sf-val">${fmtMoney(st.deposits)}</div></div>
          <div class="stmt-fig"><div class="sf-label">Ending Balance</div><div class="sf-val">${fmtMoney(st.endingBalance)}</div></div>
        </div>
      </div>`).join('')}
      <div class="kv-pairs">
        <div class="kv-pair"><div class="kv-label">MTD Deposits</div><div class="kv-value">${fmtMoney(l.mtd.deposits)}</div></div>
        <div class="kv-pair"><div class="kv-label">MTD Balance</div><div class="kv-value">${fmtMoney(l.mtd.balance)}</div></div>
      </div>
      <div class="stmt-asof">${escapeHtml(l.mtd.month)} month-to-date · as of ${escapeHtml(l.mtd.asOf)}</div>
    </div>

    <div class="sl-section">
      <div class="sl-section-title">Contact</div>
      <div class="contact-cols">
        <div class="contact-col">
          ${l.mobiles.map((m, i) => `<div class="contact-row"><span class="contact-num">${m}</span>${contactIconsMobile(m, l.id)}<span class="contact-tag">M${i + 1}</span></div>`).join('')}
        </div>
        <div class="contact-col">
          ${l.landlines.map((n, i) => `<div class="contact-row"><span class="contact-num">${n}</span>${contactIconsLandline(n)}<span class="contact-tag">L${i + 1}</span></div>`).join('')}
        </div>
      </div>
      <div class="contact-emails">
        ${l.emails.map((e, i) => `<div class="contact-row"><span class="contact-email">${escapeHtml(e)}</span>${contactIconsEmail(e)}<span class="contact-tag">E${i + 1}</span></div>`).join('')}
      </div>
    </div>

    <div class="sl-section">
      <div class="sl-section-title">Financials</div>
      <div class="finance-block">
        <div class="finance-row"><span class="finance-label">Bank</span><span class="finance-val">${escapeHtml(l.bank)}</span></div>
        <div class="finance-row"><span class="finance-label">Avg Monthly Deposits</span><span class="finance-val">${fmtMoney(l.avgDeposits)}</span></div>
        <div class="finance-row"><span class="finance-label">${escapeHtml(l.expCat)}</span><span class="finance-val">${fmtMoney(l.expAmt)}/mo</span></div>
        <div class="finance-row"><span class="finance-label">MCA Lender</span><span class="finance-val">${escapeHtml(l.mcaLender)}</span></div>
        <div class="finance-row"><span class="finance-label">MCA Burden</span><span class="finance-val ${l.mcaBurden ? 'burden' : ''}">${l.mcaBurden ? fmtMoney(l.mcaBurden) + '/mo' : 'None'}</span></div>
      </div>
    </div>

    <div class="sl-section">
      <div class="sl-section-title">Sales Pitch</div>
      <div class="pitch-box" id="pitchBox">${escapeHtml(l._activePitch || l.pitch)}
        ${pitchActionsHtml()}
      </div>
    </div>

    <div class="sl-section">
      <div class="sl-section-title">Notes</div>
      <div class="notes-toggle" id="notesToggle">
        ${ICONS.chevRight.replace('<svg', '<svg class="chev"')}
        <span class="nt-label">${l.notes.length} note${l.notes.length === 1 ? '' : 's'}${l.notes[0] ? ' · latest: ' + escapeHtml(l.notes[0].text.slice(0, 34)) + (l.notes[0].text.length > 34 ? '…' : '') : ''}</span>
      </div>
      <div class="notes-full" id="notesFull">
        ${l.notes.map(n => `<div class="note-line"><div class="note-meta">${escapeHtml(n.author)} · ${escapeHtml(n.time)} ago</div>${escapeHtml(n.text)}</div>`).join('') || '<div class="note-line" style="color:var(--text-muted)">No notes yet.</div>'}
        <div class="note-compose">
          <input type="text" placeholder="Add a note…" id="noteInput">
          <button id="noteAddBtn">Add</button>
        </div>
      </div>
    </div>

    <div class="sl-section" style="margin-bottom:4px">
      <div class="sl-section-title">Last Activity</div>
      <div class="activity-line">
        <div class="activity-icon">${ICONS.followup}</div>
        <div style="flex:1">
          <div class="activity-desc">${escapeHtml(l.lastActivity.desc)}</div>
          <div class="activity-time">${escapeHtml(l.lastActivity.time)} ago</div>
        </div>
      </div>
      <a style="font-size:11px;display:inline-block;margin-top:8px" id="activityHistoryLink">View full history</a>
    </div>
  </div>`;

  wireSelectedLead(l);
}

function pitchActionsHtml() {
  return `<div class="pitch-actions">
    <button data-pitch="regen">Regenerate</button>
    <button data-pitch="msg">Insert into Message</button>
    <button data-pitch="email">Insert into Email</button>
    <button data-pitch="copy">Copy</button>
  </div>`;
}

function wireSelectedLead(l) {
  const root = document.getElementById('selectedLeadBody');

  root.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
    const act = b.dataset.act;
    if (act === 'call') startCall(l, b.dataset.num);
    else if (act === 'sms' || act === 'wa') { leadsState.composeChannel = act === 'wa' ? 'WhatsApp' : 'SMS'; switchCommsTab('messages'); }
    else if (act === 'email') { leadsState.composeTo = b.dataset.addr; switchCommsTab('email'); }
  }));

  root.querySelectorAll('[data-doc]').forEach(el =>
    el.addEventListener('click', () => openDocViewer(l.id, el.dataset.doc)));

  root.querySelectorAll('[data-pitch]').forEach(b => b.addEventListener('click', () => {
    const mode = b.dataset.pitch;
    if (mode === 'regen') regeneratePitch(l);
    else if (mode === 'msg') { leadsState.pitchInsert = 'messages'; switchCommsTab('messages'); }
    else if (mode === 'email') { leadsState.pitchInsert = 'email'; switchCommsTab('email'); }
    else if (mode === 'copy') copyText(l._activePitch || l.pitch, 'Pitch copied');
  }));

  const toggle = document.getElementById('notesToggle');
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    document.getElementById('notesFull').classList.toggle('show');
  });
  document.getElementById('noteAddBtn').addEventListener('click', () => addNote(l));
  document.getElementById('noteInput').addEventListener('keydown', e => { if (e.key === 'Enter') addNote(l); });
  document.getElementById('activityHistoryLink').addEventListener('click', () => openActivityHistory(l));
}

function copyText(text, okMsg) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast(okMsg), () => toast('Could not copy — your browser blocked it', 'warn'));
  } else {
    toast('Copying is not available in this browser', 'warn');
  }
}

function regeneratePitch(l) {
  const variants = [
    l.pitch,
    `${l.company} is averaging ${fmtMoney(l.avgDeposits)}/mo. ${l.mcaBurden ? 'Existing MCA burden of ' + fmtMoney(l.mcaBurden) + '/mo is the pressure point — consolidation frees up cash flow.' : 'No existing MCA — clean position for a first advance.'} Lead with the ${fmtMoney(l.approval)} approval.`,
    `Quick opener: "${l.name.split(' ')[0]}, based on your last few statements you're clearing ${fmtMoney(l.avgDeposits)}/mo — we can likely get you to ${fmtMoney(l.approval)} with manageable payments."`
  ];
  const idx = (variants.indexOf(l._activePitch || l.pitch) + 1) % variants.length;
  l._activePitch = variants[idx];
  const box = document.getElementById('pitchBox');
  box.innerHTML = escapeHtml(l._activePitch) + pitchActionsHtml();
  box.querySelectorAll('[data-pitch]').forEach(b => b.addEventListener('click', () => {
    const mode = b.dataset.pitch;
    if (mode === 'regen') regeneratePitch(l);
    else if (mode === 'msg') { leadsState.pitchInsert = 'messages'; switchCommsTab('messages'); }
    else if (mode === 'email') { leadsState.pitchInsert = 'email'; switchCommsTab('email'); }
    else if (mode === 'copy') copyText(l._activePitch || l.pitch, 'Pitch copied');
  }));
}

function addNote(l) {
  const input = document.getElementById('noteInput');
  const text = input.value.trim();
  if (!text) return;
  l.notes.unshift({ author: 'Marcus Webb', time: 'now', text });
  input.value = '';
  renderSelectedLead();
  document.getElementById('notesFull').classList.add('show');
  document.getElementById('notesToggle').classList.add('open');
}

function toggleStar() {
  const l = getLead(leadsState.currentLeadId);
  if (!l) return;
  l.starred = !l.starred;
  prefs.starred = LEADS.filter(x => x.starred).map(x => x.id);
  savePrefs();
  renderLeadList();
  renderSelectedLead();
}

function openLeadMoreMenu(anchor) {
  const l = getLead(leadsState.currentLeadId);
  if (!l) return;
  popMenu(anchor, [
    { label: 'Edit lead', icon: ICONS.edit, onClick: () => openEditLead(l) },
    { label: 'Assign to another rep', icon: ICONS.assign, onClick: () => openEditLead(l, 'rep') },
    { label: l.starred ? 'Remove from favourites' : 'Add to favourites', icon: ICONS.star, onClick: toggleStar },
    { sep: true },
    { label: 'Copy contact details', icon: ICONS.copy, onClick: () => copyLeadDetails(l) },
    { label: 'Open application', icon: ICONS.file, onClick: () => openDocViewer(l.id, 'application') },
    { label: 'View activity history', icon: ICONS.followup, onClick: () => openActivityHistory(l) },
    { sep: true },
    { label: 'Print this lead', icon: ICONS.print, onClick: () => window.print() }
  ], { width: 240 });
}

function copyLeadDetails(l) {
  const lines = [
    l.company, l.name + ' · ' + l.title, l.address, '',
    'Mobiles: ' + l.mobiles.join(', '),
    'Landlines: ' + l.landlines.join(', '),
    'Emails: ' + l.emails.join(', '), '',
    'Bank: ' + l.bank,
    'Average monthly deposits: ' + fmtMoney(l.avgDeposits),
    'Requested funding: ' + fmtMoney(l.reqFunding),
    'Current approval: ' + fmtMoney(l.approval)
  ];
  copyText(lines.join('\n'), 'Contact details copied');
}

function openEditLead(l, focus) {
  openModal({
    title: 'Edit lead — ' + l.company,
    body:
      '<div class="form-grid">' +
        '<div class="form-row"><label>Status</label><select class="text-input" data-f="status">' +
          STATUSES.map(s => `<option ${s === l.status ? 'selected' : ''}>${s}</option>`).join('') + '</select></div>' +
        '<div class="form-row"><label>Assigned rep</label><select class="text-input" data-f="rep">' +
          uniqueValues('rep').map(r => `<option ${r === l.rep ? 'selected' : ''}>${escapeHtml(r)}</option>`).join('') + '</select></div>' +
        '<div class="form-row"><label>Requested funding</label><input class="text-input" type="number" data-f="reqFunding" value="' + l.reqFunding + '"></div>' +
        '<div class="form-row"><label>Current approval</label><input class="text-input" type="number" data-f="approval" value="' + l.approval + '"></div>' +
      '</div>' +
      '<div class="form-row"><label>Industry</label><input class="text-input" data-f="industry" value="' + escapeHtml(l.industry) + '"></div>' +
      '<div class="form-row"><label>Company address</label><input class="text-input" data-f="address" value="' + escapeHtml(l.address) + '"></div>',
    foot: '<span class="mf-note">Saved in this browser session only.</span>' +
          '<button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" data-save>Save changes</button>',
    onMount(card, close) {
      const f = focus === 'rep' ? card.querySelector('[data-f="rep"]') : card.querySelector('[data-f="status"]');
      if (f) f.focus();
      card.querySelector('[data-cancel]').addEventListener('click', close);
      card.querySelector('[data-save]').addEventListener('click', () => {
        card.querySelectorAll('[data-f]').forEach(inp => {
          const k = inp.dataset.f;
          l[k] = (inp.type === 'number') ? Number(inp.value) || 0 : inp.value;
        });
        close();
        renderLeadList();
        renderSelectedLead();
        toast('Lead updated');
      });
    }
  });
}

function openActivityHistory(l) {
  const items = [
    { icon: ICONS.followup, desc: l.lastActivity.desc, time: l.lastActivity.time + ' ago' },
    ...l.calls.map(c => ({ icon: ICONS.call, desc: (c.dir === 'missed' ? 'Missed call' : (c.dir === 'in' ? 'Inbound call' : 'Outbound call')) + ' · ' + c.num, time: c.time + ' ago' })),
    ...l.messages.map(m => ({ icon: ICONS.sms, desc: (m.dir === 'in' ? 'Received' : 'Sent') + ' ' + m.ch + ' message', time: m.date })),
    ...l.emailThreads.map(e => ({ icon: ICONS.envelope, desc: 'Email: ' + e.subject, time: e.time + ' ago' })),
    ...l.notes.map(n => ({ icon: ICONS.file, desc: 'Note added by ' + n.author, time: n.time + ' ago' }))
  ];
  openModal({
    title: 'Activity History — ' + l.company,
    body: items.map(i => `<div class="activity-line" style="padding:8px 0;border-bottom:1px solid var(--border)">
        <div class="activity-icon">${i.icon}</div>
        <div style="flex:1"><div class="activity-desc">${escapeHtml(i.desc)}</div><div class="activity-time">${escapeHtml(i.time)}</div></div>
      </div>`).join('') || '<div style="color:var(--text-muted);font-size:12px;padding:12px 0">No activity recorded yet.</div>'
  });
}

/* ============================================================
   COMMUNICATIONS PANEL
   ============================================================ */
const COMMS_TABS = [
  { key: 'all', label: 'All' }, { key: 'messages', label: 'Messages' }, { key: 'calllog', label: 'Call Log' },
  { key: 'contacts', label: 'Contacts' }, { key: 'email', label: 'Email' }
];
function switchCommsTab(key) { leadsState.commsTab = key; renderComms(); }

function renderComms() {
  const container = document.getElementById('commsBody');
  const l = getLead(leadsState.currentLeadId);
  if (!l) {
    container.innerHTML = emptyPanelHtml('No lead selected', 'Communications will appear here once you pick a lead.');
    return;
  }
  container.innerHTML = `
    <div class="comms-tabs" id="commsTabsBar"></div>
    <div class="comms-body" id="commsBodyInner"></div>
    ${dialerBarHtml(l)}`;

  const tabsBar = document.getElementById('commsTabsBar');
  COMMS_TABS.forEach(t => {
    const b = document.createElement('div');
    b.className = 'comms-tab' + (leadsState.commsTab === t.key ? ' active' : '');
    b.textContent = t.label;
    b.onclick = () => switchCommsTab(t.key);
    tabsBar.appendChild(b);
  });
  renderCommsBody(l);
  wireDialer(l);
}

function renderCommsBody(l) {
  const el = document.getElementById('commsBodyInner');
  const tab = leadsState.commsTab;
  if (tab === 'all') el.innerHTML = renderAllFeed(l);
  else if (tab === 'messages') el.innerHTML = renderMessages(l);
  else if (tab === 'calllog') el.innerHTML = renderCallLog(l);
  else if (tab === 'contacts') el.innerHTML = renderContactsTab(l);
  else if (tab === 'email') el.innerHTML = renderEmailTab(l);

  if (tab === 'messages') {
    const input = document.getElementById('msgComposerInput');
    const sendBtn = document.getElementById('msgSendBtn');
    if (leadsState.pitchInsert === 'messages') { input.value = l._activePitch || l.pitch; leadsState.pitchInsert = null; }
    if (sendBtn) sendBtn.onclick = () => sendCommsMessage(l);
    if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') sendCommsMessage(l); });
  }
  if (tab === 'contacts' || tab === 'calllog') {
    el.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
      const act = b.dataset.act;
      if (act === 'call') startCall(l, b.dataset.num);
      else if (act === 'sms' || act === 'wa') { leadsState.composeChannel = act === 'wa' ? 'WhatsApp' : 'SMS'; switchCommsTab('messages'); }
      else if (act === 'email') { leadsState.composeTo = b.dataset.addr; switchCommsTab('email'); }
    }));
  }
  if (tab === 'email') wireEmailCompose(l);
}

function renderAllFeed(l) {
  const feed = [
    ...l.calls.map(c => `<div class="feed-row"><div class="feed-icon ${c.dir === 'in' ? 'call-in' : c.dir === 'out' ? 'call-out' : 'call-miss'}">${ICONS.call}</div><div class="feed-main"><div class="feed-top"><span class="feed-who">${c.dir === 'missed' ? 'Missed call' : (c.dir === 'in' ? 'Inbound call' : 'Outbound call')}</span><span class="feed-time">${escapeHtml(c.time)} ago</span></div><div class="feed-preview">${escapeHtml(c.num)} · ${escapeHtml(c.dur)}</div></div></div>`),
    ...l.messages.map(m => `<div class="feed-row"><div class="feed-icon ${m.ch === 'WhatsApp' ? 'wa' : 'sms'}">${m.ch === 'WhatsApp' ? ICONS.wa : ICONS.sms}</div><div class="feed-main"><div class="feed-top"><span class="feed-who">${m.dir === 'in' ? 'Received' : 'Sent'} ${escapeHtml(m.ch)}</span><span class="feed-time">${escapeHtml(m.time)}</span></div><div class="feed-preview">${escapeHtml(m.text)}</div></div></div>`),
    ...l.emailThreads.map(e => `<div class="feed-row"><div class="feed-icon email">${ICONS.envelope}</div><div class="feed-main"><div class="feed-top"><span class="feed-who">${escapeHtml(e.subject)}</span><span class="feed-time">${escapeHtml(e.time)} ago</span></div><div class="feed-preview">${escapeHtml(e.preview)}</div></div></div>`)
  ];
  if (!feed.length) return '<div class="comms-empty">No communications recorded yet for this lead.</div>';
  return feed.join('');
}

function renderMessages(l) {
  if (!l.messages.length) return '<div class="comms-empty">No message history yet.</div>' + composerHtml();
  let lastDate = null, thread = '';
  l.messages.forEach(m => {
    if (m.date !== lastDate) { thread += `<div class="date-sep">${escapeHtml(m.date)}</div>`; lastDate = m.date; }
    thread += `<div class="msg-bubble ${m.dir} ${m.state === 'failed' ? 'failed' : ''}">${m.ch === 'WhatsApp' ? '<span class="msg-channel">WhatsApp</span><br>' : ''}${escapeHtml(m.text)}<div class="msg-meta">${escapeHtml(m.time)}</div>${m.dir === 'out' ? `<div class="msg-state">${escapeHtml(m.state === 'failed' ? 'Failed — ' + (m.error || 'not sent') : (m.state === 'read' ? 'Read' : m.state === 'delivered' ? 'Delivered' : 'Sent'))}</div>` : ''}</div>`;
  });
  return `<div class="msg-thread">${thread}</div>` + composerHtml();
}
function composerHtml() {
  return `<div class="composer">
      <button class="cbtn" id="msgAttachBtn" title="Attach">${ICONS.clip}</button>
      <input type="text" id="msgComposerInput" placeholder="Type a message…">
      <button id="msgSendBtn" title="Send">${ICONS.send}</button>
    </div>`;
}
/* Sending goes through the shared provider check, so the thread records a real
   failed send rather than a fake success. */
function sendCommsMessage(l) {
  const input = document.getElementById('msgComposerInput');
  const text = input.value.trim();
  if (!text) return;
  if (l.optOut) { toast('This contact is opted out — outreach is blocked', 'err'); return; }
  const result = deliverMessage();
  l.messages.push({
    dir: 'out', ch: leadsState.composeChannel || 'SMS', text, date: 'Today', time: 'Just now',
    num: l.mobiles[0], device: DEVICES[0].label,
    state: result.ok ? 'sent' : 'failed', error: result.ok ? null : result.error
  });
  if (result.ok) { registerOutreach(l); input.value = ''; }
  renderCommsBody(l);
  toast(result.ok ? 'Message sent' : 'Not sent — ' + result.error, result.ok ? '' : 'err');
}

function renderCallLog(l) {
  if (!l.calls.length) return '<div class="comms-empty">No call history yet.</div>';
  return l.calls.map(c => `<div class="call-log-row">
      <div class="call-dir-icon ${c.dir === 'in' ? 'call-in' : c.dir === 'out' ? 'call-out' : 'call-miss'}">${ICONS.call}</div>
      <div class="call-info"><div class="call-number">${escapeHtml(c.num)}</div><div class="call-sub">${c.dir === 'missed' ? 'Missed' : (c.dir === 'in' ? 'Incoming' : 'Outgoing')} · ${escapeHtml(c.device)} · ${escapeHtml(c.time)} ago</div></div>
      <div class="call-dur">${escapeHtml(c.dur)}</div>
      <button class="cicon-btn" title="Call back" data-act="call" data-num="${c.num}">${ICONS.call}</button>
    </div>`).join('');
}

function renderContactsTab(l) {
  return `<div style="padding:12px 14px">
    <div class="sl-section-title" style="margin-bottom:6px">${escapeHtml(l.name)}</div>
    ${l.mobiles.map((m, i) => `<div class="contact-row"><span class="contact-num">${m}</span><span class="contact-tag">Mobile ${i + 1}</span>${contactIconsMobile(m, l.id)}</div>`).join('')}
    ${l.landlines.map((n, i) => `<div class="contact-row"><span class="contact-num">${n}</span><span class="contact-tag">Landline ${i + 1}</span>${contactIconsLandline(n)}</div>`).join('')}
    ${l.emails.map((e, i) => `<div class="contact-row"><span class="contact-email">${escapeHtml(e)}</span><span class="contact-tag">Email ${i + 1}</span>${contactIconsEmail(e)}</div>`).join('')}
  </div>`;
}

function renderEmailTab(l) {
  const threads = l.emailThreads.length
    ? l.emailThreads.map(e => `<div class="email-row">
        <div class="email-row-top"><span class="email-subject">${escapeHtml(e.subject)}</span><span class="email-time">${escapeHtml(e.time)} ago</span></div>
        <div class="email-preview">${escapeHtml(e.preview)}</div>
        <div class="email-track ${e.tracking === 'opened' || e.tracking === 'replied' ? 'opened' : ''}">${trackingMark({ state: e.tracking, opens: e.opens || [] })}${escapeHtml(e.tracking)}</div>
      </div>`).join('')
    : '<div class="comms-empty">No email history yet.</div>';
  return threads + emailComposeHtml(l);
}
function emailComposeHtml(l) {
  const to = leadsState.composeTo || l.emails[0];
  const body = leadsState.pitchInsert === 'email' ? (l._activePitch || l.pitch) : '';
  leadsState.pitchInsert = null;
  return `<div class="email-compose">
    <div class="ec-label">New email</div>
    <div class="ec-fields">
      <input class="text-input" id="ecTo" value="${escapeHtml(to)}" placeholder="To">
      <input class="text-input" id="ecSubject" placeholder="Subject">
      <textarea class="text-input" id="ecBody" rows="4" placeholder="Write your message…">${escapeHtml(body)}</textarea>
      <div class="ec-tools">
        <button class="icon-btn" data-fmt="bold" title="Bold"><b>B</b></button>
        <button class="icon-btn" data-fmt="italic" title="Italic"><i>I</i></button>
        <button class="icon-btn" data-fmt="underline" title="Underline"><u>U</u></button>
        <button class="icon-btn" id="ecAttach" title="Attach">${ICONS.clip}</button>
        <button class="btn" id="ecDraft" style="margin-left:auto">Save draft</button>
        <button class="btn btn-primary" id="ecSend">Send</button>
      </div>
    </div>
  </div>`;
}
function wireEmailCompose(l) {
  const to = document.getElementById('ecTo');
  const subject = document.getElementById('ecSubject');
  const body = document.getElementById('ecBody');
  leadsState.composeTo = null;

  /* Bold / italic / underline wrap the current selection in the body text. */
  document.querySelectorAll('[data-fmt]').forEach(b => b.addEventListener('click', () => {
    const marks = { bold: '**', italic: '_', underline: '__' };
    const m = marks[b.dataset.fmt];
    const s = body.selectionStart, e = body.selectionEnd;
    if (s === e) { toast('Select some text first'); return; }
    body.value = body.value.slice(0, s) + m + body.value.slice(s, e) + m + body.value.slice(e);
    body.focus();
    body.setSelectionRange(s, e + m.length * 2);
  }));

  document.getElementById('ecAttach').addEventListener('click', () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.multiple = true;
    inp.addEventListener('change', () => {
      if (!inp.files.length) return;
      l.drafts = l.drafts || [];
      toast(inp.files.length + ' file' + (inp.files.length === 1 ? '' : 's') + ' attached to this draft');
    });
    inp.click();
  });

  document.getElementById('ecDraft').addEventListener('click', () => {
    if (!subject.value.trim() && !body.value.trim()) { toast('Nothing to save yet'); return; }
    l.drafts = l.drafts || [];
    l.drafts.push({ to: to.value, subject: subject.value, body: body.value, saved: 'Just now' });
    toast('Draft saved for ' + l.company);
  });

  /* Sending goes through the shared mail check. If it cannot go out the text is
     kept as a draft and the message says exactly what happened. */
  document.getElementById('ecSend').addEventListener('click', () => {
    if (!subject.value.trim() && !body.value.trim()) { toast('Write a subject or message first'); return; }
    const result = deliverEmail();
    if (result.ok) { toast('Email sent'); return; }
    l.drafts.push({ to: to.value, subject: subject.value, body: body.value, saved: 'Just now' });
    toast('Not sent — ' + result.error + '. Kept as a draft.', 'err');
  });
}

/* ============================================================
   DIALER
   No phone bridge exists, so the call is a local simulation and
   every label says so.
   ============================================================ */
function dialerBarHtml(l) {
  const d = leadsState.dialer;
  const contact = d.inCall ? (d.contact || l.name) : l.name;
  const num = (d.inCall ? d.number : null) || l.mobiles[0];
  return `<div class="dialer-bar">
    <div class="dialer-id">
      <div class="dialer-name">${escapeHtml(contact)}</div>
      <div class="dialer-number">${escapeHtml(num)}</div>
      <div class="dialer-status ${d.inCall ? 'live' : ''}" id="dialerStatusTxt">${d.inCall ? 'Simulated call · no device connected' : 'Not connected · demo mode'}</div>
    </div>
    <div class="dialer-timer" id="dialerTimer">${formatTimer(d.seconds)}</div>
    <button class="dialer-btn ${d.inCall ? 'call-end' : 'call-go'}" id="dialerCallBtn" title="${d.inCall ? 'Hang Up' : 'Call'}">${d.inCall ? ICONS.hangup : ICONS.call}</button>
    <button class="dialer-btn ${d.muted ? 'on' : ''}" id="dialerMuteBtn" title="Mute">${ICONS.mute}</button>
    <button class="dialer-btn ${d.speaker ? 'on' : ''}" id="dialerSpeakerBtn" title="Speaker">${ICONS.speaker}</button>
    <button class="dialer-btn" id="dialerKeypadBtn" title="Keypad">${ICONS.keypad}</button>
    ${keypadHtml()}
  </div>`;
}
function keypadHtml() {
  return `<div class="keypad-overlay" id="keypadOverlay" hidden>
      <div class="keypad-readout" id="keypadReadout">${escapeHtml(leadsState.keypadDigits) || '&nbsp;'}</div>
      <div class="keypad-grid">
        ${['1','2','3','4','5','6','7','8','9','*','0','#'].map(k => `<button class="keypad-key" data-key="${k}">${k}</button>`).join('')}
      </div>
      <div class="keypad-foot">
        <button data-kp="clear">Clear</button>
        <button data-kp="call">Call</button>
      </div>
    </div>`;
}
function formatTimer(s) { const m = Math.floor(s / 60), sec = s % 60; return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0'); }

function wireDialer(l) {
  document.getElementById('dialerCallBtn').onclick = () => leadsState.dialer.inCall ? hangUp() : startCall(l, l.mobiles[0]);
  document.getElementById('dialerMuteBtn').onclick = () => { leadsState.dialer.muted = !leadsState.dialer.muted; renderComms(); };
  document.getElementById('dialerSpeakerBtn').onclick = () => { leadsState.dialer.speaker = !leadsState.dialer.speaker; renderComms(); };
  document.getElementById('dialerKeypadBtn').onclick = e => {
    e.stopPropagation();
    const kp = document.getElementById('keypadOverlay');
    kp.hidden = !kp.hidden;
  };
  const readout = document.getElementById('keypadReadout');
  document.querySelectorAll('#keypadOverlay [data-key]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    if (leadsState.keypadDigits.length < 24) leadsState.keypadDigits += b.dataset.key;
    readout.textContent = leadsState.keypadDigits;
  }));
  document.querySelector('#keypadOverlay [data-kp="clear"]').addEventListener('click', e => {
    e.stopPropagation();
    leadsState.keypadDigits = '';
    readout.innerHTML = '&nbsp;';
  });
  document.querySelector('#keypadOverlay [data-kp="call"]').addEventListener('click', e => {
    e.stopPropagation();
    if (!leadsState.keypadDigits) { toast('Type a number first'); return; }
    startCall(l, leadsState.keypadDigits);
  });
}

function startCall(l, number) {
  const d = leadsState.dialer;
  d.inCall = true; d.seconds = 0; d.contact = l.name; d.number = number;
  clearInterval(d.timer);
  d.timer = setInterval(() => {
    d.seconds++;
    const t = document.getElementById('dialerTimer');
    if (t) t.textContent = formatTimer(d.seconds);
  }, 1000);
  renderComms();
  toast('Simulated call to ' + number + '. No phone is connected.', 'warn');
}
function hangUp() {
  const d = leadsState.dialer;
  clearInterval(d.timer);
  d.inCall = false; d.seconds = 0; d.timer = null;
  renderComms();
}

/* ============================================================
   INIT
   ============================================================ */
function initLeadsPage() {
  bootShell();
  initViewer();

  /* Favourites saved in a previous session. */
  LEADS.forEach(l => { l.starred = prefs.starred.includes(l.id); });

  const params = new URLSearchParams(location.search);
  const q = params.get('q');
  if (q) {
    leadsState.searchTerm = q;
    document.getElementById('globalSearch').value = q;
  }
  const deepLink = params.get('lead');
  if (deepLink && getLead(deepLink)) leadsState.currentLeadId = deepLink;

  renderLeadList();
  renderSelectedLead();
  renderComms();
  applyPanelWidths();
  setupResize();

  document.getElementById('leadFilterBtn').addEventListener('click', e => { e.stopPropagation(); openFilterMenu(e.currentTarget); });
  document.getElementById('leadSortBtn').addEventListener('click', e => { e.stopPropagation(); openSortMenu(e.currentTarget); });
  document.getElementById('leadMoreBtn').addEventListener('click', e => { e.stopPropagation(); openListMoreMenu(e.currentTarget); });
  document.getElementById('leadStarBtn').addEventListener('click', toggleStar);
  document.getElementById('leadDetailMoreBtn').addEventListener('click', e => { e.stopPropagation(); openLeadMoreMenu(e.currentTarget); });

  /* Hooks the shell calls. */
  window.onGlobalSearch = value => { leadsState.searchTerm = value; renderLeadList(); };
  window.onShellResize = () => { applyPanelWidths(); refitViewer(); };
  window.onShellDocumentClick = e => {
    const kp = document.getElementById('keypadOverlay');
    const kpBtn = document.getElementById('dialerKeypadBtn');
    if (kp && !kp.hidden && kpBtn && !kpBtn.contains(e.target) && !kp.contains(e.target)) kp.hidden = true;
  };
}
document.addEventListener('DOMContentLoaded', initLeadsPage);
