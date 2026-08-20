---
name: Duck Inspector
# Tokens below mirror the implementation exactly:
#   - `themes` → HeroUI v3 CSS variables in `styles/globals.css` (@layer theme)
#   - `typography`, `rounded`, `spacing` → Tailwind v4 `@theme` block in the same file
# Font families are wired through CSS variables set by @duckarchive/framework.
# Colours come from a Material 3 palette; each line names the M3 role it maps from.
themes:
  light:
    background: '#f9f9fc' # background
    foreground: '#1a1c1e' # on-background
    surface: '#ffffff' # surface-container-lowest — cards
    surface-secondary: '#f3f3f6' # surface-container-low
    surface-tertiary: '#eeeef0' # surface-container
    overlay: '#ffffff' # surface-container-lowest — modals/popovers
    default: '#e8e8ea' # surface-container-high — neutral component fills
    muted: '#5a4136' # on-surface-variant — secondary text
    accent: '#ff5c00' # brand orange — deliberately NOT the M3 primary (see Colors)
    accent-foreground: '#ffffff'
    # accent-soft / -foreground are left to HeroUI, which derives them from accent
    success: '#006c47' # secondary
    success-foreground: '#ffffff' # on-secondary
    success-soft: '#7ff6bb' # secondary-container
    success-soft-foreground: '#00714a' # on-secondary-container
    danger: '#ba1a1a' # error
    danger-foreground: '#ffffff' # on-error
    danger-soft: '#ffdad6' # error-container
    danger-soft-foreground: '#93000a' # on-error-container
    field-background: '#ffffff' # surface-container-lowest
    field-foreground: '#1a1c1e' # on-surface
    field-placeholder: '#74777b' # neutral outline
    field-border: '#c4c6ca' # neutral outline-variant — greyscale, not the warm ramp
    field-border-width: 1px # HeroUI ships 0px — fields are borderless without this
    border: '#e3bfb1' # outline-variant
    separator: '#e3bfb1' # outline-variant
    scrollbar-thumb: '#e3bfb1' # outline-variant
    focus: accent
    surface-shadow: 0px 0px 24px 0px rgb(0 0 0 / 0.03)
    overlay-shadow: 0px 10px 50px 0px rgb(0 0 0 / 0.08)
    field-shadow: 0px 0px 24px 0px rgb(0 0 0 / 0.03)
  dark: # M3 dark counterpart of the same palette
    background: '#131316'
    foreground: '#e2e2e5'
    surface: '#1a1c1e'
    surface-secondary: '#1e1f21'
    surface-tertiary: '#292a2c'
    overlay: '#1e1f21'
    default: '#292a2c'
    muted: '#d8c3b9' # dark on-surface-variant
    accent: '#ff5c00' # identical orange in both themes
    accent-foreground: '#ffffff'
    success: '#65dca3' # secondary-fixed-dim
    success-foreground: '#005234' # on-secondary-fixed-variant
    danger: '#ffb4ab' # dark error
    danger-foreground: '#690005' # dark on-error
    field-background: '#1a1c1e'
    field-placeholder: '#8e9195' # neutral dark outline
    field-border: '#44474a' # neutral dark outline-variant
    border: '#53433c'
    separator: '#53433c'
    scrollbar-thumb: '#53433c'
    surface-shadow: 0px 0px 24px 0px rgb(0 0 0 / 0.3)
    overlay-shadow: 0px 10px 50px 0px rgb(0 0 0 / 0.45)
    field-shadow: 0px 0px 24px 0px rgb(0 0 0 / 0.3)
radius: # HeroUI derives component radii from --radius
  base: 1rem # --radius
  field: 1.5rem # --field-radius = --radius * 1.5 — inputs, selects, textareas
typography:
  families:
    font-mono: Geist Mono (google, --font-mono) # theme default — all titles/text, body copy, headings
    font-sans: Geist (google, --font-sans) # interactive elements only — Button, Input, Link, TextArea, etc.
    font-label: Geist (google, --font-label) # labels, chips, metadata
  scale: # tailwind fontSize tokens → text-display-lg, text-headline-lg, …
    display-lg:
      fontSize: 4rem # 64px
      fontWeight: '800'
      lineHeight: '1.1'
      letterSpacing: -0.04em
    headline-lg:
      fontSize: 2.5rem # 40px
      fontWeight: '700'
      lineHeight: '1.2'
      letterSpacing: -0.02em
    headline-lg-mobile:
      fontSize: 2rem # 32px
      fontWeight: '700'
      lineHeight: '1.2'
      letterSpacing: -0.02em
    headline-md:
      fontSize: 1.5rem # 24px
      fontWeight: '600'
      lineHeight: '1.3'
      letterSpacing: -0.01em
    body-lg:
      fontSize: 1.125rem # 18px
      fontWeight: '400'
      lineHeight: '1.6'
      letterSpacing: -0.01em
    body-md:
      fontSize: 0.9375rem # 15px
      fontWeight: '400'
      lineHeight: '1.5'
      letterSpacing: '0'
    label-sm: # uppercase, font-label
      fontSize: 0.75rem # 12px
      fontWeight: '600'
      lineHeight: '1'
      letterSpacing: 0.05em
rounded: # tailwind borderRadius scale
  sm: 0.25rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
spacing:
  container-max: 75rem # 1200px — max-w-container
  gutter: 32px # gap-gutter
  section-gap: 128px # gap-section / py-section
  section-gap-mobile: 64px # gap-section-mobile
---

## Brand & Style

The design system is rooted in **Minimalist Luxury**, a philosophy that prioritizes intentionality over decoration. Taking cues from high-end editorial design and premium hardware interfaces, it creates an environment of calm authority.

The target audience consists of professionals who value precision, security, and clarity. The UI should evoke a feeling of "airiness" and sophisticated silence—allowing the user's data and tasks to take center stage without visual competition.

**Key Visual Pillars:**
- **Extreme Whitespace:** Layouts are intentionally undersaturated with content to heighten focus.
- **Precision Typography:** High contrast between oversized headlines and tight, functional body text.
- **Soft Tactility:** Depth comes from ambient shadows and tonal layering. Borders are hairline and structural — they delimit editable surfaces (fields, separators), never decorate.
- **Intentional Accents:** Color is used sparingly as a functional tool for direction, not for decoration.

## Colors

The palette is a **Material 3** scheme: a burnt-orange primary over a warm-neutral surface ramp. All colors are HeroUI v3 CSS variables set in `styles/globals.css`, so components pick them up automatically (`bg-background`, `text-foreground`, `bg-surface-secondary`, `text-muted`, `bg-accent`…). There is no `heroui()` plugin config and no `tailwind.config.js` theme — editing the variables is how you change the theme.

- **Surfaces:** `background` (`#F9F9FC`) is the page ground; `surface` (white) is the card level, with `surface-secondary` / `surface-tertiary` for progressively recessed containers.
- **Typography:** `foreground` (`#1A1C1E`) for headlines and body. `muted` (`#5A4136`, M3 on-surface-variant) is the warm secondary tone for metadata and descriptions.
- **Accent:** `accent` (`#FF5C00`, Crisp Orange) is used exclusively for primary calls to action, active states, and critical status indicators. `focus` is the same value — HeroUI applies it to focus rings. `accent-soft` is left undefined so HeroUI derives it from the accent.
  - This is the **one deliberate departure from the M3 palette**: the scheme's primary (`#A33E00`) reads muddy against the orange logo, so the brand orange is kept in both themes. The tradeoff is contrast — white on `#FF5C00` is ~3.1:1, which clears AA for large text and UI components but not for normal-size body text. Keep accent surfaces to buttons, chips and indicators; don't set long-form copy on it.
- **Status:** `success` maps from M3 secondary (`#006C47`), `danger` from M3 error (`#BA1A1A`); both have `-soft` container variants. `warning` stays on the HeroUI default until the palette defines one.
- **Dark theme** is the M3 dark counterpart of the same palette over a `#131316` ground, keeping the identical orange accent.
- M3 *tertiary* (`#336666`) has no HeroUI slot and is currently unused.

## Typography

Font family is a theme-level split, not a per-component choice:

- **`font-mono` (Geist Mono)** is the default for everything — titles, headlines, body copy, metadata. It's applied once on `<body>` in `app/layout.tsx`, so every text element inherits it automatically. This gives the whole app a technical, "archival ledger" feel that fits the codes/tabular-data subject matter.
- **`font-sans` (Geist)** is reserved for interactive elements — `Button`, `Input`, `Link`, `TextArea`, `NumberField`, `SearchField`, and every other clickable/editable control. A global rule in `styles/globals.css` (`@layer base { button, input, textarea, select, a { font-family: var(--font-sans); } }`) applies this automatically to native form/interactive tags, so components don't need an explicit `font-sans` class. Don't add `font-mono`/`font-sans` overrides to individual interactive elements — fix the theme rule instead if the split needs to change.
- **Geist** (`font-label`) still handles labels, chips, and metadata that aren't part of the mono/sans split above.

High contrast is achieved by pairing massive `text-display-lg` styles with significantly smaller, breathable `text-body-md` copy. Always prioritize tight tracking on headings to maintain the luxury aesthetic. On mobile, `text-headline-lg` drops to `text-headline-lg-mobile`.

## Layout & Spacing

This design system employs a **Fixed Grid** philosophy for desktop to maintain a premium, editorial feel, while transitioning to a fluid model for mobile.

- **Vertical Rhythm:** Large vertical gaps (`gap-section`, 128px+) between major sections create the "luxury" sense of space.
- **Grid:** A 12-column grid capped at `max-w-container` (1200px) with generous `gap-gutter` (32px) gutters. Content typically resides in the center 8 columns to allow for expansive margins.
- **Mobile:** Margins scale down to 24px, and section gaps compress to `gap-section-mobile` (64px), maintaining a sense of airiness without wasting valuable small-screen real estate.

## Elevation & Depth

Depth is conveyed through **Ambient Shadows** and tonal layering, mapped to the HeroUI shadow variables.

- **Level 1 (Base):** `background`.
- **Level 2 (Cards/Containers):** `surface` fill or `surface-shadow` — a very soft, highly diffused shadow (blur 24px, 3% black).
- **Level 3 (Modals/Popovers):** `overlay` fill with `overlay-shadow` — deeper, with a slight vertical offset to simulate lift (y 10, blur 50, 8% black).
- **Borders** are reserved for structure, not decoration: a hairline `border` / `separator` (`outline-variant`) delimits fields and divides content. Avoid heavy outlines or multi-pixel strokes.
- **Interactive:** Hover states should trigger a subtle increase in shadow diffusion rather than a color change, mimicking a physical object moving closer to the user.

## Shapes

The shape language is defined by "Large Border Radii," giving the UI a friendly yet sophisticated silhouette. HeroUI derives component radii from `--radius` (1rem); fields use `--field-radius` (1.5rem). Raw Tailwind uses the `rounded-*` scale from the tokens above.

- **Primary Elements:** Buttons follow `--radius`; input fields are rounder still at `--field-radius`.
- **Large Containers:** Cards and major UI sections use `rounded-xl` (1.5rem) to emphasize the soft, premium feel.
- **Icons:** Should follow a similar rounded geometric language, avoiding sharp 90-degree corners.

## Components

### Buttons
HeroUI v3 variants: `primary`, `secondary`, `tertiary`, `outline`, `ghost`, `danger`, `danger-soft`.
- **Primary:** `variant="primary"` — `accent` background, `accent-foreground` text, bold weight. No border.
- **Secondary:** `variant="outline"` — transparent background, `foreground` text, hairline `border`.
- **States:** On hover, primary buttons should subtly scale (1.02x) rather than change color.

### Input Fields
- Every field carries a **1px `field-border`** by default. HeroUI ships `--field-border-width: 0px` (borderless), so `styles/globals.css` sets both the width and the color; hover and focus borders derive from `--field-border` automatically via `color-mix`, and invalid state uses `--color-field-border-invalid`.
- `InputGroup` addons (`__prefix` / `__suffix`) have their divider border zeroed in `styles/globals.css`. HeroUI sizes that divider from `--field-border-width`, which suits text addons (`https://`); every addon here is an icon or button, where it reads as a stray line inside the field. Only the field's outer border should be visible.
- Large height (`h-14` / `size="lg"`, 48px+) on primary search surfaces.
- Border and placeholder are both **neutral greyscale**, not the palette's warm `outline` / `outline-variant` — the warm hue read as a tint on every field.
- `field-placeholder` sits a step lighter than `muted` so placeholders don't read as filled-in text.
- Focus state: HeroUI `focus` ring in the accent, plus the derived focus border.

### Cards
- `surface` background with `surface-shadow`.
- Inner padding should be generous (min 32px) to prevent data from feeling cramped.

### Chips/Tags
- Small, pill-shaped (`radius="full"`) with `default` backgrounds.
- Use `font-label` (Geist) to denote system information or metadata.
- **Resource identity chips** (`components/resource-badge.tsx`) are the one place with a categorical palette: six Tailwind fills in `TYPE_CHIP_CLASS`, all with white labels and **one value per resource across both themes**. Each fill is mid-tone so it separates from the light and dark ground alike, and dark enough for ≥6:1 against its label; hues stay clear of the accent orange. They mark *which* service hosts a copy — an identity, not a status — so they deliberately avoid `accent`, `danger`, `success` and `warning`, which carry meaning elsewhere. Add an entry to that map rather than reaching for a semantic color when a resource type is added.

### Status Indicators
- Use small, glowing dots for security status. A "Pulse" animation on the `accent` indicates active verification or "scanning" processes.
