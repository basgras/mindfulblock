# Mindful Block Redirect (Chrome Extension, MV3)

A Manifest V3 Chrome extension that reduces procrastination by redirecting visits to blocked domains toward mindful searches on mission-driven search engines.

## What’s new in this build

- Fluffy cloud visual identity (light sky-blue palette) across popup and onboarding surfaces.
- Material-style popup controls and cards.
- First-install onboarding page with instructions + full settings management.
- Long list UX improvements (capped/scrollable settings lists).
- Safer update behavior that preserves intentionally empty lists.
- Shared domain/prompt sanitizing helpers used consistently across background, popup, and onboarding UIs.
- Binary-free packaging (no image assets) for PR systems that reject binary diffs.

## How it works

- Watches top-level navigation events via `chrome.webNavigation.onBeforeNavigate`.
- If extension is **enabled** and destination hostname matches a blocked domain (or subdomain), it interrupts navigation.
- The tab is sent to `redirect.html` and then forwarded to a mindful search URL.
- Redirect target is selected at random between:
  - Ecosia: `https://www.ecosia.org/search?q=...`
  - OceanHero: `https://oceanhero.today/web?q=...`
- Search query is randomly selected from your editable prompts list.
- Redirect loops are prevented for Ecosia and OceanHero domains.

## First install onboarding

On first install (`onInstalled` reason `install`) the extension opens `welcome.html` with:

1. Quick usage instructions.
2. Protection toggle.
3. Blocked domain editor.
4. Mindful prompt editor.

The same page is also set as `options_page` so users can revisit it from extension settings.

## Data safety on updates

Defaults are only applied when keys are **missing** in storage.

- If a user intentionally clears `blockedDomains` to `[]`, updates will keep it empty.
- If a user intentionally clears `prompts` to `[]`, updates will keep it empty.

This avoids silent preference resets during extension upgrades.

## File structure

- `manifest.json` – extension manifest and permissions.
- `defaults.js` – centralized default settings and prompt list.
- `background.js` – service worker logic for redirects + install/update behavior.
- `popup.html` / `popup.css` / `popup.js` – Material-like popup interface.
- `welcome.html` / `welcome.css` / `welcome.js` – onboarding + settings page.
- `redirect.html` / `redirect.css` / `redirect.js` – mindful holding page before forwarding.

## Load unpacked in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder (`mindful-block`).
5. Pin the extension and click it to configure blocked domains/prompts.

## Notes on permissions

- `storage`: save settings.
- `tabs`: open onboarding tab and perform redirect updates.
- `webNavigation`: detect top-level navigations early (`onBeforeNavigate`).
- Host access (`<all_urls>`): inspect navigations broadly for blocklist matching.
