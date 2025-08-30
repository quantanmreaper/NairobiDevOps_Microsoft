import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

// Enable verbose mode for debugging
sqlite3.verbose();

let db: sqlite3.Database | null = null;

/**
 * Get database connection
 */
export function getDatabase(): sqlite3.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Initialize database connection and create tables
 */
export async function initializeDatabase(): Promise<void> {
  const dbPath = process.env.DATABASE_URL || './database.sqlite';
  
  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      
      console.log('Connected to SQLite database');
      createTables()
        .then(() => resolve())
        .catch(reject);
    });
  });
}

/**
 * Create database tables
 */
async function createTables(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const run = promisify(db.run.bind(db));

  try {
    // Users table
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        github_id TEXT UNIQUE,
        username TEXT NOT NULL,
        email TEXT,
        avatar_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sessions table
    await run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Repositories table
    await run(`
      CREATE TABLE IF NOT EXISTS repositories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        full_name TEXT NOT NULL,
        description TEXT,
        url TEXT NOT NULL,
        is_private BOOLEAN DEFAULT 0,
        language TEXT,
        stars INTEGER DEFAULT 0,
        forks INTEGER DEFAULT 0,
        last_commit DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Repository files table
    await run(`
      CREATE TABLE IF NOT EXISTS repo_files (
        id TEXT PRIMARY KEY,
        repository_id TEXT NOT NULL,
        path TEXT NOT NULL,
        content TEXT NOT NULL,
        language TEXT,
        size INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (repository_id) REFERENCES repositories (id) ON DELETE CASCADE,
        UNIQUE(repository_id, path)
      )
    `);

    // Analysis results table
    await run(`
      CREATE TABLE IF NOT EXISTS analysis_results (
        id TEXT PRIMARY KEY,
        repository_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('security', 'performance', 'maintainability', 'bugs', 'dependencies')),
        severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        file_path TEXT NOT NULL,
        line_number INTEGER,
        suggestion TEXT NOT NULL,
        fix_code TEXT,
        confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (repository_id) REFERENCES repositories (id) ON DELETE CASCADE
      )
    `);

    // Chat messages table
    await run(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        repository_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        metadata TEXT, -- JSON string
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (repository_id) REFERENCES repositories (id) ON DELETE CASCADE
      )
    `);

    // Text chunks table for RAG
    await run(`
      CREATE TABLE IF NOT EXISTS text_chunks (
        id TEXT PRIMARY KEY,
        repository_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding TEXT, -- JSON array of numbers
        metadata TEXT, -- JSON string
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (repository_id) REFERENCES repositories (id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    await run('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions (token)');
    await run('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_repositories_user_id ON repositories (user_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_repo_files_repository_id ON repo_files (repository_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_analysis_results_repository_id ON analysis_results (repository_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_analysis_results_type ON analysis_results (type)');
    await run('CREATE INDEX IF NOT EXISTS idx_analysis_results_severity ON analysis_results (severity)');
    await run('CREATE INDEX IF NOT EXISTS idx_chat_messages_repository_id ON chat_messages (repository_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_text_chunks_repository_id ON text_chunks (repository_id)');

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
}

/**
 * Close database connection
 */
export function closeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }

    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
        reject(err);
        return;
      }
      
      console.log('Database connection closed');
      db = null;
      resolve();
    });
  });
}

/**
 * Execute a query with parameters
 */
export function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Database query error:', err);
        reject(err);
        return;
      }
      resolve(rows as T[]);
    });
  });
}

/**
 * Execute a query and return the first row
 */
export function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    db.get(sql, params, (err, row) => {
      if (err) {
        console.error('Database query error:', err);
        reject(err);
        return;
      }
      resolve(row as T || null);
    });
  });
}

/**
 * Execute an insert/update/delete query
 */
export function execute(sql: string, params: any[] = []): Promise<{ lastID?: number; changes: number }> {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    db.run(sql, params, function(err) {
      if (err) {
        console.error('Database execute error:', err);
        reject(err);
        return;
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Begin a transaction
 */
export function beginTransaction(): Promise<void> {
  return execute('BEGIN TRANSACTION').then(() => {});
}

/**
 * Commit a transaction
 */
export function commitTransaction(): Promise<void> {
  return execute('COMMIT').then(() => {});
}

/**
 * Rollback a transaction
 */
export function rollbackTransaction(): Promise<void> {
  return execute('ROLLBACK').then(() => {});
}