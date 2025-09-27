<script setup>
import { ref } from 'vue'
import TapToReveal from './components/TapToReveal.vue'
import SwipeQuiz from './components/SwipeQuiz.vue'
import PixelAI from './components/ai.vue'

const currentMode = ref('tap')
</script>

<template>
  <div class="app">
    <nav class="mode-selector">
      <button 
        @click="currentMode = 'tap'" 
        :class="{ active: currentMode === 'tap' }"
      >
        Tap to Reveal
      </button>
      <button 
        @click="currentMode = 'swipe'" 
        :class="{ active: currentMode === 'swipe' }"
      >
        Swipe Quiz
      </button>
      <button 
        @click="currentMode = 'ai'" 
        :class="{ active: currentMode === 'ai' }"
      >
        AI
      </button>
    </nav>

    <div class="quiz-container">
      <TapToReveal v-if="currentMode === 'tap'" />
      <SwipeQuiz v-if="currentMode === 'swipe'" />
      <PixelAI v-if="currentMode === 'ai'" />
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
  background-color: #f5f5f5;
}

.app {
  max-width: 100%;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
}

.mode-selector {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 30px;
}

.mode-selector button {
  padding: 12px 24px;
  border: 2px solid #4CAF50;
  border-radius: 8px;
  background-color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 16px;
  font-weight: 500;
  color: #4CAF50;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.mode-selector button:hover {
  background-color: #f0f0f0;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.mode-selector button.active {
  background-color: #4CAF50;
  color: white;
  border-color: #4CAF50;
  box-shadow: 0 4px 8px rgba(76, 175, 80, 0.3);
}

.quiz-container {
  max-width: 600px;
  margin: 0 auto;
}

@media (max-width: 600px) {
  .app {
    padding: 10px;
  }
  
  .mode-selector {
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  
  .mode-selector button {
    width: 100%;
    max-width: 300px;
  }
}
</style>
