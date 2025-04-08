<template>
  <div class="swipe-quiz">
    <h2>Swipe Quiz</h2>
    <div class="quiz-progress">
      <div class="progress-bar" :style="{ width: progress + '%' }"></div>
    </div>
    
    <div 
      v-if="!quizComplete"
      class="swipe-container"
      :class="{
        'correct-background': isCorrect,
        'incorrect-background': isIncorrect
      }"
      @touchstart="touchStart"
      @touchmove="touchMove"
      @touchend="touchEnd"
      @mousedown="mouseStart"
      @mousemove="mouseMove"
      @mouseup="mouseEnd"
      @mouseleave="mouseEnd"
    >
      <div class="flex-container">
        <div 
          class="card"
          :class="{
            'swipe-left': isSwipingLeft,
            'swipe-right': isSwipingRight,
            'correct': isCorrect,
            'incorrect': isIncorrect
          }"
          :style="{ transform: `translateX(${touchOffset}px)` }"
        >
          <div class="card-content">
            <h3>Question {{ currentQuestion + 1 }}</h3>
            <p>{{ currentCard.question }}</p>
            <div class="swipe-hint">
              <span class="left">← False</span>
              <span class="right">True →</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="completion-screen">
      <h3>Quiz Complete!</h3>
      <p>You got {{ correctAnswers }} out of {{ questions.length }} correct!</p>
      <button @click="resetQuiz">Try Again</button>
    </div>

    <div v-if="showFeedback" class="feedback" :class="feedbackType">
      {{ feedbackMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const questions = ref([
  {
    question: 'The Earth is flat.',
    answer: false
  },
  {
    question: 'Water boils at 100°C at sea level.',
    answer: true
  },
  {
    question: 'The sun rises in the west.',
    answer: false
  },
  {
    question: 'The moon is made of cheese.',
    answer: false
  },
  {
    question: 'Light travels faster than sound.',
    answer: true
  }
])

const currentQuestion = ref(0)
const isSwipingLeft = ref(false)
const isSwipingRight = ref(false)
const isCorrect = ref(false)
const isIncorrect = ref(false)
const showFeedback = ref(false)
const feedbackMessage = ref('')
const feedbackType = ref('')
const correctAnswers = ref(0)
const quizComplete = ref(false)
const touchStartX = ref(0)
const touchOffset = ref(0)
const isDragging = ref(false)

const currentCard = computed(() => questions.value[currentQuestion.value])
const progress = computed(() => {
  if (quizComplete.value) {
    return 100
  }
  const totalQuestions = questions.value.length
  const current = currentQuestion.value
  return (current / totalQuestions) * 100
})

const startDrag = (clientX) => {
  if (isCorrect.value || isIncorrect.value) return
  touchStartX.value = clientX
  isDragging.value = true
}

const updateDrag = (clientX) => {
  if (!isDragging.value || isCorrect.value || isIncorrect.value) return
  touchOffset.value = clientX - touchStartX.value
}

const endDrag = () => {
  if (!isDragging.value || isCorrect.value || isIncorrect.value) return
  isDragging.value = false
  const threshold = 100
  const direction = touchOffset.value > 0 ? 'right' : 'left'
  
  if (Math.abs(touchOffset.value) > threshold) {
    handleSwipe(direction)
  }
  touchOffset.value = 0
}

const touchStart = (e) => {
  e.preventDefault()
  startDrag(e.touches[0].clientX)
}

const touchMove = (e) => {
  e.preventDefault()
  updateDrag(e.touches[0].clientX)
}

const touchEnd = (e) => {
  e.preventDefault()
  endDrag()
}

const mouseStart = (e) => {
  startDrag(e.clientX)
}

const mouseMove = (e) => {
  updateDrag(e.clientX)
}

const mouseEnd = () => {
  endDrag()
}

const handleSwipe = (direction) => {
  if (quizComplete.value || isCorrect.value || isIncorrect.value) return

  const isCorrectAnswer = (direction === 'right' && currentCard.value.answer) || 
                         (direction === 'left' && !currentCard.value.answer)

  if (direction === 'left') {
    isSwipingLeft.value = true
  } else {
    isSwipingRight.value = true
  }

  if (isCorrectAnswer) {
    isCorrect.value = true
    correctAnswers.value++
    showFeedbackMessage('Correct!', 'success')
  } else {
    isIncorrect.value = true
    showFeedbackMessage('Try again!', 'error')
  }

  setTimeout(() => {
    resetCardState()
    if (isCorrectAnswer) {
      moveToNextQuestion()
    }
  }, 1500)
}

const showFeedbackMessage = (message, type) => {
  feedbackMessage.value = message
  feedbackType.value = type
  showFeedback.value = true
  setTimeout(() => {
    showFeedback.value = false
  }, 1000)
}

const resetCardState = () => {
  isSwipingLeft.value = false
  isSwipingRight.value = false
  isCorrect.value = false
  isIncorrect.value = false
}

const moveToNextQuestion = () => {
  if (currentQuestion.value < questions.value.length - 1) {
    currentQuestion.value++
  } else {
    quizComplete.value = true
  }
}

const resetQuiz = () => {
  currentQuestion.value = 0
  correctAnswers.value = 0
  quizComplete.value = false
  resetCardState()
}
</script>

<style scoped>
.swipe-quiz {
  padding: 20px;
}

.quiz-progress {
  height: 4px;
  background-color: #f0f0f0;
  border-radius: 2px;
  margin-bottom: 20px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background-color: #4CAF50;
  transition: width 0.3s ease;
}

.swipe-container {
  position: relative;
  height: 400px;
  margin: 20px 0;
  touch-action: pan-x;
  user-select: none;
  -webkit-user-select: none;
  background-color: #f5f5f5;
  border-radius: 10px;
  padding: 20px;
  transition: background-color 0.3s ease;
}

.swipe-container.correct-background {
  background-color: rgba(76, 175, 80, 0.1);
}

.swipe-container.incorrect-background {
  background-color: rgba(244, 67, 54, 0.1);
}

.flex-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.card {
  flex: 1;
  position: relative;
  width: 100%;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 20px;
  user-select: none;
  -webkit-user-select: none;
  cursor: grab;
}

.card:active {
  cursor: grabbing;
}

.swipe-left {
  transform: translateX(-100%);
}

.swipe-right {
  transform: translateX(100%);
}

.correct {
  background-color: #4CAF50;
  color: white;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.incorrect {
  background-color: #f44336;
  color: white;
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
}

.card-content {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  justify-content: center;
  align-items: center;
  position: relative;
  z-index: 1;
  padding: 20px;
  gap: 20px;
}

.card-content h3 {
  margin: 0;
  font-size: 1.2em;
  color: #333;
}

.card-content p {
  margin: 0;
  font-size: 1.1em;
  line-height: 1.4;
  color: #666;
  max-width: 90%;
  text-align: center;
}

.card.correct .card-content h3,
.card.correct .card-content p {
  color: white;
}

.card.incorrect .card-content h3,
.card.incorrect .card-content p {
  color: white;
}

.swipe-hint {
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 20px;
  color: #666;
  font-size: 0.9em;
  z-index: 1;
}

.card.correct .swipe-hint,
.card.incorrect .swipe-hint {
  color: rgba(255, 255, 255, 0.8);
}

.completion-screen {
  text-align: center;
  padding: 40px 20px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  animation: slideIn 0.5s ease-out;
  max-width: 500px;
  margin: 0 auto;
}

.completion-screen h3 {
  font-size: 2em;
  color: #4CAF50;
  margin-bottom: 20px;
  animation: fadeIn 0.8s ease-out;
}

.completion-screen p {
  font-size: 1.2em;
  color: #666;
  margin-bottom: 30px;
  animation: fadeIn 1s ease-out;
}

.completion-screen button {
  margin-top: 20px;
  padding: 12px 30px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
  font-size: 1.1em;
  text-transform: uppercase;
  letter-spacing: 1px;
  animation: fadeIn 1.2s ease-out;
}

.completion-screen button:hover {
  background-color: #45a049;
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(76, 175, 80, 0.3);
}

.completion-screen button:active {
  transform: translateY(-1px);
}

@keyframes slideIn {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.feedback {
  position: fixed;
  top: 30%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 15px 30px;
  border-radius: 5px;
  font-weight: bold;
  animation: fadeInOut 1s ease-in-out;
  z-index: 1000;
  background-color: white;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  margin: 0;
}

.feedback.success {
  color: #4CAF50;
}

.feedback.error {
  color: #f44336;
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
  20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
}

@media (max-width: 600px) {
  .swipe-container {
    height: 250px;
  }
}
</style> 