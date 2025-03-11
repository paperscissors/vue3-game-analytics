<template>
  <div class="demo-app">
    <header>
      <h1>Game Analytics Demo</h1>
      <div class="controls">
        <button @click="enableDebug">Enable Debug</button>
        <button @click="disableDebug">Disable Debug</button>
        <button @click="flushManually">Flush Events</button>
        <button @click="checkTrackingStatus" class="debug-button">Check Tracking Status</button>
        <span class="event-count">Events in queue: {{ eventCount }}</span>
      </div>
    </header>
    
    <div class="consent-banner" v-if="!userHasConsented">
      <div class="consent-message">
        <h3>Consent for Analytics</h3>
        <p>This demo requires consent to track interactions. Without consent, events won't be recorded.</p>
      </div>
      <div class="consent-actions">
        <button class="consent-button" @click="giveConsent">Allow Tracking</button>
        <button class="consent-button secondary" @click="denyConsent">Don't Allow</button>
      </div>
    </div>
    
    <div class="consent-status" v-if="userHasConsented">
      <span>Tracking is {{ hasConsent ? 'enabled' : 'disabled' }}</span>
      <button class="toggle-consent" @click="toggleConsent">
        {{ hasConsent ? 'Disable Tracking' : 'Enable Tracking' }}
      </button>
    </div>
    
    <div class="demo-container">
      <!-- Import our BasicUsage example component -->
      <BasicUsage />
    </div>
    
    <div class="event-log">
      <h2>Events Logged</h2>
      <pre ref="eventsLogPre">{{ JSON.stringify(loggedEvents, null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import { useGameAnalytics } from '../../src/composables';
import { useAnalyticsStore } from '../../src/store/analytics-store';
import BasicUsage from '../../example/BasicUsage.vue';

// Get analytics functionality
const analyticsStore = useAnalyticsStore(); // Direct access to the store for debugging
const { 
  enableDebug, 
  disableDebug, 
  flushEvents, 
  trackEvent,
  eventCount,
  setConsent,
  hasConsent
} = useGameAnalytics();

// Keep track of events for display
const loggedEvents = ref<any[]>([]);
const userHasConsented = ref(false);
const eventsLogPre = ref<HTMLPreElement | null>(null);

// Manually trigger a flush
const flushManually = async () => {
  await flushEvents();
};

// Debugging function to check tracking status
const checkTrackingStatus = () => {
  console.log('Current tracking status:');
  console.log('- isEnabled:', analyticsStore.isEnabled);
  console.log('- hasConsent:', analyticsStore.hasConsent);
  console.log('- consentRequired:', analyticsStore.config.consentRequired);
  console.log('- respectDoNotTrack:', analyticsStore.config.respectDoNotTrack);
  console.log('- isTrackingAllowed:', analyticsStore.isTrackingAllowed);
  console.log('- doNotTrack browser setting:', navigator.doNotTrack);
};

// Consent management
const giveConsent = () => {
  userHasConsented.value = true;
  analyticsStore.setConsent(true);
  console.log('Consent granted:', analyticsStore.hasConsent);
  
  // We need to wait a tick for the consent to be applied
  setTimeout(() => {
    // Check if tracking is now allowed
    checkTrackingStatus();
    
    trackEvent({
      type: 'consent_given',
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
    console.log('Consent event tracked');
  }, 10);
};

const denyConsent = () => {
  userHasConsented.value = true;
  analyticsStore.setConsent(false);
  console.log('Consent denied:', analyticsStore.hasConsent);
};

const toggleConsent = () => {
  const newConsentValue = !analyticsStore.hasConsent;
  console.log('Toggling consent to:', newConsentValue);
  analyticsStore.setConsent(newConsentValue);
  
  // We need to wait a tick for the consent to be applied
  setTimeout(() => {
    // Check if tracking is now allowed
    checkTrackingStatus();
    
    if (newConsentValue) {
      trackEvent({
        type: 'consent_given',
        metadata: {
          timestamp: new Date().toISOString()
        }
      });
      console.log('Consent event tracked after toggle');
    }
  }, 10);
};

// Function to scroll to bottom of the log
const scrollToBottom = () => {
  if (eventsLogPre.value) {
    nextTick(() => {
      eventsLogPre.value!.scrollTop = eventsLogPre.value!.scrollHeight;
    });
  }
};

// Watch logged events to auto-scroll when new events are added
watch(loggedEvents, () => {
  scrollToBottom();
}, { deep: true });

// Mock API for intercepting events
onMounted(() => {
  // Intercept fetch calls to our mock endpoint
  const originalFetch = window.fetch;
  window.fetch = async (url, options) => {
    if (url === '/api/mock-analytics') {
      // Get the events from the request body
      const body = JSON.parse((options?.body as string) || '{}');
      const events = body.events || [];
      
      // Add to our log
      loggedEvents.value = [...loggedEvents.value, ...events];
      
      // Return a successful response
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Otherwise, use the original fetch
    return originalFetch(url, options);
  };
  
  // Track page load
  trackEvent({
    type: 'page_view',
    target: 'demo-app',
    metadata: {
      page: 'demo'
    }
  });
  
  // Initial scroll to bottom
  scrollToBottom();
});
</script>

<style>
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f5f5f5;
}

.demo-app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
}

h1 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

button {
  padding: 8px 12px;
  background-color: #4CAF50;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background-color: #45a049;
}

.debug-button {
  background-color: #2196F3;
}

.debug-button:hover {
  background-color: #0b7dda;
}

.event-count {
  margin-left: 10px;
  font-size: 14px;
  font-weight: bold;
}

/* Consent Banner Styles */
.consent-banner {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.consent-message h3 {
  margin-top: 0;
  color: #333;
  font-size: 18px;
}

.consent-message p {
  margin: 10px 0 0;
  color: #555;
  line-height: 1.5;
}

.consent-actions {
  display: flex;
  gap: 10px;
}

.consent-button {
  padding: 10px 15px;
  font-size: 14px;
  font-weight: bold;
  border-radius: 4px;
  cursor: pointer;
}

.consent-button.secondary {
  background-color: #f8f9fa;
  color: #555;
  border: 1px solid #dee2e6;
}

.consent-button.secondary:hover {
  background-color: #e9ecef;
}

/* Consent Status Bar */
.consent-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #e9ecef;
  padding: 10px 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.consent-status span {
  font-size: 14px;
  font-weight: bold;
}

.toggle-consent {
  background-color: #6c757d;
  font-size: 12px;
  padding: 6px 10px;
}

.toggle-consent:hover {
  background-color: #5a6268;
}

.demo-container {
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.event-log {
  background-color: #f8f8f8;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  height: calc(100vh - 400px);
  min-height: 300px;
}

.event-log h2 {
  margin-top: 0;
  font-size: 18px;
  color: #333;
  margin-bottom: 10px;
}

pre {
  background-color: #272822;
  color: #f8f8f2;
  padding: 15px;
  border-radius: 4px;
  overflow-y: auto;
  overflow-x: hidden;
  flex-grow: 1;
  font-size: 14px;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>