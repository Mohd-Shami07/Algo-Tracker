# AlgoTrack

An offline-first DSA practice tracker built with plain HTML, CSS, and JavaScript.

## Features

- Log solved problems with topic, difficulty, date, time, and a personal takeaway
- View weekly activity, practice streak, difficulty mix, topic progress, and a searchable-by-filter problem log
- Get study suggestions based on your logged topics, recent activity, and difficulty mix
- Store progress in your browser's local storage; no account or API key is required
- Use the demo sign-in screen to enter and leave the tracker
- Responsive dashboard for desktop and mobile

The study coach uses transparent, local rules based on the progress you enter. It does not send your data to an AI service. To connect a language model later, add a server-side API endpoint; never put a private API key in browser JavaScript.

The sign-in screen is a front-end demo only: any valid email and non-empty password lets you in. It does not authenticate users or secure progress. The password is discarded and never stored; the email is kept only in the current browser tab's session storage.

## Run it

Open `index.html` in a modern browser. For local serving, run:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.

The tracker starts with a small example history. Use **Log a problem** to add entries; data stays in local storage for this browser.
