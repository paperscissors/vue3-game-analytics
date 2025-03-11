/**
 * Utilities for performance optimization and monitoring
 */

/**
 * Creates a throttled function that only invokes the provided function at most once per specified interval
 * @param func The function to throttle
 * @param wait The number of milliseconds to throttle invocations to
 * @return The throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 100
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let result: ReturnType<T> | undefined;
  let last = 0;

  function throttled(this: any, ...args: Parameters<T>): ReturnType<T> | undefined {
    const now = Date.now();
    const remaining = wait - (now - last);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
      }
      last = now;
      result = func.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        last = Date.now();
        timeout = undefined;
        result = func.apply(this, args);
      }, remaining);
    }
    return result;
  }

  return throttled;
}

/**
 * Creates a debounced function that delays invoking the provided function until after 
 * the specified wait time has elapsed since the last time it was invoked
 * @param func The function to debounce
 * @param wait The number of milliseconds to delay
 * @param immediate If true, trigger the function on the leading edge instead of the trailing edge
 * @return The debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  function debounced(this: any, ...args: Parameters<T>): void {
    const context = this;
    const later = function() {
      timeout = undefined;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
    
    if (callNow) {
      func.apply(context, args);
    }
  }

  return debounced;
}

/**
 * Measures the frames per second (FPS) of the application
 * @param sampleDuration Duration in ms to measure FPS (default: 1000ms)
 * @returns Function that returns the current FPS when called
 */
export function createFpsMonitor(sampleDuration: number = 1000) {
  let frameCount = 0;
  let lastSampleTime = performance.now();
  let currentFps = 0;

  // Start monitoring FPS
  function measure() {
    frameCount++;
    const now = performance.now();
    const elapsed = now - lastSampleTime;
    
    if (elapsed >= sampleDuration) {
      currentFps = Math.round((frameCount * 1000) / elapsed);
      frameCount = 0;
      lastSampleTime = now;
    }
    
    requestAnimationFrame(measure);
  }

  // Start the measurement loop
  requestAnimationFrame(measure);

  // Return a function that provides the current FPS
  return function getFps() {
    return currentFps;
  };
}

/**
 * Gets memory usage information if available
 * @returns Object with memory stats or undefined if not available
 */
export function getMemoryInfo() {
  // @ts-ignore: Performance memory is non-standard
  if (performance && performance.memory) {
    // @ts-ignore: Accessing non-standard property
    const memory = performance.memory;
    return {
      // Convert bytes to MB for readability
      totalJSHeapSize: Math.round(memory.totalJSHeapSize / (1024 * 1024)),
      usedJSHeapSize: Math.round(memory.usedJSHeapSize / (1024 * 1024)),
      jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / (1024 * 1024))
    };
  }
  return undefined;
}

/**
 * Schedules a task to run when the browser is idle
 * Falls back to setTimeout if requestIdleCallback is not supported
 * @param callback Function to execute
 * @param timeout Maximum timeout to wait
 */
export function runWhenIdle(callback: () => void, timeout: number = 2000): void {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 1);
  }
}