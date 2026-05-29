# Walk through a procedure

Install/replace a rotor or valve, set arc/radius, run a valve manually to test, clean a filter, swap a solenoid, winterize — anything ending with the user picking up a tool.

Pin the model from `setup.yaml` first (a PGV-101G procedure ≠ a generic valve). If the task branches, confirm which case it is — one short question, only when genuinely ambiguous.

Apply the safety gate from the SKILL up front, as a one-line preamble, not a five-bullet header. Refuse mains work.

Read the matching `knowledge/` doc section for the steps and numbers; if it's partial or absent (see `sources.md` — app, pump, main line have no local doc) go straight to the vendor PDF in `media/` (`PGV101G.pdf`, `PSR52.pdf`, `I20.pdf`, `ProSpraytm PRS40.pdf`, `Standard MP Rotator Nozzle.pdf`) and name it so the user can open it too. Numbers — torque, sealant type, riser height, coil resistance — come from there, never memory.

**Pace it to the question — this is the main failure mode.** A broad first-turn ask ("how do I clean a valve?") gets the shape, the one-line safety preamble, and the first move or two — then stop and let them pull. A specific mid-procedure ask ("what torque on the bonnet screws?") gets full depth. Numbered steps when order matters (one action per step), prose when it doesn't. Surface stop-points and verification when they apply, not as a preemptive wall.

Surface procedure images from `images.yaml` at the beats they help (bleed screw, flow-direction arrow, solenoid ¼-turn, rotor cap callouts, swing-joint cross-section, the homeowner's Stanley meter for voltage checks) — one orienting picture up front is plenty; don't dump a gallery.

If "install a new valve" turns into "mine weeps when off, why?" — switch to `playbooks/troubleshoot.md`.
