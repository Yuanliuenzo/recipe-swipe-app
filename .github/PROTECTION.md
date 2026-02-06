# GitHub Branch Protection Rules

## Main Branch Protection

### Required Status Checks
- ✅ Security Audit
- ✅ Lint Check  
- ✅ Format Check
- ✅ Test Coverage
- ✅ Build Success

### Review Requirements
- 👥 **2 approving reviewers** required
- 🚫 **Dismiss stale PRs** after 7 days
- 📝 **Require PR description**
- 🔒 **Require up-to-date branch** before merging

## Develop Branch Protection

### Required Status Checks
- ✅ Security Audit
- ✅ Lint Check
- ✅ Format Check
- ✅ Test Coverage

### Review Requirements
- 👥 **1 approving reviewer** required
- 🚫 **Dismiss stale PRs** after 14 days
- 📝 **Require PR description**

## Automated Rules

### Pull Request Rules
- 📏 **PR title must follow conventional commits**
- 🏷️ **PR must be linked to an issue**
- 🔄 **Branch must be up-to-date** before merge
- 📊 **Coverage must be >70%**

### Merge Rules
- 🚫 **No force pushes** to protected branches
- 🔀 **Squash merges** preferred for main
- 📝 **Conventional commit messages** required

## Setup Instructions

### Via GitHub UI
1. Go to Repository Settings
2. Click "Branches" in left menu
3. Click "Add rule" for main branch
4. Configure the above requirements
5. Repeat for develop branch

### Via GitHub API
```bash
# Using GitHub CLI
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='["security-audit","lint-check","format-check","test-coverage","build-success"]' \
  --field required_pull_request_reviews='{"required_approving_review_count":2}' \
  --field enforce_admins=true \
  --field required_conversation_resolution=true \
  --field dismiss_stale_reviews=true \
  --field dismissal_restrictions={"users":[],"teams":[]} \
  --field require_last_push_approval=true \
  --field required_linear_history=true
```

## Status Check Implementation

### Security Audit Check
```yaml
# .github/workflows/security-audit.yml
name: Security Audit
on: [push, pull_request]
jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm audit --audit-level=high
```

### Lint Check
```yaml
# .github/workflows/lint.yml  
name: Code Quality
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
```

### Test Coverage
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

## Merge Strategies

### Main Branch
- 🔄 **Squash and merge** preferred
- 📝 **Conventional commit title** required
- 🔗 **Link to issue** in PR description
- ✅ **All checks must pass**

### Develop Branch  
- 🔄 **Create merge commit** preferred
- 📝 **Keep commit history** for feature branches
- 🔗 **Link to issue** in PR description
- ✅ **All checks must pass**

## Emergency Procedures

### Bypass Protection
```bash
# Emergency bypass (requires admin access)
git push --force-with-lease origin main
```

### Restore Protection
```bash
# Re-enable protection after emergency fix
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='["security-audit","lint-check","format-check","test-coverage","build-success"]' \
  --field required_pull_request_reviews='{"required_approving_review_count":2}'
```

---

**These rules ensure code quality, security, and proper review processes before merging to protected branches.**
