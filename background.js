import { DEFAULT_SETTINGS, DEFAULT_PROMPTS, hasOwn, sanitizeDomains, sanitizePrompts } from "./defaults.js";

const ENGINE_WEB_URLS = {
  ecosia: "https://www.ecosia.org/search?q=",
  oceanhero: "https://oceanhero.today/web?q="
};

const ENGINE_IMAGE_URLS = {
  ecosia: "https://www.ecosia.org/images?q=",
  oceanhero: "https://oceanhero.today/images?q="
};

const EXEMPT_DOMAINS = ["ecosia.org", "oceanhero.today"];

const CONTEXT_MENU_ID = "toggle-calm-guard";

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function matchesDomain(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

async function getSettings() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return {
    enabled: Boolean(stored.enabled),
    ecosiaEnabled: stored.ecosiaEnabled !== false,
    oceanHeroEnabled: stored.oceanHeroEnabled !== false,
    imageSearchEnabled: Boolean(stored.imageSearchEnabled),
    blockedDomains: sanitizeDomains(stored.blockedDomains),
    prompts: sanitizePrompts(stored.prompts)
  };
}

function shouldSkipHostname(hostname) {
  return EXEMPT_DOMAINS.some((domain) => matchesDomain(hostname, domain));
}

function createMindfulSearchUrl(prompts, settings) {
  const query = randomItem(prompts);

  const enabledEngines = [];
  if (settings.ecosiaEnabled) enabledEngines.push("ecosia");
  if (settings.oceanHeroEnabled) enabledEngines.push("oceanhero");
  // Fallback: if somehow both are disabled, use ecosia
  const engines = enabledEngines.length > 0 ? enabledEngines : ["ecosia"];

  const engineKey = randomItem(engines);
  const urlMap = settings.imageSearchEnabled ? ENGINE_IMAGE_URLS : ENGINE_WEB_URLS;
  return `${urlMap[engineKey]}${encodeURIComponent(query)}`;
}

function createHoldingPageUrl(targetUrl, blockedHostname) {
  const params = new URLSearchParams({
    target: targetUrl,
    blocked: blockedHostname
  });
  return `${chrome.runtime.getURL("redirect.html")}?${params.toString()}`;
}

async function maybeRedirect(details) {
  if (details.frameId !== 0 || details.tabId < 0) {
    return;
  }

  let destination;
  try {
    destination = new URL(details.url);
  } catch {
    return;
  }

  if (!["http:", "https:"].includes(destination.protocol)) {
    return;
  }

  const hostname = destination.hostname.toLowerCase();
  if (shouldSkipHostname(hostname)) {
    return;
  }

  const settings = await getSettings();
  if (!settings.enabled || settings.blockedDomains.length === 0 || settings.prompts.length === 0) {
    return;
  }

  const isBlocked = settings.blockedDomains.some((domain) => matchesDomain(hostname, domain));
  if (!isBlocked) {
    return;
  }

  const mindfulTarget = createMindfulSearchUrl(settings.prompts, settings);
  const holdingUrl = createHoldingPageUrl(mindfulTarget, hostname);

  await chrome.tabs.update(details.tabId, { url: holdingUrl });
}

// Sync context menu title with current enabled state
async function syncContextMenuTitle() {
  const { enabled } = await chrome.storage.sync.get({ enabled: true });
  try {
    await chrome.contextMenus.update(CONTEXT_MENU_ID, {
      title: enabled ? "Pause Calm Guard" : "Resume Calm Guard"
    });
  } catch {
    // Menu item doesn't exist yet — will be created in onInstalled
  }
}

// On install/update: initialize only missing settings, append new default prompts
chrome.runtime.onInstalled.addListener(async (details) => {
  const existing = await chrome.storage.sync.get();
  const next = {};

  // Only set enabled if not already stored
  if (typeof existing.enabled !== "boolean") {
    next.enabled = DEFAULT_SETTINGS.enabled;
  }

  // Only set blockedDomains if never initialized — never overwrite on update
  if (!hasOwn(existing, "blockedDomains")) {
    next.blockedDomains = [...DEFAULT_SETTINGS.blockedDomains];
  }

  // Prompts: initialize if missing, or append only genuinely new default prompts
  // introducedPrompts tracks which defaults have ever been auto-added, so deleted prompts
  // are never silently restored on future updates.
  if (!hasOwn(existing, "prompts") || !Array.isArray(existing.prompts)) {
    // Fresh install — seed both the user list and introducedPrompts with all defaults
    next.prompts = [...DEFAULT_SETTINGS.prompts];
    next.introducedPrompts = [...DEFAULT_PROMPTS];
  } else {
    const existingPrompts = sanitizePrompts(existing.prompts);

    if (!hasOwn(existing, "introducedPrompts") || !Array.isArray(existing.introducedPrompts)) {
      // Existing install that predates introducedPrompts — register all current defaults
      // as already introduced so they are never re-added. Do not touch the user's list.
      next.introducedPrompts = [...DEFAULT_PROMPTS];
    } else {
      // Normal update — only add prompts that have never been introduced before
      const introducedSet = new Set(existing.introducedPrompts);
      const genuinelyNew = DEFAULT_PROMPTS.filter((p) => !introducedSet.has(p));
      if (genuinelyNew.length > 0) {
        next.prompts = [...existingPrompts, ...genuinelyNew];
        next.introducedPrompts = [...existing.introducedPrompts, ...genuinelyNew];
      }
    }
  }

  // Engine toggles and image search: only set if never stored before
  if (!hasOwn(existing, "ecosiaEnabled")) next.ecosiaEnabled = true;
  if (!hasOwn(existing, "oceanHeroEnabled")) next.oceanHeroEnabled = true;
  if (!hasOwn(existing, "imageSearchEnabled")) next.imageSearchEnabled = false;

  // welcomeSeen: false on fresh install so the welcome page shows onboarding;
  // true for existing users upgrading from a version before this flag existed.
  if (!hasOwn(existing, "welcomeSeen")) {
    next.welcomeSeen = details.reason === "install" ? false : true;
  }

  if (Object.keys(next).length > 0) {
    await chrome.storage.sync.set(next);
  }

  // Create context menu (remove stale items first)
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: "Pause Calm Guard",
      contexts: ["action"]
    });
    syncContextMenuTitle();
  });

  if (details.reason === "install") {
    await chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
  }
});

// Keep context menu title in sync when enabled state changes from any source
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.enabled !== undefined) {
    const newEnabled = changes.enabled.newValue;
    chrome.contextMenus.update(CONTEXT_MENU_ID, {
      title: newEnabled ? "Pause Calm Guard" : "Resume Calm Guard"
    }).catch(() => {});
  }
});

// Toggle enabled state when context menu item is clicked
chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) return;
  const { enabled } = await chrome.storage.sync.get({ enabled: true });
  await chrome.storage.sync.set({ enabled: !enabled });
  // storage.onChanged listener above will update the title
});

// Sync context menu title on every service worker start
syncContextMenuTitle();

// Redirect a specific tab on demand (e.g. when Calm Guard is re-enabled from the popup)
chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "redirect-tab") return;
  getSettings().then((settings) => {
    if (settings.prompts.length === 0) return;
    const mindfulTarget = createMindfulSearchUrl(settings.prompts, settings);
    const holdingUrl = createHoldingPageUrl(mindfulTarget, message.hostname);
    return chrome.tabs.update(message.tabId, { url: holdingUrl });
  }).catch((error) => {
    console.error("Mindful Block: failed to redirect tab on re-enable", error);
  });
});

// Main redirect listener
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  maybeRedirect(details).catch((error) => {
    console.error("Mindful Block redirect failed", error);
  });
});
