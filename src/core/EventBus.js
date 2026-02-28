// Simple event bus for component communication
class EventBus {
  constructor() {
    this.events = new Map();
  }

  // Subscribe to an event
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.events.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.events.delete(event);
        }
      }
    };
  }

  // Emit an event with data
  emit(event, data = null) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event callback for "${event}":`, error);
        }
      });
    }
  }

  // Remove all listeners for an event
  off(event) {
    this.events.delete(event);
  }

  // Remove all listeners
  clear() {
    this.events.clear();
  }

  // Get number of listeners for an event
  listenerCount(event) {
    return this.events.get(event)?.size || 0;
  }
}

// Global event bus instance
export const globalEventBus = new EventBus();
