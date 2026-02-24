/**
 * Component Registry
 * Centralized component management and factory
 */

import { Component } from '../../components/Component.js';
import { VibeCard } from '../../components/Card/VibeCard.js';
import { RecipeCard } from '../../components/Card/RecipeCard.js';
import { Modal, AlertModal, ConfirmModal, FullscreenModal } from '../../components/UI/Modal.js';

export class ComponentRegistry {
  constructor() {
    this.components = new Map();
    this.componentClasses = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      console.warn('ComponentRegistry already initialized');
      return;
    }

    try {
      console.log('🧩 Initializing Component Registry...');

      // Register component classes
      this.registerClass('Component', Component);
      this.registerClass('VibeCard', VibeCard);
      this.registerClass('RecipeCard', RecipeCard);
      this.registerClass('Modal', Modal);
      this.registerClass('AlertModal', AlertModal);
      this.registerClass('ConfirmModal', ConfirmModal);
      this.registerClass('FullscreenModal', FullscreenModal);

      this.isInitialized = true;
      console.log('✅ Component Registry initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize Component Registry:', error);
      throw error;
    }
  }

  registerClass(name, componentClass) {
    if (this.componentClasses.has(name)) {
      console.warn(`Component class '${name}' already registered`);
      return;
    }

    this.componentClasses.set(name, componentClass);
    console.log(`🧩 Registered component class: ${name}`);
  }

  getClass(name) {
    const componentClass = this.componentClasses.get(name);
    if (!componentClass) {
      console.error(`Component class '${name}' not found`);
      return null;
    }
    return componentClass;
  }

  create(name, container, props = {}) {
    const ComponentClass = this.getClass(name);
    if (!ComponentClass) {
      console.error(`Cannot create component '${name}': class not found`);
      return null;
    }

    try {
      const component = new ComponentClass(container, props);
      this.register(name, component);
      return component;
    } catch (error) {
      console.error(`Failed to create component '${name}':`, error);
      return null;
    }
  }

  register(name, component) {
    if (this.components.has(name)) {
      console.warn(`Component '${name}' already registered`);
      return;
    }

    this.components.set(name, component);
    console.log(`🧩 Registered component instance: ${name}`);
  }

  get(name) {
    const component = this.components.get(name);
    if (!component) {
      console.error(`Component '${name}' not found`);
      return null;
    }
    return component;
  }

  has(name) {
    return this.components.has(name);
  }

  unregister(name) {
    const component = this.components.get(name);
    if (component) {
      // Destroy component if it has destroy method
      if (typeof component.destroy === 'function') {
        component.destroy();
      }
      this.components.delete(name);
      console.log(`🗑️ Unregistered component: ${name}`);
    }
  }

  list() {
    return Array.from(this.components.keys());
  }

  listClasses() {
    return Array.from(this.componentClasses.keys());
  }

  clear() {
    // Destroy all components before clearing
    Array.from(this.components.values()).forEach(component => {
      if (typeof component.destroy === 'function') {
        component.destroy();
      }
    });
    
    this.components.clear();
    console.log('🗑️ Cleared all components');
  }

  // Find components by type or selector
  findByType(type) {
    const results = [];
    this.components.forEach((component, name) => {
      if (component.constructor.name === type || component.type === type) {
        results.push({ name, component });
      }
    });
    return results;
  }

  findBySelector(selector) {
    const results = [];
    this.components.forEach((component, name) => {
      if (component.container && component.container.matches && component.container.matches(selector)) {
        results.push({ name, component });
      }
    });
    return results;
  }

  // Destroy all components
  destroyAll() {
    this.clear();
    console.log('🗑️ All components destroyed');
  }
}
