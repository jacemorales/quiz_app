// Frontend Service communicating directly with Google Apps Script Backend API
// No localStorage fallbacks or local saving for users, quizzes, or attempts.

function getAppsScriptUrl() {
  return import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || ''
}

async function callAppsScriptApi(action, payload = {}) {
  const appsScriptUrl = getAppsScriptUrl()

  if (!appsScriptUrl) {
    throw new Error('Google Apps Script Web App URL is not configured. Please set VITE_GOOGLE_APPS_SCRIPT_URL in your environment.')
  }

  try {
    // Append ?action= to the request URL to ensure action is preserved even across Google Apps Script HTTP redirects
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
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (!result || typeof result !== 'object') {
      throw new Error('Invalid response from Google Apps Script Web App.')
    }

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
  if (!res.user) {
    throw new Error('User record was not returned by Google Apps Script. Please verify Web App deployment and spreadsheet permissions.')
  }
  return res.user
}

export async function apiLoginUser(email, password) {
  const res = await callAppsScriptApi('loginUser', { email, password })
  if (!res.user) {
    throw new Error('User session was not returned by Google Apps Script.')
  }
  return res.user
}

export async function apiGetUser(userId) {
  const res = await callAppsScriptApi('getUser', { userId })
  if (!res.user) {
    throw new Error('User not found in Google Sheets.')
  }
  return res.user
}

// --- Quiz Operations ---

export async function apiCreateQuiz(quizData) {
  const res = await callAppsScriptApi('createQuiz', quizData)
  if (!res.quiz) {
    throw new Error('Quiz was not returned by Google Apps Script. Please verify Web App deployment.')
  }
  return res.quiz
}

export async function apiGetQuiz(quizId, userId = null) {
  const res = await callAppsScriptApi('getQuiz', { quizId, userId })
  if (!res.quiz) {
    throw new Error('Quiz data was not returned by Google Apps Script.')
  }
  return res.quiz
}

export async function apiGetUserQuizzes(userId) {
  const res = await callAppsScriptApi('getUserQuizzes', { userId })
  if (!Array.isArray(res.quizzes)) {
    throw new Error('Quizzes list was not returned by Google Apps Script.')
  }
  return res.quizzes
}

export async function apiUpdateQuiz(quizId, quizData, userId) {
  const res = await callAppsScriptApi('updateQuiz', { ...quizData, quizId, userId })
  if (!res.quiz) {
    throw new Error('Updated quiz was not returned by Google Apps Script.')
  }
  return res.quiz
}

export async function apiDeleteQuiz(quizId, userId) {
  const res = await callAppsScriptApi('deleteQuiz', { quizId, userId })
  return Boolean(res.success)
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
  if (!res.analytics) {
    throw new Error('Analytics data was not returned by Google Apps Script.')
  }
  return res.analytics
}
