import { computed, unref } from 'vue';
import type { MaybeRef } from 'vue';
import { useAnalyticsStore } from '../store/analytics-store';
import type { GameAnalyticsEvent } from '../types';
import { throttle } from '../utils';

/**
 * Composable for tracking game analytics events in components
 * @returns Object with tracking methods and utilities
 */
export function useGameAnalytics() {
  const store = useAnalyticsStore();
  
  /**
   * Track a game analytics event
   * @param event Event data to track
   */
  function trackEvent(event: Partial<GameAnalyticsEvent>): void {
    store.trackEvent(event);
  }
  
  /**
   * Create a tracking function for a specific element or component
   * @param elementRef Reference to the element (can be a ref or a direct element)
   * @param options Additional tracking options
   * @returns Function to call when tracking should occur
   */
  function trackElement(
    elementRef: MaybeRef<HTMLElement | null | undefined>,
    options: {
      type?: string;
      throttleInterval?: number;
      metadata?: Record<string, any>;
    } = {}
  ) {
    const { 
      type = 'interaction',
      throttleInterval = 100,
      metadata = {}
    } = options;
    
    // Create the tracking function
    const track = (eventType: string, additionalData: Record<string, any> = {}) => {
      const element = unref(elementRef);
      if (!element) return;
      
      // Get element position
      const rect = element.getBoundingClientRect();
      
      store.trackEvent({
        type: eventType || type,
        target: element.id ? `#${element.id}` : element.tagName.toLowerCase(),
        coordinates: {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        },
        elementData: {
          type: element.tagName.toLowerCase(),
          state: element.getAttribute('data-state') || undefined,
          attributes: Array.from(element.attributes)
            .filter(attr => attr.name.startsWith('data-game-'))
            .reduce((obj, attr) => {
              obj[attr.name.replace('data-game-', '')] = attr.value;
              return obj;
            }, {} as Record<string, string>)
        },
        metadata: {
          ...metadata,
          ...additionalData
        }
      });
    };
    
    // Return a throttled version to prevent too many events
    return throttle(track, throttleInterval);
  }
  
  /**
   * Track a timed interaction with start and end events
   * @param identifier Unique identifier for this timed interaction
   * @returns Object with start and end functions
   */
  function trackTimedInteraction(identifier: string) {
    const timers: Record<string, number> = {};
    
    return {
      /**
       * Start tracking a timed interaction
       * @param metadata Additional metadata for the start event
       */
      start: (metadata: Record<string, any> = {}) => {
        timers[identifier] = Date.now();
        store.trackEvent({
          type: 'interaction_start',
          target: identifier,
          metadata: {
            interactionId: identifier,
            ...metadata
          }
        });
      },
      
      /**
       * End tracking a timed interaction and calculate duration
       * @param metadata Additional metadata for the end event
       * @returns Duration in milliseconds, or undefined if start wasn't called
       */
      end: (metadata: Record<string, any> = {}) => {
        const startTime = timers[identifier];
        if (!startTime) {
          console.warn(`[GameAnalytics] No start time found for timed interaction "${identifier}"`);
          return undefined;
        }
        
        const duration = Date.now() - startTime;
        delete timers[identifier];
        
        store.trackEvent({
          type: 'interaction_end',
          target: identifier,
          duration,
          metadata: {
            interactionId: identifier,
            ...metadata
          }
        });
        
        return duration;
      },
      
      /**
       * Cancel tracking a timed interaction
       * @param reason Optional reason for cancellation
       */
      cancel: (reason?: string) => {
        const startTime = timers[identifier];
        if (!startTime) return;
        
        const duration = Date.now() - startTime;
        delete timers[identifier];
        
        store.trackEvent({
          type: 'interaction_cancelled',
          target: identifier,
          duration,
          metadata: {
            interactionId: identifier,
            reason
          }
        });
      }
    };
  }
  
  /**
   * Track game state changes
   * @param state Current game state
   */
  function trackGameState(state: Record<string, any>): void {
    store.trackEvent({
      type: 'game_state_change',
      gameState: state
    });
  }
  
  /**
   * Force flush all pending events to the server
   * @returns Promise that resolves when flush is complete
   */
  async function flushEvents(): Promise<void> {
    return store.flushEvents();
  }
  
  return {
    // Core tracking methods
    trackEvent,
    trackElement,
    trackTimedInteraction,
    trackGameState,
    
    // Utility methods
    flushEvents,
    clearEvents: () => store.clearEvents(),
    
    // Debug methods
    enableDebug: () => store.setDebugMode(true),
    disableDebug: () => store.setDebugMode(false),
    isDebugMode: computed(() => store.isDebugMode),
    
    // Privacy and consent
    setConsent: (hasConsent: boolean) => store.setConsent(hasConsent),
    hasConsent: computed(() => store.hasConsent),
    
    // Store information
    eventCount: computed(() => store.eventCount),
    isEnabled: computed(() => store.isEnabled),
    isOnline: computed(() => store.networkStatus.isOnline)
  };
}