---
name: css-guide
description: CSS conventions, prohibited patterns, and style architecture. Invoke before editing any .css file or when resolving CSS lint/build errors.
---

CSS Style Guide — invoke before editing any `.css` file or when resolving CSS lint/build errors.

This skill governs all CSS work. Reference files alongside this `SKILL.md` provide deeper guidance for complex work.

---

## When to Use This Skill

- **Always** before editing or creating any `.css` file.
- **Always** when a stylelint error, CSS build error, or visual bug occurs.
- **On error**: read `prohibited.md` (next to this file) before attempting fixes.
- **On design-heavy work** (new components, animations, layout changes): also read `patterns.md` and `architecture.md`.

---

## Pre-Flight Checklist

Before making ANY CSS change, complete these steps in order:

1. **Identify target file(s)** using the File Map below.
2. **Read the current state** of the file you will edit.
3. **Make the change** following the Do/Don't table below.
4. **Validation is automatic** — the PostToolUse hook runs stylelint with `--fix` on every `.css` edit.
5. **If errors remain**: read `prohibited.md` (next to this file), fix using the approved alternative.
6. **Run `./scripts/css-check.sh`** for full validation (stylelint + dead code detection).

---

## Folder Structure (this skill)

```
.claude/skills/css-guide/
├── SKILL.md                           ← This file. Core rules, always loaded.
├── prohibited.md                      ← Prohibited properties/values with rationales + alternatives.
│                                        Read when: stylelint errors, unclear what to use.
├── patterns.md                        ← Component & interaction patterns with code examples.
│                                        Read when: new components, animations, interaction states.
└── architecture.md                    ← CSS architecture deep-dive (layers, scoping, sizing, theming).
                                         Read when: structural layout work, theming, responsiveness.
scripts/css-check.sh                   ← Stylelint + dead CSS class detection. Run for full validation.
```

**Automation:**

- **PostToolUse hook** auto-runs `stylelint --fix` on every `.css` file edit.
- **`./scripts/css-check.sh`** runs full validation: stylelint + dead code detection.
- **`./scripts/css-check.sh styles.css`** runs checks on a single file.

---

## Do's and Don'ts

| Feature            | Do (Modern / Preferred)                       | Don't (Legacy / Avoid)             | Why                                             |
| :----------------- | :-------------------------------------------- | :--------------------------------- | :---------------------------------------------- |
| **Spacing**        | `gap: 1rem;`                                  | `margin-bottom: 1rem;`             | `gap` manages flow without orphaned margins.    |
| **2D Layout**      | `display: grid;` / `subgrid;`                 | `float` / `table` / `flex` grids   | Modern CSS is robust and content-aware.         |
| **Responsiveness** | `@container (width > 400px)`                  | `@media (min-width: 768px)`        | Components should be spatially self-aware.      |
| **Dark Mode**      | `color: light-dark(#000, #fff);`              | `.dark-mode { color: #fff; }`      | Native engine handling vs. class toggling.      |
| **Logic**          | `:has(.input-error)`                          | JS `.classList.add()`              | Reduces JS-to-CSS dependency.                   |
| **Dimensions**     | `width: auto;` / intrinsic                    | `width: 100vw;` / `500px;`         | Hard-coded units break scalability.             |
| **Interactions**   | `<details>` / `<summary>`                     | `div` + JS click listeners         | Accessible, zero-JS functionality.              |
| **Shorthand**      | `padding: 1rem;` / `inset: 0;`                | `padding-top` / `top: 0; left: 0;` | Reduces code volume and override complexity.    |
| **Units**          | `cqi`/ `rem` / `clamp()`                      | `px` for font or spacing           | `px` ignores user browser/zoom preferences.     |
| **State**          | `[aria-expanded="true"]`                      | `.is-active` / `.is-open`          | Semantic, accessible, no custom classes needed. |
| **Colors**         | `var(--color-*)` from variables.css           | Hard-coded hex/rgb/oklch           | Tokens ensure consistency and themeability.     |
| **Hover**          | `color-mix(in srgb, var(--brand), black 15%)` | Hard-coded hover color             | Derived mathematically from one token.          |

---

## Development Standards

- **KISS & DRY:** The best solution usually involves removing CSS, not adding it.
- **Modern-First (2026+):** Optimize for modern engines. Zero legacy fallbacks.
- **No Dead Code:** Delete unused styles immediately. Don't keep "just in case" rules.
- **Decoupled:** Changes in one layer (HTML/CSS/JS) should not force updates in others.
- **No Hacks:** Never bypass linters (e.g., `[id=foo]` to dodge ID rules, oklch tricks to avoid variables).
- **No Compensating CSS:** If a wrapper is removed, verify if the parent handles layout naturally before adding rules.
- **Component Reuse:** Reuse generic classes (`.card`, `.btn-pill`). Don't create new structures for minor visual variations.

---

## Margin Exception

`margin` is prohibited for spacing between siblings — use `gap` instead.

**Allowed exceptions:**

- Top-level elements (children of `<body>`) where `gap` cannot be applied.
- Negative margins for specific alignment corrections (must document rationale in a comment).

When in doubt: if `gap` can achieve the same result, use `gap`.

---

## Error Recovery: When Stylelint Fails

Follow this decision tree — do NOT guess or try random fixes:

1. **Read the exact error message.** Identify the property, value, and rule that failed.
2. **Check `prohibited.md`** (next to this file) for the prohibited item and its approved alternative.
3. **If the alternative requires a variable** that doesn't exist → request permission to add it to `variables.css`.
4. **If the alternative requires a new class** → request permission with the format above.
5. **If you genuinely cannot find an alternative** → STOP and ask the human. Explain what you tried.
6. **NEVER** modify stylelint config, eslint config, or use inline styles to work around the error.
7. **After fixing**, re-run `npm run stylelint` to confirm the fix worked.

---

## When You're Stuck

If you cannot achieve the visual result without a prohibited property or pattern:

1. **STOP.** Do not try workarounds, hacks, or "creative" solutions.
2. **Report to the human** with:
   - What you're trying to achieve visually.
   - Which convention is blocking you.
   - What alternatives you already considered and why they don't work.
3. **Wait for guidance.** The human may grant an exception, suggest an approach you hadn't considered, or adjust the requirement.

The cost of asking is zero. The cost of a CSS hack is technical debt that compounds.

---

## Reference Files

For deeper guidance, read the appropriate reference file from this skill's folder:

| File              | Read when...                                                                                 |
| :---------------- | :------------------------------------------------------------------------------------------- |
| `prohibited.md`   | Stylelint error, unsure what's prohibited, need the approved alternative                     |
| `patterns.md`     | Building new components, adding animations, interaction states, hover/focus patterns         |
| `architecture.md` | Structural layout work, `@layer`/`@scope` usage, theming, container queries, sizing strategy |
