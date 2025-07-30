import { App, Plugin } from 'vue';
import { GameAnalyticsOptions } from '../types';
import { useAnalyticsStore } from '../store/analytics-store';
import { setupEventHandlers } from './event-handlers';
import { monitorNetworkStatus, generateUUID, createFpsMonitor } from '../utils';

/**
 * Vue 3 plugin for game analytics
 */
export const GameAnalyticsPlugin: Plugin = {
  install(app: App, options: GameAnalyticsOptions) {
    // Check required options
    if (!options.apiEndpoint) {
      console.error('[GameAnalytics] apiEndpoint is required');
      return;
    }
    
    if (!options.gameId) {
      console.error('[GameAnalytics] gameId is required');
      return;
    }
    
    // Generate playId if not provided
    if (!options.playId) {
      options.playId = generateUUID();
    }
    
    // No need to install Pinia - using custom store
    
    // Store options for deferred initialization
    app.config.globalProperties._gameAnalyticsOptions = options;
    app.config.globalProperties._eventQueue = [];
    app.config.globalProperties._analyticsReady = false;
    
    // Store cleanup function references
    let removeEventHandlers: (() => void) | undefined;
    let removeNetworkMonitoring: (() => void) | undefined;
    let performanceMonitoringInterval: ReturnType<typeof setInterval> | undefined;
    
    // Override mount method for deferred initialization
    const originalMount = app.mount;
    app.mount = function(container: any) {
      const result = originalMount.call(this, container);
      
      // NOW initialize the store after mount
      try {
        const store = useAnalyticsStore();
        store.initialize(options);
        
        // Set up event handlers for automatic tracking
        removeEventHandlers = setupEventHandlers(options);
        
        // Set up network status monitoring
        removeNetworkMonitoring = monitorNetworkStatus(status => {
          store.updateNetworkStatus(status);
        });
        
        // Set up performance monitoring if enabled
        let getFps: (() => number) | undefined;
        
        if (options.trackPerformance) {
          getFps = createFpsMonitor();
          
          // Report performance metrics every 30 seconds
          performanceMonitoringInterval = setInterval(() => {
            const fps = getFps ? getFps() : 0;
            
            store.trackEvent({
              type: 'performance',
              metadata: {
                fps,
                // @ts-expect-error: Non-standard property
                memoryUsage: window.performance && window.performance.memory ? 
                  // @ts-expect-error: Non-standard property
                  Math.round(window.performance.memory.usedJSHeapSize / (1024 * 1024)) : 
                  undefined
              }
            });
          }, 30000);
        }
        
        // Apply consent setting if it was set before initialization
        if (app.config.globalProperties._consentSetting !== undefined) {
          store.setConsent(app.config.globalProperties._consentSetting);
          delete app.config.globalProperties._consentSetting;
        }
        
        // Process queued events
        const eventQueue = app.config.globalProperties._eventQueue;
        if (eventQueue && eventQueue.length > 0) {
          eventQueue.forEach((event: any) => {
            store.trackEvent(event);
          });
          // Clear the queue
          app.config.globalProperties._eventQueue = [];
        }
        
        // Mark analytics as ready
        app.config.globalProperties._analyticsReady = true;
        
      } catch (error) {
        console.error('[GameAnalytics] Failed to initialize analytics store:', error);
        // Mark as ready even on error to prevent infinite queueing
        app.config.globalProperties._analyticsReady = true;
      }
      
      return result;
    };
    
    // Make analytics available globally with queueing support
    app.config.globalProperties.$gameAnalytics = {
      trackEvent: (event: any) => {
        if (app.config.globalProperties._analyticsReady) {
          try {
            const store = useAnalyticsStore();
            store.trackEvent(event);
          } catch (error) {
            console.error('[GameAnalytics] Error tracking event:', error);
          }
        } else {
          // Queue the event for later processing
          app.config.globalProperties._eventQueue.push(event);
        }
      },
      flushEvents: () => {
        if (app.config.globalProperties._analyticsReady) {
          try {
            const store = useAnalyticsStore();
            store.flushEvents();
          } catch (error) {
            console.error('[GameAnalytics] Error flushing events:', error);
          }
        }
      },
      enableDebug: () => {
        if (app.config.globalProperties._analyticsReady) {
          try {
            const store = useAnalyticsStore();
            store.setDebugMode(true);
          } catch (error) {
            console.error('[GameAnalytics] Error enabling debug mode:', error);
          }
        }
      },
      disableDebug: () => {
        if (app.config.globalProperties._analyticsReady) {
          try {
            const store = useAnalyticsStore();
            store.setDebugMode(false);
          } catch (error) {
            console.error('[GameAnalytics] Error disabling debug mode:', error);
          }
        }
      },
      clearEvents: () => {
        if (app.config.globalProperties._analyticsReady) {
          try {
            const store = useAnalyticsStore();
            store.clearEvents();
          } catch (error) {
            console.error('[GameAnalytics] Error clearing events:', error);
          }
        }
        // Also clear the queue if not ready yet
        app.config.globalProperties._eventQueue = [];
      },
      getEventCount: () => {
        if (app.config.globalProperties._analyticsReady) {
          try {
            const store = useAnalyticsStore();
            return store.eventCount;
          } catch (error) {
            console.error('[GameAnalytics] Error getting event count:', error);
            return 0;
          }
        }
        return app.config.globalProperties._eventQueue.length;
      },
      setConsent: (hasConsent: boolean) => {
        if (app.config.globalProperties._analyticsReady) {
          try {
            const store = useAnalyticsStore();
            store.setConsent(hasConsent);
          } catch (error) {
            console.error('[GameAnalytics] Error setting consent:', error);
          }
        } else {
          // Store consent setting for later application
          app.config.globalProperties._consentSetting = hasConsent;
        }
      }
    };
    
    // Store original unmount method
    const originalUnmount = app.unmount;
    
    // Override unmount to clean up resources
    app.unmount = function() {
      try {
        if (removeEventHandlers) {
          removeEventHandlers();
        }
        
        if (removeNetworkMonitoring) {
          removeNetworkMonitoring();
        }
        
        if (performanceMonitoringInterval) {
          clearInterval(performanceMonitoringInterval);
        }
        
        // Flush any remaining events before unmounting
        if (app.config.globalProperties._analyticsReady) {
          try {
            const store = useAnalyticsStore();
            store.flushEvents();
          } catch (error) {
            console.error('[GameAnalytics] Error flushing events during unmount:', error);
          }
        }
      } catch (error) {
        console.error('[GameAnalytics] Error during cleanup:', error);
      }
      
      // Call original unmount method
      originalUnmount.call(this);
    };
  }
};