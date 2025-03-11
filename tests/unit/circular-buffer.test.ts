import { describe, it, expect } from 'vitest';
import { CircularBuffer } from '../../src/utils/circular-buffer';

describe('CircularBuffer', () => {
  describe('Basic operations', () => {
    it('should create an empty buffer with specified capacity', () => {
      const buffer = new CircularBuffer({ capacity: 5, overflowStrategy: 'discard-oldest' });
      expect(buffer.getSize()).toBe(0);
      expect(buffer.getCapacity()).toBe(5);
      expect(buffer.isEmpty()).toBe(true);
      expect(buffer.isFull()).toBe(false);
    });

    it('should add items until capacity is reached', () => {
      const buffer = new CircularBuffer({ capacity: 3, overflowStrategy: 'discard-oldest' });
      
      buffer.push('item1');
      expect(buffer.getSize()).toBe(1);
      
      buffer.push('item2');
      expect(buffer.getSize()).toBe(2);
      
      buffer.push('item3');
      expect(buffer.getSize()).toBe(3);
      expect(buffer.isFull()).toBe(true);
    });

    it('should get items in correct order', () => {
      const buffer = new CircularBuffer({ capacity: 3, overflowStrategy: 'discard-oldest' });
      
      buffer.push('item1');
      buffer.push('item2');
      buffer.push('item3');
      
      const items = buffer.getItems();
      expect(items).toEqual(['item1', 'item2', 'item3']);
    });

    it('should dequeue items in FIFO order', () => {
      const buffer = new CircularBuffer({ capacity: 3, overflowStrategy: 'discard-oldest' });
      
      buffer.push('item1');
      buffer.push('item2');
      buffer.push('item3');
      
      expect(buffer.dequeue()).toBe('item1');
      expect(buffer.getSize()).toBe(2);
      
      expect(buffer.dequeue()).toBe('item2');
      expect(buffer.getSize()).toBe(1);
      
      expect(buffer.dequeue()).toBe('item3');
      expect(buffer.getSize()).toBe(0);
      expect(buffer.isEmpty()).toBe(true);
    });

    it('should return null when dequeuing from empty buffer', () => {
      const buffer = new CircularBuffer({ capacity: 3, overflowStrategy: 'discard-oldest' });
      expect(buffer.dequeue()).toBe(null);
    });

    it('should clear all items', () => {
      const buffer = new CircularBuffer({ capacity: 3, overflowStrategy: 'discard-oldest' });
      
      buffer.push('item1');
      buffer.push('item2');
      
      buffer.clear();
      expect(buffer.getSize()).toBe(0);
      expect(buffer.isEmpty()).toBe(true);
      expect(buffer.getItems()).toEqual([]);
    });

    it('should drain all items', () => {
      const buffer = new CircularBuffer({ capacity: 3, overflowStrategy: 'discard-oldest' });
      
      buffer.push('item1');
      buffer.push('item2');
      
      const items = buffer.drain();
      expect(items).toEqual(['item1', 'item2']);
      expect(buffer.getSize()).toBe(0);
      expect(buffer.isEmpty()).toBe(true);
    });
  });

  describe('Overflow strategies', () => {
    it('should discard oldest items when using discard-oldest strategy', () => {
      const buffer = new CircularBuffer({ capacity: 3, overflowStrategy: 'discard-oldest' });
      
      buffer.push('item1');
      buffer.push('item2');
      buffer.push('item3');
      buffer.push('item4'); // This should replace item1
      
      expect(buffer.getItems()).toEqual(['item2', 'item3', 'item4']);
      expect(buffer.getSize()).toBe(3);
    });

    it('should discard newest items when using discard-newest strategy', () => {
      const buffer = new CircularBuffer({ capacity: 3, overflowStrategy: 'discard-newest' });
      
      buffer.push('item1');
      buffer.push('item2');
      buffer.push('item3');
      
      // This should be discarded and not added
      const result = buffer.push('item4');
      
      expect(result).toBe(false);
      expect(buffer.getItems()).toEqual(['item1', 'item2', 'item3']);
      expect(buffer.getSize()).toBe(3);
      expect(buffer.getOverflowCount()).toBe(1);
    });

    it('should throw error when using error strategy and buffer is full', () => {
      const buffer = new CircularBuffer({ capacity: 2, overflowStrategy: 'error' });
      
      buffer.push('item1');
      buffer.push('item2');
      
      expect(() => buffer.push('item3')).toThrow('CircularBuffer overflow');
    });
  });

  describe('Edge cases', () => {
    it('should handle capacity of 1 correctly', () => {
      const buffer = new CircularBuffer({ capacity: 1, overflowStrategy: 'discard-oldest' });
      
      buffer.push('item1');
      expect(buffer.getItems()).toEqual(['item1']);
      
      buffer.push('item2');
      expect(buffer.getItems()).toEqual(['item2']);
    });

    it('should handle wrapping around the buffer boundary', () => {
      const buffer = new CircularBuffer({ capacity: 3, overflowStrategy: 'discard-oldest' });
      
      // Fill the buffer
      buffer.push('item1');
      buffer.push('item2');
      buffer.push('item3');
      
      // Remove one item
      buffer.dequeue();
      
      // Add a new item, which should wrap around to the beginning
      buffer.push('item4');
      
      expect(buffer.getItems()).toEqual(['item2', 'item3', 'item4']);
    });

    it('should provide buffer diagnostics', () => {
      const buffer = new CircularBuffer({ capacity: 5, overflowStrategy: 'discard-newest' });
      
      buffer.push('item1');
      buffer.push('item2');
      
      const info = buffer.getBufferInfo();
      expect(info).toEqual({
        capacity: 5,
        size: 2,
        overflowCount: 0,
        isFull: false,
        isEmpty: false
      });
    });
  });
});