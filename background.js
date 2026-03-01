const DEFAULT_SETTINGS = {
  enabled: true,
  blockedDomains: ["facebook.com", "x.com", "instagram.com", "youtube.com", "reddit.com"],
  prompts: [
    "5 minute breathing exercise",
    "quick gratitude journaling prompt",
    "short walk benefits",
    "one small act of kindness today",
    "how to refocus in 2 minutes"
  ]
};

const ENGINE_URLS = [
  "https://www.ecosia.org/search?q=",
  "https://oceanhero.today/web?q="
];

const EXEMPT_DOMAINS = ["ecosia.org", "oceanhero.today"];

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function normalizeDomain(input) {
  const value = (input || "").trim().toLowerCase();
  if (!value) {
    return "";
  }

  const parsedValue = value.includes("://") ? value : `https://${value}`;

  try {
    const url = new URL(parsedValue);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function matchesDomain(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

async function getSettings() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return {
    enabled: Boolean(stored.enabled),
    blockedDomains: Array.isArray(stored.blockedDomains)
      ? stored.blockedDomains.map(normalizeDomain).filter(Boolean)
      : [],
    prompts: Array.isArray(stored.prompts)
      ? stored.prompts.map((prompt) => `${prompt}`.trim()).filter(Boolean)
      : []
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

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  const next = {
    enabled: typeof existing.enabled === "boolean" ? existing.enabled : DEFAULT_SETTINGS.enabled,
    blockedDomains:
      Array.isArray(existing.blockedDomains) && existing.blockedDomains.length > 0
        ? [...new Set(existing.blockedDomains.map(normalizeDomain).filter(Boolean))]
        : DEFAULT_SETTINGS.blockedDomains,
    prompts:
      Array.isArray(existing.prompts) && existing.prompts.length > 0
        ? [...new Set(existing.prompts.map((item) => `${item}`.trim()).filter(Boolean))]
        : DEFAULT_SETTINGS.prompts
  };

  await chrome.storage.sync.set(next);
});

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  maybeRedirect(details).catch((error) => {
    console.error("Mindful Block redirect failed", error);
  });
});
