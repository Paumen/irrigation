# HTML & CSS Selector Inventory

A grouped reference of every HTML element, class, pseudo-class, pseudo-element,
data attribute, ARIA attribute, Alpine directive, and CSS custom property used
across `index.html`, `styles.css`, `app.js`, and `icons.js`.

**Sections** (5 logical regions of the markup):

1. `schematic` — `<details data-card="schematic">` (SVG figure; includes JS-rendered `renderFlows()` and `renderDiagram()`)
2. `form` — `<details data-card="form">` (questionnaire, stage nav)
3. `rank` — `<details data-card="rank">` (root-cause list)
4. `rec` — `<details data-card="rec">` (recommendations)
5. `dialog` — `<dialog x-ref="reset">` (reset confirmation)

All counts in the **HTML/JS** column are occurrences outside `styles.css`. SVG
nodes emitted from `app.js` strings are attributed to the `schematic` section.

## 1. HTML elements

| Element | HTML (static) | JS (rendered) | Sections |
| --- | --: | --: | --: |
| `main` | 1 | – | – |
| `details` | 4 | – | 4* |
| `summary` | 4 | – | 4 |
| `figure` | 1 | – | 1 (schematic) |
| `header` | 1 | – | 1 (form) |
| `footer` | 2 | – | 2 (form, dialog) |
| `nav` | 1 | – | 1 (form) |
| `h2` | 2 | – | 2 (form, dialog) |
| `p` | 1 | – | 1 (dialog) |
| `div` | 6 | – | 3 |
| `span` | 13 | – | 3 |
| `code` | 1 | – | 1 (rank) |
| `ol` | 2 | – | 2 (rank, rec) |
| `li` | 2 | – | 2 |
| `button` | 12 | – | 4 (all except schematic) |
| `form` | 1 | – | 1 (form) |
| `table` | 1 | – | 1 (form) |
| `tr` | 2 | – | 1 (form) |
| `th` | 3 | – | 1 (form) |
| `td` | 1 | – | 1 (form) |
| `label` | 2 | – | 1 (form) |
| `input` | 3 | – | 1 (form) |
| `datalist` | 1 | – | 1 (form) |
| `option` | 1 | – | 1 (form) |
| `template` | 17 | – | 3 (form, rank, rec) |
| `dialog` | 1 | – | – (it *is* the section) |
| `svg` | 2 | – | 2 (schematic, form) |
| `g` | 2 | 4 | 1 (schematic) |
| `defs`, `marker` | 1, 1 | – | 1 (schematic) |
| `rect` | – | 1 | 1 (schematic) |
| `path` | – | 8 | 1 (schematic) |
| `text` | – | 1 | 1 (schematic) |
| `line` | – | 5 | 1 (schematic) |
| `circle` | – | 17 (in `icons.js`) | – (icon library) |
| `polyline` | – | 8 (in `icons.js`) | – (icon library) |
| `script`, `link`, `meta`, `title`, `body`, `head`, `html` | shell | – | – |

\* `details` is the wrapper of each section, so it appears once per section.

## 2. CSS classes

| Class | HTML uses | JS uses | Sections |
| --- | --: | --: | --: |
| `.option` | 1 | – | 1 (form) |
| `.slider-row` | 1 | – | 1 (form) |
| `.slider-value` | 1 | – | 1 (form) |
| `.stage-label` | 1 | – | 1 (form) |
| `.bar` | 2 | – | 2 (form, rank) |
| `.rank-row` | 1 | – | 1 (rank) |
| `.percent` | 1 | – | 1 (rank) |
| `.see-more-btn` | 2 | – | 2 (rank, rec) |
| `.recommendation` | 2 | – | 1 (rec) |
| `.recommendation-text` | 1 | – | 1 (rec) |
| `.discriminator` | 1 | – | 1 (rec) |
| `.node-box` | – | 1 | 1 (schematic) |
| `.node-group` | – | 1 | 1 (schematic) |

## 3. Custom data attributes

| Attribute | HTML | JS | Sections | Values seen |
| --- | --: | --: | --: | --- |
| `data-card` | 4 | – | wraps each section | `schematic`, `form`, `rank`, `rec` |
| `data-tone` | 5 | – | 2 (form, dialog) | `mute` ×4, `danger` ×1 |
| `data-shape` | 4 | – | 3 (form, rank, rec) | `square` ×2, `ghost` ×2 (no `circle` in markup, declared in CSS only) |
| `data-q` | 3 | – | 1 (form) | `options`, `sliders`, `matrix` |
| `data-state` | 1 (`:data-state` binding) | – | 1 (form) | `complete` |
| `data-flow` | – | 1 | 1 (schematic) | `water`, `lateral`, `ctrl`, `mains`, `wifi` (driven by `window.DATA.flows`) |
| `data-hose` | – | 1 | 1 (schematic) | `true` |

## 4. ARIA / accessibility attributes

| Attribute | HTML | JS | Sections |
| --- | --: | --: | --: |
| `aria-label` | 5 | – | 1 (form) |
| `aria-labelledby` | 1 | – | 1 (dialog) |
| `aria-current` | 3 static + 2 dynamic bindings | 2 (via `renderFlows` / `renderDiagram`) | 3 (form, rank, schematic) |
| `scope` | 2 (`col`, `row`) | – | 1 (form) |
| `title`, `autofocus`, `disabled` | misc | – | – |

## 5. Native HTML attributes that drive CSS

`[type='radio']`, `[type='range']`, `:disabled` (4 inline uses, 0 in JS, 1 section: form), `:checked`, `[aria-current]`, `[x-cloak]`.

## 6. CSS pseudo-classes (CSS-only)

`:root`, `:active`, `:disabled`, `:checked`, `:not()`, `:where()`, `:has()`.

## 7. CSS pseudo-elements (CSS-only)

`::backdrop`, `::after`, `::view-transition-group(*)`, `::-webkit-slider-runnable-track`, `::-webkit-slider-thumb`, `::-moz-range-track`, `::-moz-range-thumb`.

## 8. CSS at-rules (CSS-only)

| At-rule | Targets |
| --- | --- |
| `@property` | `--c-sev-t`, `--line-flow-end` |
| `@keyframes` | `node-highlight-pulse`, `flow-dash` |
| `@container page` | `width >= 1080px`, `width <= 760px` |

## 9. CSS custom properties

Most live entirely in `styles.css`. The few that are *set from outside CSS*:

| Variable | Where set | Sections |
| --- | --- | --: |
| `--bg-fill` | `:style` on `.slider-row` | 1 (form) |
| `--c-sev-t` | `:style` on `.rank-row` | 1 (rank) |
| `--accent-vt-rc` | `:style` on `.rank-row` (view-transition-name) | 1 (rank) |
| `--sp-cols` | `:style` on matrix `<table>` | 1 (form) |

Token groups defined in `:root` (CSS-only): color (10), typography (6), spacing
(5), borders/lines (6), radii (2), motion (2), opacity (4), shared assets (2),
plus component-local `--c-sev-bg`, `--c-sev-fg`, `--c-flow`, `--line-flow-dash`,
`--line-flow-dash-on`.

## 10. Alpine.js directives & bindings

| Directive | HTML uses | Sections |
| --- | --: | --: |
| `x-data` | 3 | 2 (`app` on main, `seeMore` in rank+rec) |
| `x-cloak` | 1 | wraps the whole app |
| `x-for` | 9 | 3 (form, rank, rec) |
| `x-if` | 8 | 3 (form, rank, rec) |
| `x-text` | 16 | 3 |
| `x-html` | 3 | 2 (schematic ×2, form) |
| `x-show` | 2 | 2 (rank, rec) |
| `x-ref` | 1 | 1 (dialog) |
| `:key` | 9 | 3 |
| `:style` | 5 | 2 (form, rank) |
| `:disabled` | 4 | 1 (form) |
| `:aria-current` | 3 | 2 (form, rank) |
| `:aria-label` | 2 | 1 (form) |
| `:data-state` | 1 | 1 (form) |
| `:checked` | 2 | 1 (form) |
| `:value` | 2 | 1 (form) |
| `:id` | 1 | 1 (form) |
| `:title` | 1 | 1 (form) |
| `:min`, `:max`, `:list`, `:name` | 1, 1, 1, 2 | 1 (form) |
| `@click` (incl. `.stop`) | 13 | 4 (all except schematic) |
| `@change` | 2 | 1 (form) |
| `@input` | 1 | 1 (form) |
| `@submit.prevent` | 1 | 1 (form) |

Magic globals used in handlers: `$refs.reset`, `$event.target`, `$watch`.

## 11. Element IDs

- `#arr` — SVG marker (arrowhead) in `<defs>` — 1 use, 1 section (schematic)
- `#reset-title` — `aria-labelledby` target — 1 use, 1 section (dialog)
- Dynamic: `ticks-{questionId}-{rowId}` — datalist linked from slider `:list` (1 template, form section)

## 12. View-transition names

| Name | Source | Sections |
| --- | --- | --: |
| `form-card` | `[data-card='form']` rule in CSS | 1 (form) |
| `rc-{rcId}` | `--accent-vt-rc` set on each `.rank-row` | 1 (rank) |

## 13. SVG attributes used

In `index.html`: `viewBox`, `preserveAspectRatio`, `xmlns`, `refX`, `refY`,
`markerWidth`, `markerHeight`, `orient`, `fill`. In rendered strings (`app.js`,
`icons.js`): `x`, `y`, `x1/y1/x2/y2`, `cx`, `cy`, `r`, `width`, `height`,
`stroke`, `stroke-width`, `stroke-dasharray`, `stroke-linecap`, `stroke-linejoin`,
`stroke-dashoffset`, `text-anchor`, `dominant-baseline`, `marker-end`,
`transform`, `points`, `d`, `opacity`.

## Section heat-map (where each group concentrates)

| Section | Dominant content |
| --- | --- |
| `schematic` | SVG infrastructure: `defs/marker`, `data-flow`, `data-hose`, `.node-box`, `.node-group`, animations |
| `form` | Largest section; nearly every Alpine binding, all `data-q` variants, `<input>`, matrix table, sliders, options, stage `nav` |
| `rank` | `.rank-row`, `.percent`, `.bar`, `.see-more-btn`, dynamic `--c-sev-t` and view-transition names |
| `rec` | `.recommendation`, `.discriminator`, `.recommendation-text`, `.see-more-btn` |
| `dialog` | `aria-labelledby`, `data-tone="danger"`, `autofocus`, dedicated `<h2>` + `<p>` + `<footer>` |
