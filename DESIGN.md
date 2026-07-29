---
name: Duck Inspector
colors: 
  surface: '#faf8fe'
  surface-dim: '#dad9df'
  surface-bright: '#faf8fe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f8'
  surface-container: '#eeedf3'
  surface-container-high: '#e9e7ed'
  surface-container-highest: '#e3e2e7'
  on-surface: '#1a1b1f'
  on-surface-variant: '#5b4137'
  inverse-surface: '#2f3034'
  inverse-on-surface: '#f1f0f5'
  outline: '#8f7065'
  outline-variant: '#e4beb1'
  surface-tint: '#a73a00'
  primary: '#a73a00'
  on-primary: '#ffffff'
  primary-container: '#ff5c00'
  on-primary-container: '#521800'
  inverse-primary: '#ffb59a'
  secondary: '#5f5e60'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfe1'
  on-secondary-container: '#636264'
  tertiary: '#5d5e60'
  on-tertiary: '#ffffff'
  tertiary-container: '#919294'
  on-tertiary-container: '#292b2d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbce'
  primary-fixed-dim: '#ffb59a'
  on-primary-fixed: '#370e00'
  on-primary-fixed-variant: '#802a00'
  secondary-fixed: '#e4e2e4'
  secondary-fixed-dim: '#c8c6c8'
  on-secondary-fixed: '#1b1b1d'
  on-secondary-fixed-variant: '#474649'
  tertiary-fixed: '#e2e2e4'
  tertiary-fixed-dim: '#c6c6c8'
  on-tertiary-fixed: '#1a1c1d'
  on-tertiary-fixed-variant: '#454749'
  background: '#faf8fe'
  on-background: '#1a1b1f'
  surface-variant: '#e3e2e7'
typography:
  display-lg:
    fontFamily: SF Pro Text
    fontSize: 64px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: SF Pro Text
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: SF Pro Text
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Roboto
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: -0.01em
  body-md:
    fontFamily: Roboto
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: SF Pro Text
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1200px
  gutter: 32px
  margin-mobile: 24px
  section-gap: 128px
---

## Brand & Style

The design system is rooted in **Minimalist Luxury**, a philosophy that prioritizes intentionality over decoration. Taking cues from high-end editorial design and premium hardware Robotofaces, it creates an environment of calm authority. 

The target audience consists of professionals who value precision, security, and clarity. The UI should evoke a feeling of "airiness" and sophisticated silence—allowing the user's data and tasks to take center stage without visual competition.

**Key Visual Pillars:**
- **Extreme Whitespace:** Layouts are intentionally undersaturated with content to heighten focus.
- **Precision Typography:** High contrast between oversized headlines and tight, functional body text.
- **Soft Tactility:** Elements feel physically present through subtle shadows rather than borders.
- **Intentional Accents:** Color is used sparingly as a functional tool for direction, not for decoration.

## Colors

The palette is anchored in a monochromatic spectrum of "Apple-inspired" neutrals, punctuated by a single, high-energy accent.

- **Backgrounds:** Pure white (`#FFFFFF`) for primary surfaces to maximize the "stark" aesthetic, with `#F5F5F7` used for subtle depth separation in secondary containers.
- **Typography:** Deep slate (`#1D1D1F`) for headlines to ensure maximum readability and impact. Neutral gray (`#86868B`) is reserved for metadata and secondary descriptions.
- **Accent:** A "Crisp Orange" (`#FF5C00`) is used exclusively for primary calls to action, active states, and critical status indicators. This vibrant splash against the neutral backdrop creates immediate visual hierarchy.

## Typography

The type scale uses **SF Pro Text** for a sharp, contemporary look in headings, characterized by tight letter spacing and heavy weights. **Roboto** provides a highly legible, neutral foundation for body text, while **Geist** introduces a technical, "developer-grade" feel for labels and data points.

High contrast is achieved by pairing massive Display styles with significantly smaller, breathable body copy. Always prioritize "tight" tracking on headings to maintain the luxury aesthetic.

## Layout & Spacing

This design system employs a **Fixed Grid** philosophy for desktop to maintain a premium, editorial feel, while transitioning to a fluid model for mobile.

- **Vertical Rhythm:** Large vertical gaps (128px+) between major sections create the "luxury" sense of space. 
- **Grid:** A 12-column grid with generous 32px gutters. Content typically resides in the center 8 columns to allow for expansive margins.
- **Mobile:** Margins scale down to 24px, and section gaps compress to 64px, maintaining a sense of airiness without wasting valuable small-screen real estate.

## Elevation & Depth

Depth is conveyed through **Ambient Shadows** and tonal layering. Avoid harsh borders or heavy outlines.

- **Level 1 (Base):** Pure white background.
- **Level 2 (Cards/Containers):** Subtle background color (`#F5F5F7`) or a very soft, highly diffused shadow (Blur: 40px, Opacity: 4%, Color: `#000000`).
- **Level 3 (Modals/Popovers):** Deeper shadows with a slight vertical offset to simulate "lift" (Y: 10, Blur: 50, Opacity: 8%).
- **Robotoactive:** Hover states should trigger a subtle increase in shadow diffusion rather than a color change, mimicking a physical object moving closer to the user.

## Shapes

The shape language is defined by "Large Border Radii," giving the UI a friendly yet sophisticated silhouette. 

- **Primary Elements:** Buttons and Input fields use a base `0.5rem` (8px) radius.
- **Large Containers:** Cards and major UI sections use `rounded-xl` (1.5rem / 24px) to emphasize the soft, premium feel. 
- **Icons:** Should follow a similar rounded geometric language, avoiding sharp 90-degree corners.

## Components

### Buttons
- **Primary:** Crisp Orange background, white text, bold weight. No border.
- **Secondary:** Transparent background, slate text, thin 1px border in `#D2D2D7`.
- **States:** On hover, primary buttons should subtly scale (1.02x) rather than change color.

### Input Fields
- Large height (48px+) with subtle `#F5F5F7` fills.
- Labels sit above the field in `label-sm` Geist (uppercase).
- Focus state: A subtle 2px ring in the primary accent color with a soft glow.

### Cards
- White background with the Level 2 ambient shadow.
- Inner padding should be generous (min 32px) to prevent data from feeling cramped.

### Chips/Tags
- Small, pill-shaped with light gray backgrounds. 
- Use Geist for the typeface to denote "system information" or "metadata."

### Status Indicators
- Use small, glowing dots for security status. A "Pulse" animation on the orange accent indicates active verification or "scanning" processes.