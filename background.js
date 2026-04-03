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
  const engines = enabledEngines.length > 0 ? enabledEngines : ["ecosia"];

  const engineKey = randomItem(engines);
  const urlMap = settings.imageSearchEnabled ? ENGINE_IMAGE_URLS : ENGINE_WEB_URLS;
  return { url: `${urlMap[engineKey]}${encodeURIComponent(query)}`, engineKey };
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

  const { url: mindfulTarget, engineKey } = createMindfulSearchUrl(settings.prompts, settings);
  const holdingUrl = createHoldingPageUrl(mindfulTarget, hostname);

  const counterKey = engineKey === "ecosia" ? "ecosiaCount" : "oceanCount";
  const counts = await chrome.storage.local.get({ ecosiaCount: 0, oceanCount: 0 });
  await chrome.storage.local.set({ [counterKey]: (counts[counterKey] || 0) + 1 });

  await chrome.tabs.update(details.tabId, { url: holdingUrl });
}

async function syncContextMenuTitle() {
  const { enabled } = await chrome.storage.sync.get({ enabled: true });
  try {
    await chrome.contextMenus.update(CONTEXT_MENU_ID, {
      title: enabled ? "Pause Calm Guard" : "Resume Calm Guard"
    });
  } catch {
  }
}

chrome.runtime.onInstalled.addListener(async (details) => {
  const existing = await chrome.storage.sync.get();
  const next = {};

  if (typeof existing.enabled !== "boolean") {
    next.enabled = DEFAULT_SETTINGS.enabled;
  }

  if (!hasOwn(existing, "blockedDomains")) {
    next.blockedDomains = [...DEFAULT_SETTINGS.blockedDomains];
  }

  if (!hasOwn(existing, "prompts") || !Array.isArray(existing.prompts)) {
    next.prompts = [...DEFAULT_SETTINGS.prompts];
    next.introducedPrompts = [...DEFAULT_PROMPTS];
  } else {
    const existingPrompts = sanitizePrompts(existing.prompts);

    if (!hasOwn(existing, "introducedPrompts") || !Array.isArray(existing.introducedPrompts)) {
      next.introducedPrompts = [...DEFAULT_PROMPTS];
    } else {
      const introducedSet = new Set(existing.introducedPrompts);
      const genuinelyNew = DEFAULT_PROMPTS.filter((p) => !introducedSet.has(p));
      if (genuinelyNew.length > 0) {
        next.prompts = [...existingPrompts, ...genuinelyNew];
        next.introducedPrompts = [...existing.introducedPrompts, ...genuinelyNew];
      }
    }
  }

  if (!hasOwn(existing, "ecosiaEnabled")) next.ecosiaEnabled = true;
  if (!hasOwn(existing, "oceanHeroEnabled")) next.oceanHeroEnabled = true;
  if (!hasOwn(existing, "imageSearchEnabled")) next.imageSearchEnabled = false;

  if (!hasOwn(existing, "welcomeSeen")) {
    next.welcomeSeen = details.reason === "install" ? false : true;
  }

  if (Object.keys(next).length > 0) {
    await chrome.storage.sync.set(next);
  }

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: "Pause Calm Guard",
      contexts: ["action"]
    });
    syncContextMenuTitle();
  });

  if (details.reason === "install") {
    await chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.enabled !== undefined) {
    const newEnabled = changes.enabled.newValue;
    chrome.contextMenus.update(CONTEXT_MENU_ID, {
      title: newEnabled ? "Pause Calm Guard" : "Resume Calm Guard"
    }).catch(() => {});
  }
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) return;
  const { enabled } = await chrome.storage.sync.get({ enabled: true });
  await chrome.storage.sync.set({ enabled: !enabled });
});

syncContextMenuTitle();

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "redirect-tab") return;
  getSettings().then(async (settings) => {
    if (settings.prompts.length === 0) return;
    const { url: mindfulTarget, engineKey } = createMindfulSearchUrl(settings.prompts, settings);
    const holdingUrl = createHoldingPageUrl(mindfulTarget, message.hostname);
    const counterKey = engineKey === "ecosia" ? "ecosiaCount" : "oceanCount";
    const counts = await chrome.storage.local.get({ ecosiaCount: 0, oceanCount: 0 });
    await chrome.storage.local.set({ [counterKey]: (counts[counterKey] || 0) + 1 });
    return chrome.tabs.update(message.tabId, { url: holdingUrl });
  }).catch((error) => {
    console.error("Mindful Block: failed to redirect tab on re-enable", error);
  });
});

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  maybeRedirect(details).catch((error) => {
    console.error("Mindful Block redirect failed", error);
  });
});
