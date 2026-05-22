---
subject: Pump start relay (Hunter PSR-52)
root_cause_area: R3
serves: [troubleshooting, install, maintain]
system_note: >
  Hunter PSR 52, indoor shed, installed 2020-08. 24 V coil driven from the controller P/MV
  terminal with a DEDICATED common (separate from the zone-valve common); switches 230 V to the
  well pump. Different location from the valve box.
coverage: power/controller wiring, distance, and chattering are well covered; deeper
  relay-internal failure modes beyond chattering/contactor fouling are not.
summary: Pump start relay reference — what it does, power and controller wiring, distance limits, and the chattering fault.
read_when: engine points at the relay (R3); pump won't start while the controller calls; relay chatters/buzzes; installing or rewiring the relay.
contents:
  - what the relay does (24 V coil switches 230 V to the pump)
  - safety (mains-side work is electrician-only)
  - power-source connection (wire colours / terminals)
  - controller connection (P/MV + common)
  - minimum and maximum distance to controller (table)
  - chattering (new-install wire size vs. existing-install contactor fouling)
---

# Pump start relay — Hunter PSR-52

The relay sits between the controller and the well pump: the controller sends a 24 V signal to
the relay coil, and the relay switches 230 V power through to the pump. On this system it lives in
the indoor shed, separate from the valve box, and is driven from the controller's P/MV (pump) output
on a **dedicated** common.

> **Safety — read first.** Everything on the power-supply side of the relay is mains-voltage work
> (120/230 V). Connecting or opening the relay should be done by a licensed electrician following
> local codes; improper work risks shock or fire. Always switch the main circuit breaker off before
> any connection. Do not ask the homeowner to perform mains-side wiring — flag the risk and point
> them to a professional. The 24 V controller-side signal checks are low-voltage and homeowner-safe.

## Power-source connection (wire colours / terminals)

> Electrician-only. Turn the main breaker off before any connection.

| Wire | Role | Connection |
|---|---|---|
| Black | Hot | Single hot for a 120 VAC connection |
| Black | Hot | Second hot for a 240 VAC connection |
| Blue | Neutral | Through the terminal connector block |
| Green | Ground | Through the terminal connector block |
| Yellow | Controller common | To the C (common) terminal in the controller |
| Yellow | Controller P/MV | To the P/MV (pump) terminal in the controller |

- Assemble conduit and connect power supply to the LINE IN side of the relay.
- Assemble conduit and connect the pump-motor wiring to the LOAD OUT side.
- Confirm no exposed or loose connections.

## Controller connection (P/MV + common)

![Controller terminals 1 = P/MV, 2 = common → relay](media/1000381422.png)

1. Remove the relay cover plate (four Phillips screws).
2. Run a single wire from the controller **common** terminal to one yellow relay wire.
3. Run a single wire from the controller **MV/Pump** terminal to the other yellow relay wire.
4. Make the joints with the enclosed wire nuts; confirm they are secure.
5. Refit the cover plate and screws; close and lock the cabinet.

The yellow wires in the relay's lower wiring compartment are the ones that go to the controller.

## Distance to the controller

![Controller ↔ relay distance](media/1000381423.png)

**Minimum.** Keep at least **4.5 m** (15 ft) between controller and relay. When the relay contacts
make and break, they generate electromagnetic noise that can travel back along the 24 V coil wires;
the separation dampens it. Hunter also recommends mounting controllers ≥4.5 m from pumps and other
high-voltage devices.

**Maximum.** One-way wire length controller → relay must not exceed the figures below (converted
from the source's feet/AWG values; mm² are nearest-standard equivalents):

| Model | 0.75 mm² (18 AWG) | 1.5 mm² (16 AWG) | 2.5 mm² (14 AWG) | 4 mm² (12 AWG) | 6 mm² (10 AWG) | 10 mm² (8 AWG) |
|---|---|---|---|---|---|---|
| PSR-52 / PSR-53 | 41 m | 65 m | 104 m | 165 m | 262 m | 416 m |
| PSR-22 | 74 m | 118 m | 188 m | 298 m | 473 m | 751 m |

This system's controller→relay run is 10 m, so length is comfortably within range on any sane gauge —
useful mainly to **exclude** wire length as a cause.

## Electrical specifications (PSR-52)

Switching capacity:
- Max full-load amps: 40 A
- Max resistive amps: 50 A
- HP at 120 VAC: 3 hp
- HP at 230 VAC: **7.5 hp** — comfortably above the DAB Jet well pump on this system.

Coil (the 24 V side the controller drives):
- Inrush: 60 VA / **2.5 A**
- Holding: 5 VA / **0.21 A**

The inrush is what determines wire sizing on the controller→relay run: the coil draws 2.5 A
*momentarily* every time the controller calls a zone, which is why undersized wire makes a relay
chatter on a new install. On this system the dedicated common from the controller and the 10 m
run sit comfortably inside the gauge table above.

## Chattering / buzzing relay

Chattering is almost always **insufficient amperage** reaching the relay from the controller. The
relay needs 24 VAC *and* substantial current to pull in fully. First question: is this a new
installation or one that has worked for years?

**New installation** → suspect undersized wire from controller to relay. Use a **separate common
wire** from the controller to the relay; **never share the relay's common with the zone solenoids**.
Clean every connection and follow the distance/gauge table above.
> On this system the relay already has a dedicated common (per the wiring plan), and the run is short
> — so the new-install wire-size cause is effectively ruled out here.

**Existing installation** (this system — relay in service since 2020-08) → suspect dirt or insects
inside the relay contactor. Isolate the relay from the incoming power supply and open the contactor
to clean it (electrician if you are not comfortable with electricity). You can disconnect the
120/240 V supply while leaving the relay-to-pump wiring in place and check the relay's performance.
If it still chatters and won't fully engage, verify the incoming amperage from the controller and
clean any suspect connections to cut resistance.

Engine cross-links: pairs with Q3 (pump hums/trips vs. silent), Q10 relay-row (recent service), and
Q11 pests (insects in the contactor is the classic existing-install cause).

## See also
- `controller.md` — the P/MV output and common that drive this relay; voltage at terminals.
- `wiring.md` — common-wire separation, connector corrosion, run/gauge.
- `pump.md` — what the relay switches power to (when populated).
