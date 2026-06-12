# Mindful Block — Project Context for Claude Code

## What this is

Mindful Block is a **Manifest V3 browser extension** (Chrome and Firefox) that reduces procrastination by redirecting visits to blocked domains toward mindful searches on mission-driven search engines (Ecosia and OceanHero).

It is part of the **Calm & Fluffy** brand — a newsletter whose logo is a smiling cloud. The tone across all copy and UI is warm, gentle, and human. Not corporate. Not preachy. Not a stern firewall. Think: a kind nudge.

---

## How it works

- Blocking is handled at the network layer via `declarativeNetRequest` dynamic rules — the blocked site never loads any bytes
- If Calm Guard is enabled, `background.js` maintains one DNR rule per blocked domain (matching main-frame navigations including all subdomains); Calm Guard off = no rules active
- Matching navigations are redirected to `redirect.html?blocked=<domain>` before the request leaves the browser
- `redirect.js` reads storage, picks a random engine and search idea, increments the impact counter, shows the 450 ms holding page, then forwards to the mindful search URL
- DNR rules are kept in sync by `background.js` on install/update, on browser startup, and whenever `enabled` or `blockedDomains` change in storage
- Ecosia and OceanHero domains are always exempt from blocking (never added as rules)

---

## File structure

| File | Purpose |
|------|---------|
| `manifest.json` | Extension manifest and permissions |
| `defaults.js` | Centralized default settings, default Search ideas list, and shared utility functions (`normalizeDomain`, `sanitizePrompts`, `sanitizeDomains`, `hasOwn`) |
| `background.js` | Service worker / event page: DNR rule sync, install/update behavior, context menu |
| `popup.html/css/js` | Compact popup interface (opened from toolbar icon) |
| `impact.js` | Shared module — `renderImpact` and `setupShareImpact` used by both popup and options page |
| `options.html/css/js` | Setup & instructions page (registered as `options_ui` with `open_in_tab: true`); always shows Quick Start instructions and full settings |
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
| `welcomeSeen` | boolean | `false` (install) / `true` (update) | No longer used by the options page UI; retained by `background.js` for install/update tracking |
| `introducedPrompts` | string[] | All defaults on install | Internal tracking set; prevents previously-deleted default prompts from being silently re-added on extension updates |

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
- **The "Block current tab" button shows an error toast** when the user is on an Ecosia or OceanHero domain — the button is not hidden, but the add attempt is blocked with the message `"You can't block the redirect search engines. :-)"`
- **Never overwrite user settings on extension update.** On update, only append genuinely new default prompts (those not previously introduced via `introducedPrompts`). Never touch blockedDomains, engine toggles, or other preferences
- **Image search toggle does not affect which engines are enabled.** It only changes the URL format for whichever engines are currently active

---

## Typography

- **Nunito** (Google Fonts) — headings, app title, section headers, button labels
- **Source Sans 3** (Google Fonts) — body text, list items, placeholder text, descriptions
- Both fonts are loaded via a local `fonts/fonts.css` file referenced in `popup.html`, `options.html`, and `redirect.html`
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
- Tagline: *"Your calm and fluffy way to make every distraction count."*
- Quick Start copy (verbatim, do not rewrite):
  1. Add the sites that distract you.
  2. When you visit one, Mindful Block redirects you to Ecosia or OceanHero instead.
  3. Those search engines plant trees and remove plastic from the ocean. Every search contributes to a better world.

---

## UI/UX conventions

- Error and validation messages are shown as **toast notifications** at the top of the page (popup and options page), visible regardless of which sections are collapsed. They auto-dismiss after 3 seconds.
- The popup uses collapsible `<details>` sections for Sites to avoid, Search engines, and Search ideas
- The options page settings section also uses collapsible `<details>` sections with the same structure
- The `<img id="app-icon">` in the popup header and `<img id="app-icon">` in the options header both use `icons/icon-128.png` (real PNG icon). Do not remove or restructure these elements.
- The "Block current tab" button label changes dynamically to `"Block [domain]"` when the current tab has a detectable domain
- Button hierarchy:
  - **Primary action (Block current tab):** accent blue (`var(--primary)`), white Nunito semibold label, full-width (`.primary-btn`)
  - **Secondary action (Add):** accent blue, white Nunito semibold label, inline (`.tonal-btn`)
  - **Destructive secondary (Remove):** muted rose tint (`#FDECEA` bg, `#C0392B` text)
- Toggle switches use the `.md-switch` class pattern with a `.track` span

---

## Browser support & store listings

| Browser | Minimum version | Reason |
|---------|----------------|--------|
| Chrome / Chromium | any MV3-capable | No restrictions beyond MV3 support |
| Firefox | **128.0** | `declarativeNetRequest` redirect rules require host permissions granted via install prompt (FF 127+); dual `service_worker` + `scripts` background keys need FF 121+; 128 is the first version where both are stable together |

**Store slugs / IDs**

| Store | URL / ID |
|-------|---------|
| Chrome Web Store | `https://chromewebstore.google.com/detail/mindful-block/nolneohpbighdcjiajppnmlcgncocenc` |
| Firefox Add-ons (AMO) | `https://addons.mozilla.org/firefox/addon/mindful-block/` — slug: **`mindful-block`** |

**Review link is browser-dependent.** `popup.js` detects the browser by checking whether `chrome.runtime.getURL("")` starts with `moz-extension://` (Firefox) or `chrome-extension://` (all Chromium browsers). No user-agent sniffing. The visible copy in the nudge strip is unchanged; only the `href` differs.

---

## Already implemented — do not re-implement

- Context menu right-click to pause/resume Calm Guard (already implemented in `background.js`)
- Settings persistence across updates (already implemented in `background.js`)

