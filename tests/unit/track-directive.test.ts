import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTrackDirective } from '../../src/directives/track';
import { DirectiveBinding } from 'vue';
import { useAnalyticsStore } from '../../src/store/analytics-store';

// Mock the analytics store
vi.mock('../../src/store/analytics-store', () => {
  return {
    useAnalyticsStore: vi.fn().mockReturnValue({
      trackEvent: vi.fn()
    })
  };
});

// Mock extractElementData utility
vi.mock('../../src/utils', () => {
  return {
    throttle: vi.fn((fn) => fn), // Just return the function without throttling for tests
    extractElementData: vi.fn().mockReturnValue({ 'test-attr': 'value' })
  };
});

describe('v-track directive', () => {
  let directive: any;
  let element: HTMLElement;
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create fresh directive
    directive = createTrackDirective();
    
    // Create a test element
    element = document.createElement('button');
    element.id = 'test-button';
    document.body.appendChild(element);
  });
  
  afterEach(() => {
    // Clean up
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });
  
  describe('mounted hook', () => {
    it('should add event listener for default click event', () => {
      // Spy on addEventListener
      const addEventSpy = vi.spyOn(element, 'addEventListener');
      
      // Mount the directive
      directive.mounted(element, { value: {} } as DirectiveBinding<any>);
      
      // Verify addEventListener was called for click
      expect(addEventSpy).toHaveBeenCalledWith('click', expect.any(Function));
    });
    
    it('should add event listener for specified event', () => {
      // Spy on addEventListener
      const addEventSpy = vi.spyOn(element, 'addEventListener');
      
      // Mount the directive with mouseenter arg
      directive.mounted(element, { 
        arg: 'mouseenter',
        value: {} 
      } as DirectiveBinding<any>);
      
      // Verify addEventListener was called for mouseenter
      expect(addEventSpy).toHaveBeenCalledWith('mouseenter', expect.any(Function));
    });
    
    it('should track event when handler is triggered', () => {
      // Mount the directive
      directive.mounted(element, { 
        value: { 
          event: 'custom_click', 
          context: { buttonType: 'submit' } 
        } 
      } as DirectiveBinding<any>);
      
      // Simulate a click event
      element.click();
      
      // Verify trackEvent was called with correct data
      expect(useAnalyticsStore().trackEvent).toHaveBeenCalledTimes(1);
      
      const eventData = vi.mocked(useAnalyticsStore().trackEvent).mock.calls[0][0];
      expect(eventData.type).toBe('custom_click');
      expect(eventData.target).toBe('#test-button');
      expect(eventData.metadata).toEqual({ buttonType: 'submit' });
    });
  });
  
  describe('updated hook', () => {
    it('should update event listeners when directive is updated', () => {
      // Spy on addEventListener and removeEventListener
      const addEventSpy = vi.spyOn(element, 'addEventListener');
      const removeEventSpy = vi.spyOn(element, 'removeEventListener');
      
      // Mount the directive with click arg
      directive.mounted(element, { 
        arg: 'click',
        value: { event: 'click' } 
      } as DirectiveBinding<any>);
      
      // Verify initial setup
      expect(addEventSpy).toHaveBeenCalledWith('click', expect.any(Function));
      addEventSpy.mockClear();
      
      // Update the directive with mouseenter arg
      directive.updated(element, { 
        arg: 'mouseenter',
        value: { event: 'hover' } 
      } as DirectiveBinding<any>);
      
      // Verify old listener removed and new one added
      expect(removeEventSpy).toHaveBeenCalled();
      expect(addEventSpy).toHaveBeenCalledWith('mouseenter', expect.any(Function));
    });
  });
  
  describe('unmounted hook', () => {
    it('should remove event listeners when directive is unmounted', () => {
      // Spy on removeEventListener
      const removeEventSpy = vi.spyOn(element, 'removeEventListener');
      
      // Mount the directive
      directive.mounted(element, { value: {} } as DirectiveBinding<any>);
      
      // Store the handler
      const handlers = element._trackHandlers;
      expect(handlers).toBeDefined();
      
      // Unmount the directive
      directive.unmounted(element);
      
      // Verify removeEventListener was called
      expect(removeEventSpy).toHaveBeenCalled();
      expect(element._trackHandlers).toBeUndefined();
    });
  });
  
  describe('element identifier', () => {
    it('should use element ID as target when available', () => {
      // Mount the directive
      directive.mounted(element, { value: {} } as DirectiveBinding<any>);
      
      // Simulate a click event
      element.click();
      
      // Verify target uses element ID
      const eventData = vi.mocked(useAnalyticsStore().trackEvent).mock.calls[0][0];
      expect(eventData.target).toBe('#test-button');
    });
    
    it('should use data-game-id attribute when ID not available', () => {
      // Remove ID and add data-game-id
      element.removeAttribute('id');
      element.setAttribute('data-game-id', 'custom-game-id');
      
      // Mount the directive
      directive.mounted(element, { value: {} } as DirectiveBinding<any>);
      
      // Simulate a click event
      element.click();
      
      // Verify target uses data-game-id
      const eventData = vi.mocked(useAnalyticsStore().trackEvent).mock.calls[0][0];
      expect(eventData.target).toBe('[data-game-id="custom-game-id"]');
    });
    
    it('should fallback to tagName when no ID or data-game-id', () => {
      // Remove ID
      element.removeAttribute('id');
      
      // Mount the directive
      directive.mounted(element, { value: {} } as DirectiveBinding<any>);
      
      // Simulate a click event
      element.click();
      
      // Verify target uses tag name
      const eventData = vi.mocked(useAnalyticsStore().trackEvent).mock.calls[0][0];
      expect(eventData.target).toBe('button');
    });
  });
});