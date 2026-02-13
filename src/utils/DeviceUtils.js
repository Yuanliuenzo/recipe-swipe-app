import { CONFIG } from '../core/Config.js';

// Device detection utilities
export class DeviceUtils {
  // Check if current device is mobile
  static isMobile() {
    const userAgent = navigator.userAgent || '';
    return CONFIG.MOBILE_REGEX.test(userAgent);
  }
  
  // Check if device supports touch
  static isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
  
  // Get device type
  static getDeviceType() {
    if (this.isMobile()) {
      return 'mobile';
    }
    return 'desktop';
  }
  
  // Check if device supports vibration
  static supportsVibration() {
    return 'vibrate' in navigator;
  }
  
  // Vibrate device (if supported)
  static vibrate(pattern) {
    if (this.supportsVibration()) {
      navigator.vibrate(pattern);
    }
  }
  
  // Get viewport dimensions
  static getViewportSize() {
    return {
      width: window.innerWidth || document.documentElement.clientWidth,
      height: window.innerHeight || document.documentElement.clientHeight
    };
  }
  
  // Check if device is in landscape mode
  static isLandscape() {
    return window.innerWidth > window.innerHeight;
  }
  
  // Get pixel ratio for high-DPI displays
  static getPixelRatio() {
    return window.devicePixelRatio || 1;
  }
}
