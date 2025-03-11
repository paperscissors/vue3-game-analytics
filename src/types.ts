// Types for game analytics events and configuration

// Base event type
export interface GameAnalyticsEvent {
  // Core event properties
  id?: string;                    // Unique identifier for the event
  timestamp: number;              // When the event occurred (in milliseconds)
  type: string;                   // Type of event (click, touch, keypress, etc.)
  
  // Game context
  gameId: string;                 // Identifier for the current game
  playId: string;                 // Unique identifier for the current play session
  gameState?: {                   // Current state of the game
    level?: number | string;      // Current level or stage
    score?: number;               // Current score
    progress?: number;            // Progress as a percentage (0-100)
    [key: string]: any;           // Additional game state properties
  };
  
  // Interaction details
  target?: string;                // ID or selector of the target element
  coordinates?: {                 // Position data
    x: number;                    // X coordinate
    y: number;                    // Y coordinate
    screenX?: number;             // Screen X coordinate
    screenY?: number;             // Screen Y coordinate
  };
  duration?: number;              // Duration of the interaction in milliseconds
  
  // Element properties
  elementData?: {
    type?: string;                // Type of element (button, card, etc.)
    state?: string;               // State of element (active, disabled, etc.)
    attributes?: Record<string, string>; // Data attributes
    [key: string]: any;           // Additional element properties
  };
  
  // Environment data
  environmentData?: {
    deviceType?: string;          // Mobile, tablet, desktop
    browser?: string;             // Browser name and version
    os?: string;                  // Operating system
    screenResolution?: string;    // Screen resolution
    orientation?: string;         // Portrait or landscape
    connectionType?: string;      // Connection type (wifi, cellular, etc.)
    performanceMetrics?: {
      fps?: number;               // Frames per second
      memoryUsage?: number;       // Memory usage
      [key: string]: any;         // Additional performance metrics
    };
  };
  
  // Additional metadata
  metadata?: Record<string, any>; // Custom metadata for the event
  
  // Error context (if applicable)
  error?: {
    message?: string;             // Error message
    stack?: string;               // Error stack trace
    code?: string | number;       // Error code
  };
}

// Plugin configuration options
export interface GameAnalyticsOptions {
  // Core configuration
  apiEndpoint: string;            // API endpoint for data submission
  batchSize?: number;             // Number of events to collect before sending (default: 50)
  flushInterval?: number;         // Time in ms to wait before sending events (default: 60000 - 1 minute)
  maxQueueSize?: number;          // Maximum number of events to store in memory (default: 1000)
  
  // Game information
  gameId: string;                 // Identifier for the current game
  playId: string;                 // Unique identifier for the current play session
  
  // Tracking options
  trackClicks?: boolean;          // Track click events (default: true)
  trackTouches?: boolean;         // Track touch events (default: true)
  trackKeyboard?: boolean;        // Track keyboard events (default: true)
  trackErrors?: boolean;          // Track error events (default: true)
  trackNetwork?: boolean;         // Track network status (default: true)
  trackPerformance?: boolean;     // Track performance metrics (default: true)
  
  // Data collection
  sampleRate?: number;            // Sampling rate for events (0-1, default: 1)
  collectEnvironmentData?: boolean; // Collect device and browser info (default: true)
  
  // Performance optimizations
  throttleHighFrequencyEvents?: boolean; // Throttle high-frequency events (default: true)
  throttleInterval?: number;     // Throttle interval in ms (default: 100)
  
  // Debug options
  debug?: boolean;                // Enable debug mode (default: false)
  verboseLogging?: boolean;       // Enable verbose logging (default: false)
  visibleTracking?: boolean;      // Show visual indicators when tracking (default: false in production)
  
  // Privacy and compliance
  anonymizeIp?: boolean;          // Anonymize IP addresses (default: true)
  respectDoNotTrack?: boolean;    // Respect Do Not Track browser setting (default: true)
  consentRequired?: boolean;      // Require user consent before tracking (default: true)
  
  // Advanced options
  eventTransformer?: (event: GameAnalyticsEvent) => GameAnalyticsEvent; // Transform events before storing
}

// Circular buffer options for queue management
export interface CircularBufferOptions {
  capacity: number;               // Maximum number of items in the buffer
  overflowStrategy: 'discard-oldest' | 'discard-newest' | 'error'; // Strategy when buffer is full
}

// Types for the store state
export interface GameAnalyticsState {
  events: GameAnalyticsEvent[];   // Queue of events
  config: GameAnalyticsOptions;   // Current configuration
  isEnabled: boolean;             // Whether tracking is enabled
  isDebugMode: boolean;           // Whether debug mode is enabled
  hasConsent: boolean;            // Whether user has given consent
  bufferInfo: {
    capacity: number;             // Buffer capacity
    size: number;                 // Current size
    overflowCount: number;        // Number of discarded events due to overflow
  };
  networkStatus: {
    isOnline: boolean;            // Whether device is online
    lastConnectionType: string;   // Last known connection type
  };
  pendingFlush: boolean;          // Whether a flush to API is in progress
  failedSubmissions: number;      // Count of failed API submissions
  lastFlushTime: number | null;   // Timestamp of last successful flush
}

// Error codes for the analytics system
export enum AnalyticsErrorCode {
  BUFFER_OVERFLOW = 'BUFFER_OVERFLOW',
  API_SUBMISSION_FAILED = 'API_SUBMISSION_FAILED',
  INVALID_EVENT = 'INVALID_EVENT',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  CONSENT_REQUIRED = 'CONSENT_REQUIRED',
  DO_NOT_TRACK = 'DO_NOT_TRACK',
}