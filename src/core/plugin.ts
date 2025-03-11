import { App, Plugin } from 'vue';
import { createPinia } from 'pinia';
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
    
    // Install Pinia if not already installed
    if (!app.config.globalProperties.$pinia) {
      const pinia = createPinia();
      app.use(pinia);
    }
    
    // Initialize the store
    const store = useAnalyticsStore();
    store.initialize(options);
    
    // Set up event handlers for automatic tracking
    const removeEventHandlers = setupEventHandlers(options);
    
    // Set up network status monitoring
    const removeNetworkMonitoring = monitorNetworkStatus(status => {
      store.updateNetworkStatus(status);
    });
    
    // Set up performance monitoring if enabled
    let getFps: (() => number) | undefined;
    let performanceMonitoringInterval: ReturnType<typeof setInterval> | undefined;
    
    if (options.trackPerformance) {
      getFps = createFpsMonitor();
      
      // Report performance metrics every 30 seconds
      performanceMonitoringInterval = setInterval(() => {
        const fps = getFps ? getFps() : 0;
        
        store.trackEvent({
          type: 'performance',
          metadata: {
            fps,
            // @ts-ignore: Non-standard property
            memoryUsage: window.performance && window.performance.memory ? 
              // @ts-ignore: Non-standard property
              Math.round(window.performance.memory.usedJSHeapSize / (1024 * 1024)) : 
              undefined
          }
        });
      }, 30000);
    }
    
    // Make analytics available globally
    app.config.globalProperties.$gameAnalytics = {
      trackEvent: (event: any) => store.trackEvent(event),
      flushEvents: () => store.flushEvents(),
      enableDebug: () => store.setDebugMode(true),
      disableDebug: () => store.setDebugMode(false),
      clearEvents: () => store.clearEvents(),
      getEventCount: () => store.eventCount,
      setConsent: (hasConsent: boolean) => store.setConsent(hasConsent)
    };
    
    // Store original unmount method
    const originalUnmount = app.unmount;
    
    // Override unmount to clean up resources
    app.unmount = function() {
      removeEventHandlers();
      removeNetworkMonitoring();
      
      if (performanceMonitoringInterval) {
        clearInterval(performanceMonitoringInterval);
      }
      
      // Flush any remaining events before unmounting
      store.flushEvents();
      
      // Call original unmount method
      originalUnmount.call(this);
    };
  }
};