/* ============================================================
   shell.js — the frame every page shares.
   Preferences · navigation · screen fit · notifications ·
   user menu · settings · popup menus · modals · toasts.
   ============================================================ */

/* ---------- Preferences ---------- */
const PREF_KEY = 'crmv1_prefs';
const prefs = {
  navMode: 'topbar',      /* topbar | icons | full */
  scalePreset: 'standard',
  scaleAuto: true,
  fontStep: 0,
  listWidth: null,
  starred: [],
  notifRead: [],
  templates: null,        /* null = use the built-in set until the user edits one */
  emailTemplates: null,
  savedFilters: []
};
function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return;
    const p = JSON.parse(raw);
    if (p.navMode) prefs.navMode = p.navMode;
    if (p.scalePreset) { prefs.scalePreset = p.scalePreset; prefs.scaleAuto = false; }
    if (typeof p.fontStep === 'number') prefs.fontStep = p.fontStep;
    if (typeof p.listWidth === 'number') prefs.listWidth = p.listWidth;
    if (Array.isArray(p.starred)) prefs.starred = p.starred;
    if (Array.isArray(p.notifRead)) prefs.notifRead = p.notifRead;
    if (Array.isArray(p.templates)) prefs.templates = p.templates;
    if (Array.isArray(p.emailTemplates)) prefs.emailTemplates = p.emailTemplates;
    if (Array.isArray(p.savedFilters)) prefs.savedFilters = p.savedFilters;
  } catch (e) { /* private mode or blocked storage — run with defaults */ }
}
function savePrefs() {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify({
      navMode: prefs.navMode, scalePreset: prefs.scalePreset,
      fontStep: prefs.fontStep, listWidth: prefs.listWidth,
      starred: prefs.starred, notifRead: prefs.notifRead,
      templates: prefs.templates, emailTemplates: prefs.emailTemplates,
      savedFilters: prefs.savedFilters
    }));
    return true;
  } catch (e) { return false; }
}

/* ---------- Screen fit ----------
   Anything narrower than the desktop layout width gets the whole desktop
   view scaled down to fit exactly. transform: scale() is used rather than
   CSS zoom because some in-app web views ignore zoom and reflow the page
   into the narrow width instead of shrinking it. */
const FIT_W = 1280;
function currentScale() {
  if (window.innerWidth < FIT_W) return window.innerWidth / FIT_W;
  const scaleMap = { standard: 1, wide: 1.06, ultrawide: 1.12 };
  const fontPx = 15 + prefs.fontStep * 0.5;
  return (scaleMap[prefs.scalePreset] || 1) * (fontPx / 15);
}
function autoDetectScale() {
  if (!prefs.scaleAuto) return;
  const w = window.innerWidth;
  prefs.scalePreset = w >= 3000 ? 'ultrawide' : (w >= 1800 ? 'wide' : 'standard');
}
function applyScaleAndFont() {
  const fontPx = 15 + prefs.fontStep * 0.5;
  document.documentElement.style.setProperty('--nav-icon-size', fontPx.toFixed(1) + 'px');

  const z = currentScale();
  const app = document.getElementById('app');
  app.style.transform = (z === 1) ? 'none' : 'scale(' + z + ')';
  /* Sized in real pixels rather than vw/vh: inside a transformed element
     viewport units are resolved differently by different engines. */
  app.style.width = (window.innerWidth / z) + 'px';
  app.style.height = (window.innerHeight / z) + 'px';

  const fv = document.getElementById('fontVal');
  if (fv) {
    fv.textContent = fontPx.toFixed(1) + 'px';
    document.getElementById('fontDec').disabled = prefs.fontStep <= 0;
    document.getElementById('fontInc').disabled = prefs.fontStep >= 8;
  }
  document.querySelectorAll('#scaleSeg button').forEach(b => b.classList.toggle('active', b.dataset.scale === prefs.scalePreset));
  if (typeof window.onShellResize === 'function') window.onShellResize();
  savePrefs();
}

/* ---------- Navigation ---------- */
function currentPage() { return document.body.dataset.page || 'leads'; }

function renderNav() {
  const page = currentPage();
  const item = NAV_ITEMS.find(n => n.key === page);
  const nameEl = document.getElementById('pageName');
  if (nameEl && item) nameEl.textContent = item.label;
  const tabs = document.getElementById('topbarTabs');
  const sidebar = document.getElementById('sidebar');
  const items = document.getElementById('sidebarNavItems');
  tabs.innerHTML = '';
  items.innerHTML = '';

  if (prefs.navMode === 'topbar') {
    sidebar.dataset.hidden = 'true';
    NAV_ITEMS.forEach(item => {
      const a = document.createElement('a');
      a.className = 'topbar-tab' + (page === item.key ? ' active' : '');
      a.href = item.href;
      a.innerHTML = item.icon + '<span class="topbar-tab-label">' + item.label + '</span>';
      tabs.appendChild(a);
    });
  } else {
    sidebar.dataset.hidden = 'false';
    sidebar.dataset.mode = prefs.navMode;
    NAV_ITEMS.forEach(item => {
      const a = document.createElement('a');
      a.className = 'nav-item' + (page === item.key ? ' active' : '');
      a.href = item.href;
      a.title = item.label;
      a.innerHTML = item.icon + '<span class="nav-item-label">' + item.label + '</span>';
      items.appendChild(a);
    });
  }
  document.querySelectorAll('#navModeSeg button').forEach(b => b.classList.toggle('active', b.dataset.mode === prefs.navMode));
  document.querySelectorAll('#scaleSeg button').forEach(b => b.classList.toggle('active', b.dataset.scale === prefs.scalePreset));
}

/* ---------- Providers ----------
   Nothing outbound can succeed until a real provider is wired in here.
   Every page asks these two functions instead of assuming success, so no
   part of the app can report a send that did not happen. */
const PROVIDER = { connected: false, name: 'SMS / WhatsApp provider' };
const MAIL_PROVIDER = { connected: false, name: 'mail account' };

function deliverMessage() {
  if (!PROVIDER.connected) return { ok: false, error: 'no ' + PROVIDER.name + ' is connected' };
  return { ok: false, error: 'the provider returned no result' };
}
function deliverEmail() {
  if (!MAIL_PROVIDER.connected) return { ok: false, error: 'no ' + MAIL_PROVIDER.name + ' is connected' };
  return { ok: false, error: 'the mail account returned no result' };
}

/* Business rule: real outreach moves a lead along. Only ever called after an
   actual successful send. */
function registerOutreach(l) {
  if (l.status === 'New') l.status = 'Attempted';
  else if (l.status === 'Attempted') l.status = 'Engaged';
}

/* ---------- Shared empty state ---------- */
function emptyPanelHtml(title, sub) {
  return '<div class="empty-panel">' + sizedIcon(ICONS.none, 30) +
    '<div class="ep-title">' + escapeHtml(title) + '</div>' +
    '<div class="ep-sub">' + escapeHtml(sub) + '</div></div>';
}

/* ---------- Toasts ---------- */
let toastHost = null;
function toast(msg, kind) {
  if (!toastHost) {
    toastHost = document.createElement('div');
    toastHost.className = 'toast-host';
    document.body.appendChild(toastHost);
  }
  const el = document.createElement('div');
  el.className = 'toast' + (kind ? ' ' + kind : '');
  el.textContent = msg;
  toastHost.appendChild(el);
  setTimeout(() => el.remove(), 3400);
}

/* ---------- Popup menu ----------
   items: {label, icon, tail, active, danger, sep, heading, onClick} */
let openPop = null;
function closePop() { if (openPop) { openPop.remove(); openPop = null; } }
function popMenu(anchor, items, opts) {
  closePop();
  opts = opts || {};
  const el = document.createElement('div');
  el.className = 'pop-menu';
  if (opts.width) el.style.minWidth = opts.width + 'px';

  items.forEach(it => {
    if (it.sep) { el.insertAdjacentHTML('beforeend', '<div class="pop-sep"></div>'); return; }
    if (it.heading) { el.insertAdjacentHTML('beforeend', '<div class="pop-label">' + escapeHtml(it.label) + '</div>'); return; }
    const b = document.createElement('button');
    b.className = 'pop-item' + (it.active ? ' active' : '');
    if (it.danger) b.style.color = 'var(--accent-red)';
    b.innerHTML = (it.icon || '<span style="width:13px"></span>') +
      '<span>' + escapeHtml(it.label) + '</span>' +
      (it.tail ? '<span class="tail">' + escapeHtml(it.tail) + '</span>' : '');
    b.addEventListener('click', ev => { ev.stopPropagation(); closePop(); if (it.onClick) it.onClick(); });
    el.appendChild(b);
  });

  document.body.appendChild(el);
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth, h = el.offsetHeight;
  let left = (opts.align === 'left') ? r.left : r.right - w;
  left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
  let top = r.bottom + 6;
  if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
  el.style.left = left + 'px';
  el.style.top = top + 'px';
  openPop = el;

  setTimeout(() => document.addEventListener('mousedown', onDocDown), 0);
  function onDocDown(ev) {
    if (el.contains(ev.target)) return;
    document.removeEventListener('mousedown', onDocDown);
    closePop();
  }
  return el;
}

/* ---------- Modal ---------- */
const modalStack = [];
function openModal(opts) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML =
    '<div class="modal-card' + (opts.wide ? ' wide' : '') + '">' +
      '<div class="modal-head"><span>' + escapeHtml(opts.title || '') + '</span>' +
        '<button class="icon-btn mh-close" data-close title="Close">' + ICONS.close + '</button></div>' +
      '<div class="modal-body">' + (opts.body || '') + '</div>' +
      (opts.foot ? '<div class="modal-foot">' + opts.foot + '</div>' : '') +
    '</div>';
  document.body.appendChild(overlay);
  modalStack.push(overlay);

  function close() {
    overlay.remove();
    const i = modalStack.indexOf(overlay);
    if (i > -1) modalStack.splice(i, 1);
    if (opts.onClose) opts.onClose();
  }
  overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(); });
  overlay.querySelector('[data-close]').addEventListener('click', close);
  if (opts.onMount) opts.onMount(overlay.querySelector('.modal-card'), close);
  return { el: overlay, close };
}
function confirmModal(title, message, confirmLabel, onConfirm) {
  openModal({
    title,
    body: '<p style="font-size:12.5px;color:var(--text-secondary)">' + escapeHtml(message) + '</p>',
    foot: '<button class="btn" data-no>Cancel</button><button class="btn btn-primary" data-yes>' + escapeHtml(confirmLabel) + '</button>',
    onMount(card, close) {
      card.querySelector('[data-no]').addEventListener('click', close);
      card.querySelector('[data-yes]').addEventListener('click', () => { close(); if (onConfirm) onConfirm(); });
    }
  });
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (openPop) { closePop(); return; }
  if (typeof window.onShellEscape === 'function' && window.onShellEscape()) return;
  if (modalStack.length) modalStack[modalStack.length - 1].querySelector('[data-close]').click();
});

/* ---------- Notifications ---------- */
function renderNotifPanel() {
  const list = document.getElementById('notifList');
  if (!NOTIF_MOCK.length) { list.innerHTML = '<div class="notif-empty">No notifications.</div>'; return; }
  list.innerHTML = NOTIF_MOCK.map((n, i) => `<div class="notif-row ${prefs.notifRead.includes(i) ? 'read' : ''}">
      <div class="notif-icon ${n.cls}">${n.icon}</div>
      <div class="notif-text"><div class="notif-title">${escapeHtml(n.title)}</div><div class="notif-sub">${escapeHtml(n.sub)}</div></div>
      <div class="notif-time">${n.time}</div>
    </div>`).join('');
  paintNotifDot();
}
function paintNotifDot() {
  const dot = document.getElementById('notifDot');
  if (dot) dot.hidden = prefs.notifRead.length >= NOTIF_MOCK.length;
}
function markAllNotifsRead() {
  prefs.notifRead = NOTIF_MOCK.map((_, i) => i);
  savePrefs();
  renderNotifPanel();
}

/* ---------- Settings ---------- */
const SETTINGS_TABS = ['Profile', 'Workspace', 'Devices', 'Email', 'Scanner', 'Users & Permissions', 'Data & Storage'];
function settingsPane(tab) {
  const ro = (label, value, note) =>
    `<div class="form-row"><label>${escapeHtml(label)}</label><div style="font-size:12.5px">${value}</div>` +
    (note ? `<div style="font-size:11px;color:var(--text-muted)">${escapeHtml(note)}</div>` : '') + '</div>';

  switch (tab) {
    case 'Profile':
      return '<div class="form-grid">' +
        ro('User name', 'Marcus Webb') + ro('Role', 'Senior Rep') + '</div>' +
        ro('Signature', 'Marcus Webb<br>Senior Funding Advisor<br>(646) 555-0119') +
        ro('Preferred device', 'Desk Line');
    case 'Workspace':
      return ro('Interface scale', escapeHtml(prefs.scalePreset) + (prefs.scaleAuto ? ' (auto-detected)' : ' (chosen)')) +
        ro('Font / icon size', (15 + prefs.fontStep * 0.5).toFixed(1) + 'px') +
        ro('Navigation display', escapeHtml(prefs.navMode)) +
        ro('Saved lead-list width', prefs.listWidth ? Math.round(prefs.listWidth) + 'px' : 'Automatic') +
        '<div style="display:flex;gap:8px"><button class="btn" data-reset-widths>Reset panel widths</button>' +
        '<button class="btn" data-reset-all>Reset all saved settings</button></div>';
    case 'Devices':
      return '<p style="font-size:11.5px;color:var(--text-muted);margin-bottom:12px">No phone bridge is configured, so every device below reports its real state. Calling and SMS cannot send until a bridge is connected.</p>' +
        '<table class="data-table"><thead><tr><th>Device</th><th>Type</th><th>Sender number</th><th>State</th></tr></thead><tbody>' +
        '<tr><td>Desk Line</td><td>SIP bridge</td><td>(646) 555-0119</td><td style="color:var(--accent-red)">Not configured</td></tr>' +
        '<tr><td>Mobile</td><td>Bluetooth HFP / MAP</td><td>(646) 555-0143</td><td style="color:var(--accent-red)">Not connected</td></tr>' +
        '</tbody></table>';
    case 'Email':
      return ro('Connected account', '<span style="color:var(--accent-red)">None</span>', 'Sending and open tracking are unavailable until an account is linked.') +
        ro('Sender identity', 'marcus.webb@meridiancap.com (unverified)') +
        ro('Templates', '6 saved templates') +
        ro('Tracking', 'Simulated — every tracking state shown in the app is mock data.');
    case 'Scanner':
      return ro('Extraction mode', 'Text layer first, OCR fallback') +
        ro('Review threshold', 'Flag anything under 90% confidence') +
        ro('Page limit per file', '40') +
        ro('Engine', '<span style="color:var(--accent-red)">Not connected</span>', 'The Scanner page is not built yet.');
    case 'Users & Permissions':
      return '<table class="data-table"><thead><tr><th>User</th><th>Role</th><th>Scanner</th><th>Command</th><th>Export</th></tr></thead><tbody>' +
        '<tr><td>Marcus Webb</td><td>Senior Rep</td><td>Yes</td><td>Yes</td><td>Yes</td></tr>' +
        '<tr><td>Dana Okafor</td><td>Rep</td><td>Yes</td><td>No</td><td>No</td></tr>' +
        '</tbody></table>';
    case 'Data & Storage':
      return ro('Storage', 'Browser localStorage (structured for IndexedDB)', 'Lead records are held as structured objects, ready to move to a real store without changing the interface.') +
        '<div style="display:flex;gap:8px"><button class="btn" data-export>Export a JSON backup</button></div>';
  }
  return '';
}
function openSettings(startTab) {
  let tab = startTab || 'Profile';
  openModal({
    title: 'Settings',
    wide: true,
    body: '<div style="display:flex;gap:18px;min-height:320px">' +
            '<div style="flex:0 0 160px" data-tabs></div><div style="flex:1;min-width:0" data-pane></div></div>',
    foot: '<span class="mf-note" data-note></span><button class="btn" data-done>Done</button>',
    onMount(card, close) {
      const tabsEl = card.querySelector('[data-tabs]');
      const paneEl = card.querySelector('[data-pane]');
      card.querySelector('[data-done]').addEventListener('click', close);

      function paint() {
        tabsEl.innerHTML = SETTINGS_TABS.map(t =>
          `<button class="pop-item ${t === tab ? 'active' : ''}" data-t="${escapeHtml(t)}"><span>${escapeHtml(t)}</span></button>`).join('');
        tabsEl.querySelectorAll('[data-t]').forEach(b =>
          b.addEventListener('click', () => { tab = b.dataset.t; paint(); }));
        paneEl.innerHTML = settingsPane(tab);
        wire(card, close);
      }
      function wire(card, close) {
        const rw = paneEl.querySelector('[data-reset-widths]');
        if (rw) rw.addEventListener('click', () => {
          prefs.listWidth = null; savePrefs();
          if (typeof window.onShellResize === 'function') window.onShellResize();
          toast('Panel widths reset'); paint();
        });
        const ra = paneEl.querySelector('[data-reset-all]');
        if (ra) ra.addEventListener('click', () => {
          confirmModal('Reset saved settings',
            'Navigation mode, scale, font size, panel width and saved favourites will be forgotten in this browser.',
            'Reset', () => {
              try { localStorage.removeItem(PREF_KEY); } catch (e) {}
              location.reload();
            });
        });
        const ex = paneEl.querySelector('[data-export]');
        if (ex) ex.addEventListener('click', () => {
          const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), leads: LEADS }, null, 2)], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'crm-backup-' + new Date().toISOString().slice(0, 10) + '.json';
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          toast('Backup downloaded');
        });
      }
      paint();
    }
  });
}

/* ---------- Dropdown helpers ---------- */
function toggleDropdown(panelId, others) {
  const panel = document.getElementById(panelId);
  const willOpen = panel.hidden;
  others.forEach(id => { const o = document.getElementById(id); if (o) o.hidden = true; });
  panel.hidden = !willOpen;
}

/* ---------- Boot ---------- */
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

function bootShell() {
  loadPrefs();
  renderNav();
  autoDetectScale();
  applyScaleAndFont();
  renderNotifPanel();

  const search = document.getElementById('globalSearch');
  if (search) {
    search.addEventListener('input', e => {
      if (typeof window.onGlobalSearch === 'function') window.onGlobalSearch(e.target.value);
    });
    search.addEventListener('keydown', e => {
      if (e.key === 'Enter' && typeof window.onGlobalSearch !== 'function') {
        location.href = 'index.html?q=' + encodeURIComponent(search.value);
      }
    });
  }

  document.getElementById('refreshBtn').addEventListener('click', e => {
    e.currentTarget.classList.add('spinning');
    setTimeout(() => location.reload(), 350);
  });

  document.getElementById('notifBtn').addEventListener('click', e => {
    e.stopPropagation(); toggleDropdown('notifPanel', ['userMenuPanel']);
  });
  document.getElementById('notifMarkRead').addEventListener('click', e => {
    e.stopPropagation(); markAllNotifsRead(); toast('All notifications marked read');
  });
  document.getElementById('userMenuBtn').addEventListener('click', e => {
    e.stopPropagation(); toggleDropdown('userMenuPanel', ['notifPanel']);
  });

  document.getElementById('navModeSeg').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    prefs.navMode = b.dataset.mode;
    renderNav(); savePrefs();
    if (typeof window.onShellResize === 'function') window.onShellResize();
  });
  /* The sidebar width is animated, so re-measure once the animation lands too. */
  document.getElementById('sidebar').addEventListener('transitionend', e => {
    if (e.propertyName === 'width' && typeof window.onShellResize === 'function') window.onShellResize();
  });
  document.getElementById('scaleSeg').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    prefs.scalePreset = b.dataset.scale; prefs.scaleAuto = false;
    applyScaleAndFont();
  });
  document.getElementById('fontInc').addEventListener('click', () => {
    if (prefs.fontStep < 8) { prefs.fontStep++; applyScaleAndFont(); }
  });
  document.getElementById('fontDec').addEventListener('click', () => {
    if (prefs.fontStep > 0) { prefs.fontStep--; applyScaleAndFont(); }
  });
  document.getElementById('umSettings').addEventListener('click', () => {
    document.getElementById('userMenuPanel').hidden = true;
    openSettings('Profile');
  });
  document.getElementById('umDevices').addEventListener('click', () => {
    document.getElementById('userMenuPanel').hidden = true;
    openSettings('Devices');
  });

  document.addEventListener('click', e => {
    const nWrap = document.getElementById('notifBtn').closest('.topbar-icon-wrap');
    const uWrap = document.getElementById('userMenuBtn').closest('.topbar-icon-wrap');
    if (!nWrap.contains(e.target)) document.getElementById('notifPanel').hidden = true;
    if (!uWrap.contains(e.target)) document.getElementById('userMenuPanel').hidden = true;
    if (typeof window.onShellDocumentClick === 'function') window.onShellDocumentClick(e);
  });

  const refit = () => { autoDetectScale(); applyScaleAndFont(); };
  window.addEventListener('resize', debounce(refit, 200));
  window.addEventListener('orientationchange', () => setTimeout(refit, 250));

  /* Home-screen install support: the manifest is built here so the app works
     from a plain folder as well as from a web server. */
  try {
    const iconHref = document.querySelector('link[rel="icon"]').href;
    const manifest = {
      name: 'CRM', short_name: 'CRM', start_url: '.', display: 'standalone',
      background_color: '#F2F4F8', theme_color: '#3B6FD4',
      icons: [{ src: iconHref, sizes: '64x64', type: 'image/svg+xml' }]
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    document.getElementById('manifestLink').href = URL.createObjectURL(blob);
  } catch (e) { /* manifest is optional */ }
}

/* ---------- Email tracking marks ----------
   Mailsuite-style: one grey check once a message leaves, two green checks
   once it is opened. The tooltip lists the real recorded open times. This is
   the only implementation — the Email page and the Leads page both call it. */
function fmtOpenTime(ts) {
  return new Date(ts).toLocaleString('en-US',
    { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function trackingMark(tracking) {
  if (!tracking) return '';
  const opens = tracking.opens || [];
  const opened = tracking.state === 'opened' || tracking.state === 'replied';
  const icon = opened ? ICONS.checkDouble : ICONS.checkSingle;
  let tip;
  if (opened) {
    const list = opens.slice().sort((a, b) => b - a)
      .map(t => '<div>' + escapeHtml(fmtOpenTime(t)) + '</div>').join('');
    tip = '<b>Opened ' + opens.length + ' time' + (opens.length === 1 ? '' : 's') + '</b>' + list +
          (tracking.state === 'replied' ? '<div><b>Replied</b></div>' : '');
  } else {
    tip = '<b>' + (tracking.state === 'sent' ? 'Sent' : 'Delivered, not opened yet') + '</b>' +
          '<div>No opens recorded</div>';
  }
  return '<span class="trk ' + tracking.state + '" tabindex="0">' + icon +
         '<span class="trk-tip">' + tip + '</span></span>';
}
