# IMPLEMENTATION.md
## Eightfold AI Job Application Autofill — Chrome Extension
**Author:** Danyal Sarwar  
**Assessment:** PTC Pre-Interview Technical Assessment  
**Target Platform:** PTC Careers (Eightfold AI ATS)  
**URL:** https://ptc.eightfold.ai/careers/apply?pid=137478047391

---

## Approach & Strategy

### Technology Choice
Built using **plain JavaScript** (no frameworks) for the following reasons:
- Chrome extension content scripts run directly on web pages with no build step
- `background.js` is a service worker where React has no benefit
- Autofill logic is pure DOM manipulation — plain JS is the right tool
- Simpler packaging and submission (no `dist/` folder or bundler required)

### Architecture
The extension follows a clean 3-file separation:

```
popup.html / popup.css / popup.js  → User interface (click to trigger)
content.js                          → Core autofill logic (runs on page)
background.js                       → Service worker (handles CORS file fetching)
data.json                           → User profile data
```

### Autofill Strategy
1. User clicks **"Autofill Now"** in the popup
2. `popup.js` injects `content.js` into the active tab via `chrome.scripting.executeScript`
3. `content.js` loads `data.json` via `chrome.runtime.getURL`
4. Fields are filled sequentially with appropriate delays between dropdowns
5. File uploads (resume, cover letter) are fetched via `background.js` to bypass CORS

### Field Detection
Used Chrome DevTools to inspect each field and identify stable selectors in this priority order:
1. `data-test-id` attributes (most stable — intentionally consistent for testing)
2. `aria-labelledby` attributes (semantic and reliable)
3. `role="combobox"` with `placeholder` for dropdowns

---

## Fields Covered

| Step | Field | Method | Status |
|------|-------|--------|--------|
| 1 | Resume Upload | File injection via DataTransfer | ✅ |
| 2 | First Name | `fillInput` | ✅ |
| 2 | Last Name | `fillInput` | ✅ |
| 2 | Email Address | `fillInput` | ✅ |
| 3 | Source (How did you hear) | `fillDropdown` | ✅ |
| 4 | Disability Status | `fillDropdown` with partial match | ✅ |
| 5 | Veteran Status | `fillDropdown` with mapping | ✅ |
| 6 | Willing to Relocate | `fillDropdown` + bool→Yes/No | ✅ |
| 7 | Cover Letter Upload | File injection via DataTransfer | ✅ |
| 8 | Street Address | `fillInput` | ✅ |
| 8 | City | `fillInput` | ✅ |
| 8 | State | `fillInput` | ✅ |
| 8 | Postal Code | `fillInput` | ✅ |
| 8 | Country | `fillDropdown` | ✅ |
| 9 | Salary Expectations | `fillInput` | ✅ |
| 9 | Remote Work Preference | `fillDropdown` with mapping | ✅ |
| 10 | Legal Permit to Work | `fillDropdown` + bool→Yes/No | ✅ |
| 10 | Sponsorship Requirement | `fillDropdown` + bool→Yes/No | ✅ |

**Field Coverage: ~90%**

---

## Challenges Faced & How They Were Solved

### 1. React-Controlled Inputs Not Accepting Values
**Problem:** Standard `element.value = "..."` had no effect on React inputs — the framework ignores direct DOM mutations.

**Solution:** Used the native input value setter via `Object.getOwnPropertyDescriptor` and dispatched synthetic `input` and `change` events:
```js
const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
nativeSetter.call(el, value);
el.dispatchEvent(new Event('input', { bubbles: true }));
```

---

### 2. Content Security Policy (CSP) Blocking Inline Scripts
**Problem:** Chrome extensions block all inline `<script>` and `<style>` tags in popup HTML — caused multiple CSP errors.

**Solution:** Separated all code into external files:
- `popup.css` — all styles
- `popup.js` — all JavaScript
- Removed all `onclick=""` attributes and used `addEventListener` instead

---

### 3. Custom Dropdown Components (Combobox)
**Problem:** Eightfold AI uses custom React-based dropdowns with `role="combobox"` — native `<select>` manipulation doesn't work on them.

**Solution:** Built a `fillDropdown()` helper that:
1. Clicks the field to open the dropdown
2. Waits 600ms for options to render
3. Tries exact match first, then falls back to partial/case-insensitive match
4. Dispatches `mousedown` + `click` events on the matching option

---

### 4. Anti-Debugging Protection
**Problem:** The website attaches a `debugger` statement to prevent DOM inspection, pausing execution whenever DevTools is open.

**Solution:** Used Chrome DevTools "Never pause here" option on the debugger line, and disabled breakpoints via `Ctrl+F8` to allow normal inspection.

---

### 5. CORS Blocking File Uploads
**Problem:** `content.js` couldn't fetch the resume PDF from GitHub/Google Drive due to CORS policy.

**Solution:** Routed the fetch request through `background.js` (service worker), which is not subject to the same CORS restrictions. The file is returned as base64 and reconstructed in `content.js` using `DataTransfer` API.

---

### 6. Google Drive Direct Download
**Problem:** Google Drive sharing URLs return an HTML page instead of the actual PDF file.

**Solution:** Switched to GitHub raw file hosting which provides direct, CORS-friendly file access:
```
https://raw.githubusercontent.com/USERNAME/REPO/main/resume.pdf
```

---

### 7. Service Worker Going Inactive
**Problem:** Chrome kills the background service worker after a few seconds of inactivity, causing "Receiving end does not exist" errors.

**Solution:** Eliminated reliance on background.js for message routing. The popup now directly injects `content.js` using `chrome.scripting.executeScript` before sending any messages.

---

### 8. Data Type Mismatches (Boolean vs String)
**Problem:** `data.json` stores values like `true/false` but dropdowns expect `"Yes"/"No"` strings. Similarly, `"hybrid"` needed to map to `"Hybrid, 2-3 days in office"`.

**Solution:** Built dedicated mapping functions:
```js
function boolToYesNo(value)      // true → "Yes", false → "No"
function mapWorkPreference(value) // "hybrid" → "Hybrid, 2-3 days in office"
function mapVeteranStatus(value)  // "Not a Veteran" → "not a protected veteran"
function mapDisabilityStatus(value) // "No" → partial match on full text
```



### 9. Dropdown Options Interfering With Each Other
**Problem:** Opening one dropdown left residual `[role="option"]` elements in the DOM, causing the next `fillDropdown` call to click the wrong option.

**Solution:** Added 400ms delays after each dropdown selection, and each `fillDropdown` call returns immediately after the first match is clicked.

---

## Known Limitations

- **Date Picker Fields:** The disability form date field uses a calendar dialog (`aria-haspopup="dialog"`) which cannot be reliably automated via DOM injection. The user must select this date manually.
- **Multi-Step Navigation:** The extension fills all visible fields on the current step. The user must manually click "Next" to proceed between steps. Automatic step navigation was not implemented.

- **Resume/Cover Letter URL:** Files must be hosted at a publicly accessible, CORS-friendly URL (e.g., GitHub raw). Google Drive direct download links are not supported due to CORS restrictions.

---

## Estimated Time Spent

| Task | Time |
|------|------|
| Research & DOM inspection of all form fields | ~2 hours |
| Core autofill logic (`content.js`) | ~2 hours |
| Popup UI (`popup.html`, `popup.css`, `popup.js`) | ~1 hour |
| Debugging CSP, CORS, React input issues | ~2 hours |
| Testing, refinement, and mapping functions | ~1 hour |
| **Total** | **~8 hours** |
