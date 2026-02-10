import { Component } from '../Component.js';
import { DomUtils } from '../../utils/DomUtils.js';

// Header component with user profile dropdown
export class Header extends Component {
  constructor(container, props = {}) {
    super(container, {
      title: '🍳 Recipe Swipe',
      username: '',
      showProfile: true,
      onFavoritesClick: null,
      onPreferencesClick: null,
      onSwitchProfileClick: null,
      onLogoutClick: null,
      ...props
    });
  }
  
  render() {
    const { title, username, showProfile } = this.props;
    
    return `
      <header class="header" data-component-id="${this.id}">
        <h1>${title}</h1>
        ${showProfile ? `
          <div class="unified-dropdown">
            <button class="unified-btn" data-dropdown-toggle>
              👤 ${username || 'Profile'}
            </button>
            <div class="unified-dropdown-content" data-dropdown-menu>
              <button class="unified-dropdown-item" data-action="favorites">
                ⭐ My Favorites
              </button>
              <button class="unified-dropdown-item" data-action="preferences">
                ⚙️ Preferences
              </button>
              <button class="unified-dropdown-item" data-action="switch-profile">
                🔄 Switch Profile
              </button>
              <button class="unified-dropdown-item" data-action="logout">
                🚪 Logout
              </button>
            </div>
          </div>
        ` : ''}
      </header>
    `;
  }
  
  onMount() {
    this.setupDropdown();
    this.setupActionButtons();
  }
  
  setupDropdown() {
    const toggle = this.find('[data-dropdown-toggle]');
    const menu = this.find('[data-dropdown-menu]');
    
    if (!toggle || !menu) return;
    
    // Toggle dropdown
    this.addEventListener(toggle, 'click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    this.addEventListener(document, 'click', (e) => {
      if (!this.getElement().contains(e.target)) {
        menu.classList.remove('show');
      }
    });
    
    // Close dropdown when clicking on menu items
    this.addEventListener(menu, 'click', (e) => {
      if (e.target.closest('.unified-dropdown-item')) {
        menu.classList.remove('show');
      }
    });
  }
  
  setupActionButtons() {
    const actionButtons = this.findAll('[data-action]');
    
    actionButtons.forEach(button => {
      this.addEventListener(button, 'click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const action = button.dataset.action;
        this.handleAction(action);
      });
    });
  }
  
  handleAction(action) {
    switch (action) {
      case 'favorites':
        if (this.props.onFavoritesClick) {
          this.props.onFavoritesClick();
        }
        break;
        
      case 'preferences':
        if (this.props.onPreferencesClick) {
          this.props.onPreferencesClick();
        }
        break;
        
      case 'switch-profile':
        if (this.props.onSwitchProfileClick) {
          this.props.onSwitchProfileClick();
        }
        break;
        
      case 'logout':
        if (this.props.onLogoutClick) {
          this.props.onLogoutClick();
        }
        break;
    }
  }
  
  // Update username
  updateUsername(newUsername) {
    this.props.username = newUsername;
    this.forceUpdate();
  }
  
  // Show/hide profile dropdown
  showProfile(show = true) {
    this.props.showProfile = show;
    this.forceUpdate();
  }
  
  // Update title
  updateTitle(newTitle) {
    this.props.title = newTitle;
    this.forceUpdate();
  }
  
  // Close dropdown
  closeDropdown() {
    const menu = this.find('[data-dropdown-menu]');
    if (menu) {
      menu.classList.remove('show');
    }
  }
}
