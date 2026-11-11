// Dataset logic shared by server (Node) and browser builds. No AI.
export function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1 || r[0]);
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}


export function makeData(raw) {
const CURRENCIES = ['USD', 'GBP', 'EUR', 'CAD', 'AUD'];

// Monthly INR per unit of foreign currency, Jan 1999 onwards (FRED H.10 via datasets/exchange-rates)
const fxRows = parseCsv(raw.fx);
const FX = Object.fromEntries(CURRENCIES.map((c) => [c,
  fxRows.filter((r) => r[c]).map((r) => ({ month: r.month, v: Number(r[c]) })),
]));
const FX_AS_OF = fxRows[fxRows.length - 1].month;
const SPOT = Object.fromEntries(CURRENCIES.map((c) => [c, FX[c][FX[c].length - 1].v]));
SPOT.INR = 1;

// RBI repo rate, monthly, 2001 onwards
const REPO = parseCsv(raw.repo).map((r) => ({ month: r.month, v: Number(r.repo) }));
const REPO_NOW = REPO[REPO.length - 1].v;
const REPO_AS_OF = REPO[REPO.length - 1].month;

const LENDERS = parseCsv(raw.lenders).map((r) => ({
  ...r, rate_min: Number(r.rate_min), rate_max: r.rate_max === 'n/a' ? null : Number(r.rate_max),
}));

const UNIVERSITIES = parseCsv(raw.universities).map((r) => ({
  ...r,
  duration_months: Number(r.duration_months),
  tuition_total: Number(r.tuition_total),
  living_per_month: Number(r.living_per_month),
  tuition_inr_lakh: Number(r.tuition_inr_lakh),
  living_inr_lakh: Number(r.living_inr_lakh),
  total_today_inr_lakh: Number(r.total_today_inr_lakh),
  total_typical_fx_inr_lakh: Number(r.total_typical_fx_inr_lakh),
  total_bad_case_fx_inr_lakh: Number(r.total_bad_case_fx_inr_lakh),
}));

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\b(the|university|of|at|and)\b/g, ' ').replace(/\s+/g, ' ').trim();

function score(query, name) {
  const q = norm(query), n = norm(name);
  if (!q) return 0;
  if (n === q) return 100;
  if (n.includes(q) || q.includes(n)) return 80;
  const qt = q.split(' '), nt = new Set(n.split(' '));
  const hit = qt.filter((t) => nt.has(t)).length;
  return Math.round((hit / Math.max(qt.length, 1)) * 60);
}

const ALIASES = { 'ut dallas': 'University of Texas at Dallas', 'utd': 'University of Texas at Dallas', 'ut austin': 'University of Texas at Austin', 'uiuc': 'University of Illinois Urbana-Champaign', 'cmu': 'Carnegie Mellon', 'nyu': 'New York University', 'usc': 'University of Southern California', 'ucla': 'University of California Los Angeles', 'ucsd': 'University of California San Diego', 'uci': 'University of California Irvine', 'ucsb': 'University of California Santa Barbara', 'asu': 'Arizona State', 'georgia tech': 'Georgia Institute of Technology', 'gatech': 'Georgia Institute of Technology', 'umd': 'University of Maryland College Park', 'uic': 'University of Illinois Chicago', 'ncsu': 'North Carolina State', 'tamu': 'Texas A&M', 'jhu': 'Johns Hopkins', 'bu': 'Boston University', 'ubc': 'University of British Columbia', 'uoft': 'University of Toronto', 'tum': 'Technical University of Munich', 'kit': 'Karlsruhe Institute of Technology', 'tcd': 'Trinity College Dublin', 'ucd': 'University College Dublin', 'ucl': 'University College London', 'kcl': "King's College London", 'anu': 'Australian National University', 'unimelb': 'University of Melbourne', 'suny buffalo': 'University at Buffalo', 'stony brook': 'Stony Brook University' };
  function findUniversity(name, country) {
    const a = ALIASES[String(name || '').toLowerCase().trim()];
    if (a) name = a;
  let best = null, bestScore = 0;
  for (const u of UNIVERSITIES) {
    let s = score(name, u.university);
    if (country && u.country.toLowerCase().startsWith(String(country).toLowerCase().slice(0, 4))) s += 5;
    if (s > bestScore) { best = u; bestScore = s; }
  }
  return bestScore >= 45 ? best : null;
}

function searchUniversities({ query = '', country = '', limit = 15 } = {}) {
  let list = UNIVERSITIES;
  if (country) list = list.filter((u) => u.country.toLowerCase().includes(country.toLowerCase()) || (country.toUpperCase() === 'US' && u.country === 'United States') || (country.toUpperCase() === 'UK' && u.country === 'United Kingdom'));
  if (query) list = list.map((u) => ({ u, s: score(query, u.university) })).filter((x) => x.s >= 30).sort((a, b) => b.s - a.s).map((x) => x.u);
  return list.slice(0, limit);
}

function findLender(name) {
  let best = null, bestScore = 0;
  for (const l of LENDERS) {
    const s = Math.max(score(name, l.lender), score(name, l.lender.split(' ')[0]) + (norm(name).startsWith(norm(l.lender.split(' ')[0])) ? 20 : 0));
    if (s > bestScore) { best = l; bestScore = s; }
  }
  return bestScore >= 45 ? best : null;
}

// Historical stats for display
function fxStats(ccy, months) {
  const s = FX[ccy].filter((p) => p.month >= '2000-01').map((p) => p.v);
  const ch = [];
  for (let i = 0; i + months < s.length; i++) ch.push(s[i + months] / s[i] - 1);
  ch.sort((a, b) => a - b);
  const q = (p) => ch[Math.floor(p * (ch.length - 1))];
  const now = s[s.length - 1];
  const cagr = (y) => (now / s[s.length - 1 - 12 * y]) ** (1 / y) - 1;
  return {
    currency: ccy, horizon_months: months, windows: ch.length,
    p10: q(0.1), p50: q(0.5), p90: q(0.9), worst: ch[ch.length - 1],
    prob_over_10pct: ch.filter((c) => c > 0.1).length / ch.length,
    cagr_10y: cagr(10), cagr_20y: cagr(20), spot: now, as_of: FX_AS_OF,
  };
}

const SALARY_BENCHMARKS = [
  { country: 'United States', role: 'Software engineer (H-1B LCA median, FY2025)', annual: 127878, currency: 'USD', source: 'US DOL LCA disclosure data via careery.pro' },
];

const SOURCES = [
  { name: 'Exchange rates (monthly avg of daily)', detail: `US Federal Reserve H.10 / FRED, via datasets/exchange-rates. Jan 1999 to ${FX_AS_OF}.`, url: 'https://fred.stlouisfed.org/series/DEXINUS' },
  { name: 'RBI repo rate', detail: `Every policy change since 2000, latest ${REPO_NOW}% (${REPO_AS_OF}).`, url: 'https://www.rbi.org.in' },
  { name: 'Lender rate cards', detail: '14 lenders, public rate cards as of 2026 (IvyEdge, Nomad Credit compilations).', url: 'https://ivyedgesop.com/blogs/study-abroad-education-loan-india-2026' },
  { name: 'University costs', detail: '97 CS master’s programmes in 6 countries. Tuition from Yocket and university guides; living costs from official visa proof-of-funds rules.', url: 'https://yocket.com/universities/top-universities-in-computer-science-for-masters' },
  { name: 'Salary benchmark', detail: 'US software engineer H-1B LCA median wage, FY2025 (US Department of Labor).', url: 'https://careery.pro/h1b-sponsors/role/software-engineer' },
  { name: 'Tax rules', detail: 'Section 80E (old regime only, 8 years); TCS on education remittances (nil if loan-financed, 5% above ₹10L if self-funded); 18% GST on loan fees.', url: 'https://www.business-standard.com/amp/budget/news/tcs-on-foreign-remittances-up-to-rs-10-lakh-none-on-foreign-education-loan-125020100857_1.html' },
];

  return { CURRENCIES, FX, FX_AS_OF, SPOT, REPO, REPO_NOW, REPO_AS_OF, LENDERS, UNIVERSITIES, findUniversity, searchUniversities, findLender, fxStats, SALARY_BENCHMARKS, SOURCES };
}
