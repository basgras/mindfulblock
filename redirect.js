const ENGINE_WEB_URLS = {
  ecosia: "https://www.ecosia.org/search?q=",
  oceanhero: "https://oceanhero.today/web?q="
};

const ENGINE_IMAGE_URLS = {
  ecosia: "https://www.ecosia.org/images?q=",
  oceanhero: "https://oceanhero.today/images?q="
};

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const params = new URLSearchParams(window.location.search);
const blocked = params.get("blocked");
const messageEl = document.getElementById("message");

if (blocked && messageEl) {
  messageEl.textContent = `Redirecting from ${blocked} to a mindful search…`;
}

async function redirect() {
  const stored = await chrome.storage.sync.get({
    ecosiaEnabled: true,
    oceanHeroEnabled: true,
    imageSearchEnabled: false,
    prompts: []
  });

  const prompts = Array.isArray(stored.prompts)
    ? stored.prompts.map((p) => `${p}`.trim()).filter(Boolean)
    : [];

  if (prompts.length === 0) {
    if (messageEl) messageEl.textContent = "No search ideas found. You can close this tab.";
    return;
  }

  const engines = [];
  if (stored.ecosiaEnabled !== false) engines.push("ecosia");
  if (stored.oceanHeroEnabled !== false) engines.push("oceanhero");
  const engineKey = randomItem(engines.length > 0 ? engines : ["ecosia"]);
  const query = randomItem(prompts);
  const urlMap = stored.imageSearchEnabled ? ENGINE_IMAGE_URLS : ENGINE_WEB_URLS;
  const target = `${urlMap[engineKey]}${encodeURIComponent(query)}`;

  const counterKey = engineKey === "ecosia" ? "ecosiaCount" : "oceanCount";
  const counts = await chrome.storage.local.get({ ecosiaCount: 0, oceanCount: 0 });
  await chrome.storage.local.set({ [counterKey]: (counts[counterKey] || 0) + 1 });

  window.setTimeout(() => {
    window.location.replace(target);
  }, 450);
}

redirect().catch((err) => {
  console.error("Mindful Block: redirect failed", err);
  if (messageEl) messageEl.textContent = "Something went wrong. You can close this tab.";
});
