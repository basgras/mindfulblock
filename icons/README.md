# Icons

Place the following files in this folder before publishing the extension:

- `icon-16.png` — 16×16px, transparent background recommended
- `icon-32.png` — 32×32px, transparent background recommended
- `icon-48.png` — 48×48px, transparent background recommended
- `icon-128.png` — 128×128px, transparent background recommended

All files should be square PNGs. These are referenced by `manifest.json` for the
extension icon (shown in chrome://extensions and the Chrome Web Store) and the
toolbar action button (`default_icon`).

The `<img id="app-icon">` in `popup.html` and `welcome.html` also points to
`icons/icon-128.png`.

Bas will supply the final artwork. Until then the extension loads but shows a
broken-image placeholder where the icon would appear.
