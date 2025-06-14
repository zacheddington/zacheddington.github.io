// Middleware Configuration
// Centralizes common middleware setup for the Express application

const express = require('express');
const cors = require('cors');
const config = require('./environment');

// Configure CORS middleware
const corsConfig = {
    origin: [
        config.CORS_ORIGIN,
        'https://indataentry.com',
        'https://integrisneuro-eec31e4aaab1.herokuapp.com',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 200,
};

// Security middleware to prevent caching of authenticated content
const securityMiddleware = (req, res, next) => {
    // Set cache control headers to prevent caching
    res.set(config.SECURITY_HEADERS);
    next();
};

// Apply all common middleware to Express app
const applyMiddleware = (app) => {
    // CORS configuration
    app.use(cors(corsConfig));

    // JSON parsing
    app.use(express.json());

    // Security headers
    app.use(securityMiddleware);

    // Serve static files from the current directory
    app.use(express.static('.'));

    console.log('Common middleware applied successfully');
};

module.exports = {
    corsConfig,
    securityMiddleware,
    applyMiddleware,
};
