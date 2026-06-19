# UI interpretation mockups

Throwaway visual partials for the simulator's UI requirements (`docs/sim_ui.md`,
`docs/sim_spec.md`) — built to check the *reading* of the spec before any UI code
exists, not to pin down final visuals. Regenerate with `python3 gen.py` (writes to
`/tmp/mock`; requires `cairosvg` only for the PNGs — the SVGs are emitted directly).

| Sheet | Shows | Requirements |
|---|---|---|
| `1-overview` | Main view: wiring band, zone rows off the manifold, supply chain. State = pump on, Z2 watering. | R11, R13, R14, R10 · U2, U6–U13, U16 |
| `2-inspector` | Tap an item → overlay side panel: live state, catalog range, item-level controls. | U8, U9, U17, U18, U19, U22, U23 |
| `3-encoding-key` | How each value is drawn: flow, pressure, status icons, coverage wedge, live/broken wiring. | U9, U12, U13, U14, U15, U16, U21, R12 |

Open choices left for the user (not decided here): flow magnitude (thickness vs
dash-speed vs both); pressure (fill saturation vs number badge vs both); coverage
wedges (always-on vs selected-head only).
