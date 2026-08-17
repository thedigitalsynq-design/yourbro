# YOUR-BRO Live Stream Dashboard

> A clean, minimalist live streaming dashboard for the **YOUR-BRO** YouTube channel (`@YOURBR0-f1h`).  
> Shows **real-time subscriber count**, milestone progress, subscriber alerts, confetti, and stream deck triggers — all without a YouTube API key.

---

## ✨ Features

- 🔴 **Live subscriber counter** — pulls real data directly from your YouTube channel
- 🎯 **Milestone progress bar** — tracks your road to the next sub goal
- 🔔 **Subscriber alert popups** — animated alerts with sound (Web Audio API)
- 🎉 **Confetti system** — fires on new subs, raids, and milestones
- 🎮 **Stream Deck triggers** — +1 Sub, +5 Surge, +20 Raid, +1 VIP
- 📊 **Live growth chart** — mini real-time canvas graph
- 📋 **Recent subscribers feed** — scrollable Bro Army list
- 📺 **OBS Mode** — transparent overlay for stream scenes
- ⚙️ **Settings modal** — override counts and goals on the fly

---

## 🚀 Quick Start

### 1. Clone the repo
```bash
git clone https://github.com/thedigitalsynq-design/yourbro.git
cd yourbro
```

### 2. Start the backend server
```bash
python server.py
```
This will:
- Scrape your real YouTube subscriber count on startup
- Serve the dashboard at `http://localhost:3000`
- Auto-refresh channel data every **120 seconds**
- Expose a live JSON API at `http://localhost:3000/api/channel`

### 3. Open the dashboard
Go to **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📁 File Structure

```
yourbro/
├── index.html      # Dashboard UI
├── styles.css      # Minimalist dark theme with Fraunces / Playfair Display fonts
├── app.js          # Dashboard logic, audio, confetti, live data fetch
└── server.py       # Python backend — scrapes YouTube & serves static files
```

---

## 🔧 How Real Data Works

No YouTube API key needed. `server.py` fetches the public YouTube channel page (`https://www.youtube.com/@YOURBR0-f1h/about`) and extracts subscriber count via regex on the page's embedded JSON data (`ytInitialData`). The result is cached and served via `/api/channel`.

`app.js` polls `/api/channel` every 90 seconds and updates the dashboard live.

---

## 🎨 Design

- **Dark theme** — `#09090E` background, YouTube red accents
- **Typography** — `Fraunces` & `Playfair Display` for display text, `Plus Jakarta Sans` for UI
- **Animations** — Pulse dots, confetti canvas, alert slide-ins, number bumps

---

## 📺 OBS Setup

Click **OBS Mode** in the dashboard to strip the UI to a transparent overlay you can capture as a Browser Source in OBS Studio.

- Browser Source URL: `http://localhost:3000`
- Width: `1920`, Height: `1080`
- Check **"Shutdown source when not visible"**

---

*Built for the Bro Army. Road to 100 subs. 🔥*
