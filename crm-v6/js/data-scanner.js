/* ============================================================
   data-scanner.js — Scanner queue mock data.

   No OCR/extraction engine is connected in this build (ENGINE.connected
   is false), so nothing here may claim a real scan happened. These items
   represent an already-populated queue (yesterday's/this week's intake)
   so the page looks complete on first load; anything the person uploads
   in this session is added honestly at 'uploaded' / 'queued' and goes no
   further, exactly like the Email/Messages pages report a real failed
   send instead of a fake success.

   Every extracted value is pulled from the matching lead's own data in
   data.js rather than invented, so statement/application figures stay
   internally consistent with what the Leads page already shows.
   ============================================================ */

const ENGINE = { connected: false, name: 'OCR / extraction engine' };

/* Application revenue rounds UP to the next $50K, then +$150K.
   $327K -> $350K -> $500K. Source revenue is kept separate from the
   computed figure — this never overwrites a lead's existing approval. */
function computeApproval(revenue) {
  const roundedUp = Math.ceil(revenue / 50000) * 50000;
  return roundedUp + 150000;
}

function leadByCompany(name) { return LEADS.find(l => l.company === name); }

function buildExtraction(l, docKey) {
  if (!l) return null;
  const stmt = l.statements.find(s => s.key === docKey);
  if (docKey === 'application') {
    return {
      companyName: l.company, dba: l.company.split(' ')[0] + ' Holdings',
      ownerName: l.name, title: l.title,
      mobile: l.mobiles[0], email: l.emails[0], landline: l.landlines[0],
      ein: '••-•••' + String(1000 + (l.company.length * 7) % 9000).slice(-4),
      businessAddress: l.address, applicationAddress: l.address,
      timeInBusiness: l.tib, statedAnnualRevenue: l.revenue,
      requestedFunding: l.reqFunding, computedApproval: computeApproval(l.revenue)
    };
  }
  return {
    companyName: l.company, ownerName: l.name,
    mobile: l.mobiles[0], email: l.emails[0], landline: l.landlines[0],
    businessAddress: l.address,
    bankName: l.bank, accountMasked: '••••' + String(4000 + (l.company.length * 13) % 5000).slice(-4),
    accountType: 'Business checking',
    statementMonth: stmt ? stmt.month : '—',
    totalDeposits: stmt ? stmt.deposits : null,
    endingBalance: stmt ? stmt.endingBalance : null,
    mtdDeposits: l.mtd ? l.mtd.deposits : null, mtdBalance: l.mtd ? l.mtd.balance : null, mtdAsOf: l.mtd ? l.mtd.asOf : null,
    avgDailyInflow: Math.round(l.avgDeposits / 30 * 1.15 / 10) * 10,
    avgDailyOutflow: Math.round(l.avgDeposits / 30 * 0.98 / 10) * 10,
    largestExpenseCategory: l.expCat, largestExpenseAmount: l.expAmt,
    mcaLender: l.mcaBurden ? l.mcaLender : null, mcaBurden: l.mcaBurden || null
  };
}

const SCAN_QUEUE = [
  {
    id: 'sc1', file: 'apex-dynamics-august-2026-statement.pdf', leadId: null, leadCompany: 'Apex Dynamics',
    docType: 'Bank Statement', docKey: 'aug', pages: 4, pagesSelected: 4, uploadedAt: '2h',
    processingState: 'processed', extractionState: 'extracted', reviewState: 'reviewed',
    ocr: { used: false, state: 'not_run' }, error: null, flags: []
  },
  {
    id: 'sc2', file: 'northfield-logistics-july-statement-scan.pdf', leadId: null, leadCompany: 'Northfield Logistics',
    docType: 'Bank Statement', docKey: 'jul', pages: 5, pagesSelected: 5, uploadedAt: '4h',
    processingState: 'processed', extractionState: 'needs_review', reviewState: 'not_reviewed',
    ocr: { used: true, state: 'complete' }, error: null,
    flags: [{ field: 'Ending Balance', state: 'needs_review', note: 'Low OCR confidence on the closing-balance line — confirm against the source page.' }]
  },
  {
    id: 'sc3', file: 'coastal-wellness-application.pdf', leadId: null, leadCompany: 'Coastal Wellness Group',
    docType: 'Application', docKey: 'application', pages: 6, pagesSelected: 6, uploadedAt: '11m',
    processingState: 'processing', extractionState: 'pending', reviewState: 'not_reviewed',
    ocr: { used: false, state: 'not_run' }, error: null, flags: []
  },
  {
    id: 'sc4', file: 'scan-0092.pdf', leadId: null, leadCompany: null,
    docType: 'Bank Statement', docKey: null, pages: 3, pagesSelected: 3, uploadedAt: '28m',
    processingState: 'queued', extractionState: 'pending', reviewState: 'not_reviewed',
    ocr: { used: false, state: 'not_run' }, error: null, flags: []
  },
  {
    id: 'sc5', file: 'baptiste-roofing-aug-statement.pdf', leadId: null, leadCompany: 'Baptiste Roofing & Exteriors',
    docType: 'Bank Statement', docKey: 'aug', pages: 4, pagesSelected: 2, uploadedAt: '1d',
    processingState: 'failed', extractionState: 'failed', reviewState: 'not_reviewed',
    ocr: { used: true, state: 'failed' },
    error: 'Extraction failed — only 2 of 4 pages were selected and the closing-balance page was not included.',
    flags: [{ field: 'Ending Balance', state: 'missing', note: 'Page containing the closing balance was not part of the selected range.' }]
  },
  {
    id: 'sc6', file: 'IMG_4471.heic', leadId: null, leadCompany: null,
    docType: 'Unknown', docKey: null, pages: 0, pagesSelected: 0, uploadedAt: '2d',
    processingState: 'failed', extractionState: 'failed', reviewState: 'not_reviewed',
    ocr: { used: false, state: 'not_run' }, error: 'Unsupported file type — only PDF, PNG and JPG are accepted.', flags: []
  },
  {
    id: 'sc7', file: 'farrow-vale-bistro-application-signed.pdf', leadId: null, leadCompany: 'Farrow & Vale Bistro',
    docType: 'Application', docKey: 'application', pages: 5, pagesSelected: 5, uploadedAt: '3d',
    processingState: 'processed', extractionState: 'extracted', reviewState: 'reviewed',
    ocr: { used: false, state: 'not_run' }, error: null, flags: []
  },
  {
    id: 'sc8', file: 'michaels-auto-group-jul-statement.pdf', leadId: null, leadCompany: 'Michaels Auto Group',
    docType: 'Bank Statement', docKey: 'jul', pages: 6, pagesSelected: 6, uploadedAt: '3d',
    processingState: 'processed', extractionState: 'needs_review', reviewState: 'not_reviewed',
    ocr: { used: true, state: 'complete' }, error: null,
    flags: [{ field: 'Company Name', state: 'conflict', note: 'Statement reads "Michaels Auto Group LLC"; the application on file reads "Michaels Auto Group Inc." — kept separate, not merged.' }]
  },
  {
    id: 'sc9', file: 'castillo-dental-statement-unlabeled.pdf', leadId: null, leadCompany: 'Castillo Family Dental',
    docType: 'Bank Statement', docKey: 'aug', pages: 4, pagesSelected: 4, uploadedAt: '4d',
    processingState: 'processed', extractionState: 'needs_review', reviewState: 'not_reviewed',
    ocr: { used: false, state: 'not_run' }, error: 'Wrong association suspected — the account holder name on the statement does not match Castillo Family Dental.',
    flags: [{ field: 'Lead association', state: 'needs_review', note: 'Reassign to the correct lead before approving this extraction.' }]
  },
  {
    id: 'sc10', file: 'kessler-precision-aug-statement.pdf', leadId: null, leadCompany: 'Kessler Precision Machining',
    docType: 'Bank Statement', docKey: 'aug', pages: 5, pagesSelected: 5, uploadedAt: '5d',
    processingState: 'processed', extractionState: 'extracted', reviewState: 'reviewed',
    ocr: { used: false, state: 'not_run' }, error: null, flags: []
  },
  {
    id: 'sc11', file: 'whitfield-legal-group-application.pdf', leadId: null, leadCompany: 'Whitfield Legal Group',
    docType: 'Application', docKey: 'application', pages: 11, pagesSelected: 10, uploadedAt: '6d',
    processingState: 'queued', extractionState: 'pending', reviewState: 'not_reviewed',
    ocr: { used: false, state: 'not_run' }, error: null,
    flags: [{ field: 'Page range', state: 'needs_review', note: '11 pages uploaded — 1 page is past the approved default page limit and was excluded. Adjust the range to include it.' }]
  },
  {
    id: 'sc12', file: 'ortega-freight-jul-statement.pdf', leadId: null, leadCompany: 'Ortega Freight Solutions',
    docType: 'Bank Statement', docKey: 'jul', pages: 4, pagesSelected: 4, uploadedAt: '6d',
    processingState: 'processed', extractionState: 'extracted', reviewState: 'reviewed',
    ocr: { used: false, state: 'not_run' }, error: null, flags: []
  },
  {
    id: 'sc13', file: 'lindqvist-interior-aug-statement-scan.pdf', leadId: null, leadCompany: 'Lindqvist Interior Design',
    docType: 'Bank Statement', docKey: 'aug', pages: 3, pagesSelected: 3, uploadedAt: '9m',
    processingState: 'processing', extractionState: 'pending', reviewState: 'not_reviewed',
    ocr: { used: true, state: 'not_run' }, error: null, flags: []
  }
];

SCAN_QUEUE.forEach(q => {
  const l = leadByCompany(q.leadCompany);
  if (l) q.leadId = l.id;
  q.extracted = q.docKey ? buildExtraction(l, q.docKey) : null;
});
