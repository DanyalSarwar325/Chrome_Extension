// popup.js
async function handleAutofill() {
  const btn = document.getElementById('autofillBtn');
  const content = document.getElementById('btnContent');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Inject content script directly
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    // Send autofill message
    await chrome.tabs.sendMessage(tab.id, { action: 'autofill' });

    // Success UI feedback
    btn.classList.add('success');
    content.innerHTML = `
      <svg viewBox="0 0 24 24" fill="white" width="15" height="15">
        <polyline points="20 6 9 17 4 12" stroke="white" stroke-width="2.5" 
        fill="none" stroke-linecap="round"/>
      </svg>
      Autofilled!
    `;

    setTimeout(() => {
      btn.classList.remove('success');
      content.innerHTML = `Autofill Now`;
    }, 2500);

  } catch (err) {
    console.error('[Popup] Error:', err);
  }
}

// Attach button listener after DOM loads
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('autofillBtn').addEventListener('click', handleAutofill);
});