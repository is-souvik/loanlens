// LoanLens MCP server: the tools a customer's own Claude uses to build and query plans.
// No AI runs here. Claude reads documents and writes; these tools store, compute and share.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import * as S from './store.js';
import { computePlan, simulateRisk } from './engine.js';
import { journeySummary, STAGES } from './journey.js';
import { fxStats, findLender, searchUniversities, LENDERS, FX_AS_OF, REPO_NOW, SPOT } from './data.js';

const INSTRUCTIONS = `LoanLens compares study-abroad education loan offers for Indian families on the total amount the family pays, tested against 25 years of real rupee and RBI rate history. There is no AI inside LoanLens: you (Claude) read the student's documents and explain; LoanLens stores the plan, does the math and shares a live page with the family.

Typical flow: create_plan (use_typical_costs if there's no I-20 yet) -> add_loan_offer once per sanction letter, copying numbers exactly -> get_plan or compare_offers to answer. Always give the user the plan_url so they can open and edit the plan. Amounts in INR are rupees (1 lakh = 100,000; 1 crore = 10,000,000). get_plan also returns journey: the student's stage (shortlist, admit, offers, sanction, studying, repaying), live checks for that stage (proof of funds, margin money, TCS, interest piling up, EMI share) and a document checklist; tick items with update_plan mark_done when the user's documents show them. Never invent loan terms: if a number is missing from a letter, leave it out and say so; LoanLens fills it from the lender's published rate card and marks it.`;

const ok = (obj) => ({ content: [{ type: 'text', text: JSON.stringify(obj, null, 1) }] });
const fail = (msg) => ({ content: [{ type: 'text', text: msg }], isError: true });

const costSchema = z.object({
  label: z.string().describe('What the cost is for, e.g. "Tuition and fees"'),
  amount: z.number().nonnegative().describe('Amount per period in the given currency'),
  currency: z.enum(['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'INR']),
  frequency: z.enum(['per_year', 'per_semester', 'per_month', 'one_time']),
  category: z.enum(['tuition', 'living', 'insurance', 'visa', 'travel', 'deposit', 'other']).optional(),
});

const offerFields = {
  lender: z.string().describe('Lender name as on the letter, e.g. "SBI Global Ed-Vantage", "HDFC Credila", "Prodigy Finance"'),
  currency: z.enum(['INR', 'USD']).optional().describe('Loan currency. INR for Indian lenders, USD for Prodigy, MPOWER, Leap'),
  amount: z.number().positive().optional().describe('Sanctioned amount in the loan currency (rupees, not lakhs)'),
  rate_pct: z.number().min(0).max(40).optional().describe('Annual interest rate, %'),
  rate_type: z.enum(['floating', 'fixed']).optional(),
  processing_fee_pct: z.number().min(0).max(10).optional().describe('Processing fee as % of loan (GST is added automatically)'),
  processing_fee_flat: z.number().min(0).optional().describe('Flat fees in rupees: processing, legal, valuation'),
  margin_pct: z.number().min(0).max(100).optional().describe('Margin money %: share of cost the family must fund'),
  moratorium_months: z.number().int().min(0).max(120).optional().describe('Months from first disbursement to first EMI (course + grace)'),
  moratorium_interest: z.enum(['simple', 'compound', 'pay']).optional().describe('During the moratorium, interest is added (simple or compounding) or paid monthly'),
  tenure_years: z.number().min(1).max(30).optional().describe('Repayment period after the moratorium, years'),
  concession_if_serviced_pct: z.number().min(0).max(3).optional().describe('Rate cut (percentage points) if interest is paid during the course, e.g. SBI 0.5'),
  collateral: z.string().optional(),
  source_note: z.string().optional().describe('Where the numbers came from, e.g. "Sanction letter p.2"'),
};

export function buildServer(user, baseUrl) {
  const server = new McpServer({ name: 'loanlens', version: '1.0.0' }, { instructions: INSTRUCTIONS });
  const planUrl = (p) => `${baseUrl}/#/plan/${p.id}`;
  const shareUrl = (p) => `${baseUrl}/p/${p.share_token}`;
  const findPlan = async (id) => {
    if (id) return S.getPlan(user.id, id);
    const list = await S.listPlans(user.id);
    return list[0] || null;
  };
  const save = async (p, note) => { await S.savePlan(user.id, p.id, p); if (note) await S.logActivity(p.id, 'Claude', 'c', note); };
  const view = (p) => ({ plan_id: p.id, title: p.title, plan_url: planUrl(p), family_share_url: shareUrl(p) });
  const journeyOf = (p) => { try { return journeySummary(p, S.summarize(p).recommended_offer_id); } catch { return null; } };
  const matchOffer = (p, idOrName) => p.offers.find((o) => o.id === idOrName) || p.offers.find((o) => o.lender.toLowerCase().includes(String(idOrName || '').toLowerCase()));

  server.registerTool('list_plans', {
    title: 'List plans', description: 'List the user’s LoanLens plans (one per degree) with links.',
    inputSchema: {}, annotations: { readOnlyHint: true },
  }, async () => {
    const list = await S.listPlans(user.id);
    return ok({ plans: list.map((p) => ({ ...view(p), university: p.university, offers: p.offers.map((o) => o.lender), updated_at: new Date(p.updated_at).toISOString() })) });
  });

  server.registerTool('get_plan', {
    title: 'Get plan with results', description: 'Read a plan: inputs plus every number LoanLens calculated (total cost, each offer’s EMI and total family cost, recommended offer, rupee-risk summary) and the family share link. Omit plan_id for the most recent plan.',
    inputSchema: { plan_id: z.string().optional() }, annotations: { readOnlyHint: true },
  }, async ({ plan_id }) => {
    const p = await findPlan(plan_id);
    if (!p) return fail('No plan found. Create one with create_plan.');
    return ok({ ...view(p), inputs: { university: p.university, country: p.country, program: p.program, intake: p.intake, duration_months: p.duration_months, currency: p.currency, costs: p.costs, funds: p.funds, assumptions: p.assumptions, offers: p.offers }, results: S.summarize(p), journey: journeyOf(p) });
  });

  server.registerTool('create_plan', {
    title: 'Create a plan', description: 'Start a plan for one degree. Pass the costs from the I-20 or admit letter, or set use_typical_costs to fill them from LoanLens’s data on 97 CS master’s programmes. Returns the plan_url to share with the user.',
    inputSchema: {
      student: z.string().optional(), university: z.string(), program: z.string().optional(), country: z.string().optional(), city: z.string().optional(),
      intake: z.string().optional().describe('e.g. "Fall 2027"'), duration_months: z.number().int().min(3).max(60).optional(),
      currency: z.enum(['USD', 'GBP', 'EUR', 'CAD', 'AUD']).optional().describe('Main currency of the study country'),
      costs: z.array(costSchema).optional(), use_typical_costs: z.boolean().optional(),
      savings_inr: z.number().min(0).optional().describe('Family savings available for this degree, rupees'),
      scholarship: z.number().min(0).optional(), scholarship_currency: z.enum(['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'INR']).optional(),
      expected_salary: z.number().min(0).optional().describe('Expected annual salary abroad, in the study currency'),
      india_salary_inr: z.number().min(0).optional(),
    },
  }, async (a) => {
    const u = S.findUniversity(a.university, a.country);
    let costs = (a.costs || []).map((c) => ({ ...c, source: 'claude' }));
    let note = '';
    if (!costs.length && (a.use_typical_costs || !a.costs)) {
      if (u) { costs = S.typicalCosts(u); note = `Costs filled from LoanLens data for ${u.university}; replace them with the I-20 numbers when available.`; }
      else note = 'University not in LoanLens data; add costs with update_plan.';
    }
    const D = a.duration_months || u?.duration_months || 24;
    const plan = {
      title: `${a.program || u?.program || 'Master’s'}, ${(u?.university || a.university).replace(/^The /, '')}`,
      student: a.student || user.name, university: u?.university || a.university, program: a.program || u?.program || '', country: a.country || u?.country || '', city: a.city || u?.city || '',
      intake: a.intake || '', duration_months: D, currency: a.currency || u?.living_currency || 'USD', costs,
      funds: { savings_inr: a.savings_inr ?? null, scholarship: a.scholarship || 0, scholarship_currency: a.scholarship_currency || a.currency || u?.living_currency || 'USD' },
      assumptions: { expected_salary: a.expected_salary ?? null, india_salary_inr: a.india_salary_inr ?? null }, offers: [], source: 'claude',
    };
    const p = await S.insertPlan(user.id, plan);
    await S.logActivity(p.id, 'Claude', 'c', `Created the plan for ${p.university}${costs.length ? ` with ${costs.length} cost lines` : ''}`);
    return ok({ ...view(p), note, results: S.summarize(p) });
  });

  server.registerTool('add_loan_offer', {
    title: 'Add a loan offer', description: 'Add one lender’s offer to a plan, copying the numbers exactly from the sanction letter. Any field you leave out is filled from the lender’s published rate card (and reported back as filled_from_rate_card).',
    inputSchema: { plan_id: z.string().optional(), ...offerFields },
  }, async (a) => {
    const p = await findPlan(a.plan_id);
    if (!p) return fail('No plan found. Create one with create_plan first.');
    if (p.offers.length >= 8) return fail('This plan already has 8 offers. Remove one first.');
    const defs = S.lenderDefaults(a.lender, p) || { lender: a.lender, currency: 'INR', rate_type: 'floating', moratorium_months: p.duration_months + 6, moratorium_interest: 'simple', tenure_years: 10 };
    const given = Object.fromEntries(Object.entries(a).filter(([k, v]) => k !== 'plan_id' && v !== undefined));
    const filled = Object.keys(defs).filter((k) => !(k in given) && !['lender', 'lender_type', 'benchmark'].includes(k));
    if (given.amount == null) {
      try { const c = computePlan(p); const need = Math.max(0, c.coa_today_inr - c.scholarship_inr - (p.funds.savings_inr || 0)); given.amount = (given.currency || defs.currency) === 'USD' ? Math.round(need / SPOT.USD / 1000) * 1000 : Math.round(need / 100000) * 100000; filled.push('amount'); } catch { /* no costs */ }
    }
    const offer = S.sanitizeOffer({ ...defs, ...given, lender: a.lender, lender_type: defs.lender_type || '', source: 'claude', source_note: a.source_note || (filled.length ? 'Some terms from published rate card' : '') });
    p.offers.push(offer);
    await save(p, `Added offer: ${offer.lender} (${offer.currency === 'USD' ? `USD ${offer.amount.toLocaleString('en-IN')}` : `₹${offer.amount.toLocaleString('en-IN')}`} at ${offer.rate_pct}%)`);
    return ok({ ...view(p), offer_id: offer.id, filled_from_rate_card: filled, results: S.summarize(p) });
  });

  server.registerTool('update_plan', {
    title: 'Update a plan', description: 'Change plan details: costs (replace all, or add/remove lines), savings, scholarship, salary, tax regime, exchange rate, course length, the student\'s current stage, and the document checklist.',
    inputSchema: {
      plan_id: z.string().optional(), student: z.string().optional(), university: z.string().optional(), program: z.string().optional(), intake: z.string().optional(),
      duration_months: z.number().int().min(3).max(60).optional(), replace_costs: z.array(costSchema).optional(), add_costs: z.array(costSchema).optional(),
      remove_cost_labels: z.array(z.string()).optional(), savings_inr: z.number().min(0).optional(), scholarship: z.number().min(0).optional(),
      scholarship_currency: z.enum(['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'INR']).optional(), expected_salary: z.number().min(0).optional(),
      india_salary_inr: z.number().min(0).optional(), tax_regime: z.enum(['new', 'old']).optional(),
      fx_rate: z.number().positive().optional().describe('Rupees per unit of the plan currency, e.g. 95.5 for USD'),
      stage: z.enum(STAGES.map((x) => x.id)).optional().describe('Where the student is now: shortlist, admit, offers, sanction, studying, repaying'),
      mark_done: z.array(z.string()).optional().describe('Checklist keys to tick, from get_plan journey.checklist, e.g. ["admit_letter","i20","kyc"]. Tick only what the user\'s documents show.'),
      mark_not_done: z.array(z.string()).optional(),
    },
  }, async (a) => {
    const p = await findPlan(a.plan_id);
    if (!p) return fail('No plan found.');
    const changed = [];
    for (const k of ['student', 'university', 'program', 'intake', 'duration_months']) if (a[k] !== undefined) { p[k] = a[k]; changed.push(k.replace('_', ' ')); }
    if (a.replace_costs) { p.costs = a.replace_costs.map((c) => ({ ...c, source: 'claude' })); changed.push('all costs'); }
    if (a.add_costs) { p.costs.push(...a.add_costs.map((c) => ({ ...c, source: 'claude' }))); changed.push(`${a.add_costs.length} new cost line(s)`); }
    if (a.remove_cost_labels) { const before = p.costs.length; p.costs = p.costs.filter((c) => !a.remove_cost_labels.some((l) => c.label.toLowerCase() === l.toLowerCase())); changed.push(`removed ${before - p.costs.length} cost line(s)`); }
    if (a.savings_inr !== undefined) { p.funds.savings_inr = a.savings_inr; changed.push('savings'); }
    if (a.scholarship !== undefined) { p.funds.scholarship = a.scholarship; changed.push('scholarship'); }
    if (a.scholarship_currency) p.funds.scholarship_currency = a.scholarship_currency;
    for (const k of ['expected_salary', 'india_salary_inr', 'tax_regime']) if (a[k] !== undefined) { p.assumptions[k] = a[k]; changed.push(k.replace(/_/g, ' ')); }
    if (a.fx_rate) { p.fx_rates = { ...(p.fx_rates || {}), [p.currency]: a.fx_rate }; changed.push('exchange rate'); }
    if (a.stage) { p.stage = a.stage; changed.push(`stage to ${STAGES.find((x) => x.id === a.stage).title}`); }
    if (a.mark_done?.length || a.mark_not_done?.length) {
      p.checklist = { ...(p.checklist || {}) };
      for (const k of a.mark_done || []) p.checklist[k] = true;
      for (const k of a.mark_not_done || []) delete p.checklist[k];
      changed.push(`checklist (${(a.mark_done || []).length} ticked${a.mark_not_done?.length ? `, ${a.mark_not_done.length} unticked` : ''})`);
    }
    if (a.university || a.program) p.title = `${p.program || 'Master’s'}, ${p.university.replace(/^The /, '')}`;
    await save(p, `Updated ${changed.join(', ') || 'the plan'}`);
    return ok({ ...view(p), changed, results: S.summarize(p), journey: journeyOf(p) });
  });

  server.registerTool('update_offer', {
    title: 'Update a loan offer', description: 'Correct or change an existing offer. Identify it by offer_id or lender name.',
    inputSchema: { plan_id: z.string().optional(), offer: z.string().describe('offer_id or lender name'), ...Object.fromEntries(Object.entries(offerFields).map(([k, v]) => [k, v.optional()])) },
  }, async (a) => {
    const p = await findPlan(a.plan_id);
    if (!p) return fail('No plan found.');
    const o = matchOffer(p, a.offer);
    if (!o) return fail(`No offer matching "${a.offer}". Offers: ${p.offers.map((x) => x.lender).join(', ') || 'none'}`);
    const changes = Object.entries(a).filter(([k, v]) => !['plan_id', 'offer'].includes(k) && v !== undefined);
    for (const [k, v] of changes) o[k] = v;
    await save(p, `Changed ${o.lender}: ${changes.map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`).join(', ')}`);
    return ok({ ...view(p), offer_id: o.id, results: S.summarize(p) });
  });

  server.registerTool('remove_offer', {
    title: 'Remove a loan offer', description: 'Remove an offer from a plan by offer_id or lender name.',
    inputSchema: { plan_id: z.string().optional(), offer: z.string() }, annotations: { destructiveHint: true },
  }, async (a) => {
    const p = await findPlan(a.plan_id);
    if (!p) return fail('No plan found.');
    const o = matchOffer(p, a.offer);
    if (!o) return fail(`No offer matching "${a.offer}".`);
    p.offers = p.offers.filter((x) => x.id !== o.id);
    await save(p, `Removed offer: ${o.lender}`);
    return ok({ ...view(p), removed: o.lender, results: S.summarize(p) });
  });

  server.registerTool('compare_offers', {
    title: 'Compare offers under a what-if', description: 'Rank the plan’s offers on total family cost under a scenario, without saving it: rupee falls by X% by the end of the course, paying interest while studying, prepaying each month, tax regime, returning to India on an Indian salary, or a different repayment period.',
    inputSchema: {
      plan_id: z.string().optional(), rupee_fall_pct: z.number().min(0).max(60).optional(), pay_interest_during_study: z.boolean().optional(),
      prepay_monthly_inr: z.number().min(0).optional(), tax_regime: z.enum(['new', 'old']).optional(), return_to_india: z.boolean().optional(),
      india_salary_inr: z.number().min(0).optional(), tenure_years: z.number().min(1).max(30).optional().describe('Override repayment years for every offer'),
    }, annotations: { readOnlyHint: true },
  }, async (a) => {
    const p0 = await findPlan(a.plan_id);
    if (!p0) return fail('No plan found.');
    if (!p0.offers.length) return fail('Add at least one offer first.');
    const p = JSON.parse(JSON.stringify(p0));
    if (a.tenure_years) p.offers.forEach((o) => { o.tenure_years = a.tenure_years; });
    const ov = {};
    if (a.rupee_fall_pct !== undefined) ov.fx_shock_pct = a.rupee_fall_pct;
    for (const k of ['pay_interest_during_study', 'prepay_monthly_inr', 'tax_regime', 'return_to_india', 'india_salary_inr']) if (a[k] !== undefined) ov[k] = a[k];
    const base = S.summarize(p0); const sc = S.summarize(p, ov);
    const rank = sc.offers.map((o) => ({ ...o, change_vs_current_inr: o.total_family_pays_inr - (base.offers.find((b) => b.offer_id === o.offer_id)?.total_family_pays_inr || 0) })).sort((x, y) => x.total_family_pays_inr - y.total_family_pays_inr);
    return ok({ ...view(p0), scenario: { ...a, plan_id: undefined }, cheapest_under_scenario: rank[0]?.lender, offers_ranked: rank, note: 'Scenario not saved. The user can try the same what-ifs on the plan page.' });
  });

  server.registerTool('simulate_risk', {
    title: 'Replay history', description: 'Replay the plan against every start month since 2001: real rupee moves for costs and dollar EMIs, real RBI repo moves for repo-linked loans. Returns cost ranges, chance of overshooting, suggested buffer and EMI ranges per offer.',
    inputSchema: { plan_id: z.string().optional() }, annotations: { readOnlyHint: true },
  }, async ({ plan_id }) => {
    const p = await findPlan(plan_id);
    if (!p) return fail('No plan found.');
    if (!p.costs.length) return fail('Add costs first.');
    const r = simulateRisk(p);
    const st = fxStats(p.currency || 'USD', p.duration_months || 24);
    return ok({ ...view(p), method: r.method, degree_cost_today_inr: r.coa_today_inr, degree_cost_range_inr: r.coa, extra_vs_today_inr: r.extra_vs_today,
      chance_cost_3_lakh_over_estimate: r.prob_cost_3l_over_plan, suggested_buffer_inr: r.recommended_buffer_inr, chance_gap_exceeds_savings: r.prob_gap_exceeds_savings,
      offers: r.offers.map((o) => ({ lender: o.lender, total_family_pays_inr: o.all_in, emi_inr: o.emi, emi_peak_bad_case_inr: o.emi_peak_p90 })),
      rupee_history: { currency: st.currency, avg_fall_per_year_10y: st.cagr_10y, typical_fall_over_course: st.p50, bad_case_fall: st.p90, chance_of_10pct_fall: st.prob_over_10pct, data_to: FX_AS_OF },
      repo_rate_now_pct: REPO_NOW });
  });

  server.registerTool('lookup_universities', {
    title: 'Look up university costs', description: 'Search LoanLens data on 97 CS master’s programmes in 6 countries: tuition, living cost, total in rupees today and in a bad-case rupee path.',
    inputSchema: { query: z.string().optional(), country: z.string().optional().describe('e.g. "United States", "Germany", "UK"'), limit: z.number().int().min(1).max(30).optional() }, annotations: { readOnlyHint: true },
  }, async (a) => ok({ results: searchUniversities({ query: a.query, country: a.country, limit: a.limit || 10 }).map((u) => ({ university: u.university, country: u.country, city: u.city, program: u.program, duration_months: u.duration_months, tuition_total: u.tuition_total, tuition_currency: u.tuition_currency, living_per_month: u.living_per_month, living_currency: u.living_currency, total_today_inr: Math.round(u.total_today_inr_lakh * 1e5), total_bad_case_rupee_inr: Math.round(u.total_bad_case_fx_inr_lakh * 1e5), sources: `${u.tuition_source}; ${u.living_basis}` })), note: 'Estimates for benchmarking. The I-20 or admit letter is the real number.' }));

  server.registerTool('lookup_lenders', {
    title: 'Look up lender rate cards', description: 'Published education-loan terms for 14 lenders (PSU banks, private banks, NBFCs, international lenders): rate range, processing fee, margin money, collateral-free limit, rate benchmark.',
    inputSchema: { query: z.string().optional() }, annotations: { readOnlyHint: true },
  }, async ({ query }) => {
    const l = query ? [findLender(query)].filter(Boolean) : LENDERS;
    return ok({ lenders: (l.length ? l : LENDERS), note: 'Published ranges as of 2026. The sanction letter is the real number.' });
  });

  return server;
}

// Express handler: stateless Streamable HTTP, one server per request, keyed by the user's secret URL.
export function mcpHandler(baseUrlFor) {
  return async (req, res) => {
    const user = await S.getUserByKey(req.params.key);
    if (!user) return res.status(404).json({ jsonrpc: '2.0', error: { code: -32001, message: 'Unknown LoanLens connector link. Copy it again from the Ask Claude page.' }, id: null });
    const server = buildServer(user, baseUrlFor(req));
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => { transport.close(); server.close(); });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (e) {
      console.error('mcp error', e);
      if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal error' }, id: null });
    }
  };
}
