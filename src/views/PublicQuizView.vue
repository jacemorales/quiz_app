<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const quizId = computed(() => route.params.quizId)

// Game Flow States: 'loading' | 'intro' | 'participant_info' | 'taking' | 'confirm_submit' | 'result' | 'error'
const gameState = ref('loading')
const errorMessage = ref('')

const quiz = ref(null)
const currentQuestionIndex = ref(0)
const participantData = reactive({})
const userAnswers = reactive({}) // questionId -> array of selected optionIds

// Timers
const totalTimerSeconds = ref(0)
const questionTimerSeconds = ref(0)
let timerInterval = null
const startTime = ref(null)
const endTime = ref(null)

// Submission Result
const submissionResult = ref(null)
const submitting = ref(false)

async function fetchQuiz() {
  gameState.value = 'loading'
  try {
    const res = await fetch(`/api/public/quiz/${quizId.value}`)
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Quiz not found')
    }
    const data = await res.json()
    quiz.value = data.quiz
    gameState.value = 'intro'
  } catch (err) {
    errorMessage.value = err.message || 'Failed to load quiz'
    gameState.value = 'error'
  }
}

onMounted(() => {
  fetchQuiz()
})

onUnmounted(() => {
  clearInterval(timerInterval)
})

function startFlow() {
  if (quiz.value.anonymous) {
    startQuizTaking()
  } else {
    // Initialize participant fields
    if (Array.isArray(quiz.value.participantFields)) {
      quiz.value.participantFields.forEach(f => {
        participantData[f.fieldName] = ''
      })
    }
    gameState.value = 'participant_info'
  }
}

function handleParticipantInfoSubmit() {
  // Validate required participant fields
  if (Array.isArray(quiz.value.participantFields)) {
    for (const f of quiz.value.participantFields) {
      if (f.required && !participantData[f.fieldName]?.trim()) {
        alert(`Please fill in required field: ${f.fieldName}`)
        return
      }
    }
  }
  startQuizTaking()
}

function startQuizTaking() {
  gameState.value = 'taking'
  currentQuestionIndex.value = 0
  startTime.value = Date.now()

  // Setup timers
  if (quiz.value.timerType === 'quiz') {
    totalTimerSeconds.value = (Number(quiz.value.timerDuration) || 10) * 60
    startOverallTimer()
  } else if (quiz.value.timerType === 'question') {
    startQuestionTimer()
  }
}

function startOverallTimer() {
  clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    if (totalTimerSeconds.value > 0) {
      totalTimerSeconds.value--
    } else {
      clearInterval(timerInterval)
      alert('Time is up! Your quiz is being automatically submitted.')
      autoSubmitQuiz()
    }
  }, 1000)
}

function startQuestionTimer() {
  clearInterval(timerInterval)
  questionTimerSeconds.value = Number(quiz.value.timerDuration) || 30

  timerInterval = setInterval(() => {
    if (questionTimerSeconds.value > 0) {
      questionTimerSeconds.value--
    } else {
      clearInterval(timerInterval)
      // Auto move to next question or submit if on last question
      if (currentQuestionIndex.value < quiz.value.questions.length - 1) {
        currentQuestionIndex.value++
        startQuestionTimer()
      } else {
        autoSubmitQuiz()
      }
    }
  }, 1000)
}

const currentQuestion = computed(() => {
  if (!quiz.value || !quiz.value.questions) return null
  return quiz.value.questions[currentQuestionIndex.value]
})

function toggleOptionSelect(optionId) {
  const qId = currentQuestion.value.questionId
  if (!userAnswers[qId]) {
    userAnswers[qId] = []
  }

  const idx = userAnswers[qId].indexOf(optionId)
  if (idx === -1) {
    userAnswers[qId].push(optionId)
  } else {
    userAnswers[qId].splice(idx, 1)
  }
}

function selectSingleOption(optionId) {
  const qId = currentQuestion.value.questionId
  userAnswers[qId] = [optionId]
}

function isOptionSelected(optionId) {
  const qId = currentQuestion.value?.questionId
  return userAnswers[qId] ? userAnswers[qId].includes(optionId) : false
}

function nextQuestion() {
  if (currentQuestionIndex.value < quiz.value.questions.length - 1) {
    currentQuestionIndex.value++
    if (quiz.value.timerType === 'question') {
      startQuestionTimer()
    }
  }
}

function prevQuestion() {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--
    if (quiz.value.timerType === 'question') {
      startQuestionTimer()
    }
  }
}

function promptSubmit() {
  gameState.value = 'confirm_submit'
}

function cancelSubmit() {
  gameState.value = 'taking'
}

async function submitQuiz() {
  submitting.value = true
  clearInterval(timerInterval)
  endTime.value = Date.now()
  const completionTimeSeconds = Math.round((endTime.value - (startTime.value || Date.now())) / 1000)

  // Format payload
  const formattedAnswers = Object.keys(userAnswers).map(qId => ({
    questionId: qId,
    selectedOptionIds: userAnswers[qId]
  }))

  try {
    const res = await fetch(`/api/public/quiz/${quizId.value}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantData,
        answers: formattedAnswers,
        completionTimeSeconds
      })
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Failed to submit quiz')
    }

    submissionResult.value = data
    gameState.value = 'result'
  } catch (err) {
    alert(err.message || 'Error submitting quiz')
    gameState.value = 'taking'
  } finally {
    submitting.value = false
  }
}

function autoSubmitQuiz() {
  submitQuiz()
}

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s < 10 ? '0' : ''}${s}`
}
</script>

<template>
  <div class="public-quiz-page">
    <div class="quiz-card">

      <!-- LOADING STATE -->
      <div v-if="gameState === 'loading'" class="state-center">
        <div class="spinner"></div>
        <p>Loading Quiz...</p>
      </div>

      <!-- ERROR STATE -->
      <div v-else-if="gameState === 'error'" class="state-center">
        <div class="error-icon">❌</div>
        <h2>Quiz Unavailable</h2>
        <p>{{ errorMessage }}</p>
      </div>

      <!-- INTRO SCREEN -->
      <div v-else-if="gameState === 'intro'" class="intro-screen">
        <div class="quiz-badge">Quiz Hub</div>
        <h1 class="quiz-title">{{ quiz.title }}</h1>
        <p class="quiz-desc" v-if="quiz.description">{{ quiz.description }}</p>

        <div class="quiz-meta-grid">
          <div class="meta-item">
            <span class="meta-icon">❓</span>
            <span class="meta-val">{{ quiz.questionCount }} Questions</span>
          </div>
          <div class="meta-item">
            <span class="meta-icon">⏱️</span>
            <span class="meta-val">
              <template v-if="quiz.timerType === 'none'">No Time Limit</template>
              <template v-else-if="quiz.timerType === 'question'">{{ quiz.timerDuration }}s per question</template>
              <template v-else-if="quiz.timerType === 'quiz'">{{ quiz.timerDuration }}m total duration</template>
            </span>
          </div>
          <div class="meta-item">
            <span class="meta-icon">🔒</span>
            <span class="meta-val">{{ quiz.anonymous ? 'Anonymous' : 'Identification Required' }}</span>
          </div>
        </div>

        <div class="instructions-box">
          <h3>Instructions</h3>
          <p>Please read each question carefully before submitting your answer. Ensure you keep track of any active timers.</p>
        </div>

        <button @click="startFlow" class="btn btn-primary btn-lg w-full mt-24">
          Start Quiz →
        </button>
      </div>

      <!-- PARTICIPANT INFO SCREEN -->
      <div v-else-if="gameState === 'participant_info'" class="participant-screen">
        <h2>Participant Information</h2>
        <p class="subtext">Please fill in your information before starting the quiz.</p>

        <form @submit.prevent="handleParticipantInfoSubmit" class="participant-form mt-20">
          <div v-for="f in quiz.participantFields" :key="f.fieldName" class="form-group">
            <label>{{ f.fieldName }} <span v-if="f.required" class="text-danger">*</span></label>
            <input
              v-model="participantData[f.fieldName]"
              :type="f.fieldType || 'text'"
              :required="f.required"
              :placeholder="`Enter your ${f.fieldName.toLowerCase()}`"
              class="form-control"
            />
          </div>

          <button type="submit" class="btn btn-primary btn-lg w-full mt-20">
            Proceed to Quiz →
          </button>
        </form>
      </div>

      <!-- TAKING QUIZ SCREEN -->
      <div v-else-if="gameState === 'taking'" class="taking-screen">
        <!-- Header Bar with Timer & Progress -->
        <div class="taking-header">
          <div class="progress-info">
            <span class="q-number">Question {{ currentQuestionIndex + 1 }} of {{ quiz.questions.length }}</span>
            <div class="progress-bar-bg">
              <div
                class="progress-bar-fill"
                :style="{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }"
              ></div>
            </div>
          </div>

          <!-- Active Timer Display -->
          <div v-if="quiz.timerType === 'quiz'" class="active-timer badge-warning">
            ⏱️ Overall: {{ formatTimer(totalTimerSeconds) }}
          </div>
          <div v-if="quiz.timerType === 'question'" class="active-timer badge-danger">
            ⏳ Per Question: {{ questionTimerSeconds }}s
          </div>
        </div>

        <!-- Current Question Display -->
        <div class="question-body mt-24">
          <h2 class="question-text">{{ currentQuestion?.questionText }}</h2>

          <div class="options-list mt-20">
            <div
              v-for="opt in currentQuestion?.options"
              :key="opt.optionId"
              :class="['option-card', { selected: isOptionSelected(opt.optionId) }]"
              @click="toggleOptionSelect(opt.optionId)"
            >
              <div class="option-check-circle">
                <span v-if="isOptionSelected(opt.optionId)">✓</span>
              </div>
              <span class="option-text">{{ opt.optionText }}</span>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="taking-footer mt-32">
          <button
            @click="prevQuestion"
            :disabled="currentQuestionIndex === 0"
            class="btn btn-outline"
          >
            ← Previous
          </button>

          <button
            v-if="currentQuestionIndex < quiz.questions.length - 1"
            @click="nextQuestion"
            class="btn btn-primary ml-auto"
          >
            Next Question →
          </button>

          <button
            v-else
            @click="promptSubmit"
            class="btn btn-primary btn-lg ml-auto"
          >
            Submit Quiz
          </button>
        </div>
      </div>

      <!-- CONFIRM SUBMIT MODAL / OVERLAY -->
      <div v-else-if="gameState === 'confirm_submit'" class="confirm-screen">
        <div class="confirm-box">
          <h2>Ready to Submit?</h2>
          <p>Are you sure you want to submit your answers? Once submitted, you cannot change your choices.</p>

          <div class="confirm-actions mt-24">
            <button @click="cancelSubmit" :disabled="submitting" class="btn btn-outline">
              Back to Quiz
            </button>
            <button @click="submitQuiz" :disabled="submitting" class="btn btn-primary btn-lg">
              <span v-if="submitting">Submitting...</span>
              <span v-else>Confirm & Submit</span>
            </button>
          </div>
        </div>
      </div>

      <!-- SCORE RESULT / THANK YOU SCREEN -->
      <div v-else-if="gameState === 'result'" class="result-screen">
        <template v-if="submissionResult?.showScore">
          <div class="result-badge">🎉 Quiz Completed!</div>
          <h1 class="result-score-percentage">{{ submissionResult?.percentage }}%</h1>
          <p class="result-score-sub">Score: {{ submissionResult?.correctCount }} / {{ submissionResult?.totalQuestions }} Correct</p>

          <div class="result-stats-cards mt-24">
            <div class="res-card bg-success">
              <span class="res-num">{{ submissionResult?.correctCount }}</span>
              <span class="res-lbl">Correct Answers</span>
            </div>
            <div class="res-card bg-danger">
              <span class="res-num">{{ submissionResult?.incorrectCount }}</span>
              <span class="res-lbl">Incorrect Answers</span>
            </div>
            <div class="res-card bg-neutral">
              <span class="res-num">{{ submissionResult?.totalQuestions }}</span>
              <span class="res-lbl">Total Questions</span>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="thank-you-box">
            <div class="thank-you-icon">🙌</div>
            <h1>Thank You!</h1>
            <p>{{ submissionResult?.message || 'Thank you for completing this quiz.' }}</p>
          </div>
        </template>
      </div>

    </div>
  </div>
</template>

<style scoped>
.public-quiz-page {
  min-height: calc(100vh - 120px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
}

.quiz-card {
  background: var(--white);
  border-radius: var(--radius-lg);
  border: 1px solid var(--gray-200);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 680px;
  padding: 40px;
}

.state-center {
  text-align: center;
  padding: 40px 0;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.quiz-badge {
  display: inline-block;
  padding: 4px 12px;
  background: var(--primary-light);
  color: var(--primary);
  font-weight: 700;
  font-size: 0.8rem;
  border-radius: 9999px;
  margin-bottom: 12px;
}

.quiz-title {
  font-size: 2rem;
  font-weight: 900;
  color: var(--dark);
  margin-bottom: 12px;
}

.quiz-desc {
  color: var(--gray-600);
  font-size: 1.05rem;
  margin-bottom: 24px;
}

.quiz-meta-grid {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 28px;
}

.meta-item {
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  padding: 10px 16px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.9rem;
}

.instructions-box {
  background: #f8fafc;
  border-left: 4px solid var(--primary);
  padding: 16px;
  border-radius: var(--radius-sm);
}

.instructions-box h3 {
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.instructions-box p {
  font-size: 0.9rem;
  color: var(--gray-600);
}

/* Participant Screen */
.subtext {
  color: var(--gray-500);
  font-size: 0.95rem;
}

.participant-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-weight: 600;
  font-size: 0.9rem;
}

.form-control {
  padding: 12px 16px;
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-sm);
  font-size: 0.95rem;
}

/* Taking Screen */
.taking-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--gray-200);
}

.progress-info {
  flex: 1;
}

.q-number {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--gray-500);
}

.progress-bar-bg {
  height: 8px;
  background: var(--gray-200);
  border-radius: 9999px;
  overflow: hidden;
  margin-top: 6px;
}

.progress-bar-fill {
  height: 100%;
  background: var(--primary);
  transition: width 0.3s ease;
}

.active-timer {
  font-weight: 800;
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 0.875rem;
}

.badge-warning { background: #fef3c7; color: #92400e; }
.badge-danger { background: #fee2e2; color: #991b1b; }

.question-text {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--dark);
  line-height: 1.4;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-card:hover {
  border-color: var(--primary);
  background: var(--gray-50);
}

.option-card.selected {
  border-color: var(--primary);
  background: var(--primary-light);
}

.option-check-circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid var(--gray-300);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.85rem;
  color: var(--white);
  flex-shrink: 0;
}

.option-card.selected .option-check-circle {
  background: var(--primary);
  border-color: var(--primary);
}

.option-text {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--dark);
}

.taking-footer {
  display: flex;
  align-items: center;
}

.ml-auto { margin-left: auto; }
.mt-20 { margin-top: 20px; }
.mt-24 { margin-top: 24px; }
.mt-32 { margin-top: 32px; }
.w-full { width: 100%; }

/* Confirm Box */
.confirm-box {
  text-align: center;
  padding: 20px 0;
}

.confirm-box h2 {
  font-size: 1.75rem;
  font-weight: 800;
  margin-bottom: 8px;
}

.confirm-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

/* Result Screen */
.result-screen {
  text-align: center;
  padding: 20px 0;
}

.result-badge {
  display: inline-block;
  padding: 6px 16px;
  background: #d1fae5;
  color: #065f46;
  font-weight: 800;
  border-radius: 9999px;
  margin-bottom: 16px;
}

.result-score-percentage {
  font-size: 4rem;
  font-weight: 900;
  color: var(--primary);
  line-height: 1;
}

.result-score-sub {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--gray-600);
  margin-top: 8px;
}

.result-stats-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.res-card {
  padding: 16px;
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
}

.bg-success { background: #d1fae5; color: #065f46; }
.bg-danger { background: #fee2e2; color: #991b1b; }
.bg-neutral { background: var(--gray-100); color: var(--gray-800); }

.res-num {
  font-size: 1.75rem;
  font-weight: 900;
}

.res-lbl {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
}

.thank-you-box {
  padding: 30px 0;
}

.thank-you-icon {
  font-size: 4rem;
  margin-bottom: 12px;
}

.thank-you-box h1 {
  font-size: 2.25rem;
  font-weight: 800;
  margin-bottom: 8px;
}

.thank-you-box p {
  color: var(--gray-600);
  font-size: 1.1rem;
}
</style>
