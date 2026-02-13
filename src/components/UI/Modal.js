import { Component } from '../Component.js';
import { DomUtils } from '../../utils/DomUtils.js';

// Modal component with different types
export class Modal extends Component {
  constructor(container, props = {}) {
    super(container, {
      title: '',
      content: '',
      type: 'default', // 'default', 'confirm', 'alert', 'fullscreen'
      showCloseButton: true,
      closeOnOverlayClick: true,
      closeOnEscape: true,
      buttons: [],
      onConfirm: null,
      onCancel: null,
      onClose: null,
      ...props
    });
    
    this.isOpen = false;
  }
  
  render() {
    const { title, content, type, showCloseButton, buttons } = this.props;
    
    return `
      <div class="modal-overlay ${this.isOpen ? 'show' : ''}" data-component-id="${this.id}">
        <div class="modal modal-${type}">
          ${title ? `
            <div class="modal-header">
              <h3 class="modal-title">${title}</h3>
              ${showCloseButton ? '<button class="modal-close" data-action="close">&times;</button>' : ''}
            </div>
          ` : ''}
          
          <div class="modal-body">
            ${content}
          </div>
          
          ${buttons.length > 0 ? `
            <div class="modal-footer">
              ${buttons.map(button => `
                <button class="modal-btn ${button.className || ''}" 
                        data-action="${button.action}"
                        ${button.primary ? 'data-primary="true"' : ''}>
                  ${button.text}
                </button>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  onMount() {
    this.setupEventListeners();
    this.setupKeyboardListeners();
  }
  
  setupEventListeners() {
    const overlay = this.find('.modal-overlay');
    const closeButton = this.find('[data-action="close"]');
    
    // Close on overlay click
    if (overlay && this.props.closeOnOverlayClick) {
      this.addEventListener(overlay, 'click', (e) => {
        if (e.target === overlay) {
          this.close();
        }
      });
    }
    
    // Close button
    if (closeButton) {
      this.addEventListener(closeButton, 'click', () => {
        this.close();
      });
    }
    
    // Action buttons
    const actionButtons = this.findAll('[data-action]');
    actionButtons.forEach(button => {
      this.addEventListener(button, 'click', (e) => {
        const action = button.dataset.action;
        this.handleAction(action);
      });
    });
  }
  
  setupKeyboardListeners() {
    if (this.props.closeOnEscape) {
      this.addEventListener(document, 'keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      });
    }
  }
  
  handleAction(action) {
    switch (action) {
      case 'confirm':
        if (this.props.onConfirm) {
          this.props.onConfirm();
        }
        break;
        
      case 'cancel':
      case 'close':
        if (this.props.onCancel) {
          this.props.onCancel();
        }
        this.close();
        break;
        
      default:
        // Handle custom actions
        if (this.props.onAction) {
          this.props.onAction(action);
        }
        break;
    }
  }
  
  // Open modal
  open() {
    this.isOpen = true;
    this.forceUpdate();
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Focus management
    setTimeout(() => {
      const firstFocusable = this.find('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }, 100);
  }
  
  // Close modal
  close() {
    this.isOpen = false;
    this.forceUpdate();
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Call close callback
    if (this.props.onClose) {
      this.props.onClose();
    }
  }
  
  // Update modal content
  updateContent(newContent) {
    this.props.content = newContent;
    this.forceUpdate();
  }
  
  // Update modal title
  updateTitle(newTitle) {
    this.props.title = newTitle;
    this.forceUpdate();
  }
  
  // Check if modal is open
  getIsOpen() {
    return this.isOpen;
  }
}

// Confirm modal helper
export class ConfirmModal extends Modal {
  constructor(container, props = {}) {
    super(container, {
      title: 'Confirm',
      type: 'confirm',
      buttons: [
        { text: 'Cancel', action: 'cancel', className: 'modal-btn-secondary' },
        { text: 'Confirm', action: 'confirm', className: 'modal-btn-primary', primary: true }
      ],
      ...props
    });
  }
}

// Alert modal helper
export class AlertModal extends Modal {
  constructor(container, props = {}) {
    super(container, {
      title: 'Alert',
      type: 'alert',
      buttons: [
        { text: 'OK', action: 'close', className: 'modal-btn-primary', primary: true }
      ],
      ...props
    });
  }
}

// Fullscreen modal for mobile
export class FullscreenModal extends Modal {
  constructor(container, props = {}) {
    super(container, {
      type: 'fullscreen',
      showCloseButton: true,
      closeOnOverlayClick: false,
      ...props
    });
  }
}
