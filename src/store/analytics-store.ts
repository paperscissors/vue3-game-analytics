import { reactive, computed, readonly } from 'vue';
import { 
  GameAnalyticsEvent, 
  GameAnalyticsOptions, 
  GameAnalyticsState,
  AnalyticsErrorCode,
  CircularBufferOptions
} from '../types';
import { 
  generateUUID,
  persistToStorage,
  retrieveFromStorage,
  runWhenIdle,
  getEnvironmentData,
  shouldSampleEvent
} from '../utils';

// Storage keys
const STORAGE_KEY_EVENTS = 'vue3-game-analytics-events';
const STORAGE_KEY_CONFIG = 'vue3-game-analytics-config';

// Default options for configuration
const DEFAULT_OPTIONS: Partial<GameAnalyticsOptions> = {
  batchSize: 50,
  flushInterval: 60000,  // 1 minute
  maxQueueSize: 1000,
  trackClicks: true,
  trackTouches: true,
  trackKeyboard: true,
  trackErrors: true,
  trackNetwork: true,
  trackPerformance: false,
  sampleRate: 1,
  collectEnvironmentData: true,
  throttleHighFrequencyEvents: true,
  throttleInterval: 100,
  debug: false,
  verboseLogging: false,
  visibleTracking: false,
  anonymizeIp: true,
  respectDoNotTrack: true,
  consentRequired: true,
};

// Buffer configuration
const BUFFER_CONFIG: CircularBufferOptions = {
  capacity: 1000,
  overflowStrategy: 'discard-oldest'
};

// Create reactive state
const state = reactive<GameAnalyticsState>({
  events: [],
  config: {
    apiEndpoint: '',
    gameId: '',
    playId: '',
    ...DEFAULT_OPTIONS
  },
  isEnabled: false,
  isDebugMode: false,
  hasConsent: false,
  bufferInfo: {
    capacity: BUFFER_CONFIG.capacity,
    size: 0,
    overflowCount: 0
  },
  networkStatus: {
    isOnline: true,
    lastConnectionType: 'unknown'
  },
  pendingFlush: false,
  failedSubmissions: 0,
  lastFlushTime: null
});

// Create computed getters
const getters = {
  /**
   * Check if tracking is currently allowed based on settings and user preferences
   */
  isTrackingAllowed: computed((): boolean => {
    // Check if tracking is enabled
    if (!state.isEnabled) return false;
    
    // Check if consent is required and not granted
    if (state.config.consentRequired && !state.hasConsent) return false;
    
    // Check if we should respect Do Not Track
    if (state.config.respectDoNotTrack) {
      const doNotTrack = navigator.doNotTrack === '1' || 
        // @ts-ignore: Non-standard property
        window.doNotTrack === '1' ||
        // @ts-ignore: Non-standard property
        navigator.msDoNotTrack === '1';
        
      if (doNotTrack) return false;
    }
    
    return true;
  }),
  
  /**
   * Get the number of events in the queue
   */
  eventCount: computed((): number => {
    return state.events.length;
  }),
  
  /**
   * Check if we should be showing debug information
   */
  shouldShowDebugInfo: computed((): boolean => {
    return state.isDebugMode || !!state.config.debug || !!state.config.visibleTracking;
  })
};

// Create store actions
const actions = {
  /**
   * Initialize the store with configuration
   * @param options Configuration options
   */
  initialize(options: GameAnalyticsOptions): void {
    // Merge default options with provided options
    state.config = {
      ...DEFAULT_OPTIONS,
      ...options
    };
    
    // Set debug mode if specified in config
    state.isDebugMode = !!state.config.debug;
    
    // Retrieve events from storage if any
    const storedEvents = retrieveFromStorage<GameAnalyticsEvent[]>(STORAGE_KEY_EVENTS);
    if (storedEvents && Array.isArray(storedEvents)) {
      state.events = storedEvents;
      state.bufferInfo.size = storedEvents.length;
      actions.logDebug(`Loaded ${storedEvents.length} events from storage`);
    }
    
    // Enable tracking
    state.isEnabled = true;
    
    // Set up auto-flush interval if configured
    if (state.config.flushInterval && state.config.flushInterval > 0) {
      setInterval(() => {
        if (state.events.length > 0) {
          actions.flushEvents();
        }
      }, state.config.flushInterval);
    }
    
    // Update network status
    state.networkStatus.isOnline = navigator.onLine;
    
    // Setup beforeunload handler to save events
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        actions.saveEventsToStorage();
        if (state.events.length > 0 && navigator.onLine) {
          actions.flushEvents();
        }
      });
    }
    
    actions.logDebug('Analytics store initialized', state.config);
  },
    
  /**
   * Set user consent for tracking
   * @param hasConsent Whether user has given consent
   */
  setConsent(hasConsent: boolean): void {
    state.hasConsent = hasConsent;
    actions.logDebug(`User consent set to: ${hasConsent}`);
    
    // If consent is revoked, clear all stored data
    if (!hasConsent) {
      actions.clearEvents();
      localStorage.removeItem(STORAGE_KEY_EVENTS);
      localStorage.removeItem(STORAGE_KEY_CONFIG);
    }
  },
    
  /**
   * Enable or disable debug mode
   * @param enabled Whether debug mode should be enabled
   */
  setDebugMode(enabled: boolean): void {
    state.isDebugMode = enabled;
    actions.logDebug(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  },
    
  /**
   * Update network status
   * @param status Network status information
   */
  updateNetworkStatus(status: { isOnline: boolean, connectionType: string }): void {
    const wasOffline = !state.networkStatus.isOnline;
    state.networkStatus = {
      isOnline: status.isOnline,
      lastConnectionType: status.connectionType
    };
    
    // If we're coming back online, try to flush events
    if (wasOffline && status.isOnline && state.events.length > 0) {
      actions.flushEvents();
    }
    
    actions.logDebug('Network status updated', status);
  },
    
  /**
   * Track a new analytics event
   * @param event Event data to track
   */
  trackEvent(event: Partial<GameAnalyticsEvent>): void {
    // Check if tracking is allowed
    if (!getters.isTrackingAllowed.value) {
      actions.logDebug('Event not tracked: tracking not allowed', event);
      return;
    }
    
    // Apply sampling rate if configured
    if (state.config.sampleRate !== undefined && 
        state.config.sampleRate < 1 && 
        !shouldSampleEvent(state.config.sampleRate)) {
      actions.logDebug('Event sampled out', event);
      return;
    }
    
    // Create full event object with required fields
    const fullEvent: GameAnalyticsEvent = {
      id: generateUUID(),
      timestamp: Date.now(),
      type: event.type || 'custom',
      gameId: event.gameId || state.config.gameId,
      playId: event.playId || state.config.playId,
      ...event
    };
    
    // Add environment data if configured
    if (state.config.collectEnvironmentData && !fullEvent.environmentData) {
      fullEvent.environmentData = getEnvironmentData();
    }
    
    // Apply event transformer if configured
    if (state.config.eventTransformer) {
      try {
        const transformedEvent = state.config.eventTransformer(fullEvent);
        actions.addEventToQueue(transformedEvent);
      } catch (error) {
        console.error('Error in event transformer:', error);
        actions.addEventToQueue(fullEvent);
      }
    } else {
      actions.addEventToQueue(fullEvent);
    }
  },
    
  /**
   * Add event to the queue and handle queue management
   * @param event Event to add
   */
  addEventToQueue(event: GameAnalyticsEvent): void {
    // Add to events array
    state.events.push(event);
    state.bufferInfo.size = state.events.length;
    
    // Log in debug mode
    actions.logDebug('Event tracked', event);
    
    // Apply queue limit if needed
    if (state.config.maxQueueSize && state.events.length > state.config.maxQueueSize) {
      // Remove oldest events
      state.events = state.events.slice(-state.config.maxQueueSize);
      state.bufferInfo.size = state.events.length;
      state.bufferInfo.overflowCount++;
      
      actions.logDebug(`Queue overflow: removed oldest events. Current size: ${state.events.length}`);
    }
    
    // Auto-flush if batch size reached
    if (state.config.batchSize && state.events.length >= state.config.batchSize) {
      actions.flushEvents();
    }
    
    // Save events to storage in background
    runWhenIdle(() => {
      actions.saveEventsToStorage();
    });
  },
    
  /**
   * Save events to localStorage for persistence
   */
  saveEventsToStorage(): void {
    if (state.events.length > 0) {
      persistToStorage(STORAGE_KEY_EVENTS, state.events);
      actions.logDebug(`Saved ${state.events.length} events to storage`);
    }
  },
    
  /**
   * Send all events to the API endpoint
   * @returns Promise that resolves when all events are sent
   */
  async flushEvents(): Promise<void> {
    // Skip if there are no events or flush already in progress
    if (state.events.length === 0 || state.pendingFlush) {
      return;
    }
    
    // Skip if offline
    if (!state.networkStatus.isOnline) {
      actions.logDebug('Flush skipped: device is offline');
      return;
    }
    
    state.pendingFlush = true;
    actions.logDebug(`Flushing ${state.events.length} events to ${state.config.apiEndpoint}`);
    
    try {
      // Get all events from the queue
      const eventsToSend = [...state.events];
      
      // Send to API
      const response = await fetch(state.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Game-ID': state.config.gameId,
          'X-Play-ID': state.config.playId
        },
        body: JSON.stringify({ events: eventsToSend })
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
      
      // On success, remove sent events from queue
      state.events = state.events.filter(e => !eventsToSend.some(se => se.id === e.id));
      state.bufferInfo.size = state.events.length;
      state.lastFlushTime = Date.now();
      
      // Clear localStorage since events are now sent
      localStorage.removeItem(STORAGE_KEY_EVENTS);
      
      actions.logDebug(`Successfully sent ${eventsToSend.length} events`);
    } catch (error) {
      state.failedSubmissions++;
      console.error('Failed to send events:', error);
      
      // Track error event
      if (state.config.trackErrors) {
        actions.trackEvent({
          type: 'error',
          target: 'analytics',
          error: {
            message: error instanceof Error ? error.message : String(error),
            code: AnalyticsErrorCode.API_SUBMISSION_FAILED
          }
        });
      }
    } finally {
      state.pendingFlush = false;
    }
  },
    
  /**
   * Clear all events from the queue
   */
  clearEvents(): void {
    state.events = [];
    state.bufferInfo.size = 0;
    actions.logDebug('Event queue cleared');
  },
    
  /**
   * Filter events in the queue based on criteria
   * @param filterFn Function to filter events
   */
  filterEvents(filterFn: (event: GameAnalyticsEvent) => boolean): void {
    const originalCount = state.events.length;
    state.events = state.events.filter(filterFn);
    state.bufferInfo.size = state.events.length;
    
    actions.logDebug(`Filtered events: removed ${originalCount - state.events.length} events`);
  },
    
  /**
   * Export all events as JSON
   * @returns JSON string of all events
   */
  exportEvents(): string {
    return JSON.stringify(state.events);
  },
    
  /**
   * Log debug messages if debug mode is enabled
   * @param message Debug message
   * @param data Optional data to log
   */
  logDebug(message: string, data?: any): void {
    if (state.isDebugMode || state.config.debug) {
      if (state.config.verboseLogging && data) {
        console.debug(`[GameAnalytics] ${message}`, data);
      } else {
        console.debug(`[GameAnalytics] ${message}`);
      }
    }
  }
};

// Create the store instance
let storeInstance: any = null;

// Create and export the store function that mimics Pinia's useStore behavior
export function useAnalyticsStore() {
  if (!storeInstance) {
    storeInstance = {
      // Expose readonly state
      ...readonly(state),
      // Expose getters
      ...getters,
      // Expose actions
      ...actions
    };
  }
  return storeInstance;
}