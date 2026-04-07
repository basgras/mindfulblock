# Changelog

All notable changes to Mindful Block are documented here, grouped by version.

---

## [1.2.0] — 2026-04-07

This update introduces an impact counter so you can see how many trees have been planted and how much plastic has been removed from the ocean — right in your popup. The setup page was also redesigned to be clearer and easier to navigate.

### Added
- Impact counter — tracks your total redirects and shows Ecosia trees planted and OceanHero bottles removed
- Share button to share your impact
- Info icon with tooltip explaining the impact metrics

### Changed
- Setup page redesigned: Quick Start instructions always visible, cleaner layout with section dividers

### Fixed
- Share button hidden by CSS (was never appearing)
- Share button incorrectly hidden when counters were at zero

---

## [1.1.0] — 2026-04-02

Mindful Block now gently asks for a review after you've been using it for a while — your feedback really helps. We also renamed the extension to make it easier to find in the Chrome Web Store, and added a help link on the setup page.

### Added
- Review nudge — a dismissible strip in the popup that occasionally invites you to leave a review
- Help link in the setup page footer

### Changed
- Extension renamed to "Mindful Block: Block Sites & Plant Trees" in the Chrome Web Store listing

### Fixed
- Review link not opening correctly (switched from `window.open` to `chrome.tabs.create`)
- Review nudge dismiss state not persisting between sessions

---

## [1.0] — 2026-03-08

The first release of Mindful Block. Visit a distracting site and instead of doom-scrolling, you're gently redirected to Ecosia or OceanHero with one of your own Search ideas. Every search plants a tree or removes plastic from the ocean.

### Added
- Block sites you want to avoid — visits are silently redirected to a mindful search instead
- Ecosia and OceanHero as redirect search engines (randomly selected)
- Popup with Calm Guard on/off toggle, Sites to avoid list, Search ideas list, and Search engines section
- Image search toggle — redirect to image results instead of web results
- Context menu shortcut to pause and resume Calm Guard
- Setup/onboarding page with Quick Start instructions
- Toast notifications for validation errors and confirmations
- Prompt migration guard — updating the extension never silently restores Search ideas you intentionally deleted
- Warm brand voice, Nunito + Source Sans 3 typography, flat card visual style
