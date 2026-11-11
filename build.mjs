// Bundles the engine + datasets for the browser so sliders recompute instantly.
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
const read = (f) => readFileSync(`data/${f}`, 'utf8');
writeFileSync('src/raw.generated.js', 'export default ' + JSON.stringify({ fx: read('fx_monthly_inr.csv'), repo: read('repo_monthly.csv'), lenders: read('lenders_2026.csv'), universities: read('universities_2026.csv') }) + ';\n');
const swapData = { name: 'swap-data', setup(b) { b.onResolve({ filter: /^\.\/data\.js$/ }, (a) => ({ path: new URL('./src/data-browser.js', import.meta.url).pathname })); } };
await build({ entryPoints: ['src/browser-entry.js'], bundle: true, format: 'iife', globalName: 'LL', minify: true, outfile: 'public/engine.js', plugins: [swapData] });
console.log('built public/engine.js');
