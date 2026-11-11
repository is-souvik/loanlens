// End-to-end test: acts like Claude using the LoanLens connector.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const url = process.argv[2];
const client = new Client({ name: 'test-claude', version: '1.0.0' });
await client.connect(new StreamableHTTPClientTransport(new URL(url)));
const call = async (name, args = {}) => {
  const r = await client.callTool({ name, arguments: args });
  const t = r.content?.[0]?.text || '';
  if (r.isError) { console.log(`✗ ${name}: ${t}`); return null; }
  try { return JSON.parse(t); } catch { return t; }
};
const tools = await client.listTools();
console.log('tools:', tools.tools.map((t) => t.name).join(', '));
const created = await call('create_plan', { student: 'Arjun Mehta', university: 'Purdue', intake: 'Fall 2027', savings_inr: 1500000, use_typical_costs: true, india_salary_inr: 1600000 });
console.log('create_plan →', created.plan_url, '|', created.note, '| status', created.results.status, '| degree', created.results.degree_cost_inr);
const id = created.plan_id;
const a = await call('add_loan_offer', { plan_id: id, lender: 'SBI Global Ed-Vantage', amount: 7000000, rate_pct: 10.15, rate_type: 'floating', processing_fee_flat: 10000, margin_pct: 15, moratorium_months: 30, tenure_years: 15, source_note: 'SBI sanction letter p.1' });
console.log('add SBI → filled from card:', a.filled_from_rate_card.join(',') || 'none');
const b = await call('add_loan_offer', { plan_id: id, lender: 'Avanse', amount: 8000000, rate_pct: 11.5, source_note: 'Avanse letter' });
console.log('add Avanse → filled from card:', b.filled_from_rate_card.join(','));
console.log('recommended:', b.results.recommended_lender, '| cheapest today:', b.results.cheapest_at_todays_rates, '| buffer', b.results.risk.suggested_buffer_inr);
for (const o of b.results.offers) console.log('  ', o.lender, 'EMI', o.emi_inr, 'total', o.total_family_pays_inr, 'typical', o.history_typical_total_inr, 'bad', o.history_bad_case_total_inr);
const c = await call('compare_offers', { plan_id: id, rupee_fall_pct: 15, pay_interest_during_study: true });
console.log('compare(rupee -15%, pay interest) → cheapest', c.cheapest_under_scenario, c.offers_ranked.map((o) => `${o.lender}:${o.total_family_pays_inr}(${o.change_vs_current_inr})`).join(' '));
const ret = await call('compare_offers', { plan_id: id, return_to_india: true });
console.log('return to India → EMI share', ret.offers_ranked.map((o) => `${o.lender}:${o.emi_share_of_take_home_pct}% ${o.affordability}`).join(' '));
const u = await call('update_offer', { plan_id: id, offer: 'Avanse', rate_pct: 10.9 });
console.log('update_offer Avanse 10.9 → recommended', u.results.recommended_lender);
const up = await call('update_plan', { plan_id: id, add_costs: [{ label: 'Housing deposit', amount: 1500, currency: 'USD', frequency: 'one_time', category: 'deposit' }], scholarship: 4000, scholarship_currency: 'USD' });
console.log('update_plan →', up.changed.join('; '));
const jr = await call('update_plan', { plan_id: id, stage: 'sanction', mark_done: ['admit_letter', 'i20', 'kyc', 'itr'] });
console.log('journey →', jr.changed.join('; '), '| stage', jr.journey.stage);
for (const c of jr.journey.stage_checks) console.log('   ', c);
console.log('   admit checklist:', jr.journey.checklist.admit.join(' | '));
const gp = await call('get_plan', { plan_id: id });
console.log('get_plan journey stage persisted:', gp.journey.stage, '| kyc ticked:', gp.journey.checklist.offers.some((x) => x.startsWith('[x] kyc')));
const r = await call('simulate_risk', { plan_id: id });
console.log('simulate_risk → windows', r.method.slice(0, 60), '| p(3L over)', r.chance_cost_3_lakh_over_estimate);
const g = await call('get_plan', { plan_id: id });
console.log('get_plan → share', g.family_share_url, '| offers', g.inputs.offers.length);
const lu = await call('lookup_universities', { query: 'Munich' });
console.log('lookup_universities Munich →', lu.results.map((x) => `${x.university} ${x.total_today_inr}`).join('; '));
const ll = await call('lookup_lenders', { query: 'Credila' });
console.log('lookup_lenders →', ll.lenders.map((l) => `${l.lender} ${l.rate_min}-${l.rate_max}`).join('; '));
const lp = await call('list_plans');
console.log('list_plans →', lp.plans.length, 'plans');
await call('remove_offer', { plan_id: id, offer: 'nonexistent' });
await client.close();
