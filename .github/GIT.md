# 🌿 Git Configuration Guide

This guide explains the Git configuration that prevents "no upstream branch" errors and ensures smooth collaboration.

## 🔧 Automatic Upstream Configuration

### Problem Solved
```
fatal: The current branch feature/new-feature has no upstream branch.
To push the current branch and set the remote as upstream, use

    git push --set-upstream origin feature/new-feature
```

### Solution Implemented
The development setup now automatically configures Git to handle upstream tracking:

```bash
# These commands are run automatically in setup-dev.sh
git config push.autoSetupRemote true    # Auto-set upstream for new branches
git config push.default current           # Push to current branch by default
```

## 🚀 Usage

### For New Developers
```bash
# Clone and run setup - everything is configured automatically
git clone <repository-url>
cd recipe-swipe-app
./setup-dev.sh

# Now you can push without errors:
git checkout -b feature/new-feature
# ... make changes ...
git add .
git commit -m "feat: add new feature"
git push  # Automatically sets upstream if needed!
```

### Manual Git Configuration
If you need to configure Git manually:

```bash
# Enable automatic upstream setup
git config push.autoSetupRemote true

# Set default push behavior
git config push.default current

# Or set for specific remote
git config push.default current
git config branch.<branch>.remote origin
```

## 🌿 Branch Management

### Creating New Branches
```bash
# Create and push new branch (auto-upstream configured)
git checkout -b feature/amazing-feature
git push  # Automatically sets up upstream tracking
```

### Existing Branches Without Upstream
```bash
# For branches that already exist without upstream
git push --set-upstream origin existing-branch

# Or use the one-liner (with autoSetupRemote=true)
git push
```

## 🔍 Verification

### Check Current Configuration
```bash
# Check if autoSetupRemote is enabled
git config --get push.autoSetupRemote

# Check default push behavior
git config --get push.default

# Check tracking for current branch
git branch -vv  # Shows tracking information
```

### Test the Configuration
```bash
# Create a test branch
git checkout -b test-upstream

# Make a small change
echo "test" > test.txt
git add test.txt
git commit -m "test: upstream configuration"

# Push - should work without errors
git push

# Cleanup
git checkout main
git branch -D test-upstream
```

## 🛠️ Advanced Configuration

### Per-Remote Configuration
```bash
# Configure different behavior for different remotes
git config remote.origin.pushautoSetupRemote true
git config remote.upstream.pushautoSetupRemote false

# Set push refspec for specific branches
git config push.default current
git config push.default matching
```

### Branch-Specific Configuration
```bash
# Configure specific branch to track different remote
git config branch.feature.remote origin
git config branch.feature.merge refs/heads/feature

# Configure push behavior for specific branch
git config branch.feature.pushRemote origin
```

## 🔒 Security Considerations

### Safe Push Configuration
```bash
# Prevent accidental pushes to sensitive branches
git config push.default current

# Require explicit remote for main branch
git config branch.main.remote origin
git config branch.main.pushRemote origin

# Enable push refspec matching for safety
git config push.default matching
```

### Protected Branches
```bash
# For protected branches, always require explicit remote
git config branch.main.pushRemote origin

# Disable auto-setup for protected branches
git config push.autoSetupRemote false
```

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. "No upstream branch" Error
```bash
# Solution 1: Enable auto-setup (recommended)
git config push.autoSetupRemote true

# Solution 2: Manual upstream setup
git push --set-upstream origin branch-name

# Solution 3: Set tracking explicitly
git branch --set-upstream-to=origin/branch-name branch-name
```

#### 2. Push Refuses to Work
```bash
# Check current configuration
git config --list | grep push

# Check branch tracking
git branch -vv

# Reset to safe configuration
git config push.autoSetupRemote true
git config push.default current
```

#### 3. Multiple Remotes
```bash
# List all remotes
git remote -v

# Configure default remote
git config push.default current

# Or specify remote explicitly
git config push.default origin
```

## 📋 Best Practices

### 1. Initial Setup
```bash
# Always run the setup script for new environments
./setup-dev.sh

# Or configure Git manually
git config push.autoSetupRemote true
git config push.default current
```

### 2. Branch Naming
```bash
# Use conventional branch names
feature/feature-name
bugfix/issue-description
hotfix/critical-fix
release/version-number
```

### 3. Push Behavior
```bash
# Push current branch by default
git push

# Push to specific remote when needed
git push origin feature-branch

# Force push only when necessary
git push --force-with-lease
```

## 🔄 Integration with Development Workflow

### Pre-commit Hooks
```bash
# The setup script configures Husky which works with upstream tracking
git commit -m "feat: add new feature"  # Commits work normally
git push  # Pushes with auto-upstream configuration
```

### CI/CD Pipeline
```yaml
# GitHub Actions work with any upstream configuration
- name: Push and Test
  on: push
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - name: Test
          run: npm test
```

## 🎯 Quick Reference

### Essential Commands
```bash
# Configure automatic upstream (one-time setup)
git config push.autoSetupRemote true
git config push.default current

# Daily workflow
git checkout -b feature/new-feature
# ... work on feature ...
git add .
git commit -m "feat: implement new feature"
git push  # Works seamlessly!

# Push to different remote
git push upstream feature-branch

# Check current status
git status
git branch -vv
```

---

**With this configuration, you'll never see the "no upstream branch" error again!** 🚀
