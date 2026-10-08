"use strict";

const appUrlInput = document.querySelector("#app-url");
const saveButton = document.querySelector("#save");
const status = document.querySelector("#status");
const APP_URL_KEY = "algotrackAppUrl";

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function validAppUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:", "file:"].includes(url.protocol);
  } catch {
    return false;
  }
}

chrome.storage.sync.get(APP_URL_KEY, (settings) => {
  if (chrome.runtime.lastError) {
    setStatus("Could not load the saved page URL.", true);
    return;
  }
  appUrlInput.value = settings[APP_URL_KEY] || "";
});

saveButton.addEventListener("click", () => {
  const appUrl = appUrlInput.value.trim();
  if (!validAppUrl(appUrl)) {
    setStatus("Enter a valid HTTP, HTTPS, or file URL for AlgoTrack.", true);
    appUrlInput.focus();
    return;
  }
  chrome.storage.sync.set({ [APP_URL_KEY]: appUrl }, () => {
    if (chrome.runtime.lastError) {
      setStatus("Could not save the page URL.", true);
      return;
    }
    setStatus("Saved. Accepted problems will be sent to this page.");
  });
});
