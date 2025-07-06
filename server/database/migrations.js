// Database Schema Documentation
// This file documents the expected database schema but does not create tables
// All tables are assumed to exist and are managed externally

const { pool } = require('../config/database');
const config = require('../config/environment');

// No-op migration function - all tables are managed externally
const runDatabaseMigrations = async () => {
    try {
        // Skip all migrations - tables are managed externally
        if (!config.DATABASE_URL || config.DATABASE_URL.includes('username')) {
            console.log('No database configuration found, skipping migrations');
            return;
        }

        console.log('Database migrations skipped - tables managed externally');
        console.log(
            'See docs/database-schema.md for expected table structures'
        );
    } catch (err) {
        console.error('Database connection error:', err.message);
        console.log('Continuing server startup without database check');
    }
};

module.exports = {
    runDatabaseMigrations,
};
