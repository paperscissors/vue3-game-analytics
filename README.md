# Vue 3 Game Analytics

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
![Vue version](https://img.shields.io/badge/vue-3.x-brightgreen.svg?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-4.x-blue.svg?style=flat-square)

A lightweight, high-performance analytics tracking system for Vue 3 game applications. This package provides detailed tracking of user interactions with minimal dependencies and impact on gameplay performance.

## 🚀 Features

### Hybrid Event Collection Architecture
- App-level listeners for standard events (clicks, touches, keyboard input)
- Game-specific context enrichment through data attributes
- Support for both automatic collection and manual tracking

### Lightweight Reactive Store
- Custom reactive store for managing the events queue (no external dependencies)
- Batch-processing events for API submission
- Queue management (clear, filter, export) capabilities
- Memory management to prevent excessive resource usage

### Game-Specific Context
- Tracks current game identifier and play_id for every interaction
- Associates each event with its specific game context
- Maintains game session continuity across different games

### Rich Data Capture
- Interaction coordinates (x, y positions)
- Timestamps and duration of interactions
- Element properties (type, state, game-specific attributes)
- Game state association (level, score, progress)
- Support for custom metadata attachment

### Automatic Environment Data
- Device info, viewport size, and browser details
- Device orientation and screen resolution
- Network connection status
- Performance metrics relevant to gameplay

### Performance Optimized
- Efficient memory usage with circular buffer implementation
- Throttling/debouncing for high-frequency events
- Minimal impact on frame rates
- Efficient data serialization

### Debug Mode & Error Tracking
- Debug mode with console logging
- Error and exception tracking
- Visual indicators of tracking in development mode
- Verbose logging option for diagnostics

### Developer Experience
- Simple composable API (useGameAnalytics)
- TypeScript definitions for strong typing
- Vue directives for declarative tracking (v-track)
- Support for both Options API and Composition API
- Zero external dependencies (no Pinia required)

## 📦 Installation

```bash
npm install vue3-game-analytics
```

## 🔧 Basic Setup

```js
// main.js or main.ts
import { createApp } from 'vue'
import App from './App.vue'
import VueGameAnalytics from 'vue3-game-analytics'
import { generateUUID } from 'vue3-game-analytics'

const app = createApp(App)

app.use(VueGameAnalytics, {
  apiEndpoint: '/api/analytics',
  gameId: 'memory-match',
  playId: generateUUID(),
  batchSize: 50,
  flushInterval: 60000, // 1 minute
  debug: process.env.NODE_ENV !== 'production'
})

app.mount('#app')
```

## 💻 Usage

### Composition API

```vue
<script setup>
import { useGameAnalytics } from 'vue3-game-analytics';
import { ref } from 'vue';

const { trackEvent, trackElement, trackTimedInteraction } = useGameAnalytics();

// Tracking elements with refs
const buttonRef = ref(null);
const trackButton = trackElement(buttonRef, { 
  type: 'button_click',
  metadata: { section: 'game-controls' }
});

// Tracking custom events
function onLevelComplete(level, score) {
  trackEvent({
    type: 'level_complete',
    gameState: {
      level,
      score
    },
    metadata: {
      timeTaken: playTime,
      difficulty: currentDifficulty
    }
  });
}

// Tracking timed interactions
const gameTimer = trackTimedInteraction('gameplay_session');

function startGame() {
  gameTimer.start({ difficulty: 'hard' });
}

function endGame() {
  const duration = gameTimer.end({ 
    finalScore: playerScore,
    levelsCompleted: levels 
  });
  console.log(`Game lasted ${duration}ms`);
}
</script>

<template>
  <div>
    <button ref="buttonRef" @click="trackButton('click')">Start Game</button>
    
    <!-- Using directive for declarative tracking -->
    <button v-track="{ event: 'click', context: { buttonType: 'restart' } }">
      Restart Game
    </button>
    
    <!-- Track different events on the same element -->
    <div v-track:mouseenter="{ event: 'hover_start', context: { area: 'bonus' } }"
         v-track:mouseleave="{ event: 'hover_end', context: { area: 'bonus' } }">
      Bonus Area
    </div>
  </div>
</template>
```

### Options API

```vue
<template>
  <button @click="trackButtonClick">Play</button>
</template>

<script>
export default {
  methods: {
    trackButtonClick() {
      this.$gameAnalytics.trackEvent({
        type: 'button_click',
        target: 'play_button',
        metadata: {
          screen: 'main_menu'
        }
      });
    },
    
    startLevel(level) {
      // Track game state
      this.$gameAnalytics.trackEvent({
        type: 'level_start',
        gameState: {
          level,
          lives: this.playerLives,
          score: this.score
        }
      });
    },
    
    flushDataBeforeNavigation() {
      // Force-send all pending events before navigation
      this.$gameAnalytics.flushEvents().then(() => {
        this.$router.push('/next-page');
      });
    }
  }
}
</script>
```

## ⚙️ Configuration Options

The plugin supports numerous configuration options to customize its behavior:

```typescript
interface GameAnalyticsOptions {
  // Required configuration
  apiEndpoint: string;            // API endpoint for sending analytics data
  gameId: string;                 // Identifier for the current game
  playId: string;                 // Unique identifier for the current play session
  
  // Optional configuration with defaults
  batchSize?: number;             // Default: 50 - Events to collect before sending
  flushInterval?: number;         // Default: 60000 (1 min) - Time between auto-flush
  maxQueueSize?: number;          // Default: 1000 - Maximum events to store in memory
  
  // Tracking options
  trackClicks?: boolean;          // Default: true - Track clicks automatically
  trackTouches?: boolean;         // Default: true - Track touch events
  trackKeyboard?: boolean;        // Default: true - Track keyboard events
  trackErrors?: boolean;          // Default: true - Track JS errors
  trackNetwork?: boolean;         // Default: true - Track network status
  trackPerformance?: boolean;     // Default: false - Track performance metrics
  
  // Sampling and optimization
  sampleRate?: number;            // Default: 1 - Sampling rate for events (0-1)
  throttleHighFrequencyEvents?: boolean; // Default: true - Throttle high-frequency events
  throttleInterval?: number;      // Default: 100 - Throttle interval in ms
  
  // Debug options
  debug?: boolean;                // Default: false - Enable debug mode 
  verboseLogging?: boolean;       // Default: false - Enable verbose console logging
  visibleTracking?: boolean;      // Default: false - Show visual indicators
  
  // Privacy
  anonymizeIp?: boolean;          // Default: true - Anonymize IP addresses
  respectDoNotTrack?: boolean;    // Default: true - Respect DNT browser setting
  consentRequired?: boolean;      // Default: true - Require user consent
  
  // Advanced customization
  eventTransformer?: (event: GameAnalyticsEvent) => GameAnalyticsEvent;
}
```

## 📋 API Reference

### Composable: useGameAnalytics()

```typescript
// Core tracking methods
trackEvent(event: Partial<GameAnalyticsEvent>): void
trackElement(elementRef: Ref<HTMLElement>, options?: Object): Function
trackTimedInteraction(identifier: string): { start, end, cancel }
trackGameState(state: Record<string, any>): void

// Utility methods
flushEvents(): Promise<void>
clearEvents(): void

// Debug methods
enableDebug(): void
disableDebug(): void
isDebugMode: ComputedRef<boolean>

// Privacy and consent
setConsent(hasConsent: boolean): void
hasConsent: ComputedRef<boolean>

// Store information
eventCount: ComputedRef<number>
isEnabled: ComputedRef<boolean>
isOnline: ComputedRef<boolean>
```

### Directive: v-track

```html
<!-- Basic usage -->
<button v-track>Track clicks</button>

<!-- Specify event type -->
<button v-track:click>Track clicks</button>
<div v-track:mouseover>Track hover</div>

<!-- With options -->
<button v-track="{ event: 'button_click', target: 'play-button', context: { screen: 'menu' } }">
  Play
</button>

<!-- Multiple events on same element -->
<div v-track:mouseenter="{ event: 'hover_start' }"
     v-track:mouseleave="{ event: 'hover_end' }">
  Hover me
</div>
```

### Global Properties

```typescript
// Available on this.$gameAnalytics
interface GameAnalyticsGlobal {
  trackEvent: (event: any) => void;
  flushEvents: () => Promise<void>;
  enableDebug: () => void;
  disableDebug: () => void;
  clearEvents: () => void;
  getEventCount: () => number;
  setConsent: (hasConsent: boolean) => void;
}
```

## 📊 Event Structure

All tracked events follow this structure:

```typescript
interface GameAnalyticsEvent {
  // Core properties
  id?: string;                    // Auto-generated unique ID
  timestamp: number;              // Auto-filled timestamp
  type: string;                   // Event type (e.g., 'click', 'level_complete')
  
  // Game context
  gameId: string;                 // From configuration
  playId: string;                 // From configuration
  gameState?: {                   // Current game state
    level?: number | string;
    score?: number;
    progress?: number;
    [key: string]: any;
  };
  
  // Interaction details
  target?: string;                // Target element identifier
  coordinates?: {                 // Position data for mouse/touch events
    x: number;
    y: number;
    screenX?: number;
    screenY?: number;
  };
  duration?: number;              // For timed interactions
  
  // Element data
  elementData?: {
    type?: string;                // Element type (button, div, etc.)
    state?: string;               // Element state
    attributes?: Record<string, string>; // Data attributes
    [key: string]: any;
  };
  
  // Environment data (auto-collected if enabled)
  environmentData?: {
    deviceType?: string;          // mobile, tablet, desktop
    browser?: string;
    os?: string;
    screenResolution?: string;
    orientation?: string;
    connectionType?: string;
    performanceMetrics?: {
      fps?: number;
      memoryUsage?: number;
      [key: string]: any;
    };
  };
  
  // Custom data
  metadata?: Record<string, any>; // Any additional information
  
  // Error context (for error events)
  error?: {
    message?: string;
    stack?: string;
    code?: string | number;
  };
}
```

## 💡 Best Practices

1. **Use data attributes for game context**:
   ```html
   <button data-game-id="play_button" data-game-level="3" data-game-context="main_screen">
     Play Level
   </button>
   ```

2. **Batch related events**:
   For high-frequency events (like mouse movements in a drawing game), consider batching related events and sending only key points.

3. **Balance detail and performance**:
   Capture enough detail to be useful without impacting game performance. Use the sampling rate for very high-frequency events.

4. **Structure game state consistently**:
   Define a standard structure for your game state to make analytics data more consistent and easier to analyze.

5. **Handle offline scenarios**:
   The plugin handles offline storage automatically, but consider adding UI indicators when in offline mode.

## 🎮 Demo Application

The package includes a demo application that shows real-time analytics tracking in action:

```bash
# Run the demo application
npm run demo
```

The demo application provides:

- An interactive memory game example to generate tracking events
- Real-time display of tracked events in the UI
- Controls to enable/disable debug mode
- Manual event flushing
- Visual indicators when interactions are tracked
- Interception of API calls to display the exact data being sent

This is an excellent way to understand how the analytics package works and to see the different tracking methods in action:

- Automatic tracking through app-level event listeners
- Manual tracking using `trackEvent`
- Element tracking with `trackElement` 
- Timed interactions with `trackTimedInteraction`
- Declarative tracking with the `v-track` directive

The demo code is available in the `/demo` directory and can serve as a reference implementation.

### Demo Screenshot

When running the demo application, you'll see an interface like this:

```
+-----------------------------------------------+
| Game Analytics Demo              [Enable Debug]|
|                                  [Disable Debug]|
| +-----------------------------------------+   |
| |                                         |   |
| |  Memory Game Example                    |   |
| |                                         |   |
| |  [Start Game] [Reset]   Score: 0        |   |
| |                                         |   |
| |  +-----+ +-----+ +-----+ +-----+        |   |
| |  |  ?  | |  ?  | |  ?  | |  ?  |        |   |
| |  +-----+ +-----+ +-----+ +-----+        |   |
| |                                         |   |
| |  +-----+ +-----+ +-----+ +-----+        |   |
| |  |  ?  | |  ?  | |  ?  | |  ?  |        |   |
| |  +-----+ +-----+ +-----+ +-----+        |   |
| |                                         |   |
| +-----------------------------------------+   |
|                                               |
| Events Logged:                                |
| +------------------------------------------+  |
| | [                                        |  |
| |   {                                      |  |
| |     "id": "f47ac10b-58cc-4372-a567...",  |  |
| |     "timestamp": 1678234827412,          |  |
| |     "type": "click",                     |  |
| |     "gameId": "demo-game",               |  |
| |     "playId": "7b16e04c-5671-4b35...",   |  |
| |     "target": "#start-button",           |  |
| |     ...                                  |  |
| |   }                                      |  |
| | ]                                        |  |
| +------------------------------------------+  |
+-----------------------------------------------+
```

As you interact with the game, you'll see:
1. Visual indicators appearing where you click (red dots)
2. Events being logged in real-time in the bottom panel 
3. The number of events in the queue updating
4. Console logs with detailed event information (when debug mode is enabled)

## 🛠️ Development and Testing

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Run tests with coverage
npm run test -- --coverage

# Run tests in watch mode
npm run test:watch
```

This package includes comprehensive unit tests for:

- **Utility functions** - Basic helper functions and performance optimizations
- **CircularBuffer** - The memory-efficient data structure for event storage
- **Composables** - The `useGameAnalytics` hook and its functionality 
- **Directives** - The v-track directive for declarative event tracking

The tests use Vitest with JSDOM for DOM simulation. You can run the tests with code coverage to ensure high-quality, maintainable code.

## 🔄 Migration from Previous Versions

### Removal of Pinia Dependency

Starting from version 0.2.0, this package no longer requires Pinia as a dependency. The analytics store is now implemented using Vue's native reactive system, making the package lighter and more portable while maintaining the same API.

**What this means for you:**
- No need to install or configure Pinia
- Smaller bundle size
- Fewer potential version conflicts
- Same familiar API - all composables and methods work exactly as before

**If you're upgrading from a previous version:**
1. Remove Pinia installation from your setup code
2. Remove the `createPinia()` and `app.use(pinia)` calls
3. Everything else remains the same!

The change is completely backward compatible in terms of functionality - only the setup process has been simplified.

## 📄 License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
