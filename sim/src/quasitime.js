// M7 quasi-time: a time-ordered sequence of command-states, each solved as a settled
// steady state. Time is the axis — the user drags the cursor and changes the live
// controls; every change is recorded as the transition at the cursor's time (so
// pump-before-zone ordering and the like are the user's to drive; no controller lead
// time is hard-coded). Scrubbing/stepping/playing shows the state in effect at each
// time, and checks it out into the live controls so further edits build on it.
//
// Split like the other UI modules: the timeline data structure and lookups are pure
// (Node-harness testable); buildTimeline() is the DOM player, browser-only. The app
// owns solving and recording: the player only reports "show this snapshot at time t".

import { TL_TAIL_S, TL_TICK_MS, TL_RATE } from "./config.js";

// Deep, independent copy of the live UI state's solver inputs — a recorded transition
// must not change when the user keeps working the controls afterwards.
export function snapshotUi(ui) {
  return structuredClone({ commands: ui.commands, state: ui.state, faults: ui.faults || {} });
}

// entries are kept immutably sorted by at_s, one transition per time: recording at an
// existing timestamp replaces that transition (consecutive control changes at one
// cursor position collapse into the final state).
export function addEntry(entries, entry) {
  if (!(entry.at_s >= 0)) throw new Error(`quasitime: entry needs at_s >= 0 (got ${entry.at_s})`);
  const next = entries.filter((e) => e.at_s !== entry.at_s);
  next.push(entry);
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
//   show: (snap|null, t, idx, n) — render that snapshot's settled state (null =
//                                  initial idle) AND check it out into the live
//                                  controls, so edits at this time build on it
// }
// Returns { record } — the app calls record(snapshotUi(ui)) on every live control
// change; the snapshot becomes the transition at the cursor's current time
// (consecutive changes at one position replace each other).
export function buildTimeline(container, { show }) {
  let entries = [];
  let t = 0;
  let timer = null;

  container.textContent = "";
  const label = document.createElement("span");
  label.className = "tl-label";
  label.textContent = "time";
  label.title = "Drag the cursor, then change controls: each change becomes the transition at that time.";
  container.appendChild(label);
  const btn = (text, title, onClick) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.title = title;
    b.addEventListener("click", onClick);
    container.appendChild(b);
    return b;
  };

  const prevBtn = btn("⏮", "Jump to the previous transition", () => {
    pause();
    const i = entryIndexAt(entries, t - 1e-9);
    showAt(i >= 0 ? entries[i].at_s : 0);
  });
  const playBtn = btn("▶", "Play along the timeline", () => (timer ? pause() : play()));
  const nextBtn = btn("⏭", "Jump to the next transition", () => {
    pause();
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
  slider.addEventListener("input", () => {
    pause();
    showAt(Number(slider.value));
  });
  container.append(slider, ticks);

  const readout = document.createElement("span");
  readout.className = "tl-readout";
  container.appendChild(readout);

  const clearBtn = btn("✕ clear", "Remove every transition", () => {
    pause();
    entries = [];
    showAt(0);
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
    readout.textContent = entries.length
      ? `t = ${Math.round(t)} s · ${i < 0 ? "before the first transition" : `transition ${i + 1}/${entries.length}`}`
      : "t = 0 s · change a control to record its transition here";
    const stepable = entries.length > 0;
    prevBtn.disabled = nextBtn.disabled = playBtn.disabled = !stepable;
    clearBtn.disabled = !stepable;
  }

  function showAt(newT) {
    t = Math.max(0, Math.min(newT, spanOf(entries)));
    refresh();
    const i = entryIndexAt(entries, t);
    show(i >= 0 ? entries[i].snap : null, t, i, entries.length);
  }

  // a live control changed: it becomes (or updates) the transition at the cursor
  function record(snap) {
    pause();
    entries = addEntry(entries, { at_s: t, snap });
    refresh();
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

  refresh();
  return { record };
}
