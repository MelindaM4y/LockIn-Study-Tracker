// Simple content script - just relay tab visibility state to background
// (WebGazer tracking code removed - now runs in popup)

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
