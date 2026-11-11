# LoanLens

**Got education loan offers? See which one really costs your family least.**

Indian families borrow ₹40 lakh to ₹1 crore for a master's abroad, usually on the strength of the interest rate. What they actually pay depends on much more: interest that piles up while the student studies, fees and GST, margin money, a floating rate that moves with RBI, and a rupee that keeps falling. LoanLens adds it all up and tests every offer against 25 years of real rupee and RBI history.

The customer's own Claude does the reading and writing (admit letters, sanction letters, explanations). LoanLens does everything else: it stores the plan, runs the math, keeps a live page the student can edit, and shares a plain-language view with the family. **There is no AI inside LoanLens and no AI API key anywhere in this repo.**

## For reviewers

| What | Where |
|---|---|
| Live app | `https://loanlens-95ta.onrender.com` |
| Test login | `demo@loanlens.app` / `demo1234` (or click "Open the test account") |
| Claude connector (MCP) | `https://loanlens-95ta.onrender.com/mcp/ll_volopay_demo_2026` |
| Sample documents to attach in Claude | `demo-docs/Sample_admission_and_costs_Purdue.pdf`, `demo-docs/Sample_loan_offers.pdf` |

### Connect it to Claude (1 minute)
1. In Claude, open **Settings → Connectors → Add custom connector**.
2. Name it **LoanLens** and paste the connector URL above. Save.
3. In a new chat, attach the two sample PDFs and say:
   > Read these documents and build my LoanLens plan: add the costs and every loan offer exactly as written. Then tell me which loan costs my family least.
4. Open the live app (test login). The plan is there. Change any number; the answer updates instantly.

More prompts: the **Ask Claude** page in the app has 31, grouped by what you're doing (build a plan, costs, loan offers, decide, explain to family, keep it updated, your journey).

## The student's journey

A plan is a guided path, one step at a time. Each step unlocks when the one before is done:

**Create your plan → Shortlist colleges → Admit and I-20 → Your money → Loan offers → Compare and choose → Save your plan → Repayment → Sanction and visa → Ready to study**

- **Shortlist:** colleges only, no money talk. Claude prompts to compare courses and pick one.
- **Admit and I-20:** the documents to collect and the Claude prompts that read them; proof-of-funds rule for the country.
- **Your money:** savings, scholarship, how much to borrow, expected salary. All from the student.
- **Loan offers → Compare:** every offer side by side (EMI, years, total interest, total by the end, extra if things go badly), then choose one.
- **Save → Repayment:** own money, borrowed, EMI, total; then when EMIs start, for how long, and what paying extra saves.
- **Sanction and visa → Ready to study:** fees at signing, TCS, visa papers, semester disbursements, work rules.

Every number is explained in plain words. Claude sees the same steps through `get_plan` and can save the shortlist, tick documents, choose an offer and move the step with `update_plan`.

## How it works

```
Student's Claude ──MCP──▶ LoanLens server ──▶ Postgres
  reads PDFs              11 tools              plans, activity
  explains results        engine (pure math)
                          historical data (CSV)
                                 │
                                 ▼
                   Web app: edit plan, what-ifs, family link
```

### MCP tools
| Tool | What it does |
|---|---|
| `create_plan` | Starts a plan; can fill typical costs from the 97-programme dataset |
| `add_loan_offer` | Adds one offer exactly as written; missing terms filled from the lender's published card and reported back |
| `update_plan`, `update_offer`, `remove_offer` | Corrections and changes; `update_plan` also sets the journey stage and ticks checklist items |
| `list_plans`, `get_plan` | Read plans with every computed number, the journey checks and checklist, and the family link |
| `compare_offers` | Ranks offers under a what-if: rupee fall, paying interest while studying, prepaying, tax regime, returning to India, tenure |
| `simulate_risk` | Replays the plan across every start month since 2001 |
| `lookup_universities`, `lookup_lenders` | Reference data |

Transport: Streamable HTTP (stateless), one secret URL per user. No OAuth needed.

### The engine (`src/engine.js`)
- Cost of attendance as cash flows by month and currency.
- Each loan simulated month by month: tranche disbursement per semester, moratorium interest (simple, compounding or paid), EMI, prepayment, fees plus 18% GST.
- Section 80E (old regime only), TCS on self-funded remittances, EMI as a share of take-home pay (US or India).
- **Historical replay:** every start month since 2001 replays the rupee's actual path for costs and dollar EMIs, and RBI's actual repo path for repo-linked floating loans. Results are typical (median) and bad case (90th percentile).

The same engine runs on the server (for Claude) and in the browser (for instant what-ifs).

### Data (`data/`)
| File | Source |
|---|---|
| `fx_monthly_inr.csv` | INR per USD, GBP, EUR, CAD, AUD, Jan 1999 to Oct 2026. US Federal Reserve H.10 / FRED via datasets/exchange-rates |
| `repo_changes.csv`, `repo_monthly.csv` | Every RBI repo rate change since 2000 (5.50% after 7 Oct 2026) |
| `lenders_2026.csv` | 14 lenders' published rate cards, 2026 |
| `universities_2026.csv` | 97 CS master's programmes in 6 countries; living costs from official visa proof-of-funds rules where they exist |

## Run locally

```bash
npm install
npm start            # http://localhost:3000, SQLite file, test account seeded
```
Node 22.5+ is required (uses the built-in SQLite for local runs).

`npm run build` rebuilds `public/engine.js` (the browser bundle) after changing `src/engine.js` or the data. It needs the dev dependencies.

## Deploy on Render

1. Push this folder to a GitHub repository.
2. In Render: **New → Blueprint**, pick the repository. `render.yaml` creates the web service and a Postgres database.
3. When it's live, open `https://loanlens-95ta.onrender.com/health`, then sign in with the test account.

Render's free web service sleeps after 15 minutes idle and takes about a minute to wake. For the review period, either upgrade the service to Starter or open the app once before testing the connector.

## Project layout

```
src/server.js     web API, auth, family links, MCP endpoint
src/mcp.js        the 11 MCP tools
src/engine.js     calculation and historical-replay engine
src/journey.js    stage checks and document checklists (shared by server and browser)
src/store.js      plans, users, activity
src/data*.js      dataset loading (Node and browser)
public/           web app (plain JS) + browser engine bundle
data/             CSV datasets
demo-docs/        sample documents for the Claude demo
test/             engine probes and an MCP client end-to-end test
```

LoanLens is a calculator, not financial advice.
