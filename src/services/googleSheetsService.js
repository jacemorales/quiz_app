// Client-side Google Sheets & Storage Service for Quiz App

export const USER_SPREADSHEET_ID = '1KC9kf3igF8xRm1MVaSmUhqCjLKJWArH-iKeYhBBVwnw'
export const QUIZ_SPREADSHEET_ID = '1KJeB29Iyg-JBM-NvgYEt9yPFU8SRNqf1XehCD6Phmho'

const STORAGE_KEYS = {
  USERS: 'quizapp_users',
  QUIZZES: 'quizapp_quizzes',
  ATTEMPTS: 'quizapp_attempts',
  CURRENT_USER: 'quizapp_current_user'
}

// Initial Local Storage Helpers
function getStored(key) {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  } catch (err) {
    console.error(`Error reading ${key} from localStorage:`, err)
    return []
  }
}

function setStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.error(`Error saving ${key} to localStorage:`, err)
  }
}

// --- Google Sheets Sync Helpers ---
// Syncs data asynchronously to Google Sheets if API Key or Web App URL is provided
async function appendToGoogleSheet(spreadsheetId, range, values) {
  const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY
  const webAppUrl = import.meta.env.VITE_GOOGLE_SHEETS_WEBAPP_URL

  if (webAppUrl) {
    try {
      await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId, range, values }),
        mode: 'no-cors'
      })
    } catch (err) {
      console.warn('Google Sheets Web App sync failed:', err.message)
    }
  } else if (apiKey) {
    try {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ values })
        }
      )
    } catch (err) {
      console.warn('Google Sheets API append failed:', err.message)
    }
  }
}

// --- User Storage Operations ---
export function getLocalUsers() {
  return getStored(STORAGE_KEYS.USERS)
}

export function saveUserLocal(user) {
  const users = getLocalUsers()
  users.push(user)
  setStored(STORAGE_KEYS.USERS, users)

  // Asynchronously sync to User Spreadsheet: 1KC9kf3igF8xRm1MVaSmUhqCjLKJWArH-iKeYhBBVwnw
  appendToGoogleSheet(USER_SPREADSHEET_ID, 'Users!A:D', [
    [user.userId, user.name, user.email, user.createdAt]
  ])
}

// --- Quiz Storage Operations ---
export function getLocalQuizzes() {
  return getStored(STORAGE_KEYS.QUIZZES)
}

export function saveQuizLocal(quiz) {
  const quizzes = getLocalQuizzes()
  const existingIdx = quizzes.findIndex(q => q.quizId === quiz.quizId)
  if (existingIdx !== -1) {
    quizzes[existingIdx] = quiz
  } else {
    quizzes.push(quiz)
  }
  setStored(STORAGE_KEYS.QUIZZES, quizzes)

  // Asynchronously sync to Quiz Spreadsheet: 1KJeB29Iyg-JBM-NvgYEt9yPFU8SRNqf1XehCD6Phmho
  appendToGoogleSheet(QUIZ_SPREADSHEET_ID, 'Quizzes!A:K', [
    [
      quiz.quizId,
      quiz.userId,
      quiz.title,
      quiz.description || '',
      quiz.timerType || 'none',
      quiz.timerDuration || 0,
      quiz.anonymous,
      JSON.stringify(quiz.participantFields || []),
      quiz.showScore,
      quiz.status || 'active',
      quiz.createdAt
    ]
  ])
}

export function deleteQuizLocal(quizId) {
  const quizzes = getLocalQuizzes()
  const updated = quizzes.map(q => {
    if (q.quizId === quizId) {
      return { ...q, status: 'deleted' }
    }
    return q
  })
  setStored(STORAGE_KEYS.QUIZZES, updated)
}

// --- Attempt Storage Operations ---
export function getLocalAttempts() {
  return getStored(STORAGE_KEYS.ATTEMPTS)
}

export function saveAttemptLocal(attempt) {
  const attempts = getLocalAttempts()
  attempts.push(attempt)
  setStored(STORAGE_KEYS.ATTEMPTS, attempts)

  // Asynchronously sync to Quiz Spreadsheet: 1KJeB29Iyg-JBM-NvgYEt9yPFU8SRNqf1XehCD6Phmho
  appendToGoogleSheet(QUIZ_SPREADSHEET_ID, 'Responses!A:H', [
    [
      attempt.attemptId,
      attempt.quizId,
      JSON.stringify(attempt.participantData || {}),
      attempt.score,
      attempt.correctCount,
      attempt.totalQuestions,
      attempt.completionTimeSeconds,
      attempt.submittedAt
    ]
  ])
}
