/* ============================================================
   page-email.js — Email page (Gmail-style workspace).
   Folder rail · list card · reading view · compose windows.

   No mail account is connected, so Send always goes through the
   shared deliverEmail() check and reports a real failure. The
   message is kept as a draft instead of being faked as sent.
   ============================================================ */

const mailState = {
  folder: 'inbox',
  threadId: null,
  search: '',
  selected: new Set(),
  page: 0,
  perPage: 50
};
const composers = [];          /* open compose windows */
let composerSeq = 0;

const FONTS = [
  ['Sans Serif', 'Arial, Helvetica, sans-serif'],
  ['Serif', 'Georgia, "Times New Roman", serif'],
  ['Fixed Width', '"Roboto Mono", Consolas, monospace'],
  ['Wide', '"Arial Black", Arial, sans-serif'],
  ['Narrow', '"Arial Narrow", Arial, sans-serif'],
  ['Garamond', 'Garamond, Georgia, serif'],
  ['Georgia', 'Georgia, serif'],
  ['Tahoma', 'Tahoma, Verdana, sans-serif'],
  ['Trebuchet MS', '"Trebuchet MS", sans-serif'],
  ['Verdana', 'Verdana, Geneva, sans-serif']
];
const SIZES = [['Small', '2'], ['Normal', '3'], ['Large', '5'], ['Huge', '7']];
const SWATCHES = [
  '#000000','#434343','#666666','#999999','#B7B7B7','#CCCCCC','#EFEFEF','#FFFFFF',
  '#980000','#FF0000','#FF9900','#FFFF00','#00FF00','#00FFFF','#4A86E8','#0000FF',
  '#9900FF','#FF00FF','#E6B8AF','#F4CCCC','#FCE5CD','#FFF2CC','#D9EAD3','#D0E0E3',
  '#C9DAF8','#CFE2F3','#D9D2E9','#EAD1DC','#0B57D0','#188038','#D93025','#1F1F1F'
];

/* ---------- Storage for drafts and templates ---------- */
const DRAFT_KEY = 'crmv1_mail_drafts';
function loadStoredDrafts() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    JSON.parse(raw).forEach(d => {
      if (!ALL_THREADS.some(t => t.id === d.id)) ALL_THREADS.push(d);
    });
  } catch (e) { /* storage blocked — drafts stay in memory for this session */ }
}
function persistDrafts() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(ALL_THREADS.filter(t => t.folder === 'drafts')));
    return true;
  } catch (e) { return false; }
}
function mailTemplates() {
  if (!prefs.emailTemplates) prefs.emailTemplates = EMAIL_TEMPLATES_DEFAULT.map(t => Object.assign({}, t));
  return prefs.emailTemplates;
}

/* ---------- Helpers ---------- */
function lastMsg(t) { return t.messages[t.messages.length - 1]; }
function snippetOf(html) {
  const d = document.createElement('div');
  d.innerHTML = html;
  return (d.textContent || '').replace(/\s+/g, ' ').trim();
}
function mailDate(ts) {
  const d = new Date(ts), now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (d.getFullYear() === now.getFullYear())
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
}
function mailDateFull(ts) {
  return new Date(ts).toLocaleString('en-US',
    { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function threadsIn(folder) {
  if (folder === 'starred') return ALL_THREADS.filter(t => t.starred && t.folder !== 'trash');
  return ALL_THREADS.filter(t => t.folder === folder);
}
function visibleThreads() {
  const q = mailState.search.trim().toLowerCase();
  let list = threadsIn(mailState.folder);
  if (q) {
    list = list.filter(t => {
      const hay = [t.subject, t.company, t.contact.name, t.contact.email,
                   ...t.messages.map(m => snippetOf(m.html))].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }
  return list.slice().sort((a, b) => lastMsg(b).at - lastMsg(a).at);
}
function unreadCountIn(folder) { return threadsIn(folder).filter(t => t.unread).length; }

/* ============================================================
   FOLDER RAIL
   ============================================================ */
const FOLDER_ICON = {
  inbox: 'inboxIn', starred: 'star', sent: 'paperPlane',
  drafts: 'file', archived: 'archiveBox', trash: 'trash'
};
function renderNavRail() {
  const host = document.getElementById('mailFolders');
  host.innerHTML = MAILBOXES.map(b => {
    const all = threadsIn(b.key).length;
    const unread = unreadCountIn(b.key);
    const count = b.key === 'inbox' || b.key === 'starred' ? unread : all;
    return `<button class="mail-folder ${mailState.folder === b.key ? 'active' : ''}" data-folder="${b.key}">
      ${ICONS[FOLDER_ICON[b.key]]}<span class="lbl">${escapeHtml(b.label)}</span>
      ${count ? `<span class="cnt">${count}</span>` : ''}
    </button>`;
  }).join('');
  host.querySelectorAll('[data-folder]').forEach(b => b.addEventListener('click', () => {
    mailState.folder = b.dataset.folder;
    mailState.threadId = null;
    mailState.selected.clear();
    renderMail();
  }));
}

/* ============================================================
   LIST
   ============================================================ */
function renderList() {
  const main = document.getElementById('mailMain');
  const list = visibleThreads();
  const anySelected = mailState.selected.size > 0;

  main.innerHTML = `
    <div class="mail-toolbar">
      <button class="gm-check ${anySelected && mailState.selected.size === list.length ? 'on' : ''}" id="selAll" title="Select all">${ICONS.check}</button>
      ${anySelected ? `
        <button class="gm-btn" id="tbArchive" title="Archive">${ICONS.archiveBox}</button>
        <button class="gm-btn" id="tbTrash" title="Delete">${ICONS.trash}</button>
        <button class="gm-btn" id="tbUnread" title="Mark unread">${ICONS.mailClosed}</button>
        <button class="gm-btn" id="tbStar" title="Star">${ICONS.star}</button>` : `
        <button class="gm-btn" id="tbRefresh" title="Refresh">${ICONS.refresh}</button>
        <button class="gm-btn" id="tbMore" title="More">${ICONS.more}</button>`}
      <span class="sp"></span>
      <span class="mail-range">${list.length ? '1–' + list.length + ' of ' + list.length : '0'}</span>
      <button class="gm-btn" disabled title="Newer">${ICONS.chevLeft}</button>
      <button class="gm-btn" disabled title="Older">${ICONS.chevRight}</button>
    </div>
    <div class="mail-search">
      <input type="text" id="mailSearchInput" placeholder="Search mail" value="${escapeHtml(mailState.search)}">
    </div>
    <div class="mail-list" id="mailList"></div>`;

  const host = document.getElementById('mailList');
  if (!list.length) {
    host.innerHTML = `<div class="mail-empty">${mailState.search ? 'No messages matched that search.' : 'Nothing in ' + escapeHtml(MAILBOXES.find(b => b.key === mailState.folder).label) + '.'}</div>`;
  } else {
    host.innerHTML = list.map(t => {
      const m = lastMsg(t);
      const who = t.folder === 'sent' || t.folder === 'drafts'
        ? 'To: ' + t.contact.name
        : (m.dir === 'in' ? m.from.name : t.contact.name);
      const outbound = t.messages.filter(x => x.tracking);
      const trk = outbound.length ? trackingMark(outbound[outbound.length - 1].tracking) : '';
      const hasAttach = t.messages.some(x => x.attachments.length);
      return `<div class="mail-row ${t.unread ? 'unread' : ''} ${mailState.selected.has(t.id) ? 'selected' : ''}" data-id="${t.id}">
        <button class="gm-check ${mailState.selected.has(t.id) ? 'on' : ''}" data-check="${t.id}" title="Select">${ICONS.check}</button>
        <button class="gm-btn star ${t.starred ? 'on' : ''}" data-star="${t.id}" title="Star" style="width:28px;height:28px">${t.starred ? ICONS.starFill : ICONS.star}</button>
        ${trk}
        <span class="mr-from">${escapeHtml(who)}${t.messages.length > 1 ? ' (' + t.messages.length + ')' : ''}</span>
        <span class="mr-body"><span class="mr-subject">${escapeHtml(t.subject)}</span><span class="mr-snippet"> — ${escapeHtml(snippetOf(m.html).slice(0, 120))}</span></span>
        ${t.company ? `<span class="mr-company">${escapeHtml(t.company)}</span>` : ''}
        <span class="mr-tail">
          ${hasAttach ? '<span class="mr-attach">' + ICONS.clip + '</span>' : ''}
          <span class="mr-date">${escapeHtml(mailDate(m.at))}</span>
          <span class="mr-actions">
            <button class="gm-btn" data-act="archive" data-id="${t.id}" title="Archive" style="width:30px;height:30px">${ICONS.archiveBox}</button>
            <button class="gm-btn" data-act="trash" data-id="${t.id}" title="Delete" style="width:30px;height:30px">${ICONS.trash}</button>
            <button class="gm-btn" data-act="unread" data-id="${t.id}" title="${t.unread ? 'Mark read' : 'Mark unread'}" style="width:30px;height:30px">${t.unread ? ICONS.mailOpen : ICONS.mailClosed}</button>
          </span>
        </span>
      </div>`;
    }).join('');
  }
  wireList();
}

function wireList() {
  const search = document.getElementById('mailSearchInput');
  search.addEventListener('input', e => {
    mailState.search = e.target.value;
    const pos = e.target.selectionStart;
    renderList();
    const s2 = document.getElementById('mailSearchInput');
    s2.focus(); s2.setSelectionRange(pos, pos);
  });

  const selAll = document.getElementById('selAll');
  selAll.addEventListener('click', () => {
    const list = visibleThreads();
    if (mailState.selected.size === list.length) mailState.selected.clear();
    else list.forEach(t => mailState.selected.add(t.id));
    renderList();
  });

  const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
  bind('tbRefresh', () => { renderMail(); toast('Mailbox refreshed'); });
  bind('tbMore', e => openMailMoreMenu(e.currentTarget));
  bind('tbArchive', () => bulk(t => { t.folder = 'archived'; }, 'Archived'));
  bind('tbTrash', () => bulk(t => { t.folder = 'trash'; }, 'Moved to Trash'));
  bind('tbUnread', () => bulk(t => { t.unread = true; }, 'Marked unread'));
  bind('tbStar', () => bulk(t => { t.starred = true; }, 'Starred'));

  document.querySelectorAll('[data-check]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const id = b.dataset.check;
    if (mailState.selected.has(id)) mailState.selected.delete(id); else mailState.selected.add(id);
    renderList();
  }));
  document.querySelectorAll('[data-star]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const t = ALL_THREADS.find(x => x.id === b.dataset.star);
    t.starred = !t.starred;
    renderNavRail(); renderList();
  }));
  document.querySelectorAll('.mr-actions [data-act]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const t = ALL_THREADS.find(x => x.id === b.dataset.id);
    if (b.dataset.act === 'archive') { t.folder = 'archived'; toast('Archived'); }
    if (b.dataset.act === 'trash') { t.folder = 'trash'; toast('Moved to Trash'); }
    if (b.dataset.act === 'unread') { t.unread = !t.unread; }
    renderNavRail(); renderList();
  }));
  document.querySelectorAll('.mail-row').forEach(r => r.addEventListener('click', () => openThread(r.dataset.id)));
}

function bulk(fn, msg) {
  const n = mailState.selected.size;
  mailState.selected.forEach(id => { const t = ALL_THREADS.find(x => x.id === id); if (t) fn(t); });
  mailState.selected.clear();
  renderNavRail(); renderList();
  toast(msg + ' ' + n + ' conversation' + (n === 1 ? '' : 's'));
}

function openMailMoreMenu(anchor) {
  popMenu(anchor, [
    { label: 'Mark all as read', icon: ICONS.mailOpen, onClick: () => {
        threadsIn(mailState.folder).forEach(t => t.unread = false);
        renderNavRail(); renderList(); toast('All marked read');
      } },
    { label: 'Export this folder as CSV', icon: ICONS.download, onClick: exportMailCsv },
    { label: 'Manage templates', icon: ICONS.file, onClick: () => openMailTemplateManager(null) },
    { label: 'Manage signatures', icon: ICONS.signature, onClick: openSignatureManager }
  ], { align: 'left', width: 240 });
}

function exportMailCsv() {
  const rows = visibleThreads();
  const head = ['Folder', 'Company', 'Contact', 'Subject', 'Last message', 'Messages', 'Unread', 'Tracking', 'Opens'];
  const body = rows.map(t => {
    const outb = t.messages.filter(m => m.tracking);
    const tr = outb.length ? outb[outb.length - 1].tracking : null;
    return [t.folder, t.company, t.contact.name, t.subject, mailDateFull(lastMsg(t).at),
            t.messages.length, t.unread ? 'yes' : 'no', tr ? tr.state : '', tr ? (tr.opens || []).length : 0];
  });
  const csv = [head, ...body].map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'mail-' + mailState.folder + '.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(rows.length + ' conversation' + (rows.length === 1 ? '' : 's') + ' exported');
}

/* ============================================================
   READING VIEW
   ============================================================ */
function openThread(id) {
  const t = ALL_THREADS.find(x => x.id === id);
  if (!t) return;
  if (t.folder === 'drafts') { openCompose({ draftThread: t }); return; }
  t.unread = false;
  mailState.threadId = id;
  renderNavRail();
  renderRead();
}

function renderRead() {
  const main = document.getElementById('mailMain');
  const t = ALL_THREADS.find(x => x.id === mailState.threadId);
  if (!t) { renderList(); return; }

  main.innerHTML = `
    <div class="mail-toolbar">
      <button class="gm-btn" id="rdBack" title="Back to list">${ICONS.chevLeft}</button>
      <button class="gm-btn" id="rdArchive" title="Archive">${ICONS.archiveBox}</button>
      <button class="gm-btn" id="rdTrash" title="Delete">${ICONS.trash}</button>
      <button class="gm-btn" id="rdUnread" title="Mark unread">${ICONS.mailClosed}</button>
      <button class="gm-btn" id="rdLabel" title="Move to">${ICONS.label}</button>
      <button class="gm-btn" id="rdPrint" title="Print">${ICONS.print}</button>
      <button class="gm-btn" id="rdMore" title="More">${ICONS.more}</button>
      <span class="sp"></span>
      <button class="gm-btn" id="rdLead" title="Open the linked lead">${ICONS.external}</button>
    </div>
    <div class="mail-read" id="mailRead">
      <div class="mr-head">
        <div class="mr-title" style="flex:1">${escapeHtml(t.subject)}
          <span class="lbl">${escapeHtml(MAILBOXES.find(b => b.key === t.folder).label)}</span></div>
        <button class="gm-btn star ${t.starred ? 'on' : ''}" id="rdStar" title="Star">${t.starred ? ICONS.starFill : ICONS.star}</button>
      </div>
      ${t.messages.map((m, i) => messageHtml(t, m, i)).join('')}
      <div class="mr-reply-row">
        <button class="gm-pill" id="rdReply">${ICONS.reply}Reply</button>
        <button class="gm-pill" id="rdReplyAll">${ICONS.replyAll}Reply all</button>
        <button class="gm-pill" id="rdForward">${ICONS.forward}Forward</button>
      </div>
    </div>`;

  const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
  bind('rdBack', () => { mailState.threadId = null; renderList(); });
  bind('rdArchive', () => { t.folder = 'archived'; mailState.threadId = null; renderMail(); toast('Archived'); });
  bind('rdTrash', () => { t.folder = 'trash'; mailState.threadId = null; renderMail(); toast('Moved to Trash'); });
  bind('rdUnread', () => { t.unread = true; mailState.threadId = null; renderMail(); toast('Marked unread'); });
  bind('rdPrint', () => window.print());
  bind('rdStar', () => { t.starred = !t.starred; renderNavRail(); renderRead(); });
  bind('rdLabel', e => popMenu(e.currentTarget, MAILBOXES.filter(b => b.key !== 'starred').map(b => ({
    label: 'Move to ' + b.label, active: t.folder === b.key,
    onClick: () => { t.folder = b.key; mailState.threadId = null; renderMail(); toast('Moved to ' + b.label); }
  })), { align: 'left', width: 210 }));
  bind('rdMore', e => popMenu(e.currentTarget, [
    { label: 'Tracking detail', icon: ICONS.checkDouble, onClick: () => openTrackingDetail(t) },
    { label: 'View source', icon: ICONS.code, onClick: () => openSource(t) },
    { label: 'Open linked lead', icon: ICONS.external, onClick: () => goToLead(t) }
  ], { width: 220 }));
  bind('rdLead', () => goToLead(t));
  bind('rdReply', () => openCompose({ reply: t, mode: 'reply' }));
  bind('rdReplyAll', () => openCompose({ reply: t, mode: 'replyAll' }));
  bind('rdForward', () => openCompose({ reply: t, mode: 'forward' }));

  document.querySelectorAll('[data-detail]').forEach(b => b.addEventListener('click', () => {
    const row = document.getElementById('detail-' + b.dataset.detail);
    row.hidden = !row.hidden;
  }));
}

function messageHtml(t, m, i) {
  const who = m.dir === 'in' ? m.from : { name: ACCOUNT.name, email: ACCOUNT.email };
  const to = m.to.map(x => x.email).join(', ');
  return `<div class="mr-msg">
    <div class="mr-msg-head">
      <div class="mr-avatar" style="background:${avatarColor(who.name)}">${initials(who.name)}</div>
      <div class="mr-who">
        <div class="nm">${escapeHtml(who.name)} <span class="em">&lt;${escapeHtml(who.email)}&gt;</span></div>
        <div class="to" data-detail="${i}">to ${escapeHtml(to)} ${ICONS.chevD || ''}<span style="font-size:10px">▾</span></div>
      </div>
      <div class="mr-when">${m.tracking ? trackingMark(m.tracking) : ''}${escapeHtml(mailDateFull(m.at))}</div>
    </div>
    <div class="mr-detail-row" id="detail-${i}" hidden>
      <div><strong>From:</strong> ${escapeHtml(who.name)} &lt;${escapeHtml(who.email)}&gt;</div>
      <div><strong>To:</strong> ${escapeHtml(to)}</div>
      ${m.cc.length ? `<div><strong>Cc:</strong> ${escapeHtml(m.cc.map(x => x.email).join(', '))}</div>` : ''}
      ${m.bcc.length ? `<div><strong>Bcc:</strong> ${escapeHtml(m.bcc.map(x => x.email).join(', '))}</div>` : ''}
      <div><strong>Date:</strong> ${escapeHtml(mailDateFull(m.at))}</div>
      <div><strong>Subject:</strong> ${escapeHtml(t.subject)}</div>
    </div>
    <div class="mr-content">${m.html}</div>
    ${m.attachments.length ? `<div class="mr-attachments">${m.attachments.map(a =>
      `<span class="mr-file">${ICONS['file-pdf'] || ICONS.file}${escapeHtml(a.name)} <span class="sz">${escapeHtml(a.size)}</span></span>`).join('')}</div>` : ''}
  </div>`;
}

function openTrackingDetail(t) {
  const rows = t.messages.filter(m => m.tracking);
  openModal({
    title: 'Tracking — ' + t.subject,
    body: rows.length ? rows.map(m => {
      const tr = m.tracking, opens = (tr.opens || []).slice().sort((a, b) => b - a);
      return `<div style="margin-bottom:14px">
        <div style="font-size:12px;color:var(--text-muted)">Sent ${escapeHtml(mailDateFull(m.at))} to ${escapeHtml(m.to.map(x => x.email).join(', '))}</div>
        <div style="font-size:13px;margin:4px 0 6px">State: <strong>${escapeHtml(tr.state)}</strong> · ${opens.length} open${opens.length === 1 ? '' : 's'}</div>
        ${opens.length ? '<table class="data-table"><tbody>' + opens.map((o, i) =>
          `<tr><td style="width:60px;color:var(--text-muted)">Open ${opens.length - i}</td><td>${escapeHtml(mailDateFull(o))}</td></tr>`).join('') + '</tbody></table>'
          : '<div style="font-size:12px;color:var(--text-muted)">No opens recorded.</div>'}
      </div>`;
    }).join('') : '<p style="font-size:12.5px;color:var(--text-muted)">Nothing outbound in this conversation.</p>',
    foot: '<span class="mf-note">Open events come from the tracking pixel. Nothing is recorded until a mail account is connected.</span>'
  });
}

function openSource(t) {
  const text = t.messages.map(m =>
    `From: ${m.dir === 'in' ? m.from.email : ACCOUNT.email}\nTo: ${m.to.map(x => x.email).join(', ')}\n` +
    `Date: ${mailDateFull(m.at)}\nSubject: ${t.subject}\n\n${m.html}\n\n${'-'.repeat(60)}\n`).join('\n');
  openModal({
    title: 'Message source',
    wide: true,
    body: '<pre style="white-space:pre-wrap;font-size:11.5px;font-family:monospace;color:var(--text-secondary)">' +
          escapeHtml(text) + '</pre>'
  });
}

function goToLead(t) {
  if (!t.leadId) { toast('This conversation is not linked to a lead'); return; }
  location.href = 'index.html?lead=' + encodeURIComponent(t.leadId);
}

/* ============================================================
   COMPOSE
   ============================================================ */
function openCompose(opts) {
  opts = opts || {};
  const id = 'cw' + (++composerSeq);
  let to = '', cc = '', bcc = '', subject = '', body = '';
  let draftThread = opts.draftThread || null;

  if (draftThread) {
    const m = draftThread.messages[0];
    to = m.to.map(x => x.email).join(', ');
    cc = m.cc.map(x => x.email).join(', ');
    bcc = m.bcc.map(x => x.email).join(', ');
    subject = draftThread.subject;
    body = m.html;
  } else if (opts.reply) {
    const t = opts.reply, last = lastMsg(t);
    const quoted = `<br><br><blockquote>On ${escapeHtml(mailDateFull(last.at))}, ${escapeHtml(last.dir === 'in' ? last.from.name : ACCOUNT.name)} wrote:<br>${last.html}</blockquote>`;
    if (opts.mode === 'forward') { subject = 'Fwd: ' + t.subject; body = quoted; }
    else {
      subject = t.subject.startsWith('Re: ') ? t.subject : 'Re: ' + t.subject;
      to = last.dir === 'in' ? last.from.email : t.contact.email;
      if (opts.mode === 'replyAll') cc = last.cc.map(x => x.email).join(', ');
      body = quoted;
    }
  } else if (opts.to) { to = opts.to; }

  const defaultSig = SIGNATURES.find(s => s.isDefault);
  if (!draftThread && defaultSig) body = body + '<br><br>' + defaultSig.html;

  const win = document.createElement('div');
  win.className = 'compose-win';
  win.id = id;
  win.innerHTML = `
    <div class="cw-head">
      <span class="cw-title">New message</span>
      <button class="gm-btn" data-min title="Minimise">${ICONS.minimize}</button>
      <button class="gm-btn" data-full title="Full screen">${ICONS.expand}</button>
      <button class="gm-btn" data-close title="Save and close">${ICONS.close}</button>
    </div>
    <div class="cw-body">
      <div class="cw-field">
        <label>To</label><input type="text" data-f="to" value="${escapeHtml(to)}">
        <span class="toggles"><button data-t="cc">Cc</button><button data-t="bcc">Bcc</button></span>
      </div>
      <div class="cw-field" data-row="cc" ${cc ? '' : 'hidden'}><label>Cc</label><input type="text" data-f="cc" value="${escapeHtml(cc)}"></div>
      <div class="cw-field" data-row="bcc" ${bcc ? '' : 'hidden'}><label>Bcc</label><input type="text" data-f="bcc" value="${escapeHtml(bcc)}"></div>
      <div class="cw-field"><input type="text" data-f="subject" placeholder="Subject" value="${escapeHtml(subject)}"></div>
      <div class="cw-editor" contenteditable="true" data-editor data-placeholder="Write your message…">${body}</div>
      <div class="cw-attach-row" data-attach></div>
      <div class="cw-format" data-format>
        <select data-font>${FONTS.map(f => `<option value="${f[1]}">${f[0]}</option>`).join('')}</select>
        <select data-size>${SIZES.map(s => `<option value="${s[1]}" ${s[0] === 'Normal' ? 'selected' : ''}>${s[0]}</option>`).join('')}</select>
        <span class="sep"></span>
        <button class="cw-fbtn" data-cmd="bold" title="Bold">${ICONS.bold}</button>
        <button class="cw-fbtn" data-cmd="italic" title="Italic">${ICONS.italic}</button>
        <button class="cw-fbtn" data-cmd="underline" title="Underline">${ICONS.underline}</button>
        <button class="cw-fbtn" data-color title="Text colour">${ICONS.palette}</button>
        <span class="sep"></span>
        <button class="cw-fbtn" data-cmd="justifyLeft" title="Align left">${ICONS.alignLeft}</button>
        <button class="cw-fbtn" data-cmd="justifyCenter" title="Align centre">${ICONS.alignCenter}</button>
        <button class="cw-fbtn" data-cmd="justifyRight" title="Align right">${ICONS.alignRight}</button>
        <span class="sep"></span>
        <button class="cw-fbtn" data-cmd="insertUnorderedList" title="Bulleted list">${ICONS.listUl}</button>
        <button class="cw-fbtn" data-cmd="insertOrderedList" title="Numbered list">${ICONS.listOl}</button>
        <button class="cw-fbtn" data-cmd="outdent" title="Decrease indent">${ICONS.outdent}</button>
        <button class="cw-fbtn" data-cmd="indent" title="Increase indent">${ICONS.indent}</button>
        <button class="cw-fbtn" data-quote title="Quote">${ICONS.quote}</button>
        <span class="sep"></span>
        <button class="cw-fbtn" data-cmd="removeFormat" title="Remove formatting">${ICONS.removeFmt}</button>
      </div>
      <div class="cw-foot">
        <button class="cw-send" data-send>Send</button>
        <button class="gm-btn" data-fmt title="Formatting options">${ICONS.formatText}</button>
        <button class="gm-btn" data-attachbtn title="Attach files">${ICONS.clip}</button>
        <button class="gm-btn" data-link title="Insert link">${ICONS.link}</button>
        <button class="gm-btn" data-emoji title="Insert emoji">${ICONS.emoji}</button>
        <button class="gm-btn" data-image title="Insert image">${ICONS.image}</button>
        <button class="gm-btn" data-html title="Paste or edit HTML">${ICONS.code}</button>
        <button class="gm-btn" data-tpl title="Templates">${ICONS.file}</button>
        <button class="gm-btn" data-sig title="Insert signature">${ICONS.signature}</button>
        <span class="cw-status" data-status></span>
        <span class="sp"></span>
        <button class="gm-btn" data-discard title="Discard draft">${ICONS.trash}</button>
      </div>
    </div>`;

  document.getElementById('composeLayer').appendChild(win);
  const state = { id, el: win, draftThread, attachments: [], full: false, min: false };
  composers.push(state);
  wireCompose(state);
  win.querySelector('[data-f="to"]').focus();
  return state;
}

function wireCompose(c) {
  const win = c.el;
  const editor = win.querySelector('[data-editor]');
  const status = win.querySelector('[data-status]');
  const title = win.querySelector('.cw-title');
  const subject = win.querySelector('[data-f="subject"]');

  const setTitle = () => { title.textContent = subject.value.trim() || 'New message'; };
  subject.addEventListener('input', () => { setTitle(); queueDraft(); });
  setTitle();

  win.querySelector('.cw-head').addEventListener('click', e => {
    if (e.target.closest('button')) return;
    if (c.min) { c.min = false; win.classList.remove('min'); }
  });
  win.querySelector('[data-min]').addEventListener('click', () => {
    c.min = !c.min; win.classList.toggle('min', c.min);
  });
  win.querySelector('[data-full]').addEventListener('click', e => {
    c.full = !c.full;
    win.classList.toggle('full', c.full);
    e.currentTarget.innerHTML = c.full ? ICONS.collapse : ICONS.expand;
  });
  win.querySelector('[data-close]').addEventListener('click', () => { saveDraft(c, true); closeCompose(c); });
  win.querySelector('[data-discard]').addEventListener('click', () => {
    confirmModal('Discard draft', 'This message will be deleted.', 'Discard', () => {
      if (c.draftThread) {
        const i = ALL_THREADS.indexOf(c.draftThread);
        if (i > -1) ALL_THREADS.splice(i, 1);
        persistDrafts();
      }
      closeCompose(c); renderMail(); toast('Draft discarded');
    });
  });

  win.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => {
    const row = win.querySelector('[data-row="' + b.dataset.t + '"]');
    row.hidden = !row.hidden;
    b.classList.toggle('on', !row.hidden);
    if (!row.hidden) row.querySelector('input').focus();
  }));

  win.querySelector('[data-fmt]').addEventListener('click', () =>
    win.querySelector('[data-format]').classList.toggle('show'));

  win.querySelectorAll('[data-cmd]').forEach(b => b.addEventListener('click', () => {
    editor.focus();
    document.execCommand(b.dataset.cmd, false, null);
    refreshFormatState(win);
    queueDraft();
  }));
  win.querySelector('[data-quote]').addEventListener('click', () => {
    editor.focus();
    document.execCommand('formatBlock', false, 'blockquote');
    queueDraft();
  });
  win.querySelector('[data-font]').addEventListener('change', e => {
    editor.focus();
    document.execCommand('fontName', false, e.target.value);
    queueDraft();
  });
  win.querySelector('[data-size]').addEventListener('change', e => {
    editor.focus();
    document.execCommand('fontSize', false, e.target.value);
    queueDraft();
  });
  win.querySelector('[data-color]').addEventListener('click', e => openColorMenu(e.currentTarget, editor, queueDraft));

  win.querySelector('[data-link]').addEventListener('click', () => insertLink(editor, queueDraft));
  win.querySelector('[data-emoji]').addEventListener('click', e => openEmojiInsert(e.currentTarget, editor, queueDraft));
  win.querySelector('[data-image]').addEventListener('click', () => insertImage(editor, queueDraft));
  win.querySelector('[data-html]').addEventListener('click', () => openHtmlEditor(editor, queueDraft));
  win.querySelector('[data-tpl]').addEventListener('click', () => openMailTemplateManager(c));
  win.querySelector('[data-sig]').addEventListener('click', e => openSignatureMenu(e.currentTarget, editor, queueDraft));
  win.querySelector('[data-attachbtn]').addEventListener('click', () => pickFiles(c));

  /* Pasting: HTML on the clipboard keeps its formatting. Plain text that is
     actually HTML markup is rendered instead of shown as code, so a pasted
     template becomes editable visuals straight away. */
  editor.addEventListener('paste', e => {
    const cd = e.clipboardData;
    if (!cd) return;
    const html = cd.getData('text/html');
    const text = cd.getData('text/plain');
    if (html) {
      e.preventDefault();
      document.execCommand('insertHTML', false, sanitizeHtml(html));
    } else if (looksLikeHtml(text)) {
      e.preventDefault();
      document.execCommand('insertHTML', false, sanitizeHtml(text));
      toast('Pasted HTML rendered as editable content');
    }
    queueDraft();
  });
  editor.addEventListener('input', queueDraft);
  editor.addEventListener('keyup', () => refreshFormatState(win));
  editor.addEventListener('mouseup', () => refreshFormatState(win));

  win.querySelector('[data-send]').addEventListener('click', () => sendCompose(c));

  let timer = null;
  function queueDraft() {
    status.textContent = '';
    clearTimeout(timer);
    timer = setTimeout(() => saveDraft(c, false), 1200);
  }
  c.queueDraft = queueDraft;
}

function refreshFormatState(win) {
  [['bold', 'bold'], ['italic', 'italic'], ['underline', 'underline'],
   ['insertUnorderedList', 'insertUnorderedList'], ['insertOrderedList', 'insertOrderedList']]
    .forEach(([cmd]) => {
      const b = win.querySelector('[data-cmd="' + cmd + '"]');
      if (!b) return;
      let on = false;
      try { on = document.queryCommandState(cmd); } catch (e) { on = false; }
      b.classList.toggle('on', on);
    });
}

function looksLikeHtml(s) {
  return /<\s*(html|body|div|table|p|span|img|a|h[1-6]|ul|ol|strong|em|br)\b[^>]*>/i.test(s || '');
}
/* Pasted markup is rendered, but scripts, event handlers and remote frames are
   stripped first — an email body must never execute anything. */
function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, iframe, object, embed, link, meta, style[media]').forEach(n => n.remove());
  doc.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(a => {
      const n = a.name.toLowerCase();
      if (n.startsWith('on')) el.removeAttribute(a.name);
      if ((n === 'href' || n === 'src') && /^\s*javascript:/i.test(a.value)) el.removeAttribute(a.name);
    });
  });
  return doc.body.innerHTML;
}

function openColorMenu(anchor, editor, done) {
  const el = popMenu(anchor, [{ heading: true, label: 'Text colour' }], { align: 'left', width: 230 });
  const grid = document.createElement('div');
  grid.className = 'color-grid';
  grid.style.padding = '4px 8px 8px';
  grid.innerHTML = SWATCHES.map(c => `<button type="button" style="background:${c}" title="${c}"></button>`).join('');
  el.appendChild(grid);
  const label = document.createElement('div');
  label.className = 'pop-label';
  label.textContent = 'Highlight';
  el.appendChild(label);
  const grid2 = document.createElement('div');
  grid2.className = 'color-grid';
  grid2.style.padding = '4px 8px 8px';
  grid2.innerHTML = SWATCHES.slice(0, 24).map(c => `<button type="button" data-bg style="background:${c}" title="${c}"></button>`).join('');
  el.appendChild(grid2);

  el.querySelectorAll('.color-grid button').forEach(b => b.addEventListener('click', ev => {
    ev.stopPropagation();
    editor.focus();
    const colour = b.style.backgroundColor;
    document.execCommand(b.hasAttribute('data-bg') ? 'hiliteColor' : 'foreColor', false, colour);
    closePop();
    if (done) done();
  }));
}

function openEmojiInsert(anchor, editor, done) {
  const el = popMenu(anchor, [{ heading: true, label: 'Emoji' }], { align: 'left', width: 250 });
  const grid = document.createElement('div');
  grid.className = 'emoji-pop';
  grid.style.padding = '4px 8px 8px';
  grid.innerHTML = EMOJI.map(e => `<button type="button">${e}</button>`).join('');
  el.appendChild(grid);
  grid.querySelectorAll('button').forEach(b => b.addEventListener('click', ev => {
    ev.stopPropagation();
    editor.focus();
    document.execCommand('insertText', false, b.textContent);
    closePop();
    if (done) done();
  }));
}

function insertLink(editor, done) {
  const sel = window.getSelection();
  const selected = sel && sel.toString();
  openModal({
    title: 'Insert link',
    body: '<div class="form-row"><label>Text to display</label><input class="text-input" id="lkText" value="' + escapeHtml(selected || '') + '"></div>' +
          '<div class="form-row"><label>Web address</label><input class="text-input" id="lkUrl" placeholder="https://"></div>',
    foot: '<button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" data-ok>Insert link</button>',
    onMount(card, close) {
      card.querySelector('[data-cancel]').addEventListener('click', close);
      card.querySelector('[data-ok]').addEventListener('click', () => {
        const url = card.querySelector('#lkUrl').value.trim();
        const text = card.querySelector('#lkText').value.trim() || url;
        if (!/^https?:\/\//i.test(url)) { toast('Enter a full address starting with http:// or https://', 'err'); return; }
        close();
        editor.focus();
        document.execCommand('insertHTML', false,
          '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + escapeHtml(text) + '</a>');
        if (done) done();
      });
    }
  });
}

function insertImage(editor, done) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.addEventListener('change', () => {
    const f = inp.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { toast('Images over 2 MB are not inserted inline', 'err'); return; }
    const r = new FileReader();
    r.onload = () => {
      editor.focus();
      document.execCommand('insertHTML', false, '<img src="' + r.result + '" alt="' + escapeHtml(f.name) + '">');
      if (done) done();
    };
    r.onerror = () => toast('That image could not be read', 'err');
    r.readAsDataURL(f);
  });
  inp.click();
}

/* Two-way HTML: edit the raw markup, or paste markup in and have it render. */
function openHtmlEditor(editor, done) {
  openModal({
    title: 'HTML source',
    wide: true,
    body: '<div class="form-row"><label>Body HTML — edit it or paste new markup, then apply</label>' +
          '<textarea class="text-input" id="htmlSrc" rows="16" style="font-family:monospace;font-size:12px">' +
          escapeHtml(editor.innerHTML) + '</textarea></div>' +
          '<div style="font-size:11px;color:var(--text-muted)">Scripts, iframes and inline event handlers are stripped before the markup is applied.</div>',
    foot: '<button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" data-ok>Apply to message</button>',
    onMount(card, close) {
      card.querySelector('[data-cancel]').addEventListener('click', close);
      card.querySelector('[data-ok]').addEventListener('click', () => {
        editor.innerHTML = sanitizeHtml(card.querySelector('#htmlSrc').value);
        close();
        toast('HTML applied — the message is editable as visuals');
        if (done) done();
      });
    }
  });
}

function pickFiles(c) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.multiple = true;
  inp.addEventListener('change', () => {
    [...inp.files].forEach(f => {
      if (f.size > 25 * 1024 * 1024) { toast(f.name + ' is over the 25 MB limit', 'err'); return; }
      c.attachments.push({ name: f.name, size: (f.size / 1024).toFixed(0) + ' KB' });
    });
    paintAttachments(c);
    if (c.queueDraft) c.queueDraft();
  });
  inp.click();
}
function paintAttachments(c) {
  const host = c.el.querySelector('[data-attach]');
  host.innerHTML = c.attachments.map((a, i) =>
    `<span class="cw-file-chip">${escapeHtml(a.name)} <span style="color:#5F6368">${escapeHtml(a.size)}</span>` +
    `<button data-rm="${i}" title="Remove">${ICONS.close}</button></span>`).join('');
  host.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => {
    c.attachments.splice(Number(b.dataset.rm), 1);
    paintAttachments(c);
  }));
}

function composeValues(c) {
  const g = f => c.el.querySelector('[data-f="' + f + '"]').value.trim();
  return { to: g('to'), cc: g('cc'), bcc: g('bcc'), subject: g('subject'),
           html: c.el.querySelector('[data-editor]').innerHTML };
}
function addrList(s) {
  return s.split(/[,;]/).map(x => x.trim()).filter(Boolean).map(e => ({ name: e.split('@')[0], email: e }));
}
function validAddress(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

function saveDraft(c, quiet) {
  const v = composeValues(c);
  const status = c.el.querySelector('[data-status]');
  if (!v.to && !v.subject && !snippetOf(v.html)) return;

  if (!c.draftThread) {
    const lead = LEADS.find(l => l.emails.includes(v.to));
    c.draftThread = {
      id: 'draft-' + Date.now() + '-' + composerSeq, subject: v.subject || '(no subject)',
      folder: 'drafts', unread: false, starred: false,
      leadId: lead ? lead.id : null, company: lead ? lead.company : '',
      rep: lead ? lead.rep : ACCOUNT.name,
      contact: { name: v.to || 'Draft', email: v.to || '' },
      messages: [{ id: 'dm', dir: 'draft', from: { name: ACCOUNT.name, email: ACCOUNT.email },
                   to: addrList(v.to), cc: addrList(v.cc), bcc: addrList(v.bcc),
                   at: Date.now(), html: v.html, attachments: c.attachments.slice(), tracking: null }]
    };
    ALL_THREADS.push(c.draftThread);
  } else {
    const m = c.draftThread.messages[0];
    c.draftThread.subject = v.subject || '(no subject)';
    c.draftThread.contact = { name: v.to || 'Draft', email: v.to || '' };
    m.to = addrList(v.to); m.cc = addrList(v.cc); m.bcc = addrList(v.bcc);
    m.html = v.html; m.at = Date.now(); m.attachments = c.attachments.slice();
  }
  const ok = persistDrafts();
  if (status) status.textContent = ok ? 'Draft saved' : 'Draft kept for this session only';
  renderNavRail();
  if (mailState.folder === 'drafts' && !mailState.threadId) renderList();
  if (!quiet && !ok) toast('This browser is blocking storage, so the draft is only kept for this session', 'warn');
}

/* Send goes through the shared mail check, so a failure is reported honestly
   and the message stays in Drafts rather than appearing in Sent. */
function sendCompose(c) {
  const v = composeValues(c);
  const to = addrList(v.to);
  if (!to.length) { toast('Add at least one recipient', 'err'); return; }
  const bad = to.concat(addrList(v.cc), addrList(v.bcc)).find(a => !validAddress(a.email));
  if (bad) { toast('“' + bad.email + '” is not a valid address', 'err'); return; }
  if (!v.subject && !snippetOf(v.html)) { toast('Write a subject or a message first', 'err'); return; }

  const result = deliverEmail();
  if (!result.ok) {
    saveDraft(c, true);
    const status = c.el.querySelector('[data-status]');
    if (status) status.textContent = 'Not sent — ' + result.error;
    toast('Not sent — ' + result.error + '. Kept in Drafts.', 'err');
    renderMail();
    return;
  }
  closeCompose(c);
  renderMail();
  toast('Message sent');
}

function closeCompose(c) {
  c.el.remove();
  const i = composers.indexOf(c);
  if (i > -1) composers.splice(i, 1);
}

/* ---------- Signatures ---------- */
function openSignatureMenu(anchor, editor, done) {
  popMenu(anchor, SIGNATURES.map(s => ({
    label: s.name + (s.isDefault ? ' (default)' : ''), icon: ICONS.signature,
    onClick: () => {
      editor.focus();
      document.execCommand('insertHTML', false, '<br>' + s.html);
      if (done) done();
    }
  })).concat([{ sep: true }, { label: 'Manage signatures', icon: ICONS.settings, onClick: openSignatureManager }]),
  { align: 'left', width: 240 });
}
function openSignatureManager() {
  openModal({
    title: 'Signatures',
    body: SIGNATURES.map(s => `<div style="margin-bottom:14px">
        <div style="font-size:12px;font-weight:500;margin-bottom:4px">${escapeHtml(s.name)}${s.isDefault ? ' · default' : ''}</div>
        <div style="border:1px solid var(--border);border-radius:8px;padding:10px">${s.html}</div>
      </div>`).join(''),
    foot: '<span class="mf-note">Signatures are part of the account settings. Editing them needs a connected mail account.</span>'
  });
}

/* ---------- Email templates ---------- */
function openMailTemplateManager(c) {
  let search = '';
  openModal({
    title: 'Email templates',
    wide: true,
    body: '<div class="form-row"><input class="text-input" id="etSearch" placeholder="Search templates…"></div><div class="tpl-list" id="etList"></div>',
    foot: '<span class="mf-note" id="etNote"></span><button class="btn" data-new>New template</button><button class="btn" data-done>Done</button>',
    onMount(card, close) {
      card.querySelector('[data-done]').addEventListener('click', close);
      card.querySelector('[data-new]').addEventListener('click', () => editMailTemplate(null, paint));
      card.querySelector('#etSearch').addEventListener('input', e => { search = e.target.value.toLowerCase(); paint(); });
      function paint() {
        const all = mailTemplates();
        const list = all.filter(t => !search || (t.name + ' ' + t.subject + ' ' + t.html).toLowerCase().includes(search));
        card.querySelector('#etList').innerHTML = list.length ? list.map(t => {
          const i = all.indexOf(t);
          return `<div class="tpl-item">
            <div class="tp-main"><div class="tp-name">${escapeHtml(t.name)}</div>
              <div class="tp-text">${escapeHtml(t.subject)} — ${escapeHtml(snippetOf(t.html).slice(0, 90))}</div></div>
            <div class="tp-actions">
              ${c ? `<button class="icon-btn" data-ins="${i}" title="Insert">${ICONS.send}</button>` : ''}
              <button class="icon-btn" data-edit="${i}" title="Edit">${ICONS.edit}</button>
              <button class="icon-btn" data-dup="${i}" title="Duplicate">${ICONS.copy}</button>
              <button class="icon-btn" data-del="${i}" title="Delete">${ICONS.trash}</button>
            </div></div>`;
        }).join('') : '<div style="padding:16px 0;color:var(--text-muted);font-size:12px">No templates match that search.</div>';

        card.querySelectorAll('[data-ins]').forEach(b => b.addEventListener('click', () => {
          const t = mailTemplates()[Number(b.dataset.ins)];
          const lead = LEADS.find(l => l.id === (c.draftThread && c.draftThread.leadId)) ||
                       LEADS.find(l => l.emails.includes(c.el.querySelector('[data-f="to"]').value.trim()));
          const fill = s => lead ? s.replace(/\{first\}/g, lead.name.split(' ')[0])
                                    .replace(/\{company\}/g, lead.company)
                                    .replace(/\{approval\}/g, fmtMoney(lead.approval)) : s;
          const subj = c.el.querySelector('[data-f="subject"]');
          if (!subj.value) subj.value = fill(t.subject);
          const editor = c.el.querySelector('[data-editor]');
          editor.innerHTML = fill(t.html) + editor.innerHTML;
          close();
          if (c.queueDraft) c.queueDraft();
        }));
        card.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editMailTemplate(Number(b.dataset.edit), paint)));
        card.querySelectorAll('[data-dup]').forEach(b => b.addEventListener('click', () => {
          const t = mailTemplates()[Number(b.dataset.dup)];
          mailTemplates().push({ name: t.name + ' (copy)', subject: t.subject, html: t.html });
          noteSave(card); paint();
        }));
        card.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
          confirmModal('Delete template', 'This removes the template from this browser.', 'Delete', () => {
            mailTemplates().splice(Number(b.dataset.del), 1);
            noteSave(card); paint();
          });
        }));
      }
      paint();
    }
  });
}
function noteSave(card) {
  const ok = savePrefs();
  const note = card.querySelector('#etNote');
  if (note) note.textContent = ok ? 'Saved in this browser.' : 'This browser is blocking storage — nothing was saved.';
}
function editMailTemplate(index, done) {
  const all = mailTemplates();
  const t = index === null ? { name: '', subject: '', html: '' } : all[index];
  openModal({
    title: index === null ? 'New email template' : 'Edit email template',
    body: '<div class="form-row"><label>Name</label><input class="text-input" id="etName" value="' + escapeHtml(t.name) + '"></div>' +
          '<div class="form-row"><label>Subject</label><input class="text-input" id="etSubject" value="' + escapeHtml(t.subject) + '"></div>' +
          '<div class="form-row"><label>Body HTML</label><textarea class="text-input" id="etHtml" rows="8" style="font-family:monospace;font-size:12px">' + escapeHtml(t.html) + '</textarea></div>' +
          '<div style="font-size:11px;color:var(--text-muted)">Variables filled in on insert: {first}, {company}, {approval}</div>',
    foot: '<button class="btn" data-cancel>Cancel</button><button class="btn btn-primary" data-save>Save template</button>',
    onMount(card, close) {
      card.querySelector('[data-cancel]').addEventListener('click', close);
      card.querySelector('[data-save]').addEventListener('click', () => {
        const name = card.querySelector('#etName').value.trim();
        const subject = card.querySelector('#etSubject').value.trim();
        const html = sanitizeHtml(card.querySelector('#etHtml').value);
        if (!name || !html) { toast('A template needs a name and a body'); return; }
        if (index === null) all.push({ name, subject, html });
        else { t.name = name; t.subject = subject; t.html = html; }
        const ok = savePrefs();
        close();
        toast(ok ? 'Template saved' : 'Template could not be saved — storage is blocked', ok ? '' : 'err');
        if (done) done();
      });
    }
  });
}

/* ============================================================
   INIT
   ============================================================ */
function renderMail() {
  renderNavRail();
  if (mailState.threadId) renderRead(); else renderList();
}

function initEmailPage() {
  bootShell();
  loadStoredDrafts();
  renderMail();

  document.getElementById('composeBtn').addEventListener('click', () => openCompose({}));

  const params = new URLSearchParams(location.search);
  const compose = params.get('compose');
  if (compose) openCompose({ to: compose });

  window.onGlobalSearch = value => {
    mailState.search = value;
    mailState.threadId = null;
    renderList();
  };
  window.onShellEscape = () => {
    const top = composers[composers.length - 1];
    if (top && top.full) { top.full = false; top.el.classList.remove('full'); return true; }
    return false;
  };
}
document.addEventListener('DOMContentLoaded', initEmailPage);
