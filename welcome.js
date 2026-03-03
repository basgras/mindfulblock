import { DEFAULT_SETTINGS, normalizeDomain, sanitizeDomains, sanitizePrompts } from "./defaults.js";

const elements = {
  enabledToggle: document.getElementById("enabledToggle"),
  domainForm: document.getElementById("domainForm"),
  domainInput: document.getElementById("domainInput"),
  domainList: document.getElementById("domainList"),
  promptForm: document.getElementById("promptForm"),
  promptInput: document.getElementById("promptInput"),
  promptList: document.getElementById("promptList"),
  message: document.getElementById("message")
};

let state = { ...DEFAULT_SETTINGS };

function showMessage(text) {
  elements.message.textContent = text;
  window.setTimeout(() => {
    if (elements.message.textContent === text) {
      elements.message.textContent = "";
    }
  }, 1800);
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
    blockedDomains: sanitizeDomains(stored.blockedDomains),
    prompts: sanitizePrompts(stored.prompts)
  };

  elements.enabledToggle.addEventListener("change", async () => {
    state.enabled = elements.enabledToggle.checked;
    await saveState();
    showMessage(state.enabled ? "Protection enabled." : "Protection paused.");
  });

  elements.domainForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const domain = normalizeDomain(elements.domainInput.value);
    if (!domain) {
      showMessage("Enter a valid domain or URL.");
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
      showMessage("Prompt cannot be empty.");
      return;
    }

    if (state.prompts.includes(prompt)) {
      showMessage("Prompt already exists.");
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
