import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import VueGameAnalytics from '../../src'; // Use local package
import { generateUUID } from '../../src/utils';

// Create app
const app = createApp(App);

// Create and use Pinia
const pinia = createPinia();
app.use(pinia);

// Set up analytics with a mock API endpoint
app.use(VueGameAnalytics, {
  apiEndpoint: '/api/mock-analytics', // This will be intercepted
  gameId: 'demo-game',
  playId: generateUUID(),
  batchSize: 5, // Small batch size for demo purposes
  flushInterval: 10000, // 10 seconds for demo
  debug: true, // Enable debug mode to see events in console
  visibleTracking: true, // Show visual indicators when tracking
  consentRequired: true, // Require user consent for tracking
  hasConsent: false, // Start with no consent
  respectDoNotTrack: false // For demo purposes, don't respect DNT setting
});

// Mount the app
app.mount('#app');