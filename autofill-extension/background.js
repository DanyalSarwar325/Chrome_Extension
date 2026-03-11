// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetchResume') {
    fetch(message.url)
      .then(response => response.arrayBuffer())
      .then(buffer => {
        // Convert to base64 to pass through message
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => 
            data + String.fromCharCode(byte), '')
        );
        sendResponse({ success: true, data: base64 });
      })
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async
  }
});