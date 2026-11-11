// The student's journey, stage by stage: live checks from real rules plus a document checklist.
// Pure functions: the server (for Claude) and the browser (for the plan page) run the same code.
import { computePlan, costFlows } from './engine.js';
import { SPOT } from './data.js';

export const STAGES = [
  { id: 'shortlist', title: 'Shortlist colleges', when: 'Find the right course. Pick the one you’ll join.' },
  { id: 'admit', title: 'Admit and I-20', when: 'Get your admit letter and I-20 sorted with Claude.' },
  { id: 'finance', title: 'Your money', when: 'Tell us what your family can pay and how much you need to borrow.' },
  { id: 'offers', title: 'Loan offers', when: 'Add the loan offers you’ve received.' },
  { id: 'compare', title: 'Compare and choose', when: 'See every offer side by side and pick one.' },
  { id: 'save', title: 'Save your plan', when: 'Check your numbers and save your plan.' },
  { id: 'repay', title: 'Repayment', when: 'When EMIs start, how much, and for how long.' },
  { id: 'sanction', title: 'Sanction and visa', when: 'Sign the loan and get your visa.' },
  { id: 'study', title: 'Ready to study', when: 'The last few things before you fly.' },
];
const OLD_STAGE = { studying: 'study', repaying: 'repay' };

const PROOF_FORM = { 'United States': 'I-20', 'United Kingdom': 'CAS', Canada: 'study permit', Australia: 'CoE', Germany: 'visa', Ireland: 'visa' };
const MONEY = { USD: 'dollar', GBP: 'pound', EUR: 'euro', CAD: 'Canadian dollar', AUD: 'Australian dollar', INR: 'rupee' };

// Official proof-of-funds rules for a student visa (as of 2026), in plain words
const PROOF_RULE = {
  'United States': 'You show bank statements or a loan sanction letter that cover the first year’s cost written on your I-20. You show the same papers at your visa interview.',
  'United Kingdom': 'You show the first year’s fees plus £1,529 a month for living in London (£1,171 outside London) for 9 months. The money must stay in the account for 28 days in a row.',
  Canada: 'You show the first year’s tuition plus CAD 22,895 for living costs, plus your flight.',
  Australia: 'You show AUD 29,710 for a year of living costs plus the first year’s tuition and your flight.',
  Germany: 'You put €11,904 in a blocked account before your visa. Once you’re there, you get €992 a month from it.',
  Ireland: 'You show at least €10,000 a year for living costs, on top of the first year’s fees.',
};

// Work allowed while studying, in plain words
const WORK_RULE = {
  'United States': 'On an F-1 visa you can work on campus up to 20 hours a week during term. Jobs off campus need special permission (CPT or OPT).',
  'United Kingdom': 'You can work up to 20 hours a week during term, and full time in the holidays.',
  Canada: 'You can work off campus up to 24 hours a week during term.',
  Australia: 'You can work up to 48 hours every two weeks during term.',
  Germany: 'You can work 140 full days or 280 half days a year.',
  Ireland: 'You can work 20 hours a week during term and 40 in the holidays.',
};

const lakh = (v) => {
  const n = Math.round(Number(v) || 0);
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
};
const rate = (plan, ccy) => ccy === 'INR' ? 1 : Number(plan.fx_rates?.[ccy]) || SPOT[ccy] || 1;

export function firstYearInr(plan) {
  return costFlows(plan).filter((f) => f.month < 12).reduce((t, f) => t + f.amount * rate(plan, f.currency), 0);
}

export function inferStage(plan) {
  const st = OLD_STAGE[plan.stage] || plan.stage;
  if (STAGES.some((s) => s.id === st)) return st;
  if (!plan.university) return 'shortlist';
  if (!plan.offers?.length) return plan.funds?.savings_inr != null ? 'offers' : 'admit';
  return plan.chosen_offer_id ? 'save' : 'compare';
}

// Checklists. Keys are stable: they are what gets saved in plan.checklist.
function checklists(plan) {
  const us = plan.country === 'United States';
  const secured = (plan.offers || []).some((o) => o.currency === 'INR' && (/sbi|bank of|canara|union|pnb|bob|baroda|indian bank/i.test(o.lender) || /property|collateral|secured/i.test(o.collateral || '')));
  const usd = (plan.offers || []).some((o) => o.currency === 'USD');
  return {
    shortlist: [
      ['passport', 'Passport valid for the whole course plus 6 months'],
      ['tests', 'Test scores sent: GRE and IELTS, TOEFL or PTE'],
      ['transcripts', 'Transcripts and degree certificate'],
      ['sop_lor', 'Statement of purpose and 2 or 3 recommendation letters'],
      ['app_fees', 'Application fees budgeted ($75 to $150 each)'],
    ],
    admit: [
      ['admit_letter', 'Admit letter'],
      ['deposit', 'Enrolment deposit paid'],
      ['proof_docs', 'Proof of funds: bank statements and loan sanction'],
      [us ? 'i20' : 'cas', us ? 'I-20 issued' : `${PROOF_FORM[plan.country] || 'Admission'} document issued`],
      ['scholarship_letter', 'Scholarship or assistantship letter, if any'],
    ],
    offers: [
      ['kyc', 'PAN and Aadhaar for you and your co-borrower (usually a parent)'],
      ['itr', 'Co-borrower’s income tax returns or Form 16 for 2 years'],
      ['payslips', 'Last 3 payslips and 6 months of bank statements'],
      ['marksheets', 'Marksheets: 10th, 12th and degree'],
      ...(secured ? [['property', 'Property papers and valuation for the secured loan']] : []),
      ['two_lenders', 'Applied to at least 2 lenders (a bank and a private lender)'],
    ],
    sanction: [
      ['sanction_signed', 'Sanction letter checked and signed'],
      ['fees_paid', 'Processing fee paid'],
      ...(secured ? [['mortgage', 'Property mortgage registered']] : []),
      ['a2_lrs', 'Form A2 signed at the bank for sending fees abroad'],
      [us ? 'ds160' : 'visa_app', us ? 'DS-160 filed and visa interview booked' : 'Visa application filed'],
      ['forex', 'Forex card or international account for living costs'],
    ],
    study: [
      ['tranche', 'Fee invoice sent to the lender before each semester'],
      ['receipts', 'Fee receipts saved for every disbursement'],
      ['interest_auto', 'Monthly interest payment set up (if your family can)'],
      ['address', 'Lender has your current address and phone'],
    ],
    repay: [
      ['nach', 'Auto-debit set up so the EMI is never missed'],
      ['cert_80e', 'Interest certificate downloaded for 80E (old tax regime)'],
      ['prepay_plan', 'Prepayment plan for bonuses and raises'],
      ...(usd ? [['usd_income', 'EMI in dollars matched to dollar income']] : []),
      ['noc', 'No-dues letter and property papers back at closure'],
    ],
  };
}

export const STAGE_PROMPTS = {
  shortlist: ['course-compare', 'course-deep', 'course-pick'],
  admit: ['tick-docs', 'i20', 'proof'],
  finance: ['scholarship', 'missing', 'countries'],
  offers: ['add-letter', 'hidden', 'bank-questions'],
  compare: ['explain-loan', 'negotiate', 'fixed-floating'],
  save: ['parents-hindi', 'whatsapp', 'worst'],
  repay: ['prepay', 'india', 'cert-80e'],
  sanction: ['visa-prep', 'bank-visit', 'revised'],
  study: ['tranche', 'pay-interest', 'rupee'],
};

// One function for everything the journey shows. bestId: the offer the plan page recommends.
export function journey(plan, bestId) {
  const stage = inferStage(plan);
  const idx = STAGES.findIndex((s) => s.id === stage);
  const done = plan.checklist || {};
  const lists = checklists(plan);
  const savings = Number(plan.funds?.savings_inr) || 0;
  let comp = null;
  try { if (plan.costs?.length) comp = computePlan(plan); } catch { /* incomplete plan */ }
  const best = comp ? (comp.offers.find((o) => o.id === plan.chosen_offer_id) || comp.offers.find((o) => o.id === (bestId || comp.best_offer_id)) || null) : null;
  const C = Object.fromEntries(STAGES.map((s) => [s.id, []]));
  const add = (s, tone, title, text) => C[s].push({ tone, title, text });
  const country = plan.country || '';

  const name = (o) => o.lender.replace(/ Global Ed-Vantage| Finance$/, '');
  const years = Math.round((Number(plan.duration_months) || 24) / 12);
  const money = MONEY[plan.currency] || 'dollar';
  const form = PROOF_FORM[country] || 'visa';

  // Your money: what the degree costs and what you need to borrow.
  if (comp) {
    const ub = comp.university_benchmark;
    add('finance', 'info', `Your degree will cost about ${lakh(comp.coa_today_inr)}`, `That’s tuition, rent, food, insurance and flights for ${years === 1 ? 'the whole year' : `all ${years} years`}, at today’s ${money} rate.`);
    if (ub?.typical_total_inr && ub.bad_case_total_inr > ub.typical_total_inr) {
      const bad = comp.coa_today_inr * (ub.bad_case_total_inr / ub.typical_total_inr);
      add('finance', 'warn', `It could go up to ${lakh(bad)}`, `The rupee usually gets weaker over time, so the same fees cost more in rupees. Keep about ${lakh(bad - comp.coa_today_inr)} aside for this.`);
    }
    if (ub?.typical_total_inr && Math.abs(ub.vs_plan_pct) > 15) add('finance', 'warn', `Your costs look ${ub.vs_plan_pct > 0 ? 'higher' : 'lower'} than usual`, `Students here usually spend about ${lakh(ub.typical_total_inr)}. Check your numbers against the university’s cost sheet.`);
    const need = Math.max(0, comp.coa_today_inr - comp.scholarship_inr - savings);
    if (plan.funds?.savings_inr != null) add('finance', 'info', `You’ll need to borrow about ${lakh(need)}`, `That’s the cost of the degree minus your savings${comp.scholarship_inr ? ' and scholarship' : ''}. You can change this below.`);
  }
  add('shortlist', 'info', 'Applying costs money too', 'Most universities charge $75 to $150 per application. Most students apply to 6 to 8.');

  // Admit: can you show enough money for the I-20 or visa?
  if (comp) {
    const fy = firstYearInr(plan);
    const loan = best ? best.sanctioned_inr : 0;
    const have = savings + loan;
    const short = fy - have;
    if (!loan && plan.funds?.savings_inr == null) add('admit', 'info', `You need to show ${lakh(fy)} for your ${form}`, 'The university wants proof that you can pay for the first year. This can be savings, a loan sanction letter, or both. You’ll add your savings in the next step.');
    else if (short > 0 && !loan) add('admit', 'warn', `You need to show ${lakh(fy)} for your ${form}`, `The university wants proof that you can pay for the first year. Your savings cover ${lakh(savings)}. A loan sanction letter can cover the other ${lakh(short)}.`);
    else if (short > 0) add('admit', 'bad', `You’re ${lakh(short)} short for your ${form}`, `You need to show ${lakh(fy)} for the first year. Your savings and loan together cover ${lakh(have)}.`);
    else add('admit', 'good', `You have enough to get your ${form}`, `You need to show ${lakh(fy)} for the first year. Your savings${loan ? ' and loan' : ''} cover ${lakh(have)}.`);
    if (PROOF_RULE[country]) add('admit', 'info', `How this works in ${country === 'United States' ? 'the US' : country === 'United Kingdom' ? 'the UK' : country}`, PROOF_RULE[country]);
  }

  // Offers: what each bank asks from you, and how far apart they are
  if (comp?.offers.length) {
    const tight = comp.offers.filter((o) => o.family_arranges_inr > savings).slice(0, 2);
    for (const o of tight) add('offers', 'bad', `${name(o)} wants ${lakh(o.family_arranges_inr)} from you upfront`, `Banks pay only part of the cost and your family pays the rest yourself (this is called margin money). You have ${lakh(savings)} saved, so you’re ${lakh(o.family_arranges_inr - savings)} short.`);
    if (!tight.length) add('offers', 'good', 'Your savings cover what every bank asks upfront', `The most any offer asks your family to pay yourself is ${lakh(Math.max(...comp.offers.map((o) => o.family_arranges_inr)))}.`);
    if (comp.offers.length > 1) {
      const all = comp.offers.map((o) => o.all_in_inr);
      add('offers', 'info', 'Look beyond the interest rate', 'What you pay back also depends on fees, interest that builds up while you study, and whether the loan is in rupees or dollars. The comparison below adds all of it up.');
    } else add('offers', 'warn', 'You have only one offer', 'Get at least one more, from a bank and from a private lender. Families often save lakhs by comparing.');
    for (const o of comp.offers.filter((x) => x.market_benchmark?.position === 'above published range').slice(0, 1)) add('offers', 'warn', `${name(o)}’s rate is higher than it advertises`, 'Ask them to match their own published rate before you sign.');
  } else if (comp) add('offers', 'warn', 'No loan offers yet', 'Add each offer from the bank’s letter, or ask Claude to read the letters for you.');

  // Sanction: what you pay when you sign, and how to send money
  if (best) {
    if (best.upfront_fees_inr > 0) add('sanction', 'info', `${name(best)} will charge ${lakh(best.upfront_fees_inr)} when you sign`, `That’s the processing fee${best.processing_gst_inr ? `, including ${lakh(best.processing_gst_inr)} GST` : ''}. You pay it before the loan is released.`);
    else add('sanction', 'good', `${name(best)} charges nothing to sign`, 'No processing fee on this offer.');
    if (best.tcs_blocked_inr > 0) add('sanction', 'warn', 'Send fees from the loan, not from savings', `When your family sends more than ₹10 lakh a year abroad from its own money, the bank holds back 5% as tax (about ${lakh(best.tcs_blocked_inr)} for you). You get it back when you file your tax return. Money sent from an education loan has no such cut.`);
    else add('sanction', 'good', 'No tax gets held back on your fee payments', 'Money sent from an education loan has no tax cut, and what you send from savings stays under ₹10 lakh a year.');
  } else add('sanction', 'warn', 'Pick a loan first', 'We’ll show what you pay when you sign and the best way to send money abroad.');

  // Studying: interest grows while you study
  if (best && plan.assumptions?.pay_interest_during_study !== true) {
    let paid = null;
    try { paid = computePlan(plan, { pay_interest_during_study: true }).offers.find((o) => o.id === best.id); } catch { /* skip */ }
    if (best.capitalised_interest_inr > 0) add('study', 'warn', 'Interest keeps adding up while you study', `You don’t pay EMIs during the course, but about ${lakh(best.capitalised_interest_inr)} of interest gets added to your loan.${paid ? ` If your family pays ${lakh(paid.monthly_interest_during_study_inr)} a month while you study, you save ${lakh(best.all_in_inr - paid.all_in_inr)} overall.` : ''}`);
  } else if (best) add('study', 'good', 'You’re paying interest as you go', 'Your loan won’t grow while you study.');
  if (WORK_RULE[country]) add('study', 'info', 'How much you can work', WORK_RULE[country]);

  // Repaying: EMI, paying early, tax
  if (best) {
    const a = best.affordability;
    const emi = `₹${Math.round(best.emi_inr).toLocaleString('en-IN')}`;
    if (a?.emi_share_pct != null) add('repay', a.band === 'comfortable' ? 'good' : a.band === 'stretched' ? 'warn' : 'bad', `Your EMI will be ${emi} a month`, a.band === 'comfortable' ? `That’s ${Math.round(a.emi_share_pct)}% of your take-home salary, which is comfortable.` : a.band === 'stretched' ? `That’s ${Math.round(a.emi_share_pct)}% of your take-home salary. Manageable, but tight. Paying a little extra early helps.` : `That’s ${Math.round(a.emi_share_pct)}% of your take-home salary, which is a lot. Look at a longer loan or a cheaper offer.`);
    else add('repay', 'info', `Your EMI will be ${emi} a month`, 'Add your expected salary to see if this is comfortable.');
    try {
      const pre = computePlan(plan, { prepay_monthly_inr: 25000 }).offers.find((o) => o.id === best.id);
      if (pre && pre.months_to_close < best.months_to_close) add('repay', 'info', `Pay ₹25,000 extra a month and save ${lakh(best.all_in_inr - pre.all_in_inr)}`, `You’d finish the loan in ${(pre.months_to_close / 12).toFixed(1)} years instead of ${(best.months_to_close / 12).toFixed(1)}. Banks can’t charge you for paying early on a floating-rate loan.`);
    } catch { /* skip */ }
    if (plan.assumptions?.tax_regime === 'old') add('repay', 'good', `Your family saves about ${lakh(best.tax_80e_saving_inr)} in tax`, 'Under the old tax regime, the interest you pay is tax-free for 8 years (Section 80E). Ask the bank for an interest certificate every year.');
    else add('repay', 'info', 'Tax saving works only in the old tax regime', 'Whoever repays can claim the interest under Section 80E for 8 years, but only under the old tax regime. Compare both before choosing.');
  }

  return {
    current: stage,
    stages: STAGES.map((s, i) => {
      const list = (lists[s.id] || []).map(([key, label]) => ({ key, label, done: !!done[key] }));
      return { ...s, status: i < idx ? 'done' : i === idx ? 'now' : 'next', checks: C[s.id], checklist: list, ticked: list.filter((x) => x.done).length, prompts: STAGE_PROMPTS[s.id] };
    }),
  };
}

// Compact version for Claude
export function journeySummary(plan, bestId) {
  const j = journey(plan, bestId);
  const s = j.stages.find((x) => x.id === j.current);
  return {
    stage: j.current,
    stage_checks: s.checks.map((c) => `${c.tone}: ${c.title}. ${c.text}`),
    checklist: Object.fromEntries(j.stages.map((x) => [x.id, x.checklist.map((c) => `${c.done ? '[x]' : '[ ]'} ${c.key}: ${c.label}`)])),
  };
}
