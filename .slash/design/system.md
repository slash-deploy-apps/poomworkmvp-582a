# Claymorphism Design System

## Overview

High-Fidelity Claymorphism design system - simulating premium digital clay with multi-layer shadow stacks, super-rounded corners, and bouncy tactile interactions.

## Tech Stack

- React Router v7 + Tailwind CSS + shadcn/ui
- Fonts: Nunito (headings) + DM Sans (body)

## Design Tokens

### Colors

| Token            | Value                           | Usage                                      |
| ---------------- | ------------------------------- | ------------------------------------------ |
| Canvas (bg)      | `#F4F1FA`                       | Page background - pale cool lavender-white |
| Foreground       | `#332F3A`                       | Primary text - soft charcoal               |
| Muted            | `#635F69`                       | Secondary text - dark lavender-gray        |
| Primary Accent   | `#7C3AED`                       | CTAs, links, brand - vivid violet          |
| Secondary Accent | `#DB2777`                       | Gradients, secondary emphasis - hot pink   |
| Tertiary         | `#0EA5E9`                       | Info elements - sky blue                   |
| Success          | `#10B981`                       | Checkmarks, positive - emerald green       |
| Warning          | `#F59E0B`                       | Alerts, stars - amber                      |
| Card BG          | White `#FFFFFF` / `white/60-80` | Card surfaces                              |
| Input BG         | `#EFEBF5`                       | Recessed input surfaces                    |

### Shadows (4-layer Clay Stacks)

All shadows use 4 layers for high-fidelity depth simulation.

**clayCard**: `16px 16px 32px rgba(160,150,180,0.2), -10px -10px 24px rgba(255,255,255,0.9), inset 6px 6px 12px rgba(139,92,246,0.03), inset -6px -6px 12px rgba(255,255,255,1)`

**clayButton**: `12px 12px 24px rgba(139,92,246,0.3), -8px -8px 16px rgba(255,255,255,0.4), inset 4px 4px 8px rgba(255,255,255,0.4), inset -4px -4px 8px rgba(0,0,0,0.1)`

**clayPressed**: `inset 10px 10px 20px #d9d4e3, inset -10px -10px 20px #ffffff`

**clayDeep**: `30px 30px 60px #cdc6d9, -30px -30px 60px #ffffff, inset 10px 10px 20px rgba(139,92,246,0.05), inset -10px -10px 20px rgba(255,255,255,0.8)`

### Border Radii

- Hero/Large containers: `rounded-[48px]` to `rounded-[60px]`
- Standard cards: `rounded-[32px]`
- Medium elements: `rounded-[24px]`
- Buttons/Inputs: `rounded-[20px]` or `rounded-2xl`
- Minimum: `rounded-[20px]` — NEVER use rounded-md or rounded-sm

### Typography

- **Headings**: Nunito (700/800/900 weight), applied via `style={{ fontFamily: "Nunito, sans-serif" }}`
- **Body**: DM Sans (400/500/700), global body font
- Hero: `text-5xl sm:text-6xl md:text-7xl lg:text-8xl`, font-black, tracking-tight
- Section titles: `text-3xl sm:text-4xl md:text-5xl`, extrabold
- Body: `text-base to text-lg`, font-medium, leading-relaxed

### Gradients

- Primary buttons: `bg-gradient-to-br from-[#A78BFA] to-[#7C3AED]`
- Icon orbs: `bg-gradient-to-br` from light pastel to saturated hue
- Background blobs: Accent colors at `/10` opacity, blur-3xl

## Animations

- **clay-float**: 8s, translateY(-20px) rotate(2deg)
- **clay-float-delayed**: 10s, translateY(-15px) rotate(-2deg)
- **clay-float-slow**: 12s, translateY(-30px) rotate(5deg)
- **clay-breathe**: 6s, scale(1.02)
- Hover lift: `hover:-translate-y-2` for cards, `hover:-translate-y-1` for buttons
- Active press: `active:scale-[0.92]` + shadow-clayPressed
- Always respect `prefers-reduced-motion`

## Components

### Button

- Base: `rounded-[20px]`, `h-14` default, `h-16` lg
- Primary: gradient violet + clayButton shadow
- Secondary: white + clayButton shadow
- Active: `active:scale-[0.92]` + clayPressed
- Hover: `hover:-translate-y-1` + enhanced shadow

### Card

- Base: `rounded-[32px] bg-white/60 backdrop-blur-xl shadow-clayCard p-8`
- Hover: `hover:-translate-y-2` + enhanced shadow
- Transition: `transition-all duration-500`

### Input

- Base: `rounded-2xl h-16 bg-[#EFEBF5] shadow-clayPressed`
- Focus: `focus:bg-white focus:ring-4 focus:ring-[#7C3AED]/20`

### Background Blobs

- Fixed position, pointer-events-none
- 3-4 large blobs with different accent colors at /10 opacity
- Animated with clay-float animations

## Layout Patterns

- Hero: centered text + CTA, rounded bottom edges
- Stats: 2-col mobile → 4-col desktop grid
- Categories: 2-col mobile → 4-col desktop grid
- Cards: glass-clay hybrid with backdrop-blur
- All sections maintain super-rounded corners

## Responsive

- Mobile-first with progressive enhancement
- Maintain generous radii on mobile (never less than rounded-[20px])
- Full-width buttons on mobile, auto on desktop
- Hide some decorative elements on mobile

## Dos & Don'ts

- DO use 4-layer shadow stacks
- DO use squish animation on click
- DO use Nunito for headings via inline styles
- DO use glass-clay hybrid for cards
- DON'T use gray text lighter than #635F69
- DON'T use sharp corners (minimum rounded-[20px])
- DON'T use flat backgrounds (always add blobs)
- DON'T make buttons smaller than h-11
