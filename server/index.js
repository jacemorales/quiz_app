import express from 'express'
import cors from 'cors'
import crypto from 'crypto'
import {
  createUser,
  findUserByEmail,
  findUserById,
  getUserQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  saveQuizAttempt,
  getQuizAnalytics,
  getUserDashboardStats
} from './storage.js'
import { hashPassword, comparePassword, generateToken, authenticateToken } from './auth.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// --- Authentication Routes ---

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' })
    }

    const existing = findUserByEmail(email)
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' })
    }

    const userId = `usr_${crypto.randomBytes(12).toString('hex')}`
    const passwordHash = await hashPassword(password)

    const newUser = createUser({
      userId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash
    })

    const token = generateToken(newUser)
    res.status(201).json({
      token,
      user: {
        userId: newUser.userId,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt
      }
    })
  } catch (err) {
    console.error('Registration error:', err)
    res.status(500).json({ error: 'Failed to create account' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = findUserByEmail(email)
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const validPassword = await comparePassword(password, user.passwordHash)
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = generateToken(user)
    res.json({
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Failed to log in' })
  }
})

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = findUserById(req.user.userId)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  res.json({
    user: {
      userId: user.userId,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
    }
  })
})

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' })
})

// --- Dashboard & Quiz Management Routes ---

app.get('/api/quizzes', authenticateToken, (req, res) => {
  try {
    const quizzes = getUserQuizzes(req.user.userId)
    res.json({ quizzes })
  } catch (err) {
    console.error('Get quizzes error:', err)
    res.status(500).json({ error: 'Failed to retrieve quizzes' })
  }
})

app.get('/api/quizzes/stats', authenticateToken, (req, res) => {
  try {
    const stats = getUserDashboardStats(req.user.userId)
    res.json(stats)
  } catch (err) {
    console.error('Get stats error:', err)
    res.status(500).json({ error: 'Failed to retrieve dashboard stats' })
  }
})

app.post('/api/quizzes', authenticateToken, (req, res) => {
  try {
    const { title, description, timerType, timerDuration, anonymous, participantFields, showScore, questions } = req.body

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Quiz title is required' })
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Quiz must contain at least one question' })
    }

    // Validate timer values
    if (timerType && timerType !== 'none') {
      const duration = Number(timerDuration)
      if (isNaN(duration) || duration <= 0) {
        return res.status(400).json({ error: 'Timer duration must be a positive number' })
      }
    }

    // Validate questions and options
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.questionText || !q.questionText.trim()) {
        return res.status(400).json({ error: `Question ${i + 1} text cannot be empty` })
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        return res.status(400).json({ error: `Question ${i + 1} must have at least 2 answer options` })
      }
      const hasCorrect = q.options.some(opt => opt.isCorrect)
      if (!hasCorrect) {
        return res.status(400).json({ error: `Question ${i + 1} must have at least one correct answer selected` })
      }
    }

    // Generate long, random, unique Quiz ID e.g., qz_8f7d92ac41e9b7c3f2a6d91e5c8b4a7f
    const quizId = `qz_${crypto.randomBytes(16).toString('hex')}`

    const newQuiz = createQuiz(
      {
        quizId,
        title: title.trim(),
        description: description ? description.trim() : '',
        timerType: timerType || 'none',
        timerDuration: Number(timerDuration) || 0,
        anonymous: Boolean(anonymous),
        participantFields: participantFields || [],
        showScore: showScore !== undefined ? Boolean(showScore) : true,
        questions
      },
      req.user.userId
    )

    const quizUrl = `${req.protocol}://${req.get('host')}/quiz/${quizId}`

    res.status(201).json({
      quiz: newQuiz,
      quizUrl
    })
  } catch (err) {
    console.error('Create quiz error:', err)
    res.status(500).json({ error: 'Failed to create quiz' })
  }
})

app.get('/api/quizzes/:quizId', authenticateToken, (req, res) => {
  try {
    const { quizId } = req.params
    const quiz = getQuizById(quizId)

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' })
    }

    // Security check: verify ownership
    if (quiz.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to access this quiz' })
    }

    res.json({ quiz })
  } catch (err) {
    console.error('Get quiz details error:', err)
    res.status(500).json({ error: 'Failed to retrieve quiz details' })
  }
})

app.put('/api/quizzes/:quizId', authenticateToken, (req, res) => {
  try {
    const { quizId } = req.params
    const existingQuiz = getQuizById(quizId)

    if (!existingQuiz) {
      return res.status(404).json({ error: 'Quiz not found' })
    }

    // Security check: verify ownership
    if (existingQuiz.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to edit this quiz' })
    }

    const { title, description, timerType, timerDuration, anonymous, participantFields, showScore, questions } = req.body

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Quiz title is required' })
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Quiz must contain at least one question' })
    }

    // Validate timer values
    if (timerType && timerType !== 'none') {
      const duration = Number(timerDuration)
      if (isNaN(duration) || duration <= 0) {
        return res.status(400).json({ error: 'Timer duration must be a positive number' })
      }
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.questionText || !q.questionText.trim()) {
        return res.status(400).json({ error: `Question ${i + 1} text cannot be empty` })
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        return res.status(400).json({ error: `Question ${i + 1} must have at least 2 answer options` })
      }
      const hasCorrect = q.options.some(opt => opt.isCorrect)
      if (!hasCorrect) {
        return res.status(400).json({ error: `Question ${i + 1} must have at least one correct answer selected` })
      }
    }

    const updated = updateQuiz(
      quizId,
      {
        title: title.trim(),
        description: description ? description.trim() : '',
        timerType: timerType || 'none',
        timerDuration: Number(timerDuration) || 0,
        anonymous: Boolean(anonymous),
        participantFields: participantFields || [],
        showScore: showScore !== undefined ? Boolean(showScore) : true,
        questions
      },
      req.user.userId
    )

    res.json({ quiz: updated })
  } catch (err) {
    console.error('Update quiz error:', err)
    res.status(500).json({ error: 'Failed to update quiz' })
  }
})

app.delete('/api/quizzes/:quizId', authenticateToken, (req, res) => {
  try {
    const { quizId } = req.params
    const quiz = getQuizById(quizId)

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' })
    }

    // Security check: verify ownership
    if (quiz.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this quiz' })
    }

    const success = deleteQuiz(quizId, req.user.userId)
    if (!success) {
      return res.status(500).json({ error: 'Failed to delete quiz' })
    }

    res.json({ success: true, message: 'Quiz deleted successfully' })
  } catch (err) {
    console.error('Delete quiz error:', err)
    res.status(500).json({ error: 'Failed to delete quiz' })
  }
})

app.get('/api/quizzes/:quizId/analytics', authenticateToken, (req, res) => {
  try {
    const { quizId } = req.params
    const quiz = getQuizById(quizId)

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' })
    }

    // Security check: verify ownership
    if (quiz.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to view analytics for this quiz' })
    }

    const analytics = getQuizAnalytics(quizId, req.user.userId)
    res.json({ analytics })
  } catch (err) {
    console.error('Get analytics error:', err)
    res.status(500).json({ error: 'Failed to retrieve analytics' })
  }
})

// --- Public Quiz Taking Routes ---

app.get('/api/public/quiz/:quizId', (req, res) => {
  try {
    const { quizId } = req.params
    const quiz = getQuizById(quizId)

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found or has been deleted' })
    }

    // Sanitize question options so correct answer flags are NOT revealed in public payload
    const sanitizedQuestions = quiz.questions.map(q => ({
      questionId: q.questionId,
      questionText: q.questionText,
      order: q.order,
      options: q.options.map(o => ({
        optionId: o.optionId,
        optionText: o.optionText
      }))
    }))

    res.json({
      quiz: {
        quizId: quiz.quizId,
        title: quiz.title,
        description: quiz.description,
        timerType: quiz.timerType,
        timerDuration: quiz.timerDuration,
        anonymous: quiz.anonymous,
        participantFields: quiz.participantFields,
        questionCount: sanitizedQuestions.length,
        questions: sanitizedQuestions
      }
    })
  } catch (err) {
    console.error('Get public quiz error:', err)
    res.status(500).json({ error: 'Failed to load quiz' })
  }
})

app.post('/api/public/quiz/:quizId/submit', (req, res) => {
  try {
    const { quizId } = req.params
    const quiz = getQuizById(quizId)

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found or has been deleted' })
    }

    const { participantData, answers, completionTimeSeconds } = req.body

    // Calculate score
    let correctCount = 0
    let incorrectCount = 0
    const processedAnswers = []

    quiz.questions.forEach(question => {
      const userAns = (answers || []).find(a => a.questionId === question.questionId)
      const selectedOptionIds = userAns ? userAns.selectedOptionIds || [] : []

      const correctOptionIds = question.options.filter(o => o.isCorrect).map(o => o.optionId)

      // An answer is correct if all selected options are correct and all correct options were selected
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

    const attemptId = `att_${crypto.randomBytes(12).toString('hex')}`

    saveQuizAttempt({
      attemptId,
      quizId,
      userId: quiz.userId,
      participantData: participantData || {},
      score: scorePercentage,
      totalQuestions,
      correctCount,
      incorrectCount,
      completionTimeSeconds: Number(completionTimeSeconds) || 0,
      answers: processedAnswers
    })

    if (quiz.showScore) {
      res.json({
        showScore: true,
        attemptId,
        totalQuestions,
        correctCount,
        incorrectCount,
        percentage: scorePercentage,
        scoreText: `${correctCount} / ${totalQuestions}`
      })
    } else {
      res.json({
        showScore: false,
        attemptId,
        message: 'Thank you for completing this quiz!'
      })
    }
  } catch (err) {
    console.error('Quiz submit error:', err)
    res.status(500).json({ error: 'Failed to submit quiz attempt' })
  }
})

app.listen(PORT, () => {
  console.log(`Quiz Hub API Server listening on port ${PORT}`)
})
