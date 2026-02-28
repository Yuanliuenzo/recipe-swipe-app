import { Component } from "../Component.js";
import { DeviceUtils } from "../../utils/DeviceUtils.js";

// Floating Action Button component for mobile navigation
export class FloatingActionButton extends Component {
  constructor(container, props = {}) {
    super(container, {
      icon: "👤",
      showBackButton: false,
      items: [
        { icon: "⭐", text: "My Favorites", action: "favorites" },
        { icon: "⚙️", text: "Preferences", action: "preferences" },
        { icon: "🚪", text: "Logout", action: "logout" }
      ],
      onItemClick: null,
      onBackClick: null,
      ...props
    });

    this.isOpen = false;
  }

  render() {
    const { icon, showBackButton, items } = this.props;

    return `
      <div class="mobile-navigation" data-component-id="${this.id}">
        <button class="mobile-fab" data-fab-toggle>
          <span class="fab-icon">${icon}</span>
        </button>
        
        <div class="mobile-fab-menu" data-fab-menu>
          <div class="fab-items">
            ${
              showBackButton
                ? `
              <button class="fab-item" data-action="back" style="display: ${showBackButton ? "flex" : "none"};">
                <span class="fab-item-icon">←</span>
                <span class="fab-item-text">Back to Swiping</span>
              </button>
            `
                : ""
            }
            
            ${items
              .map(
                item => `
              <button class="fab-item" data-action="${item.action}">
                <span class="fab-item-icon">${item.icon}</span>
                <span class="fab-item-text">${item.text}</span>
              </button>
            `
              )
              .join("")}
          </div>
        </div>
        
        <div class="fab-overlay" data-fab-overlay></div>
      </div>
    `;
  }

  onMount() {
    this.setupFAB();
    this.setupMenuItems();
    this.setupOverlay();

    // Add haptic feedback for mobile
    if (DeviceUtils.isMobile()) {
      this.addHapticFeedback();
    }
  }

  setupFAB() {
    const toggle = this.find("[data-fab-toggle]");
    const menu = this.find("[data-fab-menu]");
    const overlay = this.find("[data-fab-overlay]");

    if (!toggle || !menu || !overlay) {
      return;
    }

    // Toggle FAB menu
    this.addEventListener(toggle, "click", e => {
      e.stopPropagation();
      this.toggleMenu();
    });
  }

  setupMenuItems() {
    const menuItems = this.findAll("[data-action]");

    menuItems.forEach(item => {
      this.addEventListener(item, "click", e => {
        e.preventDefault();
        e.stopPropagation();

        const action = item.dataset.action;
        this.handleItemClick(action);
      });
    });
  }

  setupOverlay() {
    const overlay = this.find("[data-fab-overlay]");

    if (!overlay) {
      return;
    }

    // Close menu when clicking overlay
    this.addEventListener(overlay, "click", () => {
      this.closeMenu();
    });
  }

  addHapticFeedback() {
    const toggle = this.find("[data-fab-toggle]");
    const menuItems = this.findAll("[data-action]");

    // Haptic feedback for FAB toggle
    if (toggle) {
      this.addEventListener(toggle, "click", () => {
        DeviceUtils.vibrate(10);
      });
    }

    // Haptic feedback for menu items
    menuItems.forEach(item => {
      this.addEventListener(item, "click", () => {
        DeviceUtils.vibrate(10);
      });
    });
  }

  toggleMenu() {
    if (this.isOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  openMenu() {
    const menu = this.find("[data-fab-menu]");
    const overlay = this.find("[data-fab-overlay]");

    if (menu && overlay) {
      menu.classList.add("show");
      overlay.classList.add("show");
      this.isOpen = true;
    }
  }

  closeMenu() {
    const menu = this.find("[data-fab-menu]");
    const overlay = this.find("[data-fab-overlay]");

    if (menu && overlay) {
      menu.classList.remove("show");
      overlay.classList.remove("show");
      this.isOpen = false;
    }
  }

  handleItemClick(action) {
    this.closeMenu();

    // Handle special back action
    if (action === "back") {
      if (this.props.onBackClick) {
        this.props.onBackClick();
      }
      return;
    }

    // Handle other actions
    if (this.props.onItemClick) {
      this.props.onItemClick(action);
    }
  }

  // Update FAB icon
  updateIcon(newIcon) {
    this.props.icon = newIcon;
    const iconElement = this.find(".fab-icon");
    if (iconElement) {
      iconElement.textContent = newIcon;
    }
  }

  // Show/hide back button
  showBackButton(show = true) {
    this.props.showBackButton = show;
    const backButton = this.find('[data-action="back"]');
    if (backButton) {
      backButton.style.display = show ? "flex" : "none";
    }
  }

  // Update menu items
  updateItems(newItems) {
    this.props.items = newItems;
    this.forceUpdate();
  }

  // Check if menu is open
  getIsOpen() {
    return this.isOpen;
  }
}
