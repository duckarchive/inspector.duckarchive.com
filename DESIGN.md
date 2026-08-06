---
name: Duck Inspector
# Tokens below mirror the implementation exactly:
#   - `themes` → HeroUI plugin config in tailwind.config.js (heroui({ themes }))
#   - `typography`, `rounded`, `spacing` → tailwind `theme.extend` (fontSize/borderRadius/spacing)
# Font families are wired through CSS variables set in config/fonts.ts.
themes:
  light:
    colors:
      background: '#ffffff'
      foreground: '#1d1d1f'
      divider: '#d2d2d7'
      focus: '#ff5c00'
      content1: '#ffffff' # Level 2 cards: white + ambient shadow, not a tint
      content2: '#f5f5f7'
      content3: '#e8e8ed'
      content4: '#d2d2d7'
      default:
        50: '#f5f5f7'
        100: '#e8e8ed'
        200: '#d2d2d7'
        300: '#aeaeb2'
        400: '#86868b' # metadata / secondary descriptions
        500: '#6e6e73'
        600: '#515154'
        700: '#424245'
        800: '#2c2c2e'
        900: '#1d1d1f'
        DEFAULT: '#d2d2d7'
        foreground: '#1d1d1f'
      primary:
        50: '#fff3ed'
        100: '#ffdbce'
        200: '#ffb59a'
        300: '#ff9166'
        400: '#ff7433'
        500: '#ff5c00' # Crisp Orange — the only accent
        600: '#d44b00'
        700: '#a73a00'
        800: '#802a00'
        900: '#521800'
        DEFAULT: '#ff5c00'
        foreground: '#ffffff'
      secondary:
        DEFAULT: '#5f5e60'
        foreground: '#ffffff'
      danger:
        DEFAULT: '#ba1a1a'
        foreground: '#ffffff'
    layout:
      radius:
        small: 0.25rem # chips, inline elements
        medium: 0.5rem # buttons, inputs
        large: 1rem # panels; hero cards go rounded-xl (1.5rem)
      boxShadow:
        small: 0px 0px 24px 0px rgb(0 0 0 / 0.03)
        medium: 0px 0px 40px 0px rgb(0 0 0 / 0.04) # Level 2 — cards
        large: 0px 10px 50px 0px rgb(0 0 0 / 0.08) # Level 3 — modals/popovers
  dark:
    colors:
      background: '#000000'
      foreground: '#f5f5f7'
      divider: '#424245'
      focus: '#ff5c00'
      content1: '#1d1d1f'
      content2: '#2c2c2e'
      content3: '#3a3a3c'
      content4: '#48484a'
      default:
        50: '#1d1d1f'
        100: '#2c2c2e'
        200: '#3a3a3c'
        300: '#48484a'
        400: '#636366'
        500: '#8e8e93'
        600: '#aeaeb2'
        700: '#d2d2d7'
        800: '#e8e8ed'
        900: '#f5f5f7'
        DEFAULT: '#3a3a3c'
        foreground: '#f5f5f7'
      primary:
        50: '#521800'
        100: '#802a00'
        200: '#a73a00'
        300: '#d44b00'
        400: '#ff7433'
        500: '#ff5c00'
        600: '#ff9166'
        700: '#ffb59a'
        800: '#ffdbce'
        900: '#fff3ed'
        DEFAULT: '#ff5c00'
        foreground: '#ffffff'
      secondary:
        DEFAULT: '#c8c6c8'
        foreground: '#1d1d1f'
      danger:
        DEFAULT: '#ff5449'
        foreground: '#ffffff'
    layout:
      radius:
        small: 0.25rem
        medium: 0.5rem
        large: 1rem
      boxShadow:
        small: 0px 0px 24px 0px rgb(0 0 0 / 0.3)
        medium: 0px 0px 40px 0px rgb(0 0 0 / 0.35)
        large: 0px 10px 50px 0px rgb(0 0 0 / 0.45)
typography:
  families:
    font-mono: Geist Mono (google, --font-mono) # theme default — all titles/text, body copy, headings
    font-sans: Geist (google, --font-sans) # interactive elements only — Button, Input, Link, TextArea, etc.
    font-label: Geist (google, --font-label) # labels, chips, metadata
    font-comic: CC Jim Lee (local, --font-comic) # comics easter egg only
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
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1200px # max-w-container
  gutter: 32px # gap-gutter
  margin-mobile: 24px
  section-gap: 128px # gap-section / py-section
  section-gap-mobile: 64px
---

## Brand & Style

The design system is rooted in **Minimalist Luxury**, a philosophy that prioritizes intentionality over decoration. Taking cues from high-end editorial design and premium hardware interfaces, it creates an environment of calm authority.

The target audience consists of professionals who value precision, security, and clarity. The UI should evoke a feeling of "airiness" and sophisticated silence—allowing the user's data and tasks to take center stage without visual competition.

**Key Visual Pillars:**
- **Extreme Whitespace:** Layouts are intentionally undersaturated with content to heighten focus.
- **Precision Typography:** High contrast between oversized headlines and tight, functional body text.
- **Soft Tactility:** Elements feel physically present through subtle shadows rather than borders.
- **Intentional Accents:** Color is used sparingly as a functional tool for direction, not for decoration.

## Colors

The palette is anchored in a monochromatic spectrum of Apple-inspired neutrals, punctuated by a single, high-energy accent. All colors are expressed as HeroUI semantic tokens so components pick them up automatically (`bg-background`, `text-foreground`, `bg-content2`, `text-default-400`, `bg-primary`…).

- **Backgrounds:** Pure white `background` for primary surfaces to maximize the "stark" aesthetic, with `content2` (`#F5F5F7`) for subtle depth separation in secondary containers.
- **Typography:** Deep slate `foreground` (`#1D1D1F`) for headlines to ensure maximum readability and impact. `default-400` (`#86868B`) is reserved for metadata and secondary descriptions.
- **Accent:** Crisp Orange `primary` (`#FF5C00`) is used exclusively for primary calls to action, active states, and critical status indicators. The deeper `primary-700` (`#A73A00`) exists for pressed states and small text on light surfaces where `primary` fails contrast. `focus` is the same orange — HeroUI applies it to focus rings.
- **Dark theme** inverts the neutral ramp over pure black, keeps the identical orange, and raises `danger` brightness one step for legibility.
- `success`/`warning` stay on HeroUI defaults until the system defines them.

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

Depth is conveyed through **Ambient Shadows** and tonal layering. Avoid harsh borders or heavy outlines. Shadows map to the HeroUI layout scale (`shadow-small` / `shadow-medium` / `shadow-large`).

- **Level 1 (Base):** Pure `background`.
- **Level 2 (Cards/Containers):** `content2` fill or `shadow-medium` — a very soft, highly diffused shadow (blur 40px, 4% black).
- **Level 3 (Modals/Popovers):** `shadow-large` — deeper, with a slight vertical offset to simulate lift (y 10, blur 50, 8% black).
- **Interactive:** Hover states should trigger a subtle increase in shadow diffusion rather than a color change, mimicking a physical object moving closer to the user.

## Shapes

The shape language is defined by "Large Border Radii," giving the UI a friendly yet sophisticated silhouette. HeroUI components inherit `radius.small/medium/large`; raw Tailwind uses the `rounded-*` scale from the tokens above.

- **Primary Elements:** Buttons and Input fields use the base `rounded` / `radius.medium` (0.5rem).
- **Large Containers:** Cards and major UI sections use `rounded-xl` (1.5rem) to emphasize the soft, premium feel; standard panels use `radius.large` (1rem).
- **Icons:** Should follow a similar rounded geometric language, avoiding sharp 90-degree corners.

## Components

### Buttons
- **Primary:** `color="primary"` — Crisp Orange background, white text, bold weight. No border.
- **Secondary:** `variant="bordered"` — transparent background, `foreground` text, thin 1px `divider` border.
- **States:** On hover, primary buttons should subtly scale (1.02x) rather than change color.

### Input Fields
- Large height (`size="lg"`, 48px+) with subtle `content2` fills.
- Labels sit above the field (`labelPlacement="outside"`) in `text-label-sm font-label uppercase`.
- Focus state: HeroUI `focus` ring — 2px in the primary accent with a soft glow.

### Cards
- `content1` (white) background with `shadow-medium`.
- Inner padding should be generous (min 32px) to prevent data from feeling cramped.

### Chips/Tags
- Small, pill-shaped (`radius="full"`) with `default-100` backgrounds.
- Use `font-label` (Geist) to denote system information or metadata.

### Status Indicators
- Use small, glowing dots for security status. A "Pulse" animation on the `primary` accent indicates active verification or "scanning" processes.
