import { useAnalyticsStore } from '../store/analytics-store';
import { GameAnalyticsEvent, GameAnalyticsOptions } from '../types';
import { throttle, extractElementData } from '../utils';

/**
 * Sets up global event listeners for automatic event tracking
 * @param options Configuration options
 */
export function setupEventHandlers(options: GameAnalyticsOptions): () => void {
  const store = useAnalyticsStore();
  const listeners: Array<{ element: HTMLElement | Window | Document, type: string, handler: EventListener }> = [];
  
  // Get the throttle interval from options
  const throttleInterval = options.throttleInterval || 100;
  const shouldThrottle = options.throttleHighFrequencyEvents !== false;
  
  // Handler for click events
  if (options.trackClicks !== false) {
    const clickHandler = (event: MouseEvent) => {
      if (!event.target) return;
      
      const target = event.target as HTMLElement;
      const analyticsEvent: Partial<GameAnalyticsEvent> = {
        type: 'click',
        target: getElementIdentifier(target),
        coordinates: {
          x: event.clientX,
          y: event.clientY,
          screenX: event.screenX,
          screenY: event.screenY
        },
        elementData: {
          type: target.tagName.toLowerCase(),
          attributes: extractElementData(target, 'game')
        }
      };
      
      store.trackEvent(analyticsEvent);
      
      // Show visual indicator in debug mode
      if (store.shouldShowDebugInfo && options.visibleTracking) {
        showTrackingIndicator(event.clientX, event.clientY);
      }
    };
    
    // Apply throttling if configured
    const processedClickHandler = shouldThrottle 
      ? throttle(clickHandler, throttleInterval) 
      : clickHandler;
      
    document.addEventListener('click', processedClickHandler as EventListener);
    listeners.push({ 
      element: document, 
      type: 'click', 
      handler: processedClickHandler as EventListener 
    });
  }
  
  // Handler for touch events
  if (options.trackTouches !== false) {
    const touchStartHandler = (event: TouchEvent) => {
      if (!event.target || !event.touches.length) return;
      
      const touch = event.touches[0];
      const target = event.target as HTMLElement;
      const analyticsEvent: Partial<GameAnalyticsEvent> = {
        type: 'touch_start',
        target: getElementIdentifier(target),
        coordinates: {
          x: touch.clientX,
          y: touch.clientY,
          screenX: touch.screenX,
          screenY: touch.screenY
        },
        elementData: {
          type: target.tagName.toLowerCase(),
          attributes: extractElementData(target, 'game')
        }
      };
      
      store.trackEvent(analyticsEvent);
      
      // Show visual indicator in debug mode
      if (store.shouldShowDebugInfo && options.visibleTracking) {
        showTrackingIndicator(touch.clientX, touch.clientY);
      }
    };
    
    const touchEndHandler = (event: TouchEvent) => {
      if (!event.target || !event.changedTouches.length) return;
      
      const touch = event.changedTouches[0];
      const target = event.target as HTMLElement;
      const analyticsEvent: Partial<GameAnalyticsEvent> = {
        type: 'touch_end',
        target: getElementIdentifier(target),
        coordinates: {
          x: touch.clientX,
          y: touch.clientY,
          screenX: touch.screenX,
          screenY: touch.screenY
        },
        elementData: {
          type: target.tagName.toLowerCase(),
          attributes: extractElementData(target, 'game')
        }
      };
      
      store.trackEvent(analyticsEvent);
    };
    
    // Apply throttling if configured
    const processedTouchStartHandler = shouldThrottle 
      ? throttle(touchStartHandler, throttleInterval) 
      : touchStartHandler;
    
    const processedTouchEndHandler = shouldThrottle 
      ? throttle(touchEndHandler, throttleInterval) 
      : touchEndHandler;
      
    document.addEventListener('touchstart', processedTouchStartHandler as EventListener);
    document.addEventListener('touchend', processedTouchEndHandler as EventListener);
    
    listeners.push({ 
      element: document, 
      type: 'touchstart', 
      handler: processedTouchStartHandler as EventListener 
    });
    
    listeners.push({ 
      element: document, 
      type: 'touchend', 
      handler: processedTouchEndHandler as EventListener 
    });
  }
  
  // Handler for keyboard events
  if (options.trackKeyboard !== false) {
    const keydownHandler = (event: KeyboardEvent) => {
      // Don't track modifier keys to reduce noise
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) {
        return;
      }
      
      // Skip keys when they're being held down
      if (event.repeat) {
        return;
      }
      
      const target = event.target as HTMLElement;
      const analyticsEvent: Partial<GameAnalyticsEvent> = {
        type: 'keydown',
        target: getElementIdentifier(target),
        elementData: {
          type: target.tagName.toLowerCase(),
          key: event.key,
          keyCode: event.keyCode
        }
      };
      
      store.trackEvent(analyticsEvent);
    };
    
    // Apply throttling if configured
    const processedKeydownHandler = shouldThrottle 
      ? throttle(keydownHandler, throttleInterval) 
      : keydownHandler;
      
    document.addEventListener('keydown', processedKeydownHandler as EventListener);
    listeners.push({ 
      element: document, 
      type: 'keydown', 
      handler: processedKeydownHandler as EventListener 
    });
  }
  
  // Handler for error events
  if (options.trackErrors !== false) {
    const errorHandler = (event: ErrorEvent) => {
      const analyticsEvent: Partial<GameAnalyticsEvent> = {
        type: 'error',
        error: {
          message: event.message,
          stack: event.error?.stack,
        }
      };
      
      store.trackEvent(analyticsEvent);
    };
    
    window.addEventListener('error', errorHandler);
    listeners.push({ 
      element: window, 
      type: 'error', 
      handler: errorHandler as EventListener 
    });
    
    // Unhandled promise rejections
    const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      const analyticsEvent: Partial<GameAnalyticsEvent> = {
        type: 'error',
        error: {
          message: event.reason?.message || 'Unhandled promise rejection',
          stack: event.reason?.stack,
          code: 'UNHANDLED_REJECTION'
        }
      };
      
      store.trackEvent(analyticsEvent);
    };
    
    window.addEventListener('unhandledrejection', unhandledRejectionHandler);
    listeners.push({ 
      element: window, 
      type: 'unhandledrejection', 
      handler: unhandledRejectionHandler as EventListener 
    });
  }
  
  // Return a cleanup function that removes all event listeners
  return () => {
    listeners.forEach(({ element, type, handler }) => {
      element.removeEventListener(type, handler);
    });
  };
}

/**
 * Gets an identifier for an HTML element
 * @param element HTML element
 * @returns Identifier string
 */
function getElementIdentifier(element: HTMLElement): string {
  // Try to use id if available
  if (element.id) {
    return `#${element.id}`;
  }
  
  // Try to use data-game-id if available
  const gameId = element.getAttribute('data-game-id');
  if (gameId) {
    return `[data-game-id="${gameId}"]`;
  }
  
  // Try to use name attribute if available
  const name = element.getAttribute('name');
  if (name) {
    return `[name="${name}"]`;
  }
  
  // Try to use class names
  if (element.className && typeof element.className === 'string') {
    return `.${element.className.trim().replace(/\s+/g, '.')}`;
  }
  
  // Use tag name as fallback
  return element.tagName.toLowerCase();
}

/**
 * Shows a visual indicator at the specified coordinates for debugging
 * @param x X coordinate
 * @param y Y coordinate
 */
function showTrackingIndicator(x: number, y: number): void {
  // Create indicator element
  const indicator = document.createElement('div');
  indicator.style.position = 'absolute';
  indicator.style.width = '20px';
  indicator.style.height = '20px';
  indicator.style.borderRadius = '50%';
  indicator.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
  indicator.style.left = `${x - 10}px`;
  indicator.style.top = `${y - 10}px`;
  indicator.style.pointerEvents = 'none';
  indicator.style.zIndex = '10000';
  indicator.style.transform = 'scale(0)';
  indicator.style.transition = 'transform 0.2s ease-out, opacity 0.5s ease-out';
  
  // Add to document
  document.body.appendChild(indicator);
  
  // Animate
  setTimeout(() => {
    indicator.style.transform = 'scale(1)';
  }, 10);
  
  // Remove after animation
  setTimeout(() => {
    indicator.style.opacity = '0';
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }, 500);
  }, 1000);
}