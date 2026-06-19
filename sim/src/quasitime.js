// STUB for U20 (sim_ui.md) — the animation clause of "change any control and the
// whole system updates at once: every derived value and animation follows." The real
// module is M7 (sim_build_plan.md): a semi-realistic in-time transition between two
// settled solveSteady results. This stub is the identity transition — it snaps straight
// to the target, the no-op baseline (cf. faults.js emptyEffects) that lets the M6 render
// loop run end-to-end before M7 lands. Keep the from->to seam so M7 is a drop-in.

// transition(from, to) -> { done, sample(t) }: what render draws while animating from
// one settled result to the next. Stub completes immediately and every sample is the
// target, so render snaps with no interpolation.
export function transition(_from, to) {
  return { done: true, sample: () => to };
}
