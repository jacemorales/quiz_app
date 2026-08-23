import {
  apiCreateQuiz,
  apiGetQuiz,
  apiGetUserQuizzes,
  apiUpdateQuiz,
  apiDeleteQuiz,
  apiSubmitQuizAttempt,
  apiGetQuizAnalytics
} from '../services/googleSheetsService'

function generateQuizId() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `qz_${hex}`
}

export function useQuizStore() {
  async function getUserQuizzes(userId) {
    return await apiGetUserQuizzes(userId)
  }

  async function getQuizById(quizId, userId = null) {
    return await apiGetQuiz(quizId, userId)
  }

  async function createQuiz(quizData, userId) {
    if (!quizData.title || !quizData.title.trim()) {
      throw new Error('Quiz Title is required')
    }
    if (!Array.isArray(quizData.questions) || quizData.questions.length === 0) {
      throw new Error('Quiz must contain at least one question')
    }

    const quizId = generateQuizId()

    const formattedQuizData = {
      quizId,
      userId,
      title: quizData.title.trim(),
      description: quizData.description ? quizData.description.trim() : '',
      timerType: quizData.timerType || 'none',
      timerDuration: Number(quizData.timerDuration) || 0,
      anonymous: Boolean(quizData.anonymous),
      participantFields: quizData.participantFields || [],
      showScore: quizData.showScore !== undefined ? Boolean(quizData.showScore) : true,
      allowPreviousQuestions: quizData.allowPreviousQuestions !== undefined ? Boolean(quizData.allowPreviousQuestions) : true,
      questions: quizData.questions.map((q, index) => ({
        questionId: q.questionId || `q_${Math.random().toString(36).substring(2, 10)}`,
        quizId,
        questionText: q.questionText,
        order: index + 1,
        options: (q.options || []).map(opt => ({
          optionId: opt.optionId || `opt_${Math.random().toString(36).substring(2, 10)}`,
          optionText: opt.optionText,
          isCorrect: Boolean(opt.isCorrect)
        }))
      }))
    }

    const createdQuiz = await apiCreateQuiz(formattedQuizData)
    const quizUrl = `${window.location.origin}/quiz/${createdQuiz.quizId}`
    return { quiz: createdQuiz, quizUrl }
  }

  async function updateQuiz(quizId, quizData, userId) {
    if (!quizData.title || !quizData.title.trim()) {
      throw new Error('Quiz Title is required')
    }
    if (!Array.isArray(quizData.questions) || quizData.questions.length === 0) {
      throw new Error('Quiz must contain at least one question')
    }

    const formattedQuizData = {
      title: quizData.title.trim(),
      description: quizData.description ? quizData.description.trim() : '',
      timerType: quizData.timerType || 'none',
      timerDuration: Number(quizData.timerDuration) || 0,
      anonymous: Boolean(quizData.anonymous),
      participantFields: quizData.participantFields || [],
      showScore: quizData.showScore !== undefined ? Boolean(quizData.showScore) : true,
      allowPreviousQuestions: quizData.allowPreviousQuestions !== undefined ? Boolean(quizData.allowPreviousQuestions) : true,
      questions: quizData.questions.map((q, index) => ({
        questionId: q.questionId || `q_${Math.random().toString(36).substring(2, 10)}`,
        quizId,
        questionText: q.questionText,
        order: index + 1,
        options: (q.options || []).map(opt => ({
          optionId: opt.optionId || `opt_${Math.random().toString(36).substring(2, 10)}`,
          optionText: opt.optionText,
          isCorrect: Boolean(opt.isCorrect)
        }))
      }))
    }

    return await apiUpdateQuiz(quizId, formattedQuizData, userId)
  }

  async function deleteQuiz(quizId, userId) {
    return await apiDeleteQuiz(quizId, userId)
  }

  async function submitQuizAttempt(quizId, participantData, answers, completionTimeSeconds) {
    return await apiSubmitQuizAttempt(quizId, participantData, answers, completionTimeSeconds)
  }

  async function getQuizAnalytics(quizId, userId) {
    return await apiGetQuizAnalytics(quizId, userId)
  }

  async function getUserDashboardStats(userId) {
    const userQuizzes = await apiGetUserQuizzes(userId)
    const totalQuizzes = userQuizzes.length
    const activeQuizzes = userQuizzes.filter(q => q.status === 'active').length

    let totalAttempts = 0
    let totalCompleted = 0
    let mostPopularQuiz = null
    let maxAttempts = -1
    let totalWeightedScore = 0
    let recentActivityList = []

    // Fetch analytics for user's quizzes to calculate average score and recent activity
    const analyticsPromises = userQuizzes.map(quiz =>
      apiGetQuizAnalytics(quiz.quizId, userId).catch(() => null)
    )
    const analyticsResults = await Promise.all(analyticsPromises)

    userQuizzes.forEach((quiz, idx) => {
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

      const analytics = analyticsResults[idx]
      if (analytics) {
        if (analytics.totalAttempts > 0) {
          totalWeightedScore += (analytics.avgScore || 0) * analytics.totalAttempts
        }
        if (Array.isArray(analytics.recentAttempts)) {
          analytics.recentAttempts.forEach(att => {
            recentActivityList.push({
              attemptId: att.attemptId,
              quizTitle: quiz.title,
              quizId: quiz.quizId,
              submittedAt: att.submittedAt,
              score: att.correctCount,
              totalQuestions: att.totalQuestions
            })
          })
        }
      }
    })

    if (maxAttempts <= 0) {
      mostPopularQuiz = null
    }

    const avgScore = totalAttempts > 0 ? Math.round(totalWeightedScore / totalAttempts) : 0

    recentActivityList.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
    const recentActivity = recentActivityList.slice(0, 5)

    return {
      totalQuizzes,
      activeQuizzes,
      totalAttempts,
      totalCompleted,
      avgScore,
      mostPopularQuiz,
      recentActivity: []
    }
  }

  return {
    getUserQuizzes,
    getQuizById,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    submitQuizAttempt,
    getQuizAnalytics,
    getUserDashboardStats
  }
}
