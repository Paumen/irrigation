# `example_data.json` — frozen sample for UI prototyping

A real snapshot of `soil.js`'s `compute({}, weather)` output, captured against
live Open-Meteo weather for the built-in site on 2026-06-20. Use it to build the
UI without hitting the network or re-running the balance.

Regenerate by running this from the `soil/` directory (`node regen.mjs`):

```js
import { writeFileSync } from "node:fs";
import { compute, fetchWeather } from "./soil.js";

const result = compute({}, await fetchWeather());
// wateredSet is a Set, which JSON.stringify drops to {}; serialize it as an array.
const out = { ...result, wateredSet: [...result.wateredSet] };

// Round every number to 4 dp to strip float noise (3.78000…02 -> 3.78),
// but leave `site` lat/lon exact — rounding those would shift the coordinates.
const round4 = (v) => (typeof v === "number" ? Math.round(v * 1e4) / 1e4 : v);
const clean = (node, key) =>
  key === "site" ? node
  : Array.isArray(node) ? node.map((v) => clean(v))
  : node && typeof node === "object"
    ? Object.fromEntries(Object.entries(node).map(([k, v]) => [k, clean(v, k)]))
  : round4(node);

writeFileSync("example_data.json", JSON.stringify(clean(out), null, 2) + "\n");
```

## Controls used

Defaults from `DEFAULTS`: planting **Flower bed** (Kc 0.90, root 0.30 m, p 0.45),
soil **Sandy loam** (130 mm·m⁻¹), watering 60 min, **no days watered**.

## Shape

- Derived params: `kc`, `rootDepth`, `p`, `soilAW`, `tankSize` (39 mm), `raw`,
  `threshold` (21.45 mm), `dose`, `thresholdFraction`.
- `series[]` — one entry per fetched day: `index`, `start`, `ks`, `et0`, `loss`,
  `rain`, `applied`, `gain`, `level` (all mm of plant-available water; 0 =
  wilting, `tankSize` = field capacity).
- `weather` — `time`, `weekday`, `rain`, `et0`, `tempMax` (parallel arrays;
  `weekday` is the day-of-week name for each `time` date).
- `wateredSet` — serialized as an array of watered day indices (empty here).

32 days total (`pastDays` 16 + today + `forecastDays` 15); **today is index 16**
(2026-06-20). Values are full precision — round only for display (UIX-6).

## Why it's a good prototyping sample

A mid-June heatwave (ET₀ rising to ~6.6 mm/day, max temp 36 °C) dries the tank
from full down to ~2.8 mm, so `ks` falls well below 1 (the water-stress regime);
then heavy rain (10.5 + 18.3 mm) refills it. The window exercises both the
healthy and stressed branches plus the threshold crossing.
