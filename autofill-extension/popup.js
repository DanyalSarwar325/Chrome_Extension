// popup.js - All button logic (no inline scripts allowed in Chrome extensions)

async function handleAutofill() {
  const btn = document.getElementById('autofillBtn');
  const btnText = document.getElementById('btnText');
  const statusMsg = document.getElementById('statusMsg');

  // Reset status
  statusMsg.className = 'status-msg hidden';
  btn.disabled = true;
  btnText.textContent = 'Filling...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      throw new Error('No active tab found');
    }

    // Inject content.js into the active tab
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    // Small delay after injection
    await new Promise(r => setTimeout(r, 200));

    // Send autofill message to content.js
    // ❌ Current - waits for response and times out
// const response = await chrome.tabs.sendMessage(tab.id, { action: 'autofill' });

// ✅ Fixed - fire and forget, don't await response
chrome.tabs.sendMessage(tab.id, { action: 'autofill' });

// Just show success immediately after sending
btn.classList.add('success');
btnText.textContent = '✓ Autofilling...';
statusMsg.className = 'status-msg';
statusMsg.textContent = 'Filling fields on the page...';

setTimeout(() => {
  btn.classList.remove('success');
  btnText.textContent = 'Autofill Now';
  statusMsg.className = 'status-msg hidden';
  btn.disabled = false;
}, 3000);


  } catch (err) {
    console.error('[Popup] Error:', err);

    // Error feedback
    btn.classList.add('error');
    btnText.textContent = '✗ Failed';
    statusMsg.className = 'status-msg error-msg';
    statusMsg.textContent = 'Error: ' + err.message;

    setTimeout(() => {
      btn.classList.remove('error');
      btnText.textContent = 'Autofill Now';
      btn.disabled = false;
    }, 3000);
  }
}

// Attach listener after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('autofillBtn').addEventListener('click', handleAutofill);
});
