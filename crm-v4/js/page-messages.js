/* ============================================================
   page-messages.js — the Messages page.
   Conversation list · thread · composer · contact context.

   No messaging provider is connected in this build, so a send
   can never succeed. Sending produces a real failed-send state
   rather than a fake success, and the business rule that moves
   a lead from New to Engaged only runs on an actual success.
   ============================================================ */

const msgState = {
  currentLeadId: null,
  channel: 'SMS',
  number: null,
  device: DEVICES[0].id,
  search: '',
  sort: 'recent',
  filters: { channel: '', rep: '', read: '', status: '', optout: '' },
  attachments: [],
  drafts: {}          /* leadId -> composer text */
};

const MSG_SORTS = [
  { key: 'recent',  label: 'Most recent message' },
  { key: 'unread',  label: 'Unread first' },
  { key: 'company', label: 'Company A–Z' },
  { key: 'status',  label: 'Lead status' }
];

/* ---------- Templates (persisted) ---------- */
function templates() {
  if (!prefs.templates) prefs.templates = MESSAGE_TEMPLATES.map(t => ({ name: t.name, text: t.text }));
  return prefs.templates;
}
function fillTemplate(text, l) {
  return text
    .replace(/\{first\}/g, l.name.split(' ')[0])
    .replace(/\{company\}/g, l.company)
    .replace(/\{approval\}/g, fmtMoney(l.approval))
    .replace(/\{rep\}/g, l.rep);
}

/* ---------- Conversation helpers ---------- */
function lastMessage(l) { return l.messages.length ? l.messages[l.messages.length - 1] : null; }
function threadAgeMinutes(l) {
  const m = lastMessage(l);
  if (!m) return Number.MAX_SAFE_INTEGER;
  return agoMinutesFromDate(m.date);
}
/* The seeded threads carry human date labels, so they are ranked by label. */
const DATE_RANK = { 'Today': 0, 'Yesterday': 1, 'Monday': 2, '2 days ago': 2, '3 days ago': 3, '4 days ago': 4, '5 days ago': 5, '6d ago': 6 };
function agoMinutesFromDate(label) {
  return (DATE_RANK[label] !== undefined ? DATE_RANK[label] : 9) * 1440;
}

function conversations() {
  const q = msgState.search.trim().toLowerCase();
  const f = msgState.filters;
  let list = LEADS.filter(l => l.messages.length);

  list = list.filter(l => {
    if (q) {
      const hay = [l.company, l.name, l.rep, ...l.mobiles, ...l.landlines, ...l.emails,
                   ...l.messages.map(m => m.text)].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.channel && !l.messages.some(m => m.ch === f.channel)) return false;
    if (f.rep && l.rep !== f.rep) return false;
    if (f.status && l.status !== f.status) return false;
    if (f.read === 'unread' && !l.unread) return false;
    if (f.read === 'read' && l.unread) return false;
    if (f.optout === 'yes' && !l.optOut) return false;
    if (f.optout === 'no' && l.optOut) return false;
    return true;
  });

  const s = msgState.sort;
  return list.slice().sort((a, b) => {
    if (s === 'company') return a.company.localeCompare(b.company);
    if (s === 'status') return STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status);
    if (s === 'unread') {
      if (!!b.unread !== !!a.unread) return (b.unread ? 1 : 0) - (a.unread ? 1 : 0);
      return threadAgeMinutes(a) - threadAgeMinutes(b);
    }
    return threadAgeMinutes(a) - threadAgeMinutes(b);
  });
}

function activeMsgFilterCount() {
  const f = msgState.filters;
  return Object.keys(f).filter(k => f[k]).length;
}

/* ============================================================
   CONVERSATION LIST
   ============================================================ */
function renderConversations() {
  const scroll = document.getElementById('convScroll');
  const list = conversations();
  document.getElementById('convCount').textContent = list.length + ' conversation' + (list.length === 1 ? '' : 's');
  document.getElementById('convFilterBtn').classList.toggle('on', activeMsgFilterCount() > 0);

  const bar = document.getElementById('convFilterBar');
  const n = activeMsgFilterCount();
  const showBar = n > 0 || msgState.sort !== 'recent';
  bar.hidden = !showBar;
  if (showBar) {
    bar.innerHTML = (n ? n + ' filter' + (n === 1 ? '' : 's') + ' · ' : '') +
      escapeHtml((MSG_SORTS.find(s => s.key === msgState.sort) || MSG_SORTS[0]).label) +
      '<a id="convClear">Clear</a>';
    document.getElementById('convClear').addEventListener('click', () => {
      msgState.filters = { channel: '', rep: '', read: '', status: '', optout: '' };
      msgState.sort = 'recent';
      renderConversations();
    });
  }

  if (!list.length) {
    scroll.innerHTML = '<div class="conv-empty">No conversations match your search or filters.</div>';
    return;
  }
  scroll.innerHTML = list.map(l => {
    const m = lastMessage(l);
    const ch = m.ch === 'WhatsApp' ? 'wa' : 'sms';
    return `<div class="conv-row ${l.id === msgState.currentLeadId ? 'selected' : ''} ${l.unread ? 'unread' : ''}" data-id="${l.id}">
      <div class="conv-avatar" style="background:${l.color}">${l.initials}</div>
      <div class="conv-main">
        <div class="conv-top">
          <span class="conv-company">${escapeHtml(l.company)}</span>
          <span class="conv-time">${escapeHtml(m.date)}</span>
        </div>
        <div class="conv-contact">${escapeHtml(l.name)}</div>
        <div class="conv-preview">${m.dir === 'out' ? 'You: ' : ''}${escapeHtml(m.text)}</div>
        <div class="conv-meta">
          <span class="ch ${ch}">${m.ch === 'WhatsApp' ? ICONS.wa : ICONS.sms}${escapeHtml(m.ch)}</span>
          <span>${escapeHtml(l.status)}</span>
          <span>${escapeHtml(l.rep)}</span>
          ${l.optOut ? '<span class="conv-optout">Opted out</span>' : ''}
        </div>
      </div>
      ${l.unread ? '<span class="conv-unread" title="Unread"></span>' : ''}
    </div>`;
  }).join('');
  scroll.querySelectorAll('.conv-row').forEach(r =>
    r.addEventListener('click', () => selectConversation(r.dataset.id)));
}

function selectConversation(id) {
  if (msgState.currentLeadId) msgState.drafts[msgState.currentLeadId] = composerText();
  msgState.currentLeadId = id;
  const l = getLead(id);
  l.unread = 0;
  msgState.number = l.mobiles[0];
  msgState.attachments = [];
  renderConversations();
  renderThread();
  renderContext();
}
function composerText() {
  const t = document.getElementById('mcText');
  return t ? t.value : '';
}

function openConvFilterMenu(anchor) {
  const f = msgState.filters;
  const set = (k, v) => { f[k] = (f[k] === v) ? '' : v; renderConversations(); };
  const reps = [...new Set(LEADS.map(l => l.rep))].sort();
  const items = [
    { heading: true, label: 'Channel' },
    { label: 'SMS', active: f.channel === 'SMS', onClick: () => set('channel', 'SMS') },
    { label: 'WhatsApp', active: f.channel === 'WhatsApp', onClick: () => set('channel', 'WhatsApp') },
    { sep: true }, { heading: true, label: 'Read state' },
    { label: 'Unread only', active: f.read === 'unread', onClick: () => set('read', 'unread') },
    { label: 'Read only', active: f.read === 'read', onClick: () => set('read', 'read') },
    { sep: true }, { heading: true, label: 'Assigned rep' },
    ...reps.map(r => ({ label: r, active: f.rep === r, onClick: () => set('rep', r) })),
    { sep: true }, { heading: true, label: 'Lead status' },
    ...STATUSES.map(s => ({ label: s, active: f.status === s, onClick: () => set('status', s) })),
    { sep: true }, { heading: true, label: 'Opt-out' },
    { label: 'Opted out only', active: f.optout === 'yes', onClick: () => set('optout', 'yes') },
    { label: 'Contactable only', active: f.optout === 'no', onClick: () => set('optout', 'no') },
    { sep: true },
    { label: 'Save this filter', icon: ICONS.check, onClick: saveCurrentFilter },
    ...(prefs.savedFilters.length ? [{ heading: true, label: 'Saved filters' }] : []),
    ...prefs.savedFilters.map((sf, i) => ({
      label: sf.name, tail: 'apply',
      onClick: () => { msgState.filters = Object.assign({}, sf.filters); msgState.sort = sf.sort; renderConversations(); }
    }))
  ];
  popMenu(anchor, items, { align: 'left', width: 230 });
}

function saveCurrentFilter() {
  if (!activeMsgFilterCount() && msgState.sort === 'recent') { toast('Choose a filter first'); return; }
  openModal({
    title: 'Save this filter',
    body: '<div class="form-row"><label>Name</label><input class="text-input" id="sfName" placeholder="e.g. Unread WhatsApp"></div>',
    foot: '<button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" data-ok>Save filter</button>',
    onMount(card, close) {
      const input = card.querySelector('#sfName');
      input.focus();
      card.querySelector('[data-cancel]').addEventListener('click', close);
      card.querySelector('[data-ok]').addEventListener('click', () => {
        const name = input.value.trim();
        if (!name) { toast('Give the filter a name'); return; }
        prefs.savedFilters.push({ name, filters: Object.assign({}, msgState.filters), sort: msgState.sort });
        const ok = savePrefs();
        close();
        toast(ok ? 'Filter saved' : 'Could not save — this browser is blocking storage', ok ? '' : 'err');
      });
    }
  });
}

function openConvSortMenu(anchor) {
  popMenu(anchor, MSG_SORTS.map(s => ({
    label: s.label, active: msgState.sort === s.key,
    onClick: () => { msgState.sort = s.key; renderConversations(); }
  })), { align: 'left', width: 220 });
}

/* ============================================================
   THREAD
   ============================================================ */
function renderThread() {
  const head = document.getElementById('threadHead');
  const body = document.getElementById('threadBody');
  const l = getLead(msgState.currentLeadId);
  if (!l) {
    head.innerHTML = '<span class="ph-title-txt">Conversation</span>';
    body.innerHTML = emptyPanelHtml('No conversation selected', 'Pick a conversation on the left to read the thread.');
    return;
  }
  head.innerHTML = `
    <div class="thread-head-id">
      <div class="th-name">${escapeHtml(l.name)} · ${escapeHtml(l.company)}</div>
      <div class="th-sub">${escapeHtml(msgState.number || l.mobiles[0])}</div>
    </div>
    <div class="panel-header-actions">
      <button class="icon-btn" id="threadOpenLead" title="Open this lead">${ICONS.external}</button>
      <button class="icon-btn" id="threadMore" title="Thread options">${ICONS.more}</button>
    </div>`;

  let lastDate = null, thread = '';
  l.messages.forEach((m, i) => {
    if (m.date !== lastDate) { thread += `<div class="date-sep">${escapeHtml(m.date)}</div>`; lastDate = m.date; }
    thread += `<div class="msg-bubble ${m.dir} ${m.state === 'failed' ? 'failed' : ''}" data-i="${i}">
      ${m.ch === 'WhatsApp' ? '<span class="msg-channel">WhatsApp</span><br>' : ''}${escapeHtml(m.text)}
      <div class="msg-meta">${escapeHtml(m.time)}</div>
      ${m.dir === 'out' ? `<div class="msg-state">${escapeHtml(stateLabel(m))}</div>` : ''}
    </div>`;
  });

  body.innerHTML =
    (PROVIDER.connected ? '' :
      `<div class="provider-banner">${ICONS.alertTriangle}No ${escapeHtml(PROVIDER.name)} is connected, so messages cannot be sent from here.<a id="bannerSettings">Open settings</a></div>`) +
    `<div class="thread-scroll" id="threadScroll"><div class="thread-inner">${thread}</div></div>` +
    composerBlock(l);

  const scroll = document.getElementById('threadScroll');
  scroll.scrollTop = scroll.scrollHeight;

  document.getElementById('threadOpenLead').addEventListener('click', () => {
    location.href = 'index.html?lead=' + encodeURIComponent(l.id);
  });
  document.getElementById('threadMore').addEventListener('click', e => { e.stopPropagation(); openThreadMenu(e.currentTarget, l); });
  const bs = document.getElementById('bannerSettings');
  if (bs) bs.addEventListener('click', () => openSettings('Devices'));

  body.querySelectorAll('.msg-bubble').forEach(b =>
    b.addEventListener('dblclick', () => openMessageDetails(l, Number(b.dataset.i))));

  wireComposer(l);
}

function stateLabel(m) {
  if (m.state === 'failed') return 'Failed — ' + (m.error || 'not sent');
  if (m.state === 'read') return 'Read';
  if (m.state === 'delivered') return 'Delivered';
  return 'Sent';
}

function openThreadMenu(anchor, l) {
  popMenu(anchor, [
    { label: 'Message details', icon: ICONS.file, onClick: () => openMessageDetails(l, l.messages.length - 1) },
    { label: 'Open this lead', icon: ICONS.external, onClick: () => { location.href = 'index.html?lead=' + encodeURIComponent(l.id); } },
    { label: l.unread ? 'Mark as read' : 'Mark as unread', icon: ICONS.check,
      onClick: () => { l.unread = l.unread ? 0 : 1; renderConversations(); } },
    { sep: true },
    { label: l.optOut ? 'Remove opt-out' : 'Mark opted out', icon: ICONS.close, danger: !l.optOut,
      onClick: () => { l.optOut = !l.optOut; renderConversations(); renderThread(); renderContext();
        toast(l.optOut ? 'Marked opted out — outreach is now blocked' : 'Opt-out removed'); } },
    { label: 'Export this thread', icon: ICONS.download, onClick: () => exportThread(l) }
  ], { width: 230 });
}

function openMessageDetails(l, i) {
  const m = l.messages[i];
  if (!m) return;
  openModal({
    title: 'Message details',
    body: '<table class="data-table"><tbody>' +
      [['Direction', m.dir === 'in' ? 'Received' : 'Sent'],
       ['Channel', m.ch],
       ['Contact', l.name + ' · ' + l.company],
       ['Number', m.num || l.mobiles[0]],
       ['Sending device', m.device || '—'],
       ['Date', m.date + ' ' + m.time],
       ['State', m.dir === 'out' ? stateLabel(m) : 'Received']]
        .map(r => `<tr><td style="color:var(--text-muted);width:150px">${escapeHtml(r[0])}</td><td>${escapeHtml(r[1])}</td></tr>`).join('') +
      '</tbody></table>' +
      '<div style="margin-top:12px;font-size:12px;white-space:pre-wrap">' + escapeHtml(m.text) + '</div>'
  });
}

function exportThread(l) {
  const lines = l.messages.map(m =>
    `${m.date} ${m.time}\t${m.dir === 'in' ? 'Received' : 'Sent'}\t${m.ch}\t${m.num || ''}\t${m.text}`);
  const txt = `Thread with ${l.name} (${l.company})\n\n` + lines.join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }));
  a.download = 'thread-' + l.company.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Thread exported');
}

/* ============================================================
   COMPOSER
   ============================================================ */
function composerBlock(l) {
  if (l.optOut) {
    return `<div class="mc-blocked">${escapeHtml(l.name)} is marked opted out, so outreach to this contact is blocked. Remove the opt-out from the thread menu before messaging.</div>`;
  }
  const numbers = l.mobiles.map(n => `<option ${n === msgState.number ? 'selected' : ''}>${n}</option>`).join('');
  const devices = DEVICES.map(d => `<option value="${d.id}" ${d.id === msgState.device ? 'selected' : ''}>${escapeHtml(d.label)} — ${escapeHtml(d.state)}</option>`).join('');
  const draft = msgState.drafts[l.id] || '';
  return `<div class="msg-composer">
    <div class="mc-row">
      <label>To</label><select id="mcNumber">${numbers}</select>
      <label>Channel</label>
      <select id="mcChannel">
        <option ${msgState.channel === 'SMS' ? 'selected' : ''}>SMS</option>
        <option ${msgState.channel === 'WhatsApp' ? 'selected' : ''}>WhatsApp</option>
      </select>
      <label>From</label><select id="mcDevice">${devices}</select>
    </div>
    <textarea class="mc-text" id="mcText" placeholder="Write a message…">${escapeHtml(draft)}</textarea>
    <div class="mc-attachments" id="mcAttachments"></div>
    <div class="mc-tools">
      <button class="icon-btn" id="mcTemplates" title="Templates">${ICONS.file}</button>
      <button class="icon-btn" id="mcEmoji" title="Emoji">${ICONS.emoji}</button>
      <button class="icon-btn" id="mcAttach" title="Attach a file">${ICONS.clip}</button>
      <span class="spacer"></span>
      <span class="mc-count" id="mcCount"></span>
      <button class="btn" id="mcClear">Clear</button>
      <button class="btn" id="mcDraft">Save draft</button>
      <button class="btn btn-primary" id="mcSend">Send</button>
    </div>
  </div>`;
}

function wireComposer(l) {
  const text = document.getElementById('mcText');
  if (!text) return;                    /* opted out — composer is blocked */

  const count = document.getElementById('mcCount');
  const paint = () => {
    const n = text.value.length;
    count.textContent = n ? n + ' char' + (n === 1 ? '' : 's') + (msgState.channel === 'SMS' ? ' · ' + Math.ceil(n / 160) + ' SMS' : '') : '';
  };
  text.addEventListener('input', paint);
  paint();
  renderAttachments();

  document.getElementById('mcNumber').addEventListener('change', e => {
    msgState.number = e.target.value;
    document.querySelector('.th-sub').textContent = msgState.number;
  });
  document.getElementById('mcChannel').addEventListener('change', e => { msgState.channel = e.target.value; paint(); });
  document.getElementById('mcDevice').addEventListener('change', e => { msgState.device = e.target.value; });

  document.getElementById('mcTemplates').addEventListener('click', e => { e.stopPropagation(); openTemplateMenu(e.currentTarget, l); });
  document.getElementById('mcEmoji').addEventListener('click', e => { e.stopPropagation(); openEmojiMenu(e.currentTarget, text); });
  document.getElementById('mcAttach').addEventListener('click', () => pickAttachment());

  document.getElementById('mcClear').addEventListener('click', () => {
    text.value = ''; msgState.attachments = []; msgState.drafts[l.id] = '';
    renderAttachments(); paint(); text.focus();
  });
  document.getElementById('mcDraft').addEventListener('click', () => {
    if (!text.value.trim()) { toast('Nothing to save yet'); return; }
    msgState.drafts[l.id] = text.value;
    toast('Draft kept for ' + l.company + ' in this session');
  });
  document.getElementById('mcSend').addEventListener('click', () => sendMessage(l));
}

function renderAttachments() {
  const host = document.getElementById('mcAttachments');
  if (!host) return;
  host.innerHTML = msgState.attachments.map((a, i) =>
    `<span class="mc-chip">${escapeHtml(a.name)} <button data-rm="${i}" title="Remove">${ICONS.close}</button></span>`).join('');
  host.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => {
    msgState.attachments.splice(Number(b.dataset.rm), 1);
    renderAttachments();
  }));
}
function pickAttachment() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.multiple = true;
  inp.addEventListener('change', () => {
    [...inp.files].forEach(f => {
      if (f.size > 5 * 1024 * 1024) { toast(f.name + ' is over 5 MB and was not attached', 'err'); return; }
      msgState.attachments.push({ name: f.name, size: f.size });
    });
    renderAttachments();
  });
  inp.click();
}

function openEmojiMenu(anchor, text) {
  const el = popMenu(anchor, [{ heading: true, label: 'Emoji' }], { align: 'left', width: 250 });
  const grid = document.createElement('div');
  grid.className = 'emoji-pop';
  grid.innerHTML = EMOJI.map(e => `<button type="button">${e}</button>`).join('');
  el.appendChild(grid);
  grid.querySelectorAll('button').forEach(b => b.addEventListener('click', ev => {
    ev.stopPropagation();
    const p = text.selectionStart;
    text.value = text.value.slice(0, p) + b.textContent + text.value.slice(text.selectionEnd);
    text.focus();
    text.setSelectionRange(p + b.textContent.length, p + b.textContent.length);
    closePop();
  }));
}

function openTemplateMenu(anchor, l) {
  const items = templates().map(t => ({
    label: t.name, icon: ICONS.file,
    onClick: () => {
      const text = document.getElementById('mcText');
      text.value = (text.value ? text.value + '\n' : '') + fillTemplate(t.text, l);
      text.dispatchEvent(new Event('input'));
      text.focus();
    }
  }));
  items.push({ sep: true }, { label: 'Manage templates', icon: ICONS.settings, onClick: () => openTemplateManager(l) });
  popMenu(anchor, items, { align: 'left', width: 260 });
}

function openTemplateManager(l) {
  let search = '';
  const m = openModal({
    title: 'Message templates',
    body: '<div class="form-row"><input class="text-input" id="tplSearch" placeholder="Search templates…"></div><div class="tpl-list" id="tplList"></div>',
    foot: '<span class="mf-note" id="tplNote"></span><button class="btn" data-new>New template</button><button class="btn" data-close2>Done</button>',
    onMount(card, close) {
      card.querySelector('[data-close2]').addEventListener('click', close);
      card.querySelector('[data-new]').addEventListener('click', () => editTemplate(null, paint));
      card.querySelector('#tplSearch').addEventListener('input', e => { search = e.target.value.toLowerCase(); paint(); });
      function paint() {
        const list = templates().filter(t => !search || (t.name + ' ' + t.text).toLowerCase().includes(search));
        const host = card.querySelector('#tplList');
        host.innerHTML = list.length ? list.map(t => {
          const i = templates().indexOf(t);
          return `<div class="tpl-item">
            <div class="tp-main"><div class="tp-name">${escapeHtml(t.name)}</div><div class="tp-text">${escapeHtml(t.text)}</div></div>
            <div class="tp-actions">
              <button class="icon-btn" data-ins="${i}" title="Insert">${ICONS.send}</button>
              <button class="icon-btn" data-edit="${i}" title="Edit">${ICONS.edit}</button>
              <button class="icon-btn" data-dup="${i}" title="Duplicate">${ICONS.copy}</button>
              <button class="icon-btn" data-del="${i}" title="Delete">${ICONS.trash}</button>
            </div></div>`;
        }).join('') : '<div style="padding:16px 0;color:var(--text-muted);font-size:12px">No templates match that search.</div>';

        host.querySelectorAll('[data-ins]').forEach(b => b.addEventListener('click', () => {
          const t = templates()[Number(b.dataset.ins)];
          const text = document.getElementById('mcText');
          if (!text) { toast('Open a conversation first'); return; }
          text.value = (text.value ? text.value + '\n' : '') + fillTemplate(t.text, l);
          text.dispatchEvent(new Event('input'));
          close();
        }));
        host.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editTemplate(Number(b.dataset.edit), paint)));
        host.querySelectorAll('[data-dup]').forEach(b => b.addEventListener('click', () => {
          const t = templates()[Number(b.dataset.dup)];
          templates().push({ name: t.name + ' (copy)', text: t.text });
          reportSave(card); paint();
        }));
        host.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
          confirmModal('Delete template', 'This removes the template from this browser.', 'Delete', () => {
            templates().splice(Number(b.dataset.del), 1);
            reportSave(card); paint();
          });
        }));
      }
      paint();
    }
  });
  return m;
}
function reportSave(card) {
  const ok = savePrefs();
  const note = card.querySelector('#tplNote');
  if (note) note.textContent = ok ? 'Saved in this browser.' : 'This browser is blocking storage — nothing was saved.';
  if (!ok) toast('Templates could not be saved — storage is blocked', 'err');
}

function editTemplate(index, done) {
  const t = index === null ? { name: '', text: '' } : templates()[index];
  openModal({
    title: index === null ? 'New template' : 'Edit template',
    body: '<div class="form-row"><label>Name</label><input class="text-input" id="teName" value="' + escapeHtml(t.name) + '"></div>' +
          '<div class="form-row"><label>Message</label><textarea class="text-input" id="teText" rows="5">' + escapeHtml(t.text) + '</textarea></div>' +
          '<div style="font-size:11px;color:var(--text-muted)">Variables that are filled in when you insert: {first}, {company}, {approval}, {rep}</div>',
    foot: '<button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" data-save>Save template</button>',
    onMount(card, close) {
      card.querySelector('[data-cancel]').addEventListener('click', close);
      card.querySelector('[data-save]').addEventListener('click', () => {
        const name = card.querySelector('#teName').value.trim();
        const text = card.querySelector('#teText').value.trim();
        if (!name || !text) { toast('A template needs a name and a message'); return; }
        if (index === null) templates().push({ name, text });
        else { t.name = name; t.text = text; }
        const ok = savePrefs();
        close();
        toast(ok ? 'Template saved' : 'Template could not be saved — storage is blocked', ok ? '' : 'err');
        if (done) done();
      });
    }
  });
}

/* ---------- Sending ----------
   The provider is not connected, so this can only ever produce a real
   failure. The message is recorded in the thread as failed, and the
   engagement rule below is not reached. */
function sendMessage(l) {
  const text = document.getElementById('mcText');
  const body = text.value.trim();
  if (!body) { toast('Write a message first'); return; }
  if (l.optOut) { toast('This contact is opted out — outreach is blocked', 'err'); return; }

  const number = msgState.number || l.mobiles[0];
  if (!/\d{3}.*\d{4}/.test(number)) { toast('That recipient number is not valid', 'err'); return; }

  const device = DEVICES.find(d => d.id === msgState.device);
  const result = deliverMessage();

  l.messages.push({
    dir: 'out', ch: msgState.channel, text: body, date: 'Today', time: 'Just now',
    num: number, device: device.label,
    state: result.ok ? 'sent' : 'failed',
    error: result.ok ? null : result.error
  });

  if (result.ok) {
    registerOutreach(l);
    msgState.drafts[l.id] = '';
    text.value = '';
    msgState.attachments = [];
  }
  renderThread();
  renderConversations();
  toast(result.ok ? 'Message sent' : 'Not sent — ' + result.error, result.ok ? '' : 'err');
}

/* ============================================================
   CONTACT CONTEXT
   ============================================================ */
function renderContext() {
  const body = document.getElementById('contextBody');
  const l = getLead(msgState.currentLeadId);
  if (!l) {
    body.innerHTML = emptyPanelHtml('No conversation selected', 'Lead and contact context appears here.');
    return;
  }
  const statusColor = STATUS_COLOR[l.status] || 'var(--text-muted)';
  body.innerHTML = `<div class="ctx-scroll">
    <div class="ctx-identity">
      <div class="ctx-avatar" style="background:${l.color}">${l.initials}</div>
      <div style="min-width:0">
        <div class="ctx-company">${escapeHtml(l.company)}</div>
        <div class="ctx-owner">${escapeHtml(l.name)} · ${escapeHtml(l.title)}</div>
        <div class="ctx-status" style="color:${statusColor}">${escapeHtml(l.status)}${l.optOut ? ' · opted out' : ''}</div>
      </div>
    </div>

    <div class="ctx-section">
      <div class="ctx-title">Assignment<a id="ctxOpenLead">Open lead</a></div>
      <div class="field-grid">
        <div class="field-row"><span class="field-label">Assigned rep</span><span class="field-val">${escapeHtml(l.rep)}</span></div>
        <div class="field-row"><span class="field-label">Requested funding</span><span class="field-val">${fmtMoney(l.reqFunding)}</span></div>
        <div class="field-row"><span class="field-label">Current approval</span><span class="field-val">${fmtMoney(l.approval)}</span></div>
        <div class="field-row"><span class="field-label">Avg monthly deposits</span><span class="field-val">${fmtMoney(l.avgDeposits)}</span></div>
      </div>
    </div>

    <div class="ctx-section">
      <div class="ctx-title">Contact</div>
      ${l.mobiles.map((m, i) => `<div class="contact-row"><span class="contact-num">${m}</span><span class="contact-tag">Mobile ${i + 1}</span>
        <div class="contact-icons">
          <button class="cicon-btn" title="Use this number" data-use="${m}">${ICONS.sms}</button>
        </div></div>`).join('')}
      ${l.landlines.map((n, i) => `<div class="contact-row"><span class="contact-num">${n}</span><span class="contact-tag">Landline ${i + 1}</span></div>`).join('')}
      ${l.emails.map((e, i) => `<div class="contact-row"><span class="contact-email">${escapeHtml(e)}</span><span class="contact-tag">Email ${i + 1}</span></div>`).join('')}
    </div>

    <div class="ctx-section">
      <div class="ctx-title">Recent activity</div>
      <div class="activity-line" style="margin-bottom:6px">
        <div class="activity-icon">${ICONS.followup}</div>
        <div style="flex:1"><div class="activity-desc">${escapeHtml(l.lastActivity.desc)}</div>
        <div class="activity-time">${escapeHtml(l.lastActivity.time)} ago</div></div>
      </div>
      ${l.calls.slice(0, 2).map(c => `<div class="activity-line" style="margin-bottom:6px">
        <div class="activity-icon">${ICONS.call}</div>
        <div style="flex:1"><div class="activity-desc">${c.dir === 'missed' ? 'Missed call' : (c.dir === 'in' ? 'Inbound call' : 'Outbound call')} · ${escapeHtml(c.dur)}</div>
        <div class="activity-time">${escapeHtml(c.time)} ago</div></div></div>`).join('')}
    </div>

    <div class="ctx-section">
      <div class="ctx-title">Notes</div>
      ${l.notes.slice(0, 2).map(n => `<div class="note-line"><div class="note-meta">${escapeHtml(n.author)} · ${escapeHtml(n.time)} ago</div>${escapeHtml(n.text)}</div>`).join('')
        || '<div class="note-line" style="color:var(--text-muted)">No notes yet.</div>'}
    </div>

    <div class="ctx-section">
      <div class="ctx-title">Documents</div>
      <div class="ctx-doc"><button data-doc="application" title="Open application">${ICONS.file}</button><span class="cd-name" data-doc="application">Application</span></div>
      ${l.statements.map(st => `<div class="ctx-doc"><button data-doc="${st.key}" title="Open ${escapeHtml(st.month)}">${ICONS.file}</button><span class="cd-name" data-doc="${st.key}">${escapeHtml(st.month)} statement</span></div>`).join('')}
    </div>
  </div>`;

  document.getElementById('ctxOpenLead').addEventListener('click', () => {
    location.href = 'index.html?lead=' + encodeURIComponent(l.id);
  });
  body.querySelectorAll('[data-use]').forEach(b => b.addEventListener('click', () => {
    msgState.number = b.dataset.use;
    renderThread();
  }));
  body.querySelectorAll('[data-doc]').forEach(b => b.addEventListener('click', () => openDocViewer(l.id, b.dataset.doc)));
}

/* ============================================================
   INIT
   ============================================================ */
function initMessagesPage() {
  bootShell();
  initViewer();

  const first = conversations()[0];
  if (first) selectConversation(first.id);
  else { renderConversations(); renderThread(); renderContext(); }

  document.getElementById('convSearchInput').addEventListener('input', e => {
    msgState.search = e.target.value;
    renderConversations();
  });
  document.getElementById('convFilterBtn').addEventListener('click', e => { e.stopPropagation(); openConvFilterMenu(e.currentTarget); });
  document.getElementById('convSortBtn').addEventListener('click', e => { e.stopPropagation(); openConvSortMenu(e.currentTarget); });
  document.getElementById('convTemplatesBtn').addEventListener('click', () => {
    const l = getLead(msgState.currentLeadId);
    if (!l) { toast('Open a conversation first'); return; }
    openTemplateManager(l);
  });

  window.onGlobalSearch = value => { msgState.search = value; renderConversations(); };
  window.onShellResize = () => refitViewer();
}
document.addEventListener('DOMContentLoaded', initMessagesPage);
