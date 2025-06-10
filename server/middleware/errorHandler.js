// Centralized Error Handling Middleware
// Provides consistent error responses and logging

const config = require('../config/environment');

// Custom error class for application-specific errors
class AppError extends Error {
    constructor(message, statusCode = 500, code = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
    }
}

// Database error handler
const handleDatabaseError = (err) => {
    console.error('Database error:', err);
    
    // PostgreSQL specific error codes
    switch (err.code) {
        case '23505': // Unique constraint violation
            if (err.constraint?.includes('username')) {
                return new AppError('Username already exists. Please choose a different username.', 400);
            } else if (err.constraint?.includes('email')) {
                return new AppError('Email address is already in use by another account.', 400);
            } else {
                return new AppError('A record with this information already exists.', 400);
            }
        case '23503': // Foreign key constraint violation
            return new AppError('Invalid reference. Please check your input.', 400);
        case '23514': // Check constraint violation
            return new AppError('Invalid data format. Please check your input.', 400);
        case '08003': // Connection does not exist
        case '08006': // Connection failure
            return new AppError('Database connection lost. Please try again.', 503);
        default:
            return new AppError('Database operation failed. Please try again.', 500);
    }
};

// Global error handling middleware
const errorHandler = (err, req, res, next) => {
    let error = err;
    
    // Handle database errors
    if (err.code && (err.code.startsWith('23') || err.code.startsWith('08'))) {
        error = handleDatabaseError(err);
    }
    
    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        error = new AppError('Invalid token', 401);
    }
    
    if (err.name === 'TokenExpiredError') {
        error = new AppError('Token expired', 401);
    }
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
        error = new AppError('Validation failed', 400);
    }
    
    // Default to AppError if not already
    if (!error.isOperational) {
        error = new AppError('Something went wrong', 500);
    }
    
    // Log error for debugging
    if (error.statusCode >= 500) {
        console.error('Server Error:', {
            message: error.message,
            stack: error.stack,
            url: req.url,
            method: req.method,
            user: req.user?.username || 'anonymous',
            timestamp: new Date().toISOString()
        });
    }
    
    // Send error response
    res.status(error.statusCode).json({
        error: error.message,
        details: config.NODE_ENV === 'development' ? error.stack : undefined
    });
};

// 404 handler for unknown routes
const notFoundHandler = (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.path,
        method: req.method
    });
};

module.exports = {
    AppError,
    errorHandler,
    notFoundHandler,
    handleDatabaseError
};
