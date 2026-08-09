# Aug Investors Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a read-only scrollable investor pitch deck at `aug/investors/index.html` for `augaugaug.com/investors` (and `pbd.team/aug/investors/`).

**Architecture:** One self-contained static HTML page (inline CSS/JS), matching sibling pages under `aug/`. Full-viewport section deck with sticky anchor nav, IntersectionObserver active states, and soft scroll-snap. No backend, forms, or build step.

**Tech Stack:** Static HTML5, CSS (custom properties), vanilla JS, Google Fonts (Instrument Serif + Manrope), existing `/assets/images/aug-icon.png` and OG image paths.

## Global Constraints

- Accent neon exactly `#B0F600` (Aug `.neon`)
- Surfaces: Intro `#B0F600` + black type; alternate `#0A0A0A` and `#F5F5F0`
- Fonts: Instrument Serif (titles), Manrope (nav/body)
- Nav anchors: Intro `#intro`, Why Aug `#why`, Problems `#problems`, Go-to-Market `#gtm`, Founder `#founder`, PBD `#pbd`, Contact `#contact`
- Contact email: `gunhee@aug.ooo`
- Logo links to `../`
- No cards, no hero metrics strip, no forms/PDF/password gate
- Respect `prefers-reduced-motion`
- Spec: `docs/superpowers/specs/2026-08-09-aug-investors-page-design.md`
- Do not renew main Aug marketing home in this plan
- Do not commit unrelated dirty files (Crema/Superba waitlists, `.DS_Store`)

## File structure

| File | Responsibility |
|------|----------------|
| `aug/investors/index.html` | Entire page: meta, styles, markup, nav JS |
| `docs/superpowers/specs/2026-08-09-aug-investors-page-design.md` | Source of truth for copy/IA (read-only during impl) |

Verification for this static page uses shell checks (required IDs/strings present) plus manual browser pass — no unit-test framework in repo.

---

### Task 1: Scaffold page shell with meta, tokens, nav, empty sections

**Files:**
- Create: `aug/investors/index.html`
- Test: shell grep checks against that file

**Interfaces:**
- Consumes: Spec section IDs and visual tokens
- Produces: Valid HTML shell with `#intro` `#why` `#problems` `#gtm` `#founder` `#pbd` `#contact`, sticky `<nav>`, CSS variables `--neon`, `--black`, `--offwhite`

- [ ] **Step 1: Write failing verification (file missing)**

Run:

```bash
test -f aug/investors/index.html
```

Expected: exit code `1` (file does not exist yet)

- [ ] **Step 2: Create `aug/investors/index.html` shell**

Create directory `aug/investors/` and write this file (placeholder section bodies are intentional; Task 3 fills copy):

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aug — Investors</title>
    <meta name="description" content="Aug is a spatial social — investor overview from Pale Blue Dot (PBD LLC).">

    <meta property="og:type" content="website">
    <meta property="og:url" content="https://pbd.team/aug/investors/">
    <meta property="og:title" content="Aug — Investors">
    <meta property="og:description" content="Aug is a spatial social — investor overview from Pale Blue Dot (PBD LLC).">
    <meta property="og:image" content="https://pbd.team/assets/images/aug Thumbnail.png">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="https://pbd.team/aug/investors/">
    <meta name="twitter:title" content="Aug — Investors">
    <meta name="twitter:description" content="Aug is a spatial social — investor overview from Pale Blue Dot (PBD LLC).">
    <meta name="twitter:image" content="https://pbd.team/assets/images/aug Thumbnail.png">

    <link rel="icon" type="image/png" href="/assets/images/aug-icon.png">
    <link rel="apple-touch-icon" href="/assets/images/aug-icon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --neon: #B0F600;
            --black: #0A0A0A;
            --offwhite: #F5F5F0;
            --white: #FFFFFF;
            --nav-h: 64px;
            --font-display: "Instrument Serif", Georgia, serif;
            --font-body: "Manrope", system-ui, sans-serif;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html { scroll-behavior: smooth; }

        @media (prefers-reduced-motion: reduce) {
            html { scroll-behavior: auto; }
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }

        body {
            font-family: var(--font-body);
            color: var(--black);
            background: var(--offwhite);
            line-height: 1.55;
            -webkit-font-smoothing: antialiased;
            overflow-x: hidden;
        }

        a { color: inherit; text-decoration: none; }
        a:hover { text-decoration: underline; }

        .skip-link {
            position: absolute;
            left: -999px;
            top: 0;
            background: var(--black);
            color: var(--neon);
            padding: 12px 16px;
            z-index: 1000;
        }
        .skip-link:focus { left: 12px; top: 12px; }

        /* Nav + section styles filled in Task 2 */
        .site-header { /* placeholder */ }
        .deck-section {
            min-height: 100vh;
            min-height: 100dvh;
            padding: calc(var(--nav-h) + 48px) 24px 64px;
        }
        .deck-section .inner { max-width: 920px; margin: 0 auto; }
        .deck-section h2 {
            font-family: var(--font-display);
            font-weight: 400;
            font-size: clamp(2.25rem, 5vw, 3.5rem);
            line-height: 1.15;
            margin-bottom: 1.25rem;
        }
    </style>
</head>
<body>
    <a class="skip-link" href="#intro">Skip to content</a>

    <header class="site-header">
        <nav class="site-nav" aria-label="Investor sections">
            <a class="brand" href="../">aug</a>
            <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="nav-links">Menu</button>
            <ul id="nav-links" class="nav-links">
                <li><a href="#intro">Intro</a></li>
                <li><a href="#why">Why Aug</a></li>
                <li><a href="#problems">Problems</a></li>
                <li><a href="#gtm">Go-to-Market</a></li>
                <li><a href="#founder">Founder</a></li>
                <li><a href="#pbd">PBD</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
        </nav>
    </header>

    <main>
        <section id="intro" class="deck-section band-neon" data-section>
            <div class="inner"><h1>aug</h1><p>PLACEHOLDER_INTRO</p></div>
        </section>
        <section id="why" class="deck-section band-black" data-section>
            <div class="inner"><h2>Why Aug</h2><p>PLACEHOLDER_WHY</p></div>
        </section>
        <section id="problems" class="deck-section band-light" data-section>
            <div class="inner"><h2>Problems</h2><p>PLACEHOLDER_PROBLEMS</p></div>
        </section>
        <section id="gtm" class="deck-section band-black" data-section>
            <div class="inner"><h2>Go-to-Market</h2><p>PLACEHOLDER_GTM</p></div>
        </section>
        <section id="founder" class="deck-section band-light" data-section>
            <div class="inner"><h2>Founder</h2><p>PLACEHOLDER_FOUNDER</p></div>
        </section>
        <section id="pbd" class="deck-section band-black" data-section>
            <div class="inner"><h2>Pale Blue Dot</h2><p>PLACEHOLDER_PBD</p></div>
        </section>
        <section id="contact" class="deck-section band-light" data-section>
            <div class="inner"><h2>Contact</h2><p><a href="mailto:gunhee@aug.ooo">gunhee@aug.ooo</a></p></div>
        </section>
    </main>

    <script>
        /* Nav behavior filled in Task 2 */
    </script>
</body>
</html>
```

- [ ] **Step 3: Run verification checks**

```bash
test -f aug/investors/index.html && \
rg -n 'id="(intro|why|problems|gtm|founder|pbd|contact)"' aug/investors/index.html && \
rg -n 'mailto:gunhee@aug.ooo' aug/investors/index.html && \
rg -n '--neon: #B0F600' aug/investors/index.html && \
rg -n 'Instrument Serif' aug/investors/index.html && \
rg -n 'href="../"' aug/investors/index.html
```

Expected: file exists; all seven `id=` lines; mailto; neon token; font name; brand `../` link

- [ ] **Step 4: Commit**

```bash
git add aug/investors/index.html
git commit -m "$(cat <<'EOF'
Add Aug investors page shell with section anchors.

EOF
)"
```

---

### Task 2: Deck layout CSS, sticky nav, scroll-snap, nav JS

**Files:**
- Modify: `aug/investors/index.html` (replace placeholder `<style>` nav rules and empty `<script>`)

**Interfaces:**
- Consumes: Shell from Task 1 (`data-section`, `#nav-links`, `.nav-toggle`, `.site-header`)
- Produces: Working sticky nav; `.is-active` on current anchor; mobile menu toggle; optional `scroll-snap-type` on `html` for `min-width: 900px`

- [ ] **Step 1: Replace style block with full deck + nav CSS**

In `aug/investors/index.html`, ensure the `<style>` block includes (merge with Task 1 tokens; remove `/* placeholder */` stubs):

```css
:root {
    --neon: #B0F600;
    --black: #0A0A0A;
    --offwhite: #F5F5F0;
    --white: #FFFFFF;
    --nav-h: 64px;
    --font-display: "Instrument Serif", Georgia, serif;
    --font-body: "Manrope", system-ui, sans-serif;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { scroll-behavior: smooth; }

@media (min-width: 900px) {
    html { scroll-snap-type: y proximity; }
}

@media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; scroll-snap-type: none; }
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
    .reveal { opacity: 1 !important; transform: none !important; }
}

body {
    font-family: var(--font-body);
    color: var(--black);
    background: var(--offwhite);
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
}

a { color: inherit; text-decoration: none; }
a:hover { text-decoration: underline; }
:focus-visible { outline: 2px solid var(--neon); outline-offset: 3px; }

.skip-link {
    position: absolute;
    left: -999px;
    top: 0;
    background: var(--black);
    color: var(--neon);
    padding: 12px 16px;
    z-index: 1000;
}
.skip-link:focus { left: 12px; top: 12px; }

.site-header {
    position: sticky;
    top: 0;
    z-index: 100;
    height: var(--nav-h);
    background: var(--white);
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.site-nav {
    max-width: 1120px;
    margin: 0 auto;
    height: 100%;
    padding: 0 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.brand {
    font-family: var(--font-body);
    font-weight: 700;
    font-size: 1.125rem;
    letter-spacing: -0.02em;
    text-decoration: none !important;
}

.nav-toggle {
    display: none;
    border: 1px solid rgba(0, 0, 0, 0.2);
    background: var(--white);
    font-family: var(--font-body);
    font-size: 0.875rem;
    font-weight: 600;
    padding: 8px 12px;
    cursor: pointer;
}

.nav-links {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 8px 18px;
}

.nav-links a {
    font-size: 0.8125rem;
    font-weight: 600;
    text-decoration: none !important;
    color: var(--black);
    padding: 4px 0;
    border-bottom: 2px solid transparent;
}

.nav-links a.is-active {
    border-bottom-color: var(--neon);
}

@media (max-width: 899px) {
    .nav-toggle { display: inline-flex; }
    .nav-links {
        display: none;
        position: absolute;
        top: var(--nav-h);
        left: 0;
        right: 0;
        flex-direction: column;
        align-items: stretch;
        background: var(--white);
        border-bottom: 1px solid rgba(0, 0, 0, 0.12);
        padding: 12px 20px 20px;
        gap: 12px;
    }
    .site-nav.is-open .nav-links { display: flex; }
}

.deck-section {
    min-height: 100vh;
    min-height: 100dvh;
    padding: calc(var(--nav-h) + 56px) 24px 72px;
    display: flex;
    align-items: center;
    scroll-snap-align: start;
    scroll-margin-top: 0;
}

.deck-section .inner { max-width: 920px; margin: 0 auto; width: 100%; }

.band-neon { background: var(--neon); color: var(--black); }
.band-black { background: var(--black); color: var(--offwhite); }
.band-light { background: var(--offwhite); color: var(--black); }

.deck-section h1,
.deck-section h2 {
    font-family: var(--font-display);
    font-weight: 400;
    line-height: 1.12;
    letter-spacing: -0.02em;
}

.deck-section h1 {
    font-size: clamp(3.5rem, 10vw, 6.5rem);
    margin-bottom: 1.5rem;
}

.deck-section h2 {
    font-size: clamp(2.25rem, 5vw, 3.5rem);
    margin-bottom: 1.5rem;
}

.deck-section p,
.deck-section li {
    font-size: clamp(1.05rem, 2vw, 1.2rem);
    max-width: 40rem;
}

.deck-section .rule {
    border: 0;
    border-top: 1px solid currentColor;
    opacity: 0.25;
    margin: 1.5rem 0;
}

.shift-list,
.problem-list,
.satellite-list {
    list-style: none;
    display: grid;
    gap: 1.75rem;
    margin-top: 0.5rem;
}

.shift-list h3,
.problem-list h3,
.satellite-list h3 {
    font-family: var(--font-display);
    font-size: clamp(1.35rem, 2.5vw, 1.75rem);
    font-weight: 400;
    margin-bottom: 0.5rem;
}

.band-black .accent-line { color: var(--neon); }
.band-light a[href^="mailto"],
.band-black a[href^="mailto"],
.band-light a[href*="linkedin"],
.band-black a[href*="linkedin"] {
    color: inherit;
    border-bottom: 1px solid var(--neon);
    text-decoration: none;
}

.reveal {
    opacity: 0;
    transform: translateY(16px);
    transition: opacity 0.55s ease, transform 0.55s ease;
}
.reveal.is-visible {
    opacity: 1;
    transform: none;
}
```

- [ ] **Step 2: Add nav + reveal JS**

Replace the empty `<script>` with:

```javascript
(function () {
    const header = document.querySelector(".site-nav");
    const toggle = document.querySelector(".nav-toggle");
    const links = document.querySelectorAll('.nav-links a[href^="#"]');
    const sections = document.querySelectorAll("[data-section]");

    if (toggle && header) {
        toggle.addEventListener("click", function () {
            const open = header.classList.toggle("is-open");
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
        });
        links.forEach(function (link) {
            link.addEventListener("click", function () {
                header.classList.remove("is-open");
                toggle.setAttribute("aria-expanded", "false");
            });
        });
    }

    const linkById = {};
    links.forEach(function (link) {
        const id = link.getAttribute("href").slice(1);
        linkById[id] = link;
    });

    if ("IntersectionObserver" in window && sections.length) {
        const navObserver = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    const id = entry.target.id;
                    links.forEach(function (l) { l.classList.remove("is-active"); });
                    if (linkById[id]) linkById[id].classList.add("is-active");
                });
            },
            { rootMargin: "-40% 0px -45% 0px", threshold: 0.01 }
        );
        sections.forEach(function (section) { navObserver.observe(section); });

        const revealObserver = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        revealObserver.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15 }
        );
        document.querySelectorAll(".reveal").forEach(function (el) {
            revealObserver.observe(el);
        });
    } else {
        document.querySelectorAll(".reveal").forEach(function (el) {
            el.classList.add("is-visible");
        });
    }
})();
```

- [ ] **Step 3: Verify CSS/JS markers**

```bash
rg -n 'scroll-snap-type: y proximity' aug/investors/index.html && \
rg -n 'IntersectionObserver' aug/investors/index.html && \
rg -n 'is-active' aug/investors/index.html && \
rg -n 'nav-toggle' aug/investors/index.html && \
rg -n 'prefers-reduced-motion' aug/investors/index.html
```

Expected: each pattern found at least once

- [ ] **Step 4: Commit**

```bash
git add aug/investors/index.html
git commit -m "$(cat <<'EOF'
Style Aug investors deck and wire section nav.

EOF
)"
```

---

### Task 3: Fill all section copy from the approved spec

**Files:**
- Modify: `aug/investors/index.html` (`<main>` section bodies only)
- Read: `docs/superpowers/specs/2026-08-09-aug-investors-page-design.md`

**Interfaces:**
- Consumes: Spec section content (Intro through Contact)
- Produces: No `PLACEHOLDER_` strings left; Superba + Auggy satellite copy present; LinkedIn URL present

- [ ] **Step 1: Confirm placeholders still present**

```bash
rg -n 'PLACEHOLDER_' aug/investors/index.html
```

Expected: matches for INTRO/WHY/PROBLEMS/GTM/FOUNDER/PBD (contact already real)

- [ ] **Step 2: Replace `<main>` with full content**

Replace the entire `<main>...</main>` block with:

```html
<main>
    <section id="intro" class="deck-section band-neon" data-section>
        <div class="inner reveal">
            <h1>aug</h1>
            <hr class="rule">
            <p>Aug is a spatial social. It pulls users out of the 2D scroll feed and into the real-world camera scene, where they can instantly create and share AR text, photos, GIF stickers, and more spatial content for others nearby to discover and interact with. Creating spatial content should feel as easy and native as posting an IG Story or TikTok.</p>
        </div>
    </section>

    <section id="why" class="deck-section band-black" data-section>
        <div class="inner reveal">
            <h2>Why Aug</h2>
            <p class="accent-line">Three major shifts.</p>
            <hr class="rule">
            <ol class="shift-list">
                <li>
                    <h3>1. Consumer AR as a data funnel for Physical AI</h3>
                    <p>Aug naturally incentivizes users to generate valuable video, movement, and spatial data for AI. Data captured through mobile AR using LiDAR, depth sensing, and spatial mapping can contain structured information about real-world geometry, objects, surfaces, distances, and movement—not just pixels from a regular mobile video. We’ve already seen the strategic value of large-scale geospatial and real-world datasets. The opportunity is to build consumer AR people genuinely want to use, while naturally generating high-quality spatial data as part of the experience.</p>
                </li>
                <li>
                    <h3>2. Spatial content pulls users toward glasses</h3>
                    <p>People will purchase their first pair of smart glasses when there is content, utility, or a social experience compelling enough to pull them there. Aug builds user-generated spatial content and communities on mobile first, then can leverage that existing network to give users a reason to move onto glasses and experience that content in a more native form.</p>
                </li>
                <li>
                    <h3>3. AR needs a UGC ecosystem</h3>
                    <p>We do not need to wait for better glasses hardware for AR to become meaningful. Pokémon GO already proved the potential of mobile AR at massive scale. The missing piece has been user-generated content. While Instagram, TikTok, Snapchat, and YouTube grew through creator ecosystems, AR has largely remained publisher-driven. Aug changes that by making AR creation instant, social, and user-driven—thoughts, reactions, selfies, memes, and what is happening in the moment, shared in seconds through the camera.</p>
                </li>
            </ol>
        </div>
    </section>

    <section id="problems" class="deck-section band-light" data-section>
        <div class="inner reveal">
            <h2>Problems Aug is solving</h2>
            <hr class="rule">
            <ul class="problem-list">
                <li>
                    <h3>Social is stuck in the 2D feed</h3>
                    <p>Attention lives in scroll timelines, while real life happens in places. There’s no native, easy way to leave and discover social content in the camera scene where people already gather.</p>
                </li>
                <li>
                    <h3>AR has been publisher-driven</h3>
                    <p>Most AR experiences ship a single content universe from a single provider. Without a creator flywheel, spatial experiences don’t compound the way social apps do.</p>
                </li>
                <li>
                    <h3>Creation friction kills spatial UGC</h3>
                    <p>Studio-grade 3D is not what most people want to post. If creating AR content isn’t as easy as a Story or TikTok, the ecosystem never forms.</p>
                </li>
                <li>
                    <h3>The next computing surface needs a network</h3>
                    <p>Glasses need content and community before they become habitual. Waiting for hardware alone won’t produce the social graph or content library that makes the device worth wearing.</p>
                </li>
            </ul>
        </div>
    </section>

    <section id="gtm" class="deck-section band-black" data-section>
        <div class="inner reveal">
            <h2>Go-to-Market</h2>
            <hr class="rule">
            <h3 class="accent-line" style="font-family: var(--font-display); font-weight: 400; font-size: clamp(1.35rem, 2.5vw, 1.75rem); margin-bottom: 0.75rem;">Wedge: K-pop and anime fandoms</h3>
            <p>We start by turning meaningful fan locations—concert venues, pop-ups, event spaces, outdoor billboards, and other places tied to a favorite idol or character—into shared augmented spaces. Fans open Aug at these locations and interact through a persistent augmented board, leaving supportive messages, posting reactions, sharing stickers and fan-created content, and discovering what other fans have left behind.</p>
            <hr class="rule">
            <h3 style="font-family: var(--font-display); font-weight: 400; font-size: clamp(1.35rem, 2.5vw, 1.75rem); margin-bottom: 0.75rem;">Then expand</h3>
            <p>Fandom locations → broader place-based social communities → a wider spatial content network, including OOH and brand moments as the network grows.</p>
        </div>
    </section>

    <section id="founder" class="deck-section band-light" data-section>
        <div class="inner reveal">
            <h2>Founder</h2>
            <hr class="rule">
            <h3 style="font-family: var(--font-display); font-weight: 400; font-size: clamp(1.5rem, 3vw, 2rem); margin-bottom: 0.75rem;">Gunhee Han</h3>
            <p>Co-founder of Aug and CEO of Pale Blue Dot (PBD LLC). Designs and builds Aug in Los Angeles. Background spans operations and strategy—including work at Hyperloop Transportation Technologies—and building AI/AR products. UCLA, Political Science with a concentration in game theory.</p>
            <p style="margin-top: 1.25rem;"><a href="https://www.linkedin.com/in/gunheehan" target="_blank" rel="noopener noreferrer">LinkedIn →</a></p>
        </div>
    </section>

    <section id="pbd" class="deck-section band-black" data-section>
        <div class="inner reveal">
            <h2>Pale Blue Dot</h2>
            <hr class="rule">
            <p>PBD LLC is named after the Pale Blue Dot—the idea that from any standing point, the same matter can be seen and thought differently, just as we look at society and Earth from inside and from outside. The studio builds apps that shift viewpoint and make Earth more interesting.</p>
            <hr class="rule">
            <p class="accent-line" style="margin-bottom: 1rem;">Satellite apps that bring specific interest groups into Aug’s AR ecosystem:</p>
            <ul class="satellite-list">
                <li>
                    <h3>Superba</h3>
                    <p>Running + AR Gaming on mobile</p>
                </li>
                <li>
                    <h3>Auggy</h3>
                    <p>Mobile RPG of AR characters on camera</p>
                </li>
            </ul>
        </div>
    </section>

    <section id="contact" class="deck-section band-light" data-section>
        <div class="inner reveal">
            <h2>Contact</h2>
            <hr class="rule">
            <p><a href="mailto:gunhee@aug.ooo">gunhee@aug.ooo</a></p>
            <p style="margin-top: 1rem;"><a href="https://www.linkedin.com/in/gunheehan" target="_blank" rel="noopener noreferrer">linkedin.com/in/gunheehan</a></p>
        </div>
    </section>
</main>
```

- [ ] **Step 3: Verify copy markers**

```bash
rg -n 'PLACEHOLDER_' aug/investors/index.html; echo "placeholder_exit:$?"
rg -n 'Superba|Auggy|Physical AI|K-pop|gunhee@aug.ooo|linkedin.com/in/gunheehan' aug/investors/index.html
```

Expected: first command finds no `PLACEHOLDER_` matches (rg exit 1); second finds Superba, Auggy, Physical AI, K-pop, email, LinkedIn

- [ ] **Step 4: Commit**

```bash
git add aug/investors/index.html
git commit -m "$(cat <<'EOF'
Add Aug investors pitch copy across deck sections.

EOF
)"
```

---

### Task 4: Browser QA pass and final polish

**Files:**
- Modify: `aug/investors/index.html` only if QA finds issues (spacing, mobile menu, overflow)

**Interfaces:**
- Consumes: Completed page from Tasks 1–3
- Produces: QA-verified page meeting success criteria in the spec

- [ ] **Step 1: Serve locally and open the page**

From repo root:

```bash
python3 -m http.server 8765
```

Open: `http://127.0.0.1:8765/aug/investors/`

- [ ] **Step 2: Manual checklist (must all pass)**

1. Sticky white nav visible; logo goes to `/aug/`
2. Each nav label jumps to the correct section
3. Active nav underline (neon) tracks scroll
4. Intro is full neon `#B0F600` with black type; Aug name dominant
5. Sections alternate black / off-white after intro
6. Mobile width (~390px): hamburger/menu works; no horizontal scroll
7. `mailto:gunhee@aug.ooo` link works
8. With reduced motion enabled (OS setting or devtools), no jarring snap/animation requirement

- [ ] **Step 3: Spec coverage grep**

```bash
rg -n 'id="intro"|id="why"|id="problems"|id="gtm"|id="founder"|id="pbd"|id="contact"' aug/investors/index.html && \
rg -n '#B0F600' aug/investors/index.html && \
rg -n 'Running \+ AR Gaming on mobile' aug/investors/index.html && \
rg -n 'Mobile RPG of AR characters on camera' aug/investors/index.html
```

Expected: all section ids; neon hex; both satellite subtitles

- [ ] **Step 4: Commit only if polish edits were made**

If the file changed:

```bash
git add aug/investors/index.html
git commit -m "$(cat <<'EOF'
Polish Aug investors page after browser QA.

EOF
)"
```

If unchanged, skip commit.

- [ ] **Step 5: Stop local server**

Stop the `python3 -m http.server 8765` process when QA is done.

---

## Spec coverage checklist (plan self-review)

| Spec requirement | Task |
|------------------|------|
| URL path `aug/investors/index.html` | Task 1 |
| Sticky top nav with all section anchors | Tasks 1–2 |
| Full-viewport deck + soft snap | Task 2 |
| Neon `#B0F600` accent / neon intro band | Tasks 1–2 |
| Instrument Serif + Manrope | Task 1 |
| Intro / Why / Problems / GTM / Founder / PBD / Contact copy | Task 3 |
| Superba + Auggy satellites | Task 3 |
| `gunhee@aug.ooo` | Tasks 1, 3 |
| LinkedIn | Task 3 |
| Mobile menu | Task 2 |
| `prefers-reduced-motion` | Task 2 |
| No forms / PDF / password | All tasks (not added) |
| Browser QA success criteria | Task 4 |

No TBD/placeholder steps remain after Task 3 replaces `PLACEHOLDER_*` strings.
