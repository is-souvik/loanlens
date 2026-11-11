// LoanLens calculation and risk engine.
// Deterministic finance math + historical replay. No AI anywhere in here.
import { FX, SPOT, REPO, REPO_NOW, findUniversity, findLender, SALARY_BENCHMARKS } from './data.js';

export const GST = 0.18;
const TCS_RATE = 0.05;           // self-funded education remittance above threshold
const TCS_THRESHOLD = 1_000_000; // Rs 10L per financial year (Budget 2025)
const RATE_FLOOR_DROP = 1.5;     // max fall in a floating rate during replay (pp), avoids unrealistic lows
const HISTORY_FROM = '2001-01';  // common start for FX + repo replay

const EFFECTIVE_TAX = { 'United States': 27, 'United Kingdom': 28, Canada: 27, Australia: 27, Germany: 38, Ireland: 33 };

const round = (x, d = 0) => { const f = 10 ** d; return Math.round((x + Number.EPSILON) * f) / f; };
const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))]; };

export const DEFAULT_ASSUMPTIONS = {
  fx_shock_pct: 0,                  // extra rupee fall by end of course, %
  pay_interest_during_study: false, // service interest monthly during moratorium
  tax_regime: 'new',                // 80E only applies under the old regime
  tax_slab_pct: 30,
  expected_salary: null,            // annual gross, in salary_currency
  salary_currency: null,
  effective_tax_pct: null,
  return_to_india: false,
  prepay_monthly_inr: 0,            // extra paid each month once EMIs start, in rupees
  india_salary_inr: null,           // annual gross CTC if returning
};

// ---------- cost of attendance ----------

export function costFlows(plan) {
  const D = plan.duration_months || 24;
  const flows = [];
  for (const it of plan.costs || []) {
    const ccy = (it.currency || plan.currency || 'USD').toUpperCase();
    const a = Number(it.amount) || 0;
    if (!a) continue;
    const push = (m, amt) => flows.push({ month: m, currency: ccy, amount: amt, category: it.category || 'other', label: it.label });
    switch (it.frequency) {
      case 'per_year': for (let y = 0; y * 12 < D; y++) push(y * 12, a * Math.min(1, (D - 12 * y) / 12)); break;
      case 'per_semester': for (let s = 0; s * 6 < D; s++) push(s * 6, a * Math.min(1, (D - 6 * s) / 6)); break;
      case 'per_month': for (let m = 0; m < D; m++) push(m, a); break;
      default: push(Math.min(Number(it.month) || 0, D - 1), a);
    }
  }
  return flows;
}

function baseRate(plan, ccy) {
  if (ccy === 'INR') return 1;
  return Number(plan.fx_rates?.[ccy]) || SPOT[ccy];
}

// Scenario FX: today's rate, rupee falls linearly by shock% over the course
function scenarioRateFn(plan, shockPct) {
  const D = plan.duration_months || 24;
  return (ccy, m) => ccy === 'INR' ? 1 : baseRate(plan, ccy) * (1 + (shockPct / 100) * Math.min(1, m / D));
}

// Historical FX: today's rate times the rupee's actual path from a past start month
function historicalRateFn(plan, startIdx) {
  return (ccy, m) => {
    if (ccy === 'INR') return 1;
    const s = FX[ccy];
    const i0 = startIdx[ccy];
    const i = Math.min(i0 + m, s.length - 1);
    return baseRate(plan, ccy) * (s[i].v / s[i0].v);
  };
}

function coaInr(flows, rateFn) {
  return flows.reduce((t, f) => t + f.amount * rateFn(f.currency, f.month), 0);
}

// ---------- loan schedule ----------

function loanCurrency(o) { return (o.currency || 'INR').toUpperCase(); }

/**
 * Simulate one offer month by month.
 * amountLoanCcy: amount actually drawn (capped at need), in the loan's currency.
 * rateAt(m): annual rate % for month m (lets replay vary floating rates).
 */
function simulateLoan(o, plan, amountLoanCcy, opts) {
  const D = plan.duration_months || 24;
  const M = Number(o.moratorium_months) || D + 6;
  const N = Math.round((Number(o.tenure_years) || 10) * 12);
  const payDuringStudy = opts.payInterest;
  const mode = payDuringStudy ? 'pay' : (o.moratorium_interest || 'simple');
  const concession = payDuringStudy ? Number(o.concession_if_serviced_pct) || 0 : 0;
  const rateAt = opts.rateAt || (() => Number(o.rate_pct));
  const tranches = Math.max(1, Math.ceil(D / 6));
  const tr = amountLoanCcy / tranches;

  // upfront charges (loan currency)
  const procPct = (Number(o.processing_fee_pct) || 0) / 100;
  let processing = procPct * amountLoanCcy + (Number(o.processing_fee_flat) || 0);
  const gstOnFee = o.gst_on_fee !== false && loanCurrency(o) === 'INR';
  const processingGst = gstOnFee ? processing * GST : 0;
  const other = Number(o.other_charges) || 0;
  const insurance = Number(o.insurance_premium) || 0;
  const capitalisedFee = o.fee_capitalised ? processing + processingGst : 0;
  const upfront = (o.fee_capitalised ? 0 : processing + processingGst) + other + (o.insurance_financed ? 0 : insurance);

  let principal = 0, accrued = 0, balance = 0, paidStudy = 0;
  const interestByMonth = [];  // interest actually paid by the borrower, per month (for 80E)
  const balanceByMonth = [];
  // capitalised items are added at month 0
  const cap0 = capitalisedFee + (o.insurance_financed ? insurance : 0);
  for (let m = 0; m < M; m++) {
    if (m % 6 === 0 && m / 6 < tranches) { principal += tr; balance += tr; }
    if (m === 0) { principal += cap0; balance += cap0; }
    const i = Math.max(0, rateAt(m) - concession) / 1200;
    if (mode === 'compound') { balance += balance * i; }
    else if (mode === 'pay') { const x = principal * i; paidStudy += x; interestByMonth.push(x); }
    else { accrued += principal * i; }
    balanceByMonth.push(mode === 'simple' ? principal + accrued : balance);
  }
  // in case moratorium is shorter than disbursement schedule
  for (let k = Math.ceil(M / 6); k < tranches; k++) { principal += tr; balance += tr; }
  let P = mode === 'compound' ? balance : principal + (mode === 'simple' ? accrued : 0);
  const capitalised = P - principal;

  // repayment: EMI recalculated when the rate changes (checked yearly, like bank resets).
  // Optional prepayment: extra amount each month on top of the EMI; tenure shortens.
  const extra = Math.max(0, Number(opts.prepayMonthly) || 0);
  let bal = P, emiFirst = 0, emiMax = 0, paidEmi = 0, emi = 0, lastR = null, monthsToClose = N;
  for (let k = 0; k < N; k++) {
    const r = Math.max(0, rateAt(M + k)) / 1200;
    if (k === 0 || (k % 12 === 0 && r !== lastR)) {
      const n = N - k;
      emi = r === 0 ? bal / n : (bal * r * (1 + r) ** n) / ((1 + r) ** n - 1);
      if (k === 0) emiFirst = emi;
      emiMax = Math.max(emiMax, emi);
      lastR = r;
    }
    const interest = bal * r;
    interestByMonth.push(interest);
    const pay = Math.min(emi + extra, bal + interest);
    bal = bal + interest - pay;
    paidEmi += pay;
    balanceByMonth.push(Math.max(0, bal));
    if (bal <= 0.5) { monthsToClose = k + 1; break; }
  }
  const totalPayback = upfront + paidStudy + paidEmi;
  return {
    mode, M, N, tranches, principal, capitalised, repay_principal: P,
    emi: emiFirst, emi_max: emiMax, interest_paid_during_study: paidStudy,
    monthly_interest_during_study: mode === 'pay' ? (amountLoanCcy * (Number(o.rate_pct) - concession)) / 1200 : 0,
    upfront_fees: upfront, processing_fee: processing, processing_gst: processingGst,
    total_emi_paid: paidEmi, total_payback: totalPayback, months_to_close: monthsToClose, prepay_monthly: extra,
    interestByMonth, balanceByMonth,
  };
}

// India new-regime income tax, FY 2025-26 slabs, with 87A rebate up to Rs 12L and 4% cess
export function indiaTaxNewRegime(gross) {
  const taxable = Math.max(0, gross - 75000);
  const slabs = [[400000, 0], [800000, 0.05], [1200000, 0.10], [1600000, 0.15], [2000000, 0.20], [2400000, 0.25], [Infinity, 0.30]];
  let tax = 0, prev = 0;
  for (const [cap, r] of slabs) { if (taxable > prev) tax += (Math.min(taxable, cap) - prev) * r; prev = cap; }
  if (taxable <= 1200000) tax = 0;
  return tax * 1.04;
}

// ---------- full plan computation ----------

export function computePlan(plan, overrides = {}) {
  const A = { ...DEFAULT_ASSUMPTIONS, ...(plan.assumptions || {}), ...overrides };
  const D = plan.duration_months || 24;
  const flows = costFlows(plan);
  const rate = scenarioRateFn(plan, Number(A.fx_shock_pct) || 0);
  const coa = coaInr(flows, rate);
  const coaToday = coaInr(flows, scenarioRateFn(plan, 0));
  const scholarshipInr = (Number(plan.funds?.scholarship) || 0) * baseRate(plan, (plan.funds?.scholarship_currency || 'INR').toUpperCase());
  const savings = Number(plan.funds?.savings_inr) || 0;
  const need = Math.max(0, coa - scholarshipInr);

  const byCategory = {};
  for (const f of flows) byCategory[f.category] = (byCategory[f.category] || 0) + f.amount * rate(f.currency, f.month);

  const inrCosts = flows.filter((f) => f.currency === 'INR').reduce((t, f) => t + f.amount, 0);
  const offers = (plan.offers || []).map((o) => evaluateOffer(o, plan, A, { coa, need, scholarshipInr, savings, rateFn: rate, inrCosts }));
  const ranked = [...offers].sort((a, b) => a.all_in_inr - b.all_in_inr);
  ranked.forEach((x, i) => { x.rank = i + 1; });

  const uni = findUniversity(plan.university, plan.country);
  return {
    assumptions: A,
    fx_used: Object.fromEntries([...new Set(flows.map((f) => f.currency).concat((plan.offers || []).map(loanCurrency)))].filter((c) => c !== 'INR').map((c) => [c, round(baseRate(plan, c), 2)])),
    coa_inr: round(coa), coa_today_inr: round(coaToday), coa_by_category: Object.fromEntries(Object.entries(byCategory).map(([k, v]) => [k, round(v)])),
    scholarship_inr: round(scholarshipInr), savings_inr: savings,
    offers, best_offer_id: ranked[0]?.id || null,
    university_benchmark: uni ? {
      university: uni.university, program: uni.program, country: uni.country,
      typical_total_inr: round(uni.total_today_inr_lakh * 1e5), bad_case_total_inr: round(uni.total_bad_case_fx_inr_lakh * 1e5),
      tuition_source: uni.tuition_source, living_basis: uni.living_basis,
      vs_plan_pct: round(((coaToday - uni.total_today_inr_lakh * 1e5) / (uni.total_today_inr_lakh * 1e5)) * 100, 1),
    } : null,
  };
}

function evaluateOffer(o, plan, A, ctx) {
  const ccy = loanCurrency(o);
  const fx0 = ccy === 'INR' ? 1 : baseRate(plan, ccy);
  const sanctionInr = (Number(o.amount) || 0) * fx0;
  const marginPct = Number(o.margin_pct) || 0;
  const maxByMargin = ctx.need * (1 - marginPct / 100);
  const drawnInr = Math.min(sanctionInr, maxByMargin);
  const drawn = drawnInr / fx0;
  const prepay = (Number(A.prepay_monthly_inr) || 0) / (ccy === 'INR' ? 1 : baseRate(plan, ccy));
  const sim = simulateLoan(o, plan, drawn, { payInterest: !!A.pay_interest_during_study, prepayMonthly: prepay });

  // repayment-period FX: INR loans 1, foreign loans today's rate (scenario shock held flat after course)
  const repayFx = ccy === 'INR' ? 1 : ctx.rateFn(ccy, plan.duration_months || 24);
  const totalPaybackInr = sim.total_payback * repayFx;
  const familyArranges = Math.max(0, ctx.coa - ctx.scholarshipInr - drawnInr);

  // Section 80E: old regime, Indian lender, 8 years of interest from the first interest payment
  const eligible80E = ccy === 'INR' && !/international/i.test(o.lender_type || '');
  let taxSaving = 0;
  if (A.tax_regime === 'old' && eligible80E) {
    const firstPaid = sim.mode === 'pay' ? 0 : sim.M;
    const months = sim.interestByMonth.slice(sim.mode === 'pay' ? 0 : sim.M, (sim.mode === 'pay' ? 0 : sim.M) + 96);
    void firstPaid;
    taxSaving = months.reduce((t, x) => t + x, 0) * (Number(A.tax_slab_pct) || 30) / 100;
  }

  // TCS on the family's self-funded foreign remittance (cash blocked, adjustable in ITR)
  const foreignShare = ctx.coa > 0 ? (ctx.coa - ctx.inrCosts) / ctx.coa : 1;
  const years = Math.max(1, Math.ceil((plan.duration_months || 24) / 12));
  const perYear = (familyArranges * foreignShare) / years;
  const tcs = Math.max(0, perYear - TCS_THRESHOLD) * TCS_RATE * years;

  const allIn = familyArranges + totalPaybackInr - taxSaving;
  const borrowingCost = totalPaybackInr - drawnInr - taxSaving;

  // affordability
  const salaryCcy = (A.salary_currency || plan.currency || 'USD').toUpperCase();
  let salary = Number(A.expected_salary) || null, salarySource = 'your input';
  if (!salary) {
    const b = SALARY_BENCHMARKS.find((x) => x.country === plan.country);
    if (b) { salary = b.annual; salarySource = b.source; }
  }
  const emiInr = sim.emi * repayFx;
  let afford = null;
  if (A.return_to_india && Number(A.india_salary_inr)) {
    const g = Number(A.india_salary_inr);
    const net = (g - indiaTaxNewRegime(g)) / 12;
    afford = { basis: 'India salary (new regime tax)', gross_annual: g, currency: 'INR', net_monthly_inr: round(net), emi_share_pct: round((emiInr / net) * 100, 1), source: 'your input' };
  } else if (salary) {
    const t = Number(A.effective_tax_pct) || EFFECTIVE_TAX[plan.country] || 28;
    const net = (salary * (1 - t / 100) / 12) * baseRate(plan, salaryCcy);
    afford = { basis: `Salary abroad, ${t}% effective tax`, gross_annual: salary, currency: salaryCcy, net_monthly_inr: round(net), emi_share_pct: round((emiInr / net) * 100, 1), source: salarySource };
  }
  if (afford) afford.band = afford.emi_share_pct <= 20 ? 'comfortable' : afford.emi_share_pct <= 35 ? 'stretched' : 'risky';

  // market benchmark for the quoted rate
  const lb = findLender(o.lender);
  let benchmark = null;
  if (lb) {
    const pos = Number(o.rate_pct) < lb.rate_min ? 'below published range' : (lb.rate_max != null && Number(o.rate_pct) > lb.rate_max) ? 'above published range' : 'within published range';
    benchmark = { lender: lb.lender, type: lb.type, rate_min: lb.rate_min, rate_max: lb.rate_max, processing_fee: lb.processing_fee, margin_money: lb.margin_money, benchmark: lb.benchmark, position: pos, as_of: lb.as_of };
  }

  // balance curve for the chart, in INR at scenario FX, every 3 months
  const curve = sim.balanceByMonth.filter((_, i) => i % 3 === 0).map((b) => round(b * repayFx));

  return {
    id: o.id, lender: o.lender, lender_type: o.lender_type || benchmark?.type || '', currency: ccy,
    rate_pct: Number(o.rate_pct), rate_type: o.rate_type || 'floating',
    sanctioned_inr: round(sanctionInr), drawn_inr: round(drawnInr), margin_pct: marginPct,
    moratorium_months: sim.M, tenure_months: sim.N, months_to_close: sim.months_to_close, moratorium_mode: sim.mode,
    capitalised_interest_inr: round(sim.capitalised * repayFx),
    interest_during_study_inr: round(sim.interest_paid_during_study * repayFx),
    monthly_interest_during_study_inr: round(sim.monthly_interest_during_study * repayFx),
    repay_principal_inr: round(sim.repay_principal * repayFx),
    emi_inr: round(emiInr), emi_currency: ccy, emi_native: round(sim.emi, 2),
    upfront_fees_inr: round(sim.upfront_fees * repayFx), processing_gst_inr: round(sim.processing_gst * repayFx),
    total_payback_inr: round(totalPaybackInr), family_arranges_inr: round(familyArranges),
    tax_80e_saving_inr: round(taxSaving), eligible_80e: eligible80E,
    tcs_blocked_inr: round(tcs),
    all_in_inr: round(allIn), borrowing_cost_inr: round(borrowingCost),
    affordability: afford, market_benchmark: benchmark, balance_curve_q: curve,
    edited: o.edited || {},
  };
}

// ---------- historical replay ----------

function indexOfMonth(series, month) {
  let lo = 0, hi = series.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (series[mid].month < month) lo = mid + 1; else hi = mid; }
  return lo;
}

/**
 * Replays every historical start month: FX path for costs and foreign-currency EMIs,
 * and RBI repo path for repo-linked floating loans, from the same start month.
 */
export function simulateRisk(plan, overrides = {}) {
  const A = { ...DEFAULT_ASSUMPTIONS, ...(plan.assumptions || {}), ...overrides, fx_shock_pct: 0 };
  const D = plan.duration_months || 24;
  const flows = costFlows(plan);
  const ccys = [...new Set(flows.map((f) => f.currency).concat((plan.offers || []).map(loanCurrency)))].filter((c) => c !== 'INR');
  const scholarshipInr = (Number(plan.funds?.scholarship) || 0) * baseRate(plan, (plan.funds?.scholarship_currency || 'INR').toUpperCase());
  const savings = Number(plan.funds?.savings_inr) || 0;
  const repoStart = indexOfMonth(REPO, HISTORY_FROM);

  const maxLen = Math.max(D, ...(plan.offers || []).map((o) => (Number(o.moratorium_months) || D + 6) + Math.round((Number(o.tenure_years) || 10) * 12)));
  const starts = [];
  for (let k = repoStart; k < REPO.length - D; k++) starts.push(REPO[k].month);

  const coaSamples = [], gapSamples = [], cumByMonth = Array.from({ length: D }, () => []);
  const offerSamples = Object.fromEntries((plan.offers || []).map((o) => [o.id, { all_in: [], emi: [], emi_max: [], payback: [] }]));

  for (const startMonth of starts) {
    const startIdx = Object.fromEntries(ccys.map((c) => [c, indexOfMonth(FX[c], startMonth)]));
    if (ccys.some((c) => startIdx[c] + D >= FX[c].length)) continue;
    const rf = historicalRateFn(plan, startIdx);
    const coa = coaInr(flows, rf);
    coaSamples.push(coa);
    let cum = 0;
    const byM = Array(D).fill(0);
    for (const f of flows) byM[f.month] += f.amount * rf(f.currency, f.month);
    for (let m = 0; m < D; m++) { cum += byM[m]; cumByMonth[m].push(cum); }

    const need = Math.max(0, coa - scholarshipInr);
    const rIdx = indexOfMonth(REPO, startMonth);
    for (const o of plan.offers || []) {
      const ccy = loanCurrency(o);
      const fx0 = ccy === 'INR' ? 1 : baseRate(plan, ccy);
      const drawnInr = Math.min((Number(o.amount) || 0) * fx0, need * (1 - (Number(o.margin_pct) || 0) / 100));
      const floating = ccy === 'INR' && (o.rate_type || 'floating') === 'floating' && /repo|ebr|eblr|rllr|rblr|brllr/i.test(o.benchmark || o.market_benchmark || 'repo');
      const base = Number(o.rate_pct);
      const r0 = REPO[rIdx].v;
      const rateAt = floating
        ? (m) => base + Math.max(-RATE_FLOOR_DROP, (REPO[Math.min(rIdx + m, REPO.length - 1)].v - r0))
        : () => base;
      const sim = simulateLoan(o, plan, drawnInr / fx0, { payInterest: !!A.pay_interest_during_study, rateAt, prepayMonthly: (Number(A.prepay_monthly_inr) || 0) / fx0 });
      // foreign-currency loans: convert each EMI at the historical FX path
      let paybackInr;
      if (ccy === 'INR') paybackInr = sim.total_payback;
      else {
        const s = FX[ccy], i0 = startIdx[ccy] ?? indexOfMonth(s, startMonth);
        const fxAt = (m) => fx0 * (s[Math.min(i0 + m, s.length - 1)].v / s[i0].v);
        const studyPaid = sim.interest_paid_during_study * fxAt(Math.floor(sim.M / 2));
        let emiInr = 0;
        for (let k = 0; k < sim.months_to_close; k++) emiInr += (sim.total_emi_paid / sim.months_to_close) * fxAt(sim.M + k);
        paybackInr = sim.upfront_fees * fx0 + studyPaid + emiInr;
      }
      const familyArranges = Math.max(0, coa - scholarshipInr - drawnInr);
      const rec = offerSamples[o.id];
      rec.all_in.push(familyArranges + paybackInr);
      rec.payback.push(paybackInr);
      const fxRepay = ccy === 'INR' ? 1 : fx0 * (FX[ccy][Math.min(startIdx[ccy] + sim.M, FX[ccy].length - 1)].v / FX[ccy][startIdx[ccy]].v);
      rec.emi.push(sim.emi * fxRepay);
      rec.emi_max.push(sim.emi_max * fxRepay);
    }
    gapSamples.push(Math.max(0, need - Math.max(0, ...(plan.offers || []).map((o) => {
      const ccy = loanCurrency(o); const fx0 = ccy === 'INR' ? 1 : baseRate(plan, ccy);
      return Math.min((Number(o.amount) || 0) * fx0, need * (1 - (Number(o.margin_pct) || 0) / 100));
    }), 0)));
  }

  const coaTodayInr = coaInr(flows, scenarioRateFn(plan, 0));
  const band = (arr) => arr.length ? { p10: round(pct(arr, 0.1)), p50: round(pct(arr, 0.5)), p90: round(pct(arr, 0.9)), worst: round(Math.max(...arr)) } : null;
  const offers = (plan.offers || []).map((o) => {
    const s = offerSamples[o.id];
    return { id: o.id, lender: o.lender, all_in: band(s.all_in), emi: band(s.emi), emi_peak_p90: s.emi_max.length ? round(pct(s.emi_max, 0.9)) : null, payback: band(s.payback) };
  });
  const rankedTypical = [...offers].filter((x) => x.all_in).sort((a, b) => a.all_in.p50 - b.all_in.p50);
  return {
    method: `Replayed ${coaSamples.length} historical start months (${starts[0]} onward): actual rupee moves for costs and foreign-currency EMIs, actual RBI repo moves for repo-linked floating loans.`,
    windows: coaSamples.length,
    coa_today_inr: round(coaTodayInr),
    coa: band(coaSamples),
    extra_vs_today: band(coaSamples.map((x) => x - coaTodayInr)),
    family_gap: band(gapSamples),
    prob_gap_exceeds_savings: gapSamples.length ? round(gapSamples.filter((g) => g > savings).length / gapSamples.length, 3) : null,
    prob_cost_3l_over_plan: coaSamples.length ? round(coaSamples.filter((c) => c > coaTodayInr + 300000).length / coaSamples.length, 3) : null,
    recommended_buffer_inr: gapSamples.length ? round(Math.max(0, pct(gapSamples, 0.9) - Math.max(0, pct(gapSamples, 0.5)))) : null,
    fan: { months: cumByMonth.map((_, m) => m + 1), p10: cumByMonth.map((a) => round(pct(a, 0.1))), p50: cumByMonth.map((a) => round(pct(a, 0.5))), p90: cumByMonth.map((a) => round(pct(a, 0.9))) },
    offers,
    best_offer_typical_id: rankedTypical[0]?.id || null,
    repo_now: REPO_NOW,
    max_history_months_used: maxLen,
  };
}
