// The student's journey, stage by stage: live checks from real rules plus a document checklist.
// Pure functions: the server (for Claude) and the browser (for the plan page) run the same code.
import { computePlan, costFlows } from './engine.js';
import { SPOT } from './data.js';

export const STAGES = [
  { id: 'shortlist', title: 'Shortlist', when: 'Applying' },
  { id: 'admit', title: 'Admit and I-20', when: 'Admit in hand' },
  { id: 'offers', title: 'Loan offers', when: 'Comparing lenders' },
  { id: 'sanction', title: 'Sanction and visa', when: 'Before you fly' },
  { id: 'studying', title: 'Studying', when: 'During the course' },
  { id: 'repaying', title: 'Repaying', when: 'After graduation' },
];

const PROOF_FORM = { 'United States': 'I-20', 'United Kingdom': 'CAS', Canada: 'study permit', Australia: 'CoE', Germany: 'visa', Ireland: 'visa' };

// Official proof-of-funds rules for a student visa (as of 2026)
const PROOF_RULE = {
  'United States': 'For the I-20 and the F-1 interview you show liquid funds or a loan sanction that covers the first year’s cost on the I-20.',
  'United Kingdom': 'For the CAS and visa you show the first year’s unpaid fees plus £1,529 a month in London (£1,171 elsewhere) for 9 months, held for 28 days in a row.',
  Canada: 'For the study permit you show the first year’s tuition plus CAD 22,895 for living costs, plus travel.',
  Australia: 'For the visa you show AUD 29,710 for a year’s living costs plus the first year’s tuition and travel.',
  Germany: 'For the visa you deposit €11,904 in a blocked account (€992 released a month), plus any tuition.',
  Ireland: 'For the visa you show access to at least €10,000 for each year, on top of the first year’s fees.',
};

// Work allowed while studying (term time)
const WORK_RULE = {
  'United States': 'F-1 students can work on campus up to 20 hours a week in term. Off-campus work needs CPT or OPT.',
  'United Kingdom': 'Student visa holders on a master’s can work up to 20 hours a week in term and full time in vacations.',
  Canada: 'Study permit holders can work off campus up to 24 hours a week in term.',
  Australia: 'Student visa holders can work up to 48 hours a fortnight in term.',
  Germany: 'Non-EU students can work 140 full days or 280 half days a year.',
  Ireland: 'Students can work 20 hours a week in term and 40 in the holiday periods.',
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
  if (STAGES.some((s) => s.id === plan.stage)) return plan.stage;
  if (!plan.university) return 'shortlist';
  if (!plan.offers?.length) return 'admit';
  return 'offers';
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
      ['kyc', 'PAN and Aadhaar for you and your co-borrower'],
      ['itr', 'Co-borrower’s ITR or Form 16 for 2 years'],
      ['payslips', 'Last 3 payslips and 6 months of bank statements'],
      ['marksheets', 'Marksheets: 10th, 12th and degree'],
      ...(secured ? [['property', 'Property papers and valuation for the secured loan']] : []),
      ['two_lenders', 'Applied to at least 2 lenders (a bank and an NBFC)'],
    ],
    sanction: [
      ['sanction_signed', 'Sanction letter checked and signed'],
      ['fees_paid', 'Processing fee paid'],
      ...(secured ? [['mortgage', 'Property mortgage registered']] : []),
      ['a2_lrs', 'Form A2 and LRS declaration for the fee transfer'],
      [us ? 'ds160' : 'visa_app', us ? 'DS-160 filed and visa interview booked' : 'Visa application filed'],
      ['forex', 'Forex card or international account for living costs'],
    ],
    studying: [
      ['tranche', 'Fee invoice sent to the lender before each semester'],
      ['receipts', 'Fee receipts saved for every disbursement'],
      ['interest_auto', 'Monthly interest payment set up (if your family can)'],
      ['address', 'Lender has your current address and phone'],
    ],
    repaying: [
      ['nach', 'Auto-debit (NACH) set up for the EMI'],
      ['cert_80e', 'Interest certificate downloaded for 80E (old tax regime)'],
      ['prepay_plan', 'Prepayment plan for bonuses and raises'],
      ...(usd ? [['usd_income', 'EMI in dollars matched to dollar income']] : []),
      ['noc', 'No-dues letter and property papers back at closure'],
    ],
  };
}

export const STAGE_PROMPTS = {
  shortlist: ['shortlist', 'countries', 'build-early'],
  admit: ['tick-docs', 'i20', 'proof'],
  offers: ['add-letter', 'negotiate', 'bank-questions'],
  sanction: ['visa-prep', 'hidden', 'parents-hindi'],
  studying: ['tranche', 'pay-interest', 'rupee'],
  repaying: ['prepay', 'cert-80e', 'india'],
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
  const best = comp?.offers.find((o) => o.id === (bestId || comp.best_offer_id)) || null;
  const C = Object.fromEntries(STAGES.map((s) => [s.id, []]));
  const add = (s, tone, title, text) => C[s].push({ tone, title, text });
  const country = plan.country || '';

  // Shortlist: what this degree costs and how big the loan will be
  if (comp) {
    const gap = Math.max(0, comp.coa_today_inr - comp.scholarship_inr - savings);
    add('shortlist', 'info', `This degree costs ${lakh(comp.coa_today_inr)} at today’s rate`, savings ? `After ${lakh(savings)} of savings${comp.scholarship_inr ? ' and the scholarship' : ''}, you would borrow about ${lakh(gap)}.` : 'Add your family’s savings to see how much you’d borrow.');
    const ub = comp.university_benchmark;
    if (ub?.typical_total_inr) add('shortlist', Math.abs(ub.vs_plan_pct) > 15 ? 'warn' : 'info', `Our data puts this programme at ${lakh(ub.typical_total_inr)}`, `${Math.abs(ub.vs_plan_pct) > 15 ? `Your costs are ${Math.abs(ub.vs_plan_pct)}% ${ub.vs_plan_pct > 0 ? 'above' : 'below'} that. Check the lines against your I-20.` : 'Your costs are close to that.'} If the rupee falls the way it has in bad years, it becomes ${lakh(ub.bad_case_total_inr)}.`);
  } else add('shortlist', 'warn', 'Pick a university to see the real cost', 'We have 97 CS master’s programmes in 6 countries with tuition and living costs.');

  // Admit: proof of funds against the visa rule
  if (comp) {
    const fy = firstYearInr(plan);
    const loan = best ? best.sanctioned_inr : 0;
    const have = savings + loan;
    const form = PROOF_FORM[country] || 'visa';
    const short = fy - have;
    if (short > 0) add('admit', loan ? 'bad' : 'warn', `${lakh(short)} short of first-year proof of funds`, `Your ${form} needs about ${lakh(fy)}. Savings${loan ? ' plus the loan' : ''} cover ${lakh(have)}.${loan ? '' : ' A sanction letter usually closes this gap.'}`);
    else add('admit', 'good', `Proof of funds covered with ${lakh(-short)} to spare`, `Your ${form} needs about ${lakh(fy)} for the first year. Savings${loan ? ' plus the loan' : ''} cover ${lakh(have)}.`);
    if (PROOF_RULE[country]) add('admit', 'info', 'The rule', PROOF_RULE[country]);
  }

  // Offers: margin money and the gap between offers
  if (comp?.offers.length) {
    const tight = comp.offers.filter((o) => o.family_arranges_inr > savings);
    if (tight.length) add('offers', 'bad', `${tight.map((o) => o.lender).join(', ')} need${tight.length === 1 ? 's' : ''} more upfront than you have`, tight.map((o) => `${o.lender}: ${lakh(o.family_arranges_inr)} from the family`).join('. ') + `. Savings are ${lakh(savings)}.`);
    else add('offers', 'good', 'Your savings cover every offer’s margin money', `The most any offer asks from you upfront is ${lakh(Math.max(...comp.offers.map((o) => o.family_arranges_inr)))}.`);
    if (comp.offers.length > 1) {
      const all = comp.offers.map((o) => o.all_in_inr);
      add('offers', 'info', `${lakh(Math.max(...all) - Math.min(...all))} between your cheapest and dearest offer`, 'At today’s rates. The rate on the letter is only part of it: fees, interest while studying and the loan currency make up the rest.');
    } else add('offers', 'warn', 'Only one offer so far', 'Families who compare a bank and an NBFC often save lakhs. Add a second offer to see the gap.');
    const above = comp.offers.filter((o) => o.market_benchmark?.position === 'above published range');
    if (above.length) add('offers', 'warn', `${above.map((o) => o.lender).join(', ')} quoted above the published range`, 'Ask the lender to match its own rate card before you sign.');
  } else if (comp) add('offers', 'warn', 'No loan offers yet', 'Add the offers from your sanction letters. We fill missing terms from each lender’s published card.');

  // Sanction: TCS, upfront fees, first transfer
  if (best) {
    add('sanction', best.upfront_fees_inr > 0 ? 'info' : 'good', `${lakh(best.upfront_fees_inr)} due at sanction for ${best.lender}`, best.processing_gst_inr ? `Includes ${lakh(best.processing_gst_inr)} GST on the processing fee.` : 'No GST-bearing fee on this offer.');
    add('sanction', best.tcs_blocked_inr > 0 ? 'warn' : 'good', best.tcs_blocked_inr > 0 ? `${lakh(best.tcs_blocked_inr)} of TCS held on your savings transfers` : 'No TCS on your fee transfers', best.tcs_blocked_inr > 0 ? 'Transfers from a loan carry no TCS. Self-funded transfers above ₹10 lakh a year carry 5%, which you get back when you file your return.' : 'Loan-funded transfers carry no TCS, and your self-funded part stays under ₹10 lakh a year.');
  } else add('sanction', 'warn', 'Choose an offer first', 'We’ll show the fees due at sanction and any TCS on your transfers.');

  // Studying: interest piling up, work rules
  if (best && plan.assumptions?.pay_interest_during_study !== true) {
    let paid = null;
    try { paid = computePlan(plan, { pay_interest_during_study: true }).offers.find((o) => o.id === best.id); } catch { /* skip */ }
    if (best.capitalised_interest_inr > 0) add('studying', 'warn', `${lakh(best.capitalised_interest_inr)} of interest piles up while you study`, paid ? `Paying about ${lakh(paid.monthly_interest_during_study_inr)} a month during the course saves ${lakh(best.all_in_inr - paid.all_in_inr)} in total.` : 'Paying the interest monthly during the course stops it growing.');
  } else if (best) add('studying', 'good', 'You’re paying interest as you go', 'Nothing gets added to the loan while you study.');
  if (WORK_RULE[country]) add('studying', 'info', 'Part-time work', WORK_RULE[country]);

  // Repaying: EMI share, prepayment, 80E, foreclosure
  if (best) {
    const a = best.affordability;
    if (a?.emi_share_pct != null) add('repaying', a.band === 'comfortable' ? 'good' : a.band === 'stretched' ? 'warn' : 'bad', `EMI ${lakh(best.emi_inr)} is ${a.emi_share_pct}% of take-home pay`, a.band === 'comfortable' ? 'Under 20% is comfortable.' : a.band === 'stretched' ? 'Between 20% and 35% is a stretch. Prepaying or a longer tenure helps.' : 'Above 35% is risky. Look at a longer tenure or a cheaper offer.');
    else add('repaying', 'info', `EMI ${lakh(best.emi_inr)} a month`, 'Add your expected salary to see what share of take-home pay this is.');
    try {
      const pre = computePlan(plan, { prepay_monthly_inr: 25000 }).offers.find((o) => o.id === best.id);
      if (pre && pre.months_to_close < best.months_to_close) add('repaying', 'info', `Paying ₹25,000 extra a month saves ${lakh(best.all_in_inr - pre.all_in_inr)}`, `${best.lender} closes in ${(pre.months_to_close / 12).toFixed(1)} years instead of ${(best.months_to_close / 12).toFixed(1)}. Floating-rate loans to individuals can’t charge for prepaying (RBI rule).`);
    } catch { /* skip */ }
    const old = plan.assumptions?.tax_regime === 'old';
    add('repaying', old ? 'good' : 'info', old ? `80E saves about ${lakh(best.tax_80e_saving_inr)} in tax` : 'No 80E benefit under the new tax regime', old ? 'Interest is deductible for 8 years from the first repayment year. Keep each year’s interest certificate.' : 'Section 80E only works under the old regime. If the parent repaying files under the old regime, interest is deductible for 8 years.');
  }

  return {
    current: stage,
    stages: STAGES.map((s, i) => {
      const list = lists[s.id].map(([key, label]) => ({ key, label, done: !!done[key] }));
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
