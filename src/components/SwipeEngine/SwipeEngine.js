import { DeviceUtils } from '../../utils/DeviceUtils.js';
import { CONFIG } from '../../core/Config.js';
import { globalEventBus } from '../../core/EventBus.js';

// Main SwipeEngine class that delegates to platform-specific handlers
export class SwipeEngine {
  constructor(element, options = {}) {
    this.element = element;
    this.options = {
      threshold: CONFIG.SWIPE_THRESHOLD,
      velocityThreshold: CONFIG.SWIPE_VELOCITY_THRESHOLD,
      rotationFactor: 0.05,
      scaleFactor: 0.95,
      maxRotation: 30,
      ...options
    };
    
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.startTime = 0;
    
    this.callbacks = {
      onSwipeStart: null,
      onSwipeMove: null,
      onSwipeEnd: null,
      onSwipeLeft: null,
      onSwipeRight: null,
      onSwipeCancel: null,
      ...options.callbacks
    };
    
    // Create platform-specific handler
    this.handler = this.createHandler();
    
    // Initialize
    this.init();
  }
  
  createHandler() {
    if (DeviceUtils.isTouchDevice()) {
      return new TouchSwipeHandler(this.element, this.options, this.callbacks);
    } else {
      return new MouseSwipeHandler(this.element, this.options, this.callbacks);
    }
  }
  
  init() {
    if (this.handler) {
      this.handler.init();
    }
  }
  
  // Update callbacks
  on(event, callback) {
    if (this.callbacks.hasOwnProperty(`on${event.charAt(0).toUpperCase() + event.slice(1)}`)) {
      this.callbacks[`on${event.charAt(0).toUpperCase() + event.slice(1)}`] = callback;
    }
    
    if (this.handler) {
      this.handler.on(event, callback);
    }
  }
  
  // Destroy swipe handler
  destroy() {
    if (this.handler) {
      this.handler.destroy();
    }
  }
  
  // Get current swipe state
  getState() {
    return {
      isDragging: this.isDragging,
      startX: this.startX,
      startY: this.startY,
      currentX: this.currentX,
      currentY: this.currentY,
      startTime: this.startTime
    };
  }
}

// Base swipe handler class
class BaseSwipeHandler {
  constructor(element, options, callbacks) {
    this.element = element;
    this.options = options;
    this.callbacks = callbacks;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.startTime = 0;
  }
  
  init() {
    // To be implemented by subclasses
  }
  
  destroy() {
    // To be implemented by subclasses
  }
  
  on(event, callback) {
    // To be implemented by subclasses
  }
  
  // Common swipe calculation logic
  calculateSwipe(deltaX, deltaY, timeDelta) {
    const velocity = Math.abs(deltaX / timeDelta);
    const distance = Math.abs(deltaX);
    const isSwipe = distance > this.options.threshold || 
                   (distance > 50 && velocity > this.options.velocityThreshold);
    
    let direction = null;
    if (isSwipe) {
      direction = deltaX > 0 ? 'right' : 'left';
    }
    
    return {
      isSwipe,
      direction,
      distance,
      velocity,
      deltaX,
      deltaY,
      rotation: deltaX * this.options.rotationFactor,
      scale: Math.max(this.options.scaleFactor, 1 - Math.abs(deltaX) / 1000)
    };
  }
  
  // Apply visual transformation
  applyTransform(deltaX, deltaY, rotation, scale) {
    this.element.style.transform = `translateX(${deltaX}px) translateY(${deltaY * 0.1}px) rotate(${rotation}deg) scale(${scale})`;
  }
  
  // Reset transformation
  resetTransform() {
    this.element.style.transition = 'transform 0.3s ease';
    this.element.style.transform = 'translateX(0) translateY(0) rotate(0) scale(1)';
  }
  
  // Animate out
  animateOut(direction, distance) {
    const rotation = direction === 'right' ? distance * this.options.rotationFactor : -distance * this.options.rotationFactor;
    this.element.style.transition = 'all 0.3s ease-out';
    this.element.style.transform = `translateX(${distance}px) translateY(-50px) rotate(${rotation}deg) scale(0.8)`;
    this.element.style.opacity = '0';
  }
  
  // Emit callback events
  emit(eventName, data) {
    const callback = this.callbacks[`on${eventName.charAt(0).toUpperCase() + eventName.slice(1)}`];
    if (callback) {
      callback(data);
    }
    
    // Also emit to global event bus
    globalEventBus.emit(`swipe:${eventName}`, data);
  }
}

// Mouse-based swipe handler for desktop
class MouseSwipeHandler extends BaseSwipeHandler {
  init() {
    this.mouseDownHandler = this.handleMouseDown.bind(this);
    this.mouseMoveHandler = this.handleMouseMove.bind(this);
    this.mouseUpHandler = this.handleMouseUp.bind(this);
    
    this.element.addEventListener('mousedown', this.mouseDownHandler);
    document.addEventListener('mousemove', this.mouseMoveHandler);
    document.addEventListener('mouseup', this.mouseUpHandler);
  }
  
  destroy() {
    this.element.removeEventListener('mousedown', this.mouseDownHandler);
    document.removeEventListener('mousemove', this.mouseMoveHandler);
    document.removeEventListener('mouseup', this.mouseUpHandler);
  }
  
  on(event, callback) {
    // Mouse handler doesn't need additional event handling
  }
  
  handleMouseDown(e) {
    this.isDragging = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startTime = Date.now();
    this.element.style.transition = 'none';
    
    this.emit('swipeStart', { x: e.clientX, y: e.clientY });
  }
  
  handleMouseMove(e) {
    if (!this.isDragging) return;
    
    this.currentX = e.clientX - this.startX;
    this.currentY = e.clientY - this.startY;
    
    const swipe = this.calculateSwipe(this.currentX, this.currentY, Date.now() - this.startTime);
    this.applyTransform(this.currentX, this.currentY, swipe.rotation, swipe.scale);
    
    this.emit('swipeMove', swipe);
  }
  
  handleMouseUp(e) {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    this.element.style.transition = 'transform 0.3s ease';
    
    const timeDelta = Date.now() - this.startTime;
    const swipe = this.calculateSwipe(this.currentX, this.currentY, timeDelta);
    
    if (swipe.isSwipe) {
      this.animateOut(swipe.direction, swipe.direction === 'right' ? 500 : -500);
      this.emit(swipe.direction === 'right' ? 'swipeRight' : 'swipeLeft', swipe);
    } else {
      this.resetTransform();
      this.emit('swipeCancel', swipe);
    }
    
    this.emit('swipeEnd', swipe);
  }
}

// Touch-based swipe handler for mobile
class TouchSwipeHandler extends BaseSwipeHandler {
  init() {
    this.touchStartHandler = this.handleTouchStart.bind(this);
    this.touchMoveHandler = this.handleTouchMove.bind(this);
    this.touchEndHandler = this.handleTouchEnd.bind(this);
    
    this.element.addEventListener('touchstart', this.touchStartHandler, { passive: false });
    this.element.addEventListener('touchmove', this.touchMoveHandler, { passive: false });
    this.element.addEventListener('touchend', this.touchEndHandler, { passive: true });
    
    this.gestureLocked = false;
    this.isHorizontalGesture = true;
  }
  
  destroy() {
    this.element.removeEventListener('touchstart', this.touchStartHandler);
    this.element.removeEventListener('touchmove', this.touchMoveHandler);
    this.element.removeEventListener('touchend', this.touchEndHandler);
  }
  
  on(event, callback) {
    // Touch handler doesn't need additional event handling
  }
  
  handleTouchStart(e) {
    this.isDragging = true;
    this.gestureLocked = false;
    this.isHorizontalGesture = true;
    this.startX = e.touches[0].clientX;
    this.startY = e.touches[0].clientY;
    this.startTime = Date.now();
    this.element.style.transition = 'none';
    
    this.emit('swipeStart', { x: e.touches[0].clientX, y: e.touches[0].clientY });
  }
  
  handleTouchMove(e) {
    if (!this.isDragging) return;
    
    if (!this.gestureLocked) {
      const deltaX = e.touches[0].clientX - this.startX;
      const deltaY = e.touches[0].clientY - this.startY;
      
      if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
        this.gestureLocked = true;
        this.isHorizontalGesture = Math.abs(deltaX) >= Math.abs(deltaY);
      }
    }
    
    if (!this.isHorizontalGesture) {
      this.isDragging = false;
      this.resetTransform();
      return;
    }
    
    e.preventDefault();
    
    this.currentX = e.touches[0].clientX - this.startX;
    this.currentY = e.touches[0].clientY - this.startY;
    
    const swipe = this.calculateSwipe(this.currentX, this.currentY, Date.now() - this.startTime);
    this.applyTransform(this.currentX, this.currentY, swipe.rotation, swipe.scale);
    
    this.emit('swipeMove', swipe);
  }
  
  handleTouchEnd(e) {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    this.element.style.transition = 'transform 0.3s ease-out';
    
    const timeDelta = Date.now() - this.startTime;
    const swipe = this.calculateSwipe(this.currentX, this.currentY, timeDelta);
    
    if (swipe.isSwipe) {
      this.animateOut(swipe.direction, swipe.direction === 'right' ? 500 : -500);
      this.emit(swipe.direction === 'right' ? 'swipeRight' : 'swipeLeft', swipe);
    } else {
      this.resetTransform();
      this.emit('swipeCancel', swipe);
    }
    
    this.emit('swipeEnd', swipe);
  }
}
