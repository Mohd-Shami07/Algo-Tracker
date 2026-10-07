"use strict";

const STORAGE_KEY = "algotrack-dsa-progress-v1";
const SESSION_KEY = "algotrack-demo-user";
const TARGET_PROBLEMS = 75;
const PLATFORMS = ["LeetCode", "GeeksforGeeks", "Codeforces", "HackerRank"];
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
  "Bit Manipulation"
];
const SEED_PROBLEMS = [
  { id: "seed-1", name: "Contains Duplicate", platform: "LeetCode", topic: "Arrays & Hashing", difficulty: "Easy", date: dateOffset(-6), time: 12, note: "A set makes duplicate checks constant time." },
  { id: "seed-2", name: "Valid Anagram", platform: "LeetCode", topic: "Arrays & Hashing", difficulty: "Easy", date: dateOffset(-5), time: 18, note: "Frequency counts keep the comparison linear." },
  { id: "seed-3", name: "Valid Parentheses", platform: "LeetCode", topic: "Stack", difficulty: "Easy", date: dateOffset(-4), time: 21, note: "Last opened bracket must close first." },
  { id: "seed-4", name: "Best Time to Buy and Sell Stock", platform: "LeetCode", topic: "Sliding Window", difficulty: "Easy", date: dateOffset(-3), time: 24, note: "Track the minimum price seen so far." },
  { id: "seed-5", name: "Binary Search", platform: "LeetCode", topic: "Binary Search", difficulty: "Easy", date: dateOffset(-2), time: 16, note: "Keep the search interval invariant clear." },
  { id: "seed-6", name: "Two Sum", platform: "LeetCode", topic: "Arrays & Hashing", difficulty: "Easy", date: dateOffset(-1), time: 10, note: "Store complements as you scan once." }
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

function validProblem(problem) {
  return Boolean(
    problem &&
    typeof problem.id === "string" &&
    typeof problem.name === "string" &&
    (problem.platform === undefined || PLATFORMS.includes(problem.platform)) &&
    typeof problem.topic === "string" &&
    TOPICS.includes(problem.topic) &&
    ["Easy", "Medium", "Hard"].includes(problem.difficulty) &&
    /^\d{4}-\d{2}-\d{2}$/.test(problem.date) &&
    Number.isFinite(Number(problem.time)) &&
    typeof problem.note === "string"
  );
}

function loadProblems() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PROBLEMS));
      return [...SEED_PROBLEMS];
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.every(validProblem)) {
      throw new Error("Saved progress has an unsupported format.");
    }
    return parsed.map((problem) => ({
      ...problem,
      platform: problem.platform || "LeetCode"
    }));
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error("Could not parse saved DSA progress.", error);
      return [];
    }
    if (error instanceof DOMException && error.name === "SecurityError") {
      console.error("Local storage is not available. Progress will not persist.", error);
      return [];
    }
    console.error("Could not load saved DSA progress.", error);
    return [];
  }
}

const state = { problems: loadProblems(), topicFilter: "all", difficultyFilter: "all" };
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
  entryCount: $("#entry-count"),
  empty: $("#empty-state"),
  noResults: $("#no-filter-results"),
  topicFilter: $("#topic-filter"),
  difficultyFilter: $("#difficulty-filter"),
  coachInsight: $("#coach-insight"),
  todayDate: $("#today-date"),
  dialog: $("#problem-dialog"),
  form: $("#problem-form"),
  toast: $("#toast")
};

function displayNameFromEmail(email) {
  const localPart = email.split("@")[0].replace(/[._-]+/g, " ").trim();
  if (!localPart) return "DSA learner";
  return localPart.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function enterTracker(email, showWelcome = false) {
  const displayName = displayNameFromEmail(email);
  $("#profile-name").textContent = displayName;
  $(".avatar").textContent = displayName.charAt(0).toUpperCase();
  $("#login-screen").hidden = true;
  $("#app-shell").hidden = false;
  if (showWelcome) showToast(`Welcome in, ${displayName}.`);
}

function handleLogin(event) {
  event.preventDefault();
  const emailInput = $("#login-email");
  const passwordInput = $("#login-password");
  if (!emailInput.reportValidity() || !passwordInput.value) return;
  const email = emailInput.value.trim();
  passwordInput.value = "";

  try {
    sessionStorage.setItem(SESSION_KEY, email);
  } catch (error) {
    console.error("Could not save the demo sign-in session.", error);
  }
  enterTracker(email, true);
}

function handleSignOut() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error("Could not clear the demo sign-in session.", error);
  }
  $("#app-shell").hidden = true;
  $("#login-screen").hidden = false;
  $("#login-form").reset();
  $("#login-email").focus();
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.problems));
  } catch (error) {
    console.error("Could not save DSA progress.", error);
    showToast("Progress couldn’t be saved to this device.");
  }
}

function sortedProblems(problems) {
  return [...problems].sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
}

function problemSearchUrl(problem) {
  const query = encodeURIComponent(problem.name);
  switch (problem.platform || "LeetCode") {
    case "GeeksforGeeks":
      return `https://www.geeksforgeeks.org/?s=${query}`;
    case "Codeforces":
      return `https://codeforces.com/problemset?search=${query}`;
    case "HackerRank":
      return `https://www.google.com/search?q=${encodeURIComponent(`site:hackerrank.com/challenges ${problem.name}`)}`;
    case "LeetCode":
    default:
      return `https://leetcode.com/problemset/?search=${query}`;
  }
}

function dateLabel(isoDate, options = { month: "short", day: "numeric", year: "numeric" }) {
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
        <a class="problem-platform-link" href="${problemSearchUrl(problem)}" target="_blank" rel="noopener noreferrer" title="Search ${escapeHtml(problem.platform || "LeetCode")} for ${escapeHtml(problem.name)}">${escapeHtml(problem.name)} ↗</a>
        <small>${escapeHtml(problem.topic)} · ${dateLabel(problem.date, { month: "short", day: "numeric" })}</small>
      </span>
      <span class="period-problem-meta"><small>${escapeHtml(problem.platform || "LeetCode")}</small><span class="difficulty ${problem.difficulty.toLowerCase()}">${problem.difficulty}</span></span>
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
      <td><div class="problem-cell"><span class="problem-mark">⌘</span><span><a class="problem-platform-link" href="${problemSearchUrl(problem)}" target="_blank" rel="noopener noreferrer" title="Search ${escapeHtml(problem.platform || "LeetCode")} for ${escapeHtml(problem.name)}">${escapeHtml(problem.name)} ↗</a>${problem.note ? `<span class="problem-note">${escapeHtml(problem.note)}</span>` : ""}</span></div></td>
      <td><span class="topic-tag">${escapeHtml(problem.platform || "LeetCode")}</span></td>
      <td><span class="topic-tag">${escapeHtml(problem.topic)}</span></td>
      <td><span class="difficulty ${problem.difficulty.toLowerCase()}">${problem.difficulty}</span></td>
      <td>${dateLabel(problem.date)}</td>
      <td class="time-cell">${problem.time ? `${problem.time} min` : "—"}</td>
    </tr>`).join("");
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
  $("#problem-date").value = formatDate(new Date());
  $("#problem-time").value = "";
  if (typeof elements.dialog.showModal === "function") elements.dialog.showModal();
  else elements.dialog.setAttribute("open", "");
  $("#problem-name").focus();
}

function closeDialog() {
  if (typeof elements.dialog.close === "function") elements.dialog.close();
  else elements.dialog.removeAttribute("open");
}

function saveProblem(event) {
  event.preventDefault();
  if (!elements.form.reportValidity()) return;
  const formData = new FormData(elements.form);
  const problem = {
    id: globalThis.crypto && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: String(formData.get("name")).trim(),
    platform: String(formData.get("platform")),
    topic: String(formData.get("topic")),
    difficulty: String(formData.get("difficulty")),
    date: String(formData.get("date")),
    time: Number(formData.get("time")) || 0,
    note: String(formData.get("note")).trim()
  };
  if (!problem.name || !validProblem(problem)) return;
  state.problems.push(problem);
  persist();
  render();
  closeDialog();
  showToast(`Logged "${problem.name}". Nice work.`);
}

function initialize() {
  const today = new Date();
  elements.todayDate.textContent = today.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase();
  $("#problem-date").value = formatDate(today);
  $("#problem-topic").innerHTML = TOPICS.map((topic) => `<option value="${escapeHtml(topic)}">${escapeHtml(topic)}</option>`).join("");
  elements.topicFilter.innerHTML += TOPICS.map((topic) => `<option value="${escapeHtml(topic)}">${escapeHtml(topic)}</option>`).join("");

  $("#open-problem-form").addEventListener("click", openDialog);
  $("#empty-add").addEventListener("click", openDialog);
  document.querySelectorAll(".period-add-button").forEach((button) => button.addEventListener("click", openDialog));
  $("#close-dialog").addEventListener("click", closeDialog);
  $("#cancel-dialog").addEventListener("click", closeDialog);
  elements.form.addEventListener("submit", saveProblem);
  $("#coach-refresh").addEventListener("click", () => {
    renderCoach();
    showToast("Your study coach has reviewed your latest progress.");
  });
  $("#login-form").addEventListener("submit", handleLogin);
  $("#sign-out").addEventListener("click", handleSignOut);
  $("#toggle-password").addEventListener("click", (event) => {
    const password = $("#login-password");
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
  render();

  try {
    const signedInEmail = sessionStorage.getItem(SESSION_KEY);
    if (signedInEmail) enterTracker(signedInEmail);
  } catch (error) {
    console.error("Could not restore the demo sign-in session.", error);
  }
}

initialize();
