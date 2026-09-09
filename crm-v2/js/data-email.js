/* ============================================================
   data-email.js — mock mailbox for the Email page.
   Threads are linked to real leads by id so every email event
   can be tied back to a company, contact and rep. Replace this
   file with a provider feed of the same shape.
   ============================================================ */

const MAILBOXES = [
  { key: 'inbox',    label: 'Inbox' },
  { key: 'sent',     label: 'Sent' },
  { key: 'drafts',   label: 'Drafts' },
  { key: 'starred',  label: 'Starred' },
  { key: 'archived', label: 'Archived' },
  { key: 'trash',    label: 'Trash' }
];

const ME = { name: 'Marcus Webb', email: 'marcus.webb@meridiancap.com' };

/* leadCompany is resolved to a lead id at the bottom of this file. */
const EMAIL_THREADS = [
  { leadCompany: 'Apex Dynamics', mailbox: 'inbox', unread: true, starred: true,
    subject: 'Funding proposal — Apex Dynamics', tracking: 'opened', opens: 3, lastOpen: 'Today 1:04 PM',
    messages: [
      { dir: 'out', from: ME.email, to: ['s.reeves@apexdyn.com'], cc: ['ops@apexdyn.com'], bcc: [], date: 'Yesterday', time: '4:20 PM',
        body: 'Sandra,\n\nAttached is the $226,000 offer we discussed. It clears the Fundbridge balance and leaves roughly $14K a month back in the account once the daily payment comes off.\n\nHappy to walk through the payment schedule whenever suits.\n\nMarcus',
        attachments: [{ name: 'apex-dynamics-offer.pdf', size: 184320 }] },
      { dir: 'in', from: 's.reeves@apexdyn.com', to: [ME.email], cc: [], bcc: [], date: 'Today', time: '1:06 PM',
        body: 'Thanks Marcus. Two questions before I take this to my partner:\n\n1. Is the payment daily or weekly?\n2. What happens if we pay it down early?\n\nSandra', attachments: [] }
    ] },

  { leadCompany: 'Michaels Auto Group', mailbox: 'inbox', unread: true, starred: false,
    subject: 'Re: Final funding confirmation', tracking: 'replied', opens: 2, lastOpen: 'Today 8:31 AM',
    messages: [
      { dir: 'out', from: ME.email, to: ['dmichaels@michaelsauto.com'], cc: ['ar@michaelsauto.com'], bcc: [], date: 'Yesterday', time: '9:02 AM',
        body: 'Devon,\n\nConfirming Thursday disbursement for $310,000 to the Wells Fargo account ending in the number on your application.\n\nMarcus', attachments: [] },
      { dir: 'in', from: 'dmichaels@michaelsauto.com', to: [ME.email], cc: [], bcc: [], date: 'Today', time: '8:33 AM',
        body: 'Received, thank you. Please copy Angela in accounts on the disbursement notice.', attachments: [] }
    ] },

  { leadCompany: 'Castillo Family Dental', mailbox: 'inbox', unread: true, starred: false,
    subject: 'Equipment financing details', tracking: 'sent', opens: 0, lastOpen: null,
    messages: [
      { dir: 'in', from: 'renee@castillodental.com', to: [ME.email], cc: [], bcc: [], date: 'Yesterday', time: '2:12 PM',
        body: 'Hi Marcus — could you send the terms for the imaging equipment? We are comparing two quotes this week.\n\nRenee', attachments: [] }
    ] },

  { leadCompany: 'Baptiste Roofing & Exteriors', mailbox: 'inbox', unread: false, starred: false,
    subject: 'August statement attached', tracking: 'sent', opens: 0, lastOpen: null,
    messages: [
      { dir: 'in', from: 'owen@baptisteroofing.com', to: [ME.email], cc: ['office@baptisteroofing.com'], bcc: [], date: 'Yesterday', time: '5:10 PM',
        body: 'Marcus, August statement is attached. September has been busier so the numbers should look better next month.\n\nOwen',
        attachments: [{ name: 'pnc-august-2026.pdf', size: 421000 }] }
    ] },

  { leadCompany: 'Kessler Precision Machining', mailbox: 'inbox', unread: false, starred: false,
    subject: 'Re: Following up — Kessler Precision Machining', tracking: 'unopened', opens: 0, lastOpen: null,
    messages: [
      { dir: 'out', from: ME.email, to: ['akessler@kesslerpm.com'], cc: [], bcc: [], date: '2 days ago', time: '10:15 AM',
        body: 'Aaron,\n\nReconnecting on the working capital conversation. Raw material timing looks like the pressure point on the last three statements.\n\nMarcus', attachments: [] },
      { dir: 'in', from: 'aaron.kessler@aol.com', to: [ME.email], cc: [], bcc: [], date: 'Yesterday', time: '6:48 PM',
        body: 'Send the terms in writing and I will read them tonight.', attachments: [] }
    ] },

  { leadCompany: 'Farrow & Vale Bistro', mailbox: 'inbox', unread: false, starred: true,
    subject: 'Working capital options — Farrow & Vale', tracking: 'opened', opens: 4, lastOpen: '3 days ago 9:12 AM',
    messages: [
      { dir: 'out', from: ME.email, to: ['linda@farrowvale.com'], cc: [], bcc: [], date: '4 days ago', time: '11:00 AM',
        body: 'Linda,\n\nFollowing up on our call. A $62,000 advance would cover supplier timing without touching the Bluewater balance.\n\nMarcus', attachments: [] },
      { dir: 'in', from: 'linda@farrowvale.com', to: [ME.email], cc: [], bcc: [], date: '3 days ago', time: '9:20 AM',
        body: 'Reading it now. Can we revisit after restaurant week?', attachments: [] }
    ] },

  { leadCompany: null, mailbox: 'inbox', unread: false, starred: false,
    subject: 'Underwriting queue for Thursday', tracking: null, opens: 0, lastOpen: null,
    messages: [
      { dir: 'in', from: 'dana.okafor@meridiancap.com', to: [ME.email], cc: ['priya.raman@meridiancap.com'], bcc: [], date: 'Yesterday', time: '7:45 AM',
        body: 'Marcus — five files are sitting in underwriting for Thursday. Two are yours (Kessler and Baptiste). Can you chase the missing payroll doc on Northfield?\n\nDana', attachments: [] }
    ] },

  { leadCompany: 'Northfield Logistics', mailbox: 'sent', unread: false, starred: false,
    subject: 'Signed agreement — Northfield Logistics', tracking: 'replied', opens: 5, lastOpen: 'Today 11:41 AM',
    messages: [
      { dir: 'out', from: ME.email, to: ['mchen@northfieldlog.com'], cc: [], bcc: ['dispatch@northfieldlog.com'], date: 'Today', time: '10:05 AM',
        body: 'Marcus,\n\nThe signed copy is attached. Funding is scheduled once the updated payroll document lands.\n\nMarcus Webb',
        attachments: [{ name: 'northfield-agreement-signed.pdf', size: 233000 }] }
    ] },

  { leadCompany: 'Coastal Wellness Group', mailbox: 'sent', unread: false, starred: false,
    subject: 'Introduction — funding options for Coastal Wellness', tracking: 'unopened', opens: 0, lastOpen: null,
    messages: [
      { dir: 'out', from: ME.email, to: ['priya@coastalwellnessgrp.com'], cc: [], bcc: ['billing@coastalwellnessgrp.com'], date: '2 days ago', time: '9:30 AM',
        body: 'Priya,\n\nIntroducing our working-capital options for wellness studios. Your deposits are steady and there is no advance on file, which usually means better pricing on a first facility.\n\nMarcus', attachments: [] }
    ] },

  { leadCompany: 'Voss Marketing Collective', mailbox: 'sent', unread: false, starred: false,
    subject: 'Funds disbursed — Voss Marketing Collective', tracking: 'replied', opens: 2, lastOpen: '5 days ago 3:00 PM',
    messages: [
      { dir: 'out', from: ME.email, to: ['elena@vossmarketing.com'], cc: ['accounts@vossmarketing.com'], bcc: [], date: '5 days ago', time: '2:40 PM',
        body: 'Elena,\n\nConfirming $120,000 was disbursed today. It should show on the Wells Fargo account within one business day.\n\nMarcus', attachments: [] }
    ] },

  { leadCompany: 'Whitfield Legal Group', mailbox: 'archived', unread: false, starred: false,
    subject: 'Case-cost financing overview', tracking: 'unopened', opens: 0, lastOpen: null,
    messages: [
      { dir: 'out', from: ME.email, to: ['tasha@whitfieldlegal.com'], cc: [], bcc: [], date: '2 days ago', time: '10:10 AM',
        body: 'Tasha,\n\nA short overview of how case-cost financing works for firms your size. No action needed while you are in trial.\n\nMarcus',
        attachments: [{ name: 'case-cost-financing.pdf', size: 96000 }] }
    ] },

  { leadCompany: 'Michaels Auto Group', mailbox: 'archived', unread: false, starred: false,
    subject: 'Floor plan interest — quick note', tracking: 'opened', opens: 1, lastOpen: '6 days ago 4:02 PM',
    messages: [
      { dir: 'out', from: ME.email, to: ['dmichaels@michaelsauto.com'], cc: [], bcc: [], date: '6 days ago', time: '3:50 PM',
        body: 'Devon — floor plan interest is the largest recurring cost on the statements at roughly $32,000 a month. Worth factoring into the consolidation maths.\n\nMarcus', attachments: [] }
    ] },

  { leadCompany: 'Ibe Fitness Studios', mailbox: 'trash', unread: false, starred: false,
    subject: 'Duplicate — Ibe Fitness Studios intro', tracking: 'unopened', opens: 0, lastOpen: null,
    messages: [
      { dir: 'out', from: ME.email, to: ['marcus@ibefitness.com'], cc: [], bcc: [], date: '4 days ago', time: '8:05 AM',
        body: 'Sent twice by mistake — disregard this copy.', attachments: [] }
    ] },

  { leadCompany: 'Lindqvist Interior Design', mailbox: 'inbox', unread: false, starred: false,
    subject: 'Contractor payment timing', tracking: 'opened', opens: 1, lastOpen: '3 days ago 5:30 PM',
    messages: [
      { dir: 'in', from: 'grace@lindqvistdesign.com', to: [ME.email], cc: ['studio@lindqvistdesign.com'], bcc: [], date: '3 days ago', time: '5:25 PM',
        body: 'Hi Marcus, we pay contractors on completion but clients pay us on 45 days. That gap is the problem. What would $54,000 cost us monthly?\n\nGrace', attachments: [] }
    ] }
];

/* Resolve companies to lead ids and give every thread stable identifiers. */
EMAIL_THREADS.forEach((t, i) => {
  t.id = 'thr-' + i;
  const lead = LEADS.find(l => l.company === t.leadCompany);
  t.leadId = lead ? lead.id : null;
  t.company = lead ? lead.company : 'Internal';
  t.rep = lead ? lead.rep : ME.name;
  t.status = lead ? lead.status : null;
  t.messages.forEach((m, j) => { m.id = t.id + '-' + j; });
  t.hasAttachments = t.messages.some(m => m.attachments && m.attachments.length);
});

const DEFAULT_SIGNATURES = [
  { name: 'Full', text: 'Marcus Webb\nSenior Funding Advisor · Meridian Capital Partners\n(646) 555-0119 · marcus.webb@meridiancap.com' },
  { name: 'Short', text: 'Marcus Webb · Meridian Capital Partners' }
];

const EMAIL_TEMPLATES = [
  { name: 'Offer summary', text: 'Hi {first},\n\nBased on the statements for {company} we can put together {approval} in working capital. The payment comes off daily and the paperwork is a single page.\n\nWould a short call this week work?\n\n{signature}' },
  { name: 'Statement request', text: 'Hi {first},\n\nTo finish the review for {company} I need the last three months of business bank statements as PDFs. Replying to this email is fine.\n\nThanks,\n{signature}' },
  { name: 'Consolidation pitch', text: 'Hi {first},\n\nThe existing advance is taking a real bite out of daily cash flow at {company}. Consolidating it into {approval} would lower the payment and free the account up.\n\nHappy to show the numbers.\n\n{signature}' },
  { name: 'Post-funding follow-up', text: 'Hi {first},\n\nChecking in now the funds have landed. If anything looks off on the schedule tell me straight away.\n\n{signature}' }
];
