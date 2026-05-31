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
  arrow downstream), move the wires over. Follow the valve-replacement steps
  in `../playbooks/parts.md`.
- **⚠️ Caveat** — it will fit/run, but verify one thing first: **footprint**
  (does the wider/taller body clear the box and neighbouring valves?),
  **controller** (`-DC` needs DC latching; on 24 VAC swap the AC solenoid
  back in), or **solenoid** (`-LS` ships without one).
- **🔧 Adjustment** — same nominal size, but you must change something:
  re-orient the plumbing (angle body), add/remove female fittings
  (male × male), re-plumb the outlet (barb), or solvent-weld (slip).
- **❌ Not like-for-like** — wrong size or wrong class (anti-siphon).
  Repiping or a different install procedure; not a swap.

## Related images

Use the skill's **existing** image system — don't add a parallel one. Valve
photos already live in `media/` and are indexed in `images.yaml`; surface
them with `SendUserFile`, passing the manifest `caption:` (see SKILL.md →
*Images*). Markdown `![](…)` does not render in the chat UI.

Manifest images already on hand, mapped to the rows above (look the ID up in
`images.yaml`, then send its `file:`):

| Table row | `images.yaml` ID |
|---|---|
| PGV-101G (installed) | `IMG.pgv-valve-globe-101g` (the only clean standalone 101G shot) |
| PGV-100G drop-in | `IMG.pgv-valve-globe-100g`, `IMG.pgv-valve-product` — the 100G has the same globe body/threads as your 101G but **no flow-control knob** (bleed screw only on top). |
| what you actually swap (bonnet / diaphragm / solenoid) | `IMG.pgv-replacement-parts`, `IMG.bleed-screw` |
| `-DC` controller caveat | *No image* (the DC photos were removed). Describe it: silver/labelled "DC LATCHING" solenoid instead of the "24VAC" one. |
| `-A` re-orient (angle body) | `IMG.pgv-valve-angle` (a PGV-101A) |
| `-MB` re-plumb outlet (barb) | `IMG.pgv-valve-barb` (a PGV-101MB) |
| `MM` end type | `IMG.pgv-valve-lineup` — 1" family: 101G, 100G, 101MM, 100MM side by side |
| PGV-151 (1½") / PGV-201 (2") over-size | `IMG.pgv-valve-globe-large` (likely 151G), `IMG.pgv-valve-globe-large-alt` (likely 201G) — exact sizes unconfirmed |

The two `…cutaway` images (`IMG.pgv-valve-cutaway`, `IMG.pgv-valve-cutaway-internals`)
are probably a larger PGV-201G body, not the 101G — fine for illustrating how the
valve works (the hydraulics are common to the family), but don't present them as
the homeowner's exact valve.

No manifest image yet for: 1" **jar-top** (`…JT-G`), the **ICV** series, the
anti-siphon (`ASV`), or the **`-DC` solenoid** (those photos were removed). To
add one, drop the picture in `media/` and add an entry keyed by the model under
`subjects:`, with `file:` (path under `media/`) and a `caption:` — it then
surfaces the same way as every entry above.

Linking convention (matches the rest of the skill):
1. One image index only — `images.yaml`. One compatibility index only — this
   table. Neither duplicates the other.
2. When the user is comparing, lead with the **currently installed** valve
   (PGV-101G) and, at most, the one candidate being weighed — never a gallery.
