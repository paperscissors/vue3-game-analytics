import { CircularBufferOptions } from '../types';

/**
 * Circular buffer implementation for efficient memory management of analytics events
 * Uses a fixed-size array and pointer-based approach to avoid frequent array resizing
 */
export class CircularBuffer<T> {
  private buffer: (T | null)[];
  private head: number = 0;
  private tail: number = 0;
  private size: number = 0;
  private readonly capacity: number;
  private readonly overflowStrategy: 'discard-oldest' | 'discard-newest' | 'error';
  private overflowCount: number = 0;

  /**
   * Creates a new circular buffer
   * @param options Configuration options for the buffer
   */
  constructor(options: CircularBufferOptions) {
    this.capacity = options.capacity;
    this.overflowStrategy = options.overflowStrategy;
    // Initialize buffer with nulls
    this.buffer = new Array<T | null>(this.capacity).fill(null);
  }

  /**
   * Add an item to the buffer
   * @param item Item to add
   * @returns True if item was added, false if discarded due to overflow
   * @throws Error if overflowStrategy is 'error' and buffer is full
   */
  push(item: T): boolean {
    if (this.size === this.capacity) {
      switch (this.overflowStrategy) {
        case 'discard-oldest':
          // Remove oldest item to make room
          this.dequeue();
          break;
        case 'discard-newest':
          // Simply discard the new item
          this.overflowCount++;
          return false;
        case 'error':
          // Throw an error
          throw new Error('CircularBuffer overflow: buffer is full');
      }
    }

    // Add item at tail position
    this.buffer[this.tail] = item;
    // Increment tail and wrap around if necessary
    this.tail = (this.tail + 1) % this.capacity;
    this.size++;
    return true;
  }

  /**
   * Remove and return the oldest item from the buffer
   * @returns The oldest item or null if buffer is empty
   */
  dequeue(): T | null {
    if (this.size === 0) {
      return null;
    }

    const item = this.buffer[this.head];
    this.buffer[this.head] = null; // Clear the reference to help garbage collection
    this.head = (this.head + 1) % this.capacity;
    this.size--;
    return item;
  }

  /**
   * Get all items in the buffer without removing them
   * @returns Array of all items in insertion order
   */
  getItems(): T[] {
    const items: T[] = [];
    if (this.size === 0) return items;

    let current = this.head;
    for (let i = 0; i < this.size; i++) {
      const item = this.buffer[current];
      if (item !== null) {
        items.push(item);
      }
      current = (current + 1) % this.capacity;
    }
    return items;
  }

  /**
   * Remove all items from the buffer and return them
   * @returns Array of all items that were in the buffer
   */
  drain(): T[] {
    const items = this.getItems();
    this.clear();
    return items;
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.buffer.fill(null);
    this.head = 0;
    this.tail = 0;
    this.size = 0;
  }

  /**
   * Check if buffer is empty
   * @returns True if buffer is empty
   */
  isEmpty(): boolean {
    return this.size === 0;
  }

  /**
   * Check if buffer is full
   * @returns True if buffer is full
   */
  isFull(): boolean {
    return this.size === this.capacity;
  }

  /**
   * Get the current size of the buffer
   * @returns Number of items in buffer
   */
  getSize(): number {
    return this.size;
  }

  /**
   * Get the total capacity of the buffer
   * @returns Maximum capacity
   */
  getCapacity(): number {
    return this.capacity;
  }

  /**
   * Get the number of items that were discarded due to overflow
   * @returns Overflow count
   */
  getOverflowCount(): number {
    return this.overflowCount;
  }

  /**
   * Get buffer information for diagnostics
   */
  getBufferInfo() {
    return {
      capacity: this.capacity,
      size: this.size,
      overflowCount: this.overflowCount,
      isFull: this.isFull(),
      isEmpty: this.isEmpty()
    };
  }
}