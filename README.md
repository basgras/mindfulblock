# Mindful Block (MV3 — Chrome & Firefox)

A Manifest V3 browser extension that reduces procrastination by redirecting visits to blocked domains toward mindful searches on mission-driven search engines.

## How it works

- Blocking is handled at the network layer via `declarativeNetRequest` dynamic rules — the blocked site never loads any bytes.
- The background script keeps one DNR rule per blocked domain (matching the domain and all subdomains, main-frame navigations only). Calm Guard off = no rules active.
- Matching navigations are intercepted and sent to `redirect.html` before the request leaves the browser.
- The redirect page reads your settings, picks a random engine and search idea, increments the impact counter, shows a 450 ms holding screen, then forwards you to the mindful search.
- Redirect loops are prevented — Ecosia and OceanHero domains can never be blocked.

## Search engines

Two mission-driven engines are supported:

| Engine | Mission | Default URL pattern |
|--------|---------|-------------------|
| **Ecosia** | Plants trees | `https://www.ecosia.org/search?q=...` |
| **OceanHero** | Removes ocean plastic | `https://oceanhero.today/web?q=...` |

Both are enabled by default. You can disable either one, but at least one must stay active.

**Image search:** Enable "Use image search by default" to redirect to image search results instead of web results. When on, Ecosia uses `/images?q=` and OceanHero uses `/search?q=` (their respective image search endpoints).

## Features

- **Calm Guard toggle** — pause and resume all redirects with one tap.
- **Context menu** — right-click the extension icon to "Pause / Resume Calm Guard" without opening the popup.
- **Block current tab** — one-click button in the popup adds the active tab's domain to the block list.
- **Search engine toggles** — enable/disable Ecosia and OceanHero individually; the at-least-one rule is enforced with a friendly inline message.
- **Image search toggle** — global option to redirect to image results instead of web results.
- **Search ideas** — editable list of mindful prompts used as redirect queries.
- **Capped scrollable lists** — blocked domains and prompts lists are scrollable so the UI stays compact.

## First-install onboarding

On first install (`onInstalled` reason `install`) the extension opens `options.html`, which includes:

1. Quick usage instructions.
2. Calm Guard toggle.
3. Blocked domain editor.
4. Search engine toggles (Ecosia, OceanHero, image search).
5. Mindful prompt editor.

The same page is set as `options_page` so users can return to it from `chrome://extensions`.

## Data safety on updates

Defaults are only applied when keys are **missing** in storage.

- If a user clears `blockedDomains` to `[]`, updates keep it empty.
- If a user clears `prompts` to `[]`, updates keep it empty.
- New default prompts are appended without duplicates; existing entries are never overwritten.
- Engine toggle states and all other preferences are preserved across updates.

## File structure

| File | Purpose |
|------|---------|
| `manifest.json` | Extension manifest and permissions |
| `defaults.js` | Centralized default settings and prompt list |
| `background.js` | Service worker / event page: DNR rule sync, install/update behavior, context menu |
| `popup.html/css/js` | Material-style popup interface |
| `impact.js` | Shared impact counter logic (used by popup and options page) |
| `options.html/css/js` | Setup, instructions, and full settings page |
| `redirect.html/css/js` | Mindful holding page: picks engine & search idea, increments counter, forwards |

## Load unpacked

**Chrome:**
1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this folder.
4. Pin the extension and click it to configure blocked domains and prompts.

**Firefox:**
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on** and select `manifest.json` from this folder.

## Permissions

| Permission | Why |
|-----------|-----|
| `storage` | Save and sync settings across devices |
| `tabs` | Open onboarding tab; read active tab URL for "Block current tab"; reload tab on re-enable |
| `contextMenus` | Add "Pause / Resume Calm Guard" to the extension icon right-click menu |
| `declarativeNetRequest` | Intercept and redirect navigations to blocked domains at the network layer |
| `<all_urls>` | Required by DNR redirect rules to intercept requests for any host |
