const express = require('express');
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
  const query = `INSERT INTO todos (title, description, user_id) VALUES ('${title}', '${description}', ${userId})`;
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
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${hashedPassword}'`;
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
});