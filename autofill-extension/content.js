// ============================================
// Eightfold Autofill - content.js
// ============================================

function fillInput(selector, value) {
  const el = document.querySelector(selector);
  if (!el) {
    console.warn(`Autofill Field not found: ${selector}`);
    return false;
  }
  el.focus();
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  nativeInputValueSetter.call(el, value);
  el.dispatchEvent(new Event('input',  { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.blur();
  console.log(`Autofill Filled: ${selector} → "${value}"`);
  return true;
}

function boolToYesNo(value) {
  return value === true ? 'Yes' : 'No';
}

function mapVeteranStatus(value) {
  const val = value.toLowerCase().trim();
  if (val.includes('not') || val === 'no') return 'not a protected veteran';
  if (val.includes('yes') || val.includes('veteran')) return 'I identify as one or more';
  return "don't wish";
}

function mapWorkPreference(value) {
  const val = value.toLowerCase().trim();
  if (val === 'hybrid')  return 'Hybrid, 2-3 days in office';
  if (val === 'remote')  return 'Fully Remote';
  if (val === 'onsite' || val === 'on-site') return 'On-Site, 5 days in office';
  return value;
}

function normalizePhoneType(phoneType) {
  const raw = String(phoneType ?? '').trim();
  if (!raw) return '+92';
  if (raw.startsWith('+')) return raw;
  const aliases = {
    mobile: '+92', cell: '+92', pakistan: '+92', pk: '+92',
    usa: '+1', us: '+1', 'united states': '+1'
  };
  return aliases[raw.toLowerCase()] || raw;
}

async function fillDropdown(selector, value) {
  const field = document.querySelector(selector);
  if (!field) {
    console.warn(`Autofill Dropdown not found: ${selector}`);
    return false;
  }
  const valueLower = String(value ?? '').toLowerCase().trim();
  if (!valueLower) return false;

  field.click();
  field.focus();
  await new Promise(r => setTimeout(r, 600));

  const options = document.querySelectorAll('[role="option"]');

  for (let option of options) {
    if (option.textContent.trim().toLowerCase() === valueLower) {
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      option.click();
      console.log(`Autofill Exact match: "${value}"`);
      await new Promise(r => setTimeout(r, 300));
      return true;
    }
  }
  for (let option of options) {
    if (option.textContent.trim().toLowerCase().includes(valueLower)) {
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      option.click();
      console.log(`Autofill Partial match: "${value}"`);
      await new Promise(r => setTimeout(r, 300));
      return true;
    }
  }
  console.warn(`Autofill No match: "${value}"`);
  return false;
}

async function fillPhoneType(countryCode) {
  const combobox = document.querySelector('[role="combobox"][placeholder="Select country code"]');
  if (!combobox) { console.warn('Autofill Phone combobox not found'); return; }

  const normalizedCode = normalizePhoneType(countryCode);
  combobox.click();
  combobox.focus();

  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  nativeSetter.call(combobox, normalizedCode);
  combobox.dispatchEvent(new Event('input',  { bubbles: true }));
  combobox.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 600));

  const options = document.querySelectorAll('[role="option"]');
  for (let option of options) {
    if (option.textContent.includes(normalizedCode)) {
      option.click();
      console.log(`Autofill Phone type: "${option.textContent.trim()}"`);
      return;
    }
  }
  console.warn(`Autofill Phone type not found: "${normalizedCode}"`);
}

async function fillResume(resumeUrl) {
  try {
    const fileInput = document.querySelectorAll('input[type="file"]')[0];
    if (!fileInput) { console.warn('Autofill Resume input not found'); return; }

    const result = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'fetchResume', url: resumeUrl }, response => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(response);
      });
    });

    if (!result.success) throw new Error(result.error);

    const byteChars = atob(result.data);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);

    const file = new File([new Blob([byteArray], { type: 'application/pdf' })], 'resume.pdf', { type: 'application/pdf' });
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    fileInput.dispatchEvent(new Event('input',  { bubbles: true }));
    console.log('Autofill Resume uploaded!');
  } catch (err) {
    console.error('Autofill Resume upload failed:', err);
  }
}

async function fillCoverLetter(coverLetterUrl) {
  try {
    const fileInput = document.querySelectorAll('input[type="file"]')[1];
    if (!fileInput) { console.warn('Autofill Cover letter input not found'); return; }

    const result = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'fetchResume', url: coverLetterUrl }, response => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(response);
      });
    });

    if (!result.success) throw new Error(result.error);

    const byteChars = atob(result.data);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);

    const file = new File([new Blob([byteArray], { type: 'application/pdf' })], 'coverletter.pdf', { type: 'application/pdf' });
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    fileInput.dispatchEvent(new Event('input',  { bubbles: true }));
    console.log('Autofill Cover letter uploaded!');
  } catch (err) {
    console.error('Autofill Cover letter upload failed:', err);
  }
}

// ============================================
// MAIN AUTOFILL FUNCTION
// ============================================
async function autofill() {
  console.log('Autofill Starting...');

  const dataUrl = chrome.runtime.getURL('data.json');
  let data;
  try {
    const response = await fetch(dataUrl);
    data = await response.json();
    console.log('Autofill data.json loaded', data);
  } catch (err) {
    console.error('Autofill Failed to load data.json:', err);
    return;
  }

  await new Promise(r => setTimeout(r, 300));
  

  // TEXT FIELDS
  fillInput('[data-test-id="Contact_Information_firstname"]', data.firstName);
  fillInput('[data-test-id="Contact_Information_lastname"]',  data.lastName);
  fillInput('[data-test-id="Contact_Information_email"]',     data.email);

  // PHONE
  await fillPhoneType(data.phoneCountry || data.phoneType);
  await new Promise(r => setTimeout(r, 400));
  fillInput('[data-test-id="Contact_Information_phone"]', data.phoneNumber);

  // SOURCE
  await fillDropdown('[aria-labelledby="Source_Applicant_Source_ID_label"]', data.commonQuestions.howDidYouHear);
  await new Promise(r => setTimeout(r, 400));

  // RELOCATION
  await fillDropdown('[aria-labelledby="Relocation_Relocation_label"]', boolToYesNo(data.willingToRelocate));
  await new Promise(r => setTimeout(r, 400));

  // DISABILITY
  await fillDropdown('[aria-labelledby="Voluntary_Self_Identification_of_Disability_Disability_Status_label"]', data.disabilityStatus);
  await new Promise(r => setTimeout(r, 400));

  // VETERAN
  await fillDropdown('[aria-labelledby="_VEVRAA__Veteran_s_Self_Identification_Form__Pre_offer__PERSONAL_INFORMATION_COLLECTION_6_4_label"]', mapVeteranStatus(data.veteranStatus));
  await new Promise(r => setTimeout(r, 400));

  // ADDRESS
  fillInput('[data-test-id="Address_Address_Line_1"]', data.currentAddress.street);
  fillInput('[data-test-id="Address_City"]',           data.currentAddress.city);
  fillInput('[data-test-id="Address_State"]',          data.currentAddress.state);
  fillInput('[data-test-id="Address_Postal_Code"]',    data.currentAddress.zipCode);

  // COUNTRY
  await fillDropdown('[aria-labelledby="Address_Country_Reference_label"]', data.currentAddress.country);
  await new Promise(r => setTimeout(r, 400));

  // SALARY
  fillInput('[data-test-id="Application_questions_us_annual_salary"]', data.desiredSalary);

  // WORK PREFERENCE
  await fillDropdown('[aria-labelledby="Application_questions_us_work_pref_label"]', mapWorkPreference(data.remoteWorkPreference));
  await new Promise(r => setTimeout(r, 400));

  // AUTHORIZE TO WORK
  await fillDropdown('[aria-labelledby="Position_Specific_Questions_QUESTION_SETUP_6_24_label"]', boolToYesNo(data.authorizedToWork));
  await new Promise(r => setTimeout(r, 400));

  // SPONSORSHIP
  await fillDropdown('[aria-labelledby="Position_Specific_Questions_QUESTION_SETUP_6_25_label"]', boolToYesNo(data.requireSponsorship));
  await new Promise(r => setTimeout(r, 400));

  // FILES LAST
  
   await fillResume(data.resumeUrl);
  await new Promise(r => setTimeout(r, 1000));
  if (data.coverLetterUrl) {
    await fillCoverLetter(data.coverLetterUrl);
  }

  console.log('Autofill Complete!');
}

// ============================================
// LISTEN FOR MESSAGE FROM popup.html
// ============================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'autofill') {
    autofill()
      .then(() => sendResponse({ status: 'done' }))
      .catch(err => sendResponse({ status: 'error', message: err.message }));
    return true;
  }
  return true;
});