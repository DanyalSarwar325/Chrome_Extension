// ============================================
// Eightfold Autofill - content.js
// ============================================


// Helper: Fill a standard text input (handles React/Vue controlled inputs)
function fillInput(selector, value) {
  const el = document.querySelector(selector);
  if (!el) {
    console.warn(`[Autofill] Field not found: ${selector}`);
    return false;
  }

  // Focus the field first
  el.focus();

  // Set value using native input value setter (works with React)
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  nativeInputValueSetter.call(el, value);

  // Dispatch events so the framework registers the change
  el.dispatchEvent(new Event('input',  { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.blur();

  console.log(`[Autofill] ✅ Filled: ${selector} → "${value}"`);
  return true;
}

async function fillDropdown(selector, value) {
  const field = document.querySelector(selector);
  if (!field) return;

  field.click();
  field.focus();
  await new Promise(r => setTimeout(r, 600));

  const options = document.querySelectorAll('[role="option"]');
  const valueLower = value.toLowerCase();

  // First try exact match
  for (let option of options) {
    if (option.textContent.trim().toLowerCase() === valueLower) {
      option.click();
      console.log(`[Autofill] ✅ Exact match: "${value}"`);
      return;
    }
  }

  // Fall back to partial match
  for (let option of options) {
    if (option.textContent.trim().toLowerCase().includes(valueLower)) {
      option.click();
      console.log(`[Autofill] ✅ Partial match: "${value}"`);
      return;
    }
  }

  console.warn(`[Autofill] ⚠️ No match found for: "${value}"`);
}

// Helper: Fill phone type combobox (custom dropdown)
async function fillPhoneType(countryCode) {
  const combobox = document.querySelector('[role="combobox"][placeholder="Select country code"]');
  if (!combobox) {
    console.warn('[Autofill] Phone type combobox not found');
    return;
  }

  // Click to open dropdown
  combobox.click();
  combobox.focus();

  // Type to filter options
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  nativeInputValueSetter.call(combobox, countryCode);
  combobox.dispatchEvent(new Event('input',  { bubbles: true }));
  combobox.dispatchEvent(new Event('change', { bubbles: true }));

  // Wait for dropdown to render filtered options
  await new Promise(r => setTimeout(r, 600));

  // Find and click matching option
  const options = document.querySelectorAll('[role="option"]');
  let matched = false;

  for (let option of options) {
    if (option.textContent.includes(countryCode)) {
      option.click();
      matched = true;
      console.log(`[Autofill] ✅ Phone type selected: "${option.textContent.trim()}"`);
      break;
    }
  }

  if (!matched) {
    console.warn(`[Autofill] ⚠️ No matching phone type option for: "${countryCode}"`);
  }
}

// ============================================
// MAIN AUTOFILL FUNCTION
// ============================================
async function autofill() {
  console.log('[Autofill] 🚀 Starting autofill...');

  // Load data.json from extension
  const dataUrl = chrome.runtime.getURL('data.json');
  let data;

  try {
    const response = await fetch(dataUrl);
    data = await response.json();
    console.log('[Autofill] ✅ data.json loaded', data);
  } catch (err) {
    console.error('[Autofill] ❌ Failed to load data.json:', err);
    return;
  }

  // Small delay to ensure page fields are ready
  await new Promise(r => setTimeout(r, 300));

  // ----- FIRST NAME -----
  fillInput('[data-test-id="Contact_Information_firstname"]', data.firstName);

  // ----- LAST NAME -----
  fillInput('[data-test-id="Contact_Information_lastname"]', data.lastName);

  // ----- EMAIL -----
  fillInput('[data-test-id="Contact_Information_email"]', data.email);

  // ----- PHONE TYPE (dropdown) -----
  // data.json phoneType should be a country code e.g. "+1"
  await fillPhoneType(data.phoneType);

  // ----- PHONE NUMBER -----
  fillInput('[data-test-id="Contact_Information_phone"]', data.phoneNumber);

  //Source

  // Normalize 'howDidYouHear' for dropdown: accept 'LinkedIn' (any case), send 'Linkedin' to application
  let howDidYouHear = data.commonQuestions.howDidYouHear;
  if (typeof howDidYouHear === 'string' && howDidYouHear.trim().toLowerCase() === 'linkedin') {
    howDidYouHear = 'Linkedin';
  }
  await fillDropdown('[aria-labelledby="Source_Applicant_Source_ID_label"]', howDidYouHear);

   //Relocation
  fillInput('[aria-labelledby="Relocation_Relocation_label"]', data.willingToRelocate);

    //city
  fillInput('[data-test-id="Address_City"]', data.currentAddress.city);

   //State
  fillInput('[data-test-id="Address_State"]', data.currentAddress.state);

   //Zip code
  fillInput('[data-test-id="Address_Postal_Code"]', data.currentAddress.zipCode);

     //Country
  fillInput('[aria-labelledby="Address_Country_Reference_label"]', data.currentAddress.country);

 //Salary
  fillInput('[data-test-id="Application_questions_apac_annual_salary"]', data.desiredSalary);

 // Helper: convert boolean to Yes/No
function boolToYesNo(value) {
  return value === true ? 'Yes' : 'No';
}

// Authorize To Work
await fillDropdown(
  '[aria-labelledby="Position_Specific_Questions_QUESTION_SETUP_6_24_label"]',
  boolToYesNo(data.authorizedToWork)  // true → "Yes"
);

// Sponsorship
await fillDropdown(
  '[aria-labelledby="Position_Specific_Questions_QUESTION_SETUP_6_25_label"]',
  boolToYesNo(data.requireSponsorship)  // false → "No"
);

await fillDropdown(
    '[aria-labelledby="Source_Applicant_Source_ID_label"]', (data.commonQuestions.howDidYouHear)
)

  console.log('[Autofill] 🎉 Autofill complete!');
}

// ============================================
// LISTEN FOR MESSAGE FROM popup.html
// ============================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'autofill') {
    autofill().then(() => {
      sendResponse({ status: 'done' });
    });
    return true; // Keep channel open for async response
  }
});
