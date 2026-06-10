// Control panel: every user-commandable control plus fault injection (spec R15).
// The panel is per-equipment: clicking a part in the schematic shows just that part's
// controls and its own fault toggles (panelFor builds the descriptor); the header's
// "⚠ faults" button opens the master list covering every failure in graph.yaml
// (hoses, joints, wiring — parts with no clickable glyph). Split so the Node harness
// can gate it: controlSpec() / initialUiState() / panelFor() are pure derivations
// from the model; buildControls() is the DOM half, browser-only.
//
// The UI state IS the solver input shape — { commands, state, faults, lmin } where
// `commands` feeds solveElectrical, `state` feeds solveSteady and `faults` feeds
// compileFaults — so app.js passes it straight through. Widgets mutate it in place
// and report via onChange(ui, { unitsOnly }); a unitsOnly change needs only a
// repaint of the cached result, not a re-solve.

import { listFaults } from "./faults.js";

// Which controls exist, derived from the model so a YAML change propagates:
// one controller command per auto-valve zone, a handle per manual valve, a
// flow-control screw + bleed screw per auto valve, a flo-stop per rotor head,
// and one injectable fault per `fail:` entry.
export function controlSpec(model) {
  const nodes = [...model.flowNodes.values()];
  const ids = (pred) => nodes.filter(pred).map((n) => n.id);
  const autoValves = ids((n) => n.role === "valve-auto");
  // dedupe: one controller command per zone even if a zone ever grows a second valve
  const zones = [
    ...new Set(
      autoValves.map((id) => {
        const m = id.match(/^Z(\d+)\./);
        if (!m) throw new Error(`controls: auto valve "${id}" has no Zn. zone prefix`);
        return Number(m[1]);
      }),
    ),
  ].sort((a, b) => a - b);
  return {
    zones, // controller zone numbers (zone n drives Zn.valve)
    autoValves,
    manualValves: ids((n) => n.role === "valve-manual"),
    rotors: ids((n) => n.role === "outlet" && n.subkind === "rotor"),
    faults: listFaults(model), // every injectable failure (M8)
  };
}

// Everything off / shut / factory-set / healthy: the solver's idle state.
export function initialUiState(spec) {
  const ui = {
    commands: { mv: false, zones: {} },
    state: { manualOpen: {}, bleedOpen: {}, floStop: {}, throttle: {} },
    faults: {},
    lmin: false,
  };
  for (const z of spec.zones) ui.commands.zones[z] = false;
  for (const v of spec.manualValves) ui.state.manualOpen[v] = false;
  for (const v of spec.autoValves) {
    ui.state.bleedOpen[v] = false;
    ui.state.throttle[v] = 1;
  }
  for (const r of spec.rotors) ui.state.floStop[r] = false;
  // clogs hold a 0..1 severity (0 = clear); everything else is a plain toggle
  for (const f of spec.faults) ui.faults[f.key] = f.severity ? 0 : false;
  return ui;
}

// Fault widgets for one fault descriptor: severity clogs get a slider, the rest a
// toggle. Each addresses its ui.faults slot by path, like the control widgets.
const faultWidget = (f) => ({
  kind: f.severity ? "slider" : "toggle",
  label: f.severity ? `${f.label} (severity)` : f.label,
  path: ["faults", f.key],
});

// The per-equipment panel descriptor: which widgets a clicked part exposes, each
// widget addressing its UI-state slot by path (e.g. ["state","throttle","Z1.valve"]).
// Parts without controls return an info line and an empty widget list. `id` is a
// flow-node id, "controller" for the circuit's controller box, or "__faults__" for
// the master fault list. Every descriptor also carries `faults` — that equipment's
// own injectable failures — and the master panel groups ALL of them by part.
export function panelFor(model, id) {
  if (id === "__faults__") {
    const groups = [];
    const byTarget = new Map();
    for (const f of listFaults(model)) {
      if (!byTarget.has(f.target)) {
        const g = { title: f.target, widgets: [] };
        byTarget.set(f.target, g.widgets);
        groups.push(g);
      }
      byTarget.get(f.target).push(faultWidget(f));
    }
    return {
      id,
      title: "Fault injection",
      info: "Every part-by-part failure from graph.yaml. Clogs take a severity; a full clog seals the line.",
      widgets: [],
      faults: [],
      groups,
    };
  }
  const desc = basePanelFor(model, id);
  desc.faults = listFaults(model)
    .filter((f) => f.target === id)
    .map(faultWidget);
  return desc;
}

function basePanelFor(model, id) {
  if (id === "controller") {
    const part = model.circuit?.parts?.controller;
    return {
      id,
      title: `Controller${part?.model ? ` — ${part.model}` : ""}`,
      info: "Commands route through the real wiring — a broken wire stops them acting.",
      widgets: [
        { kind: "toggle", label: "Pump (master valve)", path: ["commands", "mv"] },
        ...controlSpec(model).zones.map((z) => ({
          kind: "toggle",
          label: `Zone ${z} → Z${z}.valve`,
          path: ["commands", "zones", z],
        })),
      ],
    };
  }
  const n = model.flowNodes.get(id);
  if (!n) throw new Error(`controls: no panel target "${id}"`);
  const title = `${id}${n.params?.model ? ` — ${n.params.model}` : ""}`;

  if (n.role === "pump") {
    return {
      id,
      title,
      info: "Runs only when the controller's master-valve output closes the relay through healthy wiring.",
      widgets: [{ kind: "toggle", label: "Pump (master valve)", path: ["commands", "mv"] }],
    };
  }
  if (n.role === "valve-auto") {
    const m = id.match(/^Z(\d+)\./);
    if (!m) throw new Error(`controls: auto valve "${id}" has no Zn. zone prefix`);
    const z = Number(m[1]);
    return {
      id,
      title,
      info: "Lifts when energised (or bled) with enough inlet pressure.",
      widgets: [
        { kind: "toggle", label: `Zone ${z} command (controller)`, path: ["commands", "zones", z] },
        { kind: "slider", label: "Flow-control screw", path: ["state", "throttle", id] },
        { kind: "toggle", label: "Bleed screw open", path: ["state", "bleedOpen", id] },
      ],
    };
  }
  if (n.role === "valve-manual") {
    return {
      id,
      title,
      widgets: [{ kind: "toggle", label: "Handle open", path: ["state", "manualOpen", id] }],
    };
  }
  if (n.role === "outlet") {
    if (n.subkind === "rotor") {
      return {
        id,
        title,
        info: `Nozzle ${n.params.nozzle}, arc ${n.params.arc}°.`,
        widgets: [{ kind: "toggle", label: "Flo-stop closed", path: ["state", "floStop", id] }],
      };
    }
    if (n.subkind === "spray") {
      return {
        id,
        title,
        info: `Nozzle ${n.params.nozzle}, arc ${n.params.arc}° — pressure-regulated, no manual control on the head.`,
        widgets: [],
      };
    }
    return {
      id,
      title,
      info: "Open hose-end nozzle — flow is set by the Z5 hand valve.",
      widgets: [],
    };
  }
  return { id, title: `${id} (${n.kind})`, info: "No user controls on this part.", widgets: [] };
}

// ---- DOM half (browser only) ----

function checkbox(parent, text, checked, onSet) {
  const label = document.createElement("label");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => onSet(input.checked));
  const span = document.createElement("span");
  span.textContent = text;
  label.append(input, span);
  parent.appendChild(label);
}

function slider(parent, text, value, onSet) {
  const label = document.createElement("label");
  label.className = "ctl-slider";
  const span = document.createElement("span");
  span.textContent = text;
  const input = document.createElement("input");
  input.type = "range";
  input.min = "0";
  input.max = "1";
  input.step = "0.05";
  input.value = String(value);
  const val = document.createElement("span");
  val.className = "val";
  const show = () => {
    val.textContent = `${Math.round(Number(input.value) * 100)}%`;
  };
  show();
  input.addEventListener("input", () => {
    show();
    onSet(Number(input.value));
  });
  label.append(span, input, val);
  parent.appendChild(label);
}

// Build the slide-up bottom sheet into `container` and return { ui, select, close }:
// `ui` is the live UI state the widgets mutate, `select(id)` fills the sheet with that
// equipment's controls and slides it up (render.js calls it from glyph clicks),
// `close()` slides it away and reports through onClose (app.js clears the selection
// highlight there). The L/min display toggle is built into `displayEl` — somewhere
// always visible — so it doesn't depend on the sheet being open.
export function buildControls(container, model, onChange, { displayEl, onClose } = {}) {
  const spec = controlSpec(model);
  const ui = initialUiState(spec);
  const changed = () => onChange(ui, { unitsOnly: false });

  container.textContent = "";
  const bar = document.createElement("div");
  bar.className = "sheet-bar";
  const grabber = document.createElement("span");
  grabber.className = "grabber";
  const closeBtn = document.createElement("button");
  closeBtn.className = "sheet-close";
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close controls");
  closeBtn.textContent = "✕";
  bar.append(grabber, closeBtn);
  const panel = document.createElement("div");
  panel.className = "ctl-panel";
  container.append(bar, panel);

  checkbox(displayEl || container, "L/min", ui.lmin, (on) => {
    ui.lmin = on;
    onChange(ui, { unitsOnly: true });
  });

  // the master fault list has no glyph to click — it opens from the header
  if (displayEl) {
    const faultsBtn = document.createElement("button");
    faultsBtn.type = "button";
    faultsBtn.className = "faults-btn";
    faultsBtn.textContent = "⚠ faults";
    faultsBtn.addEventListener("click", () => select("__faults__"));
    displayEl.appendChild(faultsBtn);
  }

  const getPath = (path) => path.reduce((o, k) => o[k], ui);
  const setPath = (path, v) => {
    path.slice(0, -1).reduce((o, k) => o[k], ui)[path[path.length - 1]] = v;
  };

  let currentId = null; // equipment whose panel is showing, for re-renders

  function close() {
    container.classList.remove("open");
    currentId = null;
    onClose?.();
  }
  closeBtn.addEventListener("click", close);

  // Check a snapshot out into the live UI state (quasi-time scrubbing): replace the
  // solver inputs and re-render the open panel so its widgets show the loaded values.
  // The `ui` object itself keeps its identity — widgets and app resolve through it.
  function loadUi(snap) {
    ui.commands = structuredClone(snap.commands);
    ui.state = structuredClone(snap.state);
    ui.faults = structuredClone(snap.faults);
    if (currentId && container.classList.contains("open")) select(currentId);
  }

  function renderWidgets(parent, widgets) {
    for (const w of widgets) {
      if (w.kind === "toggle") {
        checkbox(parent, w.label, !!getPath(w.path), (on) => {
          setPath(w.path, on);
          changed();
        });
      } else if (w.kind === "slider") {
        slider(parent, w.label, getPath(w.path), (t) => {
          setPath(w.path, t);
          changed();
        });
      }
    }
  }

  function select(id) {
    currentId = id;
    const desc = panelFor(model, id);
    panel.textContent = "";
    const h = document.createElement("h2");
    h.textContent = desc.title;
    panel.appendChild(h);
    if (desc.info) {
      const p = document.createElement("p");
      p.className = "ctl-info";
      p.textContent = desc.info;
      panel.appendChild(p);
    }
    renderWidgets(panel, desc.widgets);
    if (desc.faults?.length) {
      const h3 = document.createElement("h3");
      h3.textContent = "Faults";
      panel.appendChild(h3);
      renderWidgets(panel, desc.faults);
    }
    // the master fault list: one collapsible group per part
    for (const g of desc.groups || []) {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = g.title;
      details.appendChild(summary);
      renderWidgets(details, g.widgets);
      panel.appendChild(details);
    }
    container.classList.add("open");
    return desc;
  }

  return { ui, select, close, loadUi };
}
