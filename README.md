# Mindful Block Redirect (Chrome Extension, MV3)

A Manifest V3 Chrome extension that reduces procrastination by redirecting visits to your blocked domains toward a small positive externality: a mindful search on mission-driven search engines.

## How it works

- Watches top-level navigation events via `chrome.webNavigation.onCommitted`.
- If extension is **enabled** and the destination hostname matches any blocked domain (or subdomain), it redirects the tab to a search URL.
- Redirect target is selected at random (roughly 50/50) between:
  - Ecosia: `https://www.ecosia.org/search?q=...`
  - OceanHero: `https://oceanhero.today/search?q=...`
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

## Load unpacked in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder (`mindful-block`).
5. Pin the extension and click it to configure blocked domains/prompts.

## Notes on permissions

- `storage`: save settings.
- `tabs`: block current tab and perform redirect updates.
- `webNavigation`: detect top-level navigations.
- Host access (`<all_urls>`): needed to inspect navigations broadly for blocklist matching.
