"use strict";

(() => {
  window.addEventListener("message", (event) => {
    const message = event.data;
    const expectedOrigin = window.location.protocol === "file:" ? "null" : window.location.origin;
    if (event.source !== window || event.origin !== expectedOrigin ||
        !message || message.source !== "algotrack-app" ||
        message.type !== "ALGOTRACK_PROFILE_SYNC_REQUEST" ||
        typeof message.requestId !== "string" ||
        !["LeetCode", "Codeforces", "GeeksforGeeks", "HackerRank", "CodeChef"].includes(message.provider) ||
        typeof message.handle !== "string" ||
        !/^[A-Za-z0-9_.-]{1,100}$/.test(message.handle)) return;

    chrome.runtime.sendMessage({
      type: "ALGOTRACK_SYNC_PROFILE",
      provider: message.provider,
      handle: message.handle
    }, (response) => {
      const runtimeError = chrome.runtime.lastError;
      window.postMessage({
        source: "algotrack-extension",
        type: "ALGOTRACK_PROFILE_SYNC_RESPONSE",
        requestId: message.requestId,
        ok: Boolean(response && response.ok && !runtimeError),
        problems: response && response.problems,
        summary: response && response.summary,
        message: runtimeError ? runtimeError.message : response && response.message
      }, window.location.protocol === "file:" ? "*" : window.location.origin);
    });
  });

  const problemMatch = window.location.pathname.match(/^\/problems\/([a-z0-9-]+)\/?/i);
  if (!problemMatch) return;

  const problemUrl = `https://leetcode.com/problems/${problemMatch[1]}/`;
  let importPending = false;
  let importBlockedUntilReload = false;
  let lastNotice = "";

  function visible(element) {
    return element.getClientRects().length > 0 &&
      window.getComputedStyle(element).visibility !== "hidden" &&
      window.getComputedStyle(element).display !== "none";
  }

  function hasAcceptedResult() {
    const resultSelectors = [
      '[data-e2e-locator*="submission"]',
      '[role="alert"]',
      '[role="status"]',
      '[class*="text-green"]',
      '[class*="success"]'
    ];
    const resultElements = document.querySelectorAll(resultSelectors.join(","));

    for (const element of resultElements) {
      if (!visible(element)) continue;
      const text = (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim();
      if (text.length <= 180 && /^Accepted(?:\b|$)/i.test(text)) return true;
    }
    return false;
  }

  function showNotice(message, isError = false) {
    let notice = document.getElementById("algotrack-sync-notice");
    if (!notice) {
      notice = document.createElement("div");
      notice.id = "algotrack-sync-notice";
      Object.assign(notice.style, {
        position: "fixed",
        right: "20px",
        bottom: "20px",
        zIndex: "2147483647",
        maxWidth: "320px",
        padding: "12px 16px",
        borderRadius: "8px",
        background: "#202d26",
        color: "#ecf2e8",
        font: "13px/1.45 system-ui, sans-serif",
        boxShadow: "0 8px 30px #0004"
      });
      document.documentElement.append(notice);
    }
    notice.textContent = message;
    notice.style.border = isError ? "1px solid #e3a28f" : "1px solid #b7f36b";
    window.setTimeout(() => notice.remove(), 7000);
  }

  async function importAcceptedProblem() {
    if (importPending || importBlockedUntilReload || !hasAcceptedResult()) return;
    const today = new Date();
    const dateKey = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0")
    ].join("-");
    const storageKey = `algotrack-sent:${problemMatch[1]}:${dateKey}`;
    if (sessionStorage.getItem(storageKey)) return;

    importPending = true;
    const title = (document.title || problemMatch[1])
      .replace(/\s*[-|–—]\s*leetcode.*$/i, "")
      .trim()
      .slice(0, 200);
    const difficulty = document.querySelector('[class*="text-difficulty-"]')?.textContent.trim();
    try {
      const response = await chrome.runtime.sendMessage({
        type: "ALGOTRACK_IMPORT_ACCEPTED",
        problemUrl,
        title: title || problemMatch[1],
        difficulty: ["Easy", "Medium", "Hard"].includes(difficulty) ? difficulty : "Medium"
      });
      if (!response || !response.ok) {
        const message = response?.message || "AlgoTrack could not log this problem.";
        if (lastNotice !== message) showNotice(message, true);
        lastNotice = message;
        importBlockedUntilReload = true;
        return;
      }
      sessionStorage.setItem(storageKey, "true");
      showNotice(`Accepted problem sent to AlgoTrack: ${title || problemMatch[1]}`);
    } catch (error) {
      console.error("AlgoTrack extension could not send the accepted problem.", error);
      const message = "Could not contact the AlgoTrack extension. Check that it is enabled.";
      if (lastNotice !== message) showNotice(message, true);
      lastNotice = message;
      importBlockedUntilReload = true;
    } finally {
      importPending = false;
    }
  }

  const observer = new MutationObserver(importAcceptedProblem);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  importAcceptedProblem();
})();
