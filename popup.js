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
  message: document.getElementById("message")
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
    showMessage("Only regular web pages can be blocked.");
    return;
  }

  const domain = normalizeDomain(tab.url);
  if (!domain) {
    showMessage("Only regular web pages can be blocked.");
    return;
  }

  if (isRedirectEngine(domain)) {
    showMessage("You can't block the redirect search engines. :-)");
    return;
  }

  if (state.blockedDomains.includes(domain)) {
    showMessage(`Already blocking ${domain}.`);
    return;
  }

  state.blockedDomains = [...state.blockedDomains, domain].sort();
  await saveState();
  render();
  showMessage(`Blocked ${domain}`, "info");
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

  // Set button label when on a regular web page (label stays "Block current tab" otherwise)
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
      // Ignore unparseable URLs — button keeps its default label
    }
  }

  elements.enabledToggle.addEventListener("change", async () => {
    state.enabled = elements.enabledToggle.checked;
    elements.hero.classList.toggle("is-paused", !state.enabled);
    elements.pausedBadge.hidden = state.enabled;
    await saveState();

    if (state.enabled) {
      // If the current tab is on a blocked domain, redirect it immediately
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
          // Ignore URL parse errors
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
      showMessage("Domain already in block list.");
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

  render();
}

setup().catch((error) => {
  console.error("Popup initialization failed", error);
  showMessage("Failed to load settings.");
});
