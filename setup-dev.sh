#!/bin/bash

# 🍳 Recipe Swipe App - Development Setup Script
# This script sets up a complete development environment with all security and tooling

set -e  # Exit on any error

echo "🚀 Setting up Recipe Swipe App development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js >= 16.0.0"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f1)
    print_status "Node.js version: $NODE_VERSION"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm >= 8.0.0"
        exit 1
    fi
    
    NPM_VERSION=$(npm -v)
    print_status "npm version: $NPM_VERSION"
    
    # Check Git
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install Git"
        exit 1
    fi
    
    GIT_VERSION=$(git --version)
    print_status "Git version: $GIT_VERSION"
}

# Install dependencies
install_dependencies() {
    print_info "Installing dependencies..."
    
    # Clean install to ensure fresh state
    if [ -d "node_modules" ]; then
        print_warning "Removing existing node_modules..."
        rm -rf node_modules
    fi
    
    # Install dependencies
    npm ci
    
    print_status "Dependencies installed successfully"
}

# Setup environment
setup_environment() {
    print_info "Setting up environment..."
    
    # Copy .env.example to .env if it doesn't exist
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_status "Created .env from .env.example"
            print_warning "Please edit .env with your configuration"
        else
            print_error ".env.example not found. Cannot create environment file."
            exit 1
        fi
    else
        print_status ".env file already exists"
    fi
}

# Setup Git hooks
setup_git_hooks() {
    print_info "Setting up Git hooks..."
    
    # Initialize Husky
    npm run prepare
    
    print_status "Git hooks configured"
}

# Run initial tests
run_tests() {
    print_info "Running initial tests..."
    
    npm test
    
    print_status "Tests completed"
}

# Run security audit
run_security_audit() {
    print_info "Running security audit..."
    
    npm run security:audit
    
    print_status "Security audit completed"
}

# Run linting
run_linting() {
    print_info "Running code quality checks..."
    
    npm run lint
    
    print_status "Code quality checks completed"
}

# Check formatting
check_formatting() {
    print_info "Checking code formatting..."
    
    npm run format:check
    
    print_status "Formatting check completed"
}

# Create development scripts
create_dev_scripts() {
    print_info "Creating development helper scripts..."
    
    # Create a dev-start script
    cat > dev-start.sh << 'EOF'
#!/bin/bash
# Development server with hot reload
npm run dev
EOF
    chmod +x dev-start.sh
    
    # Create a test-watch script
    cat > test-watch.sh << 'EOF'
#!/bin/bash
# Run tests in watch mode
npm run test:watch
EOF
    chmod +x test-watch.sh
    
    # Create a security-check script
    cat > security-check.sh << 'EOF'
#!/bin/bash
# Run all security checks
echo "🔒 Running security checks..."
npm run security:audit
npm run lint
EOF
    chmod +x security-check.sh
    
    print_status "Development scripts created"
}

# Print next steps
print_next_steps() {
    echo ""
    print_info "🎉 Setup completed successfully!"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Edit .env file with your configuration"
    echo "2. Run 'npm run dev' to start development server"
    echo "3. Open http://localhost:3000 in your browser"
    echo "4. Make changes and commit with conventional commits"
    echo ""
    echo -e "${GREEN}Available commands:${NC}"
    echo "  npm run dev          - Start development server"
    echo "  npm test             - Run tests"
    echo "  npm run test:watch   - Run tests in watch mode"
    echo "  npm run lint         - Check code quality"
    echo "  npm run lint:fix     - Auto-fix linting issues"
    echo "  npm run format       - Format code"
    echo "  npm run security:audit - Run security audit"
    echo ""
    echo -e "${YELLOW}Development scripts:${NC}"
    echo "  ./dev-start.sh      - Start development server"
    echo "  ./test-watch.sh     - Run tests in watch mode"
    echo "  ./security-check.sh - Run security checks"
    echo ""
    echo -e "${BLUE}Documentation:${NC}"
    echo "  README.md           - Project overview"
    echo "  SECURITY.md         - Security guidelines"
    echo "  .github/PROTECTION.md - Branch protection rules"
    echo ""
}

# Main execution
main() {
    echo "🍳 Recipe Swipe App - Development Setup"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    install_dependencies
    setup_environment
    setup_git_hooks
    run_tests
    run_security_audit
    run_linting
    check_formatting
    create_dev_scripts
    print_next_steps
    
    echo -e "${GREEN}✅ Development environment is ready!${NC}"
}

# Run main function
main "$@"
