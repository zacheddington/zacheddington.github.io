// Main Server Entry Point
// Modular Express server with organized routes and middleware

const express = require('express');
const config = require('./config/environment');
const { applyMiddleware } = require('./config/middleware');
const { runDatabaseMigrations } = require('./database/migrations');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import route modules
const authRoutes = require('./routes/auth');
const healthRoutes = require('./routes/health');
const userRoutes = require('./routes/users');
const patientRoutes = require('./routes/patients');
const profileRoutes = require('./routes/profile');
const eegRoutes = require('./routes/eeg');
const twofaRoutes = require('./routes/twofa');

const app = express();

// Apply common middleware
applyMiddleware(app);

// Mount API routes
app.use('/api', authRoutes);
app.use('/api', healthRoutes);
app.use('/api', userRoutes);
app.use('/api', patientRoutes);
app.use('/api', profileRoutes);
app.use('/api', eegRoutes);
app.use('/api', twofaRoutes);

// 404 handler for unknown routes
app.use(notFoundHandler);

// Global error handling middleware (must be last)
app.use(errorHandler);

// Initialize database migrations before starting server
const startServer = async () => {
    try {
        console.log('Starting server initialization...');
        
        // Run database migrations
        await runDatabaseMigrations();
        
        // Start the server
        app.listen(config.PORT, () => {
            console.log(`🚀 Server running on port ${config.PORT}`);
            console.log(`📊 Environment: ${config.NODE_ENV}`);
            console.log(`🗄️  Database: ${config.isLocalTest ? 'Local Test Mode' : 'Connected'}`);
            console.log(`🔒 Security: ${config.isProduction ? 'Production' : 'Development'}`);
        });
        
    } catch (err) {
        console.error('❌ Failed to start server:', err.message);
        
        // Try to start server anyway for local development
        console.log('⚠️  Attempting to start server without database migrations...');
        app.listen(config.PORT, () => {
            console.log(`🚀 Server running on port ${config.PORT} (database migrations skipped)`);
            console.log(`📊 Environment: ${config.NODE_ENV}`);
            console.log(`⚠️  Database: Migration failed, some features may not work`);
        });
    }
};

// Graceful shutdown handling
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the server
startServer();

module.exports = app;
