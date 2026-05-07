---
name: Evergreen Dark
colors:
  surface: "#131313"
  surface-dim: "#131313"
  surface-bright: "#393939"
  surface-container-lowest: "#0e0e0e"
  surface-container-low: "#1c1b1b"
  surface-container: "#20201f"
  surface-container-high: "#2a2a2a"
  surface-container-highest: "#353535"
  on-surface: "#e5e2e1"
  on-surface-variant: "#c3c8c1"
  inverse-surface: "#e5e2e1"
  inverse-on-surface: "#313030"
  outline: "#8d928c"
  outline-variant: "#434843"
  surface-tint: "#b4cdb8"
  primary: "#b4cdb8"
  on-primary: "#203527"
  primary-container: "#1b3022"
  on-primary-container: "#819986"
  inverse-primary: "#4d6453"
  secondary: "#dbc3a8"
  on-secondary: "#3c2e1b"
  secondary-container: "#574632"
  on-secondary-container: "#ccb59b"
  tertiary: "#cac6bc"
  on-tertiary: "#323029"
  tertiary-container: "#2d2c25"
  on-tertiary-container: "#969389"
  error: "#ffb4ab"
  on-error: "#690005"
  error-container: "#93000a"
  on-error-container: "#ffdad6"
  primary-fixed: "#d0e9d4"
  primary-fixed-dim: "#b4cdb8"
  on-primary-fixed: "#0b2013"
  on-primary-fixed-variant: "#364c3c"
  secondary-fixed: "#f8dec3"
  secondary-fixed-dim: "#dbc3a8"
  on-secondary-fixed: "#261908"
  on-secondary-fixed-variant: "#544430"
  tertiary-fixed: "#e7e2d7"
  tertiary-fixed-dim: "#cac6bc"
  on-tertiary-fixed: "#1d1c15"
  on-tertiary-fixed-variant: "#49473f"
  background: "#131313"
  on-background: "#e5e2e1"
  surface-variant: "#353535"
typography:
  display-lg:
    fontFamily: Noto Serif
    fontSize: 57px
    fontWeight: "700"
    lineHeight: 64px
    letterSpacing: -0.25px
  headline-lg:
    fontFamily: Noto Serif
    fontSize: 32px
    fontWeight: "600"
    lineHeight: 40px
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 24px
  label-md:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: "500"
    lineHeight: 16px
    letterSpacing: 0.5px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  xxl: 80px
  container-max: 1200px
  gutter: 24px
---

## Brand & Style

The design system is centered on the concept of "Nocturnal Editorial UI." It bridges the gap between a high-end physical literary journal and a modern digital social space, specifically optimized for evening immersion. The brand personality is intellectual yet inviting, premium yet accessible—evoking the feeling of reading a leather-bound book in a candlelit, mahogany-walled study.

The visual style is a blend of **Minimalism** and **Tactile/Skeuomorphic** influences. It prioritizes generous "dark space" and high-quality typography (Minimalism) while introducing subtle paper grains, light noise, and soft tonal layers (Tactile) to give the digital interface a physical, organic soul. The goal is to reduce digital eye strain and encourage deep immersion in reading and social curation during low-light hours.

## Colors

The palette is rooted in organic, earthy tones that mimic natural materials in shadow.

- **Background**: The primary canvas is a deep charcoal (#1A1A1A), providing a restful contrast that enhances readability without glare.
- **Primary**: A dark forest green (#1B3022) is used for key actions and brand accents, grounding the palette with a sense of stability and heritage.
- **Secondary**: Muted brown (#8C7861) serves as a secondary accent for meta-information and ornamental elements, adding warmth to the dark environment.
- **Tertiary/Surfaces**: Soft beige (#F5F0E5) is repurposed for high-contrast text elements or occasional light-mode "pop" containers to create depth.
- **Typography**: Cream and light gray tones ensure high legibility while remaining softer than absolute white.

## Typography

This design system employs a sophisticated typographic pairing to reinforce the "Editorial" vibe.

**Noto Serif** is used for headlines, titles, and pull-quotes. Its elegant, timeless serifs provide the "literary" feel necessary for a reading platform. Large display sizes should use tighter letter spacing to maintain a premium magazine aesthetic. In this dark mode, the serif forms feel classic and prestigious.

**Manrope** is used for body text and UI elements. It was chosen for its modern, balanced proportions and exceptional readability at smaller sizes against dark backgrounds. Body text uses a generous line height (1.6) to ensure a relaxed reading experience. Labels and metadata often use uppercase styling with increased letter spacing to differentiate UI controls from content.

## Layout & Spacing

The layout philosophy follows a **Fixed Grid** system within a centered container for long-form content, while utilizing a fluid 12-column structure for discovery and social feeds.

A "Generous Whitespace" rule is applied: margins and paddings are intentionally larger than industry standard to allow the content to "breathe." In dark mode, this expansive use of background color creates a sense of focus and calm. Spacing follows a 4px-based scale, but prefers larger increments (24px, 48px, 80px) for layout sections to maintain the premium, uncrowded feel.

## Elevation & Depth

This design system avoids harsh elevations. Depth is conveyed through **Tonal Layers** and **Subtle Highlights**:

1.  **Base Layer**: The Deep Charcoal (#1A1A1A) background with a global SVG noise filter (opacity 0.05) to simulate paper texture.
2.  **Mid Layer**: Forest Green (#1B3022) surfaces for cards and containers, distinguished by their slight color shift from the base.
3.  **Floating Layer**: Used for active cards or menus. These utilize extra-diffused, low-opacity shadows (Color: #000000 at 20% opacity) or subtle "outer glows" using the Muted Brown to create a soft "lift."
4.  **Interactions**: Hover states involve a subtle shift in the container's brightness and a very slight scale-up (1.02x) to feel responsive and organic.

## Shapes

The shape language is modern and soft. A standard `rounded-lg` (16px) is used for most UI containers, while `rounded-xl` (24px) is reserved for featured book cards and prominent social media posts.

Buttons and input fields follow the `rounded-lg` (16px) standard. This high degree of rounding removes visual tension, contributing to the "cozy" and "approachable" atmosphere of the platform, even in its darker manifestation.

## Components

### Buttons

- **Primary**: Solid Muted Brown (#8C7861) with Dark Charcoal text for maximum visibility. Rounded (16px).
- **Secondary**: Dark Forest Green (#1B3022) background with Cream text.
- **Ghost**: No background, Serif typography, with a subtle underline appearing on hover.

### Cards

- Cards feature the 24px radius and a very subtle 1px border in a slightly lighter charcoal than the background. They should always have the light grain texture applied to their surface.

### Input Fields

- Inputs are styled as deep Primary-container (#1B3022) rectangles with a 16px radius. The focus state shifts the border to Muted Brown with a soft glow effect.

### Chips & Tags

- Used for book genres or reading statuses. These are pill-shaped with a 32px radius, using Cream text on a Primary-container background with a thin border.

### Book Specific Components

- **Reading Progress Bar**: A thin, elegant line using Muted Brown for the progress and a deep charcoal for the track.
- **Quote Blocks**: Centralized serif text, italicized, in Soft Beige (#F5F0E5), with a Muted Brown vertical line on the left.

### Lists

- Lists are separated by thin, low-contrast horizontal rules (#1B3022) with ample vertical padding (24px) between items.
