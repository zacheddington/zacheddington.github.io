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
 * Generic API request wrapper with automatic error handling and authentication
 * @async
 * @param {string} endpoint - The API endpoint (e.g., '/api/users')
 * @param {Object} [options={}] - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Object>} The parsed JSON response
 * @throws {Error} If the request fails
 */
async function apiRequest(endpoint, options = {}) {
  try {
    const API_URL = getAPIUrl();
    const url = `${API_URL}${endpoint}`;

    const defaultOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };

    // Add auth token if available
    const token = localStorage.getItem("token");
    if (token) {
      defaultOptions.headers["Authorization"] = `Bearer ${token}`;
    }

    const finalOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    const response = await fetch(url, finalOptions);

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("API request error:", error);
    throw error;
  }
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
};

// Also provide global alias for getAPIUrl for convenience
window.getAPIUrl = getAPIUrl;
