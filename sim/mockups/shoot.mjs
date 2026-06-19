// Render the mockup HTML to PNG. Portable: resolves paths relative to this
// file, and finds Playwright/Chromium from the env or a local/global install.
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));

// playwright may be a local dep or a global install (this sandbox)
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

// let Playwright pick its bundled Chromium; override only if the env says so
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.goto('file://' + join(here, 'encoding-strips.html'));
await page.waitForTimeout(400);
await page.screenshot({ path: join(here, 'encoding-strips.png'), fullPage: true });
await browser.close();
console.log('shot ok');
