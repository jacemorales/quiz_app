<template>
  <div class="tap-to-reveal">
    <h2>Tap to Reveal Quiz</h2>
    <div class="cards-container">
      <div 
        v-for="(card, index) in cards" 
        :key="index"
        class="card"
        :class="{ 'is-flipped': card.isFlipped }"
        @click="flipCard(index)"
      >
        <div class="card-inner">
          <div class="card-front">
            <h3>Question {{ index + 1 }}</h3>
            <p>{{ card.question }}</p>
            <div class="tap-hint">Tap to reveal answer</div>
          </div>
          <div class="card-back">
            <h3>Answer</h3>
            <p>{{ card.answer }}</p>
            <button class="flip-back" @click.stop="flipCard(index)">Flip Back</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const cards = ref([
  {
    question: 'What is the capital of France?',
    answer: 'Paris',
    isFlipped: false
  },
  {
    question: 'What is 2 + 2?',
    answer: '4',
    isFlipped: false
  },
  {
    question: 'What is the largest planet in our solar system?',
    answer: 'Jupiter',
    isFlipped: false
  }
])

const flipCard = (index) => {
  cards.value[index].isFlipped = !cards.value[index].isFlipped
}
</script>

<style scoped>
.tap-to-reveal {
  padding: 20px;
}

.cards-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.card {
  perspective: 1000px;
  height: 200px;
  cursor: pointer;
  position: relative;
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: center;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
  cursor: pointer;
}

.card.is-flipped .card-inner {
  transform: rotateY(180deg);
}

.card-front,
.card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  transition: all 0.3s ease;
}

.card-front {
  background-color: #4CAF50;
  color: white;
  transform: rotateY(0deg);
}

.card-back {
  background-color: #2196F3;
  color: white;
  transform: rotateY(180deg);
}

.tap-hint {
  margin-top: 10px;
  font-size: 0.8em;
  opacity: 0.8;
}

.flip-back {
  margin-top: 15px;
  padding: 8px 16px;
  background-color: white;
  color: #2196F3;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.flip-back:hover {
  background-color: #f0f0f0;
}

@media (max-width: 600px) {
  .cards-container {
    grid-template-columns: 1fr;
  }
}
</style> 