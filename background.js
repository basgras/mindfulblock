import { DEFAULT_SETTINGS, DEFAULT_PROMPTS, hasOwn, sanitizeDomains, sanitizePrompts } from "./defaults.js";

const EXEMPT_DOMAINS = ["ecosia.org", "oceanhero.today"];
const CONTEXT_MENU_ID = "toggle-calm-guard";

async function doSyncDNRRules() {
  const stored = await chrome.storage.sync.get({ enabled: true, blockedDomains: [] });
  const enabled = Boolean(stored.enabled);

  const domains = enabled
    ? sanitizeDomains(stored.blockedDomains).filter(
        (d) => !EXEMPT_DOMAINS.some((exempt) => d === exempt || d.endsWith(`.${exempt}`))
      )
    : [];

  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existingRules.map((r) => r.id);

  const baseUrl = chrome.runtime.getURL("redirect.html");
  const addRules = domains.map((domain, index) => ({
    id: index + 1,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { url: `${baseUrl}?blocked=${encodeURIComponent(domain)}` }
    },
    condition: {
      requestDomains: [domain],
      resourceTypes: ["main_frame"]
    }
  }));

  if (removeRuleIds.length === 0 && addRules.length === 0) return;

  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
}

// Serialized wrapper: concurrent callers queue behind the in-flight sync so
// rule IDs are never computed twice against the same existing-rules snapshot.
let syncChain = Promise.resolve();
function syncDNRRules() {
  syncChain = syncChain.then(doSyncDNRRules).catch((err) => {
    console.error("Mindful Block: failed to sync DNR rules", err);
  });
  return syncChain;
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

  await syncDNRRules();

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

chrome.runtime.onStartup.addListener(() => {
  syncDNRRules();
  syncContextMenuTitle();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (changes.enabled !== undefined || changes.blockedDomains !== undefined) {
    syncDNRRules();
  }
  if (changes.enabled !== undefined) {
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

// When Calm Guard is re-enabled and the active tab is on a blocked site, the popup
// sends this message. We sync DNR rules first to ensure they're in place, then
// reload the tab so the now-active rule intercepts the navigation.
chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "redirect-tab") return;
  syncDNRRules().then(() => chrome.tabs.reload(message.tabId)).catch(() => {});
});
