# Mindful Block Redirect (Chrome Extension, MV3)

A Manifest V3 Chrome extension that reduces procrastination by redirecting visits to your blocked domains toward a small positive externality: a mindful search on mission-driven search engines.

## How it works

- Watches top-level navigation events via `chrome.webNavigation.onBeforeNavigate`.
- If extension is **enabled** and the destination hostname matches any blocked domain (or subdomain), it interrupts the navigation before the blocked page loads.
- The tab is first sent to an extension-owned holding page (`redirect.html`) with a cute cloud + “Mindful detour” state.
- That page immediately forwards to a mindful search URL.
- Redirect target is selected at random (roughly 50/50) between:
  - Ecosia: `https://www.ecosia.org/search?q=...`
  - OceanHero: `https://oceanhero.today/web?q=...`
- Search query is randomly selected from your editable mindful prompts list.
- Redirect loops are prevented by skipping redirects when already on `ecosia.org` or `oceanhero.today` (including subdomains).

## Popup features

The popup UI lets you:

- Toggle the extension **Enabled** on/off.
- Add/remove blocked domains.
  - Accepts pasted URLs or domains.
  - Normalizes to bare hostname (e.g., `https://www.youtube.com/watch?v=...` → `youtube.com`).
  - Deduplicates entries.
- Add/remove mindful prompts.
  - Deduplicates entries.
  - Rejects empty values.
- Click **Block current tab** to quickly add the active tab's domain.

All settings are persisted in `chrome.storage.sync`.

## File structure

- `manifest.json` – extension manifest and permissions.
- `background.js` – service worker logic for navigation monitoring and redirect behavior.
- `popup.html` – popup markup.
- `popup.css` – popup styling.
- `popup.js` – popup behavior and storage updates.
- `redirect.html` – mindful holding page displayed before forwarding.
- `redirect.css` – styles for the mindful holding page.
- `redirect.js` – forwarding logic for the mindful holding page.

## Load unpacked in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder (`mindful-block`).
5. Pin the extension and click it to configure blocked domains/prompts.

## Notes on permissions

- `storage`: save settings.
- `tabs`: block current tab and perform redirect updates.
- `webNavigation`: detect top-level navigations early (`onBeforeNavigate`).
- Host access (`<all_urls>`): needed to inspect navigations broadly for blocklist matching.


