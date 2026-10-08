# AlgoTrack

An offline-first DSA practice tracker built with plain HTML, CSS, and JavaScript. No account or server is required.

## Features

- Log solved problems with topic, difficulty, date, time, and a personal takeaway
- Auto-import problems from coding-platform URLs using the built-in bookmarklet flow, or paste a direct problem URL and let Algotrack detect the platform, name, and metadata
- Use the optional Chrome extension to detect accepted results on LeetCode problem pages and add their title and link to AlgoTrack
- Choose LeetCode, GeeksforGeeks, Codeforces, HackerRank, or add a custom platform when logging; enter a direct problem URL to open the exact page. Custom platforms are saved in this browser, and their problem links must use the platform's HTTPS domain.
- Save HTTPS links to coding-platform profiles as dashboard cards. Sync imports the latest 20 accepted LeetCode submissions, Codeforces accepted submissions, GeeksforGeeks solved problems, and recent HackerRank challenges into the local problem log. CodeChef sync shows public contest/rating summary only because its profile does not provide a reliable public list of individually solved problems. LeetCode and HackerRank difficulty default to Medium where unavailable; GeeksforGeeks solve dates are not included.
- View weekly activity, practice streak, difficulty mix, topic progress, and a searchable-by-filter problem log
- Review separate problem lists for the last 7 days and the current month
- Get study suggestions based on your logged topics, recent activity, and difficulty mix
- Save your progress in this browser's local storage
- Responsive dashboard for desktop and mobile

The study coach uses transparent, local rules based on the progress you enter. It does not send your data to an AI service. To connect a language model later, add a server-side API endpoint; never put a private API key in browser JavaScript.

Your practice log is stored only in this browser and is not synced to other devices. Any progress saved by earlier sign-ins in this browser is combined into the local tracker when the app opens. Without a login screen, anyone using this same browser can access its saved progress.

## Run it

Open `index.html` in a browser, or serve the folder with any static web server such as VS Code Live Server. The welcome screen is a visual-only preview and does not authenticate or retain the entered fields; its button opens the tracker. The project can be deployed to static hosting, including GitHub Pages.

The tracker starts with a small example history. Use **Log a problem** to add entries; data stays in local storage for this browser.

## Optional LeetCode auto-tracking

The Chromium extension in `extension/` watches LeetCode problem pages for a visible accepted submission result. When it detects one, it opens the configured AlgoTrack page with the problem title and URL; AlgoTrack imports it into this browser's local progress.

1. Open `chrome://extensions` (or the equivalent page in a Chromium-based browser) and enable **Developer mode**.
2. Choose **Load unpacked** and select this repository's `extension` folder.
3. Start AlgoTrack locally, either by opening `index.html` or using a local development server such as VS Code Live Server.
4. Open the extension popup and save the full local AlgoTrack page URL, such as `http://127.0.0.1:5500/index.html` or the `file:///.../index.html` URL in your browser.
5. Reload any already-open LeetCode problem page, then solve a problem there. After an accepted result is detected, AlgoTrack opens and logs it automatically.

The extension does not request a LeetCode username, password, session cookie, or access to submitted code. It only reads a visible accepted-result message and the current problem page's title, URL, and displayed difficulty. Imported topic is set to **Uncategorized**; time spent and past submissions are not imported. Detection depends on LeetCode's page markup and may need maintenance if LeetCode changes it. Use a local AlgoTrack URL to keep the imported data on this device.

### Profile sync when browser CORS blocks requests

Profile sync first requests public profile data directly. If the browser blocks that cross-origin request, the optional extension can relay it from its service worker. Load or reload the unpacked extension after installation, allow it to access file URLs in `chrome://extensions` when opening `index.html` directly, then reload AlgoTrack and retry **Sync questions**. When using a local server, use `localhost` or `127.0.0.1`. The extension only requests public platform profile data; it does not use account credentials.
