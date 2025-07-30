import { Directive, DirectiveBinding } from 'vue';
import { useAnalyticsStore } from '../store/analytics-store';
import { extractElementData, throttle } from '../utils';

/**
 * Interface for directive value
 */
interface TrackValue {
  event?: string;
  target?: string;
  context?: Record<string, any>;
  throttle?: number;
}

/**
 * Creates the tracking directive
 * @returns Vue directive
 */
export function createTrackDirective(): Directive {
  const store = useAnalyticsStore();
  
  // Cached throttled handlers
  const throttledHandlers = new WeakMap<HTMLElement, Record<string, (...args: any[]) => any>>();
  
  /**
   * Helper to track an event
   */
  const trackEvent = (el: HTMLElement, event: Event, binding: DirectiveBinding<TrackValue>) => {
    const value = binding.value || {};
    const eventType = value.event || binding.arg || 'click';
    const targetId = value.target || el.getAttribute('data-track-id') || getElementIdentifier(el);
    const context = value.context || {};
    
    // Create event data
    let eventData: any = {
      type: eventType,
      target: targetId,
      elementData: {
        type: el.tagName.toLowerCase(),
        attributes: extractElementData(el, 'game')
      },
      metadata: context
    };
    
    // Add coordinates for mouse/touch events
    if (event instanceof MouseEvent) {
      eventData.coordinates = {
        x: event.clientX,
        y: event.clientY,
        screenX: event.screenX,
        screenY: event.screenY
      };
    } else if (event instanceof TouchEvent && event.touches.length > 0) {
      const touch = event.touches[0];
      eventData.coordinates = {
        x: touch.clientX,
        y: touch.clientY,
        screenX: touch.screenX,
        screenY: touch.screenY
      };
    }
    
    // Track the event
    store.trackEvent(eventData);
  };
  
  /**
   * Gets or creates a throttled handler for an element and event
   */
  const getThrottledHandler = (el: HTMLElement, event: string, binding: DirectiveBinding<TrackValue>, handler: (...args: any[]) => any): (...args: any[]) => any => {
    const throttleTime = binding.value?.throttle || 300;
    
    // Get the cache for this element
    let elementCache = throttledHandlers.get(el);
    if (!elementCache) {
      elementCache = {};
      throttledHandlers.set(el, elementCache);
    }
    
    // Get or create throttled handler
    const cacheKey = `${event}_${throttleTime}`;
    if (!elementCache[cacheKey]) {
      elementCache[cacheKey] = throttle(handler, throttleTime);
    }
    
    return elementCache[cacheKey];
  };
  
  return {
    // When directive is mounted to an element
    mounted(el: HTMLElement, binding: DirectiveBinding<TrackValue>) {
      // Determine which events to listen for
      const events = binding.arg ? [binding.arg] : ['click'];
      
      // Add event listeners
      events.forEach(eventName => {
        const handler = (event: Event) => trackEvent(el, event, binding);
        const throttledHandler = getThrottledHandler(el, eventName, binding, handler);
        
        el.addEventListener(eventName, throttledHandler as EventListener);
        
        // Store the handler for cleanup
        const handlers = el._trackHandlers || {};
        handlers[eventName] = throttledHandler;
        el._trackHandlers = handlers;
      });
    },
    
    // When directive parameters change
    updated(el: HTMLElement, binding: DirectiveBinding<TrackValue>) {
      // Remove old handlers
      if (el._trackHandlers) {
        Object.entries(el._trackHandlers).forEach(([event, handler]) => {
          el.removeEventListener(event, handler as EventListener);
        });
      }
      
      // Determine which events to listen for
      const events = binding.arg ? [binding.arg] : ['click'];
      
      // Add new event listeners
      const handlers: Record<string, (...args: any[]) => any> = {};
      events.forEach(eventName => {
        const handler = (event: Event) => trackEvent(el, event, binding);
        const throttledHandler = getThrottledHandler(el, eventName, binding, handler);
        
        el.addEventListener(eventName, throttledHandler as EventListener);
        handlers[eventName] = throttledHandler;
      });
      
      // Store the handlers
      el._trackHandlers = handlers;
    },
    
    // When directive is removed
    unmounted(el: HTMLElement) {
      // Remove all event listeners
      if (el._trackHandlers) {
        Object.entries(el._trackHandlers).forEach(([event, handler]) => {
          el.removeEventListener(event, handler as EventListener);
        });
        delete el._trackHandlers;
      }
      
      // Remove from cache
      throttledHandlers.delete(el);
    }
  };
}

/**
 * Gets an identifier for an HTML element
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
  
  // Try to use class names
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.trim().split(/\s+/);
    if (classes.length > 0) {
      return `.${classes.join('.')}`;
    }
  }
  
  // Use tag name as fallback
  return element.tagName.toLowerCase();
}

// Add type for element with track handlers
declare global {
  interface HTMLElement {
    _trackHandlers?: Record<string, (...args: any[]) => any>;
  }
}