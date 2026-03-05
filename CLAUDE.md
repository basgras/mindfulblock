# Mindful Block — Project Context for Claude Code

## What this is

Mindful Block is a **Manifest V3 Chrome extension** that reduces procrastination by redirecting visits to blocked domains toward mindful searches on mission-driven search engines (Ecosia and OceanHero).

It is part of the **Calm & Fluffy** brand — a newsletter whose logo is a smiling cloud. The tone across all copy and UI is warm, gentle, and human. Not corporate. Not preachy. Not a stern firewall. Think: a kind nudge.

---

## How it works

- Watches top-level navigation via `chrome.webNavigation.onBeforeNavigate`
- If Calm Guard is enabled and the destination matches a blocked domain (or subdomain), navigation is interrupted
- The tab is sent to `redirect.html`, then forwarded to a mindful search URL
- Redirect target is selected at random between active engines (Ecosia, OceanHero)
- Search query is randomly selected from the user's Search ideas list
- Ecosia and OceanHero domains are always exempt from blocking

---

## File structure

| File | Purpose |
|------|---------|
| `manifest.json` | Extension manifest and permissions |
| `defaults.js` | Centralized default settings and default Search ideas list |
| `background.js` | Service worker: redirects, install/update behavior, context menu |
| `popup.html/css/js` | Compact popup interface (opened from toolbar icon) |
| `welcome.html/css/js` | Onboarding page and full settings (also used as `options_page`) |
| `redirect.html/css/js` | Holding page shown briefly before forwarding to search engine |

---

## Storage keys (`chrome.storage.sync`)

| Key | Type | Default | Notes |
|-----|------|---------|-------|
| `enabled` | boolean | `true` | Calm Guard on/off |
| `blockedDomains` | string[] | `["facebook.com", "x.com", "instagram.com", "youtube.com", "reddit.com"]` | Normalized, sorted |
| `prompts` | string[] | See `defaults.js` | User's Search ideas |
| `ecosiaEnabled` | boolean | `true` | |
| `oceanHeroEnabled` | boolean | `true` | At least one must always be true |
| `imageSearchEnabled` | boolean | `false` | Global; affects both engines |

---

## Search engine URLs

| Engine | Web search | Image search |
|--------|-----------|-------------|
| Ecosia | `https://www.ecosia.org/search?q=` | `https://www.ecosia.org/images?q=` |
| OceanHero | `https://oceanhero.today/web?q=` | `https://oceanhero.today/images?q=` |

---

## Rules that must never be broken

- **At least one search engine must always be active.** If a user tries to disable the last one, prevent it and show a toast: `"At least one search engine must be active. :-)"`
- **Ecosia and OceanHero can never be added to the blocked domains list.** If attempted, show a toast: `"You can't block the redirect search engines. :-)"`
- **The "Block current tab" button must be hidden** when the user is on an Ecosia or OceanHero domain
- **Never overwrite user settings on extension update.** On update, only append new default prompts that don't already exist in the user's list. Never touch blockedDomains, engine toggles, or other preferences
- **Image search toggle does not affect which engines are enabled.** It only changes the URL format for whichever engines are currently active

---

## Typography

- **Nunito** (Google Fonts) — headings, app title, section headers, button labels
- **Source Sans 3** (Google Fonts) — body text, list items, placeholder text, descriptions
- Both are already imported in `popup.html` and `welcome.html`
- Do not introduce other fonts. Do not use system fonts or paid fonts.

---

## Brand voice & copy guidelines

- Tone: warm, gentle, encouraging — never clinical, never stern
- The product is called **Mindful Block**. The brand is **Calm & Fluffy**.
- Key UI terms (use exactly, don't rename without instruction):
  - **Calm Guard** — the main on/off toggle for blocking
  - **Sites to avoid** — the blocked domains list
  - **Search ideas** — the list of redirect queries (not "prompts", not "mindful prompts")
  - **Search engines** — the Ecosia/OceanHero section
- Tagline: *"Your calm and fluffy cloud for better browsing."*
- Quick Start copy (verbatim, do not rewrite):
  1. Add the sites that distract you.
  2. When you visit one, Mindful Block redirects you to Ecosia or OceanHero instead.
  3. Those search engines plant trees and remove plastic from the ocean. Every search counts.

---

## UI/UX conventions

- Error and validation messages are shown as **toast notifications** at the top of the popup, visible regardless of which sections are collapsed. They auto-dismiss after 3 seconds.
- The popup uses collapsible `<details>` sections for Sites to avoid, Search engines, and Search ideas
- The `<img id="app-icon">` in the header is a placeholder SVG cloud — a real icon will be added later. Do not remove or restructure this element.
- Button hierarchy:
  - **Primary action (Add):** accent blue, white Nunito semibold label
  - **Destructive secondary (Remove):** muted rose tint (`#FDECEA` bg, `#C0392B` text)
- Toggle switches use the `.md-switch` class pattern with a `.track` span

---

## What's pending (do not implement unless explicitly asked)

- Real app icon (Bas will supply the file)
- Context menu right-click to pause/resume Calm Guard (already implemented in `background.js`)
- Settings persistence across updates (already implemented in `background.js`)
