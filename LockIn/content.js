let isTracking = false;
let lastSent = 0;
let lastLooking = null;
let userEnabled = false; // Start and stop tracking

// Limits gaze sending to 3x per second to prevent overloading
const THROTTLE_INTERVAL = 300; 

// Time (ms) without valid gaze data counted as "looking away"
const AWAY_TIMEOUT = 2000;

// Track the last valid gaze timestamp
let lastGazeTime = Date.now();

// CAMERA + GAZE INITIALIZATION
async function initCameraAndTracking() {
  try {
    console.log("🎥 Requesting camera access...");

    // Ask user for camera permission
    await navigator.mediaDevices.getUserMedia({ video: true });

    console.log("✅ Camera permission granted. Initializing WebGazer...");

    // Configure and start WebGazer
    webgazer
      .setGazeListener(onGazeData)
      .showVideo(false)
      .showFaceOverlay(false)
      .showFaceFeedbackBox(false);

    await webgazer.begin();

    isTracking = true;
    console.log("👁️ WebGazer tracking started.");

  } catch (err) {
    console.error("Camera access denied or unavailable:", err);
    chrome.runtime.sendMessage({ type: "FOCUS_STATE", looking: false });
  }
}

// GAZE HANDLER
function onGazeData(data, timestamp) {
  if (!isTracking) return;

  const now = Date.now();

  // Throttle gaze updates
  if (now - lastSent < THROTTLE_INTERVAL) return;
  lastSent = now;

  let lookingDefined = false;
  let looking = false;

  if (data) {
    lastGazeTime = now;

    // Check if gaze coordinates are within the visible screen
    const withinScreen =
      data.x >= 0 &&
      data.x <= window.innerWidth &&
      data.y >= 0 &&
      data.y <= window.innerHeight;

    lookingDefined = true;
    looking = withinScreen;
  } else if (now - lastGazeTime > AWAY_TIMEOUT) {
    // No gaze data for too long -> not looking
    lookingDefined = true;
    looking = false;
  }

  if (lookingDefined) {
    // Send state changes
    updateFocusState(looking);
    // Send periodic heartbeat for scoring
    chrome.runtime.sendMessage({ type: "FOCUS_TICK", looking });
  }
}

// START / STOP TRACKING CONTROL
function startTracking() {
  if (isTracking) return;
  initCameraAndTracking();
}

function stopTracking() {
  if (!isTracking) return;
  isTracking = false;
  webgazer.pause();
  console.log("Tracking paused.");
}

// UPDATE FOCUS STATE (send to background)
function updateFocusState(looking) {
  if (lastLooking !== looking) {
    lastLooking = looking;
    chrome.runtime.sendMessage({ type: "FOCUS_STATE", looking });
    console.log(looking ? "Looking at screen" : "Looked away");
  }
}

// MESSAGE HANDLER (from popup)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "CONTROL_TRACKING") {
    if (msg.action === "start") {
      userEnabled = true;
      startTracking();
    }
    if (msg.action === "stop") {
      userEnabled = false;
      stopTracking();
    }
  }
});


// Auto-pause/resume only if user enabled tracking
document.addEventListener('visibilitychange', () => {
  if (!userEnabled) return;
  if (document.visibilityState === 'hidden') {
    stopTracking();
  } else if (document.visibilityState === 'visible') {
    startTracking();
  }
});

window.addEventListener('blur', () => { if (userEnabled) stopTracking(); });
window.addEventListener('focus', () => { if (userEnabled) startTracking(); });