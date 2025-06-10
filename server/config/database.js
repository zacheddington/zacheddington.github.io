// Database Configuration
// Centralizes database connection pool setup and management

const { Pool } = require('pg');
const config = require('./environment');

// Create database connection pool
const pool = new Pool({
    connectionString: config.DATABASE_URL,
    ssl: config.isProduction ? {
        rejectUnauthorized: false
    } : false
});

// Database connection health check
const checkDatabaseConnection = async () => {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        return { connected: true, status: 'healthy' };
    } catch (error) {
        console.error('Database connection failed:', error);
        return { connected: false, status: 'unhealthy', error: error.message };
    }
};

// Graceful shutdown handler
const closeDatabaseConnection = async () => {
    try {
        await pool.end();
        console.log('Database connection pool closed');
    } catch (error) {
        console.error('Error closing database connection:', error);
    }
};

// Handle process termination
process.on('SIGINT', async () => {
    console.log('Received SIGINT, closing database connection...');
    await closeDatabaseConnection();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, closing database connection...');
    await closeDatabaseConnection();
    process.exit(0);
});

module.exports = {
    pool,
    checkDatabaseConnection,
    closeDatabaseConnection
};
