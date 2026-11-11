// Node loader for the bundled reference datasets.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { makeData } from './data-core.js';
export { parseCsv } from './data-core.js';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
const read = (f) => readFileSync(path.join(DIR, f), 'utf8');
const D = makeData({ fx: read('fx_monthly_inr.csv'), repo: read('repo_monthly.csv'), lenders: read('lenders_2026.csv'), universities: read('universities_2026.csv') });
export const { CURRENCIES, FX, FX_AS_OF, SPOT, REPO, REPO_NOW, REPO_AS_OF, LENDERS, UNIVERSITIES, findUniversity, searchUniversities, findLender, fxStats, SALARY_BENCHMARKS, SOURCES } = D;
