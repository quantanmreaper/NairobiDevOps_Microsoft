#!/usr/bin/env node

import { initializeDatabase, closeDatabase } from './connection';

/**
 * Run database migrations
 */
async function migrate() {
  try {
    console.log('Starting database migration...');
    
    await initializeDatabase();
    console.log('✅ Database migration completed successfully');
    
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrate();
}