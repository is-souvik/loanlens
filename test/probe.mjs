import { computePlan, simulateRisk } from '../src/engine.js';
import { SPOT, findLender, findUniversity } from '../src/data.js';
console.log('spot', SPOT.USD, findLender('SBI')?.lender, findLender('HDFC Credila')?.lender, findUniversity('UT Dallas')?.university, findUniversity('University of Texas at Dallas')?.university);
for (const mode of ['simple','compound']) {
  const plan = { duration_months: 6, costs: [{ amount: 4000000, currency: 'INR', frequency: 'one_time' }],
    offers: [{ id: 'a', lender: 'SBI', amount: 4000000, rate_pct: 9.65, moratorium_months: 30, tenure_years: 12, moratorium_interest: mode }] };
  const r = computePlan(plan).offers[0];
  console.log(mode, 'EMI', r.emi_inr, 'total', r.total_payback_inr, 'cap', r.capitalised_interest_inr);
}
