import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pkg;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.goto('file:///home/user/irrigation/sim/mockups/encoding-strips.html');
await page.waitForTimeout(400);
await page.screenshot({ path: '/home/user/irrigation/sim/mockups/encoding-strips.png', fullPage: true });
await browser.close();
console.log('shot ok');
