#!/bin/bash

# 🌿 Git Upstream Configuration Script
# This script automatically sets up upstream tracking for new branches

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to set up upstream for current branch
setup_upstream() {
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    local remote_name="origin"
    
    # Check if branch already has upstream tracking
    if git rev-parse --verify "${remote_name}/${current_branch}" >/dev/null 2>&1; then
        print_status "Branch '$current_branch' already tracks '${remote_name}/${current_branch}'"
        return 0
    fi
    
    print_info "Setting up upstream tracking for branch '$current_branch'..."
    
    # Set up upstream tracking
    git push --set-upstream "$remote_name" "$current_branch"
    
    print_status "Upstream tracking configured for '$current_branch'"
}

# Configure Git to automatically set upstream for new branches
configure_auto_upstream() {
    print_info "Configuring Git to automatically set upstream for new branches..."
    
    # Enable automatic upstream setup
    git config push.autoSetupRemote true
    
    print_status "Git configured to automatically set upstream for new branches"
}

# Configure Git to push to current branch by default
configure_default_push() {
    print_info "Configuring default push behavior..."
    
    # Set push default to current branch
    git config push.default current
    
    print_status "Git configured to push to current branch by default"
}

# Configure smart push behavior
configure_smart_push() {
    print_info "Configuring smart push behavior..."
    
    # Enable smart push (only push if tracking exists)
    git config push.autoSetupRemote true
    
    # Set refspec for pushing current branch
    git config push.default current
    
    print_status "Git configured for smart push behavior"
}

# Show current Git configuration
show_git_config() {
    print_info "Current Git configuration:"
    echo ""
    git config --list | grep -E "(push\.|branch\.)" || echo "No relevant Git configuration found"
    echo ""
}

# Main function
main() {
    echo "🌿 Git Upstream Configuration"
    echo "==============================="
    echo ""
    
    # Check if we're in a Git repository
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
        echo "❌ Error: Not in a Git repository"
        exit 1
    fi
    
    # Configure Git for automatic upstream setup
    configure_auto_upstream
    configure_default_push
    configure_smart_push
    
    # Set up upstream for current branch if needed
    setup_upstream
    
    # Show configuration
    show_git_config
    
    echo ""
    print_status "Git upstream configuration completed!"
    echo ""
    echo -e "${BLUE}Usage:${NC}"
    echo "  git push                    # Will automatically set upstream if needed"
    echo "  git push --set-upstream origin  # Manual upstream setup"
    echo ""
    echo -e "${GREEN}✅ No more 'no upstream branch' errors!${NC}"
}

# Run main function
main "$@"
