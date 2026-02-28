# Modular CSS Structure - Recipe Swipe App

## Overview

This project has been restructured to use a modular CSS architecture inspired by Japandi design principles - clean, elegant, and highly maintainable. The new structure separates concerns into logical layers and modules, making the codebase easier to navigate, maintain, and scale.

## 📁 Folder Structure

```
public/css/
├── base/                    # Global styles and design tokens
│   ├── _reset.css          # Reset & global box-sizing
│   ├── _variables.css      # Color palette, spacing, shadows, z-index
│   ├── _typography.css     # Fonts, headings, body text
│   └── _helpers.css        # Utility classes (flex, text-center, spacing)
│
├── layout/                  # Structural layout components
│   ├── _mobile-container.css # Mobile layout wrappers & app container
│   ├── _headers.css        # Mobile headers, subheaders
│   ├── _footers.css        # Mobile footers, floating buttons
│   └── _navigation.css     # FAB navigation, bottom sheet, unified dropdown
│
├── components/              # Reusable UI components
│   ├── _buttons.css        # Japandi buttons (primary, subtle, reset)
│   ├── _cards.css          # Recipe card, vibe card, favorite card
│   ├── _modals.css         # Alert modal, bottom sheet, overlays
│   ├── _toggles.css        # Recipe toggle, preference toggle
│   ├── _ratings.css        # Star ratings
│   ├── _forms.css          # Inputs, textareas (ingredients, notes)
│   └── _spinners.css       # Loading spinners, skeleton loaders
│
├── sections/                # Feature-specific sections
│   ├── _recipe.css         # Recipe list, sections, instructions, ingredients
│   ├── _favorites.css      # Favorites screens and grids
│   ├── _preferences.css    # Preferences screens and options
│   └── _vibes.css          # Mobile vibe cards, overlays, summaries
│
├── utilities/               # Global helpers and tools
│   ├── _animations.css     # Keyframes, transitions
│   ├── _scrollbars.css     # Scrollbar customizations
│   ├── _responsive.css     # Media queries
│   └── _z-index.css        # Layering & stacking helpers
│
└── mobile-new.css          # Main entry file (mobile)
└── style-new.css           # Main entry file (desktop)
```

## 🎨 Design System

### Color Palette (Japandi-inspired)

```css
:root {
  --color-bg: #f0f2f5; /* Soft background */
  --color-card: #ffffff; /* Clean white cards */
  --color-primary: #6a4e42; /* Warm brown */
  --color-secondary: #8b7355; /* Muted accent */
  --color-accent: #dcb984; /* Soft gold */
  --color-text: #34495e; /* Dark text */
}
```

### Typography Scale

- **Primary Font**: 'Noto Sans' (clean, neutral)
- **Heading Font**: 'Playfair Display' (elegant serif)
- **Font Sizes**: 12px - 36px with responsive scaling

### Spacing System

- **Scale**: 4px, 8px, 12px, 16px, 20px, 24px, 30px, 40px
- **Consistent**: Used throughout all components

### Border Radius

- **Soft**: 6px, 8px, 12px, 16px, 18px, 20px, 25px, 26px
- **Japandi aesthetic**: Rounded but not overly soft

## 🚀 Usage

### Import Structure

The entry files (`mobile-new.css` and `style-new.css`) import modules in logical order:

1. **Base Layer** - Reset, variables, typography, utilities
2. **Layout Layer** - Containers, headers, navigation
3. **Component Layer** - Reusable UI components
4. **Section Layer** - Feature-specific styles
5. **Utility Layer** - Animations, responsive, z-index

### Adding New Styles

1. **New Component**: Add to `components/_component-name.css`
2. **New Section**: Add to `sections/_section-name.css`
3. **New Utility**: Add to appropriate utility file or create new one
4. **Update Entry Files**: Add import to main CSS files

### Modifying Existing Styles

1. **Variables**: Update `_variables.css` for global changes
2. **Components**: Modify specific component files
3. **Layout**: Adjust layout files for structural changes
4. **Responsive**: Update `_responsive.css` for breakpoint changes

## 📱 Responsive Design

### Breakpoints

- **XS**: 480px (Phones)
- **SM**: 640px (Landscape phones)
- **MD**: 768px (Tablets)
- **LG**: 1024px (Desktops)
- **XL**: 1280px (Large desktops)

### Mobile-First Approach

- Base styles target mobile devices
- Enhanced styles added via media queries for larger screens
- Touch-optimized interactions for mobile

## 🎯 Best Practices

### 1. **Consistent Naming**

- Use BEM-inspired naming: `.component__element--modifier`
- Mobile prefixes: `.mobile-component`
- Semantic class names

### 2. **CSS Variables**

- Use CSS custom properties for colors, spacing, shadows
- Define in `_variables.css`
- Reference throughout: `var(--color-primary)`

### 3. **Component Isolation**

- Each component in its own file
- Minimal dependencies between components
- Clear separation of concerns

### 4. **Performance**

- Hardware acceleration for animations
- Efficient selectors
- Minimal repaints and reflows

### 5. **Accessibility**

- Focus states for all interactive elements
- High contrast mode support
- Reduced motion preferences respected

## 🔧 Development Workflow

### Adding a New Component

1. Create component file: `components/_new-component.css`
2. Define styles using design tokens
3. Add import to entry files
4. Test across breakpoints
5. Update documentation

### Debugging

1. Use browser dev tools to inspect
2. Check z-index layering with `_z-index.css` utilities
3. Verify responsive behavior
4. Test with reduced motion preferences

### Migration from Old CSS

1. **Old files**: `mobile.css`, `style.css` (preserved)
2. **New files**: `mobile-new.css`, `style-new.css` (active)
3. **HTML updated**: Reference new CSS files
4. **Gradual migration**: Can switch back to old files if needed

## 🎨 Japandi Design Principles

### Minimalism

- Clean, uncluttered interfaces
- Purposeful use of space
- Essential elements only

### Natural Materials

- Warm, earthy color palette
- Soft shadows and gradients
- Organic shapes and textures

### Functionality

- Every element has a purpose
- Clear visual hierarchy
- Intuitive interactions

### Harmony

- Balanced compositions
- Consistent spacing and rhythm
- Cohesive design language

## 📊 File Sizes & Performance

### Before Modularization

- `mobile.css`: ~2,300 lines, ~45KB
- `style.css`: ~1,400 lines, ~28KB

### After Modularization

- **Total**: Same functionality, better organization
- **Individual files**: 100-400 lines each
- **Benefits**: Better caching, easier maintenance, team collaboration

## 🚀 Future Enhancements

### Planned Improvements

1. **CSS-in-JS integration** for dynamic theming
2. **Component library documentation**
3. **Design tokens expansion**
4. **Automated testing** for CSS regressions
5. **Performance monitoring** for CSS loading

### Scalability

- Easy to add new features
- Clear architecture for team development
- Maintainable codebase
- Consistent design system

---

**Note**: The old CSS files (`mobile.css` and `style.css`) are preserved for reference and rollback. The new modular system (`mobile-new.css` and `style-new.css`) is now active in the HTML files.
