/* ============================================================
   viewer.js — full-screen document viewer.
   One page at a time, sized to fit whatever screen it opens on,
   so a phone shows the same full page a monitor does. Page
   content is built once per lead + document from that lead's own
   figures, so a statement's printed totals always match the
   totals shown in the panel. The side arrows step pages and roll
   over into the next document. Clicking outside closes.
   ============================================================ */
const docState = { leadId: null, docKey: null, page: 1, zoom: 1, open: false };
const DOC_ORDER = ['application','aug','jul'];
const PAGE_RATIO = 8.5 / 11;                 /* US Letter */
const APP_PAGES = 4, STMT_PAGES = 8;
const STMT_P1_ROWS = 12, STMT_MID_ROWS = 20;
const MONTHS_3 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CREDIT_DESCS = ['ACH CREDIT · SETTLEMENT','CARD SETTLEMENT','WIRE IN','ACH CREDIT · BATCH',
                      'COUNTER CREDIT','MOBILE DEPOSIT','REMOTE DEPOSIT','ACH CREDIT · CUSTOMER PMT','DEPOSIT'];
const DEBIT_DESCS  = ['ACH DEBIT · VENDOR','CARD PURCHASE','MERCHANT FEES','SUPPLIER ACH',
                      'FREIGHT / SHIPPING','SOFTWARE SUBSCRIPTION','STATE TAX PMT','FUEL / FLEET'];
const DOC_CACHE = new Map();

function docPages(key){ return key === 'application' ? APP_PAGES : STMT_PAGES; }
function fmtDocAmt(n){ return (n < 0 ? '−' : '') + fmtMoney(Math.abs(n)); }

/* Deterministic mock values: the same lead and document always render the same
   page, so paging or zooming never reshuffles the content. */
function docSeed(str){ let h = 2166136261; for(let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h,16777619); } return h>>>0; }
function seededRandom(seed){ let s = seed || 1; return ()=>{ s = (Math.imul(s,1664525)+1013904223)>>>0; return s/4294967296; }; }
function seededDigits(rnd,n){ let o=''; for(let i=0;i<n;i++) o += Math.floor(rnd()*10); return o; }

function leadDocIds(l){
  const ck = l.id+':ids';
  if(DOC_CACHE.has(ck)) return DOC_CACHE.get(ck);
  const rnd = seededRandom(docSeed(ck));
  const ids = {
    account: seededDigits(rnd,10),
    ein: seededDigits(rnd,2)+'-'+seededDigits(rnd,7),
    ssn: seededDigits(rnd,3)+'-'+seededDigits(rnd,2)+'-'+seededDigits(rnd,4),
    appNo: 'APP-'+seededDigits(rnd,6),
    ownership: [100,100,85,75,60][Math.floor(rnd()*5)],
    dob: MONTHS_3[Math.floor(rnd()*12)]+' '+(1+Math.floor(rnd()*27))+', '+(1962+Math.floor(rnd()*24))
  };
  DOC_CACHE.set(ck, ids);
  return ids;
}
function businessStart(tib){
  const y = (tib.match(/(\d+)\s*yr/) || [])[1] || 0;
  const m = (tib.match(/(\d+)\s*mo/) || [])[1] || 0;
  const d = new Date(2026, 8, 1);
  d.setMonth(d.getMonth() - (parseInt(y,10)*12 + parseInt(m,10)));
  return MONTHS_3[d.getMonth()] + ' ' + d.getFullYear();
}
function webDomain(l){ const e = l.emails[0] || ''; return 'www.' + (e.split('@')[1] || 'example.com'); }

/* Statement activity — credits total exactly the deposits figure in the panel,
   debits are the lead's own recurring obligations plus variable spending. */
function statementDoc(l, key){
  const ck = l.id+':'+key;
  if(DOC_CACHE.has(ck)) return DOC_CACHE.get(ck);
  const st = l.statements.find(s=>s.key===key);
  const rnd = seededRandom(docSeed(ck));
  const DAYS = 31, CREDITS = 62, OTHERS = 48;
  const rows = [];
  const w = []; let wSum = 0;
  for(let i=0;i<CREDITS;i++){ const x = 0.55 + rnd(); w.push(x); wSum += x; }
  let left = st.deposits;
  w.forEach((x,i)=>{
    const amt = (i === CREDITS-1) ? left : Math.round(st.deposits * x / wSum);
    if(i < CREDITS-1) left -= amt;
    rows.push({ day: 1 + Math.floor(i*DAYS/CREDITS), desc: CREDIT_DESCS[Math.floor(rnd()*CREDIT_DESCS.length)], amt });
  });
  const debit = (day, desc, amt)=> rows.push({ day, desc, amt: -Math.max(1, Math.round(amt)) });
  if(l.mcaBurden){
    const bizDays = [];
    for(let d=1; d<=DAYS; d++){ if(d%7 !== 0 && d%7 !== 6) bizDays.push(d); }
    bizDays.slice(0,21).forEach(d=> debit(d, l.mcaLender.toUpperCase()+' · DAILY PMT', l.mcaBurden/21));
  }
  debit(1,  'RENT DRAFT',        st.deposits*0.07);
  debit(5,  'PAYROLL ACH',       st.deposits*0.13);
  debit(9,  'UTILITIES',         st.deposits*0.012);
  debit(12, l.expCat.toUpperCase(), l.expAmt);
  debit(19, 'PAYROLL ACH',       st.deposits*0.13);
  debit(22, 'INSURANCE PREMIUM', st.deposits*0.02);
  const fixed = rows.reduce((s,r)=> s + (r.amt<0 ? -r.amt : 0), 0);
  const budget = Math.max(st.deposits*0.12, st.deposits*0.9 - fixed);
  const ow = []; let owSum = 0;
  for(let i=0;i<OTHERS;i++){ const x = 0.4 + rnd(); ow.push(x); owSum += x; }
  ow.forEach((x,i)=> debit(1 + Math.floor(i*DAYS/OTHERS), DEBIT_DESCS[Math.floor(rnd()*DEBIT_DESCS.length)], budget*x/owSum));
  rows.sort((a,b)=> a.day - b.day);
  const credits = rows.reduce((s,r)=> s + (r.amt>0 ? r.amt : 0), 0);
  const debits  = rows.reduce((s,r)=> s + (r.amt<0 ? -r.amt : 0), 0);
  const data = { st, rows, credits, debits, beginning: st.endingBalance - credits + debits };
  DOC_CACHE.set(ck, data);
  return data;
}
function stmtRowsForPage(rows, page){
  if(page === 1) return rows.slice(0, STMT_P1_ROWS);
  const start = STMT_P1_ROWS + (page-2)*STMT_MID_ROWS;
  return page === STMT_PAGES ? rows.slice(start) : rows.slice(start, start + STMT_MID_ROWS);
}
function activityTable(abbr, rows){
  return `<table class="ds-table">
    <thead><tr><th class="c-date">Date</th><th class="c-desc">Description</th><th class="c-amt">Amount</th></tr></thead>
    <tbody>${rows.map(r=>`<tr>
      <td class="c-date">${abbr} ${r.day}</td>
      <td class="c-desc">${escapeHtml(r.desc)}</td>
      <td class="c-amt">${fmtDocAmt(r.amt)}</td></tr>`).join('')}</tbody></table>`;
}
function kv(k, v){ return `<div class="ds-kv"><div class="k">${k}</div><div class="v">${v}</div></div>`; }

function stmtPageHtml(l, key, page){
  const d = statementDoc(l, key);
  const ids = leadDocIds(l);
  const abbr = MONTHS_3[MONTHS_3.findIndex(m=> d.st.month.startsWith(m))] || d.st.month.slice(0,3);
  const foot = `Page ${page} of ${STMT_PAGES}. ${page < STMT_PAGES ? 'Continued on next page. ' : ''}${escapeHtml(l.bank)} N.A. Member FDIC.`;
  const corner = `<div class="ds-corner">MEMBER FDIC · ${page}/${STMT_PAGES}</div>`;
  const rows = stmtRowsForPage(d.rows, page);
  if(page === 1){
    return corner +
      `<div class="ds-brand">${escapeHtml(l.bank.toUpperCase())}</div>
       <div class="ds-sub">Business checking statement</div>
       <div class="ds-title">${escapeHtml(d.st.month)}</div>` +
      kv('Account holder', escapeHtml(l.company)) +
      kv('Account number', ids.account) +
      kv('Beginning balance', fmtMoney(d.beginning)) +
      kv('Total deposits / credits', fmtMoney(d.credits)) +
      kv('Total withdrawals / debits', fmtDocAmt(-d.debits)) +
      kv('Ending balance', fmtMoney(d.st.endingBalance)) +
      `<div class="ds-h2">Account activity</div>` + activityTable(abbr, rows) +
      `<div class="ds-foot">${foot}</div>`;
  }
  const head = corner +
    `<div class="ds-brand">${escapeHtml(l.bank.toUpperCase())}</div>
     <div class="ds-sub">${escapeHtml(l.company)} · Account ${ids.account} · ${escapeHtml(d.st.month)}</div>`;
  if(page === STMT_PAGES){
    return head +
      `<div class="ds-h2">Account activity (continued)</div>` + activityTable(abbr, rows) +
      `<div class="ds-h2">Summary of activity</div>` +
      kv('Total deposits / credits', fmtMoney(d.credits)) +
      kv('Total withdrawals / debits', fmtDocAmt(-d.debits)) +
      kv('Ending balance', fmtMoney(d.st.endingBalance)) +
      `<div class="ds-note">End of statement.</div>
       <div class="ds-foot">${foot}</div>`;
  }
  return head + `<div class="ds-h2">Account activity (continued)</div>` + activityTable(abbr, rows) +
    `<div class="ds-foot">${foot}</div>`;
}

function appPageHtml(l, page){
  const ids = leadDocIds(l);
  const foot = `Page ${page} of ${APP_PAGES}. ${escapeHtml(ids.appNo)} · ${escapeHtml(l.company)}`;
  const corner = `<div class="ds-corner">APPLICATION · ${page}/${APP_PAGES}</div>`;
  const head = corner +
    `<div class="ds-brand">BUSINESS FUNDING APPLICATION</div>
     <div class="ds-sub">${escapeHtml(ids.appNo)} · Submitted Sep 2, 2026</div>`;
  if(page === 1){
    return head + `<div class="ds-title">${escapeHtml(l.company)}</div>
      <div class="ds-h2">Business information</div>` +
      kv('Legal business name', escapeHtml(l.company)) +
      kv('DBA / trade name', escapeHtml(l.company)) +
      kv('Industry / business type', escapeHtml(l.industry)) +
      kv('Business address', escapeHtml(fmtAddress(l.address))) +
      kv('State', escapeHtml(l.address.state)) +
      kv('Business phone', escapeHtml(l.landlines[0] || l.mobiles[0])) +
      kv('Website', escapeHtml(webDomain(l))) +
      kv('Entity type', 'Limited Liability Company') +
      kv('Business start date', businessStart(l.tib)) +
      kv('Time in business', escapeHtml(l.tib)) +
      kv('EIN / Tax ID', ids.ein) +
      `<div class="ds-foot">${foot}</div>`;
  }
  if(page === 2){
    const contacts = [].concat(
      l.mobiles.map((m,i)=> ['Mobile '+(i+1), m]),
      l.landlines.map((n,i)=> ['Landline '+(i+1), n]),
      l.emails.map((e,i)=> ['Email '+(i+1), e])
    );
    return head + `<div class="ds-h2">Owner / applicant</div>` +
      kv('Full name', escapeHtml(l.name)) +
      kv('Title / role', escapeHtml(l.title)) +
      kv('Ownership percentage', ids.ownership + '%') +
      kv('Date of birth', ids.dob) +
      kv('SSN', ids.ssn) +
      `<div class="ds-h2">Contact detail</div>
       <table class="ds-table"><thead><tr><th>Type</th><th>Detail</th></tr></thead><tbody>
       ${contacts.map(c=>`<tr><td>${c[0]}</td><td>${escapeHtml(c[1])}</td></tr>`).join('')}
       </tbody></table>
       <div class="ds-foot">${foot}</div>`;
  }
  if(page === 3){
    const mca = l.mcaBurden
      ? `<tr><td>${escapeHtml(l.mcaLender)}</td><td>${fmtMoney(Math.round(l.mcaBurden/21))}</td><td>Daily</td><td>${fmtMoney(l.mcaBurden)}</td></tr>`
      : `<tr><td colspan="4">None reported by applicant.</td></tr>`;
    return head + `<div class="ds-h2">Funding request</div>` +
      kv('Amount requested', fmtMoney(l.reqFunding)) +
      kv('Approved amount', fmtMoney(l.approval)) +
      kv('Use of funds', 'Working capital') +
      kv('Stated annual revenue', fmtMoney(l.revenue)) +
      `<div class="ds-h2">Banking</div>` +
      kv('Bank', escapeHtml(l.bank)) +
      kv('Account number', ids.account) +
      kv('Account type', 'Business checking') +
      kv('Average monthly deposits', fmtMoney(l.avgDeposits)) +
      `<div class="ds-h2">Existing obligations</div>
       <table class="ds-table"><thead><tr><th>Funder</th><th>Payment</th><th>Frequency</th><th>Est. monthly</th></tr></thead>
       <tbody>${mca}</tbody></table>
       <div class="ds-foot">${foot}</div>`;
  }
  return head + `<div class="ds-h2">Authorization</div>
    <div class="ds-note">The applicant certifies that the information provided in this application is
    true and complete, and that the business is authorised to enter into a funding agreement.</div>
    <div class="ds-note">The applicant authorises the funder and its agents to obtain business and
    personal credit reports, to verify bank account activity, and to contact the references and
    financial institutions listed in this application.</div>
    <div class="ds-note">The applicant confirms that the bank statements submitted with this
    application are complete and unaltered records of the account named above.</div>
    <div class="ds-sign"><div>Signature</div><div>Print name</div></div>
    <div class="ds-sign"><div>Title</div><div>Date</div></div>
    <div class="ds-foot">${foot}</div>`;
}

function openDocViewer(leadId, docKey){
  Object.assign(docState, { leadId, docKey, page: 1, zoom: 1, open: true });
  document.getElementById('docViewerOverlay').hidden = false;
  renderDocViewer();
}
function closeDocViewer(){
  docState.open = false;
  document.getElementById('docViewerOverlay').hidden = true;
}
function stepDocPage(dir){
  const dv = docState;
  let page = dv.page + dir, i = DOC_ORDER.indexOf(dv.docKey);
  if(page < 1){
    if(i <= 0) return;
    dv.docKey = DOC_ORDER[i-1]; page = docPages(dv.docKey);
  } else if(page > docPages(dv.docKey)){
    if(i >= DOC_ORDER.length-1) return;
    dv.docKey = DOC_ORDER[i+1]; page = 1;
  }
  dv.page = page; dv.zoom = 1;
  renderDocViewer();
}
function zoomDoc(dir){
  const dv = docState;
  dv.zoom = Math.round(Math.min(4, Math.max(1, dv.zoom + dir*0.25)) * 100) / 100;
  sizeDocSheet();
  updateDocControls();
}
function sizeDocSheet(){
  const overlay = document.getElementById('docViewerOverlay');
  const stage = document.getElementById('docStage');
  const sheet = document.getElementById('docSheet');
  const sw = stage.clientWidth, sh = stage.clientHeight;
  if(!sw || !sh) return;
  /* One control unit measured from the stage: a phone lays the app out at a
     fixed desktop width, so scaling the controls with the stage keeps them the
     same physical size on a phone as on a monitor. */
  const ui = Math.max(30, Math.min(sw * 0.065, sh * 0.045));
  overlay.style.setProperty('--doc-ui', ui.toFixed(1)+'px');
  const availW = sw - ui*2.4, availH = sh - ui*2.6;
  let h = availH, w = h * PAGE_RATIO;
  if(w > availW){ w = availW; h = w / PAGE_RATIO; }
  const z = docState.zoom;
  sheet.style.width  = (w*z).toFixed(1)+'px';
  sheet.style.height = (h*z).toFixed(1)+'px';
  sheet.style.fontSize = ((w*z)/56).toFixed(2)+'px';
  /* Keep the arrows just off the edge of the page rather than out at the far
     edges of a wide screen; on a narrow screen they fall back to the edge. */
  overlay.style.setProperty('--doc-inset', Math.max(ui*0.35, (sw - w*z)/2 - ui*1.25).toFixed(1)+'px');
}
function updateDocControls(){
  const dv = docState;
  const i = DOC_ORDER.indexOf(dv.docKey);
  document.getElementById('docPrev').disabled = i <= 0 && dv.page <= 1;
  document.getElementById('docNext').disabled = i >= DOC_ORDER.length-1 && dv.page >= docPages(dv.docKey);
  document.getElementById('docCount').innerHTML = dv.page + '<span class="sep">/</span>' + docPages(dv.docKey);
  document.getElementById('docZoomIn').disabled  = dv.zoom >= 4;
  document.getElementById('docZoomOut').disabled = dv.zoom <= 1;
}
function renderDocViewer(){
  const dv = docState;
  const l = getLead(dv.leadId);
  if(!l) return;
  document.getElementById('docSheet').innerHTML =
    dv.docKey === 'application' ? appPageHtml(l, dv.page) : stmtPageHtml(l, dv.docKey, dv.page);
  sizeDocSheet();
  updateDocControls();
  const stage = document.getElementById('docStage');
  stage.scrollTop = 0; stage.scrollLeft = 0;
}

/* Wiring — called once per page that includes the viewer markup. */
function initViewer(){
  const overlay = document.getElementById('docViewerOverlay');
  if(!overlay) return;
  /* Clicking anywhere off the page closes it; the page itself and the
     floating controls do not. */
  overlay.addEventListener('click', e=>{
    if(e.target.closest('.doc-sheet') || e.target.closest('button')) return;
    closeDocViewer();
  });
  document.getElementById('docPrev').addEventListener('click', ()=> stepDocPage(-1));
  document.getElementById('docNext').addEventListener('click', ()=> stepDocPage(1));
  document.getElementById('docZoomIn').addEventListener('click', ()=> zoomDoc(1));
  document.getElementById('docZoomOut').addEventListener('click', ()=> zoomDoc(-1));

  /* Escape closes the viewer before any modal underneath it. */
  window.onShellEscape = function(){
    if(!docState.open) return false;
    closeDocViewer();
    return true;
  };
}

/* Re-fit an open page when the window resizes or the phone rotates. */
function refitViewer(){ if(docState.open) sizeDocSheet(); }
