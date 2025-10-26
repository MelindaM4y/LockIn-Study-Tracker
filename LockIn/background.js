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
  // Handle gaze data from extension UI (WebGazer running in popup/side panel)
  if (msg.type === 'GAZE_DATA') {
    console.log('Background received GAZE_DATA:', msg.data);
    const { data, timestamp } = msg;
    if (!data) return;
    
    const now = Date.now();
    
    // Get screen dimensions (assuming standard monitor, adjust if needed)
    // More strict bounds checking - gaze must be within actual screen area
    const screenWidth = 1920;  // Adjust to your screen width
    const screenHeight = 1080; // Adjust to your screen height
    
    // Add a margin - if gaze is too far outside screen bounds, user is looking away
    const margin = 100; // pixels tolerance
    const withinScreen = 
      data.x >= -margin && 
      data.x <= screenWidth + margin && 
      data.y >= -margin && 
      data.y <= screenHeight + margin;
    
    // Additionally check if gaze coordinates seem reasonable (not NaN or extreme values)
    const validCoordinates = 
      !isNaN(data.x) && 
      !isNaN(data.y) && 
      Math.abs(data.x) < 10000 && 
      Math.abs(data.y) < 10000;
    
    const isActuallyLooking = withinScreen && validCoordinates;
    
    console.log('Gaze coords:', data.x.toFixed(1), data.y.toFixed(1), 
                'Within screen:', withinScreen, 
                'Valid:', validCoordinates,
                'Actually looking:', isActuallyLooking);
    
    if (isActuallyLooking) {
      // User is looking
      if (awaySince) {
        const lossSeconds = Math.max(0, Math.floor((now - awaySince) / 1000));
        console.log('User returned! Was away for', lossSeconds, 'seconds');
        if (typeof StorageHelper !== 'undefined' && StorageHelper.handleFocusLoss) {
          StorageHelper.handleFocusLoss(lossSeconds);
          console.log('handleFocusLoss called with', lossSeconds, 'seconds');
        }
        awaySince = null;
      }
      isLooking = true;
      
      // Award points (throttle to ~once per second)
      if (!lastTickAt || now - lastTickAt >= 1000) {
        const elapsedSec = lastTickAt ? Math.floor((now - lastTickAt) / 1000) : 1;
        console.log('Awarding points: 10 base for', elapsedSec, 'seconds');
        
        if (typeof StorageHelper !== 'undefined' && StorageHelper.incrementScore) {
          try {
            StorageHelper.incrementScore(10, elapsedSec);
            console.log('incrementScore called successfully');
            
            // Log the updated score
            StorageHelper.getData((data) => {
              console.log('Current score after increment:', data.score, 'Multiplier:', data.multiplier);
            });
          } catch (err) {
            console.error('Error calling incrementScore:', err);
          }
        } else {
          console.error('StorageHelper not available! Type:', typeof StorageHelper);
        }
        lastTickAt = now;
      }
      
      // Notify UI of focus state
      chrome.runtime.sendMessage({ type: 'FOCUS_STATE_UPDATE', looking: true });
    } else {
      // Not looking
      if (!awaySince) {
        awaySince = now;
        console.log('User looked away - starting away timer');
      }
      isLooking = false;
      chrome.runtime.sendMessage({ type: 'FOCUS_STATE_UPDATE', looking: false });
    }
  }

  // Handle attention state transitions (legacy support for content script tracking)
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