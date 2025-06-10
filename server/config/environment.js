// Environment Configuration
// Centralizes environment detection and configuration settings

require('dotenv').config();

// Detect if running locally or in production
const isProduction = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('herokuapp');
const isLocalTest = process.env.NODE_ENV === 'development' && process.env.DATABASE_URL?.includes('localhost');
const NODE_ENV = process.env.NODE_ENV || 'development';

const config = {
    // Environment settings
    NODE_ENV,
    isProduction,
    isLocalTest,
      // Server configuration
    PORT: process.env.PORT || 3000,
      // Security configuration
    JWT_SECRET: process.env.JWT_SECRET || (NODE_ENV === 'development' ? 'dev-secret-key-change-in-production' : undefined),
    
    // Database configuration
    DATABASE_URL: process.env.DATABASE_URL,
    
    // CORS configuration
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://indataentry.com',
    
    // Security headers
    SECURITY_HEADERS: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
};

// Validation - ensure required environment variables are present
if (!config.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is required for production');
    if (config.NODE_ENV === 'production') {
        process.exit(1);
    } else {
        console.warn('WARNING: Using default JWT_SECRET for development. Set JWT_SECRET environment variable for production.');
    }
}

module.exports = config;
