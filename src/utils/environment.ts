/**
 * Utilities for collecting environment and device information
 */

/**
 * Gets information about the browser and device
 * @returns Object containing environment data
 */
export function getEnvironmentData() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {};
  }

  return {
    deviceType: getDeviceType(),
    browser: getBrowserInfo(),
    os: getOperatingSystem(),
    screenResolution: getScreenResolution(),
    orientation: getOrientation(),
    connectionType: getConnectionType(),
    language: navigator.language || 'unknown',
    userAgent: navigator.userAgent,
    doNotTrack: getDoNotTrackStatus(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

/**
 * Determines the type of device being used
 * @returns 'mobile', 'tablet', or 'desktop'
 */
function getDeviceType(): string {
  const userAgent = navigator.userAgent;
  
  // Check for mobile devices
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    // Distinguish between tablets and phones based on screen size
    if (window.innerWidth > 767 || /iPad/i.test(userAgent)) {
      return 'tablet';
    }
    return 'mobile';
  }
  
  return 'desktop';
}

/**
 * Gets information about the browser
 * @returns Browser name and version
 */
function getBrowserInfo(): string {
  const userAgent = navigator.userAgent;
  let browser = 'unknown';
  let version = 'unknown';
  
  // Chrome
  if (/Chrome/.test(userAgent) && !/Chromium|Edge|Edg|OPR|Opera/.test(userAgent)) {
    browser = 'Chrome';
    version = userAgent.match(/Chrome\/(\d+\.\d+)/)?.[1] || '';
  }
  // Firefox
  else if (/Firefox/.test(userAgent)) {
    browser = 'Firefox';
    version = userAgent.match(/Firefox\/(\d+\.\d+)/)?.[1] || '';
  }
  // Safari
  else if (/Safari/.test(userAgent) && !/Chrome|Chromium|Edge|Edg|OPR|Opera/.test(userAgent)) {
    browser = 'Safari';
    version = userAgent.match(/Version\/(\d+\.\d+)/)?.[1] || '';
  }
  // Edge
  else if (/Edge|Edg/.test(userAgent)) {
    browser = 'Edge';
    version = userAgent.match(/Edge\/(\d+\.\d+)|Edg\/(\d+\.\d+)/)?.[1] || '';
  }
  // Opera
  else if (/OPR|Opera/.test(userAgent)) {
    browser = 'Opera';
    version = userAgent.match(/OPR\/(\d+\.\d+)|Opera\/(\d+\.\d+)/)?.[1] || '';
  }
  // IE
  else if (/MSIE|Trident/.test(userAgent)) {
    browser = 'Internet Explorer';
    version = userAgent.match(/MSIE (\d+\.\d+)|rv:(\d+\.\d+)/)?.[1] || '';
  }
  
  return `${browser} ${version}`.trim();
}

/**
 * Gets the operating system information
 * @returns Operating system name and version if available
 */
function getOperatingSystem(): string {
  const userAgent = navigator.userAgent;
  let os = 'unknown';
  
  // Windows
  if (/Windows NT/.test(userAgent)) {
    os = 'Windows';
    const version = userAgent.match(/Windows NT (\d+\.\d+)/)?.[1];
    if (version) {
      switch (version) {
        case '10.0': os += ' 10'; break;
        case '6.3': os += ' 8.1'; break;
        case '6.2': os += ' 8'; break;
        case '6.1': os += ' 7'; break;
        case '6.0': os += ' Vista'; break;
        case '5.2': os += ' XP'; break;
        case '5.1': os += ' XP'; break;
        default: os += ` ${version}`; break;
      }
    }
  }
  // macOS
  else if (/Mac OS X/.test(userAgent)) {
    os = 'macOS';
    const version = userAgent.match(/Mac OS X (\d+[._]\d+)/)?.[1]?.replace('_', '.');
    if (version) {
      os += ` ${version}`;
    }
  }
  // iOS
  else if (/iPhone|iPad|iPod/.test(userAgent)) {
    os = 'iOS';
    const version = userAgent.match(/OS (\d+[._]\d+)/)?.[1]?.replace('_', '.');
    if (version) {
      os += ` ${version}`;
    }
  }
  // Android
  else if (/Android/.test(userAgent)) {
    os = 'Android';
    const version = userAgent.match(/Android (\d+\.\d+)/)?.[1];
    if (version) {
      os += ` ${version}`;
    }
  }
  // Linux
  else if (/Linux/.test(userAgent)) {
    os = 'Linux';
  }
  
  return os;
}

/**
 * Gets the screen resolution
 * @returns Screen width x height
 */
function getScreenResolution(): string {
  if (typeof screen === 'undefined') {
    return 'unknown';
  }
  
  const width = screen.width || window.innerWidth;
  const height = screen.height || window.innerHeight;
  
  return `${width}x${height}`;
}

/**
 * Gets the current device orientation
 * @returns 'portrait' or 'landscape'
 */
function getOrientation(): string {
  if (typeof window === 'undefined' || typeof screen === 'undefined') {
    return 'unknown';
  }
  
  // Check screen orientation if available
  // @ts-ignore: Newer browsers support screen.orientation
  if (screen.orientation) {
    // @ts-ignore: Accessing type property
    return screen.orientation.type.includes('portrait') ? 'portrait' : 'landscape';
  }
  
  // Fallback to window dimensions
  return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
}

/**
 * Gets the current network connection type if available
 * @returns Connection type or 'unknown'
 */
function getConnectionType(): string {
  // @ts-ignore: Navigator connection is non-standard
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  if (connection) {
    return connection.effectiveType || connection.type || 'unknown';
  }
  
  return 'unknown';
}

/**
 * Determines if Do Not Track is enabled
 * @returns 'yes', 'no', or 'unspecified'
 */
function getDoNotTrackStatus(): string {
  if (navigator.doNotTrack) {
    return navigator.doNotTrack === '1' ? 'yes' : 'no';
  }
  
  // Some browsers use different properties
  // @ts-ignore: Non-standard properties
  if (navigator.msDoNotTrack) {
    // @ts-ignore: Accessing property
    return navigator.msDoNotTrack === '1' ? 'yes' : 'no';
  }
  
  // @ts-ignore: Non-standard property
  if (window.doNotTrack) {
    // @ts-ignore: Accessing property
    return window.doNotTrack === '1' ? 'yes' : 'no';
  }
  
  return 'unspecified';
}

/**
 * Sets up network status monitoring
 * @param callback Function to call when network status changes
 * @returns Function to remove event listeners
 */
export function monitorNetworkStatus(
  callback: (status: { isOnline: boolean, connectionType: string }) => void
): () => void {
  const handleStatusChange = () => {
    callback({
      isOnline: navigator.onLine,
      connectionType: getConnectionType()
    });
  };
  
  // Listen for online/offline events
  window.addEventListener('online', handleStatusChange);
  window.addEventListener('offline', handleStatusChange);
  
  // Listen for connection changes if supported
  // @ts-ignore: Connection is non-standard
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection) {
    connection.addEventListener('change', handleStatusChange);
  }
  
  // Initial call
  handleStatusChange();
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleStatusChange);
    window.removeEventListener('offline', handleStatusChange);
    
    if (connection) {
      connection.removeEventListener('change', handleStatusChange);
    }
  };
}