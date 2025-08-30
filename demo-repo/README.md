# Vulnerable Todo App

This is a demo application with intentional security vulnerabilities and code quality issues.

## Issues Present:

1. **Security Issues:**
   - SQL Injection vulnerabilities
   - Hardcoded database credentials
   - Use of eval() function
   - No CORS protection
   - Outdated dependencies

2. **Performance Issues:**
   - Synchronous password hashing
   - Inefficient O(n²) array operations
   - No response compression
   - Memory leaks

3. **Maintainability Issues:**
   - Deeply nested conditional logic
   - No input validation
   - Poor error handling
   - Outdated dependencies

## Setup

```bash
npm install
npm start
```

**Warning:** This application is intentionally vulnerable. Do not use in production!