// Health Check Routes
// Server and database health monitoring endpoints

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkDatabaseConnection } = require('../config/database');
const { successResponse, serverErrorResponse } = require('../utils/responseHelpers');
const config = require('../config/environment');

// Authenticated health check endpoint for internal monitoring
router.get('/health', authenticateToken, async (req, res) => {
    try {
        const dbStatus = await checkDatabaseConnection();
        
        if (dbStatus.connected) {
            return successResponse(res, {
                status: 'healthy',
                database: 'connected'
            }, 'System is healthy');
        } else {
            return res.status(503).json({
                status: 'unhealthy',
                database: 'disconnected',
                error: 'Database connection failed',
                timestamp: new Date().toISOString()
            });
        }
    } catch (err) {
        console.error('Health check failed:', err);
        return serverErrorResponse(res, 'Health check failed');
    }
});

// Public health check endpoint for basic connectivity testing (no auth required)
router.get('/health/public', async (req, res) => {
    try {
        // Check if we're in local development mode without proper database
        if (config.isLocalTest) {
            // For local testing, just return success
            return successResponse(res, {
                status: 'healthy',
                database: 'local_test_mode'
            }, 'System is healthy (local test mode)');
        }
        
        const dbStatus = await checkDatabaseConnection();
        
        if (dbStatus.connected) {
            return successResponse(res, {
                status: 'healthy',
                database: 'connected'
            }, 'System is healthy');
        } else {
            return res.status(503).json({
                status: 'unhealthy',
                database: 'disconnected',
                error: 'Database connection failed',
                timestamp: new Date().toISOString()
            });
        }
    } catch (err) {
        console.error('Public health check failed:', err);
        return res.status(503).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: 'Database connection failed',
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
