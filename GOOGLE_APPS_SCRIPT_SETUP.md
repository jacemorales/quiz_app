# Google Apps Script Setup & Integration Guide for Quiz Hub

This document explains step-by-step how to deploy the Google Apps Script backend and connect it to your Quiz Hub web application.

---

## Google Spreadsheet IDs

The application uses two Google Spreadsheets as persistent databases:

1. **User Spreadsheet ID**:
   `1KC9kf3igF8xRm1MVaSmUhqCjLKJWArH-iKeYhBBVwnw`

2. **Quiz Spreadsheet ID**:
   `1KJeB29Iyg-JBM-NvgYEt9yPFU8SRNqf1XehCD6Phmho`

---

## Step 1: Open Google Apps Script

1. Open one of your Google Spreadsheets (or go directly to [script.google.com](https://script.google.com)).
2. In the Spreadsheet top menu bar, click:
   **Extensions → Apps Script**

---

## Step 2: Copy `Code.gs`

1. In the left panel of the Apps Script editor, locate `Code.gs` (or rename the default script file to `Code.gs`).
2. Delete any default code inside `Code.gs`.
3. Open `google-apps-script/Code.gs` from the Quiz Hub project repo.
4. Copy the entire contents of `Code.gs` and paste it into the Apps Script editor.

---

## Step 3: Verify Spreadsheet IDs

Ensure lines 9 & 10 at the top of `Code.gs` match your spreadsheet IDs:

```javascript
var USER_SPREADSHEET_ID = '1KC9kf3igF8xRm1MVaSmUhqCjLKJWArH-iKeYhBBVwnw';
var QUIZ_SPREADSHEET_ID = '1KJeB29Iyg-JBM-NvgYEt9yPFU8SRNqf1XehCD6Phmho';
```

*(Note: If Google Apps Script prompts for permissions when executing, run `ensureSheetStructures()` once manually inside the editor to authorize spreadsheet access.)*

---

## Step 4: Deploy as a Web App

1. In the top right of the Apps Script interface, click **Deploy → New deployment**.
2. Click the gear icon next to **Select type** and choose **Web app**.
3. Fill in the deployment details:
   - **Description**: `Quiz Hub Backend API`
   - **Execute as**: `Me (your email address)`
   - **Who has access**: `Anyone` *(Required so participants & users can access the API without logging into Google)*
4. Click **Deploy**.
5. Grant permissions if prompted by Google.
6. Copy the generated **Web App URL** (it looks like `https://script.google.com/macros/s/.../exec`).

---

## Step 5: Configure Quiz Hub Environment

1. In the Quiz Hub project root directory, open or create your `.env` file (or set environment variables in hosting provider such as Vercel/Netlify):

```env
VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYED_SCRIPT_ID/exec
```

2. Replace `YOUR_DEPLOYED_SCRIPT_ID` with your actual Apps Script deployment URL.

---

## Step 6: Test Google Sheets Persistence

Perform this complete verification sequence:

1. Start/restart the Quiz Hub development server:
   ```bash
   npm run dev
   ```
2. **Create Account**:
   Go to `/register`, enter account details, and click **Create Account**.
3. **Create Quiz**:
   Click **+ Create Quiz**, fill out details, add questions, set navigation settings, and click **Generate Quiz**.
4. **Verify Google Sheets**:
   Check your Google Spreadsheets (`Users`, `Quizzes`, `Questions`, `Options`). You will see the new user and quiz records appended!
5. **Persistence Check**:
   Refresh your browser, log back in, and verify that your quiz is still present on the Dashboard.
6. **Take & Submit Quiz**:
   Open the generated public Quiz URL, answer the questions, and submit.
7. **Verify Analytics & Attempts**:
   Check the `Attempts` and `Answers` sheets in Google Sheets, then open the **Analytics** page in Quiz Hub to confirm attempt results are reflected.
