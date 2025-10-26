// Simple content script - just relay tab visibility state to background

document.addEventListener('visibilitychange', () => {
  chrome.runtime.sendMessage({
    type: 'TAB_VISIBILITY',
    visible: document.visibilityState === 'visible'
  });
});

window.addEventListener('focus', () => {
  chrome.runtime.sendMessage({
    type: 'TAB_VISIBILITY',
    visible: true
  });
});

window.addEventListener('blur', () => {
  chrome.runtime.sendMessage({
    type: 'TAB_VISIBILITY',
    visible: false
  });
});

console.log('LockIn content script loaded on', location.href);
