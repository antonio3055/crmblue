/* ============================================================
   data-email.js — mailbox mock records for the Email page.
   Shaped like a real mail feed (threads holding messages) so it
   can be swapped for a provider without changing render code.
   ============================================================ */

const ACCOUNT = {
  name: 'Marcus Webb',
  email: 'marcus.webb@meridiancap.com',
  initials: 'MW'
};

const SIGNATURES = [
  { id: 'sig1', name: 'Full', isDefault: true,
    html: '<div style="color:#5f6368;font-size:13px;line-height:1.6"><strong style="color:#1f1f1f">Marcus Webb</strong><br>Senior Funding Advisor · Meridian Capital Partners<br>(646) 555-0119 · marcus.webb@meridiancap.com</div>' },
  { id: 'sig2', name: 'Short', isDefault: false,
    html: '<div style="color:#5f6368;font-size:13px">Marcus Webb · Meridian Capital Partners · (646) 555-0119</div>' }
];

const EMAIL_TEMPLATES_DEFAULT = [
  { name: 'Funding proposal',
    subject: 'Funding proposal — {company}',
    html: '<p>Hi {first},</p><p>Thanks for the time today. Based on the statements you sent through, {company} is approved for <strong>{approval}</strong>.</p><p>The offer is attached. Happy to walk through the payment schedule whenever suits.</p>' },
  { name: 'Statement request',
    subject: 'Bank statements for {company}',
    html: '<p>Hi {first},</p><p>To finish the review I need the last three months of business bank statements for {company}. A PDF export from online banking is fine.</p><p>Once they land I can usually turn an offer around the same day.</p>' },
  { name: 'Follow-up',
    subject: 'Following up — {company}',
    html: '<p>Hi {first},</p><p>Checking in on the funding conversation for {company}. Still worth a short call this week?</p>' },
  { name: 'Consolidation pitch',
    subject: 'Freeing up daily cash flow at {company}',
    html: '<p>Hi {first},</p><p>The existing advance is taking a daily bite out of {company}\'s cash flow. Consolidating it would lower the payment and leave working capital in the account.</p><p>Ten minutes to run the numbers?</p>' },
  { name: 'Funds disbursed',
    subject: 'Funds disbursed — {company}',
    html: '<p>Hi {first},</p><p>Confirming the disbursement for {company} went out today. Please check the account and let me know it landed.</p><p>Great working with you.</p>' }
];

/* Times are built relative to now so the mailbox always reads as current. */
const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const NOW = Date.now();

function mailFor(company) {
  const l = LEADS.find(x => x.company === company);
  return l ? { name: l.name, email: l.emails[0], leadId: l.id, company: l.company, rep: l.rep } : null;
}
const ME = { name: ACCOUNT.name, email: ACCOUNT.email };

/* thread: { id, leadId, subject, folder, unread, starred, messages[] }
   message: { id, dir, from, to[], cc[], bcc[], at, html, attachments[], tracking } */
function thread(id, company, subject, folder, unread, starred, messages) {
  const who = mailFor(company);
  return {
    id, subject, folder, unread, starred,
    leadId: who ? who.leadId : null,
    company: who ? who.company : company,
    rep: who ? who.rep : 'Marcus Webb',
    contact: who ? who : { name: company, email: 'unknown@example.com' },
    messages
  };
}
function out(id, who, at, html, tracking, attachments, cc, bcc) {
  return { id, dir: 'out', from: ME, to: [{ name: who.name, email: who.email }],
           cc: cc || [], bcc: bcc || [], at, html,
           attachments: attachments || [], tracking: tracking || null };
}
function inc(id, who, at, html, attachments) {
  return { id, dir: 'in', from: { name: who.name, email: who.email }, to: [ME],
           cc: [], bcc: [], at, html, attachments: attachments || [], tracking: null };
}
/* tracking: sent | unopened | opened | replied, with real open timestamps */
function track(state, opens) { return { state, opens: opens || [] }; }

const EMAIL_THREADS = [
  thread('t1', 'Apex Dynamics', 'Funding proposal — Apex Dynamics', 'inbox', true, true, [
    out('m1a', mailFor('Apex Dynamics'), NOW - 5 * HOUR,
      '<p>Hi Sandra,</p><p>Attached is the <strong>$226,000</strong> offer we discussed. It clears the Fundbridge position and leaves roughly $9K a month back in the account.</p><p>Happy to walk through the payment schedule whenever suits.</p>',
      track('opened', [NOW - 4 * HOUR - 20 * MIN, NOW - 2 * HOUR - 5 * MIN, NOW - 55 * MIN]),
      [{ name: 'Apex-Dynamics-Offer.pdf', size: '284 KB' }]),
    inc('m1b', mailFor('Apex Dynamics'), NOW - 40 * MIN,
      '<p>Marcus,</p><p>Looks workable. Can you show me the same thing at a 9 month term so I can compare?</p><p>Sandra</p>')
  ]),

  thread('t2', 'Michaels Auto Group', 'Final funding confirmation', 'inbox', true, false, [
    out('m2a', mailFor('Michaels Auto Group'), NOW - 13 * HOUR,
      '<p>Devon,</p><p>Confirming Thursday disbursement for <strong>$310,000</strong>. Wire goes out at 9am ET and normally lands the same morning.</p>',
      track('replied', [NOW - 12 * HOUR, NOW - 11 * HOUR - 30 * MIN])),
    inc('m2b', mailFor('Michaels Auto Group'), NOW - 11 * HOUR,
      '<p>Perfect. We will have the inventory order ready to go Friday.</p><p>Devon</p>')
  ]),

  thread('t3', 'Northfield Logistics', 'Signed agreement — Northfield Logistics', 'inbox', false, true, [
    out('m3a', mailFor('Northfield Logistics'), NOW - 2 * DAY,
      '<p>Marcus,</p><p>Agreement attached for signature. Nothing changed from the terms we agreed on the call.</p>',
      track('opened', [NOW - 2 * DAY + 3 * HOUR]),
      [{ name: 'Northfield-Agreement.pdf', size: '412 KB' }]),
    inc('m3b', mailFor('Northfield Logistics'), NOW - 4 * HOUR,
      '<p>Thanks Marcus, signed copy attached. Payroll doc follows tomorrow.</p>',
      [{ name: 'Northfield-Agreement-signed.pdf', size: '498 KB' }])
  ]),

  thread('t4', 'Castillo Family Dental', 'Equipment financing details', 'inbox', true, false, [
    out('m4a', mailFor('Castillo Family Dental'), NOW - DAY,
      '<p>Hi Renee,</p><p>Here are the terms for the imaging equipment. Because there is no existing advance on the account the pricing is at the better end of our range.</p><ul><li>Approval: <strong>$88,000</strong></li><li>Term: 12 months</li><li>No prepayment penalty</li></ul>',
      track('opened', [NOW - 20 * HOUR, NOW - 6 * HOUR]))
  ]),

  thread('t5', 'Kessler Precision Machining', 'Following up — Kessler Precision Machining', 'inbox', false, false, [
    out('m5a', mailFor('Kessler Precision Machining'), NOW - 2 * DAY,
      '<p>Aaron,</p><p>Wanted to reconnect on the funding conversation. Raw material timing is the pressure point on your statements, and $255,000 would take the current advance out of the picture.</p>',
      track('unopened'))
  ]),

  thread('t6', 'Coastal Wellness Group', 'Introduction — funding options for Coastal Wellness', 'inbox', false, false, [
    out('m6a', mailFor('Coastal Wellness Group'), NOW - 2 * DAY,
      '<p>Hi Priya,</p><p>Wanted to introduce our working-capital options. Coastal Wellness has a clean deposit history and no advance on file, which puts you in the better pricing tier.</p>',
      track('unopened'))
  ]),

  thread('t7', 'Farrow & Vale Bistro', 'Working capital options — Farrow & Vale', 'inbox', false, false, [
    out('m7a', mailFor('Farrow & Vale Bistro'), NOW - 4 * DAY,
      '<p>Hi Linda,</p><p>Following up on our call last week. The Bluewater payment is the main drag on supplier timing — a $62,000 advance would clear it and smooth the month out.</p>',
      track('opened', [NOW - 3 * DAY - 2 * HOUR])),
    inc('m7b', mailFor('Farrow & Vale Bistro'), NOW - 3 * DAY,
      '<p>Thanks Marcus. Let us get through restaurant week and I will come back to you.</p>')
  ]),

  thread('t8', 'Voss Marketing Collective', 'Funds disbursed — Voss Marketing Collective', 'inbox', false, false, [
    out('m8a', mailFor('Voss Marketing Collective'), NOW - 5 * DAY,
      '<p>Elena,</p><p>Confirming <strong>$120,000</strong> was disbursed today, in time for the Q4 media buys.</p>',
      track('replied', [NOW - 5 * DAY + HOUR])),
    inc('m8b', mailFor('Voss Marketing Collective'), NOW - 5 * DAY + 2 * HOUR,
      '<p>Funds landed, thank you! Great to work with you.</p>')
  ]),

  thread('t9', 'Baptiste Roofing & Exteriors', 'August statement — Baptiste Roofing', 'inbox', true, false, [
    inc('m9a', mailFor('Baptiste Roofing & Exteriors'), NOW - 26 * HOUR,
      '<p>Marcus, sending the August statement from site as promised.</p>',
      [{ name: 'PNC-August-2026.pdf', size: '1.1 MB' }])
  ]),

  thread('t10', 'Whitfield Legal Group', 'Case-cost financing for Whitfield Legal', 'sent', false, false, [
    out('m10a', mailFor('Whitfield Legal Group'), NOW - 2 * DAY,
      '<p>Hi Tasha,</p><p>Introducing myself — I work with firms on case-cost financing. Whitfield has a clean deposit record and no advance on file.</p><p>Worth a short call after trial?</p>',
      track('sent'))
  ]),

  thread('t11', 'Ibe Fitness Studios', 'Payment comparison — Ibe Fitness', 'sent', false, false, [
    out('m11a', mailFor('Ibe Fitness Studios'), NOW - 4 * DAY,
      '<p>Marcus,</p><p>Side by side comparison of your current Bluewater payment against a consolidated $48,000 advance. The monthly figure drops by roughly a third.</p>',
      track('opened', [NOW - 3 * DAY]),
      [{ name: 'Ibe-Comparison.pdf', size: '96 KB' }])
  ]),

  thread('t12', 'Lindqvist Interior Design', 'Contractor payment financing', 'sent', false, false, [
    out('m12a', mailFor('Lindqvist Interior Design'), NOW - 3 * DAY,
      '<p>Hi Grace,</p><p>Tried your mobile. In short: a $54,000 advance would cover contractor payments on the larger projects without touching your own cash.</p>',
      track('unopened'))
  ]),

  thread('t13', 'Ortega Freight Solutions', 'Revisiting in Q1 — Ortega Freight', 'archived', false, false, [
    out('m13a', mailFor('Ortega Freight Solutions'), NOW - 5 * DAY,
      '<p>Julian,</p><p>Understood — I will leave this until January as you asked. The file stays open on our side.</p>',
      track('opened', [NOW - 5 * DAY + 30 * MIN]))
  ]),

  thread('t14', 'Apex Dynamics', 'Re: Bank statement follow-up', 'archived', false, false, [
    out('m14a', mailFor('Apex Dynamics'), NOW - 3 * DAY,
      '<p>Sandra,</p><p>Thanks for the August statement. One more month and the file is complete.</p>',
      track('opened', [NOW - 3 * DAY + 45 * MIN])),
    inc('m14b', mailFor('Apex Dynamics'), NOW - 2 * DAY,
      '<p>July attached. Let me know if you need anything else.</p>',
      [{ name: 'Chase-July-2026.pdf', size: '890 KB' }])
  ]),

  thread('t15', 'Michaels Auto Group', 'Floor plan question', 'trash', false, false, [
    inc('m15a', mailFor('Michaels Auto Group'), NOW - 8 * DAY,
      '<p>Ignore this one — sent from the wrong address.</p>')
  ])
];

/* Drafts live in the same shape so the list and reading view need no special
   cases. They carry no tracking because nothing has been sent. */
const EMAIL_DRAFTS = [
  {
    id: 'd1', subject: 'Renewal options — Castillo Family Dental', folder: 'drafts',
    unread: false, starred: false, leadId: (mailFor('Castillo Family Dental') || {}).leadId,
    company: 'Castillo Family Dental', rep: 'Dana Okafor',
    contact: mailFor('Castillo Family Dental'),
    messages: [{
      id: 'd1m', dir: 'draft', from: ME,
      to: [{ name: 'Renee Castillo', email: 'renee@castillodental.com' }], cc: [], bcc: [],
      at: NOW - 3 * HOUR,
      html: '<p>Hi Renee,</p><p>Wanted to put some numbers around the second chair before you decide…</p>',
      attachments: [], tracking: null
    }]
  }
];

const MAILBOXES = [
  { key: 'inbox',    label: 'Inbox' },
  { key: 'starred',  label: 'Starred' },
  { key: 'sent',     label: 'Sent' },
  { key: 'drafts',   label: 'Drafts' },
  { key: 'archived', label: 'Archived' },
  { key: 'trash',    label: 'Trash' }
];

const ALL_THREADS = EMAIL_THREADS.concat(EMAIL_DRAFTS);

/* Every thread also hangs off its lead, so the Leads page can show the same
   tracking state without a second source of truth. */
LEADS.forEach(l => {
  l.mailThreads = ALL_THREADS.filter(t => t.leadId === l.id);
});
