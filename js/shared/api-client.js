/**
 * API Client Utility
 * Handles API communications, connectivity checks, and token validation
 * @module api-client
 */

/**
 * Gets the correct API URL based on the current environment
 * @returns {string} The API base URL
 */
function getAPIUrl() {
  // Check if we're running on localhost/development
  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "";

  // For production (GitHub Pages with custom domain)
  if (window.location.hostname === "indataentry.com") {
    return "https://integrisneuro-eec31e4aaab1.herokuapp.com";
  }

  // Default to production API for any other domain
  return isLocal
    ? "http://localhost:3000"
    : "https://integrisneuro-eec31e4aaab1.herokuapp.com";
}

/**
 * Checks network connectivity and database health
 * @async
 * @returns {Promise<{connected: boolean, success: boolean, status: string, database?: string, error?: string, message: string}>}
 */
async function checkConnectivity() {
  try {
    const API_URL = getAPIUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${API_URL}/api/health/public`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
    });

    clearTimeout(timeoutId);
    if (response.ok) {
      const result = await response.json();
      return {
        connected: true,
        success: true,
        status: result.data?.status || "unknown",
        database: result.data?.database || "unknown",
        message: result.message || "Connected successfully",
      };
    } else {
      return {
        connected: false,
        success: false,
        status: "error",
        error: `API returned ${response.status}: ${response.statusText}`,
        message: `API returned ${response.status}: ${response.statusText}`,
      };
    }
  } catch (error) {
    if (error.name === "AbortError") {
      return {
        connected: false,
        success: false,
        status: "timeout",
        error: "Connection timeout - server may be sleeping",
        message: "Connection timeout - server may be sleeping",
      };
    }
    return {
      connected: false,
      success: false,
      status: "error",
      error: error.message || "Connection failed",
      message: error.message || "Connection failed",
    };
  }
}

/**
 * Validates an authentication token with the server
 * @async
 * @param {string} token - The JWT token to validate
 * @returns {Promise<{valid: boolean, user: Object|null}>}
 */
async function validateToken(token) {
  try {
    const API_URL = getAPIUrl();
    const response = await fetch(`${API_URL}/api/auth/validate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const result = await response.json();
      return {
        valid: true,
        user: result.data?.user || null,
      };
    } else {
      return {
        valid: false,
        user: null,
      };
    }
  } catch (error) {
    console.error("Token validation error:", error);
    return {
      valid: false,
      user: null,
    };
  }
}

/**
 * Generic API request wrapper with automatic error handling, authentication, and timeout
 * @async
 * @param {string} endpoint - The API endpoint (e.g., '/api/users')
 * @param {Object} [options={}] - Fetch options (method, headers, body, etc.)
 * @param {number} [options.timeout=30000] - Request timeout in milliseconds (default 30s)
 * @returns {Promise<Object>} The parsed JSON response
 * @throws {Error} If the request fails or times out
 */
async function apiRequest(endpoint, options = {}) {
  const { timeout = 30000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const API_URL = getAPIUrl();
    const url = `${API_URL}${endpoint}`;

    const defaultOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    };

    // Add auth token if available
    const token = localStorage.getItem("token");
    if (token) {
      defaultOptions.headers["Authorization"] = `Bearer ${token}`;
    }

    const finalOptions = {
      ...defaultOptions,
      ...fetchOptions,
      headers: {
        ...defaultOptions.headers,
        ...fetchOptions.headers,
      },
    };

    const response = await fetch(url, finalOptions);
    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
      error.status = response.status;
      error.response = response;
      throw error;
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      const timeoutError = new Error("Request timed out. Please try again.");
      timeoutError.isTimeout = true;
      throw timeoutError;
    }
    console.error("API request error:", error);
    throw error;
  }
}

/**
 * Categorizes errors into user-friendly messages and determines display method
 * @param {Error} error - The error object
 * @param {Response|null} response - The fetch response object (if available)
 * @returns {{message: string, type: string, modal: boolean, retry: boolean}}
 */
function categorizeError(error, response = null) {
  // Timeout errors
  if (error.isTimeout || error.name === "AbortError") {
    return {
      message: "Request timed out. The server may be busy. Please try again.",
      type: "timeout",
      modal: true,
      retry: true,
    };
  }

  // Network errors (no response)
  if (
    !response &&
    (error.message?.includes("fetch") || error.message?.includes("network"))
  ) {
    return {
      message: "Network error. Please check your connection and try again.",
      type: "network",
      modal: true,
      retry: true,
    };
  }

  // HTTP status-based categorization
  const status = response?.status || error.status;
  if (status) {
    switch (status) {
      case 400:
        return {
          message: error.message || "Invalid request. Please check your input.",
          type: "validation",
          modal: false,
          retry: false,
        };
      case 401:
        return {
          message: "Your session has expired. Please log in again.",
          type: "auth",
          modal: true,
          retry: false,
        };
      case 403:
        return {
          message: "You don't have permission to perform this action.",
          type: "forbidden",
          modal: true,
          retry: false,
        };
      case 404:
        return {
          message: "The requested resource was not found.",
          type: "not_found",
          modal: true,
          retry: false,
        };
      case 409:
        return {
          message:
            error.message ||
            "A conflict occurred. Please refresh and try again.",
          type: "conflict",
          modal: true,
          retry: true,
        };
      case 429:
        return {
          message: "Too many requests. Please wait a moment and try again.",
          type: "rate_limit",
          modal: true,
          retry: true,
        };
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          message: "Server error. Please try again later.",
          type: "server",
          modal: true,
          retry: true,
        };
    }
  }

  // Default fallback
  return {
    message: error.message || "An unexpected error occurred. Please try again.",
    type: "unknown",
    modal: true,
    retry: true,
  };
}

/**
 * Export functions for global use
 * @namespace apiClient
 */
window.apiClient = {
  getAPIUrl,
  checkConnectivity,
  validateToken,
  apiRequest,
  categorizeError,
};

// Also provide global aliases for convenience
window.getAPIUrl = getAPIUrl;
window.categorizeError = categorizeError;
