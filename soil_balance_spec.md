# Soil Balance — Spec (mockup)

> Status: **mockup**. This pins the intended model and API for the soil
> watering tool. The reference implementation lives in `soil.js`.

## 1. Purpose

A soil-water "checkbook" for the homeowner's irrigation system. It tracks how
much plant-available water sits in the root zone day by day, and answers the
only two questions that matter for scheduling:

- **When** should I water?
- **How much** should I put down?

It is a bookkeeping model, not a physics engine. Water in (rain, irrigation)
is credited, water out (evapotranspiration) is debited, and anything past the
soil's capacity overflows and is lost.

## 2. The model

The root zone is a single reservoir. Its level is tracked as **depletion** `D`
— millimetres of water *below* field capacity. `D = 0` means full (field
capacity); larger `D` means drier.

Soil holds water between two limits, both volumetric fractions (mm of water per
mm of soil):

- **Field capacity** `θ_fc` — the most the soil holds against gravity (full).
- **Wilting point** `θ_wp` — the driest the plant can still extract from.

Derived quantities, given a root depth `Z` (mm):

| Symbol | Name | Formula |
| ------ | ---- | ------- |
| `AWC`  | available water capacity (per mm soil) | `θ_fc − θ_wp` |
| `TAW`  | total available water | `AWC × Z` |
| `RAW`  | readily available water | `MAD × TAW` |

`MAD` is the **management-allowed depletion** — the fraction of `TAW` the
homeowner is willing to use up before refilling (default `0.5`). `RAW` is the
trigger threshold: water before depletion crosses it, and the plant never feels
stress.

## 3. Daily update

For each day, in this order:

1. **Decide irrigation.** In `auto` mode, if the start-of-day depletion has
   reached `RAW`, schedule an irrigation that refills to field capacity
   (`amount = D`). In `events` mode, use the day's supplied irrigation depth.
2. **Credit gains.** `D ← D − (irrigation + effectiveRain)`. If `D` goes
   negative, the soil overflowed: record the overflow as **loss** (runoff /
   deep percolation) and clamp `D` to `0`.
3. **Debit the day's water use.** `D ← D + ETc`, where `ETc = ET0 × Kc`
   (reference evapotranspiration × crop coefficient).
4. **Flag stress.** If `D > RAW` at end of day, the day is **stressed**. `D`
   may exceed `TAW` (drier than wilting point); record it but never clamp the
   debit side.

`effectiveRain` is the rainfall that actually enters the root zone. The mockup
uses a flat capture fraction (default `0.85`); light/heavy split is a non-goal.

## 4. Inputs

Per run (config):

- `soil` — a preset name (`sand` | `loam` | `clay`) or an explicit
  `{ fieldCapacity, wiltingPoint }`.
- `rootDepthMm` — root zone depth.
- `kc` — crop coefficient.
- `mad` — management-allowed depletion fraction (default `0.5`).
- `rainCaptureFraction` — default `0.85`.
- `mode` — `auto` (model schedules irrigation) or `events` (caller supplies).
- `initialDepletionMm` — starting state (default `0`, i.e. full).

Per day (a series, one entry per day):

- `et0` — reference ET (mm).
- `rain` — rainfall (mm), default `0`.
- `irrigation` — applied depth (mm), used in `events` mode, default `0`.

## 5. Outputs

`simulate()` returns one record per day plus a summary:

- Per day: `{ day, etc, rain, effectiveRain, irrigation, loss, depletion,
  percentDepleted, stressed }`.
- Summary: total irrigation, total effective rain, total ET, total loss,
  number of irrigation events, number of stressed days.

`percentDepleted = D / TAW` is the headline number for a UI gauge: `0%` full,
`100%` at the wilting point.

## 6. Soil presets

Representative volumetric values (illustrative, mockup-grade):

| Preset | `θ_fc` | `θ_wp` | `AWC` |
| ------ | ------ | ------ | ----- |
| sand   | 0.12   | 0.04   | 0.08  |
| loam   | 0.28   | 0.12   | 0.16  |
| clay   | 0.38   | 0.24   | 0.14  |

## 7. Non-goals (mockup)

- No hourly resolution — daily steps only.
- No soil layering, capillary rise, or salinity.
- No weather forecasting; rain is supplied, not predicted.
- No coupling to the hydraulics simulator (`sim/`). The balance consumes an
  *applied depth* in mm; how the system delivers it is out of scope here.

## 8. API surface

```js
const { simulate, SOIL_PRESETS, taw, raw } = require('./soil');

const result = simulate(days, config);
//   days   : [{ et0, rain?, irrigation? }, ...]
//   config : { soil, rootDepthMm, kc, mad?, mode?, ... }
//   result : { days: [...records], summary: {...}, params: { taw, raw } }
```
