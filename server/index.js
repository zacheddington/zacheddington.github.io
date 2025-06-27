// Main Server Entry Point
// Modular Express server with organized routes and middleware

const express = require('express');
const config = require('./config/environment');
const { applyMiddleware } = require('./config/middleware');
const { runDatabaseMigrations } = require('./database/migrations');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const SessionManager = require('./utils/sessionManager');

// Import route modules
const authRoutes = require('./routes/auth');
const healthRoutes = require('./routes/health');
const userRoutes = require('./routes/users');
const patientRoutes = require('./routes/patients');
const profileRoutes = require('./routes/profile');
const twofaRoutes = require('./routes/twofa');
const sessionRoutes = require('./routes/sessions');

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
app.use('/api', sessionRoutes);

// Debug: Log all registered routes
console.log('📋 Registered API routes:');
app._router.stack.forEach((middleware) => {
    if (middleware.route) {
        // routes registered directly on the app
        console.log(`   ${Object.keys(middleware.route.methods)} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
        // routes added as router middleware
        middleware.handle.stack.forEach((handler) => {
            if (handler.route) {
                console.log(`   ${Object.keys(handler.route.methods)} /api${handler.route.path}`);
            }
        });
    }
});

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

            // Clean up expired sessions on startup
            try {
                const cleanedCount =
                    await SessionManager.cleanupExpiredSessions();
                console.log(
                    `✅ Session cleanup completed (${cleanedCount} expired sessions removed)`
                );
            } catch (sessionErr) {
                console.warn('⚠️  Session cleanup failed:', sessionErr.message);
            }
        } else {
            console.error('❌ Database connection failed:', dbStatus.error);
            console.log('⚠️  Starting server without migrations...');
        } // Start the server
        app.listen(config.PORT, () => {
            console.log(`🚀 Server running on port ${config.PORT}`);
            console.log(`📊 Environment: ${config.NODE_ENV}`);
            console.log(
                `🗄️  Database: ${
                    dbStatus.connected ? 'Connected' : 'Connection Failed'
                }`
            );
            console.log(
                `🔒 Security: ${
                    config.isProduction ? 'Production' : 'Development'
                }`
            );

            // Set up periodic session cleanup (every hour)
            if (dbStatus.connected && !config.isLocalTest) {
                setInterval(async () => {
                    try {
                        await SessionManager.cleanupExpiredSessions();
                    } catch (err) {
                        console.warn(
                            'Periodic session cleanup failed:',
                            err.message
                        );
                    }
                }, 60 * 60 * 1000); // 1 hour
                console.log('🕒 Periodic session cleanup scheduled');
            }
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err.message);

        // Start server anyway for debugging
        console.log('⚠️  Starting server without database migrations...');
        app.listen(config.PORT, () => {
            console.log(
                `🚀 Server running on port ${config.PORT} (database migrations skipped)`
            );
            console.log(`📊 Environment: ${config.NODE_ENV}`);
            console.log(
                `⚠️  Database: Migration failed, some features may not work`
            );
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
