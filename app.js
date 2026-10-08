"use strict";

const STORAGE_KEY = "algotrack-dsa-progress-v1";
const CUSTOM_PLATFORMS_KEY = "algotrack-custom-platforms-v1";
const PROFILE_LINKS_KEY = "algotrack-platform-profiles-v1";
const TARGET_PROBLEMS = 75;
const BUILT_IN_PLATFORMS = ["LeetCode", "GeeksforGeeks", "Codeforces", "HackerRank"];
let customPlatforms = [];
const TOPICS = [
  "Arrays & Hashing",
  "Two Pointers",
  "Sliding Window",
  "Stack",
  "Binary Search",
  "Linked List",
  "Trees",
  "Graphs",
  "Dynamic Programming",
  "Greedy",
  "Backtracking",
  "Heap / Priority Queue",
  "Intervals",
  "Math & Geometry",
  "Bit Manipulation",
  "Uncategorized"
];
const SEED_PROBLEMS = [
  { id: "seed-1", name: "Contains Duplicate", platform: "LeetCode", problemUrl: "https://leetcode.com/problems/contains-duplicate/", topic: "Arrays & Hashing", difficulty: "Easy", date: dateOffset(-6), time: 12, note: "A set makes duplicate checks constant time." },
  { id: "seed-2", name: "Valid Anagram", platform: "LeetCode", problemUrl: "https://leetcode.com/problems/valid-anagram/", topic: "Arrays & Hashing", difficulty: "Easy", date: dateOffset(-5), time: 18, note: "Frequency counts keep the comparison linear." },
  { id: "seed-3", name: "Valid Parentheses", platform: "LeetCode", problemUrl: "https://leetcode.com/problems/valid-parentheses/", topic: "Stack", difficulty: "Easy", date: dateOffset(-4), time: 21, note: "Last opened bracket must close first." },
  { id: "seed-4", name: "Best Time to Buy and Sell Stock", platform: "LeetCode", problemUrl: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/", topic: "Sliding Window", difficulty: "Easy", date: dateOffset(-3), time: 24, note: "Track the minimum price seen so far." },
  { id: "seed-5", name: "Binary Search", platform: "LeetCode", problemUrl: "https://leetcode.com/problems/binary-search/", topic: "Binary Search", difficulty: "Easy", date: dateOffset(-2), time: 16, note: "Keep the search interval invariant clear." },
  { id: "seed-6", name: "Two Sum", platform: "LeetCode", problemUrl: "https://leetcode.com/problems/two-sum/", topic: "Arrays & Hashing", difficulty: "Easy", date: dateOffset(-1), time: 10, note: "Store complements as you scan once." }
];

function dateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function allPlatformNames() {
  return [...BUILT_IN_PLATFORMS, ...customPlatforms.map((platform) => platform.name)];
}

function inferPlatformNameFromHostname(hostname) {
  const cleaned = hostname.replace(/^www\./, "").split(".").filter(Boolean);
  if (cleaned.length === 0) return "Other Platform";
  const base = cleaned[0];
  return base
    .split(/[-_]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ") || "Other Platform";
}

function inferPlatformFromUrl(problemUrl) {
  try {
    const url = new URL(problemUrl);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (!hostname || !hostname.includes(".")) return "Other Platform";

    if (hostname.includes("leetcode.com")) return "LeetCode";
    if (hostname.includes("geeksforgeeks.org")) return "GeeksforGeeks";
    if (hostname.includes("codeforces.com")) return "Codeforces";
    if (hostname.includes("hackerrank.com")) return "HackerRank";

    const customMatch = customPlatforms.find((platform) => hostname === platform.hostname || hostname.endsWith(`.${platform.hostname}`) || platform.hostname.endsWith(`.${hostname}`));
    if (customMatch) return customMatch.name;

    return inferPlatformNameFromHostname(hostname);
  } catch {
    return "Other Platform";
  }
}

function rememberCustomPlatformForUrl(problemUrl) {
  try {
    const url = new URL(problemUrl);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (!hostname || !hostname.includes(".")) return false;
    const normalizedName = inferPlatformFromUrl(problemUrl);
    if (allPlatformNames().includes(normalizedName)) return true;

    const existing = customPlatforms.find((platform) => platform.hostname === hostname || hostname.endsWith(`.${platform.hostname}`) || platform.hostname.endsWith(`.${hostname}`));
    if (existing) return true;

    const platform = { name: normalizedName, hostname };
    customPlatforms.push(platform);
    localStorage.setItem(CUSTOM_PLATFORMS_KEY, JSON.stringify(customPlatforms));
    return true;
  } catch {
    return false;
  }
}

function loadCustomPlatforms() {
  const stored = localStorage.getItem(CUSTOM_PLATFORMS_KEY);
  if (stored === null) return [];
  const parsed = JSON.parse(stored);
  if (!Array.isArray(parsed) || !parsed.every((platform) =>
    platform &&
    typeof platform.name === "string" &&
    platform.name.trim() === platform.name &&
    platform.name.length <= 40 &&
    typeof platform.hostname === "string" &&
    /^[a-z0-9.-]+$/i.test(platform.hostname) &&
    !BUILT_IN_PLATFORMS.some((name) => name.toLowerCase() === platform.name.toLowerCase())
  )) {
    throw new Error("Saved custom platforms have an unsupported format.");
  }
  const names = parsed.map((platform) => platform.name.toLowerCase());
  const hosts = parsed.map((platform) => platform.hostname.toLowerCase());
  if (new Set(names).size !== names.length || new Set(hosts).size !== hosts.length) {
    throw new Error("Saved custom platforms contain duplicates.");
  }
  return parsed;
}

function normalizeProfileUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".")) return null;
    return url.href;
  } catch {
    return null;
  }
}

function loadProfileLinks() {
  const stored = localStorage.getItem(PROFILE_LINKS_KEY);
  if (stored === null) return [];
  const parsed = JSON.parse(stored);
  if (!Array.isArray(parsed) || !parsed.every((profile) =>
    profile &&
    typeof profile.id === "string" &&
    profile.id.length > 0 &&
    typeof profile.name === "string" &&
    profile.name.trim() === profile.name &&
    profile.name.length > 0 &&
    profile.name.length <= 40 &&
    typeof profile.url === "string" &&
    normalizeProfileUrl(profile.url) === profile.url
  )) {
    throw new Error("Saved platform profiles have an unsupported format.");
  }
  const ids = parsed.map((profile) => profile.id);
  const urls = parsed.map((profile) => profile.url);
  if (new Set(ids).size !== ids.length || new Set(urls).size !== urls.length) {
    throw new Error("Saved platform profiles contain duplicates.");
  }
  return parsed;
}

function platformHostname(platformName) {
  const customPlatform = customPlatforms.find((platform) => platform.name === platformName);
  return customPlatform ? customPlatform.hostname : "";
}

function isValidProblemUrl(problemUrl, platform) {
  if (!problemUrl) return true;
  try {
    const url = new URL(problemUrl);
    if (url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (!hostname || !hostname.includes(".")) return false;

    const allowedHosts = {
      LeetCode: ["leetcode.com", "www.leetcode.com"],
      GeeksforGeeks: ["geeksforgeeks.org", "www.geeksforgeeks.org"],
      Codeforces: ["codeforces.com", "www.codeforces.com"],
      HackerRank: ["hackerrank.com", "www.hackerrank.com"]
    };
    if (Object.prototype.hasOwnProperty.call(allowedHosts, platform)) return allowedHosts[platform].includes(url.hostname);

    const customHostname = platformHostname(platform);
    if (customHostname) return hostname === customHostname || hostname.endsWith(`.${customHostname}`) || customHostname.endsWith(`.${hostname}`);

    return true;
  } catch {
    return false;
  }
}

function validProblem(problem) {
  return Boolean(
    problem &&
    typeof problem.id === "string" &&
    typeof problem.name === "string" &&
    (problem.platform === undefined || typeof problem.platform === "string") &&
    (problem.problemUrl === undefined || (typeof problem.problemUrl === "string" && isValidProblemUrl(problem.problemUrl, problem.platform || "LeetCode"))) &&
    (problem.sourceId === undefined || typeof problem.sourceId === "string") &&
    typeof problem.topic === "string" &&
    TOPICS.includes(problem.topic) &&
    ["Easy", "Medium", "Hard"].includes(problem.difficulty) &&
    (problem.date === "" || /^\d{4}-\d{2}-\d{2}$/.test(problem.date)) &&
    Number.isFinite(Number(problem.time)) &&
    typeof problem.note === "string"
  );
}

function loadProblems() {
  const storageKeys = [STORAGE_KEY];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && key.startsWith(`${STORAGE_KEY}:`)) storageKeys.push(key);
  }
  storageKeys.sort();

  const problems = [];
  const usedIds = new Set();
  const seenProblems = new Set();
  for (const key of storageKeys) {
    const stored = localStorage.getItem(key);
    if (stored === null) continue;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.every(validProblem)) {
      throw new Error("Saved progress has an unsupported format.");
    }
    for (const savedProblem of parsed) {
      const problem = { ...savedProblem, platform: savedProblem.platform || "LeetCode" };
      const seededProblem = SEED_PROBLEMS.find((seedProblem) => seedProblem.id === problem.id);
      if (!problem.problemUrl && seededProblem) problem.problemUrl = seededProblem.problemUrl;
      const fingerprint = JSON.stringify(problem);
      if (seenProblems.has(fingerprint)) continue;
      seenProblems.add(fingerprint);
      const originalId = problem.id;
      let suffix = 0;
      while (usedIds.has(problem.id)) {
        suffix += 1;
        problem.id = `${key}:${originalId}:${suffix}`;
      }
      usedIds.add(problem.id);
      problems.push(problem);
    }
  }

  const loadedProblems = problems.length ? problems : [...SEED_PROBLEMS];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loadedProblems));
  for (const key of storageKeys) {
    if (key !== STORAGE_KEY) localStorage.removeItem(key);
  }
  return loadedProblems;
}

const state = {
  problems: [],
  profileLinks: [],
  syncingProfileIds: new Set(),
  profileSyncMessages: new Map(),
  topicFilter: "all",
  difficultyFilter: "all"
};
const $ = (selector) => document.querySelector(selector);
const elements = {
  total: $("#solved-total"),
  weekly: $("#solved-this-week"),
  streak: $("#streak-total"),
  easy: $("#easy-count"),
  medium: $("#medium-count"),
  hard: $("#hard-count"),
  streakDots: $("#streak-dots"),
  planBar: $("#plan-progress-bar"),
  planText: $("#plan-progress-text"),
  topicList: $("#topic-list"),
  activity: $("#activity-chart"),
  activityCount: $("#activity-count"),
  weekInsight: $("#week-insight"),
  weekProblemCount: $("#week-problem-count"),
  weekProblemList: $("#week-problem-list"),
  monthProblemCount: $("#month-problem-count"),
  monthProblemList: $("#month-problem-list"),
  table: $("#problem-table"),
  profileCards: $("#profile-cards"),
  entryCount: $("#entry-count"),
  empty: $("#empty-state"),
  noResults: $("#no-filter-results"),
  topicFilter: $("#topic-filter"),
  difficultyFilter: $("#difficulty-filter"),
  coachInsight: $("#coach-insight"),
  todayDate: $("#today-date"),
  dialog: $("#problem-dialog"),
  form: $("#problem-form"),
  platform: $("#problem-platform"),
  addPlatformPanel: $("#add-platform-panel"),
  toast: $("#toast")
};

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.problems));
    return true;
  } catch (error) {
    console.error("Could not save DSA progress.", error);
    showToast("Progress couldn’t be saved to this device.");
    return false;
  }
}

function sortedProblems(problems) {
  return [...problems].sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
}

function normalizeProblemName(name) {
  return String(name || "")
    .replace(/\s*[-|–—]\s*(leetcode|geeksforgeeks|codeforces|hackerrank).*$/i, "")
    .replace(/\s*[-|–—]\s*practice.*$/i, "")
    .replace(/\b[A-Z]\.\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function platformFromUrl(problemUrl) {
  try {
    const url = new URL(problemUrl);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (hostname.includes("leetcode.com")) return "LeetCode";
    if (hostname.includes("geeksforgeeks.org")) return "GeeksforGeeks";
    if (hostname.includes("codeforces.com")) return "Codeforces";
    if (hostname.includes("hackerrank.com")) return "HackerRank";
    const customMatch = customPlatforms.find((platform) => hostname === platform.hostname || hostname.endsWith(`.${platform.hostname}`));
    if (customMatch) return customMatch.name;
  } catch {
    // Ignore invalid URLs.
  }
  return "LeetCode";
}

function problemNameFromUrl(problemUrl, fallbackTitle = "") {
  const titleText = normalizeProblemName(fallbackTitle || "");
  if (titleText) return titleText;

  try {
    const url = new URL(problemUrl);
    const lastSegment = decodeURIComponent(url.pathname.split("/").filter(Boolean).slice(-1)[0] || "");
    const words = lastSegment.replace(/[-_]+/g, " ").replace(/\b[a-z]/g, (char) => char.toUpperCase());
    if (words) return words;
  } catch {
    // Ignore invalid URLs.
  }

  return "Solved Problem";
}

function inferProblemFromUrl(problemUrl, fallbackTitle = "", fallbackDifficulty = "") {
  const platform = inferPlatformFromUrl(problemUrl);
  rememberCustomPlatformForUrl(problemUrl);
  const name = problemNameFromUrl(problemUrl, fallbackTitle);
  return {
    id: globalThis.crypto && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    platform,
    problemUrl,
    topic: "Uncategorized",
    difficulty: ["Easy", "Medium", "Hard"].includes(fallbackDifficulty) ? fallbackDifficulty : "Medium",
    date: formatDate(new Date()),
    time: 0,
    note: "Auto-imported from a coding platform"
  };
}

function addProblemFromUrl(problemUrl, fallbackTitle = "", fallbackDifficulty = "") {
  if (!problemUrl) return false;
  const problem = inferProblemFromUrl(problemUrl, fallbackTitle, fallbackDifficulty);
  if (!isValidProblemUrl(problem.problemUrl, problem.platform)) {
    showToast("This URL is not a valid coding problem link.");
    return false;
  }
  const duplicate = state.problems.some((item) => item.problemUrl === problem.problemUrl || item.name.toLowerCase() === problem.name.toLowerCase() && item.date === problem.date);
  if (duplicate) {
    showToast(`"${problem.name}" is already in your log.`);
    return false;
  }
  state.problems.push(problem);
  if (!persist()) {
    state.problems.pop();
    return false;
  }
  render();
  showToast(`Auto-saved "${problem.name}" from ${problem.platform}.`);
  return true;
}

function problemSearchUrl(problem) {
  const platform = problem.platform || "LeetCode";
  const directUrl = problem.problemUrl || (platform === "GeeksforGeeks" ? problem.questionUrl : "");
  if (directUrl && isValidProblemUrl(directUrl, platform)) {
    return new URL(directUrl).href;
  }
  const query = encodeURIComponent(problem.name);
  switch (platform) {
    case "GeeksforGeeks":
      return `https://www.geeksforgeeks.org/?s=${query}`;
    case "Codeforces":
      return `https://codeforces.com/problemset?search=${query}`;
    case "HackerRank":
      return `https://www.google.com/search?q=${encodeURIComponent(`site:hackerrank.com/challenges ${problem.name}`)}`;
    case "LeetCode":
      return `https://leetcode.com/problemset/?search=${query}`;
    default: {
      const hostname = platformHostname(platform);
      return hostname ? `https://${hostname}/` : `https://www.google.com/search?q=${encodeURIComponent(`${problem.platform} ${problem.name}`)}`;
    }
  }
}

function renderPlatformOptions(selectedPlatform = elements.platform.value) {
  const platforms = ["Any coding platform", ...allPlatformNames()];
  if (selectedPlatform && !platforms.includes(selectedPlatform)) platforms.push(selectedPlatform);
  elements.platform.innerHTML = platforms
    .map((platform) => `<option value="${escapeHtml(platform)}">${escapeHtml(platform)}</option>`)
    .join("");
  elements.platform.value = platforms.includes(selectedPlatform) ? selectedPlatform : "Any coding platform";
}

function dateLabel(isoDate, options = { month: "short", day: "numeric", year: "numeric" }) {
  if (!isoDate) return "Date unavailable";
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, options);
}

function getWeeklyProblems() {
  const start = new Date();
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  const startDate = formatDate(start);
  const today = formatDate(new Date());
  return state.problems.filter((problem) => problem.date >= startDate && problem.date <= today);
}

function getMonthlyProblems() {
  const now = new Date();
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const today = formatDate(now);
  return state.problems.filter((problem) => problem.date >= startDate && problem.date <= today);
}

function getCurrentStreak() {
  const solvedDates = new Set(state.problems.map((problem) => problem.date));
  const today = new Date();
  let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!solvedDates.has(formatDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (solvedDates.has(formatDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function renderStats() {
  const total = state.problems.length;
  const weekly = getWeeklyProblems().length;
  const streak = getCurrentStreak();
  const difficultyCounts = { Easy: 0, Medium: 0, Hard: 0 };
  state.problems.forEach((problem) => { difficultyCounts[problem.difficulty] += 1; });

  elements.total.textContent = String(total);
  elements.weekly.textContent = `+${weekly}`;
  elements.streak.textContent = String(streak);
  elements.easy.textContent = String(difficultyCounts.Easy);
  elements.medium.textContent = String(difficultyCounts.Medium);
  elements.hard.textContent = String(difficultyCounts.Hard);
  const progress = Math.min(100, (total / TARGET_PROBLEMS) * 100);
  elements.planBar.style.width = `${progress}%`;
  elements.planText.textContent = `${total} / ${TARGET_PROBLEMS} problems`;
  elements.streakDots.innerHTML = "";
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - offset);
    const dot = document.createElement("span");
    dot.classList.toggle("active", state.problems.some((problem) => problem.date === formatDate(day)));
    dot.title = `${dateLabel(formatDate(day), { weekday: "long", month: "short", day: "numeric" })}${dot.classList.contains("active") ? ": practiced" : ": no problems logged"}`;
    elements.streakDots.append(dot);
  }
}

function renderTopics() {
  const counts = new Map(TOPICS.map((topic) => [topic, 0]));
  state.problems.forEach((problem) => counts.set(problem.topic, (counts.get(problem.topic) || 0) + 1));
  const activeTopics = [...counts.entries()].filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (activeTopics.length === 0) {
    elements.topicList.innerHTML = '<p class="topic-empty">Your first problem starts a pattern.</p>';
  } else {
    const maxCount = activeTopics[0][1];
    elements.topicList.innerHTML = activeTopics.slice(0, 6).map(([topic, count]) => `
      <div class="topic-row">
        <span class="topic-name" title="${escapeHtml(topic)}">${escapeHtml(topic)}</span>
        <div class="topic-track"><div class="topic-fill" style="width:${Math.max(10, (count / maxCount) * 100)}%"></div></div>
        <span class="topic-count">${count}</span>
      </div>`).join("");
  }
}

function renderActivity() {
  const days = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - offset);
    const iso = formatDate(day);
    days.push({
      iso,
      label: day.toLocaleDateString(undefined, { weekday: "short" }),
      count: state.problems.filter((problem) => problem.date === iso).length,
      today: offset === 0
    });
  }
  const maxCount = Math.max(1, ...days.map((day) => day.count));
  elements.activity.innerHTML = days.map((day) => {
    const height = day.count === 0 ? 3 : Math.max(9, (day.count / maxCount) * 100);
    return `<div class="chart-day" title="${dateLabel(day.iso, { weekday: "long", month: "short", day: "numeric" })}: ${day.count} solved">
      <div class="chart-bar-area"><div class="chart-bar${day.count ? " has-value" : ""}${day.today ? " today" : ""}" data-count="${day.count}" style="height:${height}%"></div></div>
      <span class="chart-label${day.today ? " today-label" : ""}">${day.label}</span>
    </div>`;
  }).join("");
  const weekly = getWeeklyProblems().length;
  elements.activityCount.textContent = `${weekly} ${weekly === 1 ? "problem" : "problems"} this week`;
  if (weekly >= 5) elements.weekInsight.textContent = "Look at you showing up. Keep the rhythm going.";
  else if (weekly > 0) elements.weekInsight.textContent = "Nice momentum. One more session makes this week stronger.";
  else elements.weekInsight.textContent = "Your next solved problem starts a streak.";
}

function renderPeriodList(problems, countElement, listElement, periodLabel) {
  const sorted = sortedProblems(problems);
  countElement.textContent = `${sorted.length} ${sorted.length === 1 ? "QUESTION" : "QUESTIONS"}`;
  if (sorted.length === 0) {
    listElement.innerHTML = `<p class="period-empty">No problems logged ${periodLabel} yet.</p>`;
    return;
  }

  const visible = sorted.slice(0, 5);
  listElement.innerHTML = visible.map((problem) => `
    <div class="period-problem">
      <span class="period-problem-mark">⌘</span>
      <span class="period-problem-copy">
        <a class="problem-platform-link" href="${escapeHtml(problemSearchUrl(problem))}" target="_blank" rel="noopener noreferrer" title="Open ${escapeHtml(problem.name)} on ${escapeHtml(problem.platform || "LeetCode")}">${escapeHtml(problem.name)} ↗</a>
        <small>${escapeHtml(problem.topic)} · ${dateLabel(problem.date, { month: "short", day: "numeric" })}</small>
      </span>
      <span class="period-problem-meta"><small>${escapeHtml(problem.platform || "LeetCode")}</small><span class="difficulty ${problem.difficulty.toLowerCase()}">${problem.difficulty}</span></span>
      <button class="delete-problem-mini" type="button" data-delete-id="${problem.id}" aria-label="Delete ${escapeHtml(problem.name)}">Delete</button>
    </div>`).join("");

  if (sorted.length > visible.length) {
    listElement.insertAdjacentHTML("beforeend", `<a class="period-more" href="#problems">+ ${sorted.length - visible.length} more · View problem log ↗</a>`);
  }
}

function renderPeriodSections() {
  const monthName = new Date().toLocaleDateString(undefined, { month: "long" });
  $("#month-heading").textContent = `${monthName} problems`;
  renderPeriodList(getWeeklyProblems(), elements.weekProblemCount, elements.weekProblemList, "in the last 7 days");
  renderPeriodList(getMonthlyProblems(), elements.monthProblemCount, elements.monthProblemList, "this month");
}

function filteredProblems() {
  return sortedProblems(state.problems).filter((problem) =>
    (state.topicFilter === "all" || problem.topic === state.topicFilter) &&
    (state.difficultyFilter === "all" || problem.difficulty === state.difficultyFilter)
  );
}

function renderProblemTable() {
  const problems = filteredProblems();
  elements.entryCount.textContent = String(state.problems.length);
  elements.empty.hidden = state.problems.length > 0;
  elements.noResults.hidden = state.problems.length === 0 || problems.length > 0;
  elements.table.innerHTML = problems.map((problem) => `
    <tr>
      <td><div class="problem-cell"><span class="problem-mark">⌘</span><span><a class="problem-platform-link" href="${escapeHtml(problemSearchUrl(problem))}" target="_blank" rel="noopener noreferrer" title="Open ${escapeHtml(problem.name)} on ${escapeHtml(problem.platform || "LeetCode")}">${escapeHtml(problem.name)} ↗</a>${problem.note ? `<span class="problem-note">${escapeHtml(problem.note)}</span>` : ""}</span></div></td>
      <td><span class="topic-tag">${escapeHtml(problem.platform || "LeetCode")}</span></td>
      <td><span class="topic-tag">${escapeHtml(problem.topic)}</span></td>
      <td><span class="difficulty ${problem.difficulty.toLowerCase()}">${problem.difficulty}</span></td>
      <td>${dateLabel(problem.date)}</td>
      <td class="time-cell">${problem.time ? `${problem.time} min` : "—"}</td>
      <td class="action-cell"><button class="delete-problem-button" type="button" data-delete-id="${problem.id}" aria-label="Delete ${escapeHtml(problem.name)}">Delete</button></td>
    </tr>`).join("");
}

function renderProfileLinks() {
  if (state.profileLinks.length === 0) {
    elements.profileCards.innerHTML = '<p class="profiles-empty">No profiles added yet. Add one above to keep your coding links close.</p>';
    return;
  }
  elements.profileCards.innerHTML = state.profileLinks.map((profile) => {
    const profileUrl = new URL(profile.url);
    const hostname = profileUrl.hostname.replace(/^www\./, "");
    const provider = getProfileProvider(profile.url);
    const syncing = state.syncingProfileIds.has(profile.id);
    const syncMessage = state.profileSyncMessages.get(profile.id) || "";
    const syncReadyMessage = provider === "CodeChef" ? "Ready to sync public profile summary" : "Ready to sync accepted problems";
    return `
      <article class="profile-card">
        <span class="profile-card-mark" aria-hidden="true">${escapeHtml(profile.name.slice(0, 1).toUpperCase())}</span>
        <div class="profile-card-copy">
          <strong>${escapeHtml(profile.name)}</strong>
          <a href="${escapeHtml(profile.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(hostname)} ↗</a>
          <small class="profile-sync-message" role="status">${escapeHtml(syncMessage || (provider ? syncReadyMessage : "Manual tracking only"))}</small>
        </div>
        ${provider ? `<button class="profile-sync-button" type="button" data-sync-profile-id="${escapeHtml(profile.id)}"${syncing ? " disabled" : ""}>${syncing ? "Syncing…" : provider === "CodeChef" ? "Sync profile" : "Sync questions"}</button>` : ""}
        <button class="profile-remove-button" type="button" data-profile-delete-id="${escapeHtml(profile.id)}" aria-label="Remove ${escapeHtml(profile.name)} profile"${syncing ? " disabled" : ""}>Remove</button>
      </article>`;
  }).join("");
}

function getProfileProvider(profileUrl) {
  const hostname = new URL(profileUrl).hostname.toLowerCase().replace(/^www\./, "");
  if (hostname === "leetcode.com" || hostname.endsWith(".leetcode.com")) return "LeetCode";
  if (hostname === "codeforces.com" || hostname.endsWith(".codeforces.com")) return "Codeforces";
  if (hostname === "geeksforgeeks.org" || hostname.endsWith(".geeksforgeeks.org")) return "GeeksforGeeks";
  if (hostname === "hackerrank.com" || hostname.endsWith(".hackerrank.com")) return "HackerRank";
  if (hostname === "codechef.com" || hostname.endsWith(".codechef.com")) return "CodeChef";
  return "";
}

function getProfileHandle(profile, provider) {
  const url = new URL(profile.url);
  const path = url.pathname.split("/").filter(Boolean);
  let handle = "";
  if (provider === "LeetCode") {
    handle = path[0] === "u" ? path[1] : path[0];
  } else if (provider === "Codeforces") {
    handle = path[0] === "profile" ? path[1] : "";
  } else if (provider === "GeeksforGeeks") {
    handle = path[0] === "profile" || path[0] === "user" ? path[1] : "";
  } else if (provider === "HackerRank") {
    handle = path[0] === "profile" ? path[1] : path[0];
  } else if (provider === "CodeChef") {
    handle = path[0] === "users" ? path[1] : "";
  }
  if (!handle || !/^[A-Za-z0-9_.-]+$/.test(handle)) {
    throw new Error(`Use a public ${provider} profile URL with a valid username.`);
  }
  return handle;
}

async function fetchLeetCodeAcceptedProblems(handle) {
  const endpoint = new URL("https://leetcode.com/graphql/");
  endpoint.searchParams.set(
    "query",
    "query recentAcSubmissions($username: String!, $limit: Int!) { recentAcSubmissionList(username: $username, limit: $limit) { id title titleSlug timestamp } }"
  );
  endpoint.searchParams.set("variables", JSON.stringify({ username: handle, limit: 20 }));
  const response = await fetch(endpoint.href, { cache: "no-store" });
  if (!response.ok) throw new Error(`LeetCode returned HTTP ${response.status}.`);
  const payload = await response.json();
  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    throw new Error("LeetCode could not return accepted submissions for that public profile.");
  }
  const submissions = payload.data && payload.data.recentAcSubmissionList;
  if (!Array.isArray(submissions)) throw new Error("LeetCode returned an unexpected profile response.");
  return submissions
    .filter((submission) => submission && typeof submission.title === "string" && typeof submission.titleSlug === "string" && /^\d+$/.test(String(submission.timestamp)))
    .map((submission) => ({
      name: submission.title,
      platform: "LeetCode",
      problemUrl: `https://leetcode.com/problems/${encodeURIComponent(submission.titleSlug)}/`,
      topic: "Uncategorized",
      difficulty: "Medium",
      date: formatDate(new Date(Number(submission.timestamp) * 1000)),
      time: 0,
      note: "Imported from LeetCode profile; difficulty defaults to Medium"
    }));
}

function codeforcesDifficulty(rating) {
  if (!Number.isFinite(rating)) return "Medium";
  if (rating < 1200) return "Easy";
  if (rating < 1600) return "Medium";
  return "Hard";
}

async function fetchCodeforcesAcceptedProblems(handle) {
  const acceptedByUrl = new Map();
  let from = 1;
  while (true) {
    const endpoint = new URL("https://codeforces.com/api/user.status");
    endpoint.searchParams.set("handle", handle);
    endpoint.searchParams.set("from", String(from));
    endpoint.searchParams.set("count", "1000");
    const response = await fetch(endpoint.href);
    if (!response.ok) throw new Error(`Codeforces returned HTTP ${response.status}.`);
    const payload = await response.json();
    if (payload.status !== "OK" || !Array.isArray(payload.result)) {
      throw new Error(payload.comment || "Codeforces could not return submissions for that profile.");
    }
    for (const submission of payload.result) {
      const problem = submission.problem;
      if (submission.verdict !== "OK" || !problem || !Number.isInteger(problem.contestId) || typeof problem.index !== "string" || !Number.isFinite(Number(submission.creationTimeSeconds))) continue;
      const problemUrl = `https://codeforces.com/problemset/problem/${problem.contestId}/${encodeURIComponent(problem.index)}`;
      if (!acceptedByUrl.has(problemUrl)) {
        acceptedByUrl.set(problemUrl, {
          name: typeof problem.name === "string" ? problem.name : `Problem ${problem.index}`,
          platform: "Codeforces",
          problemUrl,
          topic: "Uncategorized",
          difficulty: codeforcesDifficulty(problem.rating),
          date: formatDate(new Date(Number(submission.creationTimeSeconds) * 1000)),
          time: 0,
          note: "Imported from Codeforces profile"
        });
      }
    }
    if (payload.result.length < 1000) break;
    from += payload.result.length;
    await new Promise((resolve) => window.setTimeout(resolve, 2000));
  }
  return [...acceptedByUrl.values()];
}

function normalizeImportedDifficulty(value) {
  const difficulty = String(value || "").toLowerCase();
  if (difficulty === "easy" || difficulty === "basic" || difficulty === "school") return "Easy";
  if (difficulty === "hard") return "Hard";
  return "Medium";
}

async function fetchGeeksforGeeksAcceptedProblems(handle) {
  const response = await fetch("https://practiceapi.geeksforgeeks.org/api/v1/user/problems/submissions/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handle, requestType: "", year: "", month: "" })
  });
  if (!response.ok) throw new Error(`GeeksforGeeks returned HTTP ${response.status}.`);
  const payload = await response.json();
  if (payload.status !== "success" || !payload.result || typeof payload.result !== "object") {
    throw new Error(payload.message || "GeeksforGeeks could not return solved problems for that profile.");
  }
  const problems = [];
  for (const [difficulty, entries] of Object.entries(payload.result)) {
    if (!entries || typeof entries !== "object") continue;
    for (const details of Object.values(entries)) {
      if (!details || typeof details.pname !== "string" || typeof details.slug !== "string" || !details.slug) continue;
      problems.push({
        name: details.pname,
        platform: "GeeksforGeeks",
        problemUrl: `https://www.geeksforgeeks.org/problems/${encodeURIComponent(details.slug)}/`,
        topic: "Uncategorized",
        difficulty: normalizeImportedDifficulty(difficulty),
        date: "",
        time: 0,
        note: "Imported from GeeksforGeeks profile; solve date unavailable"
      });
    }
  }
  return problems;
}

async function fetchHackerRankAcceptedProblems(handle) {
  const problemsByUrl = new Map();
  let offset = 0;
  const limit = 1000;
  while (offset < 10000) {
    const endpoint = new URL(`https://www.hackerrank.com/rest/hackers/${encodeURIComponent(handle)}/recent_challenges`);
    endpoint.searchParams.set("offset", String(offset));
    endpoint.searchParams.set("limit", String(Math.min(limit, 10000 - offset)));
    const response = await fetch(endpoint.href);
    if (!response.ok) throw new Error(`HackerRank returned HTTP ${response.status}.`);
    const payload = await response.json();
    if (!Array.isArray(payload.models)) {
      throw new Error("HackerRank returned an unexpected profile response.");
    }
    for (const challenge of payload.models) {
      if (!challenge || typeof challenge.name !== "string" || typeof challenge.ch_slug !== "string") continue;
      let problemUrl;
      if (typeof challenge.url === "string" && challenge.url.startsWith("/")) {
        problemUrl = `https://www.hackerrank.com${challenge.url}`;
      } else if (typeof challenge.con_slug === "string" && challenge.con_slug) {
        problemUrl = `https://www.hackerrank.com/contests/${encodeURIComponent(challenge.con_slug)}/challenges/${encodeURIComponent(challenge.ch_slug)}`;
      } else {
        problemUrl = `https://www.hackerrank.com/challenges/${encodeURIComponent(challenge.ch_slug)}/problem`;
      }
      if (!problemsByUrl.has(problemUrl)) {
        const createdAt = typeof challenge.created_at === "string" ? new Date(challenge.created_at) : null;
        problemsByUrl.set(problemUrl, {
          name: challenge.name,
          platform: "HackerRank",
          problemUrl,
          topic: "Uncategorized",
          difficulty: "Medium",
          date: createdAt && Number.isFinite(createdAt.getTime()) ? formatDate(createdAt) : "",
          time: 0,
          note: "Imported from HackerRank profile; difficulty unavailable"
        });
      }
    }
    if (payload.last_page !== false || payload.models.length === 0) break;
    offset += payload.models.length;
  }
  return [...problemsByUrl.values()];
}

async function fetchCodeChefProfileSummary(handle) {
  const response = await fetch(`https://www.codechef.com/users/${encodeURIComponent(handle)}`);
  if (!response.ok) throw new Error(`CodeChef returned HTTP ${response.status}.`);
  const html = await response.text();
  const document = new DOMParser().parseFromString(html, "text/html");
  if (!document.querySelector(".rating-data-section")) {
    throw new Error("CodeChef could not return a public profile summary for that username.");
  }
  const contestText = document.querySelector(".contest-participated-count b")?.textContent.trim();
  const ratingText = document.querySelector(".rating-number")?.textContent.trim();
  if (!contestText) throw new Error("CodeChef did not include public contest summary data.");
  return {
    problems: [],
    summary: `Profile summary: ${contestText} contests${ratingText ? ` · rating ${ratingText}` : ""}. CodeChef does not provide a public solved-question list.`
  };
}

function fetchProfileProblemsThroughExtension(provider, handle) {
  return new Promise((resolve, reject) => {
    const requestId = globalThis.crypto && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const expectedOrigin = window.location.protocol === "file:" ? "null" : window.location.origin;
    const targetOrigin = window.location.protocol === "file:" ? "*" : window.location.origin;
    const timeoutId = window.setTimeout(() => {
      window.removeEventListener("message", onResponse);
      reject(new Error("Browser CORS access is blocked. Install or reload the AlgoTrack extension, then enable its file URL access for this local page."));
    }, 8000);
    function onResponse(event) {
      const response = event.data;
      if (event.source !== window || event.origin !== expectedOrigin ||
          !response || response.source !== "algotrack-extension" ||
          response.type !== "ALGOTRACK_PROFILE_SYNC_RESPONSE" ||
          response.requestId !== requestId) return;
      window.clearTimeout(timeoutId);
      window.removeEventListener("message", onResponse);
      if (response.ok && Array.isArray(response.problems)) {
        resolve({ problems: response.problems, summary: response.summary || "" });
      } else {
        reject(new Error(response.message || "The AlgoTrack extension could not sync this profile."));
      }
    }
    window.addEventListener("message", onResponse);
    window.postMessage({
      source: "algotrack-app",
      type: "ALGOTRACK_PROFILE_SYNC_REQUEST",
      requestId,
      provider,
      handle
    }, targetOrigin);
  });
}

async function fetchProfileProblems(provider, handle) {
  try {
    switch (provider) {
      case "LeetCode": return { problems: await fetchLeetCodeAcceptedProblems(handle) };
      case "Codeforces": return { problems: await fetchCodeforcesAcceptedProblems(handle) };
      case "GeeksforGeeks": return { problems: await fetchGeeksforGeeksAcceptedProblems(handle) };
      case "HackerRank": return { problems: await fetchHackerRankAcceptedProblems(handle) };
      case "CodeChef": return await fetchCodeChefProfileSummary(handle);
      default: throw new Error(`Sync is not supported for ${provider}.`);
    }
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    return fetchProfileProblemsThroughExtension(provider, handle);
  }
}

function normalizedProblemUrl(problemUrl) {
  try {
    const url = new URL(problemUrl);
    url.search = "";
    url.hash = "";
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url.href.toLowerCase();
  } catch {
    return problemUrl;
  }
}

async function syncProfile(profile) {
  const provider = getProfileProvider(profile.url);
  if (!provider || state.syncingProfileIds.has(profile.id)) return;
  state.syncingProfileIds.add(profile.id);
  state.profileSyncMessages.set(profile.id, "Syncing accepted problems…");
  renderProfileLinks();
  try {
    const handle = getProfileHandle(profile, provider);
    const profileData = await fetchProfileProblems(provider, handle);
    const importedProblems = profileData.problems;
    const knownProblemUrls = new Set(state.problems.map((problem) => normalizedProblemUrl(problem.problemUrl)).filter(Boolean));
    const uniqueProblems = importedProblems.filter((problem) => {
      const key = normalizedProblemUrl(problem.problemUrl);
      if (knownProblemUrls.has(key)) return false;
      knownProblemUrls.add(key);
      return true;
    });
    if (uniqueProblems.length > 0) {
      const updatedProblems = [...state.problems, ...uniqueProblems.map((problem) => ({
        ...problem,
        id: globalThis.crypto && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
      }))];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProblems));
      state.problems = updatedProblems;
      render();
    }
    const summary = profileData.summary || (importedProblems.length === 0
      ? `No public solved questions found for this ${provider} username.`
      : uniqueProblems.length
        ? `Added ${uniqueProblems.length}; ${importedProblems.length - uniqueProblems.length} already tracked.`
        : `No new problems found (${importedProblems.length} checked).`);
    state.profileSyncMessages.set(profile.id, summary);
    showToast(`${profile.name}: ${summary}`);
  } catch (error) {
    console.error(`Could not sync ${provider} profile.`, error);
    const message = error.message || "Profile sync failed.";
    state.profileSyncMessages.set(profile.id, message);
    showToast(`${profile.name}: ${message}`);
  } finally {
    state.syncingProfileIds.delete(profile.id);
    renderProfileLinks();
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function buildCoachInsight() {
  const total = state.problems.length;
  if (!total) return "Start by logging a problem you’ve solved. Your coach will use your topic mix and practice rhythm to suggest a useful next step.";

  const counts = new Map(TOPICS.map((topic) => [topic, 0]));
  state.problems.forEach((problem) => counts.set(problem.topic, (counts.get(problem.topic) || 0) + 1));
  const topicRanked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const weakest = [...counts.entries()].sort((a, b) => a[1] - b[1] || TOPICS.indexOf(a[0]) - TOPICS.indexOf(b[0])).find(([, count]) => count === 0);
  const mediumHard = state.problems.filter((problem) => problem.difficulty !== "Easy").length;
  const weekly = getWeeklyProblems().length;

  if (weekly === 0) return `You’ve logged ${total} ${total === 1 ? "problem" : "problems"} so far. A short session today is a low-friction way to restart your practice rhythm.`;
  if (weakest && total >= 4) return `You’re building reps in ${topicRanked[0][0]}, but haven’t logged any ${weakest[0]} yet. Try one beginner ${weakest[0].toLowerCase()} problem next to broaden your pattern library.`;
  if (mediumHard === 0) return "You’ve got the Easy reps down. Pick a familiar topic and try a Medium problem next—work through the approach before checking hints.";
  if (streakMessage()) return streakMessage();
  return `You’ve solved ${weekly} ${weekly === 1 ? "problem" : "problems"} this week. ${topicRanked[0][1] > 1 ? `${topicRanked[0][0]} is your most-practiced topic; try explaining its core pattern from memory.` : "Keep alternating topics to build flexible problem-solving habits."}`;
}

function streakMessage() {
  const streak = getCurrentStreak();
  if (streak >= 3) return `A ${streak}-day streak—nice consistency. Keep sessions manageable, and revisit one tricky solution from memory today.`;
  return "";
}

function renderCoach() {
  elements.coachInsight.textContent = buildCoachInsight();
}

function render() {
  renderStats();
  renderProfileLinks();
  renderTopics();
  renderActivity();
  renderPeriodSections();
  renderProblemTable();
  renderCoach();
}

let toastTimer;
function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("show"), 2800);
}

function openDialog() {
  elements.form.reset();
  renderPlatformOptions();
  elements.addPlatformPanel.hidden = true;
  $("#show-add-platform").setAttribute("aria-expanded", "false");
  $("#problem-date").value = formatDate(new Date());
  $("#problem-time").value = "";
  if (typeof elements.dialog.showModal === "function") elements.dialog.showModal();
  else elements.dialog.setAttribute("open", "");
  $("#problem-name").focus();
}

function deleteProblem(problemId) {
  const item = state.problems.find((problem) => problem.id === problemId);
  if (!item) return;

  const confirmed = window.confirm(`Delete "${item.name}" from your problem log?`);
  if (!confirmed) return;

  const originalProblems = [...state.problems];
  state.problems = state.problems.filter((problem) => problem.id !== problemId);
  if (!persist()) {
    state.problems = originalProblems;
    return;
  }

  render();
  showToast(`Deleted "${item.name}".`);
}

function closeDialog() {
  if (typeof elements.dialog.close === "function") elements.dialog.close();
  else elements.dialog.removeAttribute("open");
}

function saveProblem(event) {
  event.preventDefault();
  if (!elements.form.reportValidity()) return;
  const formData = new FormData(elements.form);
  const problemUrl = String(formData.get("problemUrl")).trim();
  const selectedPlatform = String(formData.get("platform"));
  const inferredPlatform = inferPlatformFromUrl(problemUrl);
  const resolvedPlatform = problemUrl
    ? (selectedPlatform === "Any coding platform" || inferredPlatform !== "Other Platform" ? inferredPlatform : selectedPlatform)
    : selectedPlatform;
  const problem = {
    id: globalThis.crypto && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: String(formData.get("name")).trim(),
    platform: resolvedPlatform,
    problemUrl,
    topic: String(formData.get("topic")),
    difficulty: String(formData.get("difficulty")),
    date: String(formData.get("date")),
    time: Number(formData.get("time")) || 0,
    note: String(formData.get("note")).trim()
  };
  if (problem.problemUrl) {
    rememberCustomPlatformForUrl(problem.problemUrl);
    if (!isValidProblemUrl(problem.problemUrl, problem.platform)) {
      showToast("Use a valid HTTPS URL from any coding platform.");
      $("#problem-url").focus();
      return;
    }
  }
  if (!problem.name || !validProblem(problem)) return;
  state.problems.push(problem);
  if (!persist()) {
    state.problems.pop();
    return;
  }
  render();
  closeDialog();
  showToast(`Logged "${problem.name}". Nice work.`);
}

function autoImportFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const incomingUrl = params.get("url") || params.get("problemUrl");
  const title = params.get("title") || "";
  const difficulty = params.get("difficulty") || "";
  if (!incomingUrl) return;
  addProblemFromUrl(incomingUrl, title, difficulty);
  history.replaceState({}, "", window.location.pathname + window.location.hash);
}

function copyBookmarklet() {
  const bookmarklet = `javascript:(function(){const app='${window.location.href.split('?')[0]}';const params=new URLSearchParams({auto:'1',url:location.href,title:document.title});window.open(app+'?'+params.toString(),'_blank');})();`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(bookmarklet).then(() => showToast("Bookmarklet copied to your clipboard."), () => showToast("Copy manually from the page source."));
    return;
  }
  showToast("Bookmarklet is ready to copy from the page source.");
}

function initialize() {
  const today = new Date();
  $("#app-shell").hidden = true;
  elements.todayDate.textContent = today.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase();
  $("#problem-date").value = formatDate(today);
  try {
    customPlatforms = loadCustomPlatforms();
  } catch (error) {
    console.error("Could not load custom platforms.", error);
    showToast("Custom platforms could not be loaded from this device.");
    customPlatforms = [];
  }
  try {
    state.profileLinks = loadProfileLinks();
  } catch (error) {
    console.error("Could not load saved platform profiles.", error);
    showToast("Platform profiles could not be loaded from this device.");
    state.profileLinks = [];
  }
  renderPlatformOptions(BUILT_IN_PLATFORMS[0]);
  $("#problem-topic").innerHTML = TOPICS.map((topic) => `<option value="${escapeHtml(topic)}">${escapeHtml(topic)}</option>`).join("");
  elements.topicFilter.innerHTML += TOPICS.map((topic) => `<option value="${escapeHtml(topic)}">${escapeHtml(topic)}</option>`).join("");

  $("#auto-import-current-page").addEventListener("click", () => {
    const currentUrl = window.location.href;
    if (!/^https?:\/\//i.test(currentUrl) || currentUrl.startsWith("file://")) {
      showToast("Open this app from a coding platform page to auto-fill it.");
      return;
    }
    const problem = inferProblemFromUrl(currentUrl, document.title || "");
    $("#problem-url").value = problem.problemUrl;
    $("#problem-platform").value = problem.platform;
    $("#problem-name").value = problem.name;
    $("#problem-topic").value = "Uncategorized";
    $("#problem-difficulty").value = problem.difficulty;
    $("#problem-date").value = problem.date;
    $("#problem-time").value = String(problem.time);
    $("#problem-note").value = problem.note;
    showToast("Problem details were auto-filled from the current page.");
  });
  $("#copy-bookmarklet").addEventListener("click", copyBookmarklet);
  $("#profile-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const nameInput = $("#profile-platform-name");
    const urlInput = $("#profile-url");
    if (!event.currentTarget.reportValidity()) return;
    const name = nameInput.value.trim();
    const profileUrl = normalizeProfileUrl(urlInput.value.trim());
    if (!name || name.length > 40) {
      showToast("Platform name must be between 1 and 40 characters.");
      nameInput.focus();
      return;
    }
    if (!profileUrl) {
      showToast("Enter a valid HTTPS profile URL.");
      urlInput.focus();
      return;
    }
    if (state.profileLinks.some((profile) => profile.url === profileUrl)) {
      showToast("That profile link is already saved.");
      urlInput.focus();
      return;
    }
    const profile = {
      id: globalThis.crypto && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      url: profileUrl
    };
    try {
      localStorage.setItem(PROFILE_LINKS_KEY, JSON.stringify([...state.profileLinks, profile]));
    } catch (error) {
      console.error("Could not save platform profile.", error);
      showToast("Profile could not be saved to this device.");
      return;
    }
    state.profileLinks.push(profile);
    event.currentTarget.reset();
    renderProfileLinks();
    showToast(`Added your ${name} profile.`);
  });
  $("#open-problem-form").addEventListener("click", openDialog);
  $("#empty-add").addEventListener("click", openDialog);
  document.querySelectorAll(".period-add-button").forEach((button) => button.addEventListener("click", openDialog));
  $("#close-dialog").addEventListener("click", closeDialog);
  $("#cancel-dialog").addEventListener("click", closeDialog);
  $("#show-add-platform").addEventListener("click", (event) => {
    const isOpening = elements.addPlatformPanel.hidden;
    elements.addPlatformPanel.hidden = !isOpening;
    event.currentTarget.setAttribute("aria-expanded", String(isOpening));
    if (isOpening) $("#new-platform-name").focus();
  });
  $("#add-platform-submit").addEventListener("click", () => {
    const name = $("#new-platform-name").value.trim();
    let hostname;
    try {
      const url = new URL($("#new-platform-url").value.trim());
      if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".")) {
        throw new Error("Enter a valid HTTPS platform URL.");
      }
      hostname = url.hostname.toLowerCase();
    } catch {
      showToast("Enter a valid HTTPS platform URL.");
      $("#new-platform-url").focus();
      return;
    }
    if (!name || name.length > 40) {
      showToast("Platform name must be between 1 and 40 characters.");
      $("#new-platform-name").focus();
      return;
    }
    const duplicateName = allPlatformNames().some((platform) => platform.toLowerCase() === name.toLowerCase());
    const builtInHosts = ["leetcode.com", "geeksforgeeks.org", "codeforces.com", "hackerrank.com"];
    const duplicateHost = customPlatforms.some((platform) =>
      hostname === platform.hostname || hostname.endsWith(`.${platform.hostname}`) || platform.hostname.endsWith(`.${hostname}`)
    ) || builtInHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`) || host.endsWith(`.${hostname}`));
    if (duplicateName || duplicateHost) {
      showToast("That platform name or website is already added.");
      return;
    }
    const platform = { name, hostname };
    try {
      localStorage.setItem(CUSTOM_PLATFORMS_KEY, JSON.stringify([...customPlatforms, platform]));
    } catch (error) {
      console.error("Could not save custom platforms.", error);
      showToast("Platform could not be saved to this device.");
      return;
    }
    customPlatforms.push(platform);
    renderPlatformOptions(name);
    $("#new-platform-name").value = "";
    $("#new-platform-url").value = "";
    elements.addPlatformPanel.hidden = true;
    $("#show-add-platform").setAttribute("aria-expanded", "false");
    showToast(`Added ${name} as a platform.`);
  });
  elements.form.addEventListener("submit", saveProblem);
  document.addEventListener("click", (event) => {
    const syncButton = event.target.closest("[data-sync-profile-id]");
    if (syncButton) {
      const profile = state.profileLinks.find((item) => item.id === syncButton.dataset.syncProfileId);
      if (profile) syncProfile(profile);
      return;
    }
    const profileDeleteButton = event.target.closest("[data-profile-delete-id]");
    if (profileDeleteButton) {
      const profile = state.profileLinks.find((item) => item.id === profileDeleteButton.dataset.profileDeleteId);
      if (!profile) return;
      const remainingProfiles = state.profileLinks.filter((item) => item.id !== profile.id);
      try {
        localStorage.setItem(PROFILE_LINKS_KEY, JSON.stringify(remainingProfiles));
      } catch (error) {
        console.error("Could not remove platform profile.", error);
        showToast("Profile could not be removed from this device.");
        return;
      }
      state.profileLinks = remainingProfiles;
      renderProfileLinks();
      showToast(`Removed your ${profile.name} profile.`);
      return;
    }
    const deleteButton = event.target.closest("[data-delete-id]");
    if (!deleteButton) return;
    deleteProblem(deleteButton.dataset.deleteId);
  });
  $("#coach-refresh").addEventListener("click", () => {
    renderCoach();
    showToast("Your study coach has reviewed your latest progress.");
  });
  $("#preview-login-form").addEventListener("submit", (event) => {
    event.preventDefault();
    $("#preview-login-form").reset();
    $("#login-screen").hidden = true;
    $("#app-shell").hidden = false;
  });
  $("#preview-toggle-password").addEventListener("click", (event) => {
    const password = $("#preview-password");
    const isVisible = password.type === "text";
    password.type = isVisible ? "password" : "text";
    event.currentTarget.textContent = isVisible ? "Show" : "Hide";
    event.currentTarget.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
  });
  elements.topicFilter.addEventListener("change", (event) => {
    state.topicFilter = event.target.value;
    renderProblemTable();
  });
  elements.difficultyFilter.addEventListener("change", (event) => {
    state.difficultyFilter = event.target.value;
    renderProblemTable();
  });
  elements.dialog.addEventListener("click", (event) => {
    if (event.target === elements.dialog) closeDialog();
  });
  try {
    state.problems = loadProblems();
  } catch (error) {
    console.error("Could not load saved DSA progress.", error);
    showToast("Saved progress could not be loaded. Check this browser’s storage.");
    state.problems = [...SEED_PROBLEMS];
  }
  autoImportFromQuery();
  render();
}

initialize();
