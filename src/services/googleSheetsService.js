// Frontend Service communicating directly with Google Apps Script Backend API
// No localStorage fallbacks or local saving for users, quizzes, or attempts.

const APPS_SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || ''

async function callAppsScriptApi(action, payload = {}) {
  if (!APPS_SCRIPT_URL) {
    throw new Error('Google Apps Script Web App URL is not configured. Please set VITE_GOOGLE_APPS_SCRIPT_URL in your environment.')
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
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
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Unable to save your data right now. Please check your connection and try again.')
    }

    return result
  } catch (err) {
    console.error(`Google Apps Script API error [${action}]:`, err)
    if (err.message && !err.message.includes('not configured')) {
      throw new Error(err.message || 'Unable to save your data right now. Please check your connection and try again.')
    }
    throw err
  }
}

// --- User Operations ---

export async function apiRegisterUser(user) {
  const res = await callAppsScriptApi('createUser', user)
  return res.user
}

export async function apiLoginUser(email, password) {
  const res = await callAppsScriptApi('loginUser', { email, password })
  return res.user
}

export async function apiGetUser(userId) {
  const res = await callAppsScriptApi('getUser', { userId })
  return res.user
}

// --- Quiz Operations ---

export async function apiCreateQuiz(quizData) {
  const res = await callAppsScriptApi('createQuiz', quizData)
  return res.quiz
}

export async function apiGetQuiz(quizId, userId = null) {
  const res = await callAppsScriptApi('getQuiz', { quizId, userId })
  return res.quiz
}

export async function apiGetUserQuizzes(userId) {
  const res = await callAppsScriptApi('getUserQuizzes', { userId })
  return res.quizzes || []
}

export async function apiUpdateQuiz(quizId, quizData, userId) {
  const res = await callAppsScriptApi('updateQuiz', { ...quizData, quizId, userId })
  return res.quiz
}

export async function apiDeleteQuiz(quizId, userId) {
  const res = await callAppsScriptApi('deleteQuiz', { quizId, userId })
  return res.success
}

// --- Attempt & Submission Operations ---

export async function apiSubmitQuizAttempt(quizId, participantData, answers, completionTimeSeconds) {
  const res = await callAppsScriptApi('submitQuiz', {
    quizId,
    participantData,
    answers,
    completionTimeSeconds
  })
  return res
}

// --- Analytics Operations ---

export async function apiGetQuizAnalytics(quizId, userId) {
  const res = await callAppsScriptApi('getAnalytics', { quizId, userId })
  return res.analytics
}
