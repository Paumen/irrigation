// Control panel: every user-commandable control (spec R15, minus M8's fault toggles)
// and the UI state it holds. Split in two so the Node harness can gate it:
// controlSpec() / initialUiState() are pure derivations from the model;
// buildControls() is the DOM half, browser-only.
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

// Build the widgets into `container` and return the live UI state they mutate.
// Every change calls onChange(ui, { unitsOnly }).
export function buildControls(container, model, onChange) {
  const spec = controlSpec(model);
  const ui = initialUiState(spec);
  const changed = () => onChange(ui, { unitsOnly: false });

  const ctl = section(container, "Controller");
  checkbox(ctl, "Pump (master valve)", ui.commands.mv, (on) => {
    ui.commands.mv = on;
    changed();
  });
  for (const z of spec.zones) {
    checkbox(ctl, `Zone ${z} → Z${z}.valve`, ui.commands.zones[z], (on) => {
      ui.commands.zones[z] = on;
      changed();
    });
  }

  const hand = section(container, "Hand-watering");
  for (const v of spec.manualValves) {
    checkbox(hand, `${v} handle open`, ui.state.manualOpen[v], (on) => {
      ui.state.manualOpen[v] = on;
      changed();
    });
  }

  const valves = section(container, "Zone valves");
  for (const v of spec.autoValves) {
    slider(valves, `${v} flow control`, ui.state.throttle[v], (t) => {
      ui.state.throttle[v] = t;
      changed();
    });
    checkbox(valves, `${v} bleed screw open`, ui.state.bleedOpen[v], (on) => {
      ui.state.bleedOpen[v] = on;
      changed();
    });
  }

  const rotors = section(container, "Rotor flo-stops");
  for (const r of spec.rotors) {
    checkbox(rotors, `${r} flo-stop closed`, ui.state.floStop[r], (on) => {
      ui.state.floStop[r] = on;
      changed();
    });
  }

  const display = section(container, "Display");
  checkbox(display, "Flows in L/min", ui.lmin, (on) => {
    ui.lmin = on;
    onChange(ui, { unitsOnly: true });
  });

  return ui;
}
