import { DEFAULT_SETTINGS, normalizeDomain, sanitizeDomains, sanitizePrompts } from "./defaults.js";

const REDIRECT_ENGINES = ["ecosia.org", "oceanhero.today"];

const elements = {
  hero: document.getElementById("hero"),
  pausedBadge: document.getElementById("paused-badge"),
  enabledToggle: document.getElementById("enabledToggle"),
  blockCurrentTab: document.getElementById("blockCurrentTab"),
  domainForm: document.getElementById("domainForm"),
  domainInput: document.getElementById("domainInput"),
  domainList: document.getElementById("domainList"),
  toggleEcosia: document.getElementById("toggle-ecosia"),
  toggleOceanHero: document.getElementById("toggle-oceanhero"),
  toggleImageSearch: document.getElementById("toggle-image-search"),
  promptForm: document.getElementById("promptForm"),
  promptInput: document.getElementById("promptInput"),
  promptList: document.getElementById("promptList"),
  message: document.getElementById("message"),
  reviewNudge: document.getElementById("review-nudge"),
  reviewLink: document.getElementById("review-link"),
  reviewDismiss: document.getElementById("review-dismiss"),
  impactMetrics: document.getElementById("impact-metrics"),
  impactTrees: document.getElementById("impact-trees"),
  impactBottles: document.getElementById("impact-bottles"),
  treesCount: document.getElementById("trees-count"),
  bottlesCount: document.getElementById("bottles-count"),
  impactPlaceholder: document.getElementById("impact-placeholder"),
  shareImpact: document.getElementById("shareImpact")
};

let state = { ...DEFAULT_SETTINGS };

function showMessage(text, type = "error") {
  elements.message.textContent = text;
  elements.message.dataset.type = type;
  elements.message.classList.add("visible");
  window.setTimeout(() => {
    if (elements.message.textContent === text) {
      elements.message.textContent = "";
      elements.message.classList.remove("visible");
    }
  }, 3000);
}

async function saveState() {
  await chrome.storage.sync.set(state);
}

function isRedirectEngine(domain) {
  return REDIRECT_ENGINES.some(
    (engine) => domain === engine || domain.endsWith(`.${engine}`)
  );
}

function renderList(listElement, values, onRemove) {
  listElement.innerHTML = "";

  values.forEach((value) => {
    const item = document.createElement("li");
    const text = document.createElement("span");
    text.textContent = value;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.className = "remove-button";
    removeButton.addEventListener("click", () => onRemove(value));

    item.append(text, removeButton);
    listElement.appendChild(item);
  });
}

function render() {
  elements.hero.classList.toggle("is-paused", !state.enabled);
  elements.pausedBadge.hidden = state.enabled;
  elements.enabledToggle.checked = state.enabled;
  elements.toggleEcosia.checked = state.ecosiaEnabled;
  elements.toggleOceanHero.checked = state.oceanHeroEnabled;
  elements.toggleImageSearch.checked = state.imageSearchEnabled;

  renderList(elements.domainList, state.blockedDomains, async (value) => {
    state.blockedDomains = state.blockedDomains.filter((domain) => domain !== value);
    await saveState();
    render();
  });

  renderList(elements.promptList, state.prompts, async (value) => {
    state.prompts = state.prompts.filter((prompt) => prompt !== value);
    await saveState();
    render();
  });
}

async function addCurrentTabDomain() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  let tabUrl;
  try {
    tabUrl = tab?.url ? new URL(tab.url) : null;
  } catch {
    tabUrl = null;
  }

  if (!tabUrl || !["http:", "https:"].includes(tabUrl.protocol)) {
    showMessage("Only regular web sites can be blocked.");
    return;
  }

  const domain = normalizeDomain(tab.url);
  if (!domain) {
    showMessage("Only regular web sites can be blocked.");
    return;
  }

  if (isRedirectEngine(domain)) {
    showMessage("You can't block the redirect search engines. :-)");
    return;
  }

  if (state.blockedDomains.includes(domain)) {
    showMessage(`Already blocking ${domain}. :-)`);
    return;
  }

  state.blockedDomains = [...state.blockedDomains, domain].sort();
  await saveState();
  render();
  showMessage(`Blocked ${domain}`, "info");
}

async function setupReviewNudge(blockedDomainsCount) {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const stored = await chrome.storage.local.get("reviewNudge");
  let nudge = stored.reviewNudge || {};
  const now = Date.now();

  if (!nudge.installDate) {
    nudge.installDate = now;
    await chrome.storage.local.set({ reviewNudge: nudge });
  }

  if (nudge.reviewClicked) return;
  if (blockedDomainsCount < 1) return;
  if (now - nudge.installDate < ONE_DAY) return;
  if (nudge.nextShowDate && now < nudge.nextShowDate) return;

  elements.reviewNudge.hidden = false;

  elements.reviewDismiss.addEventListener("click", async () => {
    elements.reviewNudge.hidden = true;
    const dismissCount = (nudge.dismissCount || 0) + 1;
    const delay = dismissCount === 1 ? 7 * ONE_DAY : 30 * ONE_DAY;
    nudge = { ...nudge, dismissCount, nextShowDate: now + delay };
    await chrome.storage.local.set({ reviewNudge: nudge });
  });

  elements.reviewLink.addEventListener("click", async (e) => {
    e.preventDefault();
    const href = e.currentTarget.href;
    try {
      nudge = { ...nudge, reviewClicked: true };
      await chrome.storage.local.set({ reviewNudge: nudge });
      chrome.tabs.create({ url: href });
    } catch (err) {
      console.error("Mindful Block: failed to save review click or open review tab.", err);
    }
  });
}

async function renderImpact() {
  const { ecosiaCount = 0, oceanCount = 0 } =
    await chrome.storage.local.get({ ecosiaCount: 0, oceanCount: 0 });

  const trees = Math.floor(ecosiaCount / 50);
  const bottles = Math.floor(oceanCount / 5);
  const anyWholeImpact = trees > 0 || bottles > 0;

  elements.impactTrees.hidden = ecosiaCount === 0;
  elements.treesCount.textContent = trees;
  elements.impactBottles.hidden = oceanCount === 0;
  elements.bottlesCount.textContent = bottles;
  elements.impactPlaceholder.hidden = anyWholeImpact;
  elements.impactMetrics.hidden = !anyWholeImpact;
  elements.shareImpact.hidden = !anyWholeImpact;
}

async function setup() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  state = {
    enabled: Boolean(stored.enabled),
    ecosiaEnabled: stored.ecosiaEnabled !== false,
    oceanHeroEnabled: stored.oceanHeroEnabled !== false,
    imageSearchEnabled: Boolean(stored.imageSearchEnabled),
    blockedDomains: sanitizeDomains(stored.blockedDomains),
    prompts: sanitizePrompts(stored.prompts)
  };

  await setupReviewNudge(state.blockedDomains.length);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    try {
      const tabUrl = new URL(tab.url);
      if (["http:", "https:"].includes(tabUrl.protocol)) {
        const domain = normalizeDomain(tab.url);
        if (domain) {
          elements.blockCurrentTab.textContent = `Block ${domain}`;
          elements.blockCurrentTab.title = domain;
        }
      }
    } catch {
    }
  }

  elements.enabledToggle.addEventListener("change", async () => {
    state.enabled = elements.enabledToggle.checked;
    elements.hero.classList.toggle("is-paused", !state.enabled);
    elements.pausedBadge.hidden = state.enabled;
    await saveState();

    if (state.enabled) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab?.url) {
        try {
          const { hostname } = new URL(activeTab.url);
          const h = hostname.toLowerCase();
          const isBlocked = state.blockedDomains.some(
            (d) => h === d || h.endsWith(`.${d}`)
          );
          if (isBlocked) {
            chrome.runtime.sendMessage({
              type: "redirect-tab",
              tabId: activeTab.id,
              hostname: h
            }).catch(() => {});
          }
        } catch {
        }
      }
    }
  });

  elements.blockCurrentTab.addEventListener("click", () => {
    addCurrentTabDomain().catch((error) => {
      console.error(error);
      showMessage("Could not block current tab.");
    });
  });

  elements.toggleEcosia.addEventListener("change", async () => {
    const nextEcosia = elements.toggleEcosia.checked;
    if (!nextEcosia && !state.oceanHeroEnabled) {
      elements.toggleEcosia.checked = true;
      showMessage("At least one search engine must be active. :-)");
      return;
    }
    state.ecosiaEnabled = nextEcosia;
    await saveState();
  });

  elements.toggleOceanHero.addEventListener("change", async () => {
    const nextOceanHero = elements.toggleOceanHero.checked;
    if (!nextOceanHero && !state.ecosiaEnabled) {
      elements.toggleOceanHero.checked = true;
      showMessage("At least one search engine must be active. :-)");
      return;
    }
    state.oceanHeroEnabled = nextOceanHero;
    await saveState();
  });

  elements.toggleImageSearch.addEventListener("change", async () => {
    state.imageSearchEnabled = elements.toggleImageSearch.checked;
    await saveState();
  });

  elements.domainForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const domain = normalizeDomain(elements.domainInput.value);
    if (!domain) {
      showMessage("Enter a valid domain or URL.");
      return;
    }

    if (isRedirectEngine(domain)) {
      showMessage("You can't block the redirect search engines. :-)");
      return;
    }

    if (state.blockedDomains.includes(domain)) {
      showMessage("Domain already in block list. :-)");
      return;
    }

    state.blockedDomains = [...state.blockedDomains, domain].sort();
    elements.domainInput.value = "";
    await saveState();
    render();
  });

  elements.promptForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const prompt = elements.promptInput.value.trim();

    if (!prompt) {
      showMessage("Search idea cannot be empty.");
      return;
    }

    if (state.prompts.includes(prompt)) {
      showMessage("Search idea already exists.");
      return;
    }

    state.prompts = [prompt, ...state.prompts];
    elements.promptInput.value = "";
    await saveState();
    render();
  });

  elements.shareImpact.addEventListener("click", async () => {
    const { ecosiaCount = 0, oceanCount = 0 } =
      await chrome.storage.local.get({ ecosiaCount: 0, oceanCount: 0 });
    const trees = Math.floor(ecosiaCount / 50);
    const bottles = Math.floor(oceanCount / 5);

    let firstLine;
    if (trees > 0 && bottles > 0) {
      firstLine = `My procrastination planted ${trees} ${trees === 1 ? "tree" : "trees"} and cleaned ${bottles} ${bottles === 1 ? "bottle" : "bottles"} from the ocean so far 🌳 🐳`;
    } else if (trees > 0) {
      firstLine = `My procrastination planted ${trees} ${trees === 1 ? "tree" : "trees"} so far 🌳`;
    } else {
      firstLine = `My procrastination cleaned ${bottles} ${bottles === 1 ? "bottle" : "bottles"} from the ocean so far 🐳`;
    }

    const shareMessage = `${firstLine}\n\nImagine the impact we can have together\nhttps://mindfulblock.calmfluffy.cloud ☀`;

    try {
      await navigator.clipboard.writeText(shareMessage);
      showMessage("Copied to clipboard!", "info");
    } catch {
      showMessage("Could not copy to clipboard.", "error");
    }
  });

  await renderImpact();
  render();
}

setup().catch((error) => {
  console.error("Popup initialization failed", error);
  showMessage("Failed to load settings.");
});
