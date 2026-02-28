// DOM manipulation utilities
export class DomUtils {
  // Create element with attributes and children
  static createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);

    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === "className") {
        element.className = value;
      } else if (key === "innerHTML") {
        element.innerHTML = value;
      } else if (key === "textContent") {
        element.textContent = value;
      } else if (key.startsWith("data-")) {
        element.setAttribute(key, value);
      } else {
        element[key] = value;
      }
    });

    // Add children
    children.forEach(child => {
      if (typeof child === "string") {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof HTMLElement) {
        element.appendChild(child);
      }
    });

    return element;
  }

  // Find element by selector with error handling
  static find(selector, context = document) {
    const element = context.querySelector(selector);
    if (!element) {
      console.warn(`Element not found: ${selector}`);
    }
    return element;
  }

  // Find all elements by selector
  static findAll(selector, context = document) {
    return context.querySelectorAll(selector);
  }

  // Add event listener with automatic cleanup
  static addListener(element, event, handler, options = {}) {
    element.addEventListener(event, handler, options);

    // Return cleanup function
    return () => {
      element.removeEventListener(event, handler, options);
    };
  }

  // Add multiple event listeners
  static addListeners(element, events, options = {}) {
    const cleanups = [];

    Object.entries(events).forEach(([event, handler]) => {
      const cleanup = this.addListener(element, event, handler, options);
      cleanups.push(cleanup);
    });

    // Return cleanup function for all listeners
    return () => {
      cleanups.forEach(cleanup => cleanup());
    };
  }

  // Show element with optional animation
  static show(element, display = "block") {
    if (element) {
      element.style.display = display;
      element.classList.remove("hidden");
    }
  }

  // Hide element
  static hide(element) {
    if (element) {
      element.style.display = "none";
      element.classList.add("hidden");
    }
  }

  // Toggle element visibility
  static toggle(element, force = null) {
    if (element) {
      if (force !== null) {
        element.classList.toggle("hidden", !force);
      } else {
        element.classList.toggle("hidden");
      }
    }
  }

  // Add CSS class
  static addClass(element, className) {
    if (element) {
      element.classList.add(className);
    }
  }

  // Remove CSS class
  static removeClass(element, className) {
    if (element) {
      element.classList.remove(className);
    }
  }

  // Toggle CSS class
  static toggleClass(element, className, force = null) {
    if (element) {
      if (force !== null) {
        element.classList.toggle(className, force);
      } else {
        element.classList.toggle(className);
      }
    }
  }

  // Empty element content
  static empty(element) {
    if (element) {
      element.innerHTML = "";
    }
  }

  // Set element styles
  static setStyles(element, styles) {
    if (element && styles) {
      Object.entries(styles).forEach(([property, value]) => {
        element.style[property] = value;
      });
    }
  }

  // Get element position relative to viewport
  static getPosition(element) {
    if (!element) return { top: 0, left: 0, width: 0, height: 0 };

    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height
    };
  }
}
