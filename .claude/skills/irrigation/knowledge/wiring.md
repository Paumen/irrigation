---
subject: Field wiring (24 V low-voltage)
root_cause_area: F3
serves: [troubleshooting, test, install]
coverage: partial
summary: Partial — wire-distance table, waterproof-connector rule, and the isolation tests; no deeper splice or common-wire fault detail yet.
read_when: a conductor, splice, or common is suspected; positively excluding wire length as a cause; isolating wiring vs valve vs controller.
contents:
  - coverage note (what's missing)
  - waterproof connectors (corrosion → resistance → blown fuses)
  - the connector itself — 3M Scotchlok 314 (what it's called + how to buy more)
  - wire distance vs gauge table (feet/metres caveat)
  - swap-wire test (controller end)
  - swap-valve test (valve-box end, four-in-one-box)
  - continuity / resistance check
---

# Field wiring — 24 V low-voltage

**Coverage note.** Sourced so far: the wire-distance table, the waterproof-connector rule, and the
basic continuity/swap tests (carried in from the valve material). No deeper splice-level or
common-wire fault detail yet. On short residential runs, wire length is almost certainly *not* a
cause — the table is useful mainly to positively exclude it. (Check the actual run lengths in
`setup.yaml`.)

## Waterproof connectors (install + corrosion fault)

Use waterproof wire connectors for every solenoid-to-field-wire joint in the valve box.
Non-waterproof connections corrode; corrosion raises electrical resistance; high resistance can blow
fuses or trip the controller. A corroded splice is a classic intermittent/seasonal fault.

## The connector itself — 3M Scotchlok 314 (what it's called, how to buy more)

The little **blue-and-white** gel-filled connectors crimped onto the 24 V field wires are **3M
Scotchlok 314** connectors (the blue cap is stamped "3M 314"). Clear/white silicone-gel-filled body,
blue squeeze-down cap, two or three wire ports. They're *insulation-displacement* (IDC) connectors —
you push the un-stripped wires in and crimp the cap flat with pliers; the metal element bites through
the insulation and the gel seals out water. About **2.4 cm long × 1.7 cm wide × 1.7 cm tall**. Rated
for low-voltage / 24 V irrigation control wire (also sold as a phone/alarm wire connector).

This is the part to search for when re-ordering or buying spares. It goes by many names — surface this
section whenever the homeowner describes *that blue/white thing on the wires* or asks what it's called:

> **3M Scotchlok 314** · 3M 314 connector · gel connector / gel-filled connector · gel-cap ·
> waterproof wire connector · waterproof splice connector · low-voltage / 24 V wire connector ·
> sprinkler / irrigation wire connector · the blue/white connector · blue-white splice · cable
> connector · wire splice
>
> **Dutch (NL):** afzetklem · waterdichte (kabel)verbinder · waterdichte lasdop / kabelverbinder ·
> 3M verbinder · 24V kabelverbinder · gel(verbinder) · blauw/wit verbindertje · klem op het snoer /
> op de snoeren · draadverbinder · verbinding voor draadjes / kabels
>
> Search terms (any language, for finding more to buy): *afzetklem · waterdicht · 3M · 314 ·
> connection · connector · verbinder · 24v · kabel · stroom · gel · gell · blue · white · splice ·
> blauw · wit · op snoer · snoer · snoeren · cable · cables · kabel · kabels · draad · draadjes ·
> draden · lasdop*

Images: `IMG.wiring-3m-connector-314-photo` (the stamped blue cap) — surface it when showing the
homeowner what to look for or order.

## Wire distance vs. gauge

Maximum one-way run between controller and a single active heavy-duty solenoid (24 VAC; 350 mA
inrush / 190 mA holding at 60 Hz; 370 mA / 210 mA at 50 Hz). With **two** solenoids energised
simultaneously on the same wires, **halve** these distances.

> **Unit caveat:** the source table is metric by gauge (mm²) but its caption reads "distance in
> feet". The figures below are reproduced as given — confirm feet vs. metres against the Hunter PGV
> document in `media/` before relying on a value near the limit. Academic for short residential runs.

Distance by ground (C) wire (rows) × control/hot wire (columns), in the source's units:

| C \ Hot | 0.5 mm² | 1.0 mm² | 1.5 mm² | 2.5 mm² | 4.0 mm² | 6.0 mm² |
|---|---|---|---|---|---|---|
| 0.5 mm² | 140 | 190 | 210 | 235 | 250 | 260 |
| 1.0 mm² | 190 | 290 | 335 | 415 | 465 | 495 |
| 1.5 mm² | 208 | 335 | 397 | 515 | 595 | 647 |
| 2.5 mm² | 235 | 415 | 515 | 730 | 900 | 1030 |
| 4.0 mm² | 250 | 465 | 595 | 900 | 1175 | 1405 |
| 6.0 mm² | 260 | 495 | 647 | 1030 | 1405 | 1745 |

## Swap-wire test (controller end)

Move the suspect station's wire to a known-working terminal at the controller. If the fault follows
the wire, it is in the conductor/splice/solenoid downstream. If it stays on the original terminal,
it is the controller.

## Swap-valve test (valve-box end)

Where the zone valves share one box, use them against each other. At the valve manifold,
swap the suspect station's field wires onto a valve you know works (or move the known-good valve's
wires onto the suspect run). Then:
- **Fault follows the valve** → the valve/solenoid is bad, not the wiring.
- **Fault stays on the original wire/position** → the conductor or splice on that run is bad, not the
  valve.
Pairs naturally with the splice-vs-solenoid voltage check in `valve-solenoid.md`: voltage isolates
where the signal dies, the swap isolates whether the hardware or the wire is at fault.

## Continuity / resistance check

At the controller, check the suspect run:
- **Continuous, low resistance** → conductor is sound.
- **Open / high resistance** → broken conductor or corroded splice.
- **Intermittent when wiggled** → loose or marginal splice/connection.

Compare against the solenoid coil reading: a healthy 20–60 Ω at the coil but a bad reading back at
the controller isolates the fault to the wiring, not the valve (`valve-solenoid.md`).

## See also
- `controller.md` — voltage at the controller terminals.
- `valve-solenoid.md` — voltage and coil resistance at the valve end.
