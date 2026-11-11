import { computePlan } from '../src/engine.js';
import { SAMPLE } from './sample-plan.mjs';
for (const pp of [0, 20000, 50000]) {
  const c = computePlan(SAMPLE, { prepay_monthly_inr: pp });
  console.log('prepay', pp, c.offers.map(o => `${o.lender.split(' ')[0]} EMI ${o.emi_inr} close ${(o.months_to_close/12).toFixed(1)}y payback ${(o.total_payback_inr/1e5).toFixed(1)}L allin ${(o.all_in_inr/1e5).toFixed(1)}L`).join(' | '));
}
