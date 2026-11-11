// LoanLens server: web app API, family share links and the MCP connector for Claude.
import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initDb } from './db.js';
import * as S from './store.js';
import { mcpHandler } from './mcp.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3000;
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const PROD = process.env.NODE_ENV === 'production';
const DEMO_EMAIL = 'demo@loanlens.app';

const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');
app.use(express.json({ limit: '400kb' }));

const baseUrl = (req) => process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;

// ---------- sessions (signed cookie) ----------
const sign = (v) => crypto.createHmac('sha256', SECRET).update(v).digest('base64url');
function setSession(res, userId) {
  const exp = Date.now() + 30 * 86400e3;
  const v = `${userId}.${exp}`;
  res.setHeader('Set-Cookie', `ll_s=${v}.${sign(v)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 86400}${PROD ? '; Secure' : ''}`);
}
function clearSession(res) { res.setHeader('Set-Cookie', `ll_s=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${PROD ? '; Secure' : ''}`); }
async function sessionUser(req) {
  const m = /(?:^|;\s*)ll_s=([^;]+)/.exec(req.headers.cookie || '');
  if (!m) return null;
  const [id, exp, sig] = m[1].split('.');
  if (!id || !exp || !sig || Number(exp) < Date.now()) return null;
  const good = sign(`${id}.${exp}`);
  if (good.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(good), Buffer.from(sig))) return null;
  return S.getUser(id);
}
const publicUser = (u, req) => ({ name: u.name, email: u.email, mcp_url: `${baseUrl(req)}/mcp/${u.mcp_key}` });
const auth = (fn) => async (req, res) => {
  try {
    const u = await sessionUser(req);
    if (!u) return res.status(401).json({ error: 'Please sign in.' });
    await fn(req, res, u);
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ error: e.status ? e.message : 'Something went wrong. Try again.' });
  }
};
const open = (fn) => async (req, res) => {
  try { await fn(req, res); } catch (e) { console.error(e); res.status(e.status || 500).json({ error: e.status ? e.message : 'Something went wrong. Try again.' }); }
};

// ---------- auth API ----------
app.get('/api/me', auth(async (req, res, u) => res.json({ user: publicUser(u, req) })));
app.post('/api/login', open(async (req, res) => {
  const { email, password } = req.body || {};
  const u = await S.getUserByEmail(email);
  if (!u || !S.checkPassword(password || '', u.password_hash)) return res.status(401).json({ error: 'That email and password don’t match.' });
  setSession(res, u.id);
  res.json({ user: publicUser(u, req) });
}));
app.post('/api/signup', open(async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!/^\S+@\S+\.\S+$/.test(email || '')) return res.status(400).json({ error: 'Enter a valid email.' });
  if (String(password || '').length < 6) return res.status(400).json({ error: 'Use at least 6 characters for the password.' });
  if (await S.getUserByEmail(email)) return res.status(409).json({ error: 'An account with this email already exists. Sign in instead.' });
  const u = await S.createUser({ email, password, name: name || String(email).split('@')[0] });
  setSession(res, u.id);
  res.json({ user: publicUser(u, req) });
}));
app.post('/api/logout', (req, res) => { clearSession(res); res.json({ ok: true }); });
app.post('/api/rotate-key', auth(async (req, res, u) => {
  if (u.email === DEMO_EMAIL) return res.status(400).json({ error: 'The test account’s link can’t be changed.' });
  await S.rotateKey(u.id);
  res.json({ user: publicUser(await S.getUser(u.id), req) });
}));

// ---------- plans API ----------
app.get('/api/plans', auth(async (req, res, u) => res.json({ plans: await S.listPlans(u.id) })));
app.post('/api/plans', auth(async (req, res, u) => {
  const p = await S.insertPlan(u.id, { title: 'New loan plan', student: u.name, costs: [], offers: [], funds: {}, source: 'manual' });
  await S.logActivity(p.id, 'You', 'u', 'Created an empty plan');
  res.json({ plan: p });
}));
app.get('/api/plans/:id', auth(async (req, res, u) => {
  const p = await S.getPlan(u.id, req.params.id);
  if (!p) return res.status(404).json({ error: 'Plan not found.' });
  res.json({ plan: p });
}));
app.put('/api/plans/:id', auth(async (req, res, u) => {
  const p = await S.getPlan(u.id, req.params.id);
  if (!p) return res.status(404).json({ error: 'Plan not found.' });
  const t = await S.savePlan(u.id, p.id, { ...req.body.plan, id: p.id });
  if (req.body.note) await S.logActivity(p.id, 'You', 'u', req.body.note);
  res.json({ updated_at: t });
}));
app.delete('/api/plans/:id', auth(async (req, res, u) => { await S.deletePlan(u.id, req.params.id); res.json({ ok: true }); }));
app.get('/api/plans/:id/activity', auth(async (req, res, u) => {
  const p = await S.getPlan(u.id, req.params.id);
  if (!p) return res.status(404).json({ error: 'Plan not found.' });
  res.json({ activity: await S.getActivity(p.id) });
}));
app.get('/api/plans/:id/version', auth(async (req, res, u) => {
  const p = await S.getPlan(u.id, req.params.id);
  if (!p) return res.status(404).json({ error: 'Plan not found.' });
  res.json({ updated_at: p.updated_at });
}));

// ---------- family share ----------
app.get('/api/share/:token', open(async (req, res) => {
  const p = await S.getPlanByShare(req.params.token);
  if (!p) return res.status(404).json({ error: 'This link isn’t active.' });
  const last = await S.lastActivity(p.id, 'p');
  if (!last || Date.now() - Number(last.at) > 10 * 60e3) await S.logActivity(p.id, 'Family', 'p', 'Opened the shared plan');
  const { share_token, ...safe } = p; // eslint-disable-line no-unused-vars
  res.json({ plan: { ...safe, share_token: req.params.token } });
}));
app.get('/p/:token', (req, res) => res.redirect(302, `/#/share/${encodeURIComponent(req.params.token)}`));

// ---------- MCP connector ----------
const mcp = mcpHandler(baseUrl);
app.post('/mcp/:key', mcp);
app.get('/mcp/:key', (req, res) => res.status(405).set('Allow', 'POST').json({ jsonrpc: '2.0', error: { code: -32000, message: 'Use POST. This is the LoanLens MCP endpoint for Claude.' }, id: null }));
app.delete('/mcp/:key', (req, res) => res.status(405).set('Allow', 'POST').end());

// ---------- static app ----------
const indexHtml = readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8').replace('__MODE__', 'live');
app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/favicon.ico', (req, res) => res.type('image/svg+xml').send('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#2e2a8c"/><text x="16" y="22" font-family="Arial" font-size="18" font-weight="700" text-anchor="middle" fill="#f7b32b">L</text></svg>'));
app.get(['/', '/index.html'], (req, res) => res.type('html').send(indexHtml));
app.use(express.static(path.join(ROOT, 'public'), { index: false, maxAge: PROD ? '1h' : 0 }));
app.use((req, res) => res.status(404).type('html').send(indexHtml));

// ---------- seed the test account ----------
async function seed() {
  if (await S.getUserByEmail(DEMO_EMAIL)) return;
  const u = await S.createUser({ email: DEMO_EMAIL, password: 'demo1234', name: 'Riya Sharma', mcpKey: process.env.DEMO_MCP_KEY || undefined });
  const sample = JSON.parse(readFileSync(path.join(ROOT, 'public', 'sample.js'), 'utf8').replace(/^window\.LL_SAMPLE = /, '').replace(/;\s*$/, ''));
  sample.source = 'claude';
  sample.costs.forEach((c) => { c.source = 'claude'; });
  sample.offers.forEach((o) => { o.source = 'claude'; });
  sample.offers[0].edited = { processing_fee_flat: true };
  delete sample.id;
  const p = await S.insertPlan(u.id, sample);
  const log = [
    ['Claude', 'c', 'Created the plan from the UT Dallas admit letter and I-20 cost sheet'],
    ['Claude', 'c', 'Added offer: SBI Global Ed-Vantage (₹75,00,000 at 10.15%)'],
    ['Claude', 'c', 'Added offer: HDFC Credila (₹80,00,000 at 11.25%)'],
    ['Claude', 'c', 'Added offer: Prodigy Finance (USD 85,000 at 12.15%)'],
    ['You', 'u', 'Changed SBI Global Ed-Vantage’s flat fees to 10000'],
  ];
  for (const [a, k, t] of log) await S.logActivity(p.id, a, k, t);
  console.log(`Seeded test account ${DEMO_EMAIL} / demo1234, connector /mcp/${u.mcp_key}`);
}

const kind = await initDb();
await seed();
app.listen(PORT, () => console.log(`LoanLens on :${PORT} (${kind})`));
