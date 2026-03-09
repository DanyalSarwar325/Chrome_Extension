// ✅ Fixed code
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'autofill') {
    autofill()
      .then(() => sendResponse({ status: 'done' }))
      .catch((err) => sendResponse({ status: 'error', message: err.message }));
    return true; // MUST return true to keep channel open
  }
  return true; // return true outside if block too
});