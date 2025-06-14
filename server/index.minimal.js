// Minimal Server Entry Point - Emergency Recovery
// Simplified version to get the app running

const express = require('express');
const config = require('./config/environment');
const { applyMiddleware } = require('./config/middleware');
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

// Start the server without migrations (emergency mode)
const startServer = () => {
    try {
        app.listen(config.PORT, () => {
            console.log(
                `🚀 Server running on port ${config.PORT} (minimal mode)`
            );
            console.log(`📊 Environment: ${config.NODE_ENV}`);
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err.message);
        process.exit(1);
    }
};

// Start the server immediately
startServer();

module.exports = app;
