// Keep service worker alive
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] Extension installed/reloaded');
});

// Reactivate on any message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Message received:', message);
  sendResponse({ status: 'active' });
  return true;
});