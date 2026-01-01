// Middleware Configuration
// Centralizes common middleware setup for the Express application

const express = require("express");
const cors = require("cors");
const config = require("./environment");

// Configure CORS middleware
const corsConfig = {
  origin: [
    "https://indataentry.com",
    "https://integrisneuro-eec31e4aaab1.herokuapp.com",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  preflightContinue: false,
  optionsSuccessStatus: 200,
};

// HTTPS enforcement middleware for production
// Redirects HTTP requests to HTTPS
const httpsEnforcement = (req, res, next) => {
  // Check if we're in production and request is not secure
  // Heroku sets x-forwarded-proto header
  if (
    config.isProduction &&
    req.headers["x-forwarded-proto"] !== "https" &&
    req.headers["x-forwarded-proto"] !== undefined
  ) {
    // Redirect to HTTPS
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
};

// Security middleware to apply security headers
const securityMiddleware = (req, res, next) => {
  // Set all security headers from config
  res.set(config.SECURITY_HEADERS);
  next();
};

// Request sanitization middleware
// Helps prevent common injection attacks
const sanitizationMiddleware = (req, res, next) => {
  // Remove null bytes from request body (common injection technique)
  if (req.body && typeof req.body === "object") {
    sanitizeObject(req.body);
  }
  next();
};

// Helper function to recursively sanitize object properties
const sanitizeObject = (obj) => {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (typeof obj[key] === "string") {
        // Remove null bytes
        obj[key] = obj[key].replace(/\0/g, "");
        // Trim whitespace
        obj[key] = obj[key].trim();
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  }
};

// Rate limiting - simple in-memory implementation
// For production scale, use Redis-backed rate limiting
const rateLimitStore = new Map();

const createRateLimiter = (windowMs, maxRequests, keyGenerator) => {
  return (req, res, next) => {
    const key = keyGenerator ? keyGenerator(req) : req.ip;
    const now = Date.now();

    // Clean up old entries
    for (const [storedKey, data] of rateLimitStore.entries()) {
      if (now - data.startTime > windowMs) {
        rateLimitStore.delete(storedKey);
      }
    }

    const record = rateLimitStore.get(key);

    if (!record) {
      rateLimitStore.set(key, { count: 1, startTime: now });
      return next();
    }

    if (now - record.startTime > windowMs) {
      // Window expired, reset
      rateLimitStore.set(key, { count: 1, startTime: now });
      return next();
    }

    if (record.count >= maxRequests) {
      // Rate limit exceeded
      res.set(
        "Retry-After",
        Math.ceil((windowMs - (now - record.startTime)) / 1000)
      );
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
      });
    }

    record.count++;
    next();
  };
};

// General API rate limiter
const generalRateLimiter = createRateLimiter(
  config.RATE_LIMIT.windowMs,
  config.RATE_LIMIT.max,
  (req) => req.ip
);

// Strict rate limiter for login and sensitive endpoints
const loginRateLimiter = createRateLimiter(
  config.RATE_LIMIT.loginWindowMs,
  config.RATE_LIMIT.loginMax,
  (req) => `login:${req.ip}:${req.body?.username || ""}`
);

// Apply all common middleware to Express app
const applyMiddleware = (app) => {
  // Trust proxy for Heroku (needed for accurate IP detection and HTTPS redirect)
  if (config.isProduction) {
    app.set("trust proxy", 1);
  }

  // HTTPS enforcement (must be first)
  app.use(httpsEnforcement);

  // CORS configuration
  app.use(cors(corsConfig));

  // JSON parsing with size limit
  app.use(express.json({ limit: "10kb" }));

  // Request sanitization
  app.use(sanitizationMiddleware);

  // Security headers
  app.use(securityMiddleware);

  // General rate limiting for all requests
  app.use("/api/", generalRateLimiter);

  // Serve static files from the current directory
  app.use(express.static("."));

  console.log("Common middleware applied successfully");
  if (config.isProduction) {
    console.log(
      "Production security measures enabled: HTTPS enforcement, rate limiting"
    );
  }
};

module.exports = {
  corsConfig,
  securityMiddleware,
  httpsEnforcement,
  sanitizationMiddleware,
  generalRateLimiter,
  loginRateLimiter,
  applyMiddleware,
};
