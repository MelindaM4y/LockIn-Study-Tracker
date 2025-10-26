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
let scoringInterval = null; // interval for continuous scoring

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Start continuous scoring loop
  if (msg.type === 'START_SCORING') {
    console.log('Starting continuous scoring loop...');
    if (scoringInterval) clearInterval(scoringInterval);
    
    lastTickAt = Date.now();
    scoringInterval = setInterval(() => {
      const now = Date.now();
      const elapsedSec = Math.floor((now - lastTickAt) / 1000);
      
      if (elapsedSec > 0 && isLooking) {
        // Award points while looking (even if popup is minimized)
        if (typeof StorageHelper !== 'undefined' && StorageHelper.incrementScore) {
          StorageHelper.incrementScore(10, elapsedSec);
          console.log('✅ Points awarded (background loop):', elapsedSec, 'seconds');
        }
        lastTickAt = now;
      }
    }, 1000); // Run every second
  }
  
  // Stop continuous scoring loop
  if (msg.type === 'STOP_SCORING') {
    console.log('Stopping continuous scoring loop...');
    if (scoringInterval) {
      clearInterval(scoringInterval);
      scoringInterval = null;
    }
    isLooking = false;
    awaySince = null;
    lastTickAt = null;
  }
  // Handle gaze data from extension UI (WebGazer running in popup)
  if (msg.type === 'GAZE_DATA') {
    const { data, timestamp } = msg;
    const now = Date.now();
    
    // Simple logic: if WebGazer detects face/gaze = user is looking
    // If no data = user looked away or no face detected
    const isActuallyLooking = data !== null && data !== undefined;
    
    console.log('Gaze data received. Face detected:', isActuallyLooking);
    
    if (isActuallyLooking) {
      // User's face is detected - they're looking at the computer
      if (awaySince) {
        const lossSeconds = Math.max(0, Math.floor((now - awaySince) / 1000));
        console.log('🔵 User returned! Was away for', lossSeconds, 'seconds');
        
        if (typeof StorageHelper !== 'undefined' && StorageHelper.handleFocusLoss) {
          console.log('✅ Calling handleFocusLoss with', lossSeconds, 'seconds');
          StorageHelper.handleFocusLoss(lossSeconds);
        }
        awaySince = null;
      }
      isLooking = true;
      chrome.runtime.sendMessage({ type: 'FOCUS_STATE_UPDATE', looking: true });
    } else {
      // No face detected - user is away
      if (!awaySince) {
        awaySince = now;
        console.log('🔴 User looked away (no face detected)');
      }
      isLooking = false;
      chrome.runtime.sendMessage({ type: 'FOCUS_STATE_UPDATE', looking: false });
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