#!/usr/bin/env node
// freeze.mjs — convert soil.html between LIVE and STATIC (frozen) weather data.
//
//   node freeze.mjs freeze [in=soil.html]        [out=soil.static.html]
//   node freeze.mjs thaw   [in=soil.static.html] [out=soil.live.html]
//
// freeze : fetch today's Open-Meteo data once and embed it, so the copy needs
//          no network and always shows the day it was frozen.
// thaw   : strip the embedded block, restoring the live-fetching page.
//
// The frozen data lives in one marker-delimited block that OVERRIDES the page's
// own fetchWeather()/todayInTz() rather than editing them, so thaw restores the
// original source byte-for-byte. Re-running freeze refreshes the data in place.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const BEGIN = "/* SOIL-STATIC-DATA:BEGIN";
const END = "/* SOIL-STATIC-DATA:END */";
// Matches the whole injected block plus the two newlines freeze adds after it.
// \r? tolerates CRLF, so thaw/re-freeze work on a Windows (CRLF) checkout too.
const BLOCK_RE = /\/\* SOIL-STATIC-DATA:BEGIN[\s\S]*?SOIL-STATIC-DATA:END \*\/\r?\n\r?\n/;
const ANCHOR = "async function boot(){";

// Pull `key: value` out of the SITE / API object literals in the page source,
// so freeze always uses whatever coordinates and window the page ships with.
function readConfig(html) {
  const num = (name) => {
    const m = html.match(new RegExp(`${name}:\\s*(-?[\\d.]+)`));
    if (!m) throw new Error(`Could not find ${name} in the page's SITE/API config`);
    return Number(m[1]);
  };
  const str = (name) => {
    const m = html.match(new RegExp(`${name}:\\s*"([^"]+)"`));
    if (!m) throw new Error(`Could not find ${name} in the page's API config`);
    return m[1];
  };
  return {
    lat: num("lat"),
    lon: num("lon"),
    base: str("base"),
    daily: str("daily"),
    timezone: str("timezone"),
    pastDays: num("pastDays"),
    forecastDays: num("forecastDays"),
  };
}

function buildUrl(cfg) {
  const params = new URLSearchParams({
    latitude: cfg.lat, longitude: cfg.lon, daily: cfg.daily,
    timezone: cfg.timezone, past_days: cfg.pastDays, forecast_days: cfg.forecastDays,
  });
  return `${cfg.base}?${params.toString()}`;
}

function todayIn(tz) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function stripBlock(html) {
  return html.replace(BLOCK_RE, "");
}

async function freeze(inPath, outPath) {
  const raw = await readFile(inPath, "utf8");
  const html = stripBlock(raw); // refresh cleanly if already frozen
  if (!html.includes(ANCHOR)) {
    throw new Error(`Anchor "${ANCHOR}" not found — is ${inPath} the soil page?`);
  }
  const cfg = readConfig(html);
  const url = buildUrl(cfg);
  const today = todayIn(cfg.timezone);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo request failed (HTTP ${res.status})`);
  const json = await res.json();
  if (!json?.daily?.time) throw new Error("Open-Meteo response missing daily.time");

  const block =
    `${BEGIN} — frozen ${today} from ${url}\n` +
    `   Delete this block (or run \`node freeze.mjs thaw\`) to restore the live weather fetch. */\n` +
    `const __SOIL_FROZEN_JSON__ = ${JSON.stringify(json)};\n` +
    `todayInTz = () => ${JSON.stringify(today)};\n` +
    `fetchWeather = async () => normalizeWeather(__SOIL_FROZEN_JSON__);\n` +
    `${END}\n\n`;

  const out = html.replace(ANCHOR, block + ANCHOR);
  await writeFile(outPath, out);
  console.log(`froze ${today} (${json.daily.time.length} days) -> ${outPath}`);
}

async function thaw(inPath, outPath) {
  const raw = await readFile(inPath, "utf8");
  if (!raw.includes(BEGIN)) {
    throw new Error(`No frozen block found in ${inPath} — nothing to thaw.`);
  }
  await writeFile(outPath, stripBlock(raw));
  console.log(`restored live fetch -> ${outPath}`);
}

const [cmd, inArg, outArg] = process.argv.slice(2);
// Explicit args resolve against the caller's cwd (what a CLI user expects);
// the defaults live next to this script.
const p = (x, dflt) => (x ? resolve(x) : resolve(HERE, dflt));
try {
  if (cmd === "freeze") {
    await freeze(p(inArg, "soil.html"), p(outArg, "soil.static.html"));
  } else if (cmd === "thaw") {
    await thaw(p(inArg, "soil.static.html"), p(outArg, "soil.live.html"));
  } else {
    console.error(
      "usage:\n" +
      "  node freeze.mjs freeze [in=soil.html]        [out=soil.static.html]\n" +
      "  node freeze.mjs thaw   [in=soil.static.html] [out=soil.live.html]",
    );
    process.exit(1);
  }
} catch (err) {
  console.error(`error: ${err.message}`);
  process.exit(1);
}
