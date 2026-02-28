import { DomUtils } from "../utils/DomUtils.js";
import { globalEventBus } from "../core/EventBus.js";

// Base component class with lifecycle management
export class Component {
  constructor(container, props = {}) {
    this.container =
      typeof container === "string" ? DomUtils.find(container) : container;
    this.props = { ...props };
    this.state = {};
    this.children = new Set();
    this.isMounted = false;
    this.eventListeners = new Map();
    this.eventSubscriptions = new Set();

    // Auto-generate ID if not provided
    this.id =
      props.id ||
      `component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Bind methods
    this.render = this.render.bind(this);
    this.setState = this.setState.bind(this);
    this.onMount = this.onMount.bind(this);
    this.onUnmount = this.onUnmount.bind(this);
    this.onUpdate = this.onUpdate.bind(this);
  }

  // Render method - must be implemented by subclasses
  render() {
    throw new Error(
      "render() method must be implemented by component subclass"
    );
  }

  // Mount component to DOM
  mount() {
    if (!this.container) {
      throw new Error(`Component ${this.id}: Container not found`);
    }

    if (this.isMounted) {
      console.warn(`Component ${this.id}: Already mounted`);
      return;
    }

    // Render component
    const html = this.render();

    if (typeof html === "string") {
      this.container.innerHTML = html;
    } else if (html instanceof HTMLElement) {
      this.container.innerHTML = "";
      this.container.appendChild(html);
    } else {
      throw new Error("render() must return string or HTMLElement");
    }

    this.isMounted = true;

    // Mount child components
    this.children.forEach(child => {
      if (child instanceof Component) {
        child.mount();
      }
    });

    // Call lifecycle hook
    this.onMount();

    // Emit mount event
    globalEventBus.emit("component:mounted", { component: this, id: this.id });
  }

  // Unmount component and cleanup
  unmount() {
    if (!this.isMounted) {
      return;
    }

    // Call lifecycle hook
    this.onUnmount();

    // Unmount children
    this.children.forEach(child => {
      if (child instanceof Component) {
        child.unmount();
      }
    });

    // Cleanup event listeners
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners.clear();

    // Cleanup event subscriptions
    this.eventSubscriptions.forEach(unsubscribe => unsubscribe());
    this.eventSubscriptions.clear();

    // Clear container
    if (this.container) {
      this.container.innerHTML = "";
    }

    this.isMounted = false;

    // Emit unmount event
    globalEventBus.emit("component:unmounted", {
      component: this,
      id: this.id
    });
  }

  // Update component state and re-render
  setState(updates, callback = null) {
    if (!this.isMounted) {
      console.warn(
        `Component ${this.id}: Cannot setState on unmounted component`
      );
      return;
    }

    const prevState = { ...this.state };
    Object.assign(this.state, updates);

    // Call update lifecycle
    this.onUpdate(updates, prevState);

    // Re-render
    const html = this.render();

    if (typeof html === "string") {
      this.container.innerHTML = html;
    } else if (html instanceof HTMLElement) {
      this.container.innerHTML = "";
      this.container.appendChild(html);
    }

    // Re-mount children
    this.children.forEach(child => {
      if (child instanceof Component) {
        child.mount();
      }
    });

    // Execute callback if provided
    if (callback) {
      callback.call(this);
    }

    // Emit state change event
    globalEventBus.emit("component:state-changed", {
      component: this,
      id: this.id,
      updates,
      prevState,
      nextState: { ...this.state }
    });
  }

  // Add child component
  addChild(child) {
    this.children.add(child);
    if (this.isMounted && child instanceof Component) {
      child.mount();
    }
  }

  // Remove child component
  removeChild(child) {
    if (child instanceof Component) {
      child.unmount();
    }
    this.children.delete(child);
  }

  // Add DOM event listener with automatic cleanup
  addEventListener(element, event, handler, options = {}) {
    if (!this.isMounted) {
      console.warn(
        `Component ${this.id}: Cannot add event listener to unmounted component`
      );
      return null;
    }

    const cleanup = DomUtils.addListener(element, event, handler, options);
    this.eventListeners.set(cleanup, { element, event, handler, options });
    return cleanup;
  }

  // Add event bus subscription with automatic cleanup
  subscribe(event, callback) {
    const unsubscribe = globalEventBus.subscribe(event, callback);
    this.eventSubscriptions.add(unsubscribe);
    return unsubscribe;
  }

  // Find element within component
  find(selector) {
    return DomUtils.find(selector, this.container);
  }

  // Find all elements within component
  findAll(selector) {
    return DomUtils.findAll(selector, this.container);
  }

  // Lifecycle hooks (can be overridden by subclasses)
  onMount() {
    // Called after component is mounted
  }

  onUnmount() {
    // Called before component is unmounted
  }

  onUpdate(_updates, _prevState) {
    // Called after state is updated but before re-render
  }

  // Utility methods
  forceUpdate() {
    if (this.isMounted) {
      this.setState({}, () => {
        // Force re-render without state change
      });
    }
  }

  // Get component's DOM element
  getElement() {
    return this.container;
  }

  // Check if component is mounted
  getIsMounted() {
    return this.isMounted;
  }

  // Debug method
  debug() {
    console.log(`Component ${this.id}:`, {
      isMounted: this.isMounted,
      state: this.state,
      props: this.props,
      childrenCount: this.children.size,
      eventListenersCount: this.eventListeners.size,
      eventSubscriptionsCount: this.eventSubscriptions.size
    });
  }
}
