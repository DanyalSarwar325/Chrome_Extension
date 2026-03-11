// ============================================
// Eightfold Autofill - content.js
// ============================================


// Helper: Fill a standard text input (handles React/Vue controlled inputs)
function fillInput(selector, value) {
  const el = document.querySelector(selector);
  if (!el) {
    console.warn(`Autofill Field not found: ${selector}`);
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

  console.log(`Autofill   Filled: ${selector} → "${value}"`);
  return true;
}

function mapVeteranStatus(value) {
  const val = value.toLowerCase().trim();
  if (val.includes('not') || val === 'no') {
    return 'not a protected veteran'; // partial match will find it
  } else if (val.includes('yes') || val.includes('veteran')) {
    return 'I identify as one or more';
  } else {
    return "don't wish"; // fallback
  }
}

function mapWorkPreference(value) {
  const val = value.toLowerCase().trim();
  
  if (val === 'hybrid') {
    return 'Hybrid, 2-3 days in office';
  } else if (val === 'remote') {
    return 'Fully Remote';
  } else if (val === 'onsite' || val === 'on-site') {
    return 'On-Site, 5 days in office';
  } else {
    return value; // fallback to original
  }
}
async function fillDropdown(selector, value) {
  const field = document.querySelector(selector);
  if (!field) {
    console.warn(`Autofill Dropdown not found: ${selector}`);
    return false;
  }

  const valueLower = String(value ?? '').toLowerCase().trim();
  if (!valueLower) {
    console.warn(`Autofill Empty dropdown value for: ${selector}`);
    return false;
  }

  field.click();
  field.focus();

  // Wait for dropdown options to render
  await new Promise(r => setTimeout(r, 600));

  const options = document.querySelectorAll('[role="option"]');

  // Try exact match first
  for (let option of options) {
    if (option.textContent.trim().toLowerCase() === valueLower) {
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      option.click();
      console.log(`Autofill   Exact match selected: "${value}"`);
      return true; // ← Stop immediately after clicking once
    }
  }

  // Fall back to partial match
  for (let option of options) {
    if (option.textContent.trim().toLowerCase().includes(valueLower)) {
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      option.click();
      console.log(`Autofill   Partial match selected: "${value}"`);
      return true; // ← Stop immediately after clicking once
    }
  }

  console.warn(`Autofill ⚠️ No match found for: "${value}"`);
  return false;
}

async function fillResume(resumeUrl) {
  try {
        const fileInput = document.querySelectorAll('input[type="file"]')[0];
    // const fileInput = document.querySelector('input[type="file"][accept=".pdf,.doc,.docx,.txt"]');
    // const fileInputs = document.querySelectorAll('input[type="file"]');
// const fileInput = fileInputs[0]; // Cover letter is always second input
    if (!fileInput) {
      console.warn('Autofill Resume input not found');
      return;
    }

    console.log('Autofill 📎 Fetching resume via background...');

    // Ask background.js to fetch (bypasses CORS)
    const result = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: 'fetchResume', url: resumeUrl },
        response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        }
      );
    });

    if (!result.success) throw new Error(result.error);

    // Convert base64 back to blob
    const byteChars = atob(result.data);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteArray[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const file = new File([blob], 'resume.pdf', { type: 'application/pdf' });

    // Inject into file input
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    fileInput.dispatchEvent(new Event('input',  { bubbles: true }));

    console.log('Autofill   Resume uploaded successfully!');

  } catch (err) {
    console.error('Autofill   Resume upload failed:', err);
  }
}

async function fillCoverLetter(coverLetterUrl) {
  try {
//   Fix - target by index directly
    const fileInput = document.querySelectorAll('input[type="file"]')[1];
// const fileInputs = document.querySelectorAll('input[type="file"]');
// const fileInput = fileInputs[1]; // Cover letter is always second input
    if (!fileInput) {
      console.warn('Autofill Cover letter input not found');
      return;
    }

    console.log('Autofill 📎 Fetching cover letter...');

    const result = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: 'fetchResume', url: coverLetterUrl }, // reuse same background action
        response => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve(response);
        }
      );
    });

    if (!result.success) throw new Error(result.error);

    const byteChars = atob(result.data);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteArray[i] = byteChars.charCodeAt(i);
    }

    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const file = new File([blob], 'coverletter.pdf', { type: 'application/pdf' });

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    fileInput.dispatchEvent(new Event('input',  { bubbles: true }));

    console.log('Autofill   Cover letter uploaded!');
  } catch (err) {
    console.error('Autofill   Cover letter upload failed:', err);
  }
}
function normalizePhoneType(phoneType) {
  const raw = String(phoneType ?? '').trim();
  if (!raw) return '+1';
  if (raw.startsWith('+')) return raw;

  const aliases = {
    mobile: '+92',       //   "mobile" → Pakistan code
    cell: '+92',
    pakistan: '+92',
    pk: '+92',
    usa: '+1',
    us: '+1',
    'united states': '+1'
  };

  return aliases[raw.toLowerCase()] || raw;
}

async function fillDropdownOrInput(selector, value) {
  const selected = await fillDropdown(selector, value);
  if (!selected) {
    return fillInput(selector, value);
  }
  return true;
}

// Helper: Fill phone type combobox (custom dropdown)
async function fillPhoneType(countryCode) {
  const combobox = document.querySelector('[role="combobox"][placeholder="Select country code"]');
  if (!combobox) {
    console.warn('Autofill Phone type combobox not found');
    return;
  }

  const normalizedCode = normalizePhoneType(countryCode);

  // Click to open dropdown
  combobox.click();
  combobox.focus();

  // Type to filter options
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  nativeInputValueSetter.call(combobox, normalizedCode);
  combobox.dispatchEvent(new Event('input',  { bubbles: true }));
  combobox.dispatchEvent(new Event('change', { bubbles: true }));

  // Wait for dropdown to render filtered options
  await new Promise(r => setTimeout(r, 600));

  // Find and click matching option
  const options = document.querySelectorAll('[role="option"]');
  let matched = false;

  for (let option of options) {
    if (option.textContent.includes(normalizedCode)) {
      option.click();
      matched = true;
      console.log(`Autofill   Phone type selected: "${option.textContent.trim()}"`);
      break;
    }
    if (String(countryCode ?? '').trim() && option.textContent.toLowerCase().includes(String(countryCode).toLowerCase().trim())) {
      option.click();
      matched = true;
      console.log(`Autofill  Phone type selected: "${option.textContent.trim()}"`);
      break;
    }
  }

  if (!matched) {
    console.warn(`Autofill No matching phone type option for: "${normalizedCode}"`);
  }
}
 // Helper: convert boolean to Yes/No
function boolToYesNo(value) {
  return value === true ? 'Yes' : 'No';
}

// ============================================
// MAIN AUTOFILL FUNCTION
// ============================================
async function autofill() {
  console.log('Autofill  Starting autofill...');

  // Load data.json from extension
  const dataUrl = chrome.runtime.getURL('data.json');
  let data;

  try {
    const response = await fetch(dataUrl);
    data = await response.json();
    console.log('Autofill   data.json loaded', data);
  } catch (err) {
    console.error('Autofill  Failed to load data.json:', err);
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

  // ----- RESUME -----
await fillResume(data.resumeUrl);
  // ----- PHONE TYPE (dropdown) -----
  
  await fillPhoneType(data.phoneCountry || data.phoneType);

  // ----- PHONE NUMBER -----
  fillInput('[data-test-id="Contact_Information_phone"]', data.phoneNumber);

  //Source
  await fillDropdown('[aria-labelledby="Source_Applicant_Source_ID_label"]', data.commonQuestions.howDidYouHear);

   //Relocation
  await fillDropdownOrInput(
    '[aria-labelledby="Relocation_Relocation_label"]',
    boolToYesNo(data.willingToRelocate)
  );
  // ----- COVER LETTER -----
if (data.coverLetterUrl) {
  await fillCoverLetter(data.coverLetterUrl);
}

  // In autofill() - no hardcoding needed!
await fillDropdown(
  '[aria-labelledby="Voluntary_Self_Identification_of_Disability_Disability_Status_label"]',
  data.disabilityStatus
);  


// In autofill():
await fillDropdown(
  '[aria-labelledby="_VEVRAA__Veteran_s_Self_Identification_Form__Pre_offer__PERSONAL_INFORMATION_COLLECTION_6_4_label"]',
  mapVeteranStatus(data.veteranStatus)
);
  //Address
  fillInput('[data-test-id="Address_Address_Line_1"]', data.currentAddress.street);

    //city
  fillInput('[data-test-id="Address_City"]', data.currentAddress.city);

   //State
  fillInput('[data-test-id="Address_State"]', data.currentAddress.state);

   //Zip code
  fillInput('[data-test-id="Address_Postal_Code"]', data.currentAddress.zipCode);

     //Country
    await fillDropdownOrInput('[aria-labelledby="Address_Country_Reference_label"]', data.currentAddress.country);

 //Salary
  fillInput('[data-test-id="Application_questions_us_annual_salary"]', data.desiredSalary);

// ----- WORK PREFERENCE -----
await fillDropdown(
  '[aria-labelledby="Application_questions_us_work_pref_label"]',
  mapWorkPreference(data.remoteWorkPreference)  // "hybrid" → "Hybrid, 2-3 days in office"
);

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



  console.log('Autofill 🎉 Autofill complete!');
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
