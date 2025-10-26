# 🧠 LockIn: Study Tracker

**LockIn** is a Chrome extension designed to help you stay focused while studying.  
It uses **eye-tracking** and **time tracking** to measure how long you stay focused and rewards you with points and score multipliers for maintaining concentration.  
When you look away or lose focus, your streak (and multiplier) drops — motivating you to “lock in” and stay on task!

---

## 🚀 Features

- ⏱️ **Session Timer** — Tracks how long you've been focused in your current session.  
- 🧮 **Score System** — Gain points over time based on your focus duration.  
- 🔢 **Multiplier Mechanic** — The longer you stay focused, the higher your multiplier grows (up to 3×).  
- 🧍‍♀️ **Focus Tracking (via WebGazer.js)** — Detects if you're looking at your screen.  
- 🧱 **Custom UI** — A pixel-styled dashboard built with **React + Tailwind CSS**.  
- 🧠 **High Score Tracking** — Stores your best focus streaks in Chrome’s local storage.  
- 🧩 **Start/Stop Session Button** — Start a new focus session or end it anytime.  

---

## 🧰 Tech Stack

| Tool | Purpose |
|------|----------|
| **React** | Frontend UI |
| **Tailwind CSS** | Styling and layout |
| **WebGazer.js** | Eye-tracking through webcam |
| **Chrome Extensions API (Manifest V3)** | Storage, background scripts, messaging |
| **JavaScript (ES6)** | Core logic and state management |

---

## 🧑‍💻 How It Works

1. When you start a session, LockIn begins tracking your time and focus.  
2. Every second, your **score increases** based on your multiplier.  
3. Your **multiplier grows** the longer you stay focused:
   - 0–9 min → 1×  
   - 10–19 min → 1.5×  
   - 20–29 min → 2×  
   - 30–39 min → 2.5×  
   - 40+ min → 3×  
4. If you look away from your screen for too long, your multiplier resets.  
5. When you press **“Session Complete”**, your stats are saved, and the timer stops.  

---

## ⚙️ Installation

1. **Download the Extension**
   - Clone this repository to your local machine
   - Or download the ZIP file and extract it

2. **Load the Extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" by toggling the switch in the top-right corner
   - Click "Load unpacked" button
   - Select the folder containing the extension files
   - The Browser Pet Extension should now appear in your extensions list

3. **Pin the Extension**
   - Click the puzzle piece icon in Chrome's toolbar
   - Find "LockIn: Study Tracker" and click the pin icon to keep it visible
