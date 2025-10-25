// Background service worker: scoring + focus state coordination

// Load storage/scoring helpers (MV3 classic service worker)
try {
  importScripts('functions.js');
} catch (e) {
  // In case of packaging/path issues, log for diagnostics
  console.warn('Failed to import functions.js in background:', e);
}

// Internal state
let isLooking = false;
let awaySince = null;     // timestamp when user looked away
let lastTickAt = null;    // timestamp of last heartbeat processed

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Handle attention state transitions (used to compute focus loss duration)
  if (msg.type === 'FOCUS_STATE') {
    if (msg.looking) {
      // Came back to looking: compute any loss time and adjust multiplier/focus
      if (awaySince) {
        const lossSeconds = Math.max(0, Math.floor((Date.now() - awaySince) / 1000));
        if (typeof StorageHelper !== 'undefined' && StorageHelper.handleFocusLoss) {
          StorageHelper.handleFocusLoss(lossSeconds);
        }
        awaySince = null;
      }
      isLooking = true;
    } else {
      // Started not looking; mark when it began
      if (!awaySince) awaySince = Date.now();
      isLooking = false;
    }
  }

  // Periodic heartbeat from content script to drive time-based scoring
  if (msg.type === 'FOCUS_TICK') {
    const now = Date.now();
    if (lastTickAt == null) lastTickAt = now;

    const elapsedSec = Math.floor((now - lastTickAt) / 1000);
    if (elapsedSec > 0) {
      if (msg.looking) {
        // Award points while looking
        if (typeof StorageHelper !== 'undefined' && StorageHelper.incrementScore) {
          StorageHelper.incrementScore(10, elapsedSec);
        }
      } else {
        // Not looking: start/continue away timer
        if (!awaySince) awaySince = lastTickAt;
      }
      lastTickAt = now;
    }
  }

  // Respond with current score snapshot
  if (msg.type === 'GET_SCORE') {
    if (typeof StorageHelper !== 'undefined' && StorageHelper.getData) {
      StorageHelper.getData(({ score, multiplier, focusedSeconds, highScore }) => {
        sendResponse({ score, multiplier, focusedSeconds, highScore });
      });
      return true; // keep the message channel open
    }
  }

  // Relay start/stop tracking control only to the active tab
  if (msg.type === 'CONTROL_TRACKING') {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, msg);
      }
    });
  }
});

chrome.action.onClicked.addListener(async () => {
  const url = chrome.runtime.getURL('dist/index.html'); 

  // Find an existing popup window showing our UI
  const wins = await chrome.windows.getAll({ populate: true });
  const existing = wins.find(
    w => w.type === 'popup' && w.tabs?.some(t => t.url?.startsWith(url)));

  if (existing?.id) {
    await chrome.windows.update(existing.id, { focused: true });
    return;
  }

  await chrome.windows.create({
    url,
    type: 'popup',
    width: 350,
    height: 300,
    focused: true
  });
});