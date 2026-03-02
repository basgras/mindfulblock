const params = new URLSearchParams(window.location.search);
const target = params.get("target");
const blocked = params.get("blocked");
const message = document.getElementById("message");

if (blocked && message) {
  message.textContent = `Redirecting from ${blocked} to a mindful search…`;
}

if (!target) {
  if (message) {
    message.textContent = "No target found. You can close this tab.";
  }
} else {
  window.setTimeout(() => {
    window.location.replace(target);
  }, 450);
}
