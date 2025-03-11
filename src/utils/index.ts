export * from './circular-buffer';
export * from './performance';
export * from './environment';

/**
 * Generate a RFC4122 compliant UUID v4
 * @returns UUID string
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Extracts data attributes from an HTML element
 * @param element HTML element to extract data from
 * @param prefix Optional prefix to filter attributes (without 'data-')
 * @returns Object with all data attributes
 */
export function extractElementData(element: HTMLElement, prefix?: string): Record<string, string> {
  const result: Record<string, string> = {};
  
  if (!element || !element.attributes) {
    return result;
  }
  
  // Get all data attributes
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    if (attr.name.startsWith('data-')) {
      // Remove 'data-' prefix
      const key = attr.name.substring(5);
      
      // If prefix is specified, only include attributes with that prefix
      if (prefix) {
        if (key.startsWith(prefix + '-')) {
          const unprefixedKey = key.substring(prefix.length + 1);
          result[unprefixedKey] = attr.value;
        }
      } else {
        result[key] = attr.value;
      }
    }
  }
  
  return result;
}

/**
 * Safely serialize an object to JSON, handling circular references
 * @param obj Object to serialize
 * @returns JSON string
 */
export function safeStringify(obj: any): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    // Handle non-JSON values
    if (typeof value === 'function') {
      return '[Function]';
    }
    if (value instanceof Error) {
      return {
        message: value.message,
        stack: value.stack,
        name: value.name
      };
    }
    if (value instanceof HTMLElement) {
      return `[HTMLElement ${value.tagName.toLowerCase()}]`;
    }
    if (typeof value === 'symbol') {
      return value.toString();
    }
    
    // Handle circular references
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    
    return value;
  });
}

/**
 * Persists data to localStorage with error handling
 * @param key Storage key
 * @param data Data to store
 * @returns true if successful, false otherwise
 */
export function persistToStorage(key: string, data: any): boolean {
  try {
    const serialized = safeStringify(data);
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.error('Failed to persist data to storage:', error);
    return false;
  }
}

/**
 * Retrieves data from localStorage with error handling
 * @param key Storage key
 * @returns Retrieved data or null if not found or error
 */
export function retrieveFromStorage<T>(key: string): T | null {
  try {
    const serialized = localStorage.getItem(key);
    if (serialized === null) {
      return null;
    }
    return JSON.parse(serialized) as T;
  } catch (error) {
    console.error('Failed to retrieve data from storage:', error);
    return null;
  }
}

/**
 * Checks if a function should be executed based on sampling rate
 * @param rate Sampling rate between 0 and 1
 * @returns True if the function should be executed, false otherwise
 */
export function shouldSampleEvent(rate: number): boolean {
  if (rate >= 1) return true;
  if (rate <= 0) return false;
  return Math.random() <= rate;
}