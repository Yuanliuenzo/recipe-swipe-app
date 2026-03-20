/**
 * SearchBar Component
 * Placeholder search bar for filtering recipes in the suggestions view
 */

export class SearchBar {
  constructor(container) {
    this.container = container;
    this.element = null;
  }

  render() {
    this.element = document.createElement("div");
    this.element.className = "search-bar";
    this.element.innerHTML = `
      <div class="search-bar__inner">
        <span class="search-bar__icon">🔍</span>
        <input
          type="text"
          class="search-bar__input"
          placeholder="Search recipes..."
          aria-label="Search recipes"
          disabled
        />
      </div>
    `;
    this.container.prepend(this.element);
  }

  destroy() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}
