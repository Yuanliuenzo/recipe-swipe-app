import { Component } from '../Component.js';

// Loading component with different styles
export class Loading extends Component {
  constructor(container, props = {}) {
    super(container, {
      type: 'spinner', // 'spinner', 'skeleton', 'dots'
      message: 'Loading...',
      size: 'medium', // 'small', 'medium', 'large'
      overlay: false,
      ...props
    });
  }
  
  render() {
    const { type, message, size, overlay } = this.props;
    
    const overlayClass = overlay ? 'loading-overlay' : '';
    const sizeClass = `loading-${size}`;
    
    return `
      <div class="loading-container ${overlayClass} ${sizeClass}" data-component-id="${this.id}">
        ${this.renderLoadingContent()}
        ${message ? `<div class="loading-message">${message}</div>` : ''}
      </div>
    `;
  }
  
  renderLoadingContent() {
    const { type } = this.props;
    
    switch (type) {
      case 'spinner':
        return this.renderSpinner();
      case 'skeleton':
        return this.renderSkeleton();
      case 'dots':
        return this.renderDots();
      default:
        return this.renderSpinner();
    }
  }
  
  renderSpinner() {
    return '<div class="loading-spinner"></div>';
  }
  
  renderSkeleton() {
    return `
      <div class="skeleton-loader">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-subtitle"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
      </div>
    `;
  }
  
  renderDots() {
    return `
      <div class="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
  }
  
  // Update loading message
  updateMessage(newMessage) {
    this.props.message = newMessage;
    const messageElement = this.find('.loading-message');
    if (messageElement) {
      messageElement.textContent = newMessage;
    }
  }
  
  // Change loading type
  updateType(newType) {
    this.props.type = newType;
    this.forceUpdate();
  }
  
  // Show/hide overlay
  setOverlay(show) {
    this.props.overlay = show;
    this.forceUpdate();
  }
}

// Recipe-specific loading component
export class RecipeLoading extends Loading {
  constructor(container, props = {}) {
    super(container, {
      type: 'skeleton',
      message: 'Generating your recipe...',
      overlay: true,
      ...props
    });
  }
  
  render() {
    return `
      <div class="recipe-loading" data-component-id="${this.id}">
        <div class="recipe-loading-status">${this.props.message}</div>
        ${this.renderLoadingContent()}
      </div>
    `;
  }
}

// Mobile-specific loading component
export class MobileLoading extends Loading {
  constructor(container, props = {}) {
    super(container, {
      type: 'spinner',
      message: 'Loading...',
      size: 'small',
      ...props
    });
  }
  
  render() {
    return `
      <div class="mobile-loading" data-component-id="${this.id}">
        <span class="mobile-loading-spinner"></span>
        <span class="mobile-loading-text">${this.props.message}</span>
      </div>
    `;
  }
}
