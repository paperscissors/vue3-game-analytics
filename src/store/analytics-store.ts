import { defineStore } from 'pinia';
import { 
  GameAnalyticsEvent, 
  GameAnalyticsOptions, 
  GameAnalyticsState,
  AnalyticsErrorCode,
  CircularBufferOptions
} from '../types';
import { 
  CircularBuffer,
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

// Create a Pinia store for analytics
export const useAnalyticsStore = defineStore('gameAnalytics', {
  // State
  state: (): GameAnalyticsState => ({
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
  }),
  
  // Getters
  getters: {
    /**
     * Check if tracking is currently allowed based on settings and user preferences
     */
    isTrackingAllowed(): boolean {
      // Check if tracking is enabled
      if (!this.isEnabled) return false;
      
      // Check if consent is required and not granted
      if (this.config.consentRequired && !this.hasConsent) return false;
      
      // Check if we should respect Do Not Track
      if (this.config.respectDoNotTrack) {
        const doNotTrack = navigator.doNotTrack === '1' || 
          // @ts-ignore: Non-standard property
          window.doNotTrack === '1' ||
          // @ts-ignore: Non-standard property
          navigator.msDoNotTrack === '1';
          
        if (doNotTrack) return false;
      }
      
      return true;
    },
    
    /**
     * Get the number of events in the queue
     */
    eventCount(): number {
      return this.events.length;
    },
    
    /**
     * Check if we should be showing debug information
     */
    shouldShowDebugInfo(): boolean {
      return this.isDebugMode || this.config.debug || this.config.visibleTracking;
    }
  },
  
  // Actions
  actions: {
    /**
     * Initialize the store with configuration
     * @param options Configuration options
     */
    initialize(options: GameAnalyticsOptions): void {
      // Merge default options with provided options
      this.config = {
        ...DEFAULT_OPTIONS,
        ...options
      };
      
      // Set debug mode if specified in config
      this.isDebugMode = !!this.config.debug;
      
      // Retrieve events from storage if any
      const storedEvents = retrieveFromStorage<GameAnalyticsEvent[]>(STORAGE_KEY_EVENTS);
      if (storedEvents && Array.isArray(storedEvents)) {
        this.events = storedEvents;
        this.bufferInfo.size = storedEvents.length;
        this.logDebug(`Loaded ${storedEvents.length} events from storage`);
      }
      
      // Enable tracking
      this.isEnabled = true;
      
      // Set up auto-flush interval if configured
      if (this.config.flushInterval && this.config.flushInterval > 0) {
        setInterval(() => {
          if (this.events.length > 0) {
            this.flushEvents();
          }
        }, this.config.flushInterval);
      }
      
      // Update network status
      this.networkStatus.isOnline = navigator.onLine;
      
      // Setup beforeunload handler to save events
      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => {
          this.saveEventsToStorage();
          if (this.events.length > 0 && navigator.onLine) {
            this.flushEvents();
          }
        });
      }
      
      this.logDebug('Analytics store initialized', this.config);
    },
    
    /**
     * Set user consent for tracking
     * @param hasConsent Whether user has given consent
     */
    setConsent(hasConsent: boolean): void {
      this.hasConsent = hasConsent;
      this.logDebug(`User consent set to: ${hasConsent}`);
      
      // If consent is revoked, clear all stored data
      if (!hasConsent) {
        this.clearEvents();
        localStorage.removeItem(STORAGE_KEY_EVENTS);
        localStorage.removeItem(STORAGE_KEY_CONFIG);
      }
    },
    
    /**
     * Enable or disable debug mode
     * @param enabled Whether debug mode should be enabled
     */
    setDebugMode(enabled: boolean): void {
      this.isDebugMode = enabled;
      this.logDebug(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    },
    
    /**
     * Update network status
     * @param status Network status information
     */
    updateNetworkStatus(status: { isOnline: boolean, connectionType: string }): void {
      const wasOffline = !this.networkStatus.isOnline;
      this.networkStatus = {
        isOnline: status.isOnline,
        lastConnectionType: status.connectionType
      };
      
      // If we're coming back online, try to flush events
      if (wasOffline && status.isOnline && this.events.length > 0) {
        this.flushEvents();
      }
      
      this.logDebug('Network status updated', status);
    },
    
    /**
     * Track a new analytics event
     * @param event Event data to track
     */
    trackEvent(event: Partial<GameAnalyticsEvent>): void {
      // Check if tracking is allowed
      if (!this.isTrackingAllowed) {
        this.logDebug('Event not tracked: tracking not allowed', event);
        return;
      }
      
      // Apply sampling rate if configured
      if (this.config.sampleRate !== undefined && 
          this.config.sampleRate < 1 && 
          !shouldSampleEvent(this.config.sampleRate)) {
        this.logDebug('Event sampled out', event);
        return;
      }
      
      // Create full event object with required fields
      const fullEvent: GameAnalyticsEvent = {
        id: generateUUID(),
        timestamp: Date.now(),
        type: event.type || 'custom',
        gameId: event.gameId || this.config.gameId,
        playId: event.playId || this.config.playId,
        ...event
      };
      
      // Add environment data if configured
      if (this.config.collectEnvironmentData && !fullEvent.environmentData) {
        fullEvent.environmentData = getEnvironmentData();
      }
      
      // Apply event transformer if configured
      if (this.config.eventTransformer) {
        try {
          const transformedEvent = this.config.eventTransformer(fullEvent);
          this.addEventToQueue(transformedEvent);
        } catch (error) {
          console.error('Error in event transformer:', error);
          this.addEventToQueue(fullEvent);
        }
      } else {
        this.addEventToQueue(fullEvent);
      }
    },
    
    /**
     * Add event to the queue and handle queue management
     * @param event Event to add
     */
    addEventToQueue(event: GameAnalyticsEvent): void {
      // Add to events array
      this.events.push(event);
      this.bufferInfo.size = this.events.length;
      
      // Log in debug mode
      this.logDebug('Event tracked', event);
      
      // Apply queue limit if needed
      if (this.config.maxQueueSize && this.events.length > this.config.maxQueueSize) {
        // Remove oldest events
        this.events = this.events.slice(-this.config.maxQueueSize);
        this.bufferInfo.size = this.events.length;
        this.bufferInfo.overflowCount++;
        
        this.logDebug(`Queue overflow: removed oldest events. Current size: ${this.events.length}`);
      }
      
      // Auto-flush if batch size reached
      if (this.config.batchSize && this.events.length >= this.config.batchSize) {
        this.flushEvents();
      }
      
      // Save events to storage in background
      runWhenIdle(() => {
        this.saveEventsToStorage();
      });
    },
    
    /**
     * Save events to localStorage for persistence
     */
    saveEventsToStorage(): void {
      if (this.events.length > 0) {
        persistToStorage(STORAGE_KEY_EVENTS, this.events);
        this.logDebug(`Saved ${this.events.length} events to storage`);
      }
    },
    
    /**
     * Send all events to the API endpoint
     * @returns Promise that resolves when all events are sent
     */
    async flushEvents(): Promise<void> {
      // Skip if there are no events or flush already in progress
      if (this.events.length === 0 || this.pendingFlush) {
        return;
      }
      
      // Skip if offline
      if (!this.networkStatus.isOnline) {
        this.logDebug('Flush skipped: device is offline');
        return;
      }
      
      this.pendingFlush = true;
      this.logDebug(`Flushing ${this.events.length} events to ${this.config.apiEndpoint}`);
      
      try {
        // Get all events from the queue
        const eventsToSend = [...this.events];
        
        // Send to API
        const response = await fetch(this.config.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Game-ID': this.config.gameId,
            'X-Play-ID': this.config.playId
          },
          body: JSON.stringify({ events: eventsToSend })
        });
        
        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`);
        }
        
        // On success, remove sent events from queue
        this.events = this.events.filter(e => !eventsToSend.some(se => se.id === e.id));
        this.bufferInfo.size = this.events.length;
        this.lastFlushTime = Date.now();
        
        // Clear localStorage since events are now sent
        localStorage.removeItem(STORAGE_KEY_EVENTS);
        
        this.logDebug(`Successfully sent ${eventsToSend.length} events`);
      } catch (error) {
        this.failedSubmissions++;
        console.error('Failed to send events:', error);
        
        // Track error event
        if (this.config.trackErrors) {
          this.trackEvent({
            type: 'error',
            target: 'analytics',
            error: {
              message: error instanceof Error ? error.message : String(error),
              code: AnalyticsErrorCode.API_SUBMISSION_FAILED
            }
          });
        }
      } finally {
        this.pendingFlush = false;
      }
    },
    
    /**
     * Clear all events from the queue
     */
    clearEvents(): void {
      this.events = [];
      this.bufferInfo.size = 0;
      this.logDebug('Event queue cleared');
    },
    
    /**
     * Filter events in the queue based on criteria
     * @param filterFn Function to filter events
     */
    filterEvents(filterFn: (event: GameAnalyticsEvent) => boolean): void {
      const originalCount = this.events.length;
      this.events = this.events.filter(filterFn);
      this.bufferInfo.size = this.events.length;
      
      this.logDebug(`Filtered events: removed ${originalCount - this.events.length} events`);
    },
    
    /**
     * Export all events as JSON
     * @returns JSON string of all events
     */
    exportEvents(): string {
      return JSON.stringify(this.events);
    },
    
    /**
     * Log debug messages if debug mode is enabled
     * @param message Debug message
     * @param data Optional data to log
     */
    logDebug(message: string, data?: any): void {
      if (this.isDebugMode || this.config.debug) {
        if (this.config.verboseLogging && data) {
          console.debug(`[GameAnalytics] ${message}`, data);
        } else {
          console.debug(`[GameAnalytics] ${message}`);
        }
      }
    }
  }
});