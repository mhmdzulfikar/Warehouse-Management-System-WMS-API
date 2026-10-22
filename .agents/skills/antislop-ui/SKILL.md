---
name: antislop-ui
description: "UI and visual skill for antislop. Filters out generic AI-generated gradients, excessive glassmorphism, glow everywhere, and floaty pill layouts."
allowed-tools: Read Write Edit Glob Grep
---
# antislop-ui

> Anti Slop: Rules for AI Coding Agents. UI & Visual skill
> Source: https://github.com/miqdadbadjuber/anti-slop

## Visual & Color Rules

### Generic Blue-Purple Gradient & Floating Radial Orbs (R-01)
- **Tell:** blue-to-purple, blue-to-cyan gradients used as primary color treatment, or floating blurred radial glow orbs behind content.
- **Why:** The most over-represented AI aesthetic. Signals "no brand identity" and marks design as AI-generated at a glance.
- **Fix:** Remove floating background glow orbs. Use a clean, grounded neutral slate/zinc base with one deliberate brand accent.

### Excessive Glassmorphism (R-10)
- **Tell:** blur/backdrop-filter on navbar, cards, modals, sidebar, and tables simultaneously.
- **Why:** Blur removes texture and flattens hierarchy. When every surface is glass, nothing is foreground.
- **Fix:** Keep surfaces solid, crisp, and grounded. Use solid surface elevation (`#111827`, `#0f172a`) with subtle 1px border separation (`#1e293b`).

### Excessive Border Radius (R-11)
- **Tell:** Every element is pill-shaped: buttons, inputs, cards, containers, badges.
- **Why:** Erases visual language of inputs vs cards vs buttons.
- **Fix:** Standardize crisp, deliberate radii (e.g. 6px-8px for inputs/buttons, 8px-10px for cards). Reserve pills solely for status badges.

### Glow Everywhere & Overly Soft Shadows (R-12, R-13)
- **Tell:** Glow on cards, buttons, icons, badges, backgrounds, and borders simultaneously.
- **Why:** Attention amplifier applied everywhere amplifies nothing.
- **Fix:** Remove neon glows. Use crisp 1px borders and subtle grounded shadows.

### Too Many Colors / Scattered Palette (R-29)
- **Tell:** 5-7 different rainbow colors across elements with no hierarchy.
- **Fix:** Cap palette at 2-3 core neutrals + 1 brand accent. Semantic colors (green, amber, red) are strictly for functional status indicators.
