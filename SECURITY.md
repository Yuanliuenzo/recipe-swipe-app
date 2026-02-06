# 🔒 Security & Development Guide

This document outlines the security measures, development workflow, and best practices implemented for the Recipe Swipe App.

## 🛡️ Security Implementation

### 1. Input Validation & Sanitization
```javascript
// Server-side validation using express-validator
const { body, validationResult } = require('express-validator');

// Username validation
app.post("/set-profile", (req, res) => {
    const { username } = req.body;
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
        return res.status(400).json({ error: "Invalid username" });
    }
    const clean = username.trim().slice(0, 30); // Length limit
    // ... rest of validation
});
```

### 2. Security Headers (Helmet.js)
```javascript
const helmet = require('helmet');
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "http://127.0.0.1:11434"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));
```

### 3. Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', limiter);
```

### 4. Cookie Security
```javascript
res.cookie('profile', clean, { 
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true, // Prevent XSS
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict' // CSRF protection
});
```

### 5. Environment Variables
```bash
# .env.example - NEVER commit actual .env file
NODE_ENV=development
PORT=3000
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=mistral:latest
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🔧 Development Workflow

### 1. Pre-commit Hooks (Husky)
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  }
}
```

### 2. Code Quality Tools

#### ESLint Configuration
```json
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "plugin:security/recommended",
    "plugin:html/recommended",
    "prettier"
  ],
  "rules": {
    "security/detect-object-injection": "error",
    "security/detect-non-literal-regexp": "error",
    "security/detect-unsafe-regex": "error",
    "no-console": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

#### Prettier Configuration
```json
// .prettierrc.json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true
}
```

### 3. Testing Strategy

#### Security Tests
```javascript
// tests/security.test.js
describe('API Security Tests', () => {
  it('should reject XSS attempts', async () => {
    const xssPayload = {
      username: '<script>alert("xss")</script>'
    };
    const response = await request
      .post('/set-profile')
      .send(xssPayload)
      .expect(400);
    expect(response.body.error).toBeDefined();
  });

  it('should require authentication for protected routes', async () => {
    await request.get('/api/me').expect(401);
    await request.get('/api/favorites').expect(401);
  });
});
```

#### Coverage Requirements
- **Branches**: 70% minimum
- **Functions**: 70% minimum
- **Lines**: 70% minimum
- **Statements**: 70% minimum

## 🚀 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm audit --audit-level=high

  lint-and-format:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

## 🌿 Git Best Practices

### 1. Branch Protection
```bash
# Configure in GitHub repository settings:
main branch:
- Require pull request reviews before merging
- Require 2 approving reviewers
- Require status checks to pass before merging
- Include administrators

develop branch:
- Require pull request reviews before merging
- Require 1 approving reviewer
```

### 2. Commit Message Standards
```bash
# Conventional commits (enforced by commitlint)
feat: add mobile navigation FAB
fix: resolve cookie parsing issue
docs: update security documentation
style: format code with prettier
refactor: optimize recipe generation
test: add security tests
chore: update dependencies
security: fix XSS vulnerability
```

### 3. .gitignore Configuration
```gitignore
# Security - never commit secrets
.env
.env.local
.env.*.local

# Dependencies
node_modules/
npm-debug.log*

# Development
coverage/
.nyc_output
.eslintcache

# OS
.DS_Store
Thumbs.db
```

## 📱 Mobile Security Considerations

### 1. Touch Security
```javascript
// Prevent touch hijacking
card.addEventListener('touchstart', (e) => {
    if (!e.isTrusted) return; // Ignore synthetic events
    // Validate touch coordinates
    if (e.touches.length > 1) return; // Ignore multi-touch
});

// Prevent zoom on double-tap
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
```

### 2. Local Storage Security
```javascript
// Validate data before storing
function saveUserData(data) {
    if (!data || typeof data !== 'object') return;
    
    // Sanitize and validate
    const cleanData = {
        username: sanitizeString(data.username),
        preferences: sanitizeObject(data.preferences)
    };
    
    localStorage.setItem('userPrefs', JSON.stringify(cleanData));
}
```

## 🔍 Monitoring & Logging

### 1. Security Event Logging
```javascript
// Log all authentication attempts
app.use((req, res, next) => {
    if (req.path === '/set-profile' || req.path.startsWith('/api/')) {
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            method: req.method,
            path: req.path,
            success: res.statusCode < 400
        }));
    }
    next();
});
```

### 2. Error Handling
```javascript
// Prevent information leakage in error messages
app.use((err, req, res, next) => {
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        path: req.path
    });
    
    // Generic error for production
    if (process.env.NODE_ENV === 'production') {
        res.status(500).json({ error: 'Internal server error' });
    } else {
        res.status(500).json({ 
            error: err.message,
            stack: err.stack 
        });
    }
});
```

## 🚀 Production Deployment

### 1. Environment Setup
```bash
# Production environment variables
export NODE_ENV=production
export PORT=3000
export SESSION_SECRET=$(openssl rand -base64 32)
export CORS_ORIGIN=https://yourdomain.com
```

### 2. Reverse Proxy Configuration (Nginx)
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. SSL/TLS Configuration
```bash
# Generate SSL certificate
certbot --nginx -d yourdomain.com

# Configure automatic renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

## 📋 Security Checklist

### Development Phase
- [ ] Environment variables configured
- [ ] ESLint security rules enabled
- [ ] Pre-commit hooks working
- [ ] Tests passing with coverage
- [ ] Dependencies audited
- [ ] No secrets in code

### Production Phase
- [ ] HTTPS enabled with valid certificates
- [ ] Security headers configured
- [ ] Rate limiting active
- [ ] Input validation implemented
- [ ] Error handling secure
- [ ] Logging enabled
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] Security scanning automated

## 🆘 Incident Response

### 1. Security Incident Process
1. **Detection**: Monitor logs and alerts
2. **Assessment**: Evaluate impact and scope
3. **Containment**: Isolate affected systems
4. **Eradication**: Remove vulnerability
5. **Recovery**: Restore services
6. **Lessons**: Document and improve

### 2. Contact Information
- **Security Team**: security@yourdomain.com
- **Emergency Contact**: +1-xxx-xxx-xxxx
- **GitHub Security**: Report via GitHub's security advisory

---

**This security guide should be reviewed and updated regularly to address new threats and vulnerabilities.**
