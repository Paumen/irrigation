// Control panel: every user-commandable control (spec R15, minus M8's fault toggles)
// and the UI state it holds. The panel is per-equipment: clicking a part in the
// schematic shows just that part's controls (panelFor builds the descriptor). Split so
// the Node harness can gate it: controlSpec() / initialUiState() / panelFor() are pure
// derivations from the model; buildControls() is the DOM half, browser-only.
//
// The UI state IS the solver input shape — { commands, state, lmin } where `commands`
// feeds solveElectrical and `state` feeds solveSteady — so app.js passes it straight
// through. Widgets mutate it in place and report via onChange(ui, { unitsOnly });
// a unitsOnly change needs only a repaint of the cached result, not a re-solve.

// Which controls exist, derived from the model so a YAML change propagates:
// one controller command per auto-valve zone, a handle per manual valve, a
// flow-control screw + bleed screw per auto valve, a flo-stop per rotor head.
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
  };
}

// Everything off / shut / factory-set: the solver's idle state.
export function initialUiState(spec) {
  const ui = {
    commands: { mv: false, zones: {} },
    state: { manualOpen: {}, bleedOpen: {}, floStop: {}, throttle: {} },
    lmin: false,
  };
  for (const z of spec.zones) ui.commands.zones[z] = false;
  for (const v of spec.manualValves) ui.state.manualOpen[v] = false;
  for (const v of spec.autoValves) {
    ui.state.bleedOpen[v] = false;
    ui.state.throttle[v] = 1;
  }
  for (const r of spec.rotors) ui.state.floStop[r] = false;
  return ui;
}

// The per-equipment panel descriptor: which widgets a clicked part exposes, each
// widget addressing its UI-state slot by path (e.g. ["state","throttle","Z1.valve"]).
// Parts without controls return an info line and an empty widget list. `id` is a
// flow-node id, or "controller" for the circuit's controller box.
export function panelFor(model, id) {
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
  const title = `${id}${n.params.model ? ` — ${n.params.model}` : ""}`;

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

function section(container, title) {
  const div = document.createElement("div");
  div.className = "ctl-section";
  const h = document.createElement("h3");
  h.textContent = title;
  div.appendChild(h);
  container.appendChild(div);
  return div;
}

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

// Build the panel scaffolding into `container` and return { ui, select }: `ui` is the
// live UI state the widgets mutate, `select(id)` swaps the panel to that equipment's
// controls (render.js calls it from glyph clicks). The display toggle stays put.
export function buildControls(container, model, onChange) {
  const spec = controlSpec(model);
  const ui = initialUiState(spec);
  const changed = () => onChange(ui, { unitsOnly: false });

  container.textContent = "";
  const panel = document.createElement("div");
  panel.className = "ctl-panel";
  container.appendChild(panel);

  const display = section(container, "Display");
  checkbox(display, "Flows in L/min", ui.lmin, (on) => {
    ui.lmin = on;
    onChange(ui, { unitsOnly: true });
  });

  const getPath = (path) => path.reduce((o, k) => o[k], ui);
  const setPath = (path, v) => {
    path.slice(0, -1).reduce((o, k) => o[k], ui)[path[path.length - 1]] = v;
  };

  function select(id) {
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
    for (const w of desc.widgets) {
      if (w.kind === "toggle") {
        checkbox(panel, w.label, !!getPath(w.path), (on) => {
          setPath(w.path, on);
          changed();
        });
      } else if (w.kind === "slider") {
        slider(panel, w.label, getPath(w.path), (t) => {
          setPath(w.path, t);
          changed();
        });
      }
    }
    return desc;
  }

  const hint = document.createElement("p");
  hint.className = "ctl-hint";
  hint.textContent =
    "Click a part in the diagram — the pump, a valve, a head, or the controller — to see and work its controls.";
  panel.appendChild(hint);

  return { ui, select };
}
