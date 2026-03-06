# Design Directions

Five parallel design directions for the Deals Radar homepage, each implemented in its own git worktree and branch. All directions move from dark mode to light mode.

---

## Direction 1: Broadsheet

**Branch:** `design/broadsheet`
**Worktree:** `.worktrees/broadsheet/`
**Status: COMPLETE** — committed as `65387cc`

### Concept

An editorial newspaper aesthetic. Clean, authoritative, typographically driven. Think Financial Times or The Economist adapted for a deals tracker.

### Visual Language

- **Fonts:** Playfair Display (serif display titles) + DM Sans (body) + Space Mono (mono/prices)
- **Colors:** Parchment background `#FAF7F2`, near-black `#1A1A1A` text, vermillion red `#E63928` accent
- **Radius:** 0px everywhere — hard right angles
- **Borders:** Single rules, `border-b-2` masthead divider
- **Shadows:** None

### Key Treatments

- Header acts as a newspaper masthead with a date line beneath
- "DEALS RADAR" set in Playfair Display, large, centered
- Deal titles in Playfair Display serif
- Store names in uppercase tracked DM Sans
- Prices and discounts in vermillion red (mapped to `green-gain`)
- All `dark:` classes removed

---

## Direction 2: Soft Machine

**Branch:** `design/soft-machine`
**Worktree:** `.worktrees/soft-machine/`
**Status: COMPLETE** — committed as `9a4655f`

### Concept

Warm, approachable, modern consumer app. Rounded, airy, and friendly. Inspired by Airbnb / Linear's softer moments.

### Visual Language

- **Fonts:** Plus Jakarta Sans throughout
- **Colors:** Off-white `#FEFDFB` background, slate `#334155` text, coral `#F2654A` accent, sage `#6B9E7D` for savings
- **Radius:** sm=8px, md=12px, lg=16px up to 4xl=32px — very rounded
- **Borders:** None on cards — shadow-based depth instead
- **Shadows:** `shadow-sm` at rest, `shadow-md` + slight lift on hover

### Key Treatments

- Header uses shadow instead of border, "deals" + "radar" in lowercase with coral highlight
- Deal cards: `rounded-2xl`, no border, shadow elevation
- Images: `rounded-2xl` top corners
- Progress bars and badges: `rounded-full`
- Tabs: pill style with `rounded-xl` container and card-bg active state
- "Load More" (not "LOAD MORE") — softer casing throughout

---

## Direction 3: Neo-Brutal Pop

**Branch:** `design/neo-brutal-pop`
**Worktree:** `.worktrees/neo-brutal-pop/`
**Status: IN PROGRESS** — fonts installed + 4 files written (styles.css, \_\_root.tsx, Header.tsx, card.tsx), not yet committed

### Concept

High-energy neobrutalist UI with a pop art attitude. Bold black borders, hard offset shadows, electric yellow + hot pink palette. Loud but controlled.

### Visual Language

- **Fonts:** Outfit (bold display/body) + IBM Plex Mono (prices/codes)
- **Colors:** White `#FFFFFF` background, black `#1A1A1A` borders/text, electric yellow `#F5E642` primary, hot pink `#FF3B8B` for savings/discounts
- **Radius:** 8px everywhere
- **Borders:** `border-2 border-foreground` on all interactive elements
- **Shadows:** Hard 4px offset — `box-shadow: 4px 4px 0 #1A1A1A` (neo-shadow utility)
- **Background:** Dot grid pattern via CSS radial-gradient

### Key Treatments

- Header: yellow background bar, "DEALS" + "RADAR" with slight rotation on RADAR
- Cards: `border-2`, `neo-shadow`, translate on hover to simulate press
- Buttons: border + shadow with translate-on-hover/active press effect
- Discount badges: hot pink with border, `-3deg` rotation
- Tabs: filled yellow active state with border + shadow
- Progress bars: hot pink fill on light grey track

### Remaining Files

- `dealCard.tsx` — needs hot pink prices, rotated discount badge, bordered image container
- `dealsFeed.tsx` — needs yellow tab styling, neo-shadow load more button
- `button.tsx` — needs border-2 + neo-shadow variants
- `tabs.tsx` — needs yellow active fill, border-based design
- `badge.tsx` — needs hot pink variant, border, slight rotation
- `skeleton.tsx` — needs border-2 styling

---

## Direction 4: Aether

**Branch:** `design/aether`
**Worktree:** `.worktrees/aether/`
**Status: NOT STARTED** — fonts installed (Instrument Sans + Cormorant Garamond), no design files written yet

### Concept

Quiet luxury. Minimalist to the point of almost nothing. The anti-deals-site — restrained, editorial, premium. Influenced by high-end fashion e-commerce.

### Visual Language

- **Fonts:** Instrument Sans (UI/body) + Cormorant Garamond (serif display titles)
- **Colors:** Pure white `#FFFFFF` background, graphite `#3D3D3D` text, indigo `#3D5AFE` as the only accent — used sparingly
- **Radius:** 0px — no rounding anywhere
- **Borders:** None — no cards, no boxes, content floats on white
- **Shadows:** None

### Key Treatments

- Header: minimal — wordmark only, fine border-b, no background color change
- No card component — deals render as borderless rows/tiles with whitespace separation
- Deal titles in Cormorant Garamond, large, elegant
- Prices in Instrument Sans, small, indigo color only
- No progress bars — discount shown as clean percentage text only
- Tabs in Title Case (not UPPERCASE), thin underline active state in indigo
- Max 3 columns, `gap-8` breathing room
- "Load more" in lowercase, ghost/link style

---

## Direction 5: Mercado

**Branch:** `design/mercado`
**Worktree:** `.worktrees/mercado/`
**Status: NOT STARTED** — fonts installed (Libre Baskerville + Work Sans + Fira Code), no design files written yet

### Concept

Latin market warmth meets artisan craft. Rich textures, earthy palette, double-rule borders. The vibe of a beautifully printed market catalogue.

### Visual Language

- **Fonts:** Libre Baskerville (serif titles) + Work Sans (body) + Fira Code (mono/prices)
- **Colors:** Parchment `#F5F0E8` background, espresso `#2C1810` text, burnt sienna `#C75B39` accent, forest `#2D5F3A` for savings
- **Radius:** 6px
- **Borders:** Double-line style (outer border + inner inset shadow to simulate double rule)
- **Shadows:** Subtle warm shadow (`shadow-sm` with warm tint)
- **Texture:** Paper noise via CSS noise filter or SVG overlay

### Key Treatments

- Header: parchment background, Libre Baskerville wordmark, double-rule bottom border
- Cards: double-border effect, warm paper background, slight inset
- Deal titles in Libre Baskerville serif
- Prices in Fira Code, forest green
- Discount badges in burnt sienna with serif numerals
- Progress bars: forest green fill on parchment track
- Tabs: Libre Baskerville, title case, burnt sienna underline
- "Load más" or "Load More" — warm, not shouty
