// Builds a single self-contained HTML prototype (demo mode, all assets inlined).
import { readFileSync, writeFileSync } from 'node:fs';
const r = (f) => readFileSync(f, 'utf8');
const chartJs = r('node_modules/chart.js/dist/chart.umd.js');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>LoanLens prototype</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;650;700&family=Sora:wght@500;600;650;700;800&display=swap" rel="stylesheet">
<style>${r('public/app.css')}</style></head><body><div id="app"></div>
<script>${chartJs}</script>
<script>${r('public/engine.js')}</script>
<script>window.LL_MODE='demo';</script>
<script>${r('public/sample.js')}</script>
<script>${r('public/prompts.js')}</script>
<script>${r('public/app.js')}</script>
</body></html>`;
writeFileSync(process.argv[2] || 'loanlens-prototype.html', html);
console.log('wrote', (html.length / 1024).toFixed(0), 'KB');
