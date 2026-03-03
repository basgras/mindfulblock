import { DEFAULT_SETTINGS, hasOwn, sanitizeDomains, sanitizePrompts } from "./defaults.js";

const ENGINE_URLS = ["https://www.ecosia.org/search?q=", "https://oceanhero.today/web?q="];
const EXEMPT_DOMAINS = ["ecosia.org", "oceanhero.today"];

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
    blockedDomains: sanitizeDomains(stored.blockedDomains),
    prompts: sanitizePrompts(stored.prompts)
  };
}

function shouldSkipHostname(hostname) {
  return EXEMPT_DOMAINS.some((domain) => matchesDomain(hostname, domain));
}

function createMindfulSearchUrl(prompts) {
  const query = randomItem(prompts);
  const engine = randomItem(ENGINE_URLS);
  return `${engine}${encodeURIComponent(query)}`;
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

  const mindfulTarget = createMindfulSearchUrl(settings.prompts);
  const holdingUrl = createHoldingPageUrl(mindfulTarget, hostname);

  await chrome.tabs.update(details.tabId, { url: holdingUrl });
}

chrome.runtime.onInstalled.addListener(async (details) => {
  const existing = await chrome.storage.sync.get();
  const next = {
    enabled: typeof existing.enabled === "boolean" ? existing.enabled : DEFAULT_SETTINGS.enabled,
    blockedDomains: hasOwn(existing, "blockedDomains")
      ? Array.isArray(existing.blockedDomains)
        ? sanitizeDomains(existing.blockedDomains)
        : [...DEFAULT_SETTINGS.blockedDomains]
      : [...DEFAULT_SETTINGS.blockedDomains],
    prompts: hasOwn(existing, "prompts")
      ? Array.isArray(existing.prompts)
        ? sanitizePrompts(existing.prompts)
        : [...DEFAULT_SETTINGS.prompts]
      : [...DEFAULT_SETTINGS.prompts]
  };

  await chrome.storage.sync.set(next);

  if (details.reason === "install") {
    await chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
  }
});

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  maybeRedirect(details).catch((error) => {
    console.error("Mindful Block redirect failed", error);
  });
});
