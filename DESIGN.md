# Saldo Design System

## Company Overview

**Saldo** is a goal-driven financial planning system that helps users decide how their income fuels their future—before it arrives. The product is proactive and intentional: rather than tracking spending after the fact, Saldo helps users allocate income purposefully toward goals, savings, and obligations in advance of receiving it.

**Tagline:** *Decide how your income fuels your future—before it arrives.*

**Sources provided:**
- Design system specification: "Depth & Light" (provided as text — no external Figma or codebase attached)

---

## Products

| Product | Description |
|---------|-------------|
| **Saldo App** | Core financial planning interface — income allocation, goals, budget views |

---

## CONTENT FUNDAMENTALS

### Voice & Tone
- **Direct and empowering.** Saldo speaks with authority, not anxiety. It's confident about money.
- **Future-oriented.** Copy focuses on what's ahead, not what's been lost. "Plan" not "track."
- **Personal, not clinical.** Feels like a thoughtful advisor, not a bank statement.
- **Calm.** No urgency language, no alarming red alerts unless truly critical.

### Casing
- **Sentence case** everywhere — headings, buttons, labels. (e.g. "Add a goal", "Plan your income")
- No ALL CAPS for emphasis. Use weight (600) instead.
- Proper nouns capitalized normally: Saldo, Goals, Income.

### Perspective
- **Second person ("you/your")** — "Your income," "Your goals," "Plan your future."
- Never use first-person corporate "we" in UI copy.

### Numbers & Currency
- Currency always shown with symbol prefix: **$1,200**, **$50/mo**
- Large numbers use comma separators: **$12,450**
- Percentages shown as: **24%**, never "24 percent"

### Emoji
- **Not used.** Saldo's aesthetic is clean, restrained, and professional. No emoji in UI.

### Microcopy Examples
- "Allocate before it arrives" — not "Start budgeting now"
- "Your income, working for you" — not "Make money work harder"
- "Add a goal" — not "Create New Goal"
- "This month's plan" — not "Budget for May"

---

## VISUAL FOUNDATIONS

### Design System: Depth & Light

Saldo uses the **Depth & Light** design language — surfaces appear as physical objects under directional overhead lighting. Everything feels tactile and considered, not flat.

### Color
- **Dark-first palette.** Near-black backgrounds with subtle indigo undertone.
- **Surfaces layer** from Z0 (darkest) to Z3 (lightest) in +4% OKLCH lightness steps.
- **One accent color:** Teal `#0F7A67` → `oklch(48% 0.10 175)`. Used exclusively for primary actions, active states, links.
- **All other surfaces are neutral gray.** Never apply the teal to backgrounds or decorative elements.
- Light theme also available (inverted surface stack, same primary).

### Typography
- **Font:** Inter (primary sans-serif), JetBrains Mono (numeric/code display)
- **Scale:** Display (48px/600) → H1 (32px) → H2 (24px) → H3 (18px) → Body (15px) → Small (13px) → Tiny (11px)
- **Weight:** 400 body, 500 UI labels, 600 headings
- Numbers and financial figures often rendered in JetBrains Mono for clarity

### Backgrounds
- No images, gradients, or textures as page backgrounds.
- Subtle vertical gradient on surface cards (top → slightly darker bottom) to suggest curvature.
- No patterns, no noise texture, no illustration backgrounds.

### Cards
- **Top highlight:** `1px solid oklch(100% 0 0 / 10%)` — simulates overhead light catch
- **Side/bottom borders:** `0.5px solid var(--color-border)` — subtle structure
- **Dual shadow:** proximity (sharp) + ambient (soft diffuse)
- **Radius:** 12px (cards), 8px (buttons), 6px (inputs), pill for chips
- Inner nested cards use `radius - 4px` = 8px

### Spacing & Layout
- Base unit: 4px grid
- Card padding: 20px
- Section spacing: multiples of 8px
- Sidebar fixed-width; content area scrolls

### Shadows
- **Proximity:** `0 1px 2px 0 oklch(0% 0 0 / 8%)` — sharp, close
- **Ambient:** `0 6px 20px -4px oklch(0% 0 0 / 16%)` — soft, diffuse
- Elevation increases shadow scale: Z1 → Z2 → Z3 shadows grow

### Hover States
- Surface: L+3% in OKLCH
- Primary button: L+5% (`--color-primary-hover`)
- Transition: 150ms ease

### Press/Active States
- L−3% in OKLCH

### Focus States
- 2px transparent gap + 4px ring at `oklch(48% 0.10 175 / 40%)`

### Animations
- Minimal. 150ms ease for hovers and color transitions.
- 200ms ease for toggles/switches.
- No bounces, springs, or decorative motion.
- Entrance animations: simple fade + translate (e.g. 200ms ease-out).

### Corner Radii
- Card: 12px
- Button: 8px
- Input: 6px
- Chip/pill: 9999px

### Transparency & Blur
- Backdrop blur used sparingly (modals, overlays)
- Semi-transparent borders used for primary-tinted elements
- No frosted-glass effects on main surfaces

### Imagery
- No photography or illustration used as backgrounds.
- Iconography: geometric, line-style icons (Lucide icon family recommended).
- Charts and data visualizations use the primary teal + muted grays.

### Industrial Mode
- All radii collapse to 0px (sharp corners). Available as `.industrial` class.

---

## ICONOGRAPHY

### Approach
- **Line icons only.** No filled icons. Clean, 1.5px stroke weight.
- **Lucide Icons** (CDN: `https://unpkg.com/lucide@latest`) — used throughout.
- No custom icon font; icons are SVG via Lucide library.
- Icons never used decoratively. Each icon carries clear semantic meaning.
- Sizes: 16px (inline), 20px (standard UI), 24px (prominent actions)
- Color: `--color-fg-muted` by default; `--color-primary` for active states.
- No emoji as icon substitutes.

### Key Icons Used
| Context | Icon Name |
|---------|-----------|
| Goals | `target` |