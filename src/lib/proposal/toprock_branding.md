# toprock labs — Brand Guide

> This document is the single source of truth for toprock labs brand identity, voice, and visual design. Reference it before any design, copy, or development decision.

---

## 1. Brand Overview

| Element | Spec |
|---|---|
| **Name** | toprock labs |
| **Name treatment** | Always lowercase — `toprock labs`. Never `Toprock Labs` in body copy or UI. Title case only in legal contexts (© 2026 Toprock Labs). |
| **Abbreviation** | `tl` — used as a monogram watermark in dark sections |
| **Tagline** | *"We build for your business like it's our own."* |
| **Studio type** | Web development studio |
| **Primary audience** | Local businesses — restaurants, contractors, boutiques, gyms, law firms, dental practices, salons, coffee shops, studios |
| **Positioning** | Values-led studio that leads with relationship, not portfolio. Premium craft at accessible prices. |

---

## 2. Brand Personality

toprock labs is **calm, trustworthy, and quietly confident.**

Think: Braun meets Apple meets Ueno. Ruthlessly minimal, but with taste and warmth. Every element earns its place. The brand should feel *inevitable* — like it couldn't have been any other way.

**Three words that define us:** Honest. Precise. Warm.

**Three words we are not:** Flashy. Corporate. Salesy.

---

## 3. Voice & Tone

### Writing principles

- **Direct.** Say it plainly. No filler, no preamble.
- **Confident without arrogance.** We know what we're doing — we don't need to prove it.
- **Human, not corporate.** Write like a person, not a press release.
- **Warm but not soft.** We have standards. We're just kind about them.

### Copy register

| Context | Register |
|---|---|
| Headlines | Declarative, punchy, sometimes conversational |
| Body copy | Serif, slightly warmer — thoughtful and considered |
| Labels/navigation | Lowercase, minimal, functional |
| CTAs | Direct action — no enthusiasm, no exclamation marks |

### Tone examples

| Don't say | Say instead |
|---|---|
| "We're passionate about helping your business succeed!" | "We build for your business like it's our own." |
| "Our team of experts will deliver results." | "We write clean code, use proven tools, and build sites that won't need replacing in 18 months." |
| "Get started today!" | "Let's talk." |
| "We offer affordable pricing!" | "You don't need a $50k agency to look like one." |

---

## 4. Core Values

These are the three non-negotiables. They inform every client interaction, every design decision, every line of code.

### 01 — Relationships first
> *We don't take on clients. We take on partners. Every project starts with understanding your business, not your budget.*

### 02 — Move fast. Change faster.
> *We build lean, iterate quickly, and never fall in love with a plan just because we made it.*

### 03 — Premium results without the premium price tag.
> *You don't need a $50k agency to look like one. We bring the craft without the overhead.*

---

## 5. Target Audience

**Who we build for:** The businesses that make your city great.

Restaurants. Contractors. Boutiques. Gyms. Lawyers. Dentists. If they serve their community, we want to help them show up online.

**What they share:**
- They're excellent at what they do — they just don't have time to become web experts too
- They've been burned before: overpriced agencies, sites that broke, developers who disappeared
- They want a partner they can trust, not another vendor to manage
- They care deeply about their reputation in their community

---

## 6. Visual Identity

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| `--color-dark` | `#0f0f0f` | Hero background, CTA section, footer — near-black with warmth |
| `--color-warm-white` | `#f5f2ee` | Body sections — warm, not clinical |
| `--color-text-light` | `#ffffff` | Text on dark backgrounds |
| `--color-text-dark` | `#1a1a1a` | Text on light backgrounds |
| `--color-accent` | `#c8b89a` | Warm stone — section label borders, value numbers, phone number. Use sparingly. |
| `--color-muted` | `#9a9a8e` | Secondary text, captions, nav links at rest |

**Rules:**
- Accent color is a punctuation mark, not a primary color. It should appear in 2–3 places per page maximum.
- Never use pure black (`#000000`) or pure white (`#ffffff`) as backgrounds. Use the warm-shifted values.
- The dark-to-light page transition (hero → body sections) is achieved via a CSS gradient zone — it should feel like dawn breaking, not a hard cut.

---

### Typography

#### Typefaces

| Role | Font | Source | Fallback |
|---|---|---|---|
| Display / Wordmark | PP Neue Montreal | Fontshare | system-ui, sans-serif |
| Body / Warmth | Instrument Serif | Google Fonts | Georgia, serif |

PP Neue Montreal brings geometric refinement and quiet authority. Instrument Serif brings warmth and humanity. Together they balance confidence with approachability.

#### Type Scale

| Element | Size | Weight | Tracking | Notes |
|---|---|---|---|---|
| Hero headline | `clamp(3.5rem, 8vw, 7rem)` | 500 | `-0.02em` | Max 16ch wide |
| Section headline | `clamp(2rem, 4vw, 3.5rem)` | 500 | `-0.025em` | |
| CTA headline | `clamp(3rem, 6vw, 5.5rem)` | 500 | `-0.03em` | |
| Value title | `clamp(1.5rem, 2.5vw, 2rem)` | 500 | `-0.02em` | |
| Body (serif) | `1.05–1.2rem` | 400 | normal | `line-height: 1.75–1.8` |
| Wordmark / nav | `0.875rem` | 500 | `0.06em` | |
| Labels (uppercase) | `0.75rem` | 500 | `0.14em` | Always uppercase |
| Captions / URL | `0.8rem` | 400 | `0.04em` | |

#### Typography rules
- Headlines in PP Neue Montreal. Body copy in Instrument Serif (italic for subtext).
- **Never use Inter, Roboto, Arial, or system fonts** as primary typefaces in design output.
- Italic Instrument Serif is used specifically for subheadlines, descriptions, and copy that needs warmth — never for headlines.
- Section labels are always small-caps, uppercase, muted color, with an accent left-border (`2px solid #c8b89a`).

---

### Spacing & Layout

| Token | Value |
|---|---|
| Horizontal padding | `--h-pad: 10vw` (desktop), `6vw` (mobile) |
| Max content width | `1100px` |
| Section padding | `8–10rem` vertical (desktop) |
| Grid | 12-column conceptually; sections often use 6–8 columns |

**Rules:**
- Whitespace is a design element. Generous margins signal confidence.
- All content aligns to the grid. No decorative chaos.
- Max content width prevents text from becoming unreadable on ultrawide screens.

---

### Texture & Atmosphere

The hero dark section uses a **subtle SVG grain overlay** (opacity ~4%) to add atmospheric depth — preventing the flat digital black from feeling sterile. This is a key differentiator from generic sites.

The dark CTA section uses a large **`tl` monogram watermark** (`opacity: 0.025`) in the bottom-right corner, adding dimension without clutter.

---

## 7. Animation System

> Animations should feel **inevitable, not surprising.** Content emerges. It doesn't perform.

### Timing tokens

| Token | Value | Use |
|---|---|---|
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | Reveals, entrances |
| `--ease-in-out-soft` | `cubic-bezier(0.4, 0, 0.2, 1)` | State transitions, hovers |
| `--duration-slow` | `900ms` | Hero word reveal |
| `--duration-medium` | `600ms` | Section transitions |
| `--duration-fast` | `300ms` | Hover states, micro-interactions |

### Defined animations

| Animation | Description |
|---|---|
| **Nav entrance** | Wordmark fades in from top at 100ms, nav links stagger in from 280ms (80ms apart) |
| **Word reveal** | Hero headline reveals word-by-word — `opacity 0→1` + `translateY 12px→0`, 100ms stagger, 700ms duration |
| **Subheadline reveal** | Fades in 800ms after headline sequence starts |
| **Dark → light transition** | CSS gradient zone between hero and body — no JavaScript |
| **Scroll reveal** | All `[data-reveal]` elements: `opacity 0→1` + `translateY 20px→0`, triggered at 15% viewport intersection |
| **Cursor glow** | 40px warm-stone radial glow follows mouse with lerp smoothing (factor: 0.08). Scales to 100px on hoverable elements. Desktop only. |
| **Phone digit reveal** | CTA phone number reveals character-by-character at 80ms stagger on viewport enter |
| **Hover underlines** | `scaleX: 0→1` from left on all text links |
| **Portfolio card hover** | `scale(1.015)` + shadow deepens + `↗` shifts up-right, all 300ms |

### Animation rules
- **No spring physics. No bounce. No dramatic transforms.**
- `prefers-reduced-motion`: all animations are disabled — elements appear at their final state immediately.
- Cursor glow is disabled on touch devices (`hover: none` media query).
- Animations on mobile use reduced `translateY` distances (12px vs 20px).

---

## 8. Page Structure

The page follows a deliberate dark → light → dark rhythm — bookend symmetry that opens and closes with confidence.

```
Hero (dark)              — Full viewport, commanding
Transition zone          — CSS gradient, 30vh, no content
Values / About (light)   — Warm white, relationships
Who We Build For (light) — Warm white, community
Portfolio / Work (light) — Warm white, proof
CTA (dark)               — Returns to darkness, symmetry
Footer (dark)            — Quiet close
```

---

## 9. Design Principles

1. **Every element earns its place.** If it doesn't add meaning, it doesn't exist.
2. **Warmth through restraint.** The warmth comes from careful choices — warm white, serif body type, stone accents — not from decorative elements.
3. **Quiet confidence.** The brand doesn't shout. It doesn't need to.
4. **Local-first.** The audience is community businesses. The language, imagery, and tone should always feel human and local — never enterprise, never startup.
5. **Craft over output.** We're not a volume shop. Every design decision should reflect that.

---

## 10. What We Are Not

- Not an enterprise agency
- Not a startup tool or SaaS product
- Not a template shop
- Not loud, playful, or quirky
- Not purple gradients on white

---

## 11. Placeholders (resolve before launch)

| Item | Current value | Action |
|---|---|---|
| Phone number | `(555) 867-5309` | Replace in `index.html` (display + `href="tel:"`) |
| Email | `hello@toprocklabs.com` | Confirm correct |
| Instagram link | `href="#"` | Add real profile URL |
| LinkedIn link | `href="#"` | Add real profile URL |

---

*toprock labs — built with care.*
