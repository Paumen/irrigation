// Render an HTML file to a PNG via Playwright Chromium.
// Usage: NODE_PATH=<global-node-modules> node html-shot.cjs <file.html>
// Prints the output PNG path on stdout. Used by the PostToolUse html-screenshot hook.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const file = process.argv[2];
  if (!file) process.exit(1);
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) process.exit(1);

  const outDir = '/tmp/claude-html-shots';
  fs.mkdirSync(outDir, { recursive: true });
  const base = path.basename(abs).replace(/\.html?$/i, '');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const out = path.join(outDir, `${base}-${stamp}.png`);

  const browser = await chromium.launch();
  // Phone viewport only (iPhone-class portrait).
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto('file://' + abs, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500); // let boot/entry animations settle
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();

  process.stdout.write(out);
})().catch((e) => { console.error(e); process.exit(1); });
