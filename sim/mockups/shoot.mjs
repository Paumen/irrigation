// Render a mockup HTML to PNG. Portable: resolves paths relative to this file,
// finds Playwright/Chromium from env or a local/global install.
// Usage: node shoot.mjs [name]   (name defaults to "encoding-gallery")
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const name = process.argv[2] || 'encoding-gallery';

let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.goto('file://' + join(here, name + '.html'));
await page.waitForTimeout(900); // let particles spread for a representative frame
await page.screenshot({ path: join(here, name + '.png'), fullPage: true });
await browser.close();
console.log('shot ok:', name);
