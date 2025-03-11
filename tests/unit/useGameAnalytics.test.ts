import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useGameAnalytics } from '../../src/composables/useGameAnalytics';
import { useAnalyticsStore } from '../../src/store/analytics-store';
import { ref } from 'vue';

// Mock the analytics store
vi.mock('../../src/store/analytics-store', () => {
  const mockStore = {
    trackEvent: vi.fn(),
    flushEvents: vi.fn().mockResolvedValue(undefined),
    clearEvents: vi.fn(),
    setDebugMode: vi.fn(),
    setConsent: vi.fn(),
    eventCount: 0,
    isEnabled: true,
    isDebugMode: false,
    hasConsent: true,
    networkStatus: {
      isOnline: true
    }
  };
  
  return {
    useAnalyticsStore: vi.fn().mockReturnValue(mockStore)
  };
});

describe('useGameAnalytics', () => {
  beforeEach(() => {
    // Create a fresh pinia instance and set it as active
    setActivePinia(createPinia());
    
    // Reset mock call history
    vi.mocked(useAnalyticsStore().trackEvent).mockClear();
    vi.mocked(useAnalyticsStore().flushEvents).mockClear();
    vi.mocked(useAnalyticsStore().clearEvents).mockClear();
    vi.mocked(useAnalyticsStore().setDebugMode).mockClear();
    vi.mocked(useAnalyticsStore().setConsent).mockClear();
  });
  
  describe('trackEvent', () => {
    it('should call store trackEvent with correct data', () => {
      const { trackEvent } = useGameAnalytics();
      const event = { type: 'test_event', target: 'test_target' };
      
      trackEvent(event);
      
      expect(useAnalyticsStore().trackEvent).toHaveBeenCalledTimes(1);
      expect(useAnalyticsStore().trackEvent).toHaveBeenCalledWith(event);
    });
  });
  
  describe('trackElement', () => {
    it('should create tracking function for an element', () => {
      const { trackElement } = useGameAnalytics();
      
      // Create a ref with an element
      const el = document.createElement('div');
      el.id = 'test-element';
      const elementRef = ref(el);
      
      // Create a tracking function for the element
      const tracker = trackElement(elementRef, {
        type: 'element_interaction',
        metadata: { custom: 'data' }
      });
      
      // Use the tracking function
      tracker('click');
      
      // Verify the trackEvent was called with correct data
      expect(useAnalyticsStore().trackEvent).toHaveBeenCalledTimes(1);
      
      const eventData = vi.mocked(useAnalyticsStore().trackEvent).mock.calls[0][0];
      expect(eventData.type).toBe('click');
      expect(eventData.target).toBe('#test-element');
      expect(eventData.elementData.type).toBe('div');
      expect(eventData.metadata).toEqual({ custom: 'data' });
    });
    
    it('should handle null element refs', () => {
      const { trackElement } = useGameAnalytics();
      
      // Create a ref with null
      const elementRef = ref(null);
      
      // Create a tracking function for the element
      const tracker = trackElement(elementRef);
      
      // Use the tracking function
      tracker('click');
      
      // Verify trackEvent was not called
      expect(useAnalyticsStore().trackEvent).not.toHaveBeenCalled();
    });
  });
  
  describe('trackTimedInteraction', () => {
    it('should track start and end of timed interactions', () => {
      const { trackTimedInteraction } = useGameAnalytics();
      
      // Create a timed interaction tracker
      const timedTracker = trackTimedInteraction('test_interaction');
      
      // Start tracking
      timedTracker.start({ startData: 'value' });
      
      // Verify start event was tracked
      expect(useAnalyticsStore().trackEvent).toHaveBeenCalledTimes(1);
      const startEvent = vi.mocked(useAnalyticsStore().trackEvent).mock.calls[0][0];
      expect(startEvent.type).toBe('interaction_start');
      expect(startEvent.target).toBe('test_interaction');
      expect(startEvent.metadata?.interactionId).toBe('test_interaction');
      expect(startEvent.metadata?.startData).toBe('value');
      
      // End tracking
      vi.mocked(useAnalyticsStore().trackEvent).mockClear();
      timedTracker.end({ endData: 'result' });
      
      // Verify end event was tracked
      expect(useAnalyticsStore().trackEvent).toHaveBeenCalledTimes(1);
      const endEvent = vi.mocked(useAnalyticsStore().trackEvent).mock.calls[0][0];
      expect(endEvent.type).toBe('interaction_end');
      expect(endEvent.target).toBe('test_interaction');
      expect(endEvent.metadata?.interactionId).toBe('test_interaction');
      expect(endEvent.metadata?.endData).toBe('result');
      expect(endEvent.duration).toBeGreaterThanOrEqual(0);
    });
    
    it('should handle cancellation of timed interactions', () => {
      const { trackTimedInteraction } = useGameAnalytics();
      
      // Create a timed interaction tracker
      const timedTracker = trackTimedInteraction('test_interaction');
      
      // Start tracking
      timedTracker.start();
      
      // Clear the mock to only check the cancel event
      vi.mocked(useAnalyticsStore().trackEvent).mockClear();
      
      // Cancel tracking
      timedTracker.cancel('user_aborted');
      
      // Verify cancel event was tracked
      expect(useAnalyticsStore().trackEvent).toHaveBeenCalledTimes(1);
      const cancelEvent = vi.mocked(useAnalyticsStore().trackEvent).mock.calls[0][0];
      expect(cancelEvent.type).toBe('interaction_cancelled');
      expect(cancelEvent.target).toBe('test_interaction');
      expect(cancelEvent.metadata?.reason).toBe('user_aborted');
    });
  });
  
  describe('utility methods', () => {
    it('should call store flushEvents', async () => {
      const { flushEvents } = useGameAnalytics();
      
      await flushEvents();
      
      expect(useAnalyticsStore().flushEvents).toHaveBeenCalledTimes(1);
    });
    
    it('should call store clearEvents', () => {
      const { clearEvents } = useGameAnalytics();
      
      clearEvents();
      
      expect(useAnalyticsStore().clearEvents).toHaveBeenCalledTimes(1);
    });
    
    it('should call store setDebugMode', () => {
      const { enableDebug, disableDebug } = useGameAnalytics();
      
      enableDebug();
      expect(useAnalyticsStore().setDebugMode).toHaveBeenCalledWith(true);
      
      disableDebug();
      expect(useAnalyticsStore().setDebugMode).toHaveBeenCalledWith(false);
    });
    
    it('should call store setConsent', () => {
      const { setConsent } = useGameAnalytics();
      
      setConsent(true);
      expect(useAnalyticsStore().setConsent).toHaveBeenCalledWith(true);
      
      setConsent(false);
      expect(useAnalyticsStore().setConsent).toHaveBeenCalledWith(false);
    });
  });
});