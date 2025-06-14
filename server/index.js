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
app.use('/api', twofaRoutes);

// 404 handler for unknown routes
app.use(notFoundHandler);

// Global error handling middleware (must be last)
app.use(errorHandler);

// Initialize database migrations before starting server
const startServer = async () => {
    try {
        console.log('Starting server initialization...');

        // Test database connection first
        const { checkDatabaseConnection } = require('./config/database');
        const dbStatus = await checkDatabaseConnection();

        if (dbStatus.connected) {
            console.log('✅ Database connection successful');
            // Run database migrations
            await runDatabaseMigrations();
            console.log('✅ Database migrations completed');
        } else {
            console.error('❌ Database connection failed:', dbStatus.error);
            console.log('⚠️  Starting server without migrations...');
        }

        // Start the server
        app.listen(config.PORT, () => {
            console.log(`🚀 Server running on port ${config.PORT}`);
            console.log(`📊 Environment: ${config.NODE_ENV}`);
            console.log(
                `🗄️  Database: ${
                    config.isLocalTest
                        ? 'Local Test Mode'
                        : dbStatus.connected
                        ? 'Connected'
                        : 'Connection Failed'
                }`
            );
            console.log(
                `🔒 Security: ${
                    config.isProduction ? 'Production' : 'Development'
                }`
            );
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err.message);
        console.error('❌ Stack trace:', err.stack);

        // Try to start server anyway for debugging
        console.log(
            '⚠️  Attempting to start server without database migrations...'
        );
        try {
            app.listen(config.PORT, () => {
                console.log(
                    `🚀 Server running on port ${config.PORT} (database migrations skipped)`
                );
                console.log(`📊 Environment: ${config.NODE_ENV}`);
                console.log(
                    `⚠️  Database: Migration failed, some features may not work`
                );
            });
        } catch (serverErr) {
            console.error('💥 Cannot start server at all:', serverErr);
            process.exit(1);
        }
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
