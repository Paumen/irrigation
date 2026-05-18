# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Single-page diagnostic web app that walks a homeowner through an irrigation/rotor troubleshooting questionnaire and continually re-ranks the most likely root causes, visualised on a system schematic. Live at https://paumen.github.io/irrigation/. See `docs/spec.md` for the product spec.

## Build / run

There is no build step, no dev server, and no test runner. To iterate locally, edit files and open `index.html` directly (or serve the directory with any static server). Alpine.js 3 is loaded as a global from a CDN by `index.html`; `data.js`, `icons.js`, and `app.js` populate `window.DATA`, `window.ICONS`, and register the Alpine `app` factory respectively.

The DOM lives in `index.html` as declarative Alpine templates (`x-data="app"`, `x-for`, `x-if`, `x-text`, `:attr`, `@event`). State, getters, and methods live in `app.js`.

