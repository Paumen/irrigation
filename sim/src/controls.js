// Controls stub (U17/U19) — the side sheet that holds the control surface.
//
// The canonical surface is the eight controls in sim_state_model.md, and nothing else the
// operator sets (world-edge states stay at their healthy default; faults are deferred, M8).
// This stub renders the eight as inert rows at their default so the surface is pinned into
// the UI before any item is wired. U18 (catalog-context inspection) builds on this later.

// The eight controls (sim_state_model.md). Scope = per-valve / per-head / per-port at build time.
const CONTROLS = [
  { id: "energize", label: "Energize port", kind: "toggle", default: false },
  { id: "handle", label: "Manual handle", kind: "toggle", default: false },
  { id: "throttle", label: "Throttle screw", kind: "range", default: 1 },
  { id: "bonnetBleed", label: "Bonnet bleed", kind: "toggle", default: false },
  { id: "solenoidBleed", label: "Solenoid bleed", kind: "toggle", default: false },
  { id: "headShutoff", label: "Head flo-stop", kind: "toggle", default: false },
  { id: "nozzle", label: "Nozzle", kind: "select", default: "factory" },
  { id: "arc", label: "Arc (°)", kind: "range", default: 360 },
];

// onChange is the U20/U16 hook: any change should trigger a debounced re-solve + re-render.
// The stub wires the listeners but onChange is a no-op until the solver is glued in (M6).
export function mountControls(sheet, onChange = () => {}) {
  sheet.replaceChildren();
  for (const c of CONTROLS) {
    const row = document.createElement("label");
    row.style.cssText = "display:flex;justify-content:space-between;gap:8px;padding:2px 0;";
    const name = document.createElement("span");
    name.textContent = c.label;

    let input;
    if (c.kind === "toggle") {
      input = document.createElement("input");
      input.type = "checkbox";
      input.checked = c.default;
    } else if (c.kind === "range") {
      input = document.createElement("input");
      input.type = "number";
      input.value = String(c.default);
    } else {
      input = document.createElement("input");
      input.value = String(c.default);
    }
    input.disabled = true; // inert: no item is wired yet
    input.dataset.control = c.id;
    input.addEventListener("change", () => onChange(c.id, input));

    row.append(name, input);
    sheet.append(row);
  }
}
