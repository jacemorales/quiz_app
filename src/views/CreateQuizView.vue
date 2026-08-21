<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useQuizStore } from '../composables/useQuizStore'

const router = useRouter()
const route = useRoute()
const { user } = useAuth()
const { getQuizById, createQuiz, updateQuiz } = useQuizStore()

const isEditing = computed(() => Boolean(route.params.quizId))
const quizIdToEdit = computed(() => route.params.quizId || null)

const currentStep = ref(1)
const totalSteps = 6

const saving = ref(false)
const loadingQuiz = ref(false)
const wizardError = ref('')

// Quiz Form State
const quizForm = reactive({
  title: '',
  description: '',
  timerType: 'none', // 'none' | 'question' | 'quiz'
  timerDuration: 30, // seconds for question, minutes for entire quiz
  anonymous: true,
  participantFields: [
    { fieldName: 'Full Name', fieldType: 'text', required: true },
    { fieldName: 'Email Address', fieldType: 'email', required: true }
  ],
  showScore: true,
  questions: [
    {
      questionId: `q_${Math.random().toString(36).substring(2, 9)}`,
      questionText: '',
      options: [
        { optionId: `opt_${Math.random().toString(36).substring(2, 9)}`, optionText: '', isCorrect: true },
        { optionId: `opt_${Math.random().toString(36).substring(2, 9)}`, optionText: '', isCorrect: false }
      ]
    }
  ]
})

// Success Modal State
const showSuccessModal = ref(false)
const createdQuizResult = ref(null)
const toastMessage = ref('')

function showToast(msg) {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = ''
  }, 3000)
}

onMounted(() => {
  if (isEditing.value && quizIdToEdit.value) {
    loadingQuiz.value = true
    try {
      const quiz = getQuizById(quizIdToEdit.value)
      if (!quiz) {
        throw new Error('Quiz not found for editing')
      }

      quizForm.title = quiz.title
      quizForm.description = quiz.description || ''
      quizForm.timerType = quiz.timerType || 'none'
      quizForm.timerDuration = quiz.timerDuration || 30
      quizForm.anonymous = Boolean(quiz.anonymous)
      quizForm.participantFields = Array.isArray(quiz.participantFields) && quiz.participantFields.length > 0
        ? quiz.participantFields
        : [
            { fieldName: 'Full Name', fieldType: 'text', required: true },
            { fieldName: 'Email Address', fieldType: 'email', required: true }
          ]
      quizForm.showScore = quiz.showScore !== undefined ? Boolean(quiz.showScore) : true

      if (Array.isArray(quiz.questions) && quiz.questions.length > 0) {
        quizForm.questions = quiz.questions.map(q => ({
          questionId: q.questionId,
          questionText: q.questionText,
          options: (q.options || []).map(o => ({
            optionId: o.optionId,
            optionText: o.optionText,
            isCorrect: Boolean(o.isCorrect)
          }))
        }))
      }
    } catch (err) {
      wizardError.value = err.message || 'Error loading quiz for editing'
    } finally {
      loadingQuiz.value = false
    }
  }
})

// --- Step Navigation & Validation ---

function nextStep() {
  wizardError.value = ''

  if (currentStep.value === 1) {
    if (!quizForm.title.trim()) {
      wizardError.value = 'Quiz Title is required'
      return
    }
  }

  if (currentStep.value === 2) {
    if (quizForm.timerType !== 'none') {
      const duration = Number(quizForm.timerDuration)
      if (isNaN(duration) || duration <= 0) {
        wizardError.value = 'Timer duration must be a positive number'
        return
      }
    }
  }

  if (currentStep.value === 3) {
    if (!quizForm.anonymous) {
      if (quizForm.participantFields.length === 0) {
        wizardError.value = 'Please add at least one participant information field or enable anonymous mode'
        return
      }
      for (const field of quizForm.participantFields) {
        if (!field.fieldName.trim()) {
          wizardError.value = 'All participant fields must have a field name'
          return
        }
      }
    }
  }

  if (currentStep.value === 5) {
    if (quizForm.questions.length === 0) {
      wizardError.value = 'Quiz must contain at least one question'
      return
    }

    for (let i = 0; i < quizForm.questions.length; i++) {
      const q = quizForm.questions[i]
      if (!q.questionText.trim()) {
        wizardError.value = `Question ${i + 1} text cannot be empty`
        return
      }
      if (q.options.length < 2) {
        wizardError.value = `Question ${i + 1} must have at least 2 answer options`
        return
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].optionText.trim()) {
          wizardError.value = `Question ${i + 1}, Option ${j + 1} cannot be empty`
          return
        }
      }
      const hasCorrect = q.options.some(opt => opt.isCorrect)
      if (!hasCorrect) {
        wizardError.value = `Question ${i + 1} must have at least one correct answer checked`
        return
      }
    }
  }

  if (currentStep.value < totalSteps) {
    currentStep.value++
  }
}

function prevStep() {
  wizardError.value = ''
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

// --- Dynamic Field Operations (Participant Fields) ---

function addParticipantField() {
  quizForm.participantFields.push({
    fieldName: '',
    fieldType: 'text',
    required: true
  })
}

function removeParticipantField(index) {
  quizForm.participantFields.splice(index, 1)
}

// --- Dynamic Question & Option Operations ---

function addQuestion() {
  quizForm.questions.push({
    questionId: `q_${Math.random().toString(36).substring(2, 9)}`,
    questionText: '',
    options: [
      { optionId: `opt_${Math.random().toString(36).substring(2, 9)}`, optionText: '', isCorrect: true },
      { optionId: `opt_${Math.random().toString(36).substring(2, 9)}`, optionText: '', isCorrect: false }
    ]
  })
}

function removeQuestion(index) {
  if (quizForm.questions.length <= 1) {
    wizardError.value = 'Quiz must have at least one question'
    return
  }
  quizForm.questions.splice(index, 1)
}

function moveQuestionUp(index) {
  if (index === 0) return
  const temp = quizForm.questions[index]
  quizForm.questions[index] = quizForm.questions[index - 1]
  quizForm.questions[index - 1] = temp
}

function moveQuestionDown(index) {
  if (index === quizForm.questions.length - 1) return
  const temp = quizForm.questions[index]
  quizForm.questions[index] = quizForm.questions[index + 1]
  quizForm.questions[index + 1] = temp
}

function addOption(qIndex) {
  quizForm.questions[qIndex].options.push({
    optionId: `opt_${Math.random().toString(36).substring(2, 9)}`,
    optionText: '',
    isCorrect: false
  })
}

function removeOption(qIndex, oIndex) {
  if (quizForm.questions[qIndex].options.length <= 2) {
    wizardError.value = 'Each question must have at least 2 options'
    return
  }
  quizForm.questions[qIndex].options.splice(oIndex, 1)
}

// --- Submit / Generate Quiz ---

function handleGenerateQuiz() {
  wizardError.value = ''
  saving.value = true

  try {
    if (!user.value) {
      throw new Error('Please log in to save a quiz')
    }

    if (isEditing.value && quizIdToEdit.value) {
      const updated = updateQuiz(quizIdToEdit.value, quizForm, user.value.userId)
      const fullUrl = `${window.location.origin}/quiz/${updated.quizId}`
      createdQuizResult.value = {
        quizId: updated.quizId,
        title: updated.title,
        url: fullUrl
      }
    } else {
      const { quiz: created, quizUrl } = createQuiz(quizForm, user.value.userId)
      createdQuizResult.value = {
        quizId: created.quizId,
        title: created.title,
        url: quizUrl
      }
    }

    showSuccessModal.value = true
  } catch (err) {
    wizardError.value = err.message || 'Error saving quiz'
  } finally {
    saving.value = false
  }
}

function copySuccessUrl() {
  if (!createdQuizResult.value) return
  navigator.clipboard.writeText(createdQuizResult.value.url).then(() => {
    showToast('Quiz URL copied!')
  })
}

function openQuiz() {
  if (!createdQuizResult.value) return
  window.open(createdQuizResult.value.url, '_blank')
}

function goToDashboard() {
  router.push('/dashboard')
}
</script>

<template>
  <div class="builder-page">
    <div class="builder-container">
      <!-- Toast Notification -->
      <transition name="fade">
        <div v-if="toastMessage" class="toast-notification">
          ✨ {{ toastMessage }}
        </div>
      </transition>

      <!-- Wizard Header -->
      <div class="builder-header">
        <h1>{{ isEditing ? 'Edit Quiz' : 'Create New Quiz' }}</h1>
        <p>Follow the multi-step builder to configure settings, participants, questions, and timing.</p>
      </div>

      <!-- Step Indicator Bar -->
      <div class="step-indicator-bar">
        <div
          v-for="s in totalSteps"
          :key="s"
          :class="['step-pill', { active: currentStep === s, completed: currentStep > s }]"
          @click="s < currentStep ? (currentStep = s) : null"
        >
          <span class="step-num">{{ s }}</span>
          <span class="step-name">
            <template v-if="s === 1">Basic Info</template>
            <template v-else-if="s === 2">Timer</template>
            <template v-else-if="s === 3">Participants</template>
            <template v-else-if="s === 4">Score</template>
            <template v-else-if="s === 5">Questions</template>
            <template v-else-if="s === 6">Review</template>
          </span>
        </div>
      </div>

      <!-- Error Message Banner -->
      <div v-if="wizardError" class="wizard-error">
        ⚠️ {{ wizardError }}
      </div>

      <!-- Loading state when fetching quiz for edit -->
      <div v-if="loadingQuiz" class="loading-box">
        <div class="spinner"></div>
        <p>Loading quiz configuration...</p>
      </div>

      <!-- Step Content Cards -->
      <div v-else class="step-card">
        <!-- STEP 1: BASIC INFORMATION -->
        <div v-if="currentStep === 1" class="step-content">
          <h2 class="step-title">Step 1: Quiz Basic Information</h2>
          <p class="step-description">Provide a clear title and description for your participants.</p>

          <div class="form-group">
            <label for="quizTitle">Quiz Title <span class="required">*</span></label>
            <input
              id="quizTitle"
              v-model="quizForm.title"
              type="text"
              placeholder="e.g. General Knowledge Quiz"
              class="form-control"
            />
          </div>

          <div class="form-group">
            <label for="quizDesc">Quiz Description <span class="optional">(Optional)</span></label>
            <textarea
              id="quizDesc"
              v-model="quizForm.description"
              rows="3"
              placeholder="Explain the purpose or topics covered in this quiz..."
              class="form-control"
            ></textarea>
          </div>
        </div>

        <!-- STEP 2: TIMER SETTINGS -->
        <div v-if="currentStep === 2" class="step-content">
          <h2 class="step-title">Step 2: Timer Settings</h2>
          <p class="step-description">How would you like the timer to work for participants?</p>

          <div class="radio-options-grid">
            <label :class="['radio-card', { selected: quizForm.timerType === 'none' }]">
              <input type="radio" v-model="quizForm.timerType" value="none" />
              <div class="radio-card-content">
                <span class="radio-card-title">⏳ No Timer</span>
                <span class="radio-card-sub">Participants take the quiz without any time limit.</span>
              </div>
            </label>

            <label :class="['radio-card', { selected: quizForm.timerType === 'question' }]">
              <input type="radio" v-model="quizForm.timerType" value="question" />
              <div class="radio-card-content">
                <span class="radio-card-title">⏱️ Timer Per Question</span>
                <span class="radio-card-sub">Each question has its own individual countdown timer.</span>
              </div>
            </label>

            <label :class="['radio-card', { selected: quizForm.timerType === 'quiz' }]">
              <input type="radio" v-model="quizForm.timerType" value="quiz" />
              <div class="radio-card-content">
                <span class="radio-card-title">⏲️ Timer For Entire Quiz</span>
                <span class="radio-card-sub">The overall quiz has one master countdown timer.</span>
              </div>
            </label>
          </div>

          <!-- Dynamic Duration Inputs -->
          <div v-if="quizForm.timerType === 'question'" class="timer-duration-input form-group mt-20">
            <label for="questionTimer">Time per question (seconds)</label>
            <input
              id="questionTimer"
              v-model.number="quizForm.timerDuration"
              type="number"
              min="5"
              max="600"
              class="form-control short-input"
            />
          </div>

          <div v-if="quizForm.timerType === 'quiz'" class="timer-duration-input form-group mt-20">
            <label for="quizTimer">Quiz total duration (minutes)</label>
            <input
              id="quizTimer"
              v-model.number="quizForm.timerDuration"
              type="number"
              min="1"
              max="180"
              class="form-control short-input"
            />
          </div>
        </div>

        <!-- STEP 3: ANONYMOUS SETTINGS & PARTICIPANT FIELDS -->
        <div v-if="currentStep === 3" class="step-content">
          <h2 class="step-title">Step 3: Participant Information</h2>
          <p class="step-description">Should participants submit anonymously or identify themselves?</p>

          <div class="toggle-group">
            <label class="toggle-label">Should this quiz be anonymous?</label>
            <div class="toggle-buttons">
              <button
                type="button"
                :class="['btn', quizForm.anonymous ? 'btn-primary' : 'btn-outline']"
                @click="quizForm.anonymous = true"
              >
                Yes, Anonymous
              </button>
              <button
                type="button"
                :class="['btn', !quizForm.anonymous ? 'btn-primary' : 'btn-outline']"
                @click="quizForm.anonymous = false"
              >
                No, Collect Information
              </button>
            </div>
          </div>

          <!-- If Anonymous = No, Display Field Builder -->
          <div v-if="!quizForm.anonymous" class="participant-fields-builder mt-28">
            <div class="builder-sub-header">
              <h3>Participant Information Fields</h3>
              <p>Configure the fields required before participants start the quiz.</p>
            </div>

            <div class="fields-list">
              <div v-for="(field, index) in quizForm.participantFields" :key="index" class="field-item-card">
                <div class="form-group flex-2">
                  <label>Field Name</label>
                  <input
                    v-model="field.fieldName"
                    type="text"
                    placeholder="e.g. Student ID, Department..."
                    class="form-control"
                  />
                </div>

                <div class="form-group flex-1">
                  <label>Type</label>
                  <select v-model="field.fieldType" class="form-control">
                    <option value="text">Text</option>
                    <option value="email">Email</option>
                    <option value="tel">Phone</option>
                    <option value="number">Number</option>
                  </select>
                </div>

                <div class="form-group flex-initial">
                  <label>Required?</label>
                  <label class="checkbox-inline">
                    <input type="checkbox" v-model="field.required" /> Yes
                  </label>
                </div>

                <button
                  type="button"
                  @click="removeParticipantField(index)"
                  class="btn btn-outline btn-sm btn-icon-only text-danger"
                  title="Remove Field"
                >
                  🗑️
                </button>
              </div>
            </div>

            <button type="button" @click="addParticipantField" class="btn btn-outline btn-sm mt-16">
              + Add Field
            </button>
          </div>
        </div>

        <!-- STEP 4: SCORE VISIBILITY -->
        <div v-if="currentStep === 4" class="step-content">
          <h2 class="step-title">Step 4: Score Visibility</h2>
          <p class="step-description">Should participants see their score immediately after submitting?</p>

          <div class="radio-options-grid">
            <label :class="['radio-card', { selected: quizForm.showScore === true }]">
              <input type="radio" :value="true" v-model="quizForm.showScore" />
              <div class="radio-card-content">
                <span class="radio-card-title">📊 Show Score Immediately</span>
                <span class="radio-card-sub">Participants see correct/incorrect breakdown and percentage score upon submission.</span>
              </div>
            </label>

            <label :class="['radio-card', { selected: quizForm.showScore === false }]">
              <input type="radio" :value="false" v-model="quizForm.showScore" />
              <div class="radio-card-content">
                <span class="radio-card-title">🙏 Hide Score (Thank You Screen)</span>
                <span class="radio-card-sub">Show a professional "Thank you for completing this quiz" screen without revealing scores.</span>
              </div>
            </label>
          </div>
        </div>

        <!-- STEP 5: QUESTION BUILDER -->
        <div v-if="currentStep === 5" class="step-content">
          <h2 class="step-title">Step 5: Quiz Question Builder</h2>
          <p class="step-description">Add questions, specify answer options, and check correct answer(s).</p>

          <div class="questions-stack">
            <div v-for="(q, qIndex) in quizForm.questions" :key="q.questionId" class="question-card">
              <div class="question-card-header">
                <span class="question-number-badge">Question {{ qIndex + 1 }}</span>
                <div class="question-controls">
                  <button
                    type="button"
                    @click="moveQuestionUp(qIndex)"
                    :disabled="qIndex === 0"
                    class="btn btn-outline btn-sm"
                    title="Move Up"
                  >
                    ⬆️
                  </button>
                  <button
                    type="button"
                    @click="moveQuestionDown(qIndex)"
                    :disabled="qIndex === quizForm.questions.length - 1"
                    class="btn btn-outline btn-sm"
                    title="Move Down"
                  >
                    ⬇️
                  </button>
                  <button
                    type="button"
                    @click="removeQuestion(qIndex)"
                    class="btn btn-danger btn-sm"
                    title="Delete Question"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>

              <div class="form-group mb-16">
                <input
                  v-model="q.questionText"
                  type="text"
                  placeholder="Enter your question here..."
                  class="form-control question-input"
                />
              </div>

              <div class="options-builder">
                <label class="options-label">Answer Options (check checkbox for correct answer(s)):</label>
                <div v-for="(opt, oIndex) in q.options" :key="opt.optionId" class="option-row">
                  <label class="checkbox-wrapper">
                    <input type="checkbox" v-model="opt.isCorrect" class="correct-checkbox" />
                    <span class="checkmark"></span>
                  </label>
                  <input
                    v-model="opt.optionText"
                    type="text"
                    :placeholder="`Option ${oIndex + 1}...`"
                    :class="['form-control', { 'is-correct-border': opt.isCorrect }]"
                  />
                  <button
                    type="button"
                    @click="removeOption(qIndex, oIndex)"
                    class="btn btn-outline btn-sm text-danger"
                    title="Remove Option"
                  >
                    ❌
                  </button>
                </div>

                <button type="button" @click="addOption(qIndex)" class="btn btn-outline btn-sm mt-12">
                  + Add Option
                </button>
              </div>
            </div>
          </div>

          <button type="button" @click="addQuestion" class="btn btn-primary btn-lg mt-24 w-full">
            + Add Question
          </button>
        </div>

        <!-- STEP 6: REVIEW BEFORE GENERATION -->
        <div v-if="currentStep === 6" class="step-content">
          <h2 class="step-title">Step 6: Review Before Generation</h2>
          <p class="step-description">Verify all quiz details and questions before publishing.</p>

          <div class="review-summary-card">
            <h3>Quiz Details</h3>
            <div class="review-grid">
              <div class="review-item">
                <span class="review-label">Title</span>
                <span class="review-val">{{ quizForm.title }}</span>
              </div>
              <div class="review-item">
                <span class="review-label">Description</span>
                <span class="review-val">{{ quizForm.description || 'None' }}</span>
              </div>
              <div class="review-item">
                <span class="review-label">Timer</span>
                <span class="review-val">
                  <template v-if="quizForm.timerType === 'none'">No Timer</template>
                  <template v-else-if="quizForm.timerType === 'question'">{{ quizForm.timerDuration }} seconds per question</template>
                  <template v-else-if="quizForm.timerType === 'quiz'">{{ quizForm.timerDuration }} minutes total duration</template>
                </span>
              </div>
              <div class="review-item">
                <span class="review-label">Anonymous Mode</span>
                <span class="review-val">{{ quizForm.anonymous ? 'Yes' : 'No' }}</span>
              </div>
              <div v-if="!quizForm.anonymous" class="review-item">
                <span class="review-label">Participant Fields</span>
                <span class="review-val">
                  {{ quizForm.participantFields.map(f => f.fieldName).join(', ') }}
                </span>
              </div>
              <div class="review-item">
                <span class="review-label">Score Visibility</span>
                <span class="review-val">{{ quizForm.showScore ? 'Show Score' : 'Thank You Screen' }}</span>
              </div>
            </div>
          </div>

          <div class="review-questions-card mt-24">
            <h3>Questions Overview ({{ quizForm.questions.length }})</h3>
            <div v-for="(q, index) in quizForm.questions" :key="index" class="review-q-item">
              <div class="review-q-title">
                <strong>Q{{ index + 1 }}:</strong> {{ q.questionText }}
              </div>
              <ul class="review-q-options">
                <li
                  v-for="opt in q.options"
                  :key="opt.optionId"
                  :class="{ 'correct-option': opt.isCorrect }"
                >
                  {{ opt.optionText }}
                  <span v-if="opt.isCorrect" class="correct-badge">✓ Correct</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Wizard Navigation Footer -->
        <div class="wizard-navigation">
          <button
            v-if="currentStep > 1"
            type="button"
            @click="prevStep"
            :disabled="saving"
            class="btn btn-outline"
          >
            ← Back / Edit
          </button>

          <button
            v-if="currentStep < totalSteps"
            type="button"
            @click="nextStep"
            class="btn btn-primary ml-auto"
          >
            Continue →
          </button>

          <button
            v-if="currentStep === totalSteps"
            type="button"
            @click="handleGenerateQuiz"
            :disabled="saving"
            class="btn btn-primary btn-lg ml-auto"
          >
            <span v-if="saving">{{ isEditing ? 'Saving...' : 'Generating Quiz...' }}</span>
            <span v-else>🚀 {{ isEditing ? 'Update Quiz' : 'Generate Quiz' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Success Modal -->
    <div v-if="showSuccessModal" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <span class="modal-icon">🎉</span>
          <h3>{{ isEditing ? 'Quiz Updated Successfully!' : 'Quiz Created Successfully!' }}</h3>
        </div>
        <div class="modal-body">
          <p>Your quiz <strong>"{{ createdQuizResult?.title }}"</strong> is now ready to share.</p>

          <div class="quiz-url-box">
            <span class="url-label">Unique Quiz URL:</span>
            <div class="url-input-group">
              <input type="text" readonly :value="createdQuizResult?.url" class="form-control" />
              <button @click="copySuccessUrl" class="btn btn-primary">Copy URL</button>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button @click="openQuiz" class="btn btn-outline">
            Open Quiz ↗
          </button>
          <button @click="goToDashboard" class="btn btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.builder-page {
  padding: 40px 24px;
  max-width: 900px;
  margin: 0 auto;
}

.toast-notification {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: var(--dark);
  color: var(--white);
  padding: 12px 20px;
  border-radius: var(--radius);
  font-weight: 600;
  box-shadow: var(--shadow-lg);
  z-index: 2000;
}

.builder-header {
  text-align: center;
  margin-bottom: 32px;
}

.builder-header h1 {
  font-size: 2.25rem;
  font-weight: 800;
  color: var(--dark);
}

.builder-header p {
  color: var(--gray-500);
  font-size: 1rem;
}

.step-indicator-bar {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 32px;
  background: var(--white);
  padding: 12px;
  border-radius: var(--radius);
  border: 1px solid var(--gray-200);
}

.step-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  color: var(--gray-400);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.step-pill.active {
  background: var(--primary-light);
  color: var(--primary);
}

.step-pill.completed {
  color: var(--success);
}

.step-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--gray-200);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
}

.step-pill.active .step-num {
  background: var(--primary);
  color: var(--white);
}

.step-pill.completed .step-num {
  background: var(--success);
  color: var(--white);
}

.wizard-error {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: var(--danger);
  padding: 14px 18px;
  border-radius: var(--radius);
  font-weight: 600;
  margin-bottom: 24px;
}

.step-card {
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  padding: 36px;
  box-shadow: var(--shadow-sm);
}

.step-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--dark);
  margin-bottom: 6px;
}

.step-description {
  color: var(--gray-500);
  margin-bottom: 28px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
}

.form-group label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--gray-700);
}

.required {
  color: var(--danger);
}

.optional {
  color: var(--gray-400);
  font-weight: 400;
}

.form-control {
  padding: 12px 16px;
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-sm);
  font-size: 0.95rem;
  transition: all 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.radio-options-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.radio-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--gray-300);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
}

.radio-card:hover {
  border-color: var(--primary);
  background: var(--gray-50);
}

.radio-card.selected {
  border-color: var(--primary);
  background: var(--primary-light);
}

.radio-card input {
  margin-top: 4px;
}

.radio-card-content {
  display: flex;
  flex-direction: column;
}

.radio-card-title {
  font-weight: 700;
  color: var(--dark);
  font-size: 1.05rem;
}

.radio-card-sub {
  font-size: 0.875rem;
  color: var(--gray-600);
  margin-top: 2px;
}

.short-input {
  max-width: 200px;
}

.toggle-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toggle-label {
  font-weight: 700;
  font-size: 1rem;
}

.toggle-buttons {
  display: flex;
  gap: 16px;
}

.participant-fields-builder {
  background: var(--gray-50);
  padding: 24px;
  border-radius: var(--radius);
  border: 1px solid var(--gray-200);
}

.field-item-card {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.flex-1 { flex: 1; }
.flex-2 { flex: 2; }
.flex-initial { flex: initial; }

.checkbox-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  margin-top: 10px;
}

/* Question Builder Styling */
.questions-stack {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.question-card {
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 24px;
}

.question-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.question-number-badge {
  font-weight: 800;
  color: var(--primary);
  background: var(--primary-light);
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 0.875rem;
}

.question-controls {
  display: flex;
  gap: 8px;
}

.question-input {
  font-weight: 600;
  font-size: 1.05rem;
  background: var(--white);
}

.options-builder {
  margin-top: 16px;
}

.options-label {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--gray-600);
  margin-bottom: 8px;
  display: block;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.correct-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.is-correct-border {
  border-color: var(--success) !important;
  background-color: #f0fdf4;
}

.wizard-navigation {
  display: flex;
  align-items: center;
  margin-top: 36px;
  padding-top: 24px;
  border-top: 1px solid var(--gray-200);
}

.ml-auto {
  margin-left: auto;
}

.mt-12 { margin-top: 12px; }
.mt-16 { margin-top: 16px; }
.mt-20 { margin-top: 20px; }
.mt-24 { margin-top: 24px; }
.mt-28 { margin-top: 28px; }
.mb-16 { margin-bottom: 16px; }
.w-full { width: 100%; }

/* Review Styling */
.review-summary-card, .review-questions-card {
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 24px;
}

.review-summary-card h3, .review-questions-card h3 {
  font-size: 1.2rem;
  font-weight: 800;
  margin-bottom: 16px;
  color: var(--dark);
}

.review-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.review-item {
  display: flex;
  flex-direction: column;
}

.review-label {
  font-size: 0.8rem;
  color: var(--gray-500);
  text-transform: uppercase;
  font-weight: 700;
}

.review-val {
  font-weight: 600;
  color: var(--dark);
}

.review-q-item {
  border-bottom: 1px solid var(--gray-200);
  padding: 12px 0;
}

.review-q-item:last-child {
  border-bottom: none;
}

.review-q-title {
  font-size: 0.975rem;
  margin-bottom: 8px;
}

.review-q-options {
  list-style: none;
  padding-left: 16px;
  font-size: 0.9rem;
}

.review-q-options li {
  color: var(--gray-600);
  margin-bottom: 4px;
}

.review-q-options li.correct-option {
  color: var(--success);
  font-weight: 700;
}

.correct-badge {
  background: #d1fae5;
  color: #065f46;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  margin-left: 6px;
}

/* Success Modal Details */
.quiz-url-box {
  background: var(--gray-50);
  padding: 16px;
  border-radius: var(--radius);
  border: 1px solid var(--gray-200);
  margin-top: 16px;
}

.url-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--gray-600);
  display: block;
  margin-bottom: 8px;
}

.url-input-group {
  display: flex;
  gap: 8px;
}

@media (max-width: 640px) {
  .step-pill .step-name {
    display: none;
  }
  .toggle-buttons {
    flex-direction: column;
  }
  .field-item-card {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
