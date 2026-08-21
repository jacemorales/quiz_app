import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { appendUserToSheet, appendQuizToSheet, appendQuestionToSheet, appendAttemptToSheet } from './googleSheets.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, '..', 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')

// Ensure data directory and file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const initialData = {
  users: [],
  quizzes: [],
  questions: [],
  options: [],
  attempts: [],
  answers: []
}

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8')
    return initialData
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return {
      users: parsed.users || [],
      quizzes: parsed.quizzes || [],
      questions: parsed.questions || [],
      options: parsed.options || [],
      attempts: parsed.attempts || [],
      answers: parsed.answers || []
    }
  } catch (err) {
    console.error('Error reading db file, re-initializing:', err)
    return initialData
  }
}

function saveDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8')
  } catch (err) {
    console.error('Error saving db file:', err)
  }
}

// User operations
export function findUserByEmail(email) {
  const db = loadDB()
  return db.users.find(u => u.email.toLowerCase() === email.toLowerCase())
}

export function findUserById(userId) {
  const db = loadDB()
  return db.users.find(u => u.userId === userId)
}

export function createUser(userData) {
  const db = loadDB()
  const user = {
    userId: userData.userId,
    name: userData.name,
    email: userData.email,
    passwordHash: userData.passwordHash,
    createdAt: userData.createdAt || new Date().toISOString()
  }
  db.users.push(user)
  saveDB(db)

  // Asynchronously append to Google Sheets
  appendUserToSheet(user).catch(err => {
    console.warn('Google Sheets user append warning:', err.message)
  })

  return user
}

// Quiz operations
export function getUserQuizzes(userId) {
  const db = loadDB()
  const userQuizzes = db.quizzes.filter(q => q.userId === userId && q.status !== 'deleted')

  return userQuizzes.map(quiz => {
    const questions = db.questions.filter(q => q.quizId === quiz.quizId)
    const attempts = db.attempts.filter(a => a.quizId === quiz.quizId)
    return {
      ...quiz,
      questionCount: questions.length,
      attemptCount: attempts.length
    }
  })
}

export function getQuizById(quizId) {
  const db = loadDB()
  const quiz = db.quizzes.find(q => q.quizId === quizId && q.status !== 'deleted')
  if (!quiz) return null

  const questions = db.questions
    .filter(q => q.quizId === quizId)
    .sort((a, b) => a.order - b.order)
    .map(q => {
      const options = db.options.filter(o => o.questionId === q.questionId)
      return {
        ...q,
        options
      }
    })

  return {
    ...quiz,
    questions
  }
}

export function createQuiz(quizData, userId) {
  const db = loadDB()
  const quiz = {
    quizId: quizData.quizId,
    userId: userId,
    title: quizData.title,
    description: quizData.description || '',
    timerType: quizData.timerType || 'none', // 'none' | 'question' | 'quiz'
    timerDuration: Number(quizData.timerDuration) || 0,
    anonymous: Boolean(quizData.anonymous),
    participantFields: quizData.participantFields || [],
    showScore: Boolean(quizData.showScore),
    status: quizData.status || 'active',
    createdAt: new Date().toISOString()
  }

  db.quizzes.push(quiz)

  // Add questions and options
  const questions = []
  if (Array.isArray(quizData.questions)) {
    quizData.questions.forEach((qData, index) => {
      const question = {
        questionId: qData.questionId || `q_${Math.random().toString(36).substring(2, 10)}`,
        quizId: quiz.quizId,
        questionText: qData.questionText,
        order: index + 1
      }
      db.questions.push(question)

      const options = []
      if (Array.isArray(qData.options)) {
        qData.options.forEach(oData => {
          const option = {
            optionId: oData.optionId || `opt_${Math.random().toString(36).substring(2, 10)}`,
            questionId: question.questionId,
            optionText: oData.optionText,
            isCorrect: Boolean(oData.isCorrect)
          }
          db.options.push(option)
          options.push(option)
        })
      }
      questions.push({ ...question, options })
    })
  }

  saveDB(db)

  // Append to Google Sheets
  appendQuizToSheet(quiz).catch(err => console.warn('Google Sheets quiz append warning:', err.message))
  questions.forEach(q => {
    appendQuestionToSheet(q).catch(err => console.warn('Google Sheets question append warning:', err.message))
  })

  return { ...quiz, questions }
}

export function updateQuiz(quizId, quizData, userId) {
  const db = loadDB()
  const quizIndex = db.quizzes.findIndex(q => q.quizId === quizId && q.userId === userId && q.status !== 'deleted')
  if (quizIndex === -1) return null

  // Update quiz metadata
  const updatedQuiz = {
    ...db.quizzes[quizIndex],
    title: quizData.title,
    description: quizData.description || '',
    timerType: quizData.timerType || 'none',
    timerDuration: Number(quizData.timerDuration) || 0,
    anonymous: Boolean(quizData.anonymous),
    participantFields: quizData.participantFields || [],
    showScore: Boolean(quizData.showScore),
    status: quizData.status || 'active',
    updatedAt: new Date().toISOString()
  }
  db.quizzes[quizIndex] = updatedQuiz

  // Remove old questions and options for this quiz
  const oldQuestions = db.questions.filter(q => q.quizId === quizId)
  const oldQuestionIds = new Set(oldQuestions.map(q => q.questionId))

  db.questions = db.questions.filter(q => q.quizId !== quizId)
  db.options = db.options.filter(o => !oldQuestionIds.has(o.questionId))

  // Re-add questions & options
  const newQuestions = []
  if (Array.isArray(quizData.questions)) {
    quizData.questions.forEach((qData, index) => {
      const question = {
        questionId: qData.questionId || `q_${Math.random().toString(36).substring(2, 10)}`,
        quizId: quizId,
        questionText: qData.questionText,
        order: index + 1
      }
      db.questions.push(question)

      const options = []
      if (Array.isArray(qData.options)) {
        qData.options.forEach(oData => {
          const option = {
            optionId: oData.optionId || `opt_${Math.random().toString(36).substring(2, 10)}`,
            questionId: question.questionId,
            optionText: oData.optionText,
            isCorrect: Boolean(oData.isCorrect)
          }
          db.options.push(option)
          options.push(option)
        })
      }
      newQuestions.push({ ...question, options })
    })
  }

  saveDB(db)
  return { ...updatedQuiz, questions: newQuestions }
}

export function deleteQuiz(quizId, userId) {
  const db = loadDB()
  const quizIndex = db.quizzes.findIndex(q => q.quizId === quizId && q.userId === userId)
  if (quizIndex === -1) return false

  db.quizzes[quizIndex].status = 'deleted'
  saveDB(db)
  return true
}

export function saveQuizAttempt(attemptData) {
  const db = loadDB()
  const attempt = {
    attemptId: attemptData.attemptId,
    quizId: attemptData.quizId,
    userId: attemptData.userId,
    participantData: attemptData.participantData || {},
    score: attemptData.score,
    totalQuestions: attemptData.totalQuestions,
    correctCount: attemptData.correctCount,
    incorrectCount: attemptData.incorrectCount,
    completionTimeSeconds: attemptData.completionTimeSeconds || 0,
    submittedAt: new Date().toISOString()
  }

  db.attempts.push(attempt)

  if (Array.isArray(attemptData.answers)) {
    attemptData.answers.forEach(ans => {
      db.answers.push({
        answerId: `ans_${Math.random().toString(36).substring(2, 10)}`,
        attemptId: attempt.attemptId,
        questionId: ans.questionId,
        selectedOptionIds: ans.selectedOptionIds || [],
        isCorrect: Boolean(ans.isCorrect)
      })
    })
  }

  saveDB(db)
  appendAttemptToSheet(attempt).catch(err => console.warn('Google Sheets attempt append warning:', err.message))
  return attempt
}

export function getQuizAnalytics(quizId, userId) {
  const db = loadDB()
  const quiz = db.quizzes.find(q => q.quizId === quizId && q.userId === userId)
  if (!quiz) return null

  const questions = db.questions.filter(q => q.quizId === quizId).sort((a, b) => a.order - b.order)
  const attempts = db.attempts.filter(a => a.quizId === quizId)

  const totalAttempts = attempts.length
  const completedAttempts = attempts.length // All saved attempts are completed
  const completionRate = totalAttempts > 0 ? 100 : 0

  let avgScore = 0
  let highestScore = 0
  let lowestScore = 0
  let avgCompletionTime = 0

  if (totalAttempts > 0) {
    const scores = attempts.map(a => (a.totalQuestions > 0 ? (a.correctCount / a.totalQuestions) * 100 : 0))
    const totalScore = scores.reduce((acc, s) => acc + s, 0)
    avgScore = Math.round(totalScore / totalAttempts)
    highestScore = Math.round(Math.max(...scores))
    lowestScore = Math.round(Math.min(...scores))

    const totalTime = attempts.reduce((acc, a) => acc + (a.completionTimeSeconds || 0), 0)
    avgCompletionTime = Math.round(totalTime / totalAttempts)
  }

  // Question performance calculations
  const questionPerformance = questions.map(q => {
    const qAnswers = db.answers.filter(ans => ans.questionId === q.questionId)
    const qTotal = qAnswers.length
    const qCorrect = qAnswers.filter(ans => ans.isCorrect).length
    const correctPct = qTotal > 0 ? Math.round((qCorrect / qTotal) * 100) : 0
    const incorrectPct = qTotal > 0 ? 100 - correctPct : 0

    return {
      questionId: q.questionId,
      questionText: q.questionText,
      order: q.order,
      totalAnswered: qTotal,
      correctPct,
      incorrectPct
    }
  })

  // Recent attempts
  const recentAttempts = attempts
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
    .slice(0, 20)
    .map(a => ({
      attemptId: a.attemptId,
      participantData: a.participantData,
      score: a.score,
      correctCount: a.correctCount,
      totalQuestions: a.totalQuestions,
      percentage: a.totalQuestions > 0 ? Math.round((a.correctCount / a.totalQuestions) * 100) : 0,
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

export function getUserDashboardStats(userId) {
  const db = loadDB()
  const userQuizzes = db.quizzes.filter(q => q.userId === userId && q.status !== 'deleted')
  const quizIds = new Set(userQuizzes.map(q => q.quizId))

  const userAttempts = db.attempts.filter(a => quizIds.has(a.quizId))

  const totalQuizzes = userQuizzes.length
  const activeQuizzes = userQuizzes.filter(q => q.status === 'active').length
  const totalAttempts = userAttempts.length
  const totalCompleted = totalAttempts // All stored attempts are completed

  let avgScore = 0
  if (totalAttempts > 0) {
    const scores = userAttempts.map(a => (a.totalQuestions > 0 ? (a.correctCount / a.totalQuestions) * 100 : 0))
    avgScore = Math.round(scores.reduce((acc, s) => acc + s, 0) / totalAttempts)
  }

  // Most popular quiz
  let mostPopularQuiz = null
  let maxAttempts = -1

  userQuizzes.forEach(quiz => {
    const attCount = db.attempts.filter(a => a.quizId === quiz.quizId).length
    if (attCount > maxAttempts) {
      maxAttempts = attCount
      mostPopularQuiz = {
        quizId: quiz.quizId,
        title: quiz.title,
        attemptCount: attCount
      }
    }
  })

  if (maxAttempts <= 0) {
    mostPopularQuiz = null
  }

  // Recent activity
  const recentActivity = userAttempts
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
