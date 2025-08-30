#!/usr/bin/env node

import { initializeDatabase, closeDatabase, execute, query } from './connection';
import { generateId } from '@repo-guardian/shared';

/**
 * Demo repository data with intentional issues
 */
const demoRepoData = {
  name: 'vulnerable-todo-app',
  fullName: 'demo/vulnerable-todo-app',
  description: 'A demo todo app with intentional security and code quality issues',
  url: 'https://github.com/demo/vulnerable-todo-app',
  language: 'JavaScript',
  files: [
    {
      path: 'package.json',
      content: `{
  "name": "vulnerable-todo-app",
  "version": "1.0.0",
  "description": "A todo app with security issues",
  "main": "server.js",
  "dependencies": {
    "express": "4.16.0",
    "lodash": "4.17.4",
    "mysql": "2.15.0",
    "bcrypt": "3.0.0"
  },
  "scripts": {
    "start": "node server.js"
  }
}`,
      language: 'json'
    },
    {
      path: 'server.js',
      content: `const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const app = express();

// Vulnerable: Using outdated Express version
app.use(express.json());

// Vulnerable: Database connection with hardcoded credentials
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password123',
  database: 'todoapp'
});

// Vulnerable: SQL Injection
app.get('/todos/:userId', (req, res) => {
  const userId = req.params.userId;
  const query = "SELECT * FROM todos WHERE user_id = " + userId;
  db.query(query, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

// Vulnerable: No input validation
app.post('/todos', (req, res) => {
  const { title, description, userId } = req.body;
  const query = \`INSERT INTO todos (title, description, user_id) VALUES ('\${title}', '\${description}', \${userId})\`;
  db.query(query, (err, result) => {
    if (err) throw err;
    res.json({ id: result.insertId, message: 'Todo created' });
  });
});

// Performance issue: Synchronous password hashing
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // Vulnerable: Synchronous operation blocking event loop
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  // Vulnerable: SQL injection
  const query = \`SELECT * FROM users WHERE username = '\${username}' AND password = '\${hashedPassword}'\`;
  db.query(query, (err, results) => {
    if (err) throw err;
    if (results.length > 0) {
      res.json({ success: true, user: results[0] });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  });
});

// Security issue: No CORS protection
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  next();
});

// Performance issue: No compression
app.listen(3000, () => {
  console.log('Server running on port 3000');
});`,
      language: 'javascript'
    },
    {
      path: 'utils.js',
      content: `const _ = require('lodash');

// Performance issue: Inefficient array operations
function processLargeArray(items) {
  let result = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < items.length; j++) {
      if (items[i].id === items[j].parentId) {
        result.push(items[i]);
      }
    }
  }
  return result;
}

// Security issue: eval usage
function executeUserCode(code) {
  return eval(code);
}

// Maintainability issue: Deeply nested code
function validateUser(user) {
  if (user) {
    if (user.name) {
      if (user.name.length > 0) {
        if (user.email) {
          if (user.email.includes('@')) {
            if (user.age) {
              if (user.age > 0) {
                if (user.age < 120) {
                  return true;
                }
              }
            }
          }
        }
      }
    }
  }
  return false;
}

// Bug: Memory leak with event listeners
function setupEventListeners() {
  setInterval(() => {
    document.addEventListener('click', function handler() {
      console.log('Click detected');
      // Handler is never removed, causing memory leak
    });
  }, 1000);
}

module.exports = {
  processLargeArray,
  executeUserCode,
  validateUser,
  setupEventListeners
};`,
      language: 'javascript'
    },
    {
      path: 'README.md',
      content: `# Vulnerable Todo App

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

\`\`\`bash
npm install
npm start
\`\`\`

**Warning:** This application is intentionally vulnerable. Do not use in production!`,
      language: 'markdown'
    }
  ]
};

/**
 * Seed database with demo data
 */
async function seed() {
  try {
    console.log('Starting database seeding...');
    
    await initializeDatabase();

    // Check if demo data already exists
    const existingRepo = await query(
      'SELECT id FROM repositories WHERE name = ?',
      [demoRepoData.name]
    );

    if (existingRepo.length > 0) {
      console.log('Demo data already exists, skipping seed');
      await closeDatabase();
      return;
    }

    // Create demo user
    const demoUserId = generateId();
    await execute(`
      INSERT INTO users (id, username, email, avatar_url)
      VALUES (?, ?, ?, ?)
    `, [
      demoUserId,
      'demo-user',
      'demo@example.com',
      'https://github.com/identicons/demo-user.png'
    ]);

    // Create demo repository
    const demoRepoId = generateId();
    await execute(`
      INSERT INTO repositories (id, user_id, name, full_name, description, url, language, stars, forks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      demoRepoId,
      demoUserId,
      demoRepoData.name,
      demoRepoData.fullName,
      demoRepoData.description,
      demoRepoData.url,
      demoRepoData.language,
      42,
      7
    ]);

    // Add demo files
    for (const file of demoRepoData.files) {
      const fileId = generateId();
      await execute(`
        INSERT INTO repo_files (id, repository_id, path, content, language, size)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        fileId,
        demoRepoId,
        file.path,
        file.content,
        file.language,
        file.content.length
      ]);
    }

    // Add demo analysis results
    const analysisResults = [
      {
        type: 'security',
        severity: 'critical',
        title: 'SQL Injection Vulnerability',
        description: 'Direct string concatenation in SQL query allows SQL injection attacks',
        filePath: 'server.js',
        lineNumber: 17,
        suggestion: 'Use parameterized queries or prepared statements to prevent SQL injection',
        fixCode: 'const query = "SELECT * FROM todos WHERE user_id = ?"; db.query(query, [userId], (err, results) => {',
        confidence: 0.95
      },
      {
        type: 'security',
        severity: 'high',
        title: 'Hardcoded Database Credentials',
        description: 'Database credentials are hardcoded in the source code',
        filePath: 'server.js',
        lineNumber: 8,
        suggestion: 'Use environment variables to store sensitive configuration',
        fixCode: 'const db = mysql.createConnection({\n  host: process.env.DB_HOST,\n  user: process.env.DB_USER,\n  password: process.env.DB_PASSWORD,\n  database: process.env.DB_NAME\n});',
        confidence: 1.0
      },
      {
        type: 'security',
        severity: 'critical',
        title: 'Code Injection via eval()',
        description: 'Using eval() with user input allows arbitrary code execution',
        filePath: 'utils.js',
        lineNumber: 14,
        suggestion: 'Never use eval() with user input. Use safer alternatives like JSON.parse() for data',
        fixCode: '// Remove eval() usage entirely or use safer alternatives\n// For JSON: JSON.parse(code)\n// For math expressions: use a math expression parser library',
        confidence: 1.0
      },
      {
        type: 'performance',
        severity: 'high',
        title: 'Synchronous Password Hashing',
        description: 'Synchronous bcrypt operations block the event loop',
        filePath: 'server.js',
        lineNumber: 35,
        suggestion: 'Use asynchronous bcrypt operations to avoid blocking the event loop',
        fixCode: 'bcrypt.hash(password, 10, (err, hashedPassword) => {\n  if (err) throw err;\n  // Continue with hashed password\n});',
        confidence: 0.9
      },
      {
        type: 'performance',
        severity: 'medium',
        title: 'Inefficient O(n²) Algorithm',
        description: 'Nested loops create quadratic time complexity for array processing',
        filePath: 'utils.js',
        lineNumber: 4,
        suggestion: 'Use a hash map or Set for O(n) lookup instead of nested loops',
        fixCode: 'function processLargeArray(items) {\n  const parentMap = new Map();\n  items.forEach(item => {\n    if (!parentMap.has(item.parentId)) {\n      parentMap.set(item.parentId, []);\n    }\n    parentMap.get(item.parentId).push(item);\n  });\n  return items.filter(item => parentMap.has(item.id));\n}',
        confidence: 0.85
      },
      {
        type: 'maintainability',
        severity: 'medium',
        title: 'Deeply Nested Conditional Logic',
        description: 'Excessive nesting makes code hard to read and maintain',
        filePath: 'utils.js',
        lineNumber: 19,
        suggestion: 'Use early returns and guard clauses to reduce nesting',
        fixCode: 'function validateUser(user) {\n  if (!user || !user.name || user.name.length === 0) return false;\n  if (!user.email || !user.email.includes(\'@\')) return false;\n  if (!user.age || user.age <= 0 || user.age >= 120) return false;\n  return true;\n}',
        confidence: 0.8
      },
      {
        type: 'bugs',
        severity: 'high',
        title: 'Memory Leak in Event Listeners',
        description: 'Event listeners are added repeatedly without being removed',
        filePath: 'utils.js',
        lineNumber: 37,
        suggestion: 'Remove event listeners when no longer needed or use a single listener',
        fixCode: 'function setupEventListeners() {\n  let clickHandler = function() {\n    console.log(\'Click detected\');\n  };\n  \n  document.addEventListener(\'click\', clickHandler);\n  \n  // Return cleanup function\n  return () => document.removeEventListener(\'click\', clickHandler);\n}',
        confidence: 0.9
      },
      {
        type: 'dependencies',
        severity: 'high',
        title: 'Outdated Dependencies with Known Vulnerabilities',
        description: 'Multiple dependencies are outdated and contain known security vulnerabilities',
        filePath: 'package.json',
        lineNumber: 6,
        suggestion: 'Update all dependencies to their latest secure versions',
        fixCode: '{\n  "express": "^4.18.2",\n  "lodash": "^4.17.21",\n  "mysql2": "^3.6.0",\n  "bcrypt": "^5.1.0"\n}',
        confidence: 1.0
      }
    ];

    for (const result of analysisResults) {
      const resultId = generateId();
      await execute(`
        INSERT INTO analysis_results (
          id, repository_id, type, severity, title, description, 
          file_path, line_number, suggestion, fix_code, confidence
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        resultId,
        demoRepoId,
        result.type,
        result.severity,
        result.title,
        result.description,
        result.filePath,
        result.lineNumber,
        result.suggestion,
        result.fixCode,
        result.confidence
      ]);
    }

    // Add demo chat messages
    const chatMessages = [
      {
        role: 'user',
        content: 'What are the main security issues in this repository?'
      },
      {
        role: 'assistant',
        content: 'I found several critical security issues in your repository:\n\n1. **SQL Injection** in server.js - Your database queries use string concatenation which allows attackers to inject malicious SQL\n2. **Hardcoded credentials** - Database passwords are stored directly in the code\n3. **Code injection** via eval() in utils.js - This allows arbitrary code execution\n\nI recommend fixing the SQL injection issues first as they pose the highest risk.'
      },
      {
        role: 'user',
        content: 'How can I fix the SQL injection vulnerability?'
      },
      {
        role: 'assistant',
        content: 'To fix the SQL injection vulnerability, replace string concatenation with parameterized queries:\n\n**Before:**\n```javascript\nconst query = "SELECT * FROM todos WHERE user_id = " + userId;\n```\n\n**After:**\n```javascript\nconst query = "SELECT * FROM todos WHERE user_id = ?";\ndb.query(query, [userId], (err, results) => {\n  // Handle results\n});\n```\n\nThis ensures user input is properly escaped and prevents SQL injection attacks.'
      }
    ];

    for (const message of chatMessages) {
      const messageId = generateId();
      await execute(`
        INSERT INTO chat_messages (id, repository_id, role, content)
        VALUES (?, ?, ?, ?)
      `, [
        messageId,
        demoRepoId,
        message.role,
        message.content
      ]);
    }

    // Add text chunks for RAG
    for (const file of demoRepoData.files) {
      // Split file content into chunks for RAG
      const chunks = file.content.split('\n\n').filter(chunk => chunk.trim().length > 0);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunkId = generateId();
        await execute(`
          INSERT INTO text_chunks (id, repository_id, file_path, content, metadata)
          VALUES (?, ?, ?, ?, ?)
        `, [
          chunkId,
          demoRepoId,
          file.path,
          chunks[i].trim(),
          JSON.stringify({ chunkIndex: i, totalChunks: chunks.length })
        ]);
      }
    }

    console.log('✅ Database seeded successfully with demo data');
    console.log(`📁 Demo repository: ${demoRepoData.fullName}`);
    console.log(`🔍 Analysis results: ${analysisResults.length} issues found`);
    console.log(`💬 Chat messages: ${chatMessages.length} messages`);
    
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seed();
}