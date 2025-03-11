<template>
  <div class="game-container">
    <h1>Simple Game Example</h1>
    
    <div class="game-controls">
      <!-- Using directive for declarative tracking -->
      <button v-track="{ event: 'click', context: { buttonType: 'start' } }" @click="startGame">
        Start Game
      </button>
      
      <button ref="resetBtn" @click="resetGame">Reset</button>
      
      <!-- Track different events on the same element -->
      <div class="score-display"
           v-track:mouseenter="{ event: 'hover_start', context: { area: 'score' } }"
           v-track:mouseleave="{ event: 'hover_end', context: { area: 'score' } }">
        Score: {{ score }}
      </div>
    </div>
    
    <div class="game-board">
      <div v-for="(card, index) in cards" 
           :key="index" 
           class="game-card"
           :class="{ flipped: card.flipped }"
           :data-game-id="'card-' + index"
           :data-game-value="card.value"
           @click="flipCard(index)">
        <div class="card-inner">
          <div class="card-front">?</div>
          <div class="card-back">{{ card.value }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useGameAnalytics } from 'vue3-game-analytics';

// Use the game analytics composable
const { trackEvent, trackElement, trackTimedInteraction } = useGameAnalytics();

// Game state
const score = ref(0);
const gameActive = ref(false);
const cards = ref([]);
const resetBtn = ref<HTMLElement | null>(null);

// Create a timed interaction tracker for the game session
const gameSession = trackTimedInteraction('game_session');

// Create a tracked element for the reset button
const trackResetButton = trackElement(resetBtn, { 
  type: 'button_click',
  metadata: { buttonType: 'reset' }
});

// Initialize the game
onMounted(() => {
  initializeGame();
});

// Watch for score changes to track progress
watch(score, (newScore, oldScore) => {
  trackEvent({
    type: 'score_changed',
    gameState: {
      score: newScore,
      progress: (newScore / 100) * 100 // Assume 100 is max score
    },
    metadata: {
      previousScore: oldScore,
      change: newScore - oldScore
    }
  });
});

function initializeGame() {
  // Generate card deck
  cards.value = Array.from({ length: 16 }, (_, i) => ({
    value: Math.floor(i / 2) + 1,
    flipped: false,
    matched: false
  })).sort(() => Math.random() - 0.5);
  
  score.value = 0;
  gameActive.value = false;
  
  // Track game initialization
  trackEvent({
    type: 'game_initialized',
    gameState: {
      cardCount: cards.value.length,
      score: 0,
      progress: 0
    }
  });
}

function startGame() {
  gameActive.value = true;
  
  // Start tracking the game session
  gameSession.start({ 
    deckSize: cards.value.length
  });
  
  // Track game start event
  trackEvent({
    type: 'game_started',
    gameState: {
      cardCount: cards.value.length,
      score: score.value
    }
  });
}

function resetGame() {
  // Track reset event using the element tracker
  trackResetButton('click');
  
  // End current game session if active
  if (gameActive.value) {
    gameSession.end({
      finalScore: score.value,
      completed: false,
      reason: 'reset'
    });
  }
  
  // Reset game state
  initializeGame();
}

function flipCard(index) {
  if (!gameActive.value || cards.value[index].flipped) return;
  
  // Flip the card
  cards.value[index].flipped = true;
  
  // Track card flip
  trackEvent({
    type: 'card_flipped',
    target: `card-${index}`,
    elementData: {
      type: 'card',
      value: cards.value[index].value
    },
    gameState: {
      score: score.value,
      flippedCards: cards.value.filter(c => c.flipped).length
    }
  });
  
  // In a real game, we would check for matches here
  // For this example, just increase score
  score.value += 10;
  
  // Check if game is complete (simplified for example)
  const allFlipped = cards.value.every(card => card.flipped);
  if (allFlipped) {
    gameActive.value = false;
    
    // End game session with successful completion
    gameSession.end({
      finalScore: score.value,
      completed: true
    });
    
    // Track game completion
    trackEvent({
      type: 'game_completed',
      gameState: {
        score: score.value,
        progress: 100
      }
    });
  }
}
</script>

<style scoped>
.game-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: Arial, sans-serif;
}

.game-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

button {
  padding: 0.5rem 1rem;
  font-size: 1rem;
  cursor: pointer;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
}

button:hover {
  background-color: #45a049;
}

.score-display {
  padding: 0.5rem 1rem;
  font-size: 1rem;
  font-weight: bold;
  background-color: #f2f2f2;
  border-radius: 4px;
}

.game-board {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-gap: 1rem;
}

.game-card {
  height: 100px;
  perspective: 1000px;
  cursor: pointer;
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.flipped .card-inner {
  transform: rotateY(180deg);
}

.card-front, .card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  border-radius: 4px;
}

.card-front {
  background-color: #1e88e5;
  color: white;
}

.card-back {
  background-color: #4CAF50;
  color: white;
  transform: rotateY(180deg);
}
</style>