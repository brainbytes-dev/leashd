# Leash. Design System (Terminal, Cashu-leaning)

The visual contract for the Leash web app. Read before any UI work.
The dashboard inherits these tokens automatically. Marketing pages apply
them directly. Cashu wins by subtraction: clean, neutral, lots of breathing
room.

## Dials (taste knobs, 0.0 to 1.0)

- `DESIGN_VARIANCE`: 0.3. Restrained and clean, not loud. Subtractive over additive.
- `MOTION_INTENSITY`: 0.2. Subtle only. 150 to 300ms, ease-out, transform/opacity. Respect prefers-reduced-motion.
- `VISUAL_DENSITY`: 0.4. Compact but airy. Generous whitespace, 48px+ between major sections.

The shift from the old direction: the canvas moved from slate/blue to a
NEUTRAL zinc dark theme, and the type system moved to Karla (headings/sans)
plus IBM Plex Mono (body/code/amounts). Accent stays GREEN. This is Leash's
differentiator versus Cashu's purple.

## 1. Visual Theme and Atmosphere

Dark-first, neutral. A terminal that feels engineered, not decorated. Green
phosphor accent for governance and trust. Pure-black surfaces on a zinc-900
canvas. No gradients, no glow, no chrome.

## 2. Color Palette (tokens in globals.css)

Dark (default):
- background `#18181b` (zinc-900)
- card / surface `#000000`
- border `#3f3f46` (zinc-700)
- text primary `#f6f7ff`
- text muted `#6b7280`
- accent (primary) `#10b981`, hover `#34d399`

Light:
- background `#ffffff`
- foreground `#18181b`
- muted-foreground `#52525b`
- border `#e4e4e7` (zinc-200)
- accent text `#059669` (for >=4.5:1 contrast on white)

Semantic (governance decisions):
- allow `#10b981`
- deny `#ef4444`
- capped `#fbbf24`
- info `#38bdf8`

Token NAMES are stable (`--background`, `--foreground`, `--card`,
`--primary`, `--border`, `--muted-foreground`, `--allow`, `--deny`,
`--capped`, `--info`). Only the VALUES changed. Do not introduce colors
outside this palette.

## 3. Typography

- Headings / sans: Karla, weight 700. `--font-sans`.
- Body / code / amounts / IDs: IBM Plex Mono, weight 400. `--font-mono`.
- Loaded via `next/font/google` in `src/app/layout.tsx`.
- Line height: 1.5 body, 1.2 headings.
- All monetary amounts and IDs use `tabular-nums`.
- No extra fonts. Two families only.

## 4. Component Stylings

- Buttons: solid (primary green) and ghost/outline. Radius `.5rem`.
- Cards: `#000000` surface, `#3f3f46` border. Subtle inset/ring borders,
  not heavy drop shadows. Hover: border brightens to accent.
- Focus: every interactive element has a visible `:focus-visible` ring,
  2px solid accent green, 2px offset (set globally in globals.css).
- Terminal/audit-feed motif is Leash's signature: a mono card with a
  three-dot bar and allow/deny/capped log lines. Keep it.

## 5. Layout Principles

- Grid: strict 4px multiples. No arbitrary spacing.
- Max content width: `66rem`, centered.
- Section spacing: 48px+ (py-20) between major sections, divided by hairline
  borders.
- Compact but airy density. Centered hero and section intros.

## 6. Motion

Subtle. 150 to 300ms, ease-out, transform and opacity only. No layout
thrash. Respect prefers-reduced-motion.

## Anti-patterns (hard rules)

- NO backdrop-blur or blur of any kind.
- NO zebra striping (no odd:/even: row tints).
- NO colors outside the palette above.
- NO arbitrary spacing (everything is a 4px multiple).
- NO extra fonts beyond Karla and IBM Plex Mono.
- NO em-dashes in any copy. Use periods, commas, colons.
