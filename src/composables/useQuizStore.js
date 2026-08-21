import {
  getLocalQuizzes,
  saveQuizLocal,
  deleteQuizLocal,
  getLocalAttempts,
  saveAttemptLocal
} from '../services/googleSheetsService'

function generateQuizId() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `qz_${hex}`
}

function generateAttemptId() {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `att_${hex}`
}

export function useQuizStore() {
  function getUserQuizzes(userId) {
    const quizzes = getLocalQuizzes().filter(q => q.userId === userId && q.status !== 'deleted')
    const attempts = getLocalAttempts()

    return quizzes.map(quiz => {
      const quizAttempts = attempts.filter(a => a.quizId === quiz.quizId)
      return {
        ...quiz,
        questionCount: Array.isArray(quiz.questions) ? quiz.questions.length : 0,
        attemptCount: quizAttempts.length
      }
    })
  }

  function getQuizById(quizId) {
    const quizzes = getLocalQuizzes()
    return quizzes.find(q => q.quizId === quizId && q.status !== 'deleted') || null
  }

  function createQuiz(quizData, userId) {
    if (!quizData.title || !quizData.title.trim()) {
      throw new Error('Quiz Title is required')
    }
    if (!Array.isArray(quizData.questions) || quizData.questions.length === 0) {
      throw new Error('Quiz must contain at least one question')
    }

    const quizId = generateQuizId()

    const newQuiz = {
      quizId,
      userId,
      title: quizData.title.trim(),
      description: quizData.description ? quizData.description.trim() : '',
      timerType: quizData.timerType || 'none',
      timerDuration: Number(quizData.timerDuration) || 0,
      anonymous: Boolean(quizData.anonymous),
      participantFields: quizData.participantFields || [],
      showScore: quizData.showScore !== undefined ? Boolean(quizData.showScore) : true,
      status: 'active',
      createdAt: new Date().toISOString(),
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

    saveQuizLocal(newQuiz)

    const quizUrl = `${window.location.origin}/quiz/${quizId}`
    return { quiz: newQuiz, quizUrl }
  }

  function updateQuiz(quizId, quizData, userId) {
    const existing = getQuizById(quizId)
    if (!existing) {
      throw new Error('Quiz not found')
    }
    if (existing.userId !== userId) {
      throw new Error('Unauthorized to edit this quiz')
    }

    const updatedQuiz = {
      ...existing,
      title: quizData.title.trim(),
      description: quizData.description ? quizData.description.trim() : '',
      timerType: quizData.timerType || 'none',
      timerDuration: Number(quizData.timerDuration) || 0,
      anonymous: Boolean(quizData.anonymous),
      participantFields: quizData.participantFields || [],
      showScore: quizData.showScore !== undefined ? Boolean(quizData.showScore) : true,
      updatedAt: new Date().toISOString(),
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

    saveQuizLocal(updatedQuiz)
    return updatedQuiz
  }

  function deleteQuiz(quizId, userId) {
    const existing = getQuizById(quizId)
    if (!existing || existing.userId !== userId) {
      throw new Error('Unauthorized or quiz not found')
    }
    deleteQuizLocal(quizId)
    return true
  }

  function submitQuizAttempt(quizId, participantData, answers, completionTimeSeconds) {
    const quiz = getQuizById(quizId)
    if (!quiz) {
      throw new Error('Quiz not found')
    }

    let correctCount = 0
    let incorrectCount = 0
    const processedAnswers = []

    quiz.questions.forEach(question => {
      const userAns = (answers || []).find(a => a.questionId === question.questionId)
      const selectedOptionIds = userAns ? userAns.selectedOptionIds || [] : []
      const correctOptionIds = question.options.filter(o => o.isCorrect).map(o => o.optionId)

      const isCorrect =
        correctOptionIds.length === selectedOptionIds.length &&
        correctOptionIds.every(id => selectedOptionIds.includes(id)) &&
        selectedOptionIds.every(id => correctOptionIds.includes(id))

      if (isCorrect) {
        correctCount++
      } else {
        incorrectCount++
      }

      processedAnswers.push({
        questionId: question.questionId,
        selectedOptionIds,
        isCorrect
      })
    })

    const totalQuestions = quiz.questions.length
    const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
    const attemptId = generateAttemptId()

    const newAttempt = {
      attemptId,
      quizId,
      userId: quiz.userId,
      participantData: participantData || {},
      score: scorePercentage,
      totalQuestions,
      correctCount,
      incorrectCount,
      completionTimeSeconds: Number(completionTimeSeconds) || 0,
      answers: processedAnswers,
      submittedAt: new Date().toISOString()
    }

    saveAttemptLocal(newAttempt)

    if (quiz.showScore) {
      return {
        showScore: true,
        attemptId,
        totalQuestions,
        correctCount,
        incorrectCount,
        percentage: scorePercentage,
        scoreText: `${correctCount} / ${totalQuestions}`
      }
    } else {
      return {
        showScore: false,
        attemptId,
        message: 'Thank you for completing this quiz!'
      }
    }
  }

  function getQuizAnalytics(quizId, userId) {
    const quiz = getQuizById(quizId)
    if (!quiz || quiz.userId !== userId) {
      throw new Error('Unauthorized or quiz not found')
    }

    const attempts = getLocalAttempts().filter(a => a.quizId === quizId)
    const totalAttempts = attempts.length
    const completedAttempts = totalAttempts
    const completionRate = totalAttempts > 0 ? 100 : 0

    let avgScore = 0
    let highestScore = 0
    let lowestScore = 0
    let avgCompletionTime = 0

    if (totalAttempts > 0) {
      const scores = attempts.map(a => a.score)
      avgScore = Math.round(scores.reduce((acc, s) => acc + s, 0) / totalAttempts)
      highestScore = Math.round(Math.max(...scores))
      lowestScore = Math.round(Math.min(...scores))

      const totalTime = attempts.reduce((acc, a) => acc + (a.completionTimeSeconds || 0), 0)
      avgCompletionTime = Math.round(totalTime / totalAttempts)
    }

    const questionPerformance = (quiz.questions || []).map(q => {
      let qAnswered = 0
      let qCorrect = 0

      attempts.forEach(a => {
        const ans = (a.answers || []).find(ans => ans.questionId === q.questionId)
        if (ans) {
          qAnswered++
          if (ans.isCorrect) qCorrect++
        }
      })

      const correctPct = qAnswered > 0 ? Math.round((qCorrect / qAnswered) * 100) : 0
      const incorrectPct = qAnswered > 0 ? 100 - correctPct : 0

      return {
        questionId: q.questionId,
        questionText: q.questionText,
        order: q.order,
        totalAnswered: qAnswered,
        correctPct,
        incorrectPct
      }
    })

    const recentAttempts = attempts
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, 20)
      .map(a => ({
        attemptId: a.attemptId,
        participantData: a.participantData,
        score: a.score,
        correctCount: a.correctCount,
        totalQuestions: a.totalQuestions,
        percentage: a.score,
        completionTimeSeconds: a.completionTimeSeconds,
        submittedAt: a.submittedAt
      }))

    return {
      quizId: quiz.quizId,
      quizTitle: quiz.title,
      totalAttempts,
      completedAttempts,
      completionRate,
      avgScore,
      highestScore,
      lowestScore,
      avgCompletionTime,
      questionPerformance,
      recentAttempts
    }
  }

  function getUserDashboardStats(userId) {
    const userQuizzes = getUserQuizzes(userId)
    const quizIds = new Set(userQuizzes.map(q => q.quizId))

    const allAttempts = getLocalAttempts().filter(a => quizIds.has(a.quizId))

    const totalQuizzes = userQuizzes.length
    const activeQuizzes = userQuizzes.filter(q => q.status === 'active').length
    const totalAttempts = allAttempts.length
    const totalCompleted = totalAttempts

    let avgScore = 0
    if (totalAttempts > 0) {
      avgScore = Math.round(allAttempts.reduce((acc, a) => acc + a.score, 0) / totalAttempts)
    }

    let mostPopularQuiz = null
    let maxAttempts = -1

    userQuizzes.forEach(quiz => {
      if (quiz.attemptCount > maxAttempts) {
        maxAttempts = quiz.attemptCount
        mostPopularQuiz = {
          quizId: quiz.quizId,
          title: quiz.title,
          attemptCount: quiz.attemptCount
        }
      }
    })

    if (maxAttempts <= 0) {
      mostPopularQuiz = null
    }

    const recentActivity = allAttempts
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, 5)
      .map(a => {
        const quiz = userQuizzes.find(q => q.quizId === a.quizId)
        return {
          attemptId: a.attemptId,
          quizTitle: quiz ? quiz.title : 'Quiz',
          quizId: a.quizId,
          submittedAt: a.submittedAt,
          score: a.correctCount,
          totalQuestions: a.totalQuestions
        }
      })

    return {
      totalQuizzes,
      activeQuizzes,
      totalAttempts,
      totalCompleted,
      avgScore,
      mostPopularQuiz,
      recentActivity
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
