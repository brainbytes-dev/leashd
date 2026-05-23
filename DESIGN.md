# Leash — DESIGN.md

The visual contract for Leash. Read before writing any UI. Leash is a non-custodial spend-governance layer for AI agents (Bitcoin/Lightning + stablecoin). The product must feel like precise, trustworthy developer infrastructure: a calm control room for money your agents spend. Not a flashy crypto landing.

## 1. Visual Theme & Atmosphere

**Theme:** Terminal-Sharp. Swiss-style structure (grid, restraint, generous negative space at the section level) fused with a terminal/dev aesthetic (mono numerals, phosphor-green accent, dark-first). Reads as serious infra, like a tool a sovereign dev already trusts.

**The three dials (re-read before every component decision):**

- `DESIGN_VARIANCE = 0.5` — balanced. Conventional, predictable dev-tool patterns, with a few sharp signature moments (the terminal-green accent, mono amounts, the audit-log feed). No experimental layouts. No safe-but-boring blandness either.
- `MOTION_INTENSITY = 0.3` — mostly static. Motion only to communicate state (a payment authorised/denied, a cap hit, a policy saved). No decorative animation, no parallax, no auto-playing hero motion.
- `VISUAL_DENSITY = 0.6` — dense but ordered. This is a control surface: policy tables, agent lists, audit feeds. Pack information tightly with clear hierarchy; do not pad it into a sparse marketing layout. The marketing landing is the one place density drops to ~0.4.

**Atmosphere words:** precise, sovereign, auditable, calm-under-load, no-bullshit. **Never:** hypey, neon-soaked, web3-casino, playful.

## 2. Color

Dark-first. Light mode is supported and must meet contrast, but the default and the brand's home is dark.

### Dark theme (default)
| Role | Hex | Notes |
|------|-----|-------|
| Background base | `#0F172A` | slate-900, the canvas |
| Surface / card | `#1E293B` | slate-800, elevated panels |
| Surface raised | `#243245` | hover/active panels |
| Border | `#334155` | slate-700, hairlines |
| Text primary | `#F8FAFC` | slate-50 |
| Text muted | `#94A3B8` | slate-400, secondary copy on dark only |
| Accent / brand | `#22C55E` | terminal green — primary CTA, brand mark, active focus |
| Accent hover | `#4ADE80` | green-400 |
| Accent active | `#16A34A` | green-600 |

### Light theme
| Role | Hex |
|------|-----|
| Background | `#FFFFFF` / sections `#F8FAFC` |
| Surface | `#FFFFFF` with `#E2E8F0` border |
| Text primary | `#0F172A` |
| Text muted | `#475569` (slate-600 minimum — never lighter) |
| Accent (text/icons on white) | `#16A34A` (green-600 for 4.5:1) |

### Semantic colors (critical — this is a governance product, state must read instantly)
| Meaning | Hex | Use |
|---------|-----|-----|
| Allowed / within policy | `#22C55E` | payment authorised, cap healthy |
| Denied / blocked | `#EF4444` | policy violation, kill-switch active |
| Capped / warning | `#F59E0B` | approaching limit, throttled |
| Info / neutral event | `#38BDF8` | non-decision log entries |

Color is never the only signal: pair each semantic color with an icon and a text label (accessibility + audit clarity).

**Accent discipline:** terminal-green is a scalpel, not a paint bucket. One primary green action per view. Backgrounds stay slate; green marks the live, the active, the authorised.

## 3. Typography

Pairing: **Developer Mono** (JetBrains Mono + IBM Plex Sans). Both Google Fonts.

- **Headings, numerals, monetary amounts, agent IDs, audit-log lines, code:** `JetBrains Mono`. Mono is the brand voice — every sats/USD amount and every agent identifier renders in mono.
- **Body, UI labels, prose, marketing copy:** `IBM Plex Sans`.

```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
```
```js
// tailwind
fontFamily: { mono: ['JetBrains Mono','monospace'], sans: ['IBM Plex Sans','sans-serif'] }
```

Rules: body text ≥16px (≥14px only for dense table cells and log rows). Line-height 1.5–1.65 for prose. Line length 65–75ch in marketing prose. Headings tight tracking (-0.02em). Tabular-nums on all amount columns so figures align.

## 4. Component Stylings

- **Focus state (non-negotiable, every interactive element):** `outline: 2px solid #22C55E; outline-offset: 2px;` via `:focus-visible`. Never remove outlines without replacing them. Keyboard accessibility is mandatory.
- **Buttons:** primary = solid terminal-green (`#22C55E`) on dark, text `#0F172A`, `cursor-pointer`, `transition-colors 200ms`, hover → `#4ADE80`. Secondary = slate-800 surface, slate-700 border, text slate-50. Destructive = red `#EF4444`. Min height 44px (touch target). Disable + show spinner during async; never allow double-submit on a payment-policy action.
- **Cards / panels:** `#1E293B` surface, 1px `#334155` border, radius 8px, no heavy shadows (dark-first uses border + subtle elevation, not drop shadows). Hover feedback via border/opacity, never scale-shift.
- **Tables (policy lists, audit feed):** dense rows, mono amounts right-aligned with tabular-nums, semantic-colored status pills (icon + label), sticky header, zebra via `#1E293B`/`#172033`.
- **Audit-log feed:** terminal-style stream, mono, each line `timestamp · agent · endpoint · amount · decision`, decision colored semantically. The signature component.
- **Inputs:** slate-800 bg, slate-700 border, focus → green ring. Always paired with a `<label for>`.
- **Status pills:** rounded, semantic bg at low opacity + solid semantic text + Lucide icon.

## 5. Layout Principles

- **Spacing grid: strict 8px base** (use 4px only for tight intra-component gaps like icon-to-label). Every padding/margin is a multiple of 4. No `13px`, no `7px`.
- **Generous icon/footer spacing:** icon rows `gap-2` minimum; never cramped. Footer `py-7` minimum. Buttons `size-9`/`size-10` for icon buttons.
- **Containers:** dashboard uses full-width with a fixed left rail; marketing uses `max-w-6xl` centered. Pick one and stay consistent per surface.
- **Z-index scale:** 10 (sticky headers), 20 (dropdowns), 30 (drawers), 50 (modals/toasts).
- **Dashboard density ~0.6:** control-room layout — left nav (workspaces/agents/policies/audit/billing), dense main panel. **Marketing density ~0.4:** vertical, breathing room.

## 6. Motion

Low (0.3). Use only to communicate state, 150–300ms, `transform`/`opacity` only.

- Payment decision: a brief semantic-colored pulse on the log line (green allow / red deny / amber capped).
- Policy saved / kill-switch toggled: 200ms confirm.
- No parallax, no auto-play hero video, no decorative scroll-jacking. Always honor `prefers-reduced-motion` (disable non-essential motion entirely).

## 7. Iconography

**One library: Lucide.** No emojis as icons, ever. Consistent 24×24 viewBox, `w-5`/`w-6`. Icon-only buttons need `aria-label`. Brand/protocol logos (Bitcoin, Lightning) from official sources, not hand-drawn, used sparingly on the marketing surface only.

## 8. Marketing Landing Direction

Not the horizontal-scroll gimmick. A clean vertical dev-tool landing:
1. Hero: one-line promise ("Give your AI agents money. Keep them on a leash.") + a live mono terminal snippet showing a denied over-budget payment. Single green CTA.
2. The problem (agents + unbounded spend) in 3 tight points.
3. Bento grid of capabilities (caps, scoped creds, audit, kill-switch, multi-rail).
4. Code/MCP integration block (it plugs into the agent stack devs already run).
5. Non-custodial trust band (you hold the keys, Leash holds the policy).
6. Pricing. Footer.

Operator framing: "BrainBytes Studio, an indie solo-dev shop." LLC name appears only on /privacy and /terms.

## 9. Do / Don't

**Do:** mono for every amount and ID; semantic color + icon + label for every state; dense-but-ordered control surfaces; one green action per view; visible focus rings; 8px grid.

**Don't:** neon glows everywhere; emoji icons; scale-shift hovers; web3-casino vibes; portfolio-count or "no accounts" promises hardcoded in copy; the LLC name outside legal pages; light-on-light low-contrast text.
