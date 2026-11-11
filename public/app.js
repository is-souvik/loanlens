/* LoanLens web app. Plain JS, no framework. The engine (window.LL) runs the same
   math as the server, so every edit and what-if recomputes instantly in the browser. */
(() => {
  'use strict';
  const LL = window.LL;
  const MODE = window.LL_MODE || 'demo'; // 'demo' = in-memory prototype, 'live' = server API
  const $app = document.getElementById('app');

  // ---------- helpers ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inr = (x) => (x < 0 ? '-' : '') + '₹' + Math.round(Math.abs(x || 0)).toLocaleString('en-IN');
  const lakh = (x) => {
    if (x == null || isNaN(x)) return '–';
    const a = Math.abs(x), s = x < 0 ? '-' : '';
    if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(2)} Cr`;
    if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(1)} L`;
    return inr(x);
  };
  const pctf = (x, d = 0) => `${(x * 100).toFixed(d)}%`;
  const ago = (t) => {
    const s = Math.max(1, Math.round((Date.now() - t) / 1000));
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.round(s / 60)} min ago`;
    if (s < 86400) return `${Math.round(s / 3600)} h ago`;
    return `${Math.round(s / 86400)} d ago`;
  };
  const uid = () => Math.random().toString(36).slice(2, 9);
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const short = (name) => String(name || '').split(' ').slice(0, 2).join(' ');
  const first = (name) => String(name || 'the student').split(' ')[0];
  const info = (text, right = false) => `<details class="info${right ? ' right' : ''}"><summary aria-label="What does this mean?">i</summary><div>${text}</div></details>`;
  const toast = (msg) => {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('on');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 1900);
  };
  document.addEventListener('click', (e) => { // close open info popovers when clicking elsewhere
    document.querySelectorAll('details.info[open]').forEach((d) => { if (!d.contains(e.target)) d.removeAttribute('open'); });
  });

  // ---------- prompts ----------
  const PROMPTS = window.LL_PROMPTS || [];
  function fillPrompt(text, plan) {
    let best = null;
    try { if (text.includes('{best}') && plan?.offers?.length && plan.costs?.length) { const c = LL.computePlan(plan); const r = LL.simulateRisk(plan); best = c.offers.find((o) => o.id === (r.best_offer_typical_id || c.best_offer_id))?.lender; } } catch { /* incomplete plan */ }
    return text
      .replace(/\{title\}/g, plan?.title || 'my plan')
      .replace(/\{university\}/g, plan?.university || '[university]')
      .replace(/\{student\}/g, plan?.student || 'me')
      .replace(/\{program\}/g, plan?.program || 'master’s course')
      .replace(/\{shortlist\}/g, (plan?.shortlist?.length ? plan.shortlist : plan?.university ? [plan.university] : ['[my colleges]']).join(', '))
      .replace(/\{currency\}/g, plan?.currency || 'dollar')
      .replace(/\{best\}/g, best || plan?.offers?.[0]?.lender || 'the lender');
  }
  function promptRow(p, plan) {
    const t = fillPrompt(p.text, plan);
    return `<div class="prow"><div style="min-width:0"><b>${esc(p.title)}</b><div class="small muted">${esc(p.when)}</div>
      <details class="pfull"><summary>See the prompt</summary><p>${esc(t)}</p><div class="ptools">Claude will use: ${p.tools.map((x) => `<code>${esc(x)}</code>`).join(' ')}</div></details></div>
      <button class="btn small" data-act="copy" data-text="${esc(t)}">Copy</button></div>`;
  }
  function askClaude(step, plan, limit = 4) {
    const list = PROMPTS.filter((p) => p.steps.includes(step)).slice(0, limit);
    if (!list.length) return '';
    return `<div class="askbar mt16"><span class="ai">AI</span><span class="askbar-l">Ask Claude</span>
      ${list.map((p) => `<button class="pchip" data-act="copy" data-text="${esc(fillPrompt(p.text, plan))}" title="${esc(fillPrompt(p.text, plan))}">${esc(p.title)}<span aria-hidden="true">Copy</span></button>`).join('')}
      <a class="pchip more" href="#/prompts">All ${PROMPTS.length}</a></div>`;
  }

  // ---------- data store ----------
  const now = Date.now();
  const Demo = {
    user: null,
    profile: { name: 'Riya Sharma', email: 'demo@loanlens.app', mcp_url: 'https://loanlens.onrender.com/mcp/ll_demo_7f3k9q2x' },
    plans: [Object.assign(clone(window.LL_SAMPLE), { source: 'claude', share_token: 'demo-share', updated_at: now - 6 * 60e3 })],
    activity: {
      'riya-utd': [
        { actor: 'Papa', kind: 'p', text: 'Opened the shared plan on his phone', at: now - 2 * 60e3 },
        { actor: 'You', kind: 'u', text: 'Corrected SBI’s processing fee to a flat ₹10,000 (Claude had read it as 1%)', at: now - 5 * 60e3 },
        { actor: 'Claude', kind: 'c', text: 'Added Prodigy Finance: USD 85,000 at 12.15% fixed, 10 years', at: now - 6 * 60e3 },
        { actor: 'Claude', kind: 'c', text: 'Added HDFC Credila: ₹80 lakh at 11.25% floating, 12 years', at: now - 6 * 60e3 },
        { actor: 'Claude', kind: 'c', text: 'Added SBI Global Ed-Vantage: ₹75 lakh at 10.15% floating, 15 years', at: now - 7 * 60e3 },
        { actor: 'Claude', kind: 'c', text: 'Created the plan from the UT Dallas admit letter and I-20 cost sheet', at: now - 7 * 60e3 },
      ],
    },
  };
  Demo.plans[0].offers.forEach((o) => { o.source = 'claude'; });
  Demo.plans[0].costs.forEach((c) => { c.source = 'claude'; });
  Demo.plans[0].offers[0].edited = { processing_fee_flat: true };

  const Store = MODE === 'demo' ? {
    async me() { return Demo.user; },
    async login(email, pw) {
      if (email === 'demo@loanlens.app' && pw === 'demo1234') { Demo.user = Demo.profile; return Demo.user; }
      throw new Error('That email and password don’t match. Use the test account below.');
    },
    async logout() { Demo.user = null; },
    async signup() { throw new Error('Sign-up works in the live app. Use the test account here.'); },
    async listPlans() { return Demo.plans; },
    async getPlan(id) { return Demo.plans.find((p) => p.id === id || p.share_token === id) || null; },
    async savePlan(plan, note) {
      plan.updated_at = Date.now();
      if (note) (Demo.activity[plan.id] ||= []).unshift({ actor: 'You', kind: 'u', text: note, at: Date.now() });
      return plan;
    },
    async activity(id) { return Demo.activity[id] || []; },
    async createPlan() {
      const p = { id: uid(), title: 'New plan', student: Demo.profile.name, university: '', country: 'United States', program: '', intake: '', duration_months: 24, currency: 'USD', costs: [], funds: {}, assumptions: {}, offers: [], source: 'manual', stage: 'shortlist', share_token: uid(), updated_at: Date.now() };
      Demo.plans.unshift(p); Demo.activity[p.id] = [{ actor: 'You', kind: 'u', text: 'Created an empty plan', at: Date.now() }];
      return p;
    },
    async version(id) { const p = await this.getPlan(id); return p?.updated_at || 0; },
    async sharedPlan(token) { return this.getPlan(token); },
  } : {
    async req(method, url, body) {
      const r = await fetch(url, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
      if (r.status === 401 && !url.startsWith('/api/share') && !url.startsWith('/api/login') && url !== '/api/me') { location.hash = '#/'; throw new Error('Please sign in.'); }
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);
      return j;
    },
    async me() { try { return (await this.req('GET', '/api/me')).user; } catch { return null; } },
    async login(email, password) { return (await this.req('POST', '/api/login', { email, password })).user; },
    async signup(name, email, password) { return (await this.req('POST', '/api/signup', { name, email, password })).user; },
    async logout() { await this.req('POST', '/api/logout'); },
    async listPlans() { return (await this.req('GET', '/api/plans')).plans; },
    async getPlan(id) { return (await this.req('GET', `/api/plans/${id}`)).plan; },
    async savePlan(plan, note) {
      plan._saving = (plan._saving || 0) + 1;
      try { const r = await this.req('PUT', `/api/plans/${plan.id}`, { plan, note }); plan.updated_at = r.updated_at; } finally { plan._saving -= 1; }
      return plan;
    },
    async activity(id) { return (await this.req('GET', `/api/plans/${id}/activity`)).activity; },
    async createPlan() { return (await this.req('POST', '/api/plans', {})).plan; },
    async version(id) { return (await this.req('GET', `/api/plans/${id}/version`)).updated_at; },
    async sharedPlan(token) { return (await this.req('GET', `/api/share/${token}`)).plan; },
  };

  // ---------- routing ----------
  let user = null;
  const charts = [];
  let poll = null;
  const killCharts = () => { while (charts.length) charts.pop().destroy(); };

  async function route() {
    killCharts(); clearInterval(poll);
    const h = location.hash.replace(/^#\/?/, '');
    const [view, arg, step] = h.split('/');
    if (view === 'share') return renderShare(arg);
    user = user || await Store.me();
    if (!user) return renderLanding();
    if (view === 'login') { location.hash = '#/plans'; return; }
    if (view === 'plan' && arg) return renderPlan(arg, step);
    if (view === 'connect') return renderPrompts();
    if (view === 'prompts') return renderPrompts(arg);
    if (view === 'data') return renderData();
    return renderPlans();
  }
  window.addEventListener('hashchange', route);

  function shell(active, inner) {
    const initials = (user?.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    return `
      <header class="topbar"><div class="topbar-in">
        <a class="brand" href="#/plans"><span class="brand-mark" aria-hidden="true">L</span>LoanLens</a>
        <nav class="nav" aria-label="Main">
          <a href="#/plans" class="${active === 'plans' ? 'on' : ''}">My plans</a>
          <a href="#/prompts" class="${active === 'prompts' ? 'on' : ''}">Ask Claude</a>
          <a href="#/data" class="${active === 'data' ? 'on' : ''}">Universities</a>
        </nav>
        <div class="who"><span>${esc(user?.name)}</span><div class="avatar" aria-hidden="true">${esc(initials)}</div><button class="linkbtn" data-act="logout">Sign out</button></div>
      </div></header>
      <main class="page">${inner}</main>`;
  }

  // ---------- landing / sign in ----------
  function renderLanding() {
    document.title = 'LoanLens: know what your study-abroad loan will really cost';
    $app.innerHTML = `
      <div class="landing">
        <section class="l-left">
          <a class="brand" href="#/"><span class="brand-mark" aria-hidden="true">L</span>LoanLens</a>
          <div>
            <h1>Got education loan offers? See which one <span>really</span> costs least.</h1>
            <p class="lede">Banks compete on interest rate. Your family pays much more than the rate suggests. We add up every rupee and name the cheapest offer.</p>
          </div>
          <div class="l-demo"><small>One degree at UT Dallas, three loan offers</small>
            <div class="ld"><span>SBI <em>10.15%</em></span><i style="width:76%"></i><b>₹1.88 Cr</b></div>
            <div class="ld"><span>HDFC Credila <em>11.25%</em></span><i style="width:78%"></i><b>₹1.93 Cr</b></div>
            <div class="ld"><span>Prodigy <em>12.15%</em></span><i style="width:100%"></i><b>₹2.46 Cr</b></div>
            <p>What your family pays in total. A 2-point rate gap became ₹58 lakh.</p></div>
          <div class="l-flow">
            <div><span class="who-c">1</span><b>Pick your university</b>We fill in the costs.</div>
            <div><span class="who-c">2</span><b>Add your offers</b>Or let Claude read the letters.</div>
            <div><span class="who-c">3</span><b>Get the answer</b>Share it with family in one link.</div>
          </div>
        </section>
        <section class="l-right">
          <form class="login-card" id="login-form">
            <h2 id="lf-title">Sign in to your plans</h2>
            <div id="lf-name" hidden><label for="nm">Your name</label><input id="nm" name="name" autocomplete="name" placeholder="Riya Sharma"></div>
            <label for="em">Email</label><input id="em" name="email" type="email" autocomplete="username" placeholder="you@example.com" required>
            <label for="pw">Password</label><input id="pw" name="password" type="password" autocomplete="current-password" required minlength="6">
            <button class="btn primary" type="submit" id="lf-go">Sign in</button>
            <p class="small mt12" style="text-align:center"><button type="button" class="linkbtn2" id="lf-switch">New here? Create an account</button></p>
            <div class="err" id="login-err" role="alert"></div>
            <div class="test-acct"><b>Reviewing LoanLens?</b> Test account: demo@loanlens.app / demo1234
              <button class="btn gold" type="button" data-act="demo-login" style="margin-top:10px">Open the test account</button></div>
          </form>
        </section>
      </div>`;
    let signup = false;
    document.getElementById('lf-switch').addEventListener('click', () => {
      signup = !signup;
      document.getElementById('lf-name').hidden = !signup;
      document.getElementById('lf-title').textContent = signup ? 'Create your account' : 'Sign in to your plans';
      document.getElementById('lf-go').textContent = signup ? 'Create account' : 'Sign in';
      document.getElementById('lf-switch').textContent = signup ? 'Have an account? Sign in' : 'New here? Create an account';
      document.getElementById('pw').autocomplete = signup ? 'new-password' : 'current-password';
    });
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try { user = signup ? await Store.signup(f.get('name'), f.get('email'), f.get('password')) : await Store.login(f.get('email'), f.get('password')); location.hash = '#/plans'; route(); }
      catch (err) { document.getElementById('login-err').textContent = err.message; }
    });
  }

  // ---------- plans list ----------
  function planSummary(p) {
    try {
      if (!p.offers?.length || !p.costs?.length) return null;
      const c = LL.computePlan(p); const r = LL.simulateRisk(p);
      const rec = c.offers.find((o) => o.id === (r.best_offer_typical_id || c.best_offer_id));
      return { c, r, rec, rr: r.offers.find((o) => o.id === rec.id) };
    } catch { return null; }
  }
  async function renderPlans() {
    document.title = 'Your plans · LoanLens';
    const plans = await Store.listPlans();
    const cards = plans.map((p) => {
      const s = planSummary(p);
      return `<a class="card plan-card mt12" href="#/plan/${esc(p.id)}">
        <div><h3>${esc(p.title || 'Untitled plan')}</h3><div class="small muted mt8">${esc(p.university || 'University not set')}${p.intake ? ` · ${esc(p.intake)}` : ''}</div>
          <div class="meta">${p.source === 'claude' ? '<span class="chip claude">Created by Claude</span>' : '<span class="chip">Created by you</span>'}<span class="chip">Stage: ${esc(LL.JOURNEY_STAGES.find((x) => x.id === LL.inferStage(p))?.title || '')}</span><span class="chip">${(p.offers || []).length} loan offers</span><span class="chip">Updated ${ago(p.updated_at || Date.now())}</span></div></div>
        <div class="pc-ans">${s ? `Our pick: <b>${esc(s.rec.lender)}</b>. EMI <b>${inr(s.rec.emi_inr)}</b> a month after the course. You’ll pay about <b>${lakh(s.rr?.all_in?.p50 ?? s.rec.all_in_inr)}</b> in total by the end.` : 'Not finished yet. Add the costs and at least one loan offer.'}</div>
        <span class="btn">Open plan</span></a>`;
    }).join('');
    $app.innerHTML = shell('plans', `
      <div class="ws-head"><div><h1>Your plans</h1><p class="sub">One plan per degree. Open one to see which loan costs least.</p></div>
        <div style="display:flex;gap:8px"><button class="btn primary" data-act="new-plan">New plan</button></div></div>
      ${cards || `<div class="card empty mt16"><h2>Build your first loan plan</h2><p class="sub" style="margin:8px auto 16px">Connect Claude, attach your admit letter and loan offers, and ask: “Build my LoanLens plan.” It will appear here.</p><a class="btn primary" href="#/connect">Connect Claude</a></div>`}
      <p class="foot">We refresh this page when Claude changes a plan.</p>`);
    clearInterval(poll);
    if (MODE === 'live') poll = setInterval(async () => {
      if (location.hash !== '#/plans') return;
      const ps = await Store.listPlans().catch(() => plans);
      if (location.hash === '#/plans' && (ps.length !== plans.length || ps.some((p, i) => p.updated_at !== plans[i]?.updated_at))) renderPlans();
    }, 4000);
  }

  // ---------- plan page: questions on the left, answer on the right ----------
  let cur = null;
  const COLORS = ['#2e2a8c', '#12805c', '#d9480f', '#b0306a', '#0e7490'];
  const color = (id) => COLORS[Math.max(0, cur.plan.offers.findIndex((o) => o.id === id)) % COLORS.length];
  const complete = (p) => !!(p.costs?.length && p.offers?.length);

  function riskKey(p) {
    const A = p.assumptions || {};
    return JSON.stringify([p.costs, p.offers, p.funds, p.duration_months, p.fx_rates, A.pay_interest_during_study, A.tax_regime, A.prepay_monthly_inr]);
  }
  function recompute(withRisk = true) {
    const p = cur.plan;
    cur.comp = LL.computePlan(p);
    const k = riskKey(p);
    if (withRisk && k !== cur.riskKey) { cur.risk = LL.simulateRisk(p); cur.riskKey = k; }
    if (!cur.comp.offers.some((o) => o.id === cur.sel)) cur.sel = recId();
  }
  const shocked = () => (cur.plan.assumptions.fx_shock_pct || 0) > 0;
  const recId = () => (shocked() ? cur.comp.best_offer_id : cur.risk?.best_offer_typical_id) || cur.comp.best_offer_id;
  const offerC = (id) => cur.comp.offers.find((o) => o.id === id);
  const offerR = (id) => cur.risk?.offers.find((o) => o.id === id);
  const typical = (id) => (shocked() ? null : offerR(id)?.all_in?.p50) ?? offerC(id)?.all_in_inr;
  function parts(c) {
    const feesCap = Math.max(0, c.repay_principal_inr - c.drawn_inr - c.capitalised_interest_inr);
    const studyInt = c.capitalised_interest_inr + c.interest_during_study_inr;
    const repayInt = Math.max(0, c.total_payback_inr - c.upfront_fees_inr - c.interest_during_study_inr - c.repay_principal_inr);
    return { family: c.family_arranges_inr, borrowed: c.drawn_inr, studyInt, repayInt, fees: c.upfront_fees_inr + feesCap, tax: c.tax_80e_saving_inr, interest: studyInt + repayInt };
  }
  const COUNTRY_DEFAULTS = {
    'United States': { ins: [3000, 'USD', 'Health insurance'], visa: [535, 'USD', 'Visa and SEVIS fees'], flight: 85000 },
    'United Kingdom': { ins: [776, 'GBP', 'Immigration Health Surcharge'], visa: [524, 'GBP', 'Student visa fee'], flight: 70000 },
    Canada: { ins: [900, 'CAD', 'Health insurance'], visa: [150, 'CAD', 'Study permit fee'], flight: 95000 },
    Australia: { ins: [700, 'AUD', 'Student health cover'], visa: [2000, 'AUD', 'Student visa fee'], flight: 80000 },
    Germany: { ins: [1440, 'EUR', 'Health insurance'], visa: [75, 'EUR', 'Visa fee'], flight: 65000 },
    Ireland: { ins: [500, 'EUR', 'Health insurance'], visa: [60, 'EUR', 'Visa fee'], flight: 60000 },
  };

  async function renderPlan(id) {
    const plan = await Store.getPlan(id);
    if (!plan) { $app.innerHTML = shell('plans', '<div class="card empty"><h2>We couldn’t find that plan</h2><p class="sub" style="margin:8px auto 16px">It may have been removed.</p><a class="btn" href="#/plans">Back to my plans</a></div>'); return; }
    plan.assumptions = Object.assign({}, LL.DEFAULT_ASSUMPTIONS, plan.assumptions || {});
    plan.funds ||= {}; plan.costs ||= []; plan.offers ||= [];
    const same = cur?.plan?.id === id;
    cur = { plan, comp: null, risk: null, riskKey: null, activity: await Store.activity(id), sel: same ? cur.sel : null, openOffer: same ? cur.openOffer : null, openSec: same ? cur.openSec : null, costsOpen: same ? cur.costsOpen : false, picking: false, uq: '', tMonth: same ? cur.tMonth : null, jOpen: same ? cur.jOpen : null, tab: same ? cur.tab : null, viewSet: same ? cur.view : null };
    if (complete(plan)) recompute();
    document.title = `${plan.title || 'New plan'} · LoanLens`;
    const reached = LL.inferStage(plan);
    cur.view = same && cur.viewSet && stepIdx(cur.viewSet) <= stepIdx(reached) ? cur.viewSet : reached;
    $app.innerHTML = shell('plans', `
      <div class="phead" id="phead"></div>
      <div class="wiz">
        <nav class="wnav" id="wnav" aria-label="Your steps"></nav>
        <section class="wmain" id="wmain" aria-live="polite"></section>
      </div>`);
    renderHead(); renderWiz();
    if (MODE === 'live') {
      clearInterval(poll);
      poll = setInterval(async () => {
        if (!location.hash.startsWith('#/plan/') || cur?.plan?._saving || document.activeElement?.matches('input:not([type=checkbox]),select')) return;
        const mine = cur?.plan?.updated_at;
        const nv = await Store.version(plan.id).catch(() => mine);
        if (nv && mine && nv > mine) { const y = window.scrollY; await renderPlan(plan.id); window.scrollTo(0, y); document.getElementById('output')?.classList.add('flash'); toast('Claude just updated this plan'); }
      }, 3000);
    }
  }

  function renderHead() {
    const p = cur.plan;
    document.getElementById('phead').innerHTML = `
      <div><div class="crumb"><a href="#/plans">My plans</a></div><h1>${esc(p.title || 'New loan plan')}</h1>
        <p class="sub">Your study-abroad plan, one step at a time.</p></div>
      ${p.chosen_offer_id && complete(p) ? `<div class="phead-act"><a class="btn" href="#/share/${esc(p.share_token)}" target="_blank" rel="noopener">Family view</a><button class="btn primary" data-act="share">Share with family</button></div>` : ''}`;
  }

  // ----- the student's journey: where you are, what to check, what to collect -----
  const TONE = { good: 'All good', warn: 'Keep in mind', bad: 'Act on this', info: '' };
  function renderStages() {
    const p = cur.plan; const box = document.getElementById('stages'); if (!box) return;
    let j; try { j = LL.journey(p, cur.comp ? recId() : undefined); } catch (err) { console.error(err); box.innerHTML = ''; return; }
    const open = j.stages.find((s) => s.id === cur.jOpen);
    const now = j.stages.find((s) => s.id === j.current);
    const flag = (s) => s.checks.some((c) => c.tone === 'bad') ? 'bad' : s.checks.some((c) => c.tone === 'warn') ? 'warn' : '';
    const lead = now.checks.find((c) => c.tone === 'bad') || now.checks.find((c) => c.tone === 'warn') || now.checks[0];
    box.innerHTML = `
      <ol class="st-strip">${j.stages.map((s) => `<li class="st ${s.status} ${s.ticked === s.checklist.length ? 'full' : ''} ${open?.id === s.id ? 'open' : ''}">
        <button data-act="stage" data-v="${s.id}" aria-expanded="${open?.id === s.id}" title="${s.ticked} of ${s.checklist.length} documents ticked">
          <span class="st-dot">${s.status === 'done' || s.ticked === s.checklist.length ? '✓' : ''}</span>
          <span class="st-t"><b>${esc(s.title)}</b>${s.status === 'now' ? '<small>You are here</small>' : ''}</span>
          ${flag(s) ? `<i class="st-flag ${flag(s)}" title="${flag(s) === 'bad' ? 'Something to fix' : 'Something to watch'}"></i>` : ''}
        </button></li>`).join('')}</ol>
      ${open ? stagePanel(open, j.current) : lead ? `<button class="st-lead ${lead.tone}" data-act="stage" data-v="${now.id}"><b>${esc(now.title)}:</b> ${esc(lead.title)}<span>Open</span></button>` : ''}`;
    const strip = box.querySelector('.st-strip'); const at = box.querySelector('.st.now');
    if (strip && at && strip.scrollWidth > strip.clientWidth) strip.scrollLeft = at.offsetLeft - strip.clientWidth / 2 + at.offsetWidth / 2;
  }
  function stagePanel(s, current) {
    const chips = s.prompts.map((id) => PROMPTS.find((x) => x.id === id)).filter(Boolean);
    return `<div class="st-panel card">
      <div class="st-ph"><div><h3>${esc(s.title)}</h3><span class="small muted">${esc(s.when)}</span></div>
        <div class="st-pa">${s.id === current ? '<span class="st-here">You are here</span>' : `<button class="btn small" data-act="set-stage" data-v="${s.id}">I’m here now</button>`}<button class="x" data-act="stage" data-v="" aria-label="Close">✕</button></div></div>
      <div class="st-grid">
        <div><h4>What this means for you</h4>${s.checks.length ? s.checks.map((c) => `<div class="chk ${c.tone}">${TONE[c.tone] ? `<span class="chk-t">${TONE[c.tone]}</span>` : ''}<b>${esc(c.title)}</b><p>${esc(c.text)}</p></div>`).join('') : '<p class="hint">Add your university and offers to see checks here.</p>'}</div>
        <div><h4>Keep these ready <span class="muted">${s.ticked} of ${s.checklist.length}</span></h4>
          <div class="st-bar"><i style="width:${s.checklist.length ? Math.round((s.ticked / s.checklist.length) * 100) : 0}%"></i></div>
          <ul class="docs">${s.checklist.map((c) => `<li><label><input type="checkbox" data-check="${c.key}" data-label="${esc(c.label)}" ${c.done ? 'checked' : ''}><span>${esc(c.label)}</span></label></li>`).join('')}</ul></div>
        <div><h4>Let Claude help</h4><p class="hint" style="margin-top:0">Copy a request and paste it into Claude.</p>
          ${chips.map((x) => { const t = fillPrompt(x.text, cur.plan); return `<button class="st-prompt" data-act="copy" data-text="${esc(t)}"><b>${esc(x.title)}</b><small>${esc(x.when)}</small><span>Copy</span></button>`; }).join('')}</div>
      </div></div>`;
  }


  // ----- the guided journey: one step at a time -----
  const STEPS = () => LL.JOURNEY_STAGES;
  const stepIdx = (id) => STEPS().findIndex((x) => x.id === id);
  const chosenId = () => (cur.comp?.offers.some((o) => o.id === cur.plan.chosen_offer_id) ? cur.plan.chosen_offer_id : recId());
  function startDate() {
    const m = /(fall|autumn|spring|summer|winter)\D*(\d{4})/i.exec(cur.plan.intake || '');
    if (!m) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + 9); return d; }
    return new Date(Number(m[2]), ({ fall: 7, autumn: 8, spring: 0, summer: 4, winter: 0 })[m[1].toLowerCase()], 1);
  }
  const monthYear = (d) => d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const UNI = (name) => LL.UNIVERSITIES.find((u) => u.university === name);
  const shortlistOf = (p) => { const l = [...(p.shortlist || [])]; if (p.university && !l.includes(p.university)) l.unshift(p.university); return l; };

  function gate(id) {
    const p = cur.plan; const d = p.checklist || {};
    if (id === 'shortlist' && !p.university) return 'Pick the college you’ll join first.';
    if (id === 'admit' && !(d.admit_letter && (d.i20 || d.cas))) return 'Tick your admit letter and I-20 first. Claude can do it for you after reading them.';
    if (id === 'admit' && !p.costs.length) return 'Add your college’s costs first.';
    if (id === 'finance' && p.funds.savings_inr == null) return 'Tell us how much your family can pay first.';
    if (id === 'offers' && !p.offers.length) return 'Add at least one loan offer first.';
    if (id === 'compare' && !p.chosen_offer_id) return 'Choose one loan first.';
    if (id === 'save' && !p.saved_at) return 'Save your plan first.';
    return null;
  }
  const NEXT_LABEL = { shortlist: 'Finalise my college', admit: 'Admission done, go to my money', finance: 'See my loan offers', offers: 'Compare my offers', compare: 'Continue', save: 'See my repayment plan', repay: 'Go to sanction and visa', sanction: 'Get ready to study', study: '' };

  function renderWiz() {
    const p = cur.plan;
    if (complete(p)) recompute();
    const steps = STEPS(); const reached = stepIdx(LL.inferStage(p)); const vi = stepIdx(cur.view);
    let j = null; try { j = LL.journey(p, complete(p) ? chosenId() : undefined); } catch (err) { console.error(err); }
    document.getElementById('wnav').innerHTML = `<ol>
      <li class="done"><span class="wn">✓</span><span class="wt">Create your plan</span></li>
      ${steps.map((st, i) => { const state = i < reached ? 'done' : i === reached ? 'now' : 'locked'; return `<li class="${state}${i === vi ? ' view' : ''}"><button data-act="goto" data-v="${st.id}" ${state === 'locked' ? 'disabled aria-disabled="true"' : ''} ${i === vi ? 'aria-current="step"' : ''}><span class="wn">${state === 'done' ? '✓' : i + 2}</span><span class="wt">${esc(st.title)}${state === 'locked' ? '<small>Locked</small>' : state === 'now' ? '<small>You are here</small>' : ''}</span></button></li>`; }).join('')}</ol>`;
    const st = steps[vi]; const sj = j?.stages.find((x) => x.id === st.id);
    const body = (STEP_BODY[st.id] || (() => ''))(sj);
    const last = vi === steps.length - 1;
    document.getElementById('wmain').innerHTML = `
      <div class="step-h"><span class="step-n">Step ${vi + 2} of ${steps.length + 1}</span><h2>${esc(st.title)}</h2><p>${esc(st.when)}</p></div>
      ${body}
      ${aux(sj, st.id)}
      <div class="step-foot">${vi > 0 ? `<button class="btn" data-act="goto" data-v="${steps[vi - 1].id}">Back</button>` : '<span></span>'}
        ${last ? '<span class="done-note">That’s everything. Have a great start to your course!</span>' : st.id === 'compare' || st.id === 'save' ? '' : `<button class="btn primary" data-act="next">${NEXT_LABEL[st.id]}</button>`}</div>`;
    if (document.getElementById('sugg')) drawSugg();
    renderInputs();
    if (complete(p)) { if (cur.view === 'repay' || !cur.comp.offers.some((o) => o.id === cur.sel)) cur.sel = chosenId(); renderWhatIf(); fillOutput(); }
    document.querySelectorAll('details.offer-in').forEach((d) => d.addEventListener('toggle', () => { if (d.open) cur.openOffer = d.dataset.offer; else if (cur.openOffer === d.dataset.offer) cur.openOffer = null; }));
  }

  function checksBlock(sj) {
    if (!sj?.checks.length) return '';
    return `<div class="checks">${sj.checks.map((c) => `<div class="chk ${c.tone}">${TONE[c.tone] ? `<span class="chk-t">${TONE[c.tone]}</span>` : ''}<b>${esc(c.title)}</b><p>${esc(c.text)}</p></div>`).join('')}</div>`;
  }
  function aux(sj, id) {
    if (!sj) return '';
    const chips = sj.prompts.map((x) => PROMPTS.find((y) => y.id === x)).filter(Boolean);
    const docs = sj.checklist.length ? `<div class="aux-b"><h4>Keep these ready <span class="muted">${sj.ticked} of ${sj.checklist.length}</span></h4>
      <div class="st-bar"><i style="width:${Math.round((sj.ticked / sj.checklist.length) * 100)}%"></i></div>
      <ul class="docs">${sj.checklist.map((c) => `<li><label><input type="checkbox" data-check="${c.key}" data-label="${esc(c.label)}" ${c.done ? 'checked' : ''}><span>${esc(c.label)}</span></label></li>`).join('')}</ul></div>` : '';
    const ask = chips.length ? `<div class="aux-b"><h4>Let Claude help</h4><p class="hint" style="margin-top:0">Copy a request and paste it into Claude${id === 'admit' || id === 'offers' ? ' with your documents attached' : ''}.</p>
      ${chips.map((x) => { const t = fillPrompt(x.text, cur.plan); return `<button class="st-prompt" data-act="copy" data-text="${esc(t)}"><b>${esc(x.title)}</b><small>${esc(x.when)}</small><span>Copy</span></button>`; }).join('')}</div>` : '';
    return docs || ask ? `<div class="aux${docs && ask ? '' : ' one'}">${docs}${ask}</div>` : '';
  }

  const STEP_BODY = {
    shortlist(sj) {
      const p = cur.plan; const list = shortlistOf(p);
      return `<div class="card pad">
        <div class="search"><input id="uq" placeholder="Add a college: Purdue, Toronto, TU Munich…" autocomplete="off" aria-label="Search universities" value="${esc(cur.uq)}"></div>
        <div class="sugg" id="sugg"></div>
        <div class="slist">${list.map((name) => { const u = UNI(name); const mine = p.university === name; return `<div class="sitem${mine ? ' mine' : ''}">
          <div><b>${esc(name)}</b><small>${u ? `${esc(u.program)}, ${esc(u.city)}, ${esc(u.country)}. ${u.duration_months} months.` : 'Added by you'}</small></div>
          <div class="sact"><button class="linkbtn2" data-act="copy" data-text="${esc(fillPrompt(PROMPTS.find((x) => x.id === 'course-deep').text, { ...p, university: name, program: u?.program || p.program }))}">Ask Claude about it</button>
            ${mine ? '<span class="mine-tag">My college</span>' : `<button class="btn small" data-act="make-final" data-v="${esc(name)}">Make this my college</button>`}
            <button class="x" data-act="remove-short" data-v="${esc(name)}" aria-label="Remove ${esc(name)}">✕</button></div></div>`; }).join('') || '<p class="hint">Add the colleges you’re applying to. Then use Claude to compare them and pick one.</p>'}</div>
      </div>${checksBlock(sj)}`;
    },
    admit(sj) { return `<div class="card pad"><aside class="inputs flat" id="inputs"></aside></div>${checksBlock(sj)}`; },
    finance(sj) { return `${checksBlock(sj)}<div class="card pad"><aside class="inputs flat" id="inputs"></aside></div>`; },
    offers(sj) { return `<div class="card pad"><aside class="inputs flat" id="inputs"></aside></div>${complete(cur.plan) ? checksBlock(sj) : ''}`; },
    compare() {
      if (!complete(cur.plan)) return '<div class="card pad"><p>Add a loan offer first.</p></div>';
      const rec = offerC(recId());
      return `<section class="card pad"><div class="sec-h"><h3>All your offers side by side</h3><span class="small muted">Cheapest first</span></div><div id="bars" class="cmp"></div>
        <p class="hint mt12"><b>Total by the end</b> is your own money plus every EMI and fee. <b>Extra if things go badly</b> is how much more you’d pay if the rupee weakens and interest rates rise, like in the worst past years.</p></section>
        <div class="pick-note"><b>Our pick is ${esc(rec.lender)}.</b> ${esc(whyText())}</div>
        <details class="card pad wi-d"><summary>Try a different situation</summary><div id="whatif"></div></details>`;
    },
    save() {
      if (!complete(cur.plan)) return '<div class="card pad"><p>Choose a loan first.</p></div>';
      const p = cur.plan;
      return `<section class="ans" id="ans"></section>
        <div class="save-bar">${p.saved_at ? `<span class="saved">Saved ${ago(p.saved_at)}</span><button class="btn" data-act="share">Share with family</button><button class="btn primary" data-act="next">See my repayment plan</button>` : `<span class="hint" style="margin:0">Happy with this? Save it. You can still change things later.</span><button class="btn primary" data-act="save-plan">Save my plan</button>`}</div>`;
    },
    repay(sj) {
      if (!complete(cur.plan)) return '';
      const p = cur.plan; const c = offerC(chosenId());
      const D = p.duration_months || 24, M = c.moratorium_months, close = c.months_to_close;
      const at = (m) => { const d = startDate(); d.setMonth(d.getMonth() + m); return monthYear(d); };
      const pr = parts(c);
      const rows = [
        ['While you study', `${D} months`, c.moratorium_mode === 'pay' ? `You pay about ${inr(c.monthly_interest_during_study_inr)} a month in interest.` : `No payments. About ${lakh(c.capitalised_interest_inr)} of interest gets added to your loan.`],
        ...(M > D ? [['Break after the course', `${M - D} months`, 'Time to find a job. Still no EMI.']] : []),
        ['First EMI', at(M), `${esc(c.lender)} starts taking EMIs.`],
        ['EMI', `${inr(c.emi_inr)} a month`, c.affordability?.emi_share_pct != null ? `About ${Math.round(c.affordability.emi_share_pct)}% of your take-home salary.` : 'Add your expected salary in step 4 to check if this is comfortable.'],
        ['You repay for', yrs(close), `The loan closes in ${at(M + close)}.`],
        ['Total interest', lakh(pr.interest), `On the ${lakh(pr.borrowed)} you borrow.`],
      ];
      const A = p.assumptions;
      return `<section class="card pad"><div class="sec-h"><h3>${esc(c.lender)}</h3><span class="small muted">${c.rate_pct}% interest${c.rate_type === 'floating' ? ', can change with RBI rates' : ', fixed'}</span></div>
        <dl class="rplan">${rows.map(([k, v, d]) => `<div><dt>${k}</dt><dd><b>${v}</b><span>${d}</span></dd></div>`).join('')}</dl>
        <div class="wi mt16"><div class="wi-l">Pay extra each month once you have a job?</div>
          <div class="presets">${[0, 10000, 25000, 50000].map((v) => `<button class="preset${(A.prepay_monthly_inr || 0) === v ? ' on' : ''}" data-act="prepay" data-v="${v}">${v ? `₹${v.toLocaleString('en-IN')}` : 'No'}</button>`).join('')}</div></div></section>
        <section class="card pad tl" id="journey"></section>
        ${checksBlock(sj)}`;
    },
    sanction(sj) { return checksBlock(sj); },
    study(sj) { return checksBlock(sj); },
  };

  function whyText() {
    const { comp } = cur; const rec = offerC(recId()); const todayBest = offerC(comp.best_offer_id);
    const others = comp.offers.filter((o) => o.id !== rec.id).map((o) => ({ o, t: typical(o.id) })).sort((a, b) => a.t - b.t);
    if (!others.length) return 'It’s your only offer so far.';
    const base = `By the end, it costs ${lakh(others[0].t - typical(rec.id))} less than ${nm(others[0].o.lender)}.`;
    const safe = comp.offers.map((o) => ({ o, b: typical(o.id) + badExtra(o.id) })).sort((a, b) => a.b - b.b)[0].o;
    const tail = safe.id !== rec.id ? ` If things go badly, ${nm(safe.lender)} would cost less, so pick it if you’d rather play safe.` : '';
    return (todayBest && todayBest.id !== rec.id ? `${base} ${nm(todayBest.lender)} looks cheaper if nothing changes, but we checked every start month since 2001 and ${nm(rec.lender)} usually came out cheaper.` : base) + tail;
  }

  // ----- left: the three questions -----
  const srcTag = (x) => x?.edited && Object.keys(x.edited).length ? '<span class="src you">edited</span>' : x?.source === 'claude' ? '<span class="src claude">from Claude</span>' : '';
  function renderInputs() {
    const p = cur.plan; const f = p.funds;
    let coa = null; try { coa = p.costs.length ? LL.computePlan(p).coa_today_inr : null; } catch { /* none */ }
    const showSearch = !p.university || cur.picking;
    const el = document.getElementById('inputs'); if (!el) return;
    const need = (() => { try { const c = LL.computePlan(p); return Math.max(0, c.coa_today_inr - c.scholarship_inr - (f.savings_inr || 0)); } catch { return null; } })();
    const sec = {
      admit: `<div class="q"><div class="q-h">Your college and its costs</div>
        ${showSearch ? `<div class="search"><input id="uq" placeholder="Search: Purdue, Toronto, TU Munich…" autocomplete="off" aria-label="Search universities" value="${esc(cur.uq)}"></div>
          <div class="sugg" id="sugg"></div>
          <p class="hint"><button class="linkbtn2" data-act="manual-uni">Not listed?</button>${p.university ? ' <button class="linkbtn2" data-act="cancel-pick">Cancel</button>' : ''}</p>`
        : `<div class="picked"><div><b>${esc(p.university)}</b><span>${coa ? `${lakh(coa)} for ${p.duration_months || 24} months, from ${p.costs.some((c) => c.source === 'claude') ? 'your I-20' : 'our data'}` : 'Add the costs below'}</span></div><button class="btn small" data-act="toggle-costs">${cur.costsOpen ? 'Hide costs' : 'See costs'}</button></div>
          ${cur.costsOpen ? costsEditor() : ''}`}
      </div>`,
      finance: `<div class="q"><div class="q-h">How much can your family pay from savings?</div>
        <div class="money-in"><span>₹</span><input type="number" min="0" step="50000" data-fund="savings_inr" value="${f.savings_inr ?? ''}" placeholder="15,00,000" aria-label="Family savings in rupees"></div>
        <p class="hint">${f.savings_inr ? `${lakh(f.savings_inr)} from savings for this degree.` : 'Money your family has set aside for this degree.'}</p></div>
      <div class="q"><div class="q-h">Do you have a scholarship?</div>
        <div class="inline"><select data-fund-ccy aria-label="Scholarship currency">${['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'INR'].map((x) => `<option ${x === (f.scholarship_currency || p.currency || 'USD') ? 'selected' : ''}>${x}</option>`).join('')}</select><input type="number" min="0" step="500" data-fund="scholarship" value="${f.scholarship || ''}" placeholder="0" aria-label="Scholarship amount"></div>
        <p class="hint">Total for the whole course. Leave it empty if you don’t have one.</p></div>
      <div class="q"><div class="q-h">How much do you want to borrow?</div>
        <div class="money-in"><span>₹</span><input type="number" min="0" step="100000" data-fund="loan_need_inr" value="${f.loan_need_inr ?? ''}" placeholder="${need != null ? Math.round(need / 1e5) * 1e5 : ''}" aria-label="Loan you need in rupees"></div>
        <p class="hint">${need != null ? `Your degree costs ${lakh(coa)}. After savings${f.scholarship ? ' and scholarship' : ''}, you need about <b>${lakh(need)}</b>.` : 'Add your college first.'}</p></div>
      <div class="q"><div class="q-h">What salary do you expect after the course? <span class="muted small">(optional)</span></div>
        <div class="inline"><select data-a="salary_currency" aria-label="Salary currency">${['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'INR'].map((x) => `<option ${x === (p.assumptions.salary_currency || p.currency || 'USD') ? 'selected' : ''}>${x}</option>`).join('')}</select><input type="number" min="0" step="1000" data-a="expected_salary" value="${p.assumptions.expected_salary ?? ''}" placeholder="Per year, before tax" aria-label="Expected salary per year"></div>
        <p class="hint">We use this to check if the EMI is comfortable.</p></div>`,
      offers: `<div class="q"><div class="q-h">Your loan offers</div>
        ${p.offers.map((o, i) => offerEditor(o, i)).join('') || '<p class="hint" style="margin-top:0">No offers yet. Ask Claude to read your sanction letters, or add one below.</p>'}
        <select class="add-offer" data-add-lender aria-label="Add a loan offer"><option value="">+ Add a loan offer</option>${LL.LENDERS.map((l, i) => `<option value="${i}">${esc(l.lender)} (${l.rate_min}${l.rate_max ? `–${l.rate_max}` : '+'}%)</option>`).join('')}<option value="-1">Another lender</option></select>
        <p class="hint">We fill in the bank’s published terms. Change them to match your letter.</p></div>`,
    };
    el.innerHTML = sec[cur.view] || '';
    if (showSearch) drawSugg();
    document.querySelectorAll('details.offer-in').forEach((d) => d.addEventListener('toggle', () => { if (d.open) cur.openOffer = d.dataset.offer; else if (cur.openOffer === d.dataset.offer) cur.openOffer = null; }));
  }

  function offerEditor(o, i) {
    const n = (k, label, step = 'any') => `<label class="f"><span>${label}${o.edited?.[k] ? ' ●' : ''}</span><input type="number" step="${step}" value="${o[k] ?? ''}" data-o="${o.id}" data-f="${k}"></label>`;
    const s = (k, label, opts) => `<label class="f"><span>${label}${o.edited?.[k] ? ' ●' : ''}</span><select data-o="${o.id}" data-f="${k}">${opts.map(([v, l]) => `<option value="${v}" ${String(o[k] ?? opts[0][0]) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
    const amt = o.currency === 'USD' ? `$${Math.round(o.amount || 0).toLocaleString('en-IN')}` : lakh(o.amount || 0);
    return `<details class="offer-in" data-offer="${o.id}" ${cur.openOffer === o.id ? 'open' : ''}>
      <summary><span class="odot" style="background:${COLORS[i % COLORS.length]}"></span><span class="oname"><b>${esc(o.lender)}</b><small>${amt} at ${o.rate_pct ?? '?'}% ${srcTag(o)}</small></span><span class="oedit">Edit</span></summary>
      <div class="ofields">
        <label class="f wide"><span>Lender</span><input value="${esc(o.lender)}" data-o="${o.id}" data-f="lender"></label>
        <label class="f"><span>Amount${o.edited?.amount ? ' ●' : ''}</span><input type="number" step="10000" value="${o.amount ?? ''}" data-o="${o.id}" data-f="amount"></label>
        ${s('currency', 'Currency', [['INR', 'INR'], ['USD', 'USD']])}
        ${n('rate_pct', 'Interest rate %', '0.05')}
        ${s('rate_type', 'Rate type', [['floating', 'Floating'], ['fixed', 'Fixed']])}
        ${n('processing_fee_pct', 'Processing fee %', '0.05')}
        ${n('margin_pct', 'Margin money %', '1')}
        ${s('moratorium_interest', 'Interest while studying', [['simple', 'Added to loan'], ['compound', 'Added, compounding'], ['pay', 'Paid monthly']])}
        ${n('moratorium_months', 'Months to first EMI', '1')}
        ${n('tenure_years', 'Repay over (years)', '1')}
        <button class="linkbtn2 danger" data-act="remove-offer" data-id="${o.id}">Remove this offer</button>
      </div></details>`;
  }

  const FREQ = [['per_year', '/ year'], ['per_semester', '/ sem'], ['per_month', '/ month'], ['one_time', 'once']];
  const CCYS = ['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'INR'];
  function itemInr(item) {
    const p = cur.plan;
    return LL.costFlows({ ...p, costs: [item] }).reduce((t, f) => t + f.amount * (f.currency === 'INR' ? 1 : (p.fx_rates?.[f.currency] || LL.SPOT[f.currency])), 0);
  }
  function costsEditor() {
    const p = cur.plan;
    return `<div class="costs-ed">${p.costs.map((c) => `<div class="cline">
      <input class="cl" value="${esc(c.label)}" data-c="${c.id}" data-f="label" aria-label="Cost name">
      <div class="cl2"><input type="number" step="any" value="${c.amount}" data-c="${c.id}" data-f="amount" aria-label="Amount"><select data-c="${c.id}" data-f="currency" aria-label="Currency">${CCYS.map((x) => `<option ${x === (c.currency || p.currency) ? 'selected' : ''}>${x}</option>`).join('')}</select><select data-c="${c.id}" data-f="frequency" aria-label="How often">${FREQ.map(([v, l]) => `<option value="${v}" ${v === c.frequency ? 'selected' : ''}>${l}</option>`).join('')}</select><b>${lakh(itemInr(c))}</b><button class="x" data-act="remove-cost" data-id="${c.id}" aria-label="Remove ${esc(c.label)}">✕</button></div></div>`).join('')}
      <button class="linkbtn2" data-act="add-cost">+ Add a cost</button></div>`;
  }

  function drawSugg() {
    const box = document.getElementById('sugg'); if (!box) return;
    const q = cur.uq.toLowerCase().trim();
    const list = LL.UNIVERSITIES.map((u, i) => ({ u, i })).filter(({ u }) => !q || u.university.toLowerCase().includes(q) || u.city.toLowerCase().includes(q) || u.country.toLowerCase().includes(q)).sort((a, b) => a.u.total_today_inr_lakh - b.u.total_today_inr_lakh).slice(0, q ? 8 : 5);
    const sl = cur.view === 'shortlist';
    if (sl && !q) { box.innerHTML = ''; return; }
    box.innerHTML = (q ? '' : '<div class="sugg-h">Popular</div>') + (list.filter(({ u }) => !sl || !shortlistOf(cur.plan).includes(u.university)).map(({ u, i }) => `<button class="sugg-i" data-act="${sl ? 'add-short' : 'pick-uni'}" data-i="${i}"><span><b>${esc(u.university)}</b><small>${esc(u.program)}, ${esc(u.city)}, ${esc(u.country)}</small></span>${sl ? '<em class="add">+ Add</em>' : `<b>${lakh(u.total_today_inr_lakh * 1e5)}</b>`}</button>`).join('') || '<p class="hint">No match. Try another name.</p>');
  }

  function pickUni(u) {
    const p = cur.plan;
    const d = COUNTRY_DEFAULTS[u.country] || COUNTRY_DEFAULTS['United States'];
    const D = u.duration_months;
    Object.assign(p, { university: u.university, country: u.country, city: u.city, program: u.program, duration_months: D, currency: u.living_currency, title: `${u.program}, ${u.university.replace(/^The /, '')}` });
    p.costs = [
      { id: uid(), label: 'Tuition and fees', category: 'tuition', amount: Math.round(u.tuition_total / (D / 12)), currency: u.tuition_currency, frequency: 'per_year', source: 'data' },
      { id: uid(), label: 'Living costs', category: 'living', amount: Math.round(u.living_per_month), currency: u.living_currency, frequency: 'per_month', source: 'data' },
      { id: uid(), label: d.ins[2], category: 'insurance', amount: d.ins[0], currency: d.ins[1], frequency: 'per_year', source: 'data' },
      { id: uid(), label: d.visa[2], category: 'visa', amount: d.visa[0], currency: d.visa[1], frequency: 'one_time', source: 'data' },
      { id: uid(), label: 'Flights', category: 'travel', amount: d.flight, currency: 'INR', frequency: 'one_time', source: 'data' },
      { id: uid(), label: 'Laptop and setting up', category: 'other', amount: 60000, currency: 'INR', frequency: 'one_time', source: 'data' },
    ];
    delete p.fx_rates;
    cur.picking = false; cur.uq = '';
    toast(`We added typical costs for ${u.university}.`);
    commit(`Chose ${u.university}; added typical costs`);
  }

  function lenderDefaults(l, p) {
    const num = (s) => { const m = String(s || '').match(/([\d.]+)\s*%/); return m ? Number(m[1]) : 0; };
    const flat = (s) => { const m = String(s || '').match(/Rs\s*([\d,]+)/i); return m && !/%/.test(s) ? Number(m[1].replace(/,/g, '')) : 0; };
    const intl = /international/i.test(l.type);
    const D = p.duration_months || 24;
    let need = 0; try { const c = LL.computePlan(p); need = Math.max(0, c.coa_today_inr - c.scholarship_inr - (p.funds.savings_inr || 0)); } catch { /* none */ }
    if (p.funds.loan_need_inr) need = p.funds.loan_need_inr;
    return {
      id: uid(), lender: l.lender, lender_type: l.type, currency: intl ? 'USD' : 'INR',
      amount: intl ? Math.round(need / LL.SPOT.USD / 1000) * 1000 || 50000 : Math.round(need / 500000) * 500000 || 5000000,
      rate_pct: l.rate_min, rate_type: intl ? 'fixed' : 'floating', benchmark: l.benchmark,
      processing_fee_pct: flat(l.processing_fee) ? 0 : num(l.processing_fee), processing_fee_flat: flat(l.processing_fee), fee_capitalised: /capitali/i.test(l.processing_fee),
      margin_pct: num(l.margin_money), moratorium_months: D + 6, moratorium_interest: intl ? 'compound' : 'simple',
      tenure_years: /PSU/.test(l.type) ? 15 : intl ? 10 : 12, source: 'manual', edited: {},
    };
  }

  // ----- right: the answer -----
  function renderOutput() {
    const p = cur.plan; const out = document.getElementById('output');
    killCharts();
    if (!complete(p)) {
      const steps = [[!!p.university, 'Pick your university'], [p.funds.savings_inr != null, 'Add what your family can pay'], [p.offers.length > 0, 'Add at least one loan offer']];
      out.innerHTML = `<div class="card pad empty-ans">
        <div class="eyebrow2">Your answer will appear here</div>
        <h2>Which loan really costs least?</h2>
        <p class="sub">Banks compete on interest rate. Families pay much more than the rate suggests. We add up every rupee, test it against 25 years of rupee and RBI history, and name the cheapest offer.</p>
        <ul class="todo">${steps.map(([d, t]) => `<li class="${d ? 'ok' : ''}"><span>${d ? '✓' : ''}</span>${t}</li>`).join('')}</ul>
        <div class="example"><small>Example: one degree, three offers, total your family pays</small><div class="ex-row"><b>SBI, 10.15%</b><span style="width:76%"></span><em>₹1.88 Cr</em></div><div class="ex-row"><b>Credila, 11.25%</b><span style="width:78%"></span><em>₹1.93 Cr</em></div><div class="ex-row"><b>Prodigy, 12.15%</b><span style="width:100%"></span><em>₹2.46 Cr</em></div></div>
      </div>`;
      return;
    }
    const tab = cur.tab || 'compare';
    const TABS = [['compare', 'Compare loans'], ['whatif', 'What if'], ['time', 'Month by month'], ['details', 'Details']];
    out.innerHTML = `
      <section class="ans" id="ans"></section>
      <nav class="otabs" role="tablist">${TABS.map(([id, t]) => `<button role="tab" data-act="tab" data-v="${id}" aria-selected="${tab === id}">${t}</button>`).join('')}</nav>
      <section class="card pad" id="whatif" data-tab="whatif"></section>
      <section class="card pad" data-tab="compare whatif"><div class="sec-h"><h3>All your offers side by side</h3><span class="small muted">Cheapest first</span></div><div id="bars" class="cmp"></div>
        <p class="hint mt12"><b>Total by the end</b> is your own money plus every EMI and fee. <b>Extra if things go badly</b> is how much more you’d pay if the rupee weakens and rates rise like in the worst past years.</p></section>
      <section class="card pad tl" id="journey" data-tab="time"></section>
      <div class="more-list" id="more" data-tab="details"></div>`;
    showTab(tab);
    renderWhatIf(); fillOutput();
  }
  function showTab(tab) {
    cur.tab = tab;
    document.querySelectorAll('#output [data-tab]').forEach((el) => { el.hidden = !el.dataset.tab.split(' ').includes(tab); });
    document.querySelectorAll('.otabs [data-act=tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.v === tab)));
  }

  function fillOutput() {
    killCharts();
    renderAns(); renderBars(); renderJourney(); renderMore();
  }

  // Lender name as people say it: "SBI", "HDFC Credila", "Prodigy"
  const nm = (l) => String(l).replace(/ Global Ed-Vantage| Finance$/, '');
  const yrs = (m) => { const y = Math.round((m / 12) * 2) / 2; return `${y % 1 ? y.toFixed(1) : y} year${y === 1 ? '' : 's'}`; };
  const badExtra = (id) => Math.max(0, (offerR(id)?.all_in?.p90 || 0) - typical(id));

  function renderAns() {
    if (!document.getElementById('ans')) return;
    const { comp, plan } = cur;
    const rec = offerC(chosenId()); const pick = offerC(recId()); const isPick = rec.id === pick.id;
    const others = comp.offers.filter((o) => o.id !== rec.id).map((o) => ({ o, t: typical(o.id) })).sort((a, b) => a.t - b.t);
    const next = others[0];
    const todayBest = offerC(comp.best_offer_id);
    const shock = plan.assumptions.fx_shock_pct || 0;
    const pr = parts(rec);
    const own = rec.family_arranges_inr, save = comp.savings_inr;
    const grace = Math.max(0, rec.moratorium_months - (plan.duration_months || 24));
    const extra = badExtra(rec.id);
    const safer = shock ? null : comp.offers.map((o) => ({ o, b: typical(o.id) + badExtra(o.id) })).sort((a, b) => a.b - b.b).map((x) => x.o).find((o, i) => i === 0 && o.id !== rec.id) || null;
    const why = shock ? `With the rupee ${shock}% weaker, ${esc(nm(rec.lender))} still costs you the least overall.`
      : todayBest && todayBest.id !== rec.id ? `${esc(nm(todayBest.lender))} has a lower total if nothing changes. But its rate or currency is riskier. We checked how all your offers would have worked out for students who started in every month since 2001, and ${esc(nm(rec.lender))} usually came out cheaper.`
      : `It has the lowest total of all your offers, and it stayed the cheapest when we checked how it would have worked out for students who started in every month since 2001.`;
    document.getElementById('ans').innerHTML = `
      <div class="eyebrow">Your loan${isPick ? ', also our pick' : ''}${shock ? `, if the rupee gets ${shock}% weaker` : ''}</div>
      <p class="say-big">${esc(rec.lender)}</p>
      <p class="say">${!isPick ? `By the end, this costs <b>${lakh(typical(rec.id) - typical(pick.id))} more</b> than ${esc(nm(pick.lender))}, our pick. You can change your choice in step 6.` : next ? `It’s the cheapest of your ${comp.offers.length} offers. By the end, you pay <b>${lakh(next.t - typical(rec.id))} less</b> than with ${esc(nm(next.o.lender))}.` : 'This is your only offer so far.'}</p>
      <ol class="ans-steps">
        <li><span>Before and during the course, from your own money</span><b>${lakh(own)}</b><em>${own > save ? `You have ${lakh(save)} saved, so you need to arrange <strong>${lakh(own - save)} more</strong>.` : `Your savings of ${lakh(save)} cover this.`} This is the part of the costs the loan doesn’t pay, plus the bank’s fees.</em></li>
        <li><span>Borrowed from ${esc(nm(rec.lender))}</span><b>${lakh(pr.borrowed)}</b><em>The bank pays the university directly, one semester at a time.</em></li>
        <li><span>Your EMI after the course</span><b>${inr(rec.emi_inr)}<small> a month</small></b><em>Starts ${grace ? `${grace} months after you finish` : 'right after you finish'} and runs for ${yrs(rec.months_to_close)}.</em></li>
        <li class="total"><span>Total you’ll have paid by the end</span><b>${lakh(typical(rec.id))}</b><em>Your own money plus every EMI and fee. Of this, ${lakh(pr.interest)} is interest.</em></li>
      </ol>
      <details class="why-d"><summary>What if things go badly?</summary><p>If the rupee gets weaker and interest rates rise, as they did in the worst years since 2001, you could pay about <b>${lakh(extra)} more</b> in total. Keep some money aside for this.</p></details>
      ${isPick ? '' : '<!--'}<details class="why-d"><summary>Why ${esc(nm(rec.lender))}?</summary><p>${why}${safer ? ` One thing to know: if things go badly, ${esc(nm(safer.lender))} would cost less (${lakh(typical(safer.id) + badExtra(safer.id))} against ${lakh(typical(rec.id) + extra)}). If you’d rather play safe, pick ${esc(nm(safer.lender))}.` : ''}</p></details>${isPick ? '' : '-->'}`;
  }

  function renderBars() {
    if (!document.getElementById('bars')) return;
    const { comp } = cur;
    const rows = comp.offers.map((c) => ({ c, t: typical(c.id) })).sort((a, b) => a.t - b.t);
    const rec = recId(); const chosen = cur.plan.chosen_offer_id;
    document.getElementById('bars').innerHTML = `
      <div class="cmp-head"><span>Loan</span><span>EMI a month</span><span>Repay over</span><span>Total interest</span><span>Total by the end</span><span>Extra if things go badly</span><span></span></div>
      ${rows.map(({ c, t }) => `
      <div class="cmp-row${c.id === rec ? ' best' : ''}${c.id === chosen ? ' sel' : ''}">
        <span class="cl"><i style="background:${color(c.id)}"></i><b>${esc(c.lender)}</b><small>${c.rate_pct}% interest${c.currency !== 'INR' ? `, loan in ${c.currency}` : ''}. You pay ${lakh(c.family_arranges_inr)} yourself.</small>${c.id === rec ? '<em>Our pick</em>' : ''}</span>
        <span data-l="EMI a month">${inr(c.emi_inr)}</span>
        <span data-l="Repay over">${yrs(c.months_to_close)}</span>
        <span data-l="Total interest">${lakh(parts(c).interest)}</span>
        <span data-l="Total by the end"><b>${lakh(t)}</b>${c.id === rec ? '' : `<small class="up">${lakh(t - typical(rec))} more</small>`}</span>
        <span data-l="Extra if things go badly">+${lakh(badExtra(c.id))}</span>
        <span class="cc">${c.id === chosen ? '<span class="mine-tag">Chosen</span>' : `<button class="btn small${c.id === rec ? ' primary' : ''}" data-act="choose" data-id="${c.id}">Choose</button>`}</span>
      </div>`).join('')}`;
  }

  function renderWhatIf() {
    if (!document.getElementById('whatif')) return;
    const p = cur.plan; const A = p.assumptions;
    const st = LL.fxStats(p.currency || 'USD', p.duration_months || 24);
    const presets = [[0, 'No change'], [Math.round(st.p50 * 100), `Usual (${Math.round(st.p50 * 100)}%)`], [Math.round(st.p90 * 100), `Bad (${Math.round(st.p90 * 100)}%)`], [Math.round(st.worst * 100), `Worst ever (${Math.round(st.worst * 100)}%)`]];
    document.getElementById('whatif').innerHTML = `
      <div class="sec-h"><h3>Try a different situation</h3><button class="linkbtn2" data-act="reset-whatif">Reset</button></div>
      <p class="hint" style="margin:-4px 0 14px">Change any of these and every number on this page updates.</p>
      <div class="wi-grid">
        <div class="wi"><div class="wi-l">What if the rupee gets weaker? <b id="shock-out">${A.fx_shock_pct || 0}%</b></div>
          <input type="range" min="0" max="40" step="1" value="${A.fx_shock_pct || 0}" data-a="fx_shock_pct" aria-label="Rupee fall, percent">
          <div class="presets">${presets.map(([v, l]) => `<button class="preset${(A.fx_shock_pct || 0) === v ? ' on' : ''}" data-act="preset" data-v="${v}">${l}</button>`).join('')}</div></div>
        <div class="wi"><div class="wi-l">Can your family pay the interest while you study?</div>
          <div class="seg"><button class="${A.pay_interest_during_study ? '' : 'on'}" data-act="pay-int" data-v="0">No</button><button class="${A.pay_interest_during_study ? 'on' : ''}" data-act="pay-int" data-v="1">Yes, every month</button></div></div>
        <div class="wi"><div class="wi-l">Will you pay extra each month once you have a job?</div>
          <div class="presets">${[0, 10000, 25000, 50000].map((v) => `<button class="preset${(A.prepay_monthly_inr || 0) === v ? ' on' : ''}" data-act="prepay" data-v="${v}">${v ? `₹${(v).toLocaleString('en-IN')}` : 'No'}</button>`).join('')}</div></div>
      </div>`;
  }
  function syncRail() {
    const A = cur.plan.assumptions;
    const out = document.getElementById('shock-out'); if (out) out.textContent = `${A.fx_shock_pct || 0}%`;
    document.querySelectorAll('.preset[data-act=preset]').forEach((b) => b.classList.toggle('on', Number(b.dataset.v) === (A.fx_shock_pct || 0)));
  }

  function renderJourney() {
    if (!document.getElementById('journey')) return;
    const { plan } = cur;
    const c = offerC(cur.sel);
    const D = plan.duration_months || 24, M = c.moratorium_months, close = c.months_to_close, end = M + close;
    const prepay = plan.assumptions.prepay_monthly_inr || 0;
    const pct = (m) => `${(m / end) * 100}%`;
    const m0 = Math.min(cur.tMonth ?? M + 12, end);
    document.getElementById('journey').innerHTML = `
      <div class="sec-h"><h3>${esc(short(c.lender))}, month by month</h3><span class="small muted">Drag the slider</span></div>
      <div class="tl-bar"><span class="seg s1" style="width:${pct(D)}">Studying</span><span class="seg s2" style="width:${pct(M - D)}" title="Job hunt, no EMI yet">${(M - D) / end > 0.07 ? 'Job hunt' : ''}</span><span class="seg s3" style="width:${pct(close)}">Repaying</span></div>
      <input type="range" id="tl" min="0" max="${end}" step="1" value="${m0}" aria-label="Month of the loan">
      <div class="tl-read" id="tl-read"></div>`;
    const read = (m) => {
      const bal = c.balance_curve_q[Math.min(Math.floor(m / 3), c.balance_curve_q.length - 1)] || 0;
      const phase = m < D ? 'Studying' : m < M ? 'Job hunt' : m < end ? 'Repaying' : 'Loan closed';
      const paidStudy = c.moratorium_mode === 'pay' ? c.monthly_interest_during_study_inr * Math.min(m, M) : 0;
      const paid = paidStudy + Math.max(0, Math.min(m, end) - M) * (c.emi_inr + prepay);
      const monthly = m < M ? (c.moratorium_mode === 'pay' ? c.monthly_interest_during_study_inr : 0) : m < end ? c.emi_inr + prepay : 0;
      const d = startDate(); d.setMonth(d.getMonth() + m);
      document.getElementById('tl-read').innerHTML = `
        <div><small>${d.toLocaleString('en-IN', { month: 'short', year: 'numeric' })}</small><b>${phase}</b></div>
        <div><small>You pay this month</small><b>${monthly ? inr(monthly) : '₹0'}</b></div>
        <div><small>You still owe</small><b>${lakh(m >= end ? 0 : bal)}</b></div>
        <div><small>Paid so far</small><b>${lakh(paid)}</b></div>`;
    };
    const tl = document.getElementById('tl');
    tl.addEventListener('input', () => { cur.tMonth = Number(tl.value); read(cur.tMonth); });
    read(m0);
  }

  const MORE = [
    ['money', 'Where does the money go?', () => `${lakh(parts(offerC(cur.sel)).interest)} of what you pay is interest`],
    ['afford', 'Can you afford the EMI?', () => { const a = offerC(cur.sel).affordability; return a ? `The EMI takes ${Math.round(a.emi_share_pct)}% of your monthly salary` : 'Add your expected salary to check'; }],
    ['risk', 'How likely is it to cost more?', () => `In about ${Math.max(1, Math.round(cur.risk.prob_cost_3l_over_plan * 10))} out of 10 past cases, costs went ₹3 lakh or more over plan`],
    ['activity', 'Who changed what?', () => `${cur.activity.length} updates`],
  ];
  function renderMore() {
    if (!document.getElementById('more')) return;
    const box = document.getElementById('more');
    box.innerHTML = MORE.map(([k, t, a]) => `<details class="card more-sec" data-sec="${k}" ${cur.openSec === k ? 'open' : ''}><summary><span><b>${t}</b><small>${esc(a())}</small></span><span class="chev" aria-hidden="true"></span></summary><div class="sec-body" id="sec-${k}"></div></details>`).join('');
    box.querySelectorAll('details.more-sec').forEach((d) => {
      const fill = () => { killCharts(); const el = d.querySelector('.sec-body'); ({ money: panelMoney, afford: panelAfford, risk: panelRisk, activity: panelActivity })[d.dataset.sec](el); };
      d.addEventListener('toggle', () => {
        if (d.open) { box.querySelectorAll('details.more-sec[open]').forEach((o) => { if (o !== d) o.open = false; }); cur.openSec = d.dataset.sec; fill(); }
        else if (cur.openSec === d.dataset.sec) cur.openSec = null;
      });
      if (d.open) fill();
    });
  }

  function whys(c) {
    const { comp } = cur;
    const r = offerR(c.id); const out = [];
    if (c.margin_pct > 0) out.push(['m', `${c.margin_pct}% margin money: family funds ${lakh(c.family_arranges_inr)} itself`]);
    if (c.currency !== 'INR' && r?.all_in) out.push(['m', `Repaid in ${c.currency}: as the rupee falls, the EMI rises`]);
    else if (c.rate_type === 'floating' && r?.emi_peak_p90 > c.emi_inr * 1.02) out.push(['m', `Floating rate: in past RBI hikes this EMI rose to ${inr(r.emi_peak_p90)}`]);
    if (c.rate_pct === Math.min(...comp.offers.map((o) => o.rate_pct))) out.push(['p', `Lowest interest rate (${c.rate_pct}%)`]);
    return out;
  }

  // --- tab: money ---
  function panelMoney(el) {
    const { comp } = cur;
    const sel = offerC(cur.sel); const p = parts(sel);
    const segs = [['family', 'Family pays now', '#13234a'], ['borrowed', 'Money borrowed', '#5f86d8'], ['studyInt', 'Interest while studying', '#e2a12b'], ['repayInt', 'Interest inside the EMIs', '#c2560f'], ['fees', 'Fees and GST', '#8a94a6']];
    el.innerHTML = `
      <div class="panel-head"><h2>Where does every rupee go?</h2>
        <p class="sub">One bar per loan: everything you pay until the last EMI. The orange parts are what the bank earns.</p></div>
      <div class="card pad"><div class="chart-box short"><canvas id="ch-money" aria-label="Breakdown of total payments per loan"></canvas></div>
        <div class="legend">${segs.map(([, l, c]) => `<span><i style="background:${c}"></i>${l}</span>`).join('')}</div></div>
      <div class="grid3 mt16">
        <div class="stat"><div class="v">${lakh(p.borrowed)}</div><div class="l">borrowed from ${esc(short(sel.lender))} becomes <b>${lakh(sel.total_payback_inr)}</b> repaid</div></div>
        <div class="stat risk"><div class="v">${lakh(p.interest)}</div><div class="l">total interest, ${Math.round((p.interest / p.borrowed) * 100)}% on top of what you borrow</div></div>
        <div class="stat"><div class="v">${lakh(p.studyInt)}</div><div class="l">of that piles up during the course, before the first EMI</div></div>
      </div>
      <div class="explain good mt16"><span class="i">✓</span><div><b>Pay less:</b> pay interest monthly while studying, so it doesn’t pile up. Try it on the right${sel.moratorium_mode === 'pay' ? ' (it’s on)' : ''}. SBI also cuts the rate when you do.</div></div>`;
    if (!window.Chart) return;
    const offers = comp.offers;
    charts.push(new Chart(document.getElementById('ch-money'), {
      type: 'bar',
      data: { labels: offers.map((o) => short(o.lender)), datasets: segs.map(([k, l, c]) => ({ label: l, data: offers.map((o) => parts(o)[k] / 1e5), backgroundColor: c, borderWidth: 0, barThickness: 34 })) },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${lakh(x.parsed.x * 1e5)}`, footer: (items) => `Total: ${lakh(items.reduce((t, i) => t + i.parsed.x, 0) * 1e5)}` } } },
        scales: { x: { stacked: true, grid: { color: '#edf0f5' }, ticks: { callback: (v) => `₹${v}L`, color: '#7a869b' } }, y: { stacked: true, grid: { display: false }, ticks: { color: '#0f1b33', font: { weight: 600, size: 13 } } } } },
    }));
  }

  // --- tab: risk ---
  function panelRisk(el) {
    const { plan, risk, comp } = cur;
    const ccy = plan.currency || 'USD';
    const rate = plan.fx_rates?.[ccy] || LL.SPOT[ccy];
    const st = LL.fxStats(ccy, plan.duration_months || 24);
    el.innerHTML = `
      <div class="panel-head"><h2>What if the rupee falls while ${esc(first(plan.student))} studies?</h2>
        <p class="sub">Fees and rent are in ${esc(ccy)}. Your money is in rupees. We replayed what the rupee did after every month since 2001 (${risk.windows} start dates).</p></div>
      <div class="grid3">
        <div class="stat risk"><div class="v">${pctf(risk.prob_cost_3l_over_plan)}</div><div class="l">chance the degree costs ₹3 lakh or more above today’s estimate</div></div>
        <div class="stat"><div class="v">+${lakh(risk.extra_vs_today.p50)}</div><div class="l">extra cost in a typical path. In a bad case: <b style="color:var(--risk)">+${lakh(risk.extra_vs_today.p90)}</b></div></div>
        <div class="stat good"><div class="v">${lakh(risk.recommended_buffer_inr)}</div><div class="l">suggested safety buffer to keep aside, beyond the typical case</div></div>
      </div>
      <div class="card pad mt16"><h3>How much you will have spent, month by month</h3>
        <p class="sub small">Dark line: your plan at ₹${rate.toFixed(2)} per ${esc(ccy)}. Orange band: what history produced. Dashed: typical.</p>
        <div class="chart-box mt12"><canvas id="ch-fan" aria-label="Range of cumulative spending in rupees"></canvas></div></div>
      <div class="grid2 mt16">
        <div class="card pad"><h3>The rupee against the ${esc(ccy)}</h3>
          <div class="kv mt12" style="display:grid;grid-template-columns:1fr auto;gap:8px;font-size:14px">
            <span class="muted">Fallen on average each year (last 10 yrs)</span><b>${pctf(st.cagr_10y, 1)}</b>
            <span class="muted">Typical fall over your course</span><b>${pctf(st.p50, 1)}</b>
            <span class="muted">Bad case (worst 10%)</span><b style="color:var(--risk)">${pctf(st.p90, 1)}</b>
            <span class="muted">Chance of a 10%+ fall in 2 years</span><b style="color:var(--risk)">${pctf(st.prob_over_10pct)}</b></div></div>
        <div class="card pad"><h3>Interest-rate risk on each loan</h3>
          <div class="mt12">${comp.offers.map((c) => { const r = offerR(c.id); const up = r?.emi_peak_p90 > c.emi_inr * 1.02;
            return `<div class="alt"><span><b>${esc(short(c.lender))}</b><div class="tiny muted">${c.currency !== 'INR' ? `Repaid in ${c.currency}` : c.rate_type === 'fixed' ? 'Fixed rate' : `Floating, ${esc(LL.findLender(c.lender)?.benchmark || 'linked to lender rate')}`}</div></span><span class="tiny muted">EMI now ${inr(c.emi_inr)}</span><b style="color:${up ? 'var(--risk)' : 'var(--good)'}">${up ? `up to ${inr(r.emi_peak_p90)}` : 'Stable'}</b></div>`; }).join('')}</div>
          <p class="tiny muted mt8">Repo-linked loans replay real RBI moves since 2001. RBI raised the repo to ${LL.REPO_NOW}% in October 2026.</p></div>
      </div>`;
    if (!window.Chart) return;
    const flows = LL.costFlows(plan); const D = plan.duration_months || 24;
    const today = Array(D).fill(0);
    for (const f of flows) today[f.month] += f.amount * (f.currency === 'INR' ? 1 : (plan.fx_rates?.[f.currency] || LL.SPOT[f.currency]));
    let acc = 0; const cum = today.map((x) => (acc += x));
    const L = (v) => v / 1e5;
    charts.push(new Chart(document.getElementById('ch-fan'), {
      type: 'line',
      data: { labels: risk.fan.months.map((m) => `Month ${m}`), datasets: [
        { label: 'Bad case', data: risk.fan.p90.map(L), borderColor: '#c2560f', backgroundColor: 'rgba(194,86,15,0.16)', fill: '+2', pointRadius: 0, borderWidth: 2, tension: 0.2 },
        { label: 'Typical', data: risk.fan.p50.map(L), borderColor: '#c2560f', borderDash: [5, 4], pointRadius: 0, borderWidth: 1.5, fill: false, tension: 0.2 },
        { label: 'Good case', data: risk.fan.p10.map(L), borderColor: 'rgba(194,86,15,0.4)', pointRadius: 0, borderWidth: 1, fill: false, tension: 0.2 },
        { label: 'Your plan at today’s rate', data: cum.map(L), borderColor: '#13234a', pointRadius: 0, borderWidth: 2.5, fill: false, tension: 0.2 },
      ] },
      options: lineOpts('Spent so far', (v) => `₹${v.toFixed(0)}L`, 6),
    }));
  }
  function lineOpts(yTitle, tick, every) {
    return {
      responsive: true, maintainAspectRatio: false, animation: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 14, boxHeight: 3, color: '#44526b', font: { size: 12 } } }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${lakh(c.parsed.y * 1e5)}` } } },
      scales: {
        x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0, color: '#7a869b', font: { size: 11 }, callback(v, i) { return (i + 1) % every === 0 ? this.getLabelForValue(v) : ''; } } },
        y: { title: { display: true, text: yTitle, color: '#7a869b', font: { size: 11 } }, grid: { color: '#edf0f5' }, ticks: { color: '#7a869b', font: { size: 11 }, callback: (v) => tick(v) } },
      },
    };
  }

  // --- tab: afford ---
  function panelAfford(el) {
    const { plan } = cur;
    const A = plan.assumptions;
    const abroad = LL.computePlan(plan, { return_to_india: false }).offers.find((o) => o.id === cur.sel);
    const india = LL.computePlan(plan, { return_to_india: true, india_salary_inr: A.india_salary_inr || 1800000 }).offers.find((o) => o.id === cur.sel);
    const gauge = (a) => a ? `<div class="gauge"><div class="pin" style="left:${Math.min(a.emi_share_pct, 50) * 2}%">${a.emi_share_pct}%</div></div><div class="gauge-scale"><span>0%</span><span>20% comfortable</span><span>35% risky</span><span>50%+</span></div>` : '';
    const verdict = (a) => !a ? '' : a.band === 'comfortable' ? '<span class="chip good">Comfortable</span>' : a.band === 'stretched' ? '<span class="chip risk">Stretched</span>' : '<span class="chip bad">Risky</span>';
    el.innerHTML = `
      <div class="panel-head"><h2>Can ${esc(first(plan.student))} repay the ${esc(short(abroad.lender))} loan comfortably?</h2>
        <p class="sub">Rule of thumb: keep the EMI under 20% of take-home pay. Above 35% is risky. We check both cases.</p>
        <div class="seg" style="max-width:520px">${cur.comp.offers.map((o) => `<button class="${o.id === cur.sel ? 'on' : ''}" data-act="select-offer" data-id="${o.id}">${esc(short(o.lender))}</button>`).join('')}</div></div>
      <div class="grid2">
        <div class="card pad"><div style="display:flex;justify-content:space-between;align-items:center"><h3>Working abroad</h3>${verdict(abroad.affordability)}</div>
          <p class="sub small">Salary: ${abroad.affordability ? `${esc(abroad.affordability.currency)} ${Math.round(abroad.affordability.gross_annual).toLocaleString('en-IN')} a year (${esc(abroad.affordability.source)})` : 'not set'}. Change it on the right.</p>
          ${gauge(abroad.affordability)}
          <div class="grid2 mt16"><div class="stat"><div class="v">${inr(abroad.emi_inr)}</div><div class="l">EMI a month</div></div><div class="stat"><div class="v">${abroad.affordability ? inr(abroad.affordability.net_monthly_inr) : '–'}</div><div class="l">take-home a month, after tax</div></div></div></div>
        <div class="card pad"><div style="display:flex;justify-content:space-between;align-items:center"><h3>Coming back to India</h3>${verdict(india.affordability)}</div>
          <p class="sub small">Salary: <label>₹<input type="number" class="field" style="width:130px;display:inline-block;margin:0 4px" step="100000" min="0" value="${A.india_salary_inr || 1800000}" data-a="india_salary_inr" aria-label="Expected salary in India per year"></label> a year, taxed under the new regime.</p>
          ${gauge(india.affordability)}
          <div class="grid2 mt16"><div class="stat"><div class="v">${inr(india.emi_inr)}</div><div class="l">EMI a month${india.currency !== 'INR' ? `, paid in ${india.currency}` : ''}</div></div><div class="stat"><div class="v">${india.affordability ? inr(india.affordability.net_monthly_inr) : '–'}</div><div class="l">take-home a month, after tax</div></div></div></div>
      </div>
      ${india.affordability?.band === 'risky' ? `<div class="explain risk mt16"><span class="i">!</span><div><b>This is how education loans go wrong.</b> Back in India on this salary, the EMI eats ${india.affordability.emi_share_pct}% of take-home pay. A 2025 case: ₹66,000 EMI on a ₹75,000 salary. A longer tenure, smaller loan or paying interest while studying helps.</div></div>` : ''}
      <div class="card pad mt16"><h3>How the loan balance changes over time</h3>
        <p class="sub small">What you owe each lender. It grows while you study, then falls with each EMI.</p>
        <div class="chart-box mt12"><canvas id="ch-bal" aria-label="Loan balance over time per lender"></canvas></div></div>`;
    if (!window.Chart) return;
    const offers = cur.comp.offers;
    const n = Math.max(...offers.map((o) => o.balance_curve_q.length));
    charts.push(new Chart(document.getElementById('ch-bal'), {
      type: 'line',
      data: { labels: Array.from({ length: n }, (_, i) => `Year ${(i / 4).toFixed(0)}`), datasets: offers.map((o) => ({ label: o.lender, data: o.balance_curve_q.map((v) => v / 1e5), borderColor: color(o.id), borderWidth: o.id === cur.sel ? 3 : 1.5, pointRadius: 0, fill: false, tension: 0.15 })) },
      options: lineOpts('Owed to lender', (v) => `₹${v.toFixed(0)}L`, 8),
    }));
  }

  // --- tab: activity ---
  function panelActivity(el) {
    const p = cur.plan;
    const link = MODE === 'live' ? `${location.origin}/p/${p.share_token}` : `${location.href.split('#')[0]}#/share/${p.share_token}`;
    el.innerHTML = `
      <div class="panel-head"><h2>Who changed what, and who has seen it</h2>
        <p class="sub">Blue is Claude, amber is you, green is family. Check that a person confirmed what Claude read.</p></div>
      <div class="grid2">
        <div class="card pad"><ul class="feed">${cur.activity.map((a) => `<li><span class="ic ${a.kind}">${a.kind === 'c' ? 'AI' : a.kind === 'p' ? esc(a.actor[0]) : 'You'}</span><div><b>${esc(a.actor)}</b><div class="small">${esc(a.text)}</div></div><span class="tiny muted">${ago(a.at)}</span></li>`).join('') || '<li class="muted">Nothing yet.</li>'}</ul></div>
        <div class="card pad"><h3>Share with your family</h3><p class="sub small">A read-only page in plain words. Works on a phone, no login.</p>
          <div class="mcp-url mt12"><span>${esc(link)}</span><button class="btn small" data-act="copy" data-text="${esc(link)}">Copy</button></div>
          <a class="btn mt12" href="#/share/${esc(p.share_token)}" target="_blank" rel="noopener">Preview the family page</a></div>
      </div>`;
  }

  // ---------- edits ----------
  const FIELD = { amount: 'amount', rate_pct: 'interest rate', rate_type: 'rate type', processing_fee_pct: 'processing fee', margin_pct: 'margin money', moratorium_interest: 'interest while studying', moratorium_months: 'months to first EMI', tenure_years: 'repayment period', lender: 'name', label: 'name', currency: 'currency', frequency: 'how often' };
  const NUMERIC = new Set(['amount', 'rate_pct', 'processing_fee_pct', 'processing_fee_flat', 'margin_pct', 'moratorium_months', 'tenure_years']);

  async function commit(note) {
    const wasComplete = !!document.getElementById('ans');
    if (complete(cur.plan)) recompute();
    await Store.savePlan(cur.plan, note);
    if (note) cur.activity = await Store.activity(cur.plan.id);
    renderHead(); renderWiz();
  }

  $app.addEventListener('change', async (e) => {
    const t = e.target;
    if (!cur || !location.hash.startsWith('#/plan/')) return;
    const p = cur.plan;
    if ('addLender' in t.dataset) {
      const i = Number(t.value); if (t.value === '') return;
      const o = i >= 0 ? lenderDefaults(LL.LENDERS[i], p) : { id: uid(), lender: 'Other lender', lender_type: '', currency: 'INR', amount: 5000000, rate_pct: 11, rate_type: 'floating', processing_fee_pct: 1, margin_pct: 0, moratorium_months: (p.duration_months || 24) + 6, moratorium_interest: 'simple', tenure_years: 10, source: 'manual', edited: {} };
      p.offers.push(o); cur.openOffer = o.id;
      toast(`We added ${o.lender} with its published terms. Check them against your letter.`);
      return commit(`Added ${o.lender}`);
    }
    if (t.dataset.o) {
      const o = p.offers.find((x) => x.id === t.dataset.o); const f = t.dataset.f;
      const old = o[f]; const v = NUMERIC.has(f) ? (t.value === '' ? null : Number(t.value)) : t.value;
      if (old === v) return;
      o[f] = v; (o.edited ||= {})[f] = true;
      return commit(`Changed ${o.lender}’s ${FIELD[f] || f}${old != null && old !== '' ? ` from ${old}` : ''} to ${v}`);
    }
    if (t.dataset.c) {
      const c = p.costs.find((x) => x.id === t.dataset.c); const f = t.dataset.f;
      const old = c[f]; const v = f === 'amount' ? Number(t.value) : t.value;
      if (old === v) return;
      c[f] = v; (c.edited ||= {})[f] = true;
      return commit(`Changed cost “${c.label}”: ${FIELD[f] || f} to ${v}`);
    }
    if (t.dataset.check) {
      p.checklist = { ...(p.checklist || {}) };
      if (t.checked) p.checklist[t.dataset.check] = true; else delete p.checklist[t.dataset.check];
      return commit(`${t.checked ? 'Ticked' : 'Unticked'}: ${t.dataset.label}`);
    }
    if (t.dataset.fund) { const k = t.dataset.fund; p.funds[k] = t.value === '' ? (k === 'scholarship' ? 0 : null) : Number(t.value); return commit(`Set ${({ savings_inr: 'family savings', scholarship: 'scholarship', loan_need_inr: 'loan needed' })[k]} to ${t.value || 'blank'}`); }
    if ('fundCcy' in t.dataset) { p.funds.scholarship_currency = t.value; return commit(null); }
    if (t.dataset.fx) { (p.fx_rates ||= {})[t.dataset.fx] = Number(t.value); return commit(`Set the exchange rate to ₹${t.value}`); }
    if (t.dataset.a && t.type !== 'range') { p.assumptions[t.dataset.a] = t.type === 'number' ? (t.value === '' ? null : Number(t.value)) : t.value; return commit(null); }
  });

  let shockTimer = null;
  $app.addEventListener('input', (e) => {
    const t = e.target;
    if (!cur) return;
    if (t.id === 'uq') { cur.uq = t.value; drawSugg(); return; }
    if (t.dataset.a === 'fx_shock_pct') {
      cur.plan.assumptions.fx_shock_pct = Number(t.value); syncRail();
      clearTimeout(shockTimer); shockTimer = setTimeout(() => { recompute(false); fillOutput(); Store.savePlan(cur.plan); }, 50);
    }
  });

  $app.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'logout') { await Store.logout(); user = null; location.hash = '#/'; return route(); }
    if (act === 'demo-login') { user = await Store.login('demo@loanlens.app', 'demo1234'); location.hash = '#/plans'; return route(); }
    if (act === 'new-plan') { const p = await Store.createPlan(); location.hash = `#/plan/${p.id}`; return; }
    if (act === 'copy') { navigator.clipboard?.writeText(b.dataset.text || ''); toast('Copied. Paste it into Claude.'); return; }
    if (!cur || !location.hash.startsWith('#/plan/')) return;
    const p = cur.plan; const A = p.assumptions;
    switch (act) {
      case 'pick-uni': return pickUni(LL.UNIVERSITIES[Number(b.dataset.i)]);
      case 'change-uni': cur.picking = true; renderInputs(); document.getElementById('uq')?.focus(); return;
      case 'cancel-pick': cur.picking = false; renderInputs(); return;
      case 'manual-uni': {
        const name = prompt('Your university’s name'); if (!name) return;
        Object.assign(p, { university: name, title: `Master’s, ${name}` });
        if (!p.costs.length) p.costs.push({ id: uid(), label: 'Tuition and fees', category: 'tuition', amount: 0, currency: p.currency || 'USD', frequency: 'per_year', source: 'manual', edited: {} }, { id: uid(), label: 'Living costs', category: 'living', amount: 0, currency: p.currency || 'USD', frequency: 'per_month', source: 'manual', edited: {} });
        cur.picking = false; cur.costsOpen = true; toast('Now fill in the costs from your I-20.');
        return commit(`Added ${name} by hand`);
      }
      case 'tab': showTab(b.dataset.v); return;
      case 'goto': if (b.disabled) return; cur.view = b.dataset.v; renderWiz(); window.scrollTo({ top: 0, behavior: 'smooth' }); return;
      case 'next': {
        const why = gate(cur.view); if (why) { toast(why); return; }
        const st = STEPS(); const i = stepIdx(cur.view) + 1; if (i >= st.length) return;
        if (stepIdx(LL.inferStage(p)) < i) p.stage = st[i].id;
        cur.view = st[i].id; window.scrollTo({ top: 0, behavior: 'smooth' });
        return commit(`Moved to: ${st[i].title}`);
      }
      case 'add-short': { const u = LL.UNIVERSITIES[Number(b.dataset.i)]; p.shortlist = shortlistOf(p).filter((x) => x !== u.university).concat(u.university); cur.uq = ''; return commit(`Shortlisted ${u.university}`); }
      case 'remove-short': { p.shortlist = shortlistOf(p).filter((x) => x !== b.dataset.v); if (p.university === b.dataset.v) { p.university = ''; } return commit(`Removed ${b.dataset.v} from the shortlist`); }
      case 'make-final': { const u = UNI(b.dataset.v); p.shortlist = shortlistOf(p); if (u) return pickUni(u); p.university = b.dataset.v; return commit(`Chose ${b.dataset.v}`); }
      case 'choose': {
        const o = p.offers.find((x) => x.id === b.dataset.id); p.chosen_offer_id = o.id; cur.sel = o.id;
        if (stepIdx(LL.inferStage(p)) < stepIdx('save')) p.stage = 'save';
        cur.view = 'save'; window.scrollTo({ top: 0, behavior: 'smooth' }); toast(`You chose ${o.lender}`);
        return commit(`Chose ${o.lender}`);
      }
      case 'save-plan': p.saved_at = Date.now(); toast('Plan saved'); return commit('Saved the plan');
      case 'stage': cur.jOpen = cur.jOpen === b.dataset.v || !b.dataset.v ? null : b.dataset.v; renderStages(); return;
      case 'set-stage': { p.stage = b.dataset.v; const t = LL.JOURNEY_STAGES.find((x) => x.id === p.stage)?.title; toast(`Moved to ${t}`); return commit(`Moved to stage: ${t}`); }
      case 'toggle-costs': cur.costsOpen = !cur.costsOpen; renderInputs(); return;
      case 'add-cost': p.costs.push({ id: uid(), label: 'New cost', category: 'other', amount: 0, currency: p.currency || 'USD', frequency: 'one_time', source: 'manual', edited: {} }); cur.costsOpen = true; return commit('Added a cost');
      case 'remove-cost': { const c = p.costs.find((x) => x.id === b.dataset.id); p.costs = p.costs.filter((x) => x.id !== b.dataset.id); return commit(`Removed cost: ${c.label}`); }
      case 'remove-offer': { e.preventDefault(); const o = p.offers.find((x) => x.id === b.dataset.id); if (!confirm(`Remove ${o.lender}?`)) return; p.offers = p.offers.filter((x) => x.id !== b.dataset.id); return commit(`Removed offer: ${o.lender}`); }
      case 'select-offer': if (cur.sel === b.dataset.id) return; cur.sel = b.dataset.id; killCharts(); renderBars(); renderJourney(); renderMore(); return;
      case 'preset': A.fx_shock_pct = Number(b.dataset.v); document.querySelector('input[data-a=fx_shock_pct]').value = A.fx_shock_pct; syncRail(); return commit(null);
      case 'pay-int': A.pay_interest_during_study = b.dataset.v === '1'; renderWhatIf(); return commit(null);
      case 'prepay': A.prepay_monthly_inr = Number(b.dataset.v); renderWhatIf(); return commit(null);
      case 'reset-whatif': Object.assign(A, { fx_shock_pct: 0, pay_interest_during_study: false, prepay_monthly_inr: 0 }); renderWhatIf(); toast('What-ifs reset'); return commit(null);
      case 'share': { const url = MODE === 'live' ? `${location.origin}/p/${p.share_token}` : `${location.href.split('#')[0]}#/share/${p.share_token}`; navigator.clipboard?.writeText(url); toast('Family link copied. Send it on WhatsApp.'); return; }
      default:
    }
  });

  // ---------- connect Claude ----------
  function renderConnect() {
    document.title = 'Connect Claude · LoanLens';
    const url = user.mcp_url;
    const tools = [
      ['create_plan', 'Starts a plan: university, course length, every cost line and your family’s funds'],
      ['add_loan_offer', 'Adds one lender’s terms exactly as written in the sanction letter'],
      ['update_plan, update_offer', 'Fixes or changes any number when you ask'],
      ['get_plan', 'Reads back the plan with every number LoanLens calculated'],
      ['compare_offers', 'Ranks offers under a what-if: rupee fall, paying interest, tax regime, returning to India'],
      ['simulate_risk', 'Replays the plan across history: cost range, shortfall chance, safety buffer, EMI range'],
      ['lookup_universities, lookup_lenders', 'Searches the 97-programme and 14-lender reference data'],
    ];
    $app.innerHTML = shell('connect', `
      <h1>Connect Claude to LoanLens</h1>
      <p class="sub">Claude reads your letters. We do the rest: store the plan, run the math, share it with family. No AI runs inside LoanLens.</p>
      <div class="steps-c mt24">
        <div class="step-c"><span class="n">1</span><b>Copy your link</b><p class="small muted mt8">It’s yours alone. Keep it private.</p></div>
        <div class="step-c"><span class="n">2</span><b>Add it to Claude</b><p class="small muted mt8">Claude → Settings → Connectors → Add custom connector. Name it LoanLens, paste the link.</p></div>
        <div class="step-c"><span class="n">3</span><b>Ask for your plan</b><p class="small muted mt8">Attach your letters and ask for a plan. It appears here.</p></div>
      </div>
      <div class="card pad mt16"><h3>Your connector link</h3><div class="mcp-url mt12"><span>${esc(url)}</span><button class="btn small primary" data-act="copy" data-text="${esc(url)}">Copy link</button></div></div>
      <div class="grid2 mt16">
        <div class="card pad"><h3>Start with these</h3><p class="sub small">Most people start here.</p>${['build-docs', 'cheapest', 'parents-hindi'].map((id) => promptRow(PROMPTS.find((p) => p.id === id), null)).join('')}<a class="btn mt12" href="#/prompts">See all ${PROMPTS.length} prompts</a></div>
        <div class="card pad"><h3>What Claude can do in LoanLens</h3><div class="mt8">${tools.map(([n, d]) => `<div class="tool"><code>${esc(n)}</code><span>${esc(d)}</span></div>`).join('')}</div></div>
      </div>`);
  }

  // ---------- prompt library ----------
  async function renderPrompts(planId) {
    document.title = 'Ask Claude \u00b7 LoanLens';
    const plans = await Store.listPlans();
    let plan = plans.find((p) => p.id === planId) || plans.find((p) => p.offers?.length && p.costs?.length) || null;
    const groups = [...new Set(PROMPTS.map((p) => p.group))];
    let g = '', q = '';
    $app.innerHTML = shell('prompts', `
      <h1>Ask Claude</h1>
      <p class="sub">Claude reads your letters and asks LoanLens to do the math. Your plan updates here. No AI runs inside LoanLens.</p>
      <section class="card pad mt16 connect-box"><h3>Connect once</h3>
        <ol class="csteps"><li><b>Copy your link</b><div class="mcp-url mt8"><span>${esc(user.mcp_url)}</span><button class="btn small primary" data-act="copy" data-text="${esc(user.mcp_url)}">Copy</button></div></li>
          <li><b>Add it in Claude</b><span>Settings → Connectors → Add custom connector. Name it LoanLens.</span></li>
          <li><b>Ask</b><span>Pick a prompt below, attach your letters, paste.</span></li></ol></section>
      <div class="card pad mt16" style="display:flex;gap:14px;flex-wrap:wrap;align-items:center">
        <label class="small" style="font-weight:700">Fill prompts with details from
          <select id="pp-plan" class="field" style="width:auto;display:inline-block;margin:0 0 0 8px">${plans.map((p) => `<option value="${esc(p.id)}" ${plan?.id === p.id ? 'selected' : ''}>${esc(p.title || 'Untitled plan')}</option>`).join('')}<option value="" ${plan ? '' : 'selected'}>No plan (generic)</option></select></label>
        <div class="search" style="min-width:220px"><input id="pp-q" placeholder="Search prompts, e.g. prepay, Hindi, visa" aria-label="Search prompts"></div></div>
      <div class="cchips mt16" id="pp-g"><button class="cchip on" data-g="">All</button>${groups.map((x) => `<button class="cchip" data-g="${esc(x)}">${esc(x)} (${PROMPTS.filter((p) => p.group === x).length})</button>`).join('')}</div>
      <div id="pp-list"></div>`);
    const draw = () => {
      const list = PROMPTS.filter((p) => (!g || p.group === g) && (!q || `${p.title} ${p.when} ${p.text} ${p.group}`.toLowerCase().includes(q)));
      const by = groups.map((x) => [x, list.filter((p) => p.group === x)]).filter(([, l]) => l.length);
      document.getElementById('pp-list').innerHTML = by.map(([x, l]) => `<h2 class="mt24">${esc(x)}</h2><div class="pgrid mt12">${l.map((p) => { const t = fillPrompt(p.text, plan); return `<article class="pcard">
        <div class="pc-top"><div><h3>${esc(p.title)}</h3><p class="small muted">${esc(p.when)}</p></div><button class="btn small primary" data-act="copy" data-text="${esc(t)}">Copy</button></div>
        <details class="pc-more"><summary>See the prompt</summary><blockquote>${esc(t)}</blockquote><span class="ptools">Claude will use: ${p.tools.map((y) => `<code>${esc(y)}</code>`).join(' ')}</span></details></article>`; }).join('')}</div>`).join('') || '<div class="card empty mt16"><h3>No prompts match</h3><p class="sub" style="margin:8px auto 0">Try another word, or clear the search.</p></div>';
    };
    document.getElementById('pp-q').addEventListener('input', (e) => { q = e.target.value.toLowerCase().trim(); draw(); });
    document.getElementById('pp-plan').addEventListener('change', (e) => { plan = plans.find((p) => p.id === e.target.value) || null; draw(); });
    document.getElementById('pp-g').addEventListener('click', (e) => { const b = e.target.closest('[data-g]'); if (!b) return; g = b.dataset.g; document.querySelectorAll('#pp-g .cchip').forEach((x) => x.classList.toggle('on', x === b)); draw(); });
    draw();
  }

  // ---------- reference data ----------
  function renderData() {
    document.title = 'Compare universities and lenders · LoanLens';
    const fx = ['USD', 'GBP', 'EUR', 'CAD', 'AUD'].map((c) => LL.fxStats(c, 24));
    const countries = [...new Set(LL.UNIVERSITIES.map((u) => u.country))];
    $app.innerHTML = shell('data', `
      <h1>Compare universities and lenders</h1>
      <p class="sub">The data behind every plan. Public sources, no AI. Use it to shortlist.</p>
      <section class="card pad mt24"><h2>How risky is each currency?</h2><p class="sub small">Every 2-year spell since 2000. US Federal Reserve rates to ${esc(LL.FX_AS_OF)}.</p>
        <div class="fx-grid mt16">${fx.map((s) => `<div class="stat"><div class="l"><b style="color:var(--ink)">${s.currency}</b> now ₹${s.spot.toFixed(2)}</div>
          <div class="v" style="color:var(--risk)">${pctf(s.prob_over_10pct)}</div><div class="l">chance the rupee falls 10%+ against the ${s.currency} in 2 years</div>
          <div class="l mt8">Typical fall ${pctf(s.p50, 1)}, bad case ${pctf(s.p90, 1)}</div></div>`).join('')}</div></section>
      <section class="card pad mt16"><h2>Total cost of a CS master’s, in rupees</h2><p class="sub small">${LL.UNIVERSITIES.length} programmes, 6 countries. Tuition plus living for the whole course. Living costs follow official visa rules where they exist.</p>
        <div class="filters mt16"><input id="u-q" placeholder="Search a university or city" aria-label="Search universities"><select id="u-c" aria-label="Country"><option value="">All countries</option>${countries.map((c) => `<option>${esc(c)}</option>`).join('')}</select>
          <select id="u-s" aria-label="Sort"><option value="total">Cheapest first</option><option value="risk">Most rupee risk first</option><option value="name">A to Z</option></select><span class="small muted" id="u-n" style="align-self:center"></span></div>
        <div class="dt-wrap"><table class="dt"><thead><tr><th>University</th><th>Country</th><th>Programme</th><th class="r">Tuition</th><th class="r">Living a month</th><th class="r">Total today</th><th class="r">Bad-case rupee</th></tr></thead><tbody id="u-body"></tbody></table></div></section>
      <section class="card pad mt16"><h2>What lenders publish</h2><p class="sub small">Published ranges. Your sanction letter has the real number.</p>
        <div class="dt-wrap mt12"><table class="dt"><thead><tr><th>Lender</th><th>Type</th><th class="r">Interest rate</th><th>Processing fee</th><th>Margin money</th><th>Without collateral up to</th><th>Rate linked to</th></tr></thead><tbody>
          ${LL.LENDERS.map((l) => `<tr><td><b>${esc(l.lender)}</b></td><td>${esc(l.type)}</td><td class="r">${l.rate_min}${l.rate_max ? `–${l.rate_max}` : '+'}%</td><td>${esc(l.processing_fee)}</td><td>${esc(l.margin_money)}</td><td>${esc(l.collateral_free_cap)}</td><td>${esc(l.benchmark)}</td></tr>`).join('')}
        </tbody></table></div></section>
      <section class="card pad mt16"><h2>Sources</h2><div class="mt8">${LL.SOURCES.map((s) => `<div class="tool"><b>${esc(s.name)}</b><span>${esc(s.detail)} <a href="${esc(s.url)}" target="_blank" rel="noopener">Open source</a></span></div>`).join('')}</div></section>`);
    const sym = { USD: '$', GBP: '£', EUR: '€', CAD: 'C$', AUD: 'A$', INR: '₹' };
    const draw = () => {
      const q = document.getElementById('u-q').value.toLowerCase();
      const c = document.getElementById('u-c').value; const s = document.getElementById('u-s').value;
      let list = LL.UNIVERSITIES.filter((u) => (!c || u.country === c) && (!q || u.university.toLowerCase().includes(q) || u.city.toLowerCase().includes(q)));
      list = list.sort((a, b) => s === 'name' ? a.university.localeCompare(b.university) : s === 'risk' ? (b.total_bad_case_fx_inr_lakh - b.total_today_inr_lakh) - (a.total_bad_case_fx_inr_lakh - a.total_today_inr_lakh) : a.total_today_inr_lakh - b.total_today_inr_lakh);
      document.getElementById('u-n').textContent = `${list.length} shown`;
      document.getElementById('u-body').innerHTML = list.map((u) => `<tr><td><b>${esc(u.university)}</b><div class="tiny muted">${esc(u.city)}</div></td><td>${esc(u.country)}</td><td>${esc(u.program)}<div class="tiny muted">${u.duration_months} months</div></td>
        <td class="r">${sym[u.tuition_currency] || ''}${Math.round(u.tuition_total).toLocaleString('en-IN')}</td><td class="r">${sym[u.living_currency] || ''}${Math.round(u.living_per_month).toLocaleString('en-IN')}</td>
        <td class="r"><b>${lakh(u.total_today_inr_lakh * 1e5)}</b></td><td class="r" style="color:var(--risk)">${lakh(u.total_bad_case_fx_inr_lakh * 1e5)}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">No universities match. Try another name or country.</td></tr>';
    };
    ['u-q', 'u-c', 'u-s'].forEach((id) => document.getElementById(id).addEventListener('input', draw));
    draw();
  }

  // ---------- family view ----------
  async function renderShare(token) {
    const plan = await Store.sharedPlan(token).catch(() => null);
    if (!plan || !plan.offers?.length) { $app.innerHTML = '<div class="share"><h1>This link isn’t active</h1><p class="sub">Ask whoever shared it to send a new link from LoanLens.</p></div>'; return; }
    plan.assumptions = Object.assign({}, LL.DEFAULT_ASSUMPTIONS, plan.assumptions || {});
    document.title = `${plan.title} · family view`;
    const risk = LL.simulateRisk(plan);
    const name = first(plan.student);
    const draw = (shock) => {
      const comp = LL.computePlan(plan, { fx_shock_pct: shock });
      const rec = comp.offers.find((o) => o.id === (risk.best_offer_typical_id || comp.best_offer_id)) || comp.offers[0];
      const rr = risk.offers.find((o) => o.id === rec.id);
      document.getElementById('share-body').innerHTML = `
        <div class="share-hero"><div style="color:var(--gold);font-weight:700;font-size:13px">The short answer</div>
          <p class="say">The degree costs about <b>${lakh(comp.coa_inr)}</b>. The best loan is <b>${esc(rec.lender)}</b>. The family pays <b>${lakh(rec.family_arranges_inr)}</b> now, and ${esc(name)} repays <b>${inr(rec.emi_inr)} a month</b> for ${Math.round(rec.tenure_months / 12)} years after finishing.</p></div>
        <p class="q">How much will we pay in total?</p>
        <div class="grid2"><div class="stat"><div class="v">${lakh(rr?.all_in?.p50 ?? rec.all_in_inr)}</div><div class="l">everything paid, in a typical future</div></div><div class="stat risk"><div class="v">${lakh(rr?.all_in?.p90)}</div><div class="l">if rates rise and the rupee falls badly</div></div></div>
        <p class="q">Why this loan and not the others?</p>
        ${comp.offers.map((o) => { const r = risk.offers.find((x) => x.id === o.id); return `<div class="orow"><div><b>${esc(o.lender)}</b>${o.id === rec.id ? ' <span class="chip good">Best overall</span>' : ''}<div class="small muted">${o.rate_pct}% ${esc(o.rate_type)}, ${Math.round(o.tenure_months / 12)} years${o.currency !== 'INR' ? `, repaid in ${o.currency}` : ''}</div></div>
          <div style="text-align:right"><b class="num">${lakh(r?.all_in?.p50 ?? o.all_in_inr)}</b><div class="small muted num">${inr(o.emi_inr)}/month</div></div></div>`; }).join('')}
        <p class="q">What could go wrong?</p>
        <p class="small" style="color:var(--ink-2)">The rupee has fallen against the ${esc(plan.currency || 'USD')} in most years. In ${pctf(risk.prob_cost_3l_over_plan)} of past periods, a plan like this ended up needing ₹3 lakh or more extra. Keeping <b>${lakh(risk.recommended_buffer_inr)}</b> aside covers most bad cases.</p>`;
    };
    $app.innerHTML = `<div class="share">
      <a class="brand" style="color:var(--ink)" href="#/"><span class="brand-mark" aria-hidden="true">L</span>LoanLens</a>
      <p class="tiny muted mt16">Shared by ${esc(plan.student || 'the student')} · read-only</p>
      <h1 style="font-size:24px;margin-top:6px">${esc(plan.title)}</h1>
      <div id="share-body"></div>
      <div class="card" style="padding:16px;margin-top:24px"><label for="s-shock" style="display:block;font-weight:700">What if the rupee falls <span id="s-out" style="color:var(--risk)">0%</span> during the course?</label>
        <input type="range" min="0" max="30" value="0" id="s-shock" style="width:100%;accent-color:var(--risk);margin-top:10px">
        <p class="tiny muted mt8">Try 18%. That’s a bad but real stretch from history.</p></div>
      <p class="foot">Numbers come from the loan letters and are tested against ${risk.windows} historical periods of the rupee and RBI interest rates. LoanLens is a calculator, not financial advice.</p></div>`;
    draw(0);
    document.getElementById('s-shock').addEventListener('input', (e) => { document.getElementById('s-out').textContent = `${e.target.value}%`; draw(Number(e.target.value)); });
  }

  route();
})();
