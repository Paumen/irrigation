# UI interpretation mockups

Visual partials for the simulator's UI requirements (`docs/sim_ui.md`,
`docs/sim_spec.md`) — built to check the *reading* of the spec before any UI
code exists, not to pin down final visuals.

## Naming

`sim-ui-<requirement(s)>-<what-it-is>` — each file names the main `sim_ui.md`
requirement(s) it addresses and what kind of mock it is (diagram / side panel /
line visualizations). There are two diagrams, two side panels, and one legend:

| File | What it is | Requirements |
|---|---|---|
| `sim-ui-U6-diagram` | Diagram: wiring band, zone rows off the manifold, supply chain. State = pump on, Z2 watering. | U6 · R10·R11·R13·R14 · U2·U7–U13·U16 |
| `sim-ui-U8-diagram-with-panel` | The diagram with the inspector panel docked beside it — the integrated whole-app view. | U8 · U6·U7·U18·U14·U22 |
| `sim-ui-U18-side-panel-overlay` | Tap an item → panel **overlays** the (faded) diagram: live state, catalog range, item controls. | U18 · U8·U9·U17·U19·U22 |
| `sim-ui-U18-side-panel-docked` | Tap an item → panel **docks beside** the diagram, which stays the canvas. | U18 · U8·U14·U15·U17·U19·U20 |
| `sim-ui-U12-U16-diagram-line-visualizations` | Legend: how each value is drawn — flow, pressure, status icons, coverage wedge, live/broken wiring. | U12–U16 · U9·U21·R12 |

## Layout

SVG **sources** live in `svg/`; the rendered **PNGs** (what you view inline)
sit at the top level next to this README, same basename.

## Regenerating

`gen.py` generates three of the five — `sim-ui-U6-diagram`,
`sim-ui-U18-side-panel-overlay`, and `sim-ui-U12-U16-diagram-line-visualizations`.
The other two (`sim-ui-U8-diagram-with-panel`, `sim-ui-U18-side-panel-docked`)
are hand-authored SVG in `svg/` (edited directly).

```sh
python3 gen.py        # (re)writes the generated SVG sources into svg/
python3 svg2png.py    # renders every svg/*.svg to a same-named *.png here
```

`svg2png.py` is a standard SVG→PNG converter (`pip install cairosvg`); it keeps
every committed PNG in sync with its SVG source, hand-authored ones included.

## Open choices left for the user (not decided here)

Flow magnitude (thickness vs dash-speed vs both); pressure (fill saturation vs
number badge vs both); coverage wedges (always-on vs selected-head only);
side panel overlay vs docked.

## Session archive (`session-*`)

Raw, unedited mocks from the chat exploration that fed the sheets above — kept as
a record only. They predate this naming and the still-open overlay-vs-docked
question (U8); prefer the `sim-ui-*` sheets.

