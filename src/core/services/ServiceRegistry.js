/**
 * Service Registry
 * Centralized service management and dependency injection
 * Works with existing state-of-the-art services
 */

import { apiService } from '../ApiService.js';

export class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      console.warn('ServiceRegistry already initialized');
      return;
    }

    try {
      console.log('🔧 Initializing Service Registry...');

      // Register core API service
      this.register('api', apiService);

      this.isInitialized = true;
      console.log('✅ Service Registry initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize Service Registry:', error);
      throw error;
    }
  }

  register(name, service) {
    if (this.services.has(name)) {
      console.warn(`Service '${name}' already registered`);
      return;
    }

    this.services.set(name, service);
    console.log(`📦 Registered service: ${name}`);
  }

  get(name) {
    const service = this.services.get(name);
    if (!service) {
      console.error(`Service '${name}' not found`);
      return null;
    }
    return service;
  }

  has(name) {
    return this.services.has(name);
  }

  unregister(name) {
    if (this.services.has(name)) {
      this.services.delete(name);
      console.log(`🗑️ Unregistered service: ${name}`);
    }
  }

  list() {
    return Array.from(this.services.keys());
  }

  clear() {
    this.services.clear();
    console.log('🗑️ Cleared all services');
  }

  // Initialize all services
  async initializeAll() {
    const initPromises = Array.from(this.services.values()).map(service => {
      if (service && typeof service.initialize === 'function') {
        return service.initialize();
      }
      return Promise.resolve();
    });

    await Promise.all(initPromises);
    console.log('✅ All services initialized');
  }

  // Destroy all services
  async destroyAll() {
    const destroyPromises = Array.from(this.services.values()).map(service => {
      if (service && typeof service.destroy === 'function') {
        return service.destroy();
      }
      return Promise.resolve();
    });

    await Promise.all(destroyPromises);
    this.clear();
    console.log('🗑️ All services destroyed');
  }
}
