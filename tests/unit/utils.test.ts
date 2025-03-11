import { describe, it, expect } from 'vitest';
import { 
  generateUUID, 
  throttle, 
  debounce, 
  safeStringify,
  shouldSampleEvent,
  extractElementData
} from '../../src/utils';

describe('Utility Functions', () => {
  describe('generateUUID', () => {
    it('should generate a valid UUID format', () => {
      const uuid = generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set();
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUUID());
      }
      expect(uuids.size).toBe(100);
    });
  });

  describe('throttle', () => {
    it('should only call function once within the throttle time', async () => {
      let counter = 0;
      const fn = () => counter++;
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled();
      
      expect(counter).toBe(1);
      
      // Wait for the throttle time to pass
      await new Promise(resolve => setTimeout(resolve, 150));
      
      throttled();
      expect(counter).toBe(2);
    });
  });

  describe('debounce', () => {
    it('should only call function once after debounce time', async () => {
      let counter = 0;
      const fn = () => counter++;
      const debounced = debounce(fn, 100);

      debounced();
      debounced();
      debounced();
      
      expect(counter).toBe(0);
      
      // Wait for the debounce time to pass
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(counter).toBe(1);
    });

    it('should call immediately with immediate flag', () => {
      let counter = 0;
      const fn = () => counter++;
      const debounced = debounce(fn, 100, true);

      debounced();
      expect(counter).toBe(1);
      
      debounced();
      expect(counter).toBe(1); // Shouldn't call again
    });
  });

  describe('safeStringify', () => {
    it('should stringify regular objects', () => {
      const obj = { a: 1, b: 'test' };
      expect(safeStringify(obj)).toBe('{"a":1,"b":"test"}');
    });

    it('should handle circular references', () => {
      const obj: any = { a: 1 };
      obj.self = obj;
      
      const result = safeStringify(obj);
      expect(result).toContain('"a":1');
      expect(result).toContain('"self":"[Circular]"');
    });

    it('should handle non-standard values', () => {
      const func = () => 'test';
      const sym = Symbol('test');
      const err = new Error('test error');
      
      const obj = {
        func,
        sym,
        err
      };
      
      const result = safeStringify(obj);
      expect(result).toContain('"func":"[Function]"');
      expect(result).toContain('Symbol(test)');
      expect(result).toContain('test error');
    });
  });

  describe('shouldSampleEvent', () => {
    it('should always sample with rate 1', () => {
      for (let i = 0; i < 100; i++) {
        expect(shouldSampleEvent(1)).toBe(true);
      }
    });

    it('should never sample with rate 0', () => {
      for (let i = 0; i < 100; i++) {
        expect(shouldSampleEvent(0)).toBe(false);
      }
    });

    // Note: for rates between 0 and 1, we can only test the statistical likelihood
    it('should sample with approximately the given rate', () => {
      const rate = 0.5;
      let sampled = 0;
      const trials = 1000;
      
      for (let i = 0; i < trials; i++) {
        if (shouldSampleEvent(rate)) {
          sampled++;
        }
      }
      
      // Allow for some statistical variation
      const ratio = sampled / trials;
      expect(ratio).toBeGreaterThan(rate - 0.1);
      expect(ratio).toBeLessThan(rate + 0.1);
    });
  });

  describe('extractElementData', () => {
    it('should extract data attributes from an element', () => {
      // Create a test element
      const el = document.createElement('div');
      el.setAttribute('data-test', 'value');
      el.setAttribute('data-game-id', 'game-123');
      el.setAttribute('data-game-level', '5');
      el.setAttribute('id', 'test-div');
      
      const data = extractElementData(el);
      expect(data).toEqual({
        'test': 'value',
        'game-id': 'game-123',
        'game-level': '5'
      });
    });

    it('should filter by prefix if provided', () => {
      const el = document.createElement('div');
      el.setAttribute('data-test', 'value');
      el.setAttribute('data-game-id', 'game-123');
      el.setAttribute('data-game-level', '5');
      
      const data = extractElementData(el, 'game');
      expect(data).toEqual({
        'id': 'game-123',
        'level': '5'
      });
    });

    it('should return empty object for element without data attributes', () => {
      const el = document.createElement('div');
      expect(extractElementData(el)).toEqual({});
    });

    it('should handle null or undefined elements', () => {
      expect(extractElementData(null as any)).toEqual({});
      expect(extractElementData(undefined as any)).toEqual({});
    });
  });
});