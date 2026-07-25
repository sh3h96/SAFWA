---
name: Kinetic Precision
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#3e4949'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#6e7979'
  outline-variant: '#bdc9c8'
  surface-tint: '#006a6a'
  primary: '#006565'
  on-primary: '#ffffff'
  primary-container: '#008080'
  on-primary-container: '#e3fffe'
  inverse-primary: '#76d6d5'
  secondary: '#4f6070'
  on-secondary: '#ffffff'
  secondary-container: '#d2e5f8'
  on-secondary-container: '#556677'
  tertiary: '#8b4823'
  on-tertiary: '#ffffff'
  tertiary-container: '#a96039'
  on-tertiary-container: '#fff9f7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#93f2f2'
  primary-fixed-dim: '#76d6d5'
  on-primary-fixed: '#002020'
  on-primary-fixed-variant: '#004f4f'
  secondary-fixed: '#d2e5f8'
  secondary-fixed-dim: '#b7c8db'
  on-secondary-fixed: '#0b1d2b'
  on-secondary-fixed-variant: '#384958'
  tertiary-fixed: '#ffdbcb'
  tertiary-fixed-dim: '#ffb692'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#733512'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  teal-hover: '#006666'
  border-slate: '#E2E8F0'
  success-text: '#10B981'
  success-bg: '#ECFDF5'
  warning-text: '#F59E0B'
  warning-bg: '#FEF3C7'
  info-text: '#0284C7'
  info-bg: '#E0F2FE'
  danger-text: '#EF4444'
  danger-bg: '#FEF2F2'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-h1:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-h2:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-h3:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  headline-h1-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  baseline: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
  touch-target: 44px
---

## Brand & Style

The design system is engineered for the intersection of automotive mechanical precision and high-performance digital management. It serves a dual audience: administrative staff requiring data density and technicians requiring high-visibility, touch-friendly interfaces in workshop environments.

The visual style is **Corporate / Modern** with a **Clean Industrial** edge. It prioritizes utility and reliability through a "Soft Dashboard" aesthetic—utilizing ample white space to reduce cognitive load while employing sharp, technical accents that mirror automotive instrumentation. The interface should feel robust, trustworthy, and technologically advanced, avoiding unnecessary decoration in favor of functional clarity and structural integrity.

## Colors

The palette is anchored by **Navy (#0D1F2D)**, providing a professional, grounded foundation for structural elements like headers and sidebars. **Teal (#008080)** serves as the primary action color, driving user focus toward key interactions and progress indicators.

The background uses a crisp **Canvas Light (#F8FAFC)** to ensure the white card surfaces pop with distinct hierarchy. Semantic colors follow a standard SaaS pattern but are tuned for high legibility against white backgrounds. In workshop "Touch Mode," these semantic backgrounds should be slightly more saturated to ensure status visibility from a distance.

## Typography

The system utilizes a dual-language typographic approach. For English contexts, **Inter** provides a neutral, highly legible sans-serif foundation. For Arabic contexts, **Tajawal** is the standard, maintaining the geometric and modern feel.

A specialized **JetBrains Mono** role is reserved for "Technical Data"—including license plate numbers, VINs, invoice IDs, and currency values. This ensures character alignment in tables and evokes a sense of engineering precision. 

**Note on RTL:** When switching to Arabic (Tajawal), ensure line-height is increased by approximately 10-15% to accommodate the script's ascenders and descenders without crowding the layout.

## Layout & Spacing

This design system employs a **Fixed Grid** approach for desktop dashboards to maintain data density, transitioning to a **Fluid Grid** for tablet and mobile views to accommodate various viewport sizes.

- **Desktop (1440px+):** 12-column grid with 24px gutters. Content is centered in a 1320px max-width container.
- **Tablet (768px - 1024px):** 8-column fluid grid. This is the primary view for technicians; sidebars should be collapsible to maximize the workspace.
- **Mobile (<768px):** 4-column fluid grid.

A strict 4px baseline grid governs all internal component spacing. For workshop interfaces, vertical spacing between interactive elements (like list items) is expanded to a minimum of 12px to prevent accidental taps.

## Elevation & Depth

Hierarchy is established using **Tonal Layers** rather than heavy shadows, reflecting the "Soft Dashboard" philosophy.

1.  **Level 0 (Canvas):** The base layer in `#F8FAFC`.
2.  **Level 1 (Cards/Surface):** White `#FFFFFF` containers with a 1px solid border in `#E2E8F0`. No shadow is used for static cards.
3.  **Level 2 (Interactive):** Elements that are clickable or require focus (e.g., active cards, dropdowns) receive a soft, diffused shadow: `0px 4px 12px rgba(13, 31, 45, 0.08)`.
4.  **Level 3 (Overlays):** Modals and drawers use a higher elevation shadow: `0px 12px 32px rgba(13, 31, 45, 0.15)` and a background backdrop blur of 4px.

## Shapes

The shape language is **Soft (0.25rem / 4px base)**. This subtle rounding maintains the industrial, disciplined feel of the automotive sector while appearing modern and accessible.

- **Buttons & Inputs:** 4px (Soft) radius.
- **Badges/Status Tags:** 2px radius for a sharper, "tag" appearance.
- **Dashboard Cards:** 8px (Large) radius to differentiate primary containers from smaller UI components.
- **Progress Bars:** Fully rounded (capsule) to indicate fluid movement.

## Components

### Buttons
- **Primary:** Navy background with White text for high-level actions (e.g., "Save Account").
- **Action (Teal):** Used for workflow-specific tasks (e.g., "Start Repair," "Create Invoice"). 
- **Touch State:** On tablet/mobile, buttons must maintain a minimum height of 48px.

### Inputs & Selects
- Use a 1px border in `#E2E8F0`. 
- On focus, the border transitions to Teal (#008080) with a 2px outer glow of the same color at 15% opacity.
- Labels use `body-md` in Navy for high contrast.

### Status Badges
- Utilize the functional color palette. 
- Use a "Soft Fill" style: Background at 10% opacity of the status color with text at 100% opacity (e.g., Success: Background `#ECFDF5`, Text `#10B981`).

### Data Tables
- Header background: `#F8FAFC`.
- Rows: 1px bottom border in `#E2E8F0`.
- Text: Use `data-mono` for all ID numbers and quantities to ensure vertical alignment across rows.

### Vehicle Cards
- Primary information (Plate Number) should be displayed using `data-mono` in a boxed container that mimics a physical license plate.
- Secondary info (Model/Year) uses `caption`.