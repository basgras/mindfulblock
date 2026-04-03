export async function renderImpact({ treesCount, bottlesCount, shareImpact, impactInfo }) {
  const { ecosiaCount = 0, oceanCount = 0 } =
    await chrome.storage.local.get({ ecosiaCount: 0, oceanCount: 0 });

  const trees = Math.floor(ecosiaCount / 50);
  const bottles = Math.floor(oceanCount / 5);

  treesCount.textContent = trees;
  bottlesCount.textContent = bottles;
  shareImpact.hidden = trees === 0 && bottles === 0;
  impactInfo.hidden = trees === 0 && bottles === 0;
}

export function setupShareImpact(shareImpactEl, showMessageFn) {
  shareImpactEl.addEventListener("click", async () => {
    const { ecosiaCount = 0, oceanCount = 0 } =
      await chrome.storage.local.get({ ecosiaCount: 0, oceanCount: 0 });
    const trees = Math.floor(ecosiaCount / 50);
    const bottles = Math.floor(oceanCount / 5);

    if (trees === 0 && bottles === 0) return;

    let firstLine;
    if (trees > 0 && bottles > 0) {
      firstLine = `My procrastination planted ${trees} ${trees === 1 ? "tree" : "trees"} and cleaned ${bottles} ${bottles === 1 ? "bottle" : "bottles"} from the ocean so far 🌳 🐳`;
    } else if (trees > 0) {
      firstLine = `My procrastination planted ${trees} ${trees === 1 ? "tree" : "trees"} so far 🌳`;
    } else {
      firstLine = `My procrastination cleaned ${bottles} ${bottles === 1 ? "bottle" : "bottles"} from the ocean so far 🐳`;
    }

    const shareMessage = `${firstLine}\n\nImagine the impact we can have together ☀️\nhttps://mindfulblock.calmfluffy.cloud`;

    try {
      await navigator.clipboard.writeText(shareMessage);
      showMessageFn("Copied to clipboard!", "info");
    } catch {
      showMessageFn("Could not copy to clipboard.", "error");
    }
  });
}
