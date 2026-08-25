import { google } from 'googleapis'

export const USER_SPREADSHEET_ID = process.env.USER_SPREADSHEET_ID || '1KC9kf3igF8xRm1MVaSmUhqCjLKJWArH-iKeYhBBVwnw'
export const QUIZ_SPREADSHEET_ID = process.env.QUIZ_SPREADSHEET_ID || '1KJeB29Iyg-JBM-NvgYEt9yPFU8SRNqf1XehCD6Phmho'

function getAppsScriptUrl() {
  return process.env.GOOGLE_APPS_SCRIPT_URL || process.env.VITE_GOOGLE_APPS_SCRIPT_URL || ''
}

export async function callAppsScriptApi(action, payload = {}) {
  const appsScriptUrl = getAppsScriptUrl()
  if (!appsScriptUrl) {
    return null
  }

  try {
    const delimiter = appsScriptUrl.includes('?') ? '&' : '?'
    const requestUrl = `${appsScriptUrl}${delimiter}action=${encodeURIComponent(action)}`

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action,
        data: payload
      })
    })

    if (!response.ok) {
      throw new Error(`Google Apps Script HTTP error! Status: ${response.status}`)
    }

    const result = await response.json()
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid response received from Google Apps Script backend.')
    }

    if (!result.success) {
      throw new Error(result.error || `Google Apps Script operation failed for action '${action}'.`)
    }

    return result
  } catch (err) {
    throw new Error(`Failed to communicate with Google Apps Script [action: ${action}]: ${err.message}`)
  }
}

let sheetsClient = null

export function getSheetsClient() {
  if (sheetsClient) return sheetsClient

  try {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      const auth = new google.auth.JWT(
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        null,
        process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/spreadsheets']
      )
      sheetsClient = google.sheets({ version: 'v4', auth })
      return sheetsClient
    } else if (process.env.GOOGLE_SHEETS_API_KEY) {
      sheetsClient = google.sheets({ version: 'v4', auth: process.env.GOOGLE_SHEETS_API_KEY })
      return sheetsClient
    }
  } catch (err) {
    throw new Error(`Failed to initialize Google Sheets client: ${err.message}`)
  }
  return null
}

export async function getSheetRows(spreadsheetId, sheetName) {
  const client = getSheetsClient()
  if (!client) {
    throw new Error('Google Sheets client is not configured. Please set GOOGLE_APPS_SCRIPT_URL or Google Service Account environment variables.')
  }

  try {
    const res = await client.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`
    })

    const values = res.data.values || []
    if (values.length <= 1) return []

    const headers = values[0]
    const rows = []

    for (let i = 1; i < values.length; i++) {
      const row = {}
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[i][j] !== undefined ? values[i][j] : ''
      }
      rows.push(row)
    }

    return rows
  } catch (err) {
    throw new Error(`Failed to fetch data from Google Sheet tab '${sheetName}': ${err.message}`)
  }
}

export async function appendSheetRow(spreadsheetId, sheetName, rowValues) {
  const client = getSheetsClient()
  if (!client) {
    throw new Error('Google Sheets client is not configured. Please set GOOGLE_APPS_SCRIPT_URL or Google Service Account environment variables.')
  }

  try {
    await client.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowValues]
      }
    })
  } catch (err) {
    throw new Error(`Failed to append row to Google Sheet tab '${sheetName}': ${err.message}`)
  }
}
