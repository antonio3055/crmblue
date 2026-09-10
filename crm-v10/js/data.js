/* ============================================================
   data.js — all mock records for the app.
   Shaped the way a real feed would arrive, so these objects can
   be swapped for live data without touching the render code.
   ============================================================ */
const LEADS = [
  {name:'Sandra Reeves', company:'Apex Dynamics', title:'VP Engineering', dealValue:226000, lastAction:'1h',
   revenue:936000, industry:'Industrial Equipment', address:{street:'4410 Redwood Ave', city:'San Francisco', state:'CA', zip:'94107'}, tib:'6 yrs 2 mo', reqFunding:250000, approval:226000, rep:'Marcus Webb', status:'Engaged', tz:'PST · 2:41 PM local',
   mobiles:['(415) 882-4401','(415) 309-7723','(415) 552-0187'], landlines:['(415) 771-2200','(415) 771-2201'],
   emails:['s.reeves@apexdyn.com','sandra.reeves@gmail.com','ops@apexdyn.com'],
   bank:'Chase', avgDeposits:78000, expCat:'Equipment Lease', expAmt:9400, mcaLender:'Fundbridge Capital', mcaBurden:18000,
   pitch:'Averaging $78K/mo in deposits with $18K/mo tied up in an existing MCA. A $226K offer consolidates that position and frees up daily cash flow — lead with payment relief.',
   notes:[{author:'Marcus Webb', time:'2d', text:'Wants to see two funding scenarios before the next call.'},{author:'Marcus Webb', time:'6d', text:'Confirmed EIN and business address match statements.'}],
   lastActivity:{desc:'Opened pricing email', time:'1h'},
   calls:[{dir:'out', num:'(415) 882-4401', time:'1d', dur:'4:12', device:'Desk Line'},{dir:'in', num:'(415) 309-7723', time:'3d', dur:'1:05', device:'Mobile'},{dir:'missed', num:'(415) 552-0187', time:'5d', dur:'—', device:'Mobile'}],
   messages:[{dir:'in', ch:'SMS', text:'Can we push the call to 3pm?', date:'Today', time:'1:12 PM'},{dir:'out', ch:'SMS', text:'Works for me — I\'ll call at 3.', date:'Today', time:'1:15 PM'},{dir:'in', ch:'WhatsApp', text:'Sent over the updated statement.', date:'Yesterday', time:'4:40 PM'}],
   emailThreads:[{subject:'Funding proposal — Apex Dynamics', preview:'Attached is the $226K offer we discussed…', time:'1h', tracking:'opened'},{subject:'Re: Bank statement follow-up', preview:'Here is the August statement you asked for.', time:'2d', tracking:'sent'}]},

  {name:'Marcus Chen', company:'Northfield Logistics', title:'Owner', dealValue:180000, lastAction:'3h',
   revenue:1240000, industry:'Freight & Logistics', address:{street:'118 Harbor Blvd', city:'Oakland', state:'CA', zip:'94607'}, tib:'9 yrs', reqFunding:200000, approval:180000, rep:'Marcus Webb', status:'Contract', tz:'PST · 2:41 PM local',
   mobiles:['(510) 664-2290','(510) 918-4471','(510) 233-6602'], landlines:['(510) 445-1100','(510) 445-1101'],
   emails:['mchen@northfieldlog.com','m.chen.nfl@outlook.com','dispatch@northfieldlog.com'],
   bank:'Bank of America', avgDeposits:112000, expCat:'Fuel & Fleet Maintenance', expAmt:21000, mcaLender:'Rapid Advance Group', mcaBurden:14500,
   pitch:'Deposits are consistent at $112K/mo with fuel costs the biggest pressure point. $180K clears the existing advance and adds a fuel-cost buffer through peak season.',
   notes:[{author:'Marcus Webb', time:'4h', text:'Signed intent to proceed, waiting on updated payroll doc.'}],
   lastActivity:{desc:'Signed contract draft', time:'3h'},
   calls:[{dir:'out', num:'(510) 664-2290', time:'4h', dur:'6:40', device:'Desk Line'},{dir:'out', num:'(510) 664-2290', time:'2d', dur:'2:11', device:'Mobile'}],
   messages:[{dir:'out', ch:'SMS', text:'Contract is ready for signature.', date:'Today', time:'10:02 AM'},{dir:'in', ch:'SMS', text:'Signed and sent back.', date:'Today', time:'11:40 AM'}],
   emailThreads:[{subject:'Signed agreement — Northfield Logistics', preview:'Thanks Marcus, signed copy attached.', time:'3h', tracking:'replied'}]},

  {name:'Priya Natarajan', company:'Coastal Wellness Group', title:'Founder', dealValue:95000, lastAction:'5h',
   revenue:512000, industry:'Health & Wellness', address:{street:'27 Pier Ave', city:'Santa Monica', state:'CA', zip:'90405'}, tib:'3 yrs 1 mo', reqFunding:110000, approval:95000, rep:'Dana Okafor', status:'Attempted', tz:'PST · 2:41 PM local',
   mobiles:['(310) 774-2098','(310) 552-1147','(310) 998-0032'], landlines:['(310) 663-4400','(310) 663-4401'],
   emails:['priya@coastalwellnessgrp.com','p.natarajan@gmail.com','billing@coastalwellnessgrp.com'],
   bank:'Wells Fargo', avgDeposits:41000, expCat:'Studio Rent', expAmt:7200, mcaLender:'—', mcaBurden:0,
   pitch:'No active MCA — deposits are steady at $41K/mo with rent as the main fixed cost. Clean position, well suited to a first-time advance with lower factor pricing.',
   notes:[{author:'Dana Okafor', time:'1d', text:'Left voicemail, no callback yet.'}],
   lastActivity:{desc:'Missed call, no answer', time:'5h'},
   calls:[{dir:'out', num:'(310) 774-2098', time:'5h', dur:'—', device:'Mobile'},{dir:'out', num:'(310) 774-2098', time:'2d', dur:'0:48', device:'Mobile'}],
   messages:[{dir:'out', ch:'SMS', text:'Hi Priya, tried calling — free later today?', date:'Today', time:'9:15 AM'}],
   emailThreads:[{subject:'Introduction — funding options for Coastal Wellness', preview:'Wanted to introduce our working-capital options…', time:'2d', tracking:'unopened'}]},

  {name:'Owen Baptiste', company:'Baptiste Roofing & Exteriors', title:'Owner', dealValue:140000, lastAction:'7h',
   revenue:875000, industry:'Construction', address:{street:'900 Grant St', city:'Denver', state:'CO', zip:'80203'}, tib:'11 yrs', reqFunding:150000, approval:140000, rep:'Marcus Webb', status:'New', tz:'MST · 3:41 PM local',
   mobiles:['(720) 442-9081','(720) 615-3320','(720) 774-0056'], landlines:['(303) 552-7700','(303) 552-7701'],
   emails:['owen@baptisteroofing.com','obaptiste@yahoo.com','office@baptisteroofing.com'],
   bank:'PNC', avgDeposits:68000, expCat:'Material Suppliers', expAmt:15800, mcaLender:'Cedar Point Capital', mcaBurden:9600,
   pitch:'Seasonal deposit pattern typical for roofing, currently trending up. $9.6K/mo MCA burden is manageable — a $140K offer supports material costs ahead of the spring season.',
   notes:[], lastActivity:{desc:'New lead assigned', time:'7h'},
   calls:[], messages:[], emailThreads:[]},

  {name:'Linda Farrow', company:'Farrow & Vale Bistro', title:'Co-Owner', dealValue:62000, lastAction:'9h',
   revenue:398000, industry:'Restaurant', address:{street:'55 Elm St', city:'Austin', state:'TX', zip:'78701'}, tib:'4 yrs 6 mo', reqFunding:75000, approval:62000, rep:'Dana Okafor', status:'Engaged', tz:'CST · 4:41 PM local',
   mobiles:['(512) 220-4471','(512) 809-2231','(512) 447-7710'], landlines:['(512) 660-1188','(512) 660-1189'],
   emails:['linda@farrowvale.com','l.farrow.biz@gmail.com','reservations@farrowvale.com'],
   bank:'Chase', avgDeposits:29500, expCat:'Food Suppliers', expAmt:8100, mcaLender:'Bluewater Funding', mcaBurden:6200,
   pitch:'Deposits dipped slightly last month but remain steady overall. $6.2K/mo MCA burden is the main pressure — a $62K offer eases supplier payment timing.',
   notes:[{author:'Dana Okafor', time:'3d', text:'Wants to wait until after restaurant week to decide.'}],
   lastActivity:{desc:'Replied to SMS', time:'9h'},
   calls:[{dir:'in', num:'(512) 220-4471', time:'2d', dur:'3:20', device:'Mobile'}],
   messages:[{dir:'in', ch:'SMS', text:'Let\'s talk again next week.', date:'Yesterday', time:'6:02 PM'},{dir:'out', ch:'SMS', text:'Sounds good, I\'ll follow up Monday.', date:'Yesterday', time:'6:10 PM'}],
   emailThreads:[{subject:'Working capital options — Farrow & Vale', preview:'Following up on our call last week…', time:'4d', tracking:'opened'}]},

  {name:'Devon Michaels', company:'Michaels Auto Group', title:'General Manager', dealValue:310000, lastAction:'11h',
   revenue:2150000, industry:'Auto Sales', address:{street:'1200 Industrial Pkwy', city:'Phoenix', state:'AZ', zip:'85034'}, tib:'14 yrs', reqFunding:350000, approval:310000, rep:'Marcus Webb', status:'Contract', tz:'MST · 3:41 PM local',
   mobiles:['(602) 771-4420','(602) 990-1132','(602) 224-7789'], landlines:['(602) 553-0090','(602) 553-0091'],
   emails:['dmichaels@michaelsauto.com','devon.m@icloud.com','ar@michaelsauto.com'],
   bank:'Wells Fargo', avgDeposits:198000, expCat:'Floor Plan Interest', expAmt:32000, mcaLender:'Titan Business Capital', mcaBurden:24000,
   pitch:'Strong $198K/mo average deposits offset a $24K/mo MCA burden. $310K consolidates the existing position with room left for inventory turn.',
   notes:[{author:'Marcus Webb', time:'12h', text:'Final terms accepted, funding scheduled.'}],
   lastActivity:{desc:'Contract countersigned', time:'11h'},
   calls:[{dir:'out', num:'(602) 771-4420', time:'12h', dur:'9:02', device:'Desk Line'}],
   messages:[{dir:'out', ch:'SMS', text:'Funding is scheduled for Thursday.', date:'Today', time:'8:20 AM'},{dir:'in', ch:'SMS', text:'Great, thank you.', date:'Today', time:'8:25 AM'}],
   emailThreads:[{subject:'Final funding confirmation', preview:'Confirming Thursday disbursement for $310,000…', time:'11h', tracking:'replied'}]},

  {name:'Renee Castillo', company:'Castillo Family Dental', title:'Practice Owner', dealValue:88000, lastAction:'1d',
   revenue:604000, industry:'Dental Practice', address:{street:'340 Sunset Dr', city:'Tampa', state:'FL', zip:'33629'}, tib:'7 yrs', reqFunding:100000, approval:88000, rep:'Dana Okafor', status:'Engaged', tz:'EST · 5:41 PM local',
   mobiles:['(813) 552-7741','(813) 908-2264','(813) 332-1190'], landlines:['(813) 227-6600','(813) 227-6601'],
   emails:['renee@castillodental.com','r.castillo.dds@gmail.com','frontdesk@castillodental.com'],
   bank:'M&T Bank', avgDeposits:50000, expCat:'Equipment Financing', expAmt:6400, mcaLender:'—', mcaBurden:0,
   pitch:'No existing MCA and consistent $50K/mo deposits. Strong candidate for equipment upgrade financing at favorable terms.',
   notes:[{author:'Dana Okafor', time:'2d', text:'Interested in financing new imaging equipment.'}],
   lastActivity:{desc:'Requested equipment quote', time:'1d'},
   calls:[{dir:'in', num:'(813) 552-7741', time:'1d', dur:'5:44', device:'Mobile'}],
   messages:[{dir:'in', ch:'SMS', text:'Can you send equipment financing details?', date:'Yesterday', time:'2:10 PM'}],
   emailThreads:[{subject:'Equipment financing details', preview:'Here are the terms for the imaging equipment…', time:'1d', tracking:'sent'}]},

  {name:'Aaron Kessler', company:'Kessler Precision Machining', title:'President', dealValue:255000, lastAction:'1d',
   revenue:1680000, industry:'Manufacturing', address:{street:'700 Foundry Rd', city:'Cleveland', state:'OH', zip:'44113'}, tib:'18 yrs', reqFunding:275000, approval:255000, rep:'Marcus Webb', status:'Attempted', tz:'EST · 5:41 PM local',
   mobiles:['(216) 442-8871','(216) 774-0021','(216) 990-3345'], landlines:['(216) 331-7700','(216) 331-7701'],
   emails:['akessler@kesslerpm.com','aaron.kessler@aol.com','sales@kesslerpm.com'],
   bank:'PNC', avgDeposits:141000, expCat:'Raw Materials', expAmt:38000, mcaLender:'Fundbridge Capital', mcaBurden:21000,
   pitch:'Deposits are strong at $141K/mo, raw material costs are the largest pressure. $255K consolidates the current advance and improves supplier terms.',
   notes:[], lastActivity:{desc:'Left voicemail', time:'1d'},
   calls:[{dir:'out', num:'(216) 442-8871', time:'1d', dur:'—', device:'Desk Line'}],
   messages:[], emailThreads:[{subject:'Following up — Kessler Precision Machining', preview:'Wanted to reconnect on the funding conversation…', time:'2d', tracking:'unopened'}]},

  {name:'Tasha Whitfield', company:'Whitfield Legal Group', title:'Managing Partner', dealValue:70000, lastAction:'2d',
   revenue:445000, industry:'Legal Services', address:{street:'88 Court St', city:'Brooklyn', state:'NY', zip:'11201'}, tib:'5 yrs 4 mo', reqFunding:80000, approval:70000, rep:'Dana Okafor', status:'New', tz:'EST · 5:41 PM local',
   mobiles:['(718) 552-3390','(718) 662-4471','(718) 220-9081'], landlines:['(718) 771-2200','(718) 771-2201'],
   emails:['tasha@whitfieldlegal.com','t.whitfield.esq@gmail.com','intake@whitfieldlegal.com'],
   bank:'Chase', avgDeposits:37000, expCat:'Office Lease', expAmt:9100, mcaLender:'—', mcaBurden:0,
   pitch:'Clean deposit history with no MCA on file. A first advance at $70K would support case-cost financing during active litigation cycles.',
   notes:[], lastActivity:{desc:'New lead assigned', time:'2d'}, calls:[], messages:[], emailThreads:[]},

  {name:'Julian Ortega', company:'Ortega Freight Solutions', title:'Owner', dealValue:165000, lastAction:'2d',
   revenue:990000, industry:'Freight & Logistics', address:{street:'410 Dock St', city:'Long Beach', state:'CA', zip:'90802'}, tib:'8 yrs', reqFunding:180000, approval:165000, rep:'Marcus Webb', status:'Ignore', tz:'PST · 2:41 PM local',
   mobiles:['(562) 442-0091','(562) 774-2231','(562) 908-6602'], landlines:['(562) 553-7700','(562) 553-7701'],
   emails:['julian@ortegafreight.com','j.ortega@yahoo.com','dispatch@ortegafreight.com'],
   bank:'Bank of America', avgDeposits:82000, expCat:'Fuel', expAmt:19500, mcaLender:'Rapid Advance Group', mcaBurden:16800,
   pitch:'MCA burden of $16.8K/mo is putting pressure on daily cash flow despite $82K/mo deposits. Consolidation would meaningfully improve working capital.',
   notes:[{author:'Marcus Webb', time:'5d', text:'Not interested at this time, revisit in Q1.'}],
   lastActivity:{desc:'Marked do-not-contact until Q1', time:'2d'},
   calls:[{dir:'out', num:'(562) 442-0091', time:'5d', dur:'2:30', device:'Mobile'}],
   messages:[], emailThreads:[]},

  {name:'Grace Lindqvist', company:'Lindqvist Interior Design', title:'Principal', dealValue:54000, lastAction:'3d',
   revenue:312000, industry:'Design Services', address:{street:'19 Birch Ln', city:'Minneapolis', state:'MN', zip:'55401'}, tib:'2 yrs 9 mo', reqFunding:60000, approval:54000, rep:'Dana Okafor', status:'Attempted', tz:'CST · 4:41 PM local',
   mobiles:['(612) 220-3391','(612) 774-8820','(612) 552-0067'], landlines:['(612) 331-4400','(612) 331-4401'],
   emails:['grace@lindqvistdesign.com','g.lindqvist@gmail.com','studio@lindqvistdesign.com'],
   bank:'TD Bank', avgDeposits:22000, expCat:'Contractor Payments', expAmt:6800, mcaLender:'—', mcaBurden:0,
   pitch:'Newer business with growing deposits and no MCA. A modest first advance of $54K would fund contractor payments on larger projects.',
   notes:[], lastActivity:{desc:'Left voicemail, no answer', time:'3d'},
   calls:[{dir:'missed', num:'(612) 220-3391', time:'3d', dur:'—', device:'Mobile'}],
   messages:[], emailThreads:[]},

  {name:'Marcus Ibe', company:'Ibe Fitness Studios', title:'Owner', dealValue:48000, lastAction:'4d',
   revenue:276000, industry:'Fitness & Recreation', address:{street:'560 Pine St', city:'Seattle', state:'WA', zip:'98101'}, tib:'3 yrs', reqFunding:55000, approval:48000, rep:'Marcus Webb', status:'New', tz:'PST · 2:41 PM local',
   mobiles:['(206) 442-7710','(206) 774-2298','(206) 990-1145'], landlines:['(206) 553-6600','(206) 553-6601'],
   emails:['marcus@ibefitness.com','m.ibe.fit@gmail.com','info@ibefitness.com'],
   bank:'Chase', avgDeposits:19500, expCat:'Equipment Lease', expAmt:3900, mcaLender:'Bluewater Funding', mcaBurden:3100,
   pitch:'Small existing MCA at $3.1K/mo against steady $19.5K/mo deposits — well positioned for a consolidation with lower monthly payment.',
   notes:[], lastActivity:{desc:'New lead assigned', time:'4d'}, calls:[], messages:[], emailThreads:[]},

  {name:'Elena Voss', company:'Voss Marketing Collective', title:'Founder & CEO', dealValue:120000, lastAction:'5d',
   revenue:730000, industry:'Marketing Agency', address:{street:'201 Peachtree St', city:'Atlanta', state:'GA', zip:'30303'}, tib:'6 yrs', reqFunding:135000, approval:120000, rep:'Dana Okafor', status:'Closed', tz:'EST · 5:41 PM local',
   mobiles:['(404) 552-0091','(404) 774-3320','(404) 220-8871'], landlines:['(404) 331-2200','(404) 331-2201'],
   emails:['elena@vossmarketing.com','e.voss@gmail.com','accounts@vossmarketing.com'],
   bank:'Wells Fargo', avgDeposits:60500, expCat:'Media Buys', expAmt:14200, mcaLender:'—', mcaBurden:0,
   pitch:'Deal closed — $120K disbursed for expanded media buy capacity ahead of Q4 campaigns.',
   notes:[{author:'Dana Okafor', time:'6d', text:'Funded and closed, client very satisfied.'}],
   lastActivity:{desc:'Funding disbursed', time:'5d'},
   calls:[{dir:'out', num:'(404) 552-0091', time:'6d', dur:'4:50', device:'Desk Line'}],
   messages:[{dir:'in', ch:'SMS', text:'Funds landed, thank you!', date:'6d ago', time:'11:00 AM'}],
   emailThreads:[{subject:'Funds disbursed — Voss Marketing Collective', preview:'Confirming $120,000 was disbursed today…', time:'5d', tracking:'replied'}]}
];
LEADS.forEach((l,i)=>{
  l.id = 'lead-'+i; l.num = i+1;
  l.initials = initials(l.name);
  l.color = avatarColor(l.company);
  l.starred = false;      /* set from saved favourites at start-up */
});

/* Bank statement + month-to-date mock values, derived from each lead's average
   monthly deposits so the numbers stay realistic and internally consistent.
   Shaped the same way a real statement feed would be, so this block can be
   swapped for live data without touching the render code. */
const STMT_MONTHS = [
  { key:'aug', label:'August 2026', depositFactor:1.08, balanceFactor:0.31 },
  { key:'jul', label:'July 2026',   depositFactor:0.94, balanceFactor:0.26 }
];
const MTD_LABEL = 'September 2026', MTD_ASOF = 'Sep 8, 2026';
LEADS.forEach(l=>{
  l.statements = STMT_MONTHS.map(m=>({
    key: m.key,
    month: m.label,
    deposits: Math.round(l.avgDeposits * m.depositFactor / 100) * 100,
    endingBalance: Math.round(l.avgDeposits * m.balanceFactor / 100) * 100
  }));
  l.mtd = {
    month: MTD_LABEL,
    asOf: MTD_ASOF,
    deposits: Math.round(l.avgDeposits * 0.27 / 100) * 100,
    balance: Math.round(l.avgDeposits * 0.29 / 100) * 100
  };
  /* Not every lead has a month-to-date figure yet this cycle — keep the
     Leads panel able to render cleanly with it absent. */
  if (l.num % 5 === 0) l.mtd = null;
});

const NOTIF_MOCK = [
  {type:'sms', icon:ICONS.sms, cls:'blue', title:'Inbound SMS — Sandra Reeves', sub:'"Can we push the call to 3pm?"', time:'12m'},
  {type:'email', icon:ICONS.emailOpen, cls:'amber', title:'Email opened — Devon Michaels', sub:'Final funding confirmation', time:'38m'},
  {type:'call', icon:ICONS.callMissed, cls:'red', title:'Missed call — Grace Lindqvist', sub:'(612) 220-3391', time:'1h'},
  {type:'scan', icon:ICONS.scanCheck, cls:'teal', title:'Scanner completed', sub:'Baptiste Roofing — August statement', time:'2h'},
  {type:'assign', icon:ICONS.leads, cls:'blue', title:'Lead assigned to you', sub:'Marcus Ibe — Ibe Fitness Studios', time:'4h'},
  {type:'followup', icon:ICONS.followup, cls:'amber', title:'Follow-up due', sub:'Tasha Whitfield — Whitfield Legal Group', time:'5h'}
];

function getLead(id) { return LEADS.find(l => l.id === id); }

/* ============================================================
   DEVICES
   No bridge process exists, so every device reports its real
   state. Nothing in the app may claim otherwise.
   ============================================================ */
const DEVICES = [
  { id: 'desk',   label: 'Desk Line', type: 'SIP bridge',          number: '(646) 555-0119', state: 'Not configured' },
  { id: 'mobile', label: 'Mobile',    type: 'Bluetooth HFP / MAP', number: '(646) 555-0143', state: 'Not connected' }
];

const MESSAGE_TEMPLATES = [
  { name: 'First touch',        text: 'Hi {first}, this is Marcus at Meridian Capital. I had a look at {company} and think we can help with working capital. Do you have five minutes today?' },
  { name: 'Statement request',  text: 'Hi {first} — to finish the review I just need your last three months of business bank statements. You can reply here or email them over.' },
  { name: 'Approval ready',     text: '{first}, good news: {company} is approved for {approval}. Want me to walk you through the terms?' },
  { name: 'Follow-up nudge',    text: 'Hi {first}, checking in on the funding conversation. Still worth a quick call this week?' },
  { name: 'Payoff / consolidation', text: '{first}, based on your statements the existing advance is taking a real bite out of daily cash flow. A consolidation would lower that payment — worth ten minutes?' },
  { name: 'Thanks and next step', text: 'Thanks {first}. I will send the paperwork across shortly and follow up once it lands.' }
];

const EMOJI = ['👍','🙏','✅','📄','📈','💰','📞','⏰','🎯','🙂','👋','🔥','❗','❓','📬','🤝'];

/* Threads for leads that had no message history yet, so no part of the
   Messages workspace opens empty. */
const SEED_THREADS = {
  'Baptiste Roofing & Exteriors': [
    { dir: 'out', ch: 'SMS', text: 'Hi Owen, Marcus at Meridian Capital — following up on the roofing funding request.', date: 'Monday', time: '9:12 AM', state: 'read' },
    { dir: 'in',  ch: 'SMS', text: 'Morning. We are on a roof until about four, can we talk after?', date: 'Monday', time: '9:31 AM' },
    { dir: 'out', ch: 'SMS', text: 'Four works. I will call the mobile ending 9081.', date: 'Monday', time: '9:33 AM', state: 'read' },
    { dir: 'in',  ch: 'WhatsApp', text: 'Sending the August statement through here, easier from site.', date: 'Yesterday', time: '5:04 PM' }
  ],
  'Kessler Precision Machining': [
    { dir: 'out', ch: 'SMS', text: 'Aaron, left you a voicemail about the $255K approval. Any time today works.', date: 'Yesterday', time: '11:40 AM', state: 'delivered' },
    { dir: 'in',  ch: 'SMS', text: 'Been on the floor all week. Send me the terms in writing and I will read tonight.', date: 'Yesterday', time: '2:18 PM' },
    { dir: 'out', ch: 'SMS', text: 'Will do — going to your work email now.', date: 'Yesterday', time: '2:21 PM', state: 'read' }
  ],
  'Whitfield Legal Group': [
    { dir: 'out', ch: 'SMS', text: 'Hi Tasha, introducing myself — Marcus at Meridian Capital, working on case-cost financing for firms your size.', date: '2 days ago', time: '10:05 AM', state: 'sent' },
    { dir: 'in',  ch: 'SMS', text: 'Thanks. We are mid-trial this week, try me next Tuesday.', date: '2 days ago', time: '4:47 PM' }
  ],
  'Ortega Freight Solutions': [
    { dir: 'out', ch: 'SMS', text: 'Julian, the daily payments on the current advance are the main drag. Consolidation would cut that.', date: '5 days ago', time: '1:15 PM', state: 'read' },
    { dir: 'in',  ch: 'SMS', text: 'Understood, but we are holding off until Q1. Please do not keep calling.', date: '5 days ago', time: '3:02 PM' },
    { dir: 'out', ch: 'SMS', text: 'Noted — I will leave it until January. Thanks Julian.', date: '5 days ago', time: '3:06 PM', state: 'read' }
  ],
  'Lindqvist Interior Design': [
    { dir: 'out', ch: 'SMS', text: 'Hi Grace, tried your mobile. Happy to explain how the contractor-payment financing works whenever suits.', date: '3 days ago', time: '2:40 PM', state: 'delivered' },
    { dir: 'out', ch: 'WhatsApp', text: 'Also on WhatsApp if that is easier.', date: '3 days ago', time: '2:41 PM', state: 'sent' }
  ],
  'Ibe Fitness Studios': [
    { dir: 'in',  ch: 'SMS', text: 'Got your letter. What would the monthly payment look like on $48K?', date: '4 days ago', time: '8:22 AM' },
    { dir: 'out', ch: 'SMS', text: 'Morning Marcus — it lands well under what the current advance costs you. Free for a call today?', date: '4 days ago', time: '8:30 AM', state: 'read' },
    { dir: 'in',  ch: 'SMS', text: 'After 6pm, studio is packed until then.', date: '4 days ago', time: '8:35 AM' }
  ]
};

/* Attach the seeded threads and give every message the sending identity a
   real bridge would report. */
const UNREAD_COMPANIES = { 'Apex Dynamics': 1, 'Baptiste Roofing & Exteriors': 1, 'Ibe Fitness Studios': 1, 'Castillo Family Dental': 1 };
LEADS.forEach(l => {
  if (!l.messages.length && SEED_THREADS[l.company]) l.messages = SEED_THREADS[l.company];
  l.messages.forEach((m, i) => {
    if (!m.num) m.num = l.mobiles[i % l.mobiles.length];
    if (!m.device) m.device = (m.ch === 'WhatsApp' || i % 2) ? 'Mobile' : 'Desk Line';
    if (m.dir === 'out' && !m.state) m.state = 'delivered';
  });
  l.unread = UNREAD_COMPANIES[l.company] || 0;
  l.drafts = l.drafts || [];
  /* Julian Ortega asked not to be contacted again until Q1 — that is a real
     communication state and it blocks outreach. */
  l.optOut = (l.company === 'Ortega Freight Solutions');
});

/* Lead statuses and the colour each one is shown in — shared by every page. */
const STATUSES = ['New', 'Attempted', 'Engaged', 'Contract', 'Closed', 'Ignore'];
const STATUS_COLOR = {
  New: 'var(--accent-blue)', Attempted: 'var(--accent-amber)', Engaged: 'var(--accent-teal)',
  Contract: 'var(--accent-purple)', Closed: 'var(--accent-teal)', Ignore: 'var(--text-muted)'
};
