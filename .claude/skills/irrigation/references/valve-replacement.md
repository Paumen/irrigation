# Valve replacement compatibility

Reference for swapping the **automatic zone valves** (Z1–Z4): 1" Hunter PGV
globe valves, FPT × FPT threaded, 24 VAC solenoid. The currently installed
valve is the **PGV-101G** (globe body + flow-control knob). Use this table
to judge whether a candidate valve is a true drop-in, a drop-in with a
caveat, an in-place swap that needs some adjustment, or a non-starter.

Anything that changes flow/pressure (rarely, for a like-size valve) should
still be confirmed with `irrigation_hydraulics`; the bigger risks here are
**physical fit** (thread type, body footprint, mounting class) and
**electrical fit** (solenoid voltage / latching type).

## Compatibility table

| Verdict | Model | Why |
|---|---|---|
| ✅ Direct drop-in | **PGV-100G** | Same 1" globe body, FPT thread, 24 VAC solenoid. No flow control. |
| ✅ Direct drop-in | **PGV-101G** | **Your current valve.** Same body/thread/solenoid; adds a flow-control knob you can leave open. |
| ⚠️ Caveat: footprint | **PGV-100JT-G** | Same 1" globe / FPT / 24 VAC, but **jar-top bonnet → wider & taller body (~3¼" vs 2½")**. Check box/manifold clearance. |
| ⚠️ Caveat: footprint | **PGV-101JT-G** | As above (jar-top, wider & taller) **+ flow control**. Clearance check. |
| ⚠️ Caveat: footprint | **ICV-101G** | Threads + 24 VAC match, so it screws on. But taller/wider commercial body (clearance check) and 220 PSI rating is overkill for a residential zone. |
| ⚠️ Caveat: footprint | **ICV-101G-FS / ICV-101G-FS-R** | As ICV-101G, taller still (Filter Sentry). Reclaimed (`-R`) only if you want the purple ID. |
| ⚠️ Caveat: controller | **any `-DC` model** (e.g. ICV-101G-DC, PGV `…-DC` option) | Physically fits, but the DC-latching solenoid needs a battery/solar controller. On your 24 VAC controller, swap the solenoid back to AC. |
| ⚠️ Caveat: no solenoid | **any `-LS` model** | Same body, ships **without a solenoid** — transfer yours or buy one. |
| 🔧 Adjustment: re-orient | **PGV-100A / PGV-101A** | 1", but **angle body** = bottom-feed / 90° outlet. Plumbing must feed from below. |
| 🔧 Adjustment: fittings | **PGV-100MM / PGV-101MM** | 1", but **male × male** thread — your pipe needs female fittings. |
| 🔧 Adjustment: fittings | **PGV-100JT-MM / PGV-101JT-MM** | Jar-top (also wider), same male × male thread issue. |
| 🔧 Adjustment: re-plumb outlet | **PGV-100MB / PGV-101MB** | Male inlet + **barb outlet** for poly/drip tubing — outlet side must be re-plumbed. |
| 🔧 Adjustment: re-plumb outlet | **PGV-100JT-MB / PGV-101JT-MB** | Jar-top (also wider), same barb-outlet issue. |
| 🔧 Adjustment: solvent-weld | **PGV-100JTG-S / PGV-101JTG-S** | **Slip sockets** — glued PVC, not threaded. Needs solvent-weld instead of threading on. |
| ❌ Not like-for-like: size | **PGV-151 / -151-DC / -151-LS** | 1½" — needs reducer bushings or a repipe; sized for 20–120 GPM. |
| ❌ Not like-for-like: size | **PGV-201 / -201-DC / -201-LS** | 2" — repipe; 20–150 GPM. |
| ❌ Not like-for-like: size | **ICV-151G / ICV-201G / ICV-301** (+ all `-FS`/`-DC`/`-R`/`-A`/`-G` variants) | 1½"–3" commercial — repipe + larger valve box. |
| ❌ Not like-for-like: class | **PGV-ASV** (¾") | Anti-siphon — mounts above ground, ≥6" above the highest head; not an in-box inline replacement. |
| ❌ Not like-for-like: class | **PGV-101-ASV** (1") | 1" but still anti-siphon — different mounting/install class, not a drop-in. |

### Reading the verdicts

- **✅ Direct drop-in** — unscrew old, thread new in same orientation (flow
  arrow downstream), move the wires over. Follow the valve steps in
  `install.md`.
- **⚠️ Caveat** — it will fit/run, but verify one thing first: **footprint**
  (does the wider/taller body clear the box and neighbouring valves?),
  **controller** (`-DC` needs DC latching; on 24 VAC swap the AC solenoid
  back in), or **solenoid** (`-LS` ships without one).
- **🔧 Adjustment** — same nominal size, but you must change something:
  re-orient the plumbing (angle body), add/remove female fittings
  (male × male), re-plumb the outlet (barb), or solvent-weld (slip).
- **❌ Not like-for-like** — wrong size or wrong class (anti-siphon).
  Repiping or a different install procedure; not a swap.

## Related images (linking convention)

There are no part images committed to the repo yet. Proposed convention so
the agent can show the right picture when discussing a model:

1. **Store images under** `references/images/` next to this file, named by
   model in lowercase with the suffix preserved, e.g.
   `references/images/pgv-101g.jpg`, `references/images/pgv-100jt-g.jpg`.
2. **Keep a manifest** `references/images.yaml` mapping each model (and its
   aliases) to `{ file, alt, source }` so a model with no local image can
   still carry a manufacturer URL instead of a broken link:

   ```yaml
   PGV-101G:
     file: images/pgv-101g.jpg
     alt: "Hunter PGV-101G 1\" globe valve with flow control"
     source: "https://www.hunterindustries.com/..."
   PGV-100JT-G:
     file: images/pgv-100jt-g.jpg
     alt: "Hunter PGV-100JT-G jar-top globe valve"
     source: "https://www.hunterindustries.com/..."
   ```

3. **Reference images** from Markdown with paths relative to this file:
   `![Hunter PGV-101G](images/pgv-101g.jpg)`. When a model is only in the
   manifest as a `source` URL, surface the link rather than embedding.
4. **Agent behaviour:** when the answer centres on a specific model, look it
   up in `images.yaml`; if a local `file` exists, embed it, otherwise offer
   the `source` link. Prefer one image of the *currently installed* valve
   (PGV-101G) plus, at most, the candidate being compared.

This keeps the table the single source of truth for compatibility and the
manifest the single source of truth for imagery, so neither has to be
duplicated inline per row.
