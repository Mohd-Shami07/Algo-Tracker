"use strict";

const APP_URL_KEY = "algotrackAppUrl";

function localDateLabel(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function profileSyncUrl(provider, handle, from) {
  if (provider === "LeetCode") {
    const endpoint = new URL("https://leetcode.com/graphql/");
    endpoint.searchParams.set(
      "query",
      "query recentAcSubmissions($username: String!, $limit: Int!) { recentAcSubmissionList(username: $username, limit: $limit) { id title titleSlug timestamp } }"
    );
    endpoint.searchParams.set("variables", JSON.stringify({ username: handle, limit: 20 }));
    return endpoint.href;
  }
  if (provider === "GeeksforGeeks") return "https://practiceapi.geeksforgeeks.org/api/v1/user/problems/submissions/";
  if (provider === "HackerRank") {
    const endpoint = new URL(`https://www.hackerrank.com/rest/hackers/${encodeURIComponent(handle)}/recent_challenges`);
    endpoint.searchParams.set("offset", String(from - 1));
    endpoint.searchParams.set("limit", "1000");
    return endpoint.href;
  }
  if (provider === "CodeChef") return `https://www.codechef.com/users/${encodeURIComponent(handle)}`;
  const endpoint = new URL("https://codeforces.com/api/user.status");
  endpoint.searchParams.set("handle", handle);
  endpoint.searchParams.set("from", String(from));
  endpoint.searchParams.set("count", "1000");
  return endpoint.href;
}

async function fetchProfileProblems(provider, handle) {
  const problemsByUrl = new Map();
  let from = 1;
  while (true) {
    const isGeeksforGeeks = provider === "GeeksforGeeks";
    const response = await fetch(profileSyncUrl(provider, handle, from), isGeeksforGeeks ? {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle, requestType: "", year: "", month: "" })
    } : {});
    if (!response.ok) throw new Error(`${provider} returned HTTP ${response.status}.`);
    if (provider === "CodeChef") {
      const html = await response.text();
      const contestMatch = html.match(/class=["'][^"']*contest-participated-count[^"']*["'][^>]*>[\s\S]{0,1000}?<b[^>]*>\s*([\d,]+)\s*<\/b>/i);
      const ratingMatch = html.match(/class=["'][^"']*rating-number[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i);
      if (!contestMatch) throw new Error("CodeChef did not include public contest summary data.");
      const rating = ratingMatch ? ratingMatch[1].replace(/<[^>]*>/g, "").trim() : "";
      return {
        problems: [],
        summary: `Profile summary: ${contestMatch[1]} contests${rating ? ` · rating ${rating}` : ""}. CodeChef does not provide a public solved-question list.`
      };
    }
    const payload = await response.json();
    if (provider === "LeetCode") {
      if (Array.isArray(payload.errors) && payload.errors.length > 0) {
        throw new Error("LeetCode could not return accepted submissions for that public profile.");
      }
      const submissions = payload.data && payload.data.recentAcSubmissionList;
      if (!Array.isArray(submissions)) throw new Error("LeetCode returned an unexpected profile response.");
      for (const submission of submissions) {
        if (!submission || typeof submission.title !== "string" || typeof submission.titleSlug !== "string" || !/^\d+$/.test(String(submission.timestamp))) continue;
        const problemUrl = `https://leetcode.com/problems/${encodeURIComponent(submission.titleSlug)}/`;
        problemsByUrl.set(problemUrl, {
          name: submission.title,
          platform: "LeetCode",
          problemUrl,
          topic: "Uncategorized",
          difficulty: "Medium",
          date: localDateLabel(Number(submission.timestamp) * 1000),
          time: 0,
          note: "Imported from LeetCode profile; difficulty defaults to Medium"
        });
      }
      break;
    }
    if (provider === "GeeksforGeeks") {
      if (payload.status !== "success" || !payload.result || typeof payload.result !== "object") {
        throw new Error(payload.message || "GeeksforGeeks could not return solved problems for that profile.");
      }
      for (const [difficulty, entries] of Object.entries(payload.result)) {
        if (!entries || typeof entries !== "object") continue;
        for (const details of Object.values(entries)) {
          if (!details || typeof details.pname !== "string" || typeof details.slug !== "string" || !details.slug) continue;
          const normalizedDifficulty = String(difficulty).toLowerCase();
          const mappedDifficulty = ["easy", "basic", "school"].includes(normalizedDifficulty)
            ? "Easy"
            : normalizedDifficulty === "hard" ? "Hard" : "Medium";
          const problemUrl = `https://www.geeksforgeeks.org/problems/${encodeURIComponent(details.slug)}/`;
          problemsByUrl.set(problemUrl, {
            name: details.pname,
            platform: "GeeksforGeeks",
            problemUrl,
            topic: "Uncategorized",
            difficulty: mappedDifficulty,
            date: "",
            time: 0,
            note: "Imported from GeeksforGeeks profile; solve date unavailable"
          });
        }
      }
      return { problems: [...problemsByUrl.values()] };
    }
    if (provider === "HackerRank") {
      if (!Array.isArray(payload.models)) throw new Error("HackerRank returned an unexpected profile response.");
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
            date: createdAt && Number.isFinite(createdAt.getTime()) ? localDateLabel(createdAt.getTime()) : "",
            time: 0,
            note: "Imported from HackerRank profile; difficulty unavailable"
          });
        }
      }
      if (payload.last_page !== false || payload.models.length === 0 || from >= 10000) break;
      from += payload.models.length;
      continue;
    }

    if (payload.status !== "OK" || !Array.isArray(payload.result)) {
      throw new Error(payload.comment || "Codeforces could not return submissions for that profile.");
    }
    for (const submission of payload.result) {
      const problem = submission.problem;
      if (submission.verdict !== "OK" || !problem || !Number.isInteger(problem.contestId) || typeof problem.index !== "string" || !Number.isFinite(Number(submission.creationTimeSeconds))) continue;
      const problemUrl = `https://codeforces.com/problemset/problem/${problem.contestId}/${encodeURIComponent(problem.index)}`;
      if (!problemsByUrl.has(problemUrl)) {
        const rating = Number(problem.rating);
        problemsByUrl.set(problemUrl, {
          name: typeof problem.name === "string" ? problem.name : `Problem ${problem.index}`,
          platform: "Codeforces",
          problemUrl,
          topic: "Uncategorized",
          difficulty: Number.isFinite(rating) ? rating < 1200 ? "Easy" : rating < 1600 ? "Medium" : "Hard" : "Medium",
          date: localDateLabel(Number(submission.creationTimeSeconds) * 1000),
          time: 0,
          note: "Imported from Codeforces profile"
        });
      }
    }
    if (payload.result.length < 1000) break;
    from += payload.result.length;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return { problems: [...problemsByUrl.values()] };
}

function validProfileSyncRequest(message) {
  return message &&
    message.type === "ALGOTRACK_SYNC_PROFILE" &&
    ["LeetCode", "Codeforces", "GeeksforGeeks", "HackerRank", "CodeChef"].includes(message.provider) &&
    typeof message.handle === "string" &&
    /^[A-Za-z0-9_.-]{1,100}$/.test(message.handle);
}

function isLocalAlgoTrackPage(sender) {
  try {
    const url = new URL(sender.url);
    return url.protocol === "file:" ||
      url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function validAppUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:", "file:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function validLeetCodeProblemUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      ["leetcode.com", "www.leetcode.com"].includes(url.hostname) &&
      /^\/problems\/[a-z0-9-]+\/?$/i.test(url.pathname);
  } catch {
    return false;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "ALGOTRACK_SYNC_PROFILE") {
    if (!isLocalAlgoTrackPage(sender) || !validProfileSyncRequest(message)) {
      sendResponse({ ok: false, message: "Invalid public profile sync request." });
      return false;
    }
    fetchProfileProblems(message.provider, message.handle).then(
      (result) => sendResponse({ ok: true, ...result }),
      (error) => {
        console.error(`Could not sync ${message.provider} profile.`, error);
        sendResponse({ ok: false, message: error.message || "Profile sync failed." });
      }
    );
    return true;
  }
  if (!message || message.type !== "ALGOTRACK_IMPORT_ACCEPTED") return false;
  if (!sender.url || !/^https:\/\/(www\.)?leetcode\.com\/problems\//i.test(sender.url) ||
      !validLeetCodeProblemUrl(message.problemUrl) ||
      typeof message.title !== "string" ||
      message.title.length > 200 ||
      (message.difficulty !== undefined && !["Easy", "Medium", "Hard"].includes(message.difficulty))) {
    sendResponse({ ok: false, message: "Could not verify this LeetCode problem." });
    return false;
  }

  chrome.storage.sync.get(APP_URL_KEY, (settings) => {
    if (chrome.runtime.lastError) {
      sendResponse({ ok: false, message: "Could not read the AlgoTrack URL setting." });
      return;
    }
    if (!validAppUrl(settings[APP_URL_KEY])) {
      sendResponse({ ok: false, message: "Set your AlgoTrack page URL in the extension settings first." });
      return;
    }

    const appUrl = new URL(settings[APP_URL_KEY]);
    appUrl.searchParams.set("url", message.problemUrl);
    appUrl.searchParams.set("title", message.title);
    if (message.difficulty) appUrl.searchParams.set("difficulty", message.difficulty);
    chrome.tabs.create({ url: appUrl.href }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, message: "AlgoTrack could not be opened. Check the saved page URL." });
        return;
      }
      sendResponse({ ok: true });
    });
  });
  return true;
});
