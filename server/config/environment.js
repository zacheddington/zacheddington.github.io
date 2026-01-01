// Environment Configuration
// Centralizes environment detection and configuration settings

require("dotenv").config();

// Detect if running locally or in production
const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.DATABASE_URL?.includes("herokuapp");
const NODE_ENV = process.env.NODE_ENV || "development";

const config = {
  // Environment settings
  NODE_ENV,
  isProduction,

  // Server configuration
  PORT: process.env.PORT || 3000,

  // Security configuration
  JWT_SECRET:
    process.env.JWT_SECRET ||
    (NODE_ENV === "development"
      ? "dev-secret-key-change-in-production"
      : undefined),

  // Database configuration
  DATABASE_URL: process.env.DATABASE_URL,

  // CORS configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || "https://indataentry.com",

  // Security headers - enhanced for production security
  SECURITY_HEADERS: {
    // Cache control - prevent caching of authenticated content
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",

    // Prevent clickjacking attacks
    "X-Frame-Options": "DENY",

    // Prevent MIME type sniffing
    "X-Content-Type-Options": "nosniff",

    // Referrer policy for privacy
    "Referrer-Policy": "strict-origin-when-cross-origin",

    // XSS protection (legacy but still useful)
    "X-XSS-Protection": "1; mode=block",

    // Prevent DNS prefetching to protect privacy
    "X-DNS-Prefetch-Control": "off",

    // Only allow HTTPS in production
    ...(isProduction && {
      "Strict-Transport-Security":
        "max-age=31536000; includeSubDomains; preload",
    }),

    // Content Security Policy
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://integrisneuro-eec31e4aaab1.herokuapp.com",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
    ].join("; "),

    // Permissions policy (formerly Feature-Policy)
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  },

  // Rate limiting configuration
  RATE_LIMIT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    loginMax: 5, // Limit login attempts to 5 per window
    loginWindowMs: 15 * 60 * 1000, // 15 minutes for login
  },
};

// Validation - ensure required environment variables are present
if (!config.JWT_SECRET) {
  console.error(
    "FATAL: JWT_SECRET environment variable is required for production"
  );
  if (config.NODE_ENV === "production") {
    process.exit(1);
  } else {
    console.warn(
      "WARNING: Using default JWT_SECRET for development. Set JWT_SECRET environment variable for production."
    );
  }
}

module.exports = config;
