// Content script - runs WebGazer in the actual browser tab for accurate gaze tracking

let isTracking = false;
let lastGazeSent = 0;
let webgazerLoaded = false;

// Function to inject and initialize WebGazer
async function initializeWebGazer() {
  if (webgazerLoaded) {
    console.log('WebGazer already loaded, starting...');
    await startWebGazer();
    return;
  }
  
  console.log('Injecting WebGazer script...');
  
  try {
    // Inject WebGazer script into the page
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('webgazer.js');
    script.onload = async () => {
      console.log('WebGazer script loaded in tab');
      webgazerLoaded = true;
      await startWebGazer();
    };
    script.onerror = (err) => {
      console.error('Failed to load WebGazer script:', err);
    };
    (document.head || document.documentElement).appendChild(script);
  } catch (err) {
    console.error('Failed to inject WebGazer:', err);
  }
}

// Start WebGazer tracking
async function startWebGazer() {
  console.log('startWebGazer called, checking for webgazer...');
  
  // Wait for webgazer to be available (max 5 seconds)
  let attempts = 0;
  while (!window.webgazer && attempts < 50) {
    console.log('Waiting for WebGazer to load... attempt', attempts);
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  if (!window.webgazer) {
    console.error('WebGazer not available after 5 seconds');
    return;
  }
  
  console.log('WebGazer is available, requesting camera permission...');
  
  try {
    // Request camera permission explicitly first
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    console.log('✅ Camera permission granted! Stream:', stream);
    console.log('Video tracks:', stream.getVideoTracks());
    
    // Stop the test stream since WebGazer will create its own
    stream.getTracks().forEach(track => {
      console.log('Stopping track:', track.label);
      track.stop();
    });
    
    // Suppress HTTPS alert
    const originalAlert = window.alert;
    window.alert = () => {};
    
    console.log('Configuring WebGazer settings...');
    
    window.webgazer
      .setGazeListener((data, timestamp) => {
        if (!isTracking) return;
        
        // Throttle to once per second
        const now = Date.now();
        if (now - lastGazeSent < 1000) {
          return;
        }
        lastGazeSent = now;
        
        // Get screen dimensions
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        
        // Send gaze data to background (even if null)
        chrome.runtime.sendMessage({
          type: 'GAZE_DATA',
          data,
          timestamp,
          screenWidth,
          screenHeight
        }).catch(err => console.log('Message error:', err));
        
        if (data) {
          console.log('Gaze in tab:', data.x.toFixed(1), data.y.toFixed(1));
        } else {
          console.log('No gaze data (face not detected)');
        }
      })
      .showVideo(true)
      .showFaceOverlay(true)
      .showFaceFeedbackBox(true)
      .showPredictionPoints(true)
      .saveDataAcrossSessions(true)
      .applyKalmanFilter(true);
    
    console.log('Calling webgazer.begin()...');
    
    // Add timeout to webgazer.begin()
    const beginPromise = window.webgazer.begin();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('WebGazer begin() timed out after 10 seconds')), 10000)
    );
    
    await Promise.race([beginPromise, timeoutPromise]);
    
    window.alert = originalAlert;
    
    console.log('✅ WebGazer.begin() completed! Checking if video is showing...');
    
    // Check if video element exists
    const videoElement = document.querySelector('#webgazerVideoFeed');
    if (videoElement) {
      console.log('✅ Video element found:', videoElement);
      console.log('Video dimensions:', videoElement.videoWidth, 'x', videoElement.videoHeight);
    } else {
      console.warn('⚠️ Video element not found in DOM');
    }
    
    console.log('✅ WebGazer started successfully! You should see the video feed and red prediction dot.');
  } catch (err) {
    console.error('❌ Failed to start WebGazer:', err);
    if (err.name === 'NotAllowedError') {
      console.error('Camera permission denied by user');
    } else if (err.message.includes('timeout')) {
      console.error('WebGazer took too long to initialize. This might be a WebGazer issue.');
    }
  }
}

// Listen for control messages from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('Content script received message:', msg);
  
  if (msg.type === 'CONTROL_TRACKING') {
    if (msg.action === 'start') {
      console.log('Starting tracking...');
      isTracking = true;
      if (!webgazerLoaded) {
        console.log('WebGazer not loaded yet, initializing...');
        initializeWebGazer();
      } else if (window.webgazer) {
        console.log('WebGazer already loaded, resuming...');
        window.webgazer.resume();
      }
      console.log('Tracking started in tab');
      sendResponse({ success: true, action: 'started' });
    } else if (msg.action === 'stop') {
      console.log('Stopping tracking...');
      isTracking = false;
      if (window.webgazer) {
        window.webgazer.pause();
      }
      console.log('Tracking stopped in tab');
      sendResponse({ success: true, action: 'stopped' });
    }
    return true; // Keep message channel open for async response
  }
});

// Track tab visibility
document.addEventListener('visibilitychange', () => {
  chrome.runtime.sendMessage({
    type: 'TAB_VISIBILITY',
    visible: document.visibilityState === 'visible'
  }).catch(() => {});
});

window.addEventListener('focus', () => {
  chrome.runtime.sendMessage({
    type: 'TAB_VISIBILITY',
    visible: true
  }).catch(() => {});
});

window.addEventListener('blur', () => {
  chrome.runtime.sendMessage({
    type: 'TAB_VISIBILITY',
    visible: false
  }).catch(() => {});
});

console.log('LockIn content script loaded on', location.href);

