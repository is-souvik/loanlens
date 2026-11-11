// Domain layer: users, plans, activity, and plan-building helpers shared by the web API and MCP.
import crypto from 'node:crypto';
import { all, one, run } from './db.js';
import { computePlan, simulateRisk, DEFAULT_ASSUMPTIONS } from './engine.js';
import { LENDERS, UNIVERSITIES, SPOT, findUniversity, findLender } from './data.js';

export const uid = (n = 10) => crypto.randomBytes(n).toString('base64url').slice(0, n);
const nowIso = () => new Date().toISOString();

// ---------- passwords ----------
export function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(String(pw), salt, 32).toString('hex');
  return `${salt}:${h}`;
}
export function checkPassword(pw, stored) {
  const [salt, h] = String(stored).split(':');
  if (!salt || !h) return false;
  const x = crypto.scryptSync(String(pw), salt, 32);
  return crypto.timingSafeEqual(x, Buffer.from(h, 'hex'));
}

// ---------- users ----------
export async function createUser({ email, name, password, mcpKey }) {
  const id = uid(12);
  const key = mcpKey || `ll_${uid(24)}`;
  await run('INSERT INTO users (id, email, name, password_hash, mcp_key, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, String(email).toLowerCase().trim(), String(name).trim(), hashPassword(password), key, nowIso()]);
  return getUser(id);
}
export const getUser = (id) => one('SELECT * FROM users WHERE id = $1', [id]);
export const getUserByEmail = (email) => one('SELECT * FROM users WHERE email = $1', [String(email || '').toLowerCase().trim()]);
export const getUserByKey = (key) => one('SELECT * FROM users WHERE mcp_key = $1', [String(key || '')]);
export async function rotateKey(userId) {
  const key = `ll_${uid(24)}`;
  await run('UPDATE users SET mcp_key = $1 WHERE id = $2', [key, userId]);
  return key;
}

// ---------- plans ----------
const LIMIT_BYTES = 300_000;
const parse = (row) => row && { ...JSON.parse(row.data), id: row.id, share_token: row.share_token, updated_at: Number(row.updated_at) };

export async function listPlans(userId) {
  const rows = await all('SELECT * FROM plans WHERE user_id = $1 ORDER BY updated_at DESC', [userId]);
  return rows.map(parse);
}
export async function getPlan(userId, id) {
  return parse(await one('SELECT * FROM plans WHERE id = $1 AND user_id = $2', [id, userId]));
}
export async function getPlanByShare(token) {
  return parse(await one('SELECT * FROM plans WHERE share_token = $1', [token]));
}
export async function insertPlan(userId, plan) {
  const id = plan.id && /^[\w-]{3,40}$/.test(plan.id) ? plan.id : uid(10);
  const token = uid(16);
  const clean = sanitizePlan({ ...plan, id });
  const t = Date.now();
  await run('INSERT INTO plans (id, user_id, data, share_token, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, userId, JSON.stringify(clean), token, nowIso(), t]);
  return getPlan(userId, id);
}
export async function savePlan(userId, id, plan) {
  const clean = sanitizePlan({ ...plan, id });
  const data = JSON.stringify(clean);
  if (data.length > LIMIT_BYTES) throw Object.assign(new Error('This plan is too large to save.'), { status: 413 });
  const t = Date.now();
  await run('UPDATE plans SET data = $1, updated_at = $2 WHERE id = $3 AND user_id = $4', [data, t, id, userId]);
  return t;
}
export async function deletePlan(userId, id) {
  await run('DELETE FROM plans WHERE id = $1 AND user_id = $2', [id, userId]);
  await run('DELETE FROM activity WHERE plan_id = $1', [id]);
}

// ---------- activity ----------
export async function logActivity(planId, actor, kind, text) {
  await run('INSERT INTO activity (id, plan_id, actor, kind, text, at) VALUES ($1, $2, $3, $4, $5, $6)', [uid(12), planId, actor, kind, String(text).slice(0, 300), Date.now()]);
}
export async function getActivity(planId, limit = 40) {
  const rows = await all('SELECT actor, kind, text, at FROM activity WHERE plan_id = $1 ORDER BY at DESC LIMIT ' + Number(limit), [planId]);
  return rows.map((r) => ({ ...r, at: Number(r.at) }));
}
export async function lastActivity(planId, kind) {
  return one('SELECT at FROM activity WHERE plan_id = $1 AND kind = $2 ORDER BY at DESC LIMIT 1', [planId, kind]);
}

// ---------- plan shape ----------
const num = (x, d = null) => (x === '' || x == null || isNaN(Number(x)) ? d : Number(x));
const str = (x, max = 200) => (x == null ? '' : String(x).slice(0, max));
const CCY = new Set(['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'INR']);
const FREQ = new Set(['per_year', 'per_semester', 'per_month', 'one_time']);
const CAT = new Set(['tuition', 'living', 'insurance', 'visa', 'travel', 'deposit', 'other']);
const MOR = new Set(['simple', 'compound', 'pay']);

export function sanitizeCost(c, fallbackCcy = 'USD') {
  return {
    id: str(c.id, 40) || uid(8), label: str(c.label, 80) || 'Cost', category: CAT.has(c.category) ? c.category : 'other',
    amount: Math.max(0, num(c.amount, 0)), currency: CCY.has(String(c.currency).toUpperCase()) ? String(c.currency).toUpperCase() : fallbackCcy,
    frequency: FREQ.has(c.frequency) ? c.frequency : 'one_time', source: str(c.source, 20) || 'manual',
    edited: c.edited && typeof c.edited === 'object' ? Object.fromEntries(Object.keys(c.edited).slice(0, 20).map((k) => [k, true])) : {},
  };
}
export function sanitizeOffer(o) {
  return {
    id: str(o.id, 40) || uid(8), lender: str(o.lender, 80) || 'Lender', lender_type: str(o.lender_type, 60),
    currency: String(o.currency || 'INR').toUpperCase() === 'USD' ? 'USD' : 'INR',
    amount: Math.max(0, num(o.amount, 0)), rate_pct: Math.min(40, Math.max(0, num(o.rate_pct, 0))),
    rate_type: o.rate_type === 'fixed' ? 'fixed' : 'floating', benchmark: str(o.benchmark, 60),
    processing_fee_pct: Math.max(0, num(o.processing_fee_pct, 0)), processing_fee_flat: Math.max(0, num(o.processing_fee_flat, 0)),
    fee_capitalised: !!o.fee_capitalised, other_charges: Math.max(0, num(o.other_charges, 0)),
    insurance_premium: Math.max(0, num(o.insurance_premium, 0)), insurance_financed: !!o.insurance_financed,
    margin_pct: Math.min(100, Math.max(0, num(o.margin_pct, 0))), moratorium_months: Math.round(Math.min(120, Math.max(0, num(o.moratorium_months, 30)))),
    moratorium_interest: MOR.has(o.moratorium_interest) ? o.moratorium_interest : 'simple',
    tenure_years: Math.min(30, Math.max(1, num(o.tenure_years, 10))), concession_if_serviced_pct: Math.max(0, num(o.concession_if_serviced_pct, 0)),
    collateral: str(o.collateral, 120), source_note: str(o.source_note, 120), source: str(o.source, 20) || 'manual',
    edited: o.edited && typeof o.edited === 'object' ? Object.fromEntries(Object.keys(o.edited).slice(0, 20).map((k) => [k, true])) : {},
  };
}
export function sanitizePlan(p) {
  const currency = CCY.has(String(p.currency).toUpperCase()) && p.currency !== 'INR' ? String(p.currency).toUpperCase() : 'USD';
  const A = { ...DEFAULT_ASSUMPTIONS, ...(p.assumptions || {}) };
  return {
    id: p.id, title: str(p.title, 140) || 'New loan plan', student: str(p.student, 80), university: str(p.university, 140),
    country: str(p.country, 60), city: str(p.city, 80), program: str(p.program, 120), intake: str(p.intake, 40),
    duration_months: Math.round(Math.min(60, Math.max(3, num(p.duration_months, 24)))), currency,
    fx_rates: p.fx_rates && typeof p.fx_rates === 'object' ? Object.fromEntries(Object.entries(p.fx_rates).filter(([k, v]) => CCY.has(k) && num(v) > 0).map(([k, v]) => [k, Number(v)])) : undefined,
    costs: (Array.isArray(p.costs) ? p.costs : []).slice(0, 40).map((c) => sanitizeCost(c, currency)),
    offers: (Array.isArray(p.offers) ? p.offers : []).slice(0, 8).map(sanitizeOffer),
    funds: { savings_inr: num(p.funds?.savings_inr, null), scholarship: Math.max(0, num(p.funds?.scholarship, 0)), scholarship_currency: CCY.has(p.funds?.scholarship_currency) ? p.funds.scholarship_currency : currency },
    assumptions: {
      fx_shock_pct: Math.min(60, Math.max(0, num(A.fx_shock_pct, 0))), pay_interest_during_study: !!A.pay_interest_during_study,
      tax_regime: A.tax_regime === 'old' ? 'old' : 'new', tax_slab_pct: num(A.tax_slab_pct, 30),
      expected_salary: num(A.expected_salary, null), salary_currency: A.salary_currency || null, effective_tax_pct: num(A.effective_tax_pct, null),
      return_to_india: !!A.return_to_india, india_salary_inr: num(A.india_salary_inr, null), prepay_monthly_inr: Math.max(0, num(A.prepay_monthly_inr, 0)),
    },
    source: str(p.source, 20) || 'manual',
  };
}

// ---------- helpers for building plans (used by MCP) ----------
export const COUNTRY_DEFAULTS = {
  'United States': { ins: [3000, 'USD', 'Health insurance'], visa: [535, 'USD', 'Visa and SEVIS fees'], flight: 85000 },
  'United Kingdom': { ins: [776, 'GBP', 'Immigration Health Surcharge'], visa: [524, 'GBP', 'Student visa fee'], flight: 70000 },
  Canada: { ins: [900, 'CAD', 'Health insurance'], visa: [150, 'CAD', 'Study permit fee'], flight: 95000 },
  Australia: { ins: [700, 'AUD', 'Student health cover'], visa: [2000, 'AUD', 'Student visa fee'], flight: 80000 },
  Germany: { ins: [1440, 'EUR', 'Health insurance'], visa: [75, 'EUR', 'Visa fee'], flight: 65000 },
  Ireland: { ins: [500, 'EUR', 'Health insurance'], visa: [60, 'EUR', 'Visa fee'], flight: 60000 },
};
export function typicalCosts(u) {
  const d = COUNTRY_DEFAULTS[u.country] || COUNTRY_DEFAULTS['United States'];
  const D = u.duration_months;
  return [
    { label: 'Tuition and fees', category: 'tuition', amount: Math.round(u.tuition_total / (D / 12)), currency: u.tuition_currency, frequency: 'per_year', source: 'data' },
    { label: 'Living costs', category: 'living', amount: Math.round(u.living_per_month), currency: u.living_currency, frequency: 'per_month', source: 'data' },
    { label: d.ins[2], category: 'insurance', amount: d.ins[0], currency: d.ins[1], frequency: 'per_year', source: 'data' },
    { label: d.visa[2], category: 'visa', amount: d.visa[0], currency: d.visa[1], frequency: 'one_time', source: 'data' },
    { label: 'Flights', category: 'travel', amount: d.flight, currency: 'INR', frequency: 'one_time', source: 'data' },
    { label: 'Laptop and setting up', category: 'other', amount: 60000, currency: 'INR', frequency: 'one_time', source: 'data' },
  ].map((c) => sanitizeCost(c, u.living_currency));
}
export function lenderDefaults(name, plan) {
  const l = findLender(name);
  if (!l) return null;
  const pct = (s) => { const m = String(s || '').match(/([\d.]+)\s*%/); return m ? Number(m[1]) : 0; };
  const flat = (s) => { const m = String(s || '').match(/Rs\s*([\d,]+)/i); return m && !/%/.test(s) ? Number(m[1].replace(/,/g, '')) : 0; };
  const intl = /international/i.test(l.type);
  return {
    lender: l.lender, lender_type: l.type, currency: intl ? 'USD' : 'INR', rate_pct: l.rate_min, rate_type: intl ? 'fixed' : 'floating', benchmark: l.benchmark,
    processing_fee_pct: flat(l.processing_fee) ? 0 : pct(l.processing_fee), processing_fee_flat: flat(l.processing_fee), fee_capitalised: /capitali/i.test(l.processing_fee),
    margin_pct: pct(l.margin_money), moratorium_months: (plan?.duration_months || 24) + 6, moratorium_interest: intl ? 'compound' : 'simple',
    tenure_years: /PSU/.test(l.type) ? 15 : intl ? 10 : 12,
  };
}

// Compact numbers for Claude to explain
export function summarize(plan, overrides = {}) {
  if (!plan.costs?.length) return { status: 'needs_costs', message: 'Add the costs of attendance first.' };
  const c = computePlan(plan, overrides);
  const out = {
    degree_cost_inr: c.coa_inr, degree_cost_today_inr: c.coa_today_inr, scholarship_inr: c.scholarship_inr, family_savings_inr: c.savings_inr,
    fx_used: c.fx_used, university_benchmark: c.university_benchmark,
  };
  if (!plan.offers?.length) return { ...out, status: 'needs_offers', message: 'Add at least one loan offer to compare.' };
  const r = simulateRisk(plan, overrides);
  const shocked = (overrides.fx_shock_pct ?? plan.assumptions?.fx_shock_pct ?? 0) > 0;
  const bestId = (shocked ? c.best_offer_id : r.best_offer_typical_id) || c.best_offer_id;
  out.offers = c.offers.map((o) => {
    const ro = r.offers.find((x) => x.id === o.id);
    return {
      offer_id: o.id, lender: o.lender, currency: o.currency, rate_pct: o.rate_pct, rate_type: o.rate_type,
      loan_used_inr: o.drawn_inr, family_pays_upfront_inr: o.family_arranges_inr, interest_added_during_study_inr: o.capitalised_interest_inr,
      interest_paid_during_study_inr: o.interest_during_study_inr, emi_inr: o.emi_inr, emi_native: o.emi_native, repayment_months: o.tenure_months,
      months_to_close: o.months_to_close, upfront_fees_inr: o.upfront_fees_inr, total_repaid_inr: o.total_payback_inr, tax_80e_saving_inr: o.tax_80e_saving_inr,
      tcs_blocked_inr: o.tcs_blocked_inr, total_family_pays_inr: o.all_in_inr,
      history_typical_total_inr: shocked ? null : ro?.all_in?.p50, history_bad_case_total_inr: ro?.all_in?.p90, emi_could_reach_inr: ro?.emi_peak_p90,
      emi_share_of_take_home_pct: o.affordability?.emi_share_pct ?? null, affordability: o.affordability?.band ?? null, published_rate_check: o.market_benchmark?.position ?? null,
    };
  });
  out.recommended_offer_id = bestId;
  out.recommended_lender = c.offers.find((o) => o.id === bestId)?.lender;
  out.cheapest_at_todays_rates = c.offers.find((o) => o.id === c.best_offer_id)?.lender;
  out.risk = {
    method: r.method, chance_cost_3_lakh_over_estimate: r.prob_cost_3l_over_plan, degree_cost_bad_case_inr: r.coa?.p90,
    degree_cost_worst_in_history_inr: r.coa?.worst, suggested_buffer_inr: r.recommended_buffer_inr, chance_gap_exceeds_savings: r.prob_gap_exceeds_savings,
  };
  out.status = 'ready';
  return out;
}

export { LENDERS, UNIVERSITIES, SPOT, findUniversity };
