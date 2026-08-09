# Aug Investors Page Design

**Date:** 2026-08-09  
**URL:** `https://augaugaug.com/investors`  
**Repo path:** `aug/investors/index.html` (also served at `https://pbd.team/aug/investors/`)  
**Status:** Approved for implementation planning

## Goal

Ship a read-only, scrollable multi-section investor pitch page for Aug. No forms, password gate, or deck PDF in v1. Contact is email only.

## Approach

Full-viewport section deck (option 1): each major section is roughly one screen tall, with soft scroll-snap on large viewports. Visual language adapted from [Robinhood Investor Relations](https://investors.robinhood.com/) — sticky white top nav, bold full-bleed color bands, serif display + sans body, hairline rules, institutional calm — branded with Aug’s neon accent, not Robinhood lime as a copy.

## Information architecture

Sticky top nav:

| Anchor label   | Section id      |
|----------------|-----------------|
| Intro          | `#intro`        |
| Why Aug        | `#why`          |
| Problems       | `#problems`     |
| Go-to-Market   | `#gtm`          |
| Founder        | `#founder`      |
| PBD            | `#pbd`          |
| Contact        | `#contact`      |

- Logo/wordmark left → links to Aug marketing home via relative `../`
- Nav links smooth-scroll to section anchors
- Active section highlighted via IntersectionObserver while scrolling
- Mobile: collapse anchors into a simple open/close menu

## Visual system

- **Accent:** Aug `.neon` = `#B0F600` (from iOS `Color.neon`)
- **Surfaces:** Intro = full-bleed `#B0F600` with black type (Robinhood-style welcome band). Remaining sections alternate near-black `#0A0A0A` (light type) and off-white `#F5F5F0` (dark type). Neon used for active nav, hairline accents, and key highlights on dark/light bands.
- **Type:** Google Fonts — **Instrument Serif** for section titles and key lines; **Manrope** for nav and body
- **Layout:** Generous margins; hairline rules; one job per section; no cards; no hero metric strip; no floating badges
- **Motion:** Subtle fade/slide on section enter; smooth anchor scroll; soft scroll-snap on desktop; respect `prefers-reduced-motion`
- **Imagery (v1):** Type-led deck; no required product imagery for launch

## Section content

### 1. Intro (`#intro`)

Brand-led hero. Aug name is hero-level. Short supporting pitch:

> Aug is a spatial social. It pulls users out of the 2D scroll feed and into the real-world camera scene, where they can instantly create and share AR text, photos, GIF stickers, and more spatial content for others nearby to discover and interact with. Creating spatial content should feel as easy and native as posting an IG Story or TikTok.

### 2. Why Aug (`#why`)

Three major shifts as three clear beats:

1. **Consumer AR as a high-quality data funnel for Physical AI** — Mobile AR with LiDAR, depth, and spatial mapping can yield structured real-world geometry and movement data, not just pixels. Consumer AR people want to use can generate that data as a byproduct.
2. **Spatial content pulls users toward glasses** — People buy smart glasses when content, utility, or social experience is compelling enough. Aug builds UGC and communities on mobile first, then gives that network a native reason to move onto glasses.
3. **AR needs a UGC ecosystem** — Pokémon GO proved mobile AR at scale, but AR stayed publisher-driven while IG/TikTok/Snap grew on creators. Aug makes AR creation instant, social, and user-driven — thoughts, reactions, selfies, memes, and in-the-moment posts in the camera, in seconds.

### 3. Problems (`#problems`)

Draft copy (editable before/during implementation):

1. **Social is stuck in the 2D feed** — Attention lives in scroll timelines, while real life happens in places. There’s no native, easy way to leave and discover social content *in* the camera scene where people already gather.
2. **AR has been publisher-driven** — Most AR experiences ship a single content universe from a single provider. Without a creator flywheel, spatial experiences don’t compound the way social apps do.
3. **Creation friction kills spatial UGC** — Studio-grade 3D is not what most people want to post. If creating AR content isn’t as easy as a Story or TikTok, the ecosystem never forms.
4. **The next computing surface needs a network** — Glasses need content and community before they become habitual. Waiting for hardware alone won’t produce the social graph or content library that makes the device worth wearing.

### 4. Go-to-Market (`#gtm`)

**Wedge:** K-pop and anime fandoms. Turn meaningful fan locations — concert venues, pop-ups, event spaces, outdoor billboards, and other places tied to an idol or character — into shared augmented spaces. Fans open Aug on-site and interact through a persistent augmented board: supportive messages, reactions, stickers, fan-created content, and discovery of what others left behind.

**Expand ladder (short):** Fandom locations → broader place-based social communities → wider spatial content network (including OOH / brand moments as the network grows).

### 5. Founder (`#founder`)

**Gunhee Han** — Co-founder of Aug; CEO @ PBD LLC. Designs and builds Aug. Based in Los Angeles. Background from public sources: UCLA (Political Science / game theory concentration); prior ops/strategy roles including Hyperloop Transportation Technologies; building AI/AR apps (Aug, Shotup AI).

- LinkedIn: https://www.linkedin.com/in/gunheehan
- Keep the section short: role, one-paragraph bio, LinkedIn CTA. No resume dump.

### 6. PBD (`#pbd`)

**Mission / naming:** Pale Blue Dot (PBD LLC) is named for the idea that from any standing point, the same matter can be seen and thought differently — like looking at society and Earth from inside versus from outside. The studio builds apps that shift viewpoint and make Earth more interesting.

**Satellite apps into Aug’s ecosystem** (focus; not a full PBD catalog):

| App      | Subtitle                                      | Role |
|----------|-----------------------------------------------|------|
| Superba  | Running + AR Gaming on mobile                 | Interest-group wedge (runners / AR gaming) into Aug’s AR ecosystem |
| Auggy    | Mobile RPG of AR characters on camera         | Interest-group wedge (AR character RPG) into Aug’s AR ecosystem |

Frame both explicitly as satellites that bring specific interest groups into Aug’s AR ecosystem.

### 7. Contact (`#contact`)

- Email: [gunhee@aug.ooo](mailto:gunhee@aug.ooo)
- Optional secondary: LinkedIn (same as Founder)
- No signup form, Calendly, or deck download in v1

## Technical design

- **File:** `aug/investors/index.html` — self-contained HTML with inline CSS/JS (match `aug/about/` pattern)
- **Meta:** Title/description/OG for Aug investors page; favicon/aug icon paths consistent with sibling pages
- **JS:** Smooth scroll; active nav observer; mobile nav toggle; no backend
- **A11y:** Skip link, semantic landmarks, focus-visible, `prefers-reduced-motion`
- **Domain note:** This repo’s GitHub Pages CNAME is `pbd.team`. `augaugaug.com/investors` assumes existing domain routing that already serves Aug marketing content the same way as today’s site. Path in-repo is `/aug/investors/`; confirm DNS/hosting maps `augaugaug.com/investors` → this page when deploying (document any rewrite if needed at implement time)

## Out of scope (v1)

- Renewing main `augaugaug.com` / `pbd.team/aug` marketing home
- Password-gated materials, PDF deck, email capture
- Subdomain `investors.augaugaug.com`
- Traction metrics / fundraising ask amounts (not provided)
- Shotup AI, Crema, AugClaw as featured products on this page

## Success criteria

- Page loads at `/aug/investors/` in this static site
- Top nav jumps to every section; active state tracks scroll
- Desktop reads as a multi-section deck; mobile stacks cleanly without horizontal overflow
- Neon `#B0F600` is the clear accent
- Copy covers Intro, Why (3 shifts), Problems, GTM, Founder, PBD + Superba/Auggy, Contact
- Contact mailto works to `gunhee@aug.ooo`

## Implementation next step

Create an implementation plan via the writing-plans skill after user review of this spec.
