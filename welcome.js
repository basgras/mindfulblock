import { DEFAULT_SETTINGS, normalizeDomain, sanitizeDomains, sanitizePrompts } from "./defaults.js";

const REDIRECT_ENGINES = ["ecosia.org", "oceanhero.today"];

const elements = {
  enabledToggle: document.getElementById("enabledToggle"),
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

function isRedirectEngine(domain) {
  return REDIRECT_ENGINES.some(
    (engine) => domain === engine || domain.endsWith(`.${engine}`)
  );
}

async function saveState() {
  await chrome.storage.sync.set(state);
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

  elements.enabledToggle.addEventListener("change", async () => {
    state.enabled = elements.enabledToggle.checked;
    await saveState();
    showMessage(state.enabled ? "Protection enabled." : "Protection paused.", "info");
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

    state.prompts = [...state.prompts, prompt];
    elements.promptInput.value = "";
    await saveState();
    render();
  });

  render();
}

setup().catch((error) => {
  console.error("Welcome initialization failed", error);
  showMessage("Failed to load settings.");
});
