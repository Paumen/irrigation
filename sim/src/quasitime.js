// M7 quasi-time: a time-ordered sequence of command-states, each solved as a settled
// steady state. Time is the axis of this mode — every entry has a timestamp, and the
// user places, steps, and plays along the timeline (so pump-before-zone ordering and
// the like are the user's to drive; no controller lead time is hard-coded).
//
// Split like the other UI modules: the timeline data structure and lookups are pure
// (Node-harness testable); buildTimeline() is the DOM player, browser-only. The app
// owns solving: the player only reports "show this entry's snapshot at time t".

import { TL_TAIL_S, TL_TICK_MS, TL_RATE } from "./config.js";

// Deep, independent copy of the live UI state's solver inputs — a captured entry must
// not change when the user keeps working the controls afterwards.
export function snapshotUi(ui) {
  return structuredClone({ commands: ui.commands, state: ui.state, faults: ui.faults || {} });
}

// entries are kept immutably sorted by at_s; equal timestamps keep insertion order,
// so a re-captured time wins (entryIndexAt picks the last one at or before t).
export function addEntry(entries, entry) {
  if (!(entry.at_s >= 0)) throw new Error(`quasitime: entry needs at_s >= 0 (got ${entry.at_s})`);
  const next = [...entries, entry];
  next.sort((a, b) => a.at_s - b.at_s);
  return next;
}

export function removeEntry(entries, index) {
  return entries.filter((_, i) => i !== index);
}

// Index of the entry in effect at time t: the last one with at_s <= t, -1 before the
// first (the system is in its initial idle state until the first entry).
export function entryIndexAt(entries, t) {
  let idx = -1;
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].at_s <= t) idx = i;
    else break;
  }
  return idx;
}

// Scrubbable span: a tail past the last entry so its settled state is visible.
export function spanOf(entries) {
  return (entries.length ? entries[entries.length - 1].at_s : 0) + TL_TAIL_S;
}

// ---- DOM half (browser only) ----

// hooks = {
//   capture: () => snapshot          — snapshot the live UI state (snapshotUi)
//   show: (snap|null, t, idx, n)     — solve+render that snapshot (null = initial idle)
//   exit: () => void                 — leave timeline mode, re-render the live state
// }
// Returns { deactivate } — the app calls it when a live control is touched, so the
// schematic and the scrub position can't silently disagree.
export function buildTimeline(container, { capture, show, exit }) {
  let entries = [];
  let t = 0;
  let active = false;
  let timer = null;

  container.textContent = "";
  const btn = (text, title, onClick) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.title = title;
    b.addEventListener("click", onClick);
    container.appendChild(b);
    return b;
  };

  btn("⏺ capture", "Capture the current controls as the state from time t on", () => {
    entries = addEntry(entries, { at_s: t, snap: capture() });
    refresh();
    showAt(t);
  });
  const prevBtn = btn("⏮", "Jump to the previous state change", () => {
    const i = entryIndexAt(entries, t - 1e-9);
    showAt(i >= 0 ? entries[i].at_s : 0);
  });
  const playBtn = btn("▶", "Play along the timeline", () => (timer ? pause() : play()));
  const nextBtn = btn("⏭", "Jump to the next state change", () => {
    const next = entries.find((e) => e.at_s > t);
    if (next) showAt(next.at_s);
  });

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.step = "1";
  const ticks = document.createElement("datalist");
  ticks.id = "tl-ticks";
  slider.setAttribute("list", ticks.id);
  slider.addEventListener("input", () => showAt(Number(slider.value)));
  container.append(slider, ticks);

  const readout = document.createElement("span");
  readout.className = "tl-readout";
  container.appendChild(readout);

  const clearBtn = btn("✕ clear", "Remove every timeline entry", () => {
    pause();
    entries = [];
    t = 0;
    refresh();
    if (active) showAt(0);
  });
  const liveBtn = btn("live", "Leave the timeline and go back to live control", () => {
    deactivate();
    exit();
  });

  function refresh() {
    slider.max = String(spanOf(entries));
    slider.value = String(t);
    ticks.textContent = "";
    for (const e of entries) {
      const o = document.createElement("option");
      o.value = String(e.at_s);
      ticks.appendChild(o);
    }
    const i = entryIndexAt(entries, t);
    readout.textContent = active
      ? `t = ${Math.round(t)} s · ${i < 0 ? "initial state" : `state ${i + 1}/${entries.length}`}`
      : `${entries.length} state${entries.length === 1 ? "" : "s"} on the timeline`;
    const stepable = entries.length > 0;
    prevBtn.disabled = nextBtn.disabled = playBtn.disabled = !stepable;
    clearBtn.disabled = !stepable;
    liveBtn.disabled = !active;
  }

  function showAt(newT) {
    t = Math.max(0, Math.min(newT, spanOf(entries)));
    active = true;
    refresh();
    const i = entryIndexAt(entries, t);
    show(i >= 0 ? entries[i].snap : null, t, i, entries.length);
  }

  function play() {
    if (timer) return;
    playBtn.textContent = "⏸";
    timer = setInterval(() => {
      const end = spanOf(entries);
      showAt(Math.min(t + (TL_RATE * TL_TICK_MS) / 1000, end));
      if (t >= end) pause();
    }, TL_TICK_MS);
  }

  function pause() {
    clearInterval(timer);
    timer = null;
    playBtn.textContent = "▶";
  }

  function deactivate() {
    pause();
    active = false;
    refresh();
  }

  refresh();
  return { deactivate };
}
