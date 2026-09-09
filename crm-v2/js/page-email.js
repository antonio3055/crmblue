/* ============================================================
   page-email.js — the Email page.
   Mailboxes · thread list · reading view · compose overlay.

   No mail account is connected, so a send can never succeed.
   Sending reports the real failure and keeps the message as a
   draft. Tracking states come from the demo dataset and are
   labelled as such; nothing new is ever given a tracking state.
   ============================================================ */

const mailState = {
  mailbox: 'inbox',
  threadId: null,
  search: '',
  sort: 'recent',
  filters: { rep: '', status: '', read: '', tracking: '', attachments: '' }
};

const MAIL_SORTS = [
  { key: 'recent',  label: 'Newest first' },
  { key: 'oldest',  label: 'Oldest first' },
  { key: 'company', label: 'Company A–Z' },
  { key: 'subject', label: 'Subject A–Z' }
];
const MBOX_ICON = {
  inbox: ICONS.inbox, sent: ICONS.send, drafts: ICONS.edit,
  starred: ICONS.star, archived: ICONS.archive, trash: ICONS.trash
};

/* ---------- Persistence ---------- */
function mailDrafts() {
  if (!prefs.emailDrafts) prefs.emailDrafts = [];
  return prefs.emailDrafts;
}
function signatures() {
  if (!prefs.signatures) prefs.signatures = DEFAULT_SIGNATURES.map(s => ({ name: s.name, text: s.text }));
  return prefs.signatures;
}
function defaultSignature() {
  const list = signatures();
  const i = Math.min(prefs.defaultSignature || 0, list.length - 1);
  return list[i] || { name: '', text: '' };
}
function mailTemplates() {
  if (!prefs.emailTemplates) prefs.emailTemplates = EMAIL_TEMPLATES.map(t => ({ name: t.name, text: t.text }));
  return prefs.emailTemplates;
}

/* ---------- Threads ---------- */
function allThreads() { return EMAIL_THREADS.concat(mailDrafts()); }

function threadDate(t) { return t.messages.length ? t.messages[t.messages.length - 1].date : ''; }
const MAIL_DATE_RANK = { 'Today': 0, 'Yesterday': 1, '2 days ago': 2, '3 days ago': 3, '4 days ago': 4, '5 days ago': 5, '6 days ago': 6 };
function threadRank(t) { const d = threadDate(t); return MAIL_DATE_RANK[d] !== undefined ? MAIL_DATE_RANK[d] : 9; }

function mailboxCount(key) {
  return allThreads().filter(t => inMailbox(t, key)).length;
}
function unreadCount(key) {
  return allThreads().filter(t => inMailbox(t, key) && t.unread).length;
}
function inMailbox(t, key) {
  if (key === 'starred') return !!t.starred && t.mailbox !== 'trash';
  return t.mailbox === key;
}

function visibleThreads() {
  const q = mailState.search.trim().toLowerCase();
  const f = mailState.filters;
  let list = allThreads().filter(t => inMailbox(t, mailState.mailbox));

  list = list.filter(t => {
    if (q) {
      const hay = [t.subject, t.company, t.rep,
        ...t.messages.map(m => m.body + ' ' + m.from + ' ' + m.to.join(' '))].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.rep && t.rep !== f.rep) return false;
    if (f.status && t.status !== f.status) return false;
    if (f.read === 'unread' && !t.unread) return false;
    if (f.read === 'read' && t.unread) return false;
    if (f.tracking && t.tracking !== f.tracking) return false;
    if (f.attachments === 'yes' && !t.hasAttachments) return false;
    return true;
  });

  const s = mailState.sort;
  return list.slice().sort((a, b) => {
    if (s === 'company') return (a.company || '').localeCompare(b.company || '');
    if (s === 'subject') return a.subject.localeCompare(b.subject);
    if (s === 'oldest') return threadRank(b) - threadRank(a);
    return threadRank(a) - threadRank(b);
  });
}
function getThread(id) { return allThreads().find(t => t.id === id); }
function activeMailFilterCount() {
  return Object.keys(mailState.filters).filter(k => mailState.filters[k]).length;
}

/* ============================================================
   MAILBOX COLUMN
   ============================================================ */
function renderMailboxes() {
  const host = document.getElementById('mboxList');
  host.innerHTML = MAILBOXES.map(b => {
    const u = unreadCount(b.key);
    const n = b.key === 'inbox' || b.key === 'drafts' ? (u || mailboxCount(b.key)) : mailboxCount(b.key);
    return `<button class="mbox-item ${b.key === mailState.mailbox ? 'active' : ''}" data-mbox="${b.key}">
      ${MBOX_ICON[b.key]}<span>${b.label}</span><span class="cnt">${n || ''}</span></button>`;
  }).join('');
  host.querySelectorAll('[data-mbox]').forEach(b => b.addEventListener('click', () => {
    mailState.mailbox = b.dataset.mbox;
    mailState.threadId = null;
    renderMailboxes(); renderThreadList(); renderReader();
  }));
}

/* ============================================================
   THREAD LIST
   ============================================================ */
function renderThreadList() {
  const scroll = document.getElementById('mlistScroll');
  const list = visibleThreads();
  document.getElementById('mlistTitle').textContent = (MAILBOXES.find(b => b.key === mailState.mailbox) || {}).label;
  document.getElementById('mlistCount').textContent = list.length + ' thread' + (list.length === 1 ? '' : 's');
  document.getElementById('mailFilterBtn').classList.toggle('on', activeMailFilterCount() > 0);

  const bar = document.getElementById('mailFilterBar');
  const n = activeMailFilterCount();
  const show = n > 0 || mailState.sort !== 'recent';
  bar.hidden = !show;
  if (show) {
    bar.innerHTML = (n ? n + ' filter' + (n === 1 ? '' : 's') + ' · ' : '') +
      escapeHtml((MAIL_SORTS.find(s => s.key === mailState.sort) || MAIL_SORTS[0]).label) + '<a id="mailClear">Clear</a>';
    document.getElementById('mailClear').addEventListener('click', () => {
      mailState.filters = { rep: '', status: '', read: '', tracking: '', attachments: '' };
      mailState.sort = 'recent';
      renderThreadList();
    });
  }

  if (!list.length) {
    scroll.innerHTML = '<div class="mlist-empty">Nothing here. Threads that match your search and filters will appear in this list.</div>';
    return;
  }
  scroll.innerHTML = list.map(t => {
    const last = t.messages[t.messages.length - 1];
    const who = t.mailbox === 'sent' || t.mailbox === 'drafts'
      ? 'To ' + (last.to[0] || '—')
      : (last.dir === 'in' ? last.from : 'You');
    return `<div class="mrow ${t.id === mailState.threadId ? 'selected' : ''} ${t.unread ? 'unread' : ''}" data-id="${t.id}">
      <button class="mrow-star ${t.starred ? 'on' : ''}" data-star="${t.id}" title="${t.starred ? 'Unstar' : 'Star'}">${t.starred ? ICONS.starFill : ICONS.star}</button>
      <div class="mrow-main">
        <div class="mrow-top"><span class="mrow-who">${escapeHtml(who)}</span><span class="mrow-time">${escapeHtml(threadDate(t))} ${escapeHtml(last.time)}</span></div>
        <div class="mrow-subject">${escapeHtml(t.subject)}</div>
        <div class="mrow-preview">${escapeHtml(last.body.replace(/\s+/g, ' ').slice(0, 90))}</div>
        <div class="mrow-meta">
          <span>${escapeHtml(t.company)}</span>
          ${t.messages.length > 1 ? '<span>' + t.messages.length + ' messages</span>' : ''}
          ${t.hasAttachments ? '<span title="Has attachments">' + ICONS.clip + '</span>' : ''}
          ${t.tracking ? '<span class="tr ' + t.tracking + '">' + ICONS.envelope + escapeHtml(t.tracking) + '</span>' : ''}
        </div>
      </div>
    </div>`;
  }).join('');

  scroll.querySelectorAll('.mrow').forEach(r => r.addEventListener('click', e => {
    if (e.target.closest('[data-star]')) return;
    selectThread(r.dataset.id);
  }));
  scroll.querySelectorAll('[data-star]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const t = getThread(b.dataset.star);
    t.starred = !t.starred;
    renderMailboxes(); renderThreadList();
  }));
}

function selectThread(id) {
  mailState.threadId = id;
  const t = getThread(id);
  if (t) t.unread = false;
  if (t && t.mailbox === 'drafts') { renderMailboxes(); renderThreadList(); openCompose({ draft: t }); return; }
  renderMailboxes();
  renderThreadList();
  renderReader();
}

function openMailFilterMenu(anchor) {
  const f = mailState.filters;
  const set = (k, v) => { f[k] = f[k] === v ? '' : v; renderThreadList(); };
  const reps = [...new Set(allThreads().map(t => t.rep))].sort();
  popMenu(anchor, [
    { heading: true, label: 'Read state' },
    { label: 'Unread only', active: f.read === 'unread', onClick: () => set('read', 'unread') },
    { label: 'Read only', active: f.read === 'read', onClick: () => set('read', 'read') },
    { sep: true }, { heading: true, label: 'Tracking' },
    ...['sent', 'unopened', 'opened', 'replied'].map(s => ({ label: s, active: f.tracking === s, onClick: () => set('tracking', s) })),
    { sep: true }, { heading: true, label: 'Attachments' },
    { label: 'Has attachments', active: f.attachments === 'yes', onClick: () => set('attachments', 'yes') },
    { sep: true }, { heading: true, label: 'Assigned rep' },
    ...reps.map(r => ({ label: r, active: f.rep === r, onClick: () => set('rep', r) })),
    { sep: true }, { heading: true, label: 'Lead status' },
    ...STATUSES.map(s => ({ label: s, active: f.status === s, onClick: () => set('status', s) }))
  ], { align: 'left', width: 220 });
}
function openMailSortMenu(anchor) {
  popMenu(anchor, MAIL_SORTS.map(s => ({
    label: s.label, active: mailState.sort === s.key,
    onClick: () => { mailState.sort = s.key; renderThreadList(); }
  })), { align: 'left', width: 200 });
}

/* ============================================================
   READING VIEW
   ============================================================ */
function renderReader() {
  const head = document.getElementById('mreadHead');
  const body = document.getElementById('mreadBody');
  const t = getThread(mailState.threadId);
  if (!t) {
    head.innerHTML = '<span class="ph-title-txt">Message</span>';
    body.innerHTML = emptyPanelHtml('No message selected', 'Choose a thread from the list to read it here.');
    return;
  }
  head.innerHTML = `<span class="ph-title-txt trunc">${escapeHtml(t.subject)}</span>
    <div class="panel-header-actions">
      <button class="icon-btn" id="mrReply" title="Reply">${ICONS.chevLeft}</button>
      <button class="icon-btn" id="mrArchive" title="Archive">${ICONS.archive}</button>
      <button class="icon-btn" id="mrTrash" title="Move to trash">${ICONS.trash}</button>
      <button class="icon-btn" id="mrMore" title="More">${ICONS.more}</button>
    </div>`;

  body.innerHTML = `<div class="mread-scroll">
    <div class="mread-subject">${escapeHtml(t.subject)}</div>
    <div class="mread-context">${escapeHtml(t.company)}${t.status ? ' · ' + escapeHtml(t.status) : ''} · ${escapeHtml(t.rep)}
      ${t.leadId ? ' · <a id="mrOpenLead">Open lead</a>' : ''}
      ${t.tracking ? ' · <a id="mrTracking">Tracking detail</a>' : ''}</div>
    ${t.messages.map(m => `<div class="mail-msg">
      <div class="mail-msg-head">
        <div style="min-width:0">
          <div class="who">${escapeHtml(m.dir === 'out' ? ME.name : m.from)}</div>
          <div class="addr">to ${escapeHtml(m.to.join(', '))}${m.cc.length ? ' · cc ' + escapeHtml(m.cc.join(', ')) : ''}${m.bcc.length ? ' · bcc ' + escapeHtml(m.bcc.join(', ')) : ''}</div>
        </div>
        <div class="when">${escapeHtml(m.date)}<br>${escapeHtml(m.time)}</div>
      </div>
      <div class="mail-msg-body">${escapeHtml(m.body)}</div>
      ${m.attachments && m.attachments.length ? `<div class="mail-attach">${m.attachments.map(a =>
        `<a data-att="${escapeHtml(a.name)}">${ICONS.clip}${escapeHtml(a.name)} · ${Math.round(a.size / 1024)} KB</a>`).join('')}</div>` : ''}
    </div>`).join('')}
    <div class="mread-actions">
      <button class="btn" id="mrReply2">Reply</button>
      <button class="btn" id="mrReplyAll">Reply all</button>
      <button class="btn" id="mrForward">Forward</button>
    </div>
  </div>`;

  const reply = () => openCompose({ replyTo: t, all: false });
  document.getElementById('mrReply').addEventListener('click', reply);
  document.getElementById('mrReply2').addEventListener('click', reply);
  document.getElementById('mrReplyAll').addEventListener('click', () => openCompose({ replyTo: t, all: true }));
  document.getElementById('mrForward').addEventListener('click', () => openCompose({ forward: t }));
  document.getElementById('mrArchive').addEventListener('click', () => moveThread(t, 'archived'));
  document.getElementById('mrTrash').addEventListener('click', () => moveThread(t, 'trash'));
  document.getElementById('mrMore').addEventListener('click', e => { e.stopPropagation(); openReaderMenu(e.currentTarget, t); });

  const ol = document.getElementById('mrOpenLead');
  if (ol) ol.addEventListener('click', () => { location.href = 'index.html?lead=' + encodeURIComponent(t.leadId); });
  const tr = document.getElementById('mrTracking');
  if (tr) tr.addEventListener('click', () => openTracking(t));

  body.querySelectorAll('[data-att]').forEach(a => a.addEventListener('click', () => {
    toast('Attachments cannot be downloaded — no mail account is connected', 'err');
  }));
}

function moveThread(t, mailbox) {
  t.mailbox = mailbox;
  mailState.threadId = null;
  renderMailboxes(); renderThreadList(); renderReader();
  toast('Moved to ' + (MAILBOXES.find(b => b.key === mailbox) || {}).label);
}

function openReaderMenu(anchor, t) {
  popMenu(anchor, [
    { label: 'Mark as unread', icon: ICONS.envelope, onClick: () => { t.unread = true; mailState.threadId = null; renderMailboxes(); renderThreadList(); renderReader(); } },
    { label: t.starred ? 'Remove star' : 'Star this thread', icon: ICONS.star, onClick: () => { t.starred = !t.starred; renderMailboxes(); renderThreadList(); } },
    { sep: true }, { heading: true, label: 'Move to' },
    ...MAILBOXES.filter(b => b.key !== 'starred' && b.key !== 'drafts').map(b => ({
      label: b.label, active: t.mailbox === b.key, onClick: () => moveThread(t, b.key)
    })),
    { sep: true },
    ...(t.tracking ? [{ label: 'Tracking detail', icon: ICONS.trendUp, onClick: () => openTracking(t) }] : []),
    ...(t.leadId ? [{ label: 'Open associated lead', icon: ICONS.external, onClick: () => { location.href = 'index.html?lead=' + encodeURIComponent(t.leadId); } }] : []),
    { label: 'View source', icon: ICONS.file, onClick: () => openSource(t) },
    { label: 'Print this thread', icon: ICONS.print, onClick: () => window.print() }
  ], { width: 230 });
}

function openTracking(t) {
  openModal({
    title: 'Tracking — ' + t.subject,
    body: '<table class="data-table"><tbody>' +
      [['State', t.tracking],
       ['Opens', String(t.opens || 0)],
       ['Latest open', t.lastOpen || '—'],
       ['Replied', t.tracking === 'replied' ? 'Yes' : 'No']]
      .map(r => `<tr><td style="color:var(--text-muted);width:140px">${escapeHtml(r[0])}</td><td>${escapeHtml(r[1])}</td></tr>`).join('') +
      '</tbody></table>' +
      '<p style="margin-top:12px;font-size:11.5px;color:var(--accent-red)">These states come from the demo dataset. No mail account is connected, so no real open or delivery tracking is available.</p>'
  });
}

function openSource(t) {
  const m = t.messages[t.messages.length - 1];
  const src = [
    'From: ' + m.from,
    'To: ' + m.to.join(', '),
    m.cc.length ? 'Cc: ' + m.cc.join(', ') : null,
    m.bcc.length ? 'Bcc: ' + m.bcc.join(', ') : null,
    'Subject: ' + t.subject,
    'Date: ' + m.date + ' ' + m.time,
    'Content-Type: text/plain; charset=UTF-8',
    '', m.body
  ].filter(Boolean).join('\n');
  openModal({
    title: 'Message source',
    body: '<pre style="font-family:\'JetBrains Mono\',monospace;font-size:11px;white-space:pre-wrap;color:var(--text-secondary)">' +
          escapeHtml(src) + '</pre>'
  });
}

/* ============================================================
   COMPOSE
   ============================================================ */
const MAX_ATTACHMENT = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'];

function fillMailTemplate(text, lead) {
  const sig = defaultSignature().text;
  if (!lead) return text.replace(/\{first\}/g, 'there').replace(/\{company\}/g, 'your business')
    .replace(/\{approval\}/g, 'the approved amount').replace(/\{signature\}/g, sig);
  return text
    .replace(/\{first\}/g, lead.name.split(' ')[0])
    .replace(/\{company\}/g, lead.company)
    .replace(/\{approval\}/g, fmtMoney(lead.approval))
    .replace(/\{rep\}/g, lead.rep)
    .replace(/\{signature\}/g, sig);
}

function openCompose(opts) {
  opts = opts || {};
  const src = opts.replyTo || opts.forward;
  const draft = opts.draft;
  let to = '', cc = '', bcc = '', subject = '', bodyText = '';
  let leadId = null, attachments = [];

  if (draft) {
    to = draft.messages[0].to.join(', '); cc = draft.messages[0].cc.join(', '); bcc = draft.messages[0].bcc.join(', ');
    subject = draft.subject; bodyText = draft.messages[0].body; leadId = draft.leadId;
    attachments = (draft.messages[0].attachments || []).slice();
  } else if (opts.replyTo) {
    const last = src.messages[src.messages.length - 1];
    to = last.dir === 'in' ? last.from : last.to.join(', ');
    if (opts.all) cc = last.cc.filter(a => a !== ME.email).join(', ');
    subject = src.subject.startsWith('Re: ') ? src.subject : 'Re: ' + src.subject;
    bodyText = '\n\n— on ' + last.date + ' ' + last.time + ', ' + last.from + ' wrote —\n' + last.body;
    leadId = src.leadId;
  } else if (opts.forward) {
    subject = src.subject.startsWith('Fwd: ') ? src.subject : 'Fwd: ' + src.subject;
    const last = src.messages[src.messages.length - 1];
    bodyText = '\n\n— forwarded message —\nFrom: ' + last.from + '\nDate: ' + last.date + ' ' + last.time + '\n\n' + last.body;
    leadId = src.leadId;
    attachments = (last.attachments || []).slice();
  }

  const lead = leadId ? getLead(leadId) : null;
  const sigText = defaultSignature().text;
  const startBody = (bodyText || '') + (draft ? '' : '\n\n' + sigText);

  const m = openModal({
    title: draft ? 'Edit draft' : (opts.replyTo ? 'Reply' : opts.forward ? 'Forward' : 'New message'),
    wide: true,
    body: `
      <div class="cz-row"><label>From</label><input id="czFrom" value="${escapeHtml(ME.email)}" readonly></div>
      <div class="cz-row"><label>To</label><input id="czTo" value="${escapeHtml(to)}" placeholder="name@company.com">
        <button class="cz-toggle" id="czCcToggle">Cc / Bcc</button></div>
      <div class="cz-row" id="czCcRow" ${cc || bcc ? '' : 'hidden'}><label>Cc</label><input id="czCc" value="${escapeHtml(cc)}"></div>
      <div class="cz-row" id="czBccRow" ${cc || bcc ? '' : 'hidden'}><label>Bcc</label><input id="czBcc" value="${escapeHtml(bcc)}"></div>
      <div class="cz-row"><label>Subject</label><input id="czSubject" value="${escapeHtml(subject)}" placeholder="Subject"></div>
      <div class="cz-body" id="czBody" contenteditable="true" data-placeholder="Write your message…"></div>
      <div class="cz-attach" id="czAttach"></div>
      <div class="cz-tools">
        <select id="czFont" title="Font">
          <option value="Inter">Inter</option><option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times</option><option value="Courier New">Courier</option>
        </select>
        <select id="czSize" title="Size">
          <option value="2">Small</option><option value="3" selected>Normal</option>
          <option value="4">Large</option><option value="5">Huge</option>
        </select>
        <input type="color" id="czColor" value="#1E2235" title="Text colour">
        <span class="cz-sep"></span>
        <button class="icon-btn" data-cmd="bold" title="Bold"><b>B</b></button>
        <button class="icon-btn" data-cmd="italic" title="Italic"><i>I</i></button>
        <button class="icon-btn" data-cmd="underline" title="Underline"><u>U</u></button>
        <span class="cz-sep"></span>
        <button class="icon-btn" data-cmd="justifyLeft" title="Align left">${ICONS.alignLeft}</button>
        <button class="icon-btn" data-cmd="justifyCenter" title="Align centre">${ICONS.alignCenter}</button>
        <button class="icon-btn" data-cmd="justifyRight" title="Align right">${ICONS.alignRight}</button>
        <span class="cz-sep"></span>
        <button class="icon-btn" data-cmd="insertUnorderedList" title="Bulleted list">${ICONS.listUl}</button>
        <button class="icon-btn" data-cmd="insertOrderedList" title="Numbered list">${ICONS.listOl}</button>
        <button class="icon-btn" id="czLink" title="Insert link">${ICONS.link}</button>
        <button class="icon-btn" id="czEmoji" title="Emoji">${ICONS.emoji}</button>
        <span class="cz-sep"></span>
        <button class="icon-btn" id="czTemplate" title="Templates">${ICONS.file}</button>
        <button class="icon-btn" id="czSignature" title="Signature">${ICONS.edit}</button>
        <button class="icon-btn" id="czAttachBtn" title="Attach a file">${ICONS.clip}</button>
      </div>`,
    foot: '<span class="mf-note" id="czNote"></span>' +
          '<button class="btn" id="czDiscard">Discard</button>' +
          '<button class="btn" id="czSave">Save draft</button>' +
          '<button class="btn btn-primary" id="czSend">Send</button>',
    onMount(card, close) {
      const $ = id => card.querySelector('#' + id);
      const bodyEl = $('czBody');
      bodyEl.textContent = startBody;

      $('czCcToggle').addEventListener('click', () => {
        const hidden = $('czCcRow').hidden;
        $('czCcRow').hidden = !hidden; $('czBccRow').hidden = !hidden;
      });

      const exec = (cmd, val) => { bodyEl.focus(); document.execCommand(cmd, false, val || null); };
      card.querySelectorAll('[data-cmd]').forEach(b =>
        b.addEventListener('click', () => exec(b.dataset.cmd)));
      $('czFont').addEventListener('change', e => exec('fontName', e.target.value));
      $('czSize').addEventListener('change', e => exec('fontSize', e.target.value));
      $('czColor').addEventListener('input', e => exec('foreColor', e.target.value));
      $('czLink').addEventListener('click', () => {
        const url = prompt('Link address');
        if (url) exec('createLink', url);
      });
      $('czEmoji').addEventListener('click', e => {
        e.stopPropagation();
        const el = popMenu(e.currentTarget, [{ heading: true, label: 'Emoji' }], { align: 'left', width: 250 });
        const grid = document.createElement('div');
        grid.className = 'emoji-pop';
        grid.innerHTML = EMOJI.map(x => `<button type="button">${x}</button>`).join('');
        el.appendChild(grid);
        grid.querySelectorAll('button').forEach(b => b.addEventListener('click', ev => {
          ev.stopPropagation(); exec('insertText', b.textContent); closePop();
        }));
      });
      $('czTemplate').addEventListener('click', e => {
        e.stopPropagation();
        popMenu(e.currentTarget, mailTemplates().map(t => ({
          label: t.name, icon: ICONS.file,
          onClick: () => { bodyEl.textContent = fillMailTemplate(t.text, lead); }
        })).concat([{ sep: true }, { label: 'Manage templates', icon: ICONS.settings, onClick: () => openMailTemplateManager(bodyEl, lead) }]),
        { align: 'left', width: 250 });
      });
      $('czSignature').addEventListener('click', e => {
        e.stopPropagation();
        popMenu(e.currentTarget, signatures().map((s, i) => ({
          label: s.name, icon: ICONS.edit, active: i === (prefs.defaultSignature || 0),
          onClick: () => { bodyEl.textContent = bodyEl.textContent + '\n\n' + s.text; }
        })).concat([{ sep: true }, { label: 'Manage signatures', icon: ICONS.settings, onClick: openSignatureManager }]),
        { align: 'left', width: 220 });
      });

      function paintAttachments() {
        $('czAttach').innerHTML = attachments.map((a, i) =>
          `<span class="mc-chip">${escapeHtml(a.name)} · ${Math.round(a.size / 1024)} KB <button data-rm="${i}" title="Remove">${ICONS.close}</button></span>`).join('');
        $('czAttach').querySelectorAll('[data-rm]').forEach(b =>
          b.addEventListener('click', () => { attachments.splice(Number(b.dataset.rm), 1); paintAttachments(); }));
      }
      paintAttachments();

      $('czAttachBtn').addEventListener('click', () => {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.multiple = true;
        inp.addEventListener('change', () => {
          [...inp.files].forEach(f => {
            const ext = f.name.split('.').pop().toLowerCase();
            if (!ALLOWED_TYPES.includes(ext)) { toast(f.name + ' is not a supported file type', 'err'); return; }
            if (f.size > MAX_ATTACHMENT) { toast(f.name + ' is over the 10 MB limit', 'err'); return; }
            attachments.push({ name: f.name, size: f.size });
          });
          paintAttachments();
        });
        inp.click();
      });

      function currentDraft() {
        return {
          id: draft ? draft.id : 'draft-' + Date.now(),
          mailbox: 'drafts', unread: false, starred: false,
          subject: $('czSubject').value || '(no subject)',
          tracking: null, opens: 0, lastOpen: null,
          leadId, company: lead ? lead.company : 'Internal', rep: lead ? lead.rep : ME.name,
          status: lead ? lead.status : null,
          hasAttachments: attachments.length > 0,
          messages: [{
            id: 'draft-msg', dir: 'out', from: ME.email,
            to: splitAddrs($('czTo').value), cc: splitAddrs($('czCc').value), bcc: splitAddrs($('czBcc').value),
            date: 'Today', time: 'Draft', body: bodyEl.innerText, attachments: attachments.slice()
          }]
        };
      }

      function saveDraft(quiet) {
        const d = currentDraft();
        const list = mailDrafts();
        const i = list.findIndex(x => x.id === d.id);
        if (i > -1) list[i] = d; else list.push(d);
        const ok = savePrefs();
        $('czNote').textContent = ok ? 'Draft saved.' : 'This browser is blocking storage — the draft was not saved.';
        if (!quiet) toast(ok ? 'Draft saved' : 'Draft could not be saved — storage is blocked', ok ? '' : 'err');
        renderMailboxes(); renderThreadList();
        return ok;
      }

      $('czSave').addEventListener('click', () => saveDraft(false));

      $('czDiscard').addEventListener('click', () => {
        const hasContent = $('czSubject').value.trim() || bodyEl.innerText.trim();
        if (!hasContent) { close(); return; }
        confirmModal('Discard this message', 'The text you have written will be lost unless you save it as a draft.', 'Discard', () => {
          if (draft) {
            const list = mailDrafts();
            const i = list.findIndex(x => x.id === draft.id);
            if (i > -1) { list.splice(i, 1); savePrefs(); }
            mailState.threadId = null;
            renderMailboxes(); renderThreadList(); renderReader();
          }
          close();
        });
      });

      $('czSend').addEventListener('click', () => {
        const toList = splitAddrs($('czTo').value);
        if (!toList.length) { toast('Add at least one recipient', 'err'); return; }
        const bad = toList.filter(a => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a));
        if (bad.length) { toast('Not a valid address: ' + bad[0], 'err'); return; }
        if (lead && lead.optOut) { toast(lead.name + ' is opted out — outreach is blocked', 'err'); return; }
        if (!$('czSubject').value.trim() && !bodyEl.innerText.trim()) { toast('Write a subject or a message first', 'err'); return; }

        const result = deliverEmail();
        if (result.ok) {
          if (lead) registerOutreach(lead);
          close();
          toast('Email sent');
          return;
        }
        /* It did not go out, so it is kept as a draft and named as a failure.
           No tracking state is attached, because none exists. */
        saveDraft(true);
        $('czNote').textContent = 'Not sent — ' + result.error + '. Kept in Drafts.';
        toast('Not sent — ' + result.error + '. Kept in Drafts.', 'err');
      });
    }
  });
  return m;
}

function splitAddrs(v) {
  return String(v || '').split(/[,;]/).map(s => s.trim()).filter(Boolean);
}

/* ---------- Templates and signatures ---------- */
function openMailTemplateManager(bodyEl, lead) {
  let search = '';
  openModal({
    title: 'Email templates',
    body: '<div class="form-row"><input class="text-input" id="etSearch" placeholder="Search templates…"></div><div class="tpl-list" id="etList"></div>',
    foot: '<span class="mf-note" id="etNote"></span><button class="btn" data-new>New template</button><button class="btn" data-close2>Done</button>',
    onMount(card, close) {
      card.querySelector('[data-close2]').addEventListener('click', close);
      card.querySelector('[data-new]').addEventListener('click', () => editMailTemplate(null, paint));
      card.querySelector('#etSearch').addEventListener('input', e => { search = e.target.value.toLowerCase(); paint(); });
      function paint() {
        const all = mailTemplates();
        const list = all.filter(t => !search || (t.name + ' ' + t.text).toLowerCase().includes(search));
        const host = card.querySelector('#etList');
        host.innerHTML = list.length ? list.map(t => {
          const i = all.indexOf(t);
          return `<div class="tpl-item"><div class="tp-main"><div class="tp-name">${escapeHtml(t.name)}</div>
            <div class="tp-text">${escapeHtml(t.text.replace(/\s+/g, ' ').slice(0, 110))}</div></div>
            <div class="tp-actions">
              <button class="icon-btn" data-ins="${i}" title="Insert">${ICONS.send}</button>
              <button class="icon-btn" data-edit="${i}" title="Edit">${ICONS.edit}</button>
              <button class="icon-btn" data-dup="${i}" title="Duplicate">${ICONS.copy}</button>
              <button class="icon-btn" data-del="${i}" title="Delete">${ICONS.trash}</button>
            </div></div>`;
        }).join('') : '<div style="padding:16px 0;color:var(--text-muted);font-size:12px">No templates match that search.</div>';

        host.querySelectorAll('[data-ins]').forEach(b => b.addEventListener('click', () => {
          if (!bodyEl) { toast('Open a message first'); return; }
          bodyEl.textContent = fillMailTemplate(all[Number(b.dataset.ins)].text, lead);
          close();
        }));
        host.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editMailTemplate(Number(b.dataset.edit), paint)));
        host.querySelectorAll('[data-dup]').forEach(b => b.addEventListener('click', () => {
          const t = all[Number(b.dataset.dup)];
          all.push({ name: t.name + ' (copy)', text: t.text });
          noteSave(card, '#etNote'); paint();
        }));
        host.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
          confirmModal('Delete template', 'This removes the template from this browser.', 'Delete', () => {
            all.splice(Number(b.dataset.del), 1); noteSave(card, '#etNote'); paint();
          });
        }));
      }
      paint();
    }
  });
}
function noteSave(card, sel) {
  const ok = savePrefs();
  const n = card.querySelector(sel);
  if (n) n.textContent = ok ? 'Saved in this browser.' : 'This browser is blocking storage — nothing was saved.';
  if (!ok) toast('Could not save — storage is blocked', 'err');
}
function editMailTemplate(index, done) {
  const all = mailTemplates();
  const t = index === null ? { name: '', text: '' } : all[index];
  openModal({
    title: index === null ? 'New email template' : 'Edit email template',
    body: '<div class="form-row"><label>Name</label><input class="text-input" id="etName" value="' + escapeHtml(t.name) + '"></div>' +
          '<div class="form-row"><label>Body</label><textarea class="text-input" id="etText" rows="8">' + escapeHtml(t.text) + '</textarea></div>' +
          '<div style="font-size:11px;color:var(--text-muted)">Variables filled in on insert: {first}, {company}, {approval}, {rep}, {signature}</div>',
    foot: '<button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" data-save>Save template</button>',
    onMount(card, close) {
      card.querySelector('[data-cancel]').addEventListener('click', close);
      card.querySelector('[data-save]').addEventListener('click', () => {
        const name = card.querySelector('#etName').value.trim();
        const text = card.querySelector('#etText').value.trim();
        if (!name || !text) { toast('A template needs a name and a body'); return; }
        if (index === null) all.push({ name, text }); else { t.name = name; t.text = text; }
        const ok = savePrefs();
        close();
        toast(ok ? 'Template saved' : 'Template could not be saved — storage is blocked', ok ? '' : 'err');
        if (done) done();
      });
    }
  });
}

function openSignatureManager() {
  openModal({
    title: 'Signatures',
    body: '<div class="tpl-list" id="sgList"></div>',
    foot: '<span class="mf-note" id="sgNote"></span><button class="btn" data-new>New signature</button><button class="btn" data-close2>Done</button>',
    onMount(card, close) {
      card.querySelector('[data-close2]').addEventListener('click', close);
      card.querySelector('[data-new]').addEventListener('click', () => editSignature(null, paint));
      function paint() {
        const all = signatures();
        card.querySelector('#sgList').innerHTML = all.map((s, i) => `<div class="tpl-item">
          <div class="tp-main"><div class="tp-name">${escapeHtml(s.name)}${i === (prefs.defaultSignature || 0) ? ' · default' : ''}</div>
          <div class="tp-text">${escapeHtml(s.text.replace(/\n/g, ' · '))}</div></div>
          <div class="tp-actions">
            <button class="icon-btn" data-def="${i}" title="Make default">${ICONS.check}</button>
            <button class="icon-btn" data-edit="${i}" title="Edit">${ICONS.edit}</button>
            <button class="icon-btn" data-del="${i}" title="Delete">${ICONS.trash}</button>
          </div></div>`).join('');
        card.querySelectorAll('[data-def]').forEach(b => b.addEventListener('click', () => {
          prefs.defaultSignature = Number(b.dataset.def); noteSave(card, '#sgNote'); paint();
        }));
        card.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editSignature(Number(b.dataset.edit), paint)));
        card.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
          if (signatures().length === 1) { toast('Keep at least one signature'); return; }
          confirmModal('Delete signature', 'This removes the signature from this browser.', 'Delete', () => {
            signatures().splice(Number(b.dataset.del), 1);
            if ((prefs.defaultSignature || 0) >= signatures().length) prefs.defaultSignature = 0;
            noteSave(card, '#sgNote'); paint();
          });
        }));
      }
      paint();
    }
  });
}
function editSignature(index, done) {
  const all = signatures();
  const s = index === null ? { name: '', text: '' } : all[index];
  openModal({
    title: index === null ? 'New signature' : 'Edit signature',
    body: '<div class="form-row"><label>Name</label><input class="text-input" id="sgName" value="' + escapeHtml(s.name) + '"></div>' +
          '<div class="form-row"><label>Signature</label><textarea class="text-input" id="sgText" rows="5">' + escapeHtml(s.text) + '</textarea></div>',
    foot: '<button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" data-save>Save signature</button>',
    onMount(card, close) {
      card.querySelector('[data-cancel]').addEventListener('click', close);
      card.querySelector('[data-save]').addEventListener('click', () => {
        const name = card.querySelector('#sgName').value.trim();
        const text = card.querySelector('#sgText').value.trim();
        if (!name || !text) { toast('A signature needs a name and text'); return; }
        if (index === null) all.push({ name, text }); else { s.name = name; s.text = text; }
        const ok = savePrefs();
        close();
        toast(ok ? 'Signature saved' : 'Signature could not be saved — storage is blocked', ok ? '' : 'err');
        if (done) done();
      });
    }
  });
}

/* ============================================================
   INIT
   ============================================================ */
function initEmailPage() {
  bootShell();

  const account = document.getElementById('mboxAccount');
  account.innerHTML = MAIL_PROVIDER.connected
    ? 'Connected as ' + escapeHtml(ME.email)
    : 'No mail account connected.<br><span class="st">Sending and tracking are unavailable.</span>';

  renderMailboxes();
  renderThreadList();
  renderReader();

  document.getElementById('composeBtn').addEventListener('click', () => openCompose({}));
  document.getElementById('mailFilterBtn').addEventListener('click', e => { e.stopPropagation(); openMailFilterMenu(e.currentTarget); });
  document.getElementById('mailSortBtn').addEventListener('click', e => { e.stopPropagation(); openMailSortMenu(e.currentTarget); });
  document.getElementById('mailTemplatesBtn').addEventListener('click', () => openMailTemplateManager(null, null));
  document.getElementById('mailSignaturesBtn').addEventListener('click', openSignatureManager);
  document.getElementById('mailSearchInput').addEventListener('input', e => {
    mailState.search = e.target.value; renderThreadList();
  });

  window.onGlobalSearch = v => { mailState.search = v; document.getElementById('mailSearchInput').value = v; renderThreadList(); };
}
document.addEventListener('DOMContentLoaded', initEmailPage);
