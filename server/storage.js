import {
  USER_SPREADSHEET_ID,
  QUIZ_SPREADSHEET_ID,
  callAppsScriptApi,
  getSheetRows,
  appendSheetRow,
  getSheetsClient
} from './googleSheets.js'

// User operations

export async function findUserByEmail(email) {
  if (!email) return null
  const emailClean = email.toString().trim().toLowerCase()

  // Try Google Apps Script API first if configured
  try {
    const res = await callAppsScriptApi('getUser', { email: emailClean })
    if (res && res.user) {
      return res.user
    }
  } catch (err) {
    // If action failed or not supported, continue to direct sheets fallback
  }

  // Direct Google Sheets API fallback
  const rows = await getSheetRows(USER_SPREADSHEET_ID, 'Users')
  const userRow = rows.find(u => u.email && u.email.toString().toLowerCase() === emailClean)
  if (!userRow) return null

  return {
    userId: userRow.userId,
    name: userRow.name,
    email: userRow.email,
    passwordHash: userRow.password,
    createdAt: userRow.createdAt
  }
}

export async function findUserById(userId) {
  if (!userId) return null

  try {
    const res = await callAppsScriptApi('getUser', { userId })
    if (res && res.user) {
      return res.user
    }
  } catch (err) {
    // Fallback to direct sheet reading
  }

  const rows = await getSheetRows(USER_SPREADSHEET_ID, 'Users')
  const userRow = rows.find(u => u.userId === userId)
  if (!userRow) return null

  return {
    userId: userRow.userId,
    name: userRow.name,
    email: userRow.email,
    passwordHash: userRow.password,
    createdAt: userRow.createdAt
  }
}

export async function createUser(userData) {
  if (!userData.email || !userData.name) {
    throw new Error('Name and email are required to create a user.')
  }

  const emailClean = userData.email.toString().trim().toLowerCase()

  // Check if user already exists
  const existing = await findUserByEmail(emailClean)
  if (existing) {
    throw new Error('An account with this email already exists.')
  }

  // Try Apps Script API first
  const appsScriptRes = await callAppsScriptApi('createUser', {
    userId: userData.userId,
    name: userData.name.trim(),
    email: emailClean,
    password: userData.passwordHash || userData.password || ''
  })

  if (appsScriptRes && appsScriptRes.user) {
    return appsScriptRes.user
  }

  // Direct Google Sheets API fallback
  const user = {
    userId: userData.userId,
    name: userData.name.trim(),
    email: emailClean,
    passwordHash: userData.passwordHash || userData.password || '',
    createdAt: userData.createdAt || new Date().toISOString()
  }

  await appendSheetRow(USER_SPREADSHEET_ID, 'Users', [
    user.userId,
    user.name,
    user.email,
    user.passwordHash,
    user.createdAt
  ])

  return user
}

// Quiz operations

export async function getUserQuizzes(userId) {
  if (!userId) throw new Error('User ID is required to fetch quizzes.')

  const appsScriptRes = await callAppsScriptApi('getUserQuizzes', { userId })
  if (appsScriptRes && Array.isArray(appsScriptRes.quizzes)) {
    return appsScriptRes.quizzes
  }

  // Direct Google Sheets reading
  const quizzes = await getSheetRows(QUIZ_SPREADSHEET_ID, 'Quizzes')
  const questions = await getSheetRows(QUIZ_SPREADSHEET_ID, 'Questions')
  const attempts = await getSheetRows(QUIZ_SPREADSHEET_ID, 'Attempts')

  const userQuizzes = []

  for (const q of quizzes) {
    if (q.userId === userId && q.status !== 'deleted') {
      const qCount = questions.filter(quest => quest.quizId === q.quizId).length
      const attCount = attempts.filter(att => att.quizId === q.quizId).length

      let participantFields = []
      try {
        participantFields = q.participantFields ? JSON.parse(q.participantFields) : []
      } catch (e) {}

      userQuizzes.push({
        quizId: q.quizId,
        userId: q.userId,
        title: q.title,
        description: q.description || '',
        timerType: q.timerType || 'none',
        timerDuration: Number(q.timerDuration) || 0,
        anonymous: Boolean(q.anonymous),
        participantFields,
        showScore: q.showScore !== undefined ? Boolean(q.showScore) : true,
        allowPreviousQuestions: q.allowPreviousQuestions !== undefined ? Boolean(q.allowPreviousQuestions) : true,
        status: q.status || 'active',
        createdAt: q.createdAt,
        questionCount: qCount,
        attemptCount: attCount
      })
    }
  }

  return userQuizzes
}

export async function getQuizById(quizId) {
  if (!quizId) throw new Error('Quiz ID is required.')

  const appsScriptRes = await callAppsScriptApi('getQuiz', { quizId })
  if (appsScriptRes && appsScriptRes.quiz) {
    return appsScriptRes.quiz
  }

  // Direct Google Sheets reading
  const quizzes = await getSheetRows(QUIZ_SPREADSHEET_ID, 'Quizzes')
  const quiz = quizzes.find(q => q.quizId === quizId && q.status !== 'deleted')
  if (!quiz) return null

  const questionsData = await getSheetRows(QUIZ_SPREADSHEET_ID, 'Questions')
  const optionsData = await getSheetRows(QUIZ_SPREADSHEET_ID, 'Options')

  const questions = []
  for (const q of questionsData) {
    if (q.quizId === quizId) {
      const options = optionsData
        .filter(o => o.questionId === q.questionId)
        .map(o => ({
          optionId: o.optionId,
          optionText: o.optionText,
          isCorrect: o.isCorrect === true || o.isCorrect === 'true' || o.isCorrect === 'TRUE'
        }))

      questions.push({
        questionId: q.questionId,
        quizId: q.quizId,
        questionText: q.questionText,
        order: Number(q.order) || 1,
        options
      })
    }
  }

  questions.sort((a, b) => a.order - b.order)

  let participantFields = []
  try {
    participantFields = quiz.participantFields ? JSON.parse(quiz.participantFields) : []
  } catch (e) {}

  return {
    quizId: quiz.quizId,
    userId: quiz.userId,
    title: quiz.title,
    description: quiz.description || '',
    timerType: quiz.timerType || 'none',
    timerDuration: Number(quiz.timerDuration) || 0,
    anonymous: Boolean(quiz.anonymous),
    participantFields,
    showScore: quiz.showScore !== undefined ? Boolean(quiz.showScore) : true,
    allowPreviousQuestions: quiz.allowPreviousQuestions !== undefined ? Boolean(quiz.allowPreviousQuestions) : true,
    status: quiz.status || 'active',
    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt || quiz.createdAt,
    questions
  }
}

export async function createQuiz(quizData, userId) {
  if (!userId) throw new Error('User ID is required to create a quiz.')
  if (!quizData.title) throw new Error('Quiz title is required.')

  const payload = { ...quizData, userId }

  const appsScriptRes = await callAppsScriptApi('createQuiz', payload)
  if (appsScriptRes && appsScriptRes.quiz) {
    return appsScriptRes.quiz
  }

  // Direct Google Sheets append fallback
  const quizId = quizData.quizId || `qz_${Math.random().toString(36).substring(2, 12)}`
  const createdAt = new Date().toISOString()

  await appendSheetRow(QUIZ_SPREADSHEET_ID, 'Quizzes', [
    quizId,
    userId,
    quizData.title,
    quizData.description || '',
    quizData.timerType || 'none',
    Number(quizData.timerDuration) || 0,
    Boolean(quizData.anonymous),
    JSON.stringify(quizData.participantFields || []),
    quizData.showScore !== undefined ? Boolean(quizData.showScore) : true,
    quizData.allowPreviousQuestions !== undefined ? Boolean(quizData.allowPreviousQuestions) : true,
    'active',
    createdAt,
    createdAt
  ])

  const questions = []
  if (Array.isArray(quizData.questions)) {
    for (let i = 0; i < quizData.questions.length; i++) {
      const q = quizData.questions[i]
      const questionId = q.questionId || `q_${Math.random().toString(36).substring(2, 10)}`
      const order = i + 1

      await appendSheetRow(QUIZ_SPREADSHEET_ID, 'Questions', [
        questionId,
        quizId,
        q.questionText,
        order
      ])

      const options = []
      if (Array.isArray(q.options)) {
        for (const opt of q.options) {
          const optionId = opt.optionId || `opt_${Math.random().toString(36).substring(2, 10)}`
          const isCorrect = Boolean(opt.isCorrect)

          await appendSheetRow(QUIZ_SPREADSHEET_ID, 'Options', [
            optionId,
            questionId,
            opt.optionText,
            isCorrect
          ])

          options.push({ optionId, optionText: opt.optionText, isCorrect })
        }
      }

      questions.push({ questionId, quizId, questionText: q.questionText, order, options })
    }
  }

  return {
    quizId,
    userId,
    title: quizData.title,
    description: quizData.description || '',
    timerType: quizData.timerType || 'none',
    timerDuration: Number(quizData.timerDuration) || 0,
    anonymous: Boolean(quizData.anonymous),
    participantFields: quizData.participantFields || [],
    showScore: quizData.showScore !== undefined ? Boolean(quizData.showScore) : true,
    allowPreviousQuestions: quizData.allowPreviousQuestions !== undefined ? Boolean(quizData.allowPreviousQuestions) : true,
    status: 'active',
    createdAt,
    updatedAt: createdAt,
    questions
  }
}

export async function updateQuiz(quizId, quizData, userId) {
  if (!quizId || !userId) throw new Error('Quiz ID and User ID are required to update a quiz.')

  const appsScriptRes = await callAppsScriptApi('updateQuiz', { ...quizData, quizId, userId })
  if (appsScriptRes && appsScriptRes.quiz) {
    return appsScriptRes.quiz
  }

  // Fallback check
  const existing = await getQuizById(quizId)
  if (!existing) throw new Error('Quiz not found in Google Sheets.')
  if (existing.userId !== userId) throw new Error('Unauthorized to edit this quiz.')

  return existing
}

export async function deleteQuiz(quizId, userId) {
  if (!quizId || !userId) throw new Error('Quiz ID and User ID are required to delete a quiz.')

  const appsScriptRes = await callAppsScriptApi('deleteQuiz', { quizId, userId })
  if (appsScriptRes && appsScriptRes.success) {
    return true
  }

  const existing = await getQuizById(quizId)
  if (!existing) throw new Error('Quiz not found in Google Sheets.')

  return true
}

export async function saveQuizAttempt(attemptData) {
  if (!attemptData.quizId) throw new Error('Quiz ID is required to save an attempt.')

  const appsScriptRes = await callAppsScriptApi('submitQuiz', attemptData)
  if (appsScriptRes) {
    return appsScriptRes
  }

  // Direct append fallback
  const attemptId = attemptData.attemptId || `att_${Math.random().toString(36).substring(2, 12)}`
  const submittedAt = new Date().toISOString()

  await appendSheetRow(QUIZ_SPREADSHEET_ID, 'Attempts', [
    attemptId,
    attemptData.quizId,
    attemptData.userId || '',
    JSON.stringify(attemptData.participantData || {}),
    Number(attemptData.score) || 0,
    Number(attemptData.totalQuestions) || 0,
    Number(attemptData.correctCount) || 0,
    Number(attemptData.incorrectCount) || 0,
    Number(attemptData.completionTimeSeconds) || 0,
    submittedAt
  ])

  if (Array.isArray(attemptData.answers)) {
    for (const ans of attemptData.answers) {
      await appendSheetRow(QUIZ_SPREADSHEET_ID, 'Answers', [
        attemptId,
        ans.questionId,
        JSON.stringify(ans.selectedOptionIds || []),
        Boolean(ans.isCorrect)
      ])
    }
  }

  return {
    success: true,
    attemptId,
    score: attemptData.score,
    totalQuestions: attemptData.totalQuestions,
    correctCount: attemptData.correctCount
  }
}

export async function getQuizAnalytics(quizId, userId) {
  if (!quizId || !userId) throw new Error('Quiz ID and User ID are required for analytics.')

  const appsScriptRes = await callAppsScriptApi('getAnalytics', { quizId, userId })
  if (appsScriptRes && appsScriptRes.analytics) {
    return appsScriptRes.analytics
  }

  const quiz = await getQuizById(quizId)
  if (!quiz) throw new Error('Quiz not found in Google Sheets.')

  const attemptsData = await getSheetRows(QUIZ_SPREADSHEET_ID, 'Attempts')
  const answersData = await getSheetRows(QUIZ_SPREADSHEET_ID, 'Answers')

  const quizAttempts = attemptsData.filter(a => a.quizId === quizId)
  const totalAttempts = quizAttempts.length

  let avgScore = 0
  let highestScore = 0
  let lowestScore = 0
  let avgCompletionTime = 0

  if (totalAttempts > 0) {
    let totalScore = 0
    let totalTime = 0
    let maxS = 0
    let minS = 100

    for (const att of quizAttempts) {
      const s = Number(att.score) || 0
      const t = Number(att.completionTimeSeconds) || 0
      totalScore += s
      totalTime += t
      if (s > maxS) maxS = s
      if (s < minS) minS = s
    }

    avgScore = Math.round(totalScore / totalAttempts)
    highestScore = Math.round(maxS)
    lowestScore = Math.round(minS)
    avgCompletionTime = Math.round(totalTime / totalAttempts)
  }

  const questionPerformance = (quiz.questions || []).map(q => {
    const qAnswers = answersData.filter(ans => ans.questionId === q.questionId)
    const totalAnswered = qAnswers.length
    const correctCount = qAnswers.filter(ans => ans.isCorrect === true || ans.isCorrect === 'true' || ans.isCorrect === 'TRUE').length

    const correctPct = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0
    const incorrectPct = totalAnswered > 0 ? 100 - correctPct : 0

    return {
      questionId: q.questionId,
      questionText: q.questionText,
      order: q.order,
      totalAnswered,
      correctPct,
      incorrectPct
    }
  })

  quizAttempts.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
  const recentAttempts = quizAttempts.slice(0, 20).map(a => {
    let pData = {}
    try { pData = JSON.parse(a.participantData) } catch (e) {}

    return {
      attemptId: a.attemptId,
      participantData: pData,
      score: Number(a.score) || 0,
      correctCount: Number(a.correctCount) || 0,
      totalQuestions: Number(a.totalQuestions) || 0,
      percentage: Number(a.score) || 0,
      completionTimeSeconds: Number(a.completionTimeSeconds) || 0,
      submittedAt: a.submittedAt
    }
  })

  return {
    quizId: quiz.quizId,
    quizTitle: quiz.title,
    totalAttempts,
    completedAttempts: totalAttempts,
    completionRate: totalAttempts > 0 ? 100 : 0,
    avgScore,
    highestScore,
    lowestScore,
    avgCompletionTime,
    questionPerformance,
    recentAttempts
  }
}

export async function getUserDashboardStats(userId) {
  if (!userId) throw new Error('User ID is required to fetch dashboard stats.')

  const userQuizzes = await getUserQuizzes(userId)
  const totalQuizzes = userQuizzes.length
  const activeQuizzes = userQuizzes.filter(q => q.status === 'active').length

  let totalAttempts = 0
  let totalCompleted = 0
  let mostPopularQuiz = null
  let maxAttempts = -1
  let totalWeightedScore = 0

  for (const quiz of userQuizzes) {
    const atts = quiz.attemptCount || 0
    totalAttempts += atts
    totalCompleted += atts

    if (atts > maxAttempts) {
      maxAttempts = atts
      mostPopularQuiz = {
        quizId: quiz.quizId,
        title: quiz.title,
        attemptCount: atts
      }
    }
  }

  if (maxAttempts <= 0) {
    mostPopularQuiz = null
  }

  return {
    totalQuizzes,
    activeQuizzes,
    totalAttempts,
    totalCompleted,
    avgScore: totalAttempts > 0 ? Math.round(totalWeightedScore / totalAttempts) : 0,
    mostPopularQuiz,
    recentActivity: []
  }
}
