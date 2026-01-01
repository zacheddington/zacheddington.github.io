// Version check for debugging
// console.log('🔧 Auth Utils Version: Single Session Enforcement v1.1');

// Global version check function
window.authUtilsVersion = function () {
  return {
    version: "Single Session Enforcement v1.1",
    features: [
      "single-session-enforcement",
      "enhanced-session-monitoring",
      "detailed-error-messages",
      "manual-session-check",
      "test-functions",
    ],
    functions: {
      testSingleSessionEnforcement: typeof window.testSingleSessionEnforcement,
      manualSessionCheck: typeof window.manualSessionCheck,
      checkCurrentSession: typeof window.checkCurrentSession,
      authUtils: typeof window.authUtils,
    },
  };
};

/**
 * Authentication Utilities Module
 * Handles user authentication, admin checks, session management, and token validation
 * @module auth-utils
 */

// Global token expiration handling
let tokenExpirationCheckInterval = null;
let isSessionExpiredModalShown = false;

// Cleanup interval on page unload to prevent memory leaks
window.addEventListener("beforeunload", () => {
  if (tokenExpirationCheckInterval) {
    clearInterval(tokenExpirationCheckInterval);
    tokenExpirationCheckInterval = null;
  }
});

// Check if JWT token is valid and not expired
function checkTokenValidity() {
  const token = localStorage.getItem("token");

  if (!token) {
    return false;
  }

  try {
    // Parse JWT token (simple base64 decode)
    const tokenParts = token.split(".");
    if (tokenParts.length !== 3) {
      console.warn("Invalid token format");
      return false;
    }

    const payload = JSON.parse(atob(tokenParts[1]));

    // Check if token has expired
    const currentTime = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < currentTime) {
      console.warn("Token has expired");
      return false;
    }

    return true;
  } catch (error) {
    console.warn("Error checking token validity");
    return false;
  }
}

// Handle authentication errors globally
async function handleAuthError(response, context = "") {
  if (response.status === 401) {
    console.error("Authentication failed");
    handleSessionExpiration("Your session has expired. Please log in again.");
    return true;
  } else if (response.status === 403) {
    console.error("Access denied");

    // Check if this is a session revocation/expiration vs. permission issue
    try {
      const errorData = await response.clone().json();
      if (
        errorData.error &&
        (errorData.error.includes("Session expired or invalid") ||
          errorData.error.includes("session has been revoked") ||
          errorData.error.includes("Please log in again") ||
          errorData.error.includes("logged in from another location") ||
          errorData.error.includes("Only one session is allowed"))
      ) {
        // This is a revoked/expired session, treat as session expiration
        console.log("Detected revoked/expired session, logging out user");

        // Use specific message for single session enforcement
        let logoutMessage =
          "Your session has been revoked. Please log in again.";
        if (
          errorData.error.includes("logged in from another location") ||
          errorData.error.includes("Only one session is allowed")
        ) {
          logoutMessage =
            "You have been logged out because you logged in from another location. Only one session is allowed per user.";
        }

        handleSessionExpiration(logoutMessage);
        return true;
      }
    } catch (e) {
      // If we can't parse the response, fall back to checking response text
      try {
        const errorText = await response.clone().text();
        if (
          errorText &&
          (errorText.includes("Session expired or invalid") ||
            errorText.includes("session has been revoked") ||
            errorText.includes("Please log in again") ||
            errorText.includes("logged in from another location") ||
            errorText.includes("Only one session is allowed"))
        ) {
          console.log(
            "Detected revoked/expired session via text, logging out user"
          );

          // Use specific message for single session enforcement
          let logoutMessage =
            "Your session has been revoked. Please log in again.";
          if (
            errorText.includes("logged in from another location") ||
            errorText.includes("Only one session is allowed")
          ) {
            logoutMessage =
              "You have been logged out because you logged in from another location. Only one session is allowed per user.";
          }

          handleSessionExpiration(logoutMessage);
          return true;
        }
      } catch (e2) {
        // Continue with normal 403 handling
      }
    }

    // If we get a 403 error and can't determine the cause from the response,
    // make an immediate session check to be sure
    try {
      const sessionCheck = await checkCurrentSession();
      if (!sessionCheck.valid) {
        console.log(
          "Session check confirms session is invalid, logging out user"
        );
        handleSessionExpiration(
          "Your session has been revoked or expired. Please log in again."
        );
        return true;
      }
    } catch (sessionCheckError) {
      console.warn(
        "Failed to verify session validity on 403 error:",
        sessionCheckError
      );
      // If session check fails, don't assume session is invalid - could be network issue
    }

    // Normal permission denied error
    handleAccessDenied("You do not have permission to access this resource.");
    return true;
  }
  return false;
}

// Handle session expiration
function handleSessionExpiration(
  message = "Your session has expired. Please log in again."
) {
  if (isSessionExpiredModalShown) {
    return; // Prevent multiple modals
  }

  isSessionExpiredModalShown = true;

  // Clear expired token immediately
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  sessionStorage.clear();

  if (window.modalManager) {
    // Show modal - user must click OK to redirect (no auto-redirect)
    // The modal's OK button will trigger page navigation
    window.modalManager.showModal(
      "error",
      message + "\n\nClick OK to return to the login page."
    );

    // Override the close behavior to redirect
    const originalClose = window.modalManager.closeModal.bind(
      window.modalManager
    );
    window.modalManager.closeModal = function () {
      originalClose();
      window.location.href = "/";
    };
  } else {
    // Fallback if modalManager not available
    alert(message);
    window.location.href = "/";
  }
}

// Handle access denied (403) errors
function handleAccessDenied(
  message = "Access denied. You do not have permission to perform this action."
) {
  if (window.modalManager) {
    window.modalManager.showModal("error", message);
  } else {
    alert(message);
  }
}

// Initialize global token monitoring
function initializeGlobalTokenMonitoring() {
  // Check token validity immediately
  if (!checkTokenValidity()) {
    const currentPath = window.location.pathname;
    // Only redirect if not already on login page
    if (!currentPath.includes("/index.html") && currentPath !== "/") {
      handleSessionExpiration();
      return false;
    }
  }

  // Set up periodic token checking (every 5 minutes)
  if (tokenExpirationCheckInterval) {
    clearInterval(tokenExpirationCheckInterval);
  }

  tokenExpirationCheckInterval = setInterval(async () => {
    if (!checkTokenValidity()) {
      const currentPath = window.location.pathname;
      // Only show expiration if not on login page
      if (!currentPath.includes("/index.html") && currentPath !== "/") {
        handleSessionExpiration();
      }
      return;
    }

    // Additionally check with server for session validity (every 30 seconds)
    // This catches cases where session was revoked on server but token is still valid locally
    try {
      // console.log('🔍 Periodic session check starting...');
      const sessionCheck = await checkCurrentSession();
      // console.log('🔍 Session check result:', sessionCheck);

      if (!sessionCheck.valid) {
        // console.log(
        //     '🚨 Server reports session is invalid, logging out user'
        // );
        const currentPath = window.location.pathname;
        if (!currentPath.includes("/index.html") && currentPath !== "/") {
          // Use specific message for single session enforcement
          let logoutMessage =
            "Your session has been revoked or expired. Please log in again.";
          if (sessionCheck.single_session_enforcement) {
            // console.log('🚨 Single session enforcement detected!');
            logoutMessage =
              "You have been logged out because you logged in from another location. Only one session is allowed per user.";
          }

          handleSessionExpiration(logoutMessage);
        }
      } else {
        // console.log('✅ Session is still valid');
      }
    } catch (error) {
      console.warn("Failed to check session validity with server:", error);
      // Don't logout on network errors, only on explicit session invalidity
    }
  }, 30 * 1000); // Check every 30 seconds (reduced for testing)

  return true;
}

// Create a global fetch wrapper that handles auth errors
function createAuthenticatedFetch() {
  const originalFetch = window.fetch;

  window.fetch = async function (url, options = {}) {
    // Add token to headers if not present and token exists
    const token = localStorage.getItem("token");
    if (
      token &&
      options.headers &&
      !options.headers["Authorization"] &&
      !options.headers.Authorization
    ) {
      options.headers["Authorization"] = `Bearer ${token}`;
    } else if (token && !options.headers) {
      options.headers = {
        Authorization: `Bearer ${token}`,
      };
    }

    try {
      const response = await originalFetch(url, options);

      // Handle authentication errors globally
      if (response.status === 401 || response.status === 403) {
        // Only handle if this looks like an API call
        if (url.includes("/api/")) {
          await handleAuthError(response, `API call to ${url}`);
        }
      }

      return response;
    } catch (error) {
      throw error;
    }
  };
}

// Stop global token monitoring (for cleanup)
function stopGlobalTokenMonitoring() {
  if (tokenExpirationCheckInterval) {
    clearInterval(tokenExpirationCheckInterval);
    tokenExpirationCheckInterval = null;
  }
  isSessionExpiredModalShown = false;
}

// Check if user is authenticated
function isAuthenticated() {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");

  if (!token || !user) {
    return false;
  }

  try {
    const userData = JSON.parse(user);
    return userData && Object.keys(userData).length > 0;
  } catch (error) {
    console.error("Error parsing user data");
    return false;
  }
}

// Check if user needs to change password and redirect if necessary
function checkPasswordChangeRequired() {
  const userStr = localStorage.getItem("user");

  if (!userStr) {
    return false;
  }

  try {
    const user = JSON.parse(userStr);

    // If user needs to change password and is not on the force password change page
    if (
      user.passwordChangeRequired &&
      !window.location.pathname.startsWith("/force-password-change/")
    ) {
      window.location.href = "/force-password-change/";
      return true; // Indicates redirect was triggered
    }

    return false; // No redirect needed
  } catch (error) {
    console.error("Error parsing user data for password check");
    return false;
  }
}

// Global password change enforcement - logs out users who need to change password
// but are accessing other pages (security measure)
async function enforcePasswordChangeRequirement() {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");

  // Skip if not authenticated
  if (!token || !userStr) {
    return;
  }

  // Skip if already on force-password page
  if (window.location.pathname.startsWith("/force-password-change/")) {
    return;
  }

  // Skip if on login page
  if (
    window.location.pathname === "/" ||
    window.location.pathname.includes("login")
  ) {
    return;
  }

  try {
    const user = JSON.parse(userStr);

    // If user needs to change password but is not on the force-password page,
    // this is a security violation - log them out
    if (user.passwordChangeRequired) {
      console.warn(
        "Security violation: User with password change requirement accessed protected page. Logging out."
      );

      // Show warning message
      if (window.modalManager) {
        window.modalManager.showModal(
          "error",
          "You must change your password before accessing this page. You have been logged out for security reasons.\n\nClick OK to return to the login page."
        );

        // Override close to redirect
        const originalClose = window.modalManager.closeModal.bind(
          window.modalManager
        );
        window.modalManager.closeModal = function () {
          originalClose();
          // Clear all authentication data
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          sessionStorage.clear();
          window.location.href = "/";
        };
      } else {
        // Fallback - clear auth and redirect
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        sessionStorage.clear();
        window.location.href = "/";
      }

      return true; // Indicates logout was triggered
    }

    // Optionally verify with server periodically (but not on every page load to avoid performance issues)
    const lastServerCheck = localStorage.getItem("lastPasswordStatusCheck");
    const now = Date.now();
    const checkInterval = 5 * 60 * 1000; // 5 minutes

    if (!lastServerCheck || now - parseInt(lastServerCheck) > checkInterval) {
      try {
        const API_URL = window.apiClient?.getAPIUrl();
        if (API_URL) {
          const userCheckResponse = await fetch(`${API_URL}/api/user/profile`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          if (userCheckResponse.ok) {
            const userProfile = await userCheckResponse.json();
            if (
              userProfile.data &&
              userProfile.data.passwordChangeRequired &&
              !user.passwordChangeRequired
            ) {
              // Server says password change is required but local storage doesn't reflect this
              // Update local storage and redirect
              user.passwordChangeRequired = true;
              localStorage.setItem("user", JSON.stringify(user));

              console.warn(
                "Server indicates password change required. Redirecting to force-password page."
              );
              window.location.href = "/force-password-change/";
              return true;
            } else if (
              userProfile.data &&
              !userProfile.data.passwordChangeRequired &&
              user.passwordChangeRequired
            ) {
              // Server says password change is not required but local storage says it is
              // Update local storage
              user.passwordChangeRequired = false;
              localStorage.setItem("user", JSON.stringify(user));
            }

            // Update last check timestamp
            localStorage.setItem("lastPasswordStatusCheck", now.toString());
          }
        }
      } catch (serverError) {
        console.warn(
          "Could not verify password status with server:",
          serverError
        );
        // Don't fail the whole check if server is unreachable
      }
    }

    return false; // No logout triggered
  } catch (error) {
    console.error("Error in password change enforcement:", error);
    return false;
  }
}

/**
 * Check current session validity with server
 * @async
 * @param {number} [timeout=10000] - Request timeout in milliseconds
 * @returns {Promise<{valid: boolean, reason?: string, session?: Object, single_session_enforcement?: boolean}>}
 */
async function checkCurrentSession(timeout = 10000) {
  const token = localStorage.getItem("token");
  if (!token) {
    return { valid: false, reason: "No token found" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const API_URL = window.apiClient?.getAPIUrl();
    if (!API_URL) {
      clearTimeout(timeoutId);
      return { valid: false, reason: "API client not available" };
    }

    const response = await fetch(`${API_URL}/api/sessions/check`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.status === 401 || response.status === 403) {
      // Session is invalid/revoked - try to get specific reason
      try {
        const errorData = await response.json();
        if (
          errorData.reason === "session_revoked" &&
          errorData.revoked_reason === "new_login_single_session_enforcement"
        ) {
          return {
            valid: false,
            reason: "Session revoked due to new login from another location",
            single_session_enforcement: true,
          };
        } else if (errorData.reason === "session_revoked") {
          return {
            valid: false,
            reason: "Session revoked",
            revoked_reason: errorData.revoked_reason,
          };
        } else {
          return {
            valid: false,
            reason: "Session expired or revoked",
          };
        }
      } catch (e) {
        return { valid: false, reason: "Session expired or revoked" };
      }
    }

    if (response.ok) {
      const data = await response.json();
      return { valid: true, session: data.session };
    } else {
      return { valid: false, reason: `Server error: ${response.status}` };
    }
  } catch (error) {
    if (error.name === "AbortError") {
      console.warn("Session check timed out");
      return { valid: false, reason: "Request timed out" };
    }
    console.warn("Failed to check session validity:", error);
    return { valid: false, reason: "Network error" };
  }
}

// Simple manual session check function for debugging
async function manualSessionCheck() {
  // console.log('🔍 Manual session check...');

  try {
    const token = localStorage.getItem("token");
    // console.log('Token exists:', !!token);

    if (!token) {
      // console.log('❌ No token found');
      return { valid: false, reason: "No token" };
    }

    const sessionCheck = await checkCurrentSession();
    // console.log('Session check result:', sessionCheck);

    if (!sessionCheck.valid) {
      // console.log('❌ Current session is invalid:', sessionCheck.reason);
      if (sessionCheck.single_session_enforcement) {
        // console.log('🚨 Single session enforcement detected!');
      }
    } else {
      // console.log('✅ Current session is valid');
    }

    return sessionCheck;
  } catch (error) {
    console.error("Error during manual session check:", error);
    return { error: error.message };
  }
}

// Test function for single session enforcement
async function testSingleSessionEnforcement() {
  // console.log('🧪 Starting Single Session Enforcement Test...');

  try {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (!token) {
      // console.log('❌ No token found. Please login first.');
      return;
    }

    // Check current session status
    // console.log('1️⃣ Checking current session status...');
    const sessionCheck = await checkCurrentSession();
    // console.log('Current session status:', sessionCheck);

    if (!sessionCheck.valid) {
      // console.log('❌ Current session is invalid:', sessionCheck.reason);
      return;
    }

    // console.log('✅ Current session is valid');

    // Instructions for manual testing
    console.log("📋 Manual Test Instructions:");
    console.log("1. Keep this tab open");
    console.log("2. Open a new browser/incognito window");
    console.log("3. Login with the same credentials");
    console.log("4. Return to this tab and wait up to 5 minutes");
    console.log(
      "5. You should be automatically logged out with a specific message"
    );

    // Start monitoring for session changes
    // console.log('🔍 Starting session monitoring...');
    let checkCount = 0;

    const monitorInterval = setInterval(async () => {
      checkCount++;
      // console.log(
      //     `⏰ Check #${checkCount} - Verifying session status...`
      // );

      try {
        const currentStatus = await checkCurrentSession();

        if (!currentStatus.valid) {
          // console.log('🚨 SESSION INVALIDATED!');
          // console.log('Reason:', currentStatus.reason);

          if (currentStatus.single_session_enforcement) {
            // console.log('✅ Single session enforcement detected!');
            console.log(
              "✅ Test PASSED - Session was revoked due to new login elsewhere"
            );
          } else {
            console.log(
              "ℹ️ Session invalidated for other reason:",
              currentStatus.reason
            );
          }

          clearInterval(monitorInterval);
          return;
        }

        // console.log('✅ Session still valid');

        // Stop monitoring after 10 minutes
        if (checkCount >= 20) {
          console.log("⏰ Test timeout - stopping monitoring");
          console.log(
            "💡 Try logging in from another location to trigger single session enforcement"
          );
          clearInterval(monitorInterval);
        }
      } catch (error) {
        console.error("Error checking session:", error);
      }
    }, 30000); // Check every 30 seconds

    return {
      status: "Test started",
      instructions:
        "Login from another location to test single session enforcement",
      monitoring: "Session monitoring active for 10 minutes",
    };
  } catch (error) {
    console.error("❌ Error during test:", error);
    return { error: error.message };
  }
}

// Utility functions for admin detection and menu management
function isUserAdmin(userData) {
  // console.log('🔧 isUserAdmin called with userData:', userData);

  if (!userData) {
    // console.log('🔧 No userData provided, returning false');
    return false;
  }

  // Primary check: Use server-determined admin status
  if (userData.isAdmin === true) {
    // console.log('🔧 User is admin via isAdmin property');
    return true;
  }

  // Secondary check: Check roles array for Administrator
  if (userData.roles && Array.isArray(userData.roles)) {
    // console.log('🔧 Checking roles array:', userData.roles);
    const hasAdminRole = userData.roles.some(
      (role) => role && role.toLowerCase().includes("administrator")
    );
    if (hasAdminRole) {
      // console.log('🔧 User is admin via roles array');
      return true;
    }
  }

  // Tertiary check: Check role keys for admin role key (typically 1)
  if (userData.roleKeys && Array.isArray(userData.roleKeys)) {
    // console.log('🔧 Checking roleKeys array:', userData.roleKeys);
    const hasAdminRoleKey = userData.roleKeys.some(
      (roleKey) => roleKey === 1 || roleKey === "1"
    );
    if (hasAdminRoleKey) {
      // console.log('🔧 User is admin via roleKeys array');
      return true;
    }
  }

  // console.log('🔧 User is not admin');
  return false;
}

// Update admin UI elements based on user role
function updateAdminUI(userData) {
  const isAdmin = isUserAdmin(userData);

  // Update body class for CSS-based admin UI
  if (isAdmin) {
    document.body.classList.add("is-admin");
  } else {
    document.body.classList.remove("is-admin");
  }

  // Update admin menu items
  updateAdminMenuItem(isAdmin);

  // Update any other admin-specific UI elements
  const adminElements = document.querySelectorAll(".admin-only");
  adminElements.forEach((element) => {
    // For nav dropdowns, let CSS handle the visibility
    if (element.classList.contains("nav-dropdown")) {
      // Remove any inline styles to let CSS take control
      element.style.display = "";
      if (isAdmin) {
        element.classList.remove("hidden");
      } else {
        element.classList.add("hidden");
      }
    } else {
      // For other admin elements, use inline styles as before
      if (isAdmin) {
        element.style.display = "";
        element.classList.remove("hidden");
      } else {
        element.style.display = "none";
        element.classList.add("hidden");
      }
    }
  });
}

// Update admin menu item visibility
function updateAdminMenuItem(isAdmin) {
  // console.log('🔧 updateAdminMenuItem called with isAdmin:', isAdmin);

  // Update body class for CSS-based admin UI
  if (isAdmin) {
    document.body.classList.add("is-admin");
  } else {
    document.body.classList.remove("is-admin");
  }

  const adminMenuItems = document.querySelectorAll(
    ".admin-only, [data-admin-only]"
  );

  // console.log('🔧 Found admin menu items:', adminMenuItems.length);

  adminMenuItems.forEach((item, index) => {
    // console.log(`🔧 Admin item ${index}:`, item.tagName, item.className);

    // For nav dropdowns, let CSS handle the visibility
    if (item.classList.contains("nav-dropdown")) {
      // Remove any inline styles to let CSS take control
      item.style.display = "";
      if (isAdmin) {
        item.classList.remove("hidden");
      } else {
        item.classList.add("hidden");
      }
    } else {
      // For other admin elements, use inline styles as before
      if (isAdmin) {
        item.style.display = "";
        item.classList.remove("hidden");
        // console.log(`🔧 Showing admin item ${index}`);
      } else {
        item.style.display = "none";
        item.classList.add("hidden");
        // console.log(`🔧 Hiding admin item ${index}`);
      }
    }
  });
}

// Add session status indicator (placeholder)
function addSessionStatusIndicator() {
  // This function can be enhanced to show session status
  // console.log('Session status indicator functionality available');
}

// Setup secure history management (placeholder)
function setupSecureHistoryManagement() {
  // This function can be enhanced for secure navigation
  // console.log('Secure history management functionality available');
}

// Prevent auth page back navigation (placeholder)
function preventAuthPageBackNavigation() {
  // This function can be enhanced to prevent back navigation to auth pages
  // console.log('Auth page back navigation prevention functionality available');
}

// Secure history replacement (placeholder)
function secureHistoryReplacement() {
  // This function can be enhanced for secure history management
}

// Logout function
async function logout(reason = "user_logout") {
  try {
    // Notify server about logout if possible
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const API_URL = window.apiClient?.getAPIUrl();
        if (API_URL) {
          await fetch(`${API_URL}/api/auth/logout`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ reason }),
          });
        }
      } catch (error) {
        console.warn("Server logout notification failed");
        // Continue with client-side logout even if server call fails
      }
    }

    // Clear all authentication data
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.clear();

    // Clear any cached data
    if ("caches" in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      } catch (error) {
        console.warn("Failed to clear caches");
      }
    }

    // Redirect to login page
    window.location.href = "/";
  } catch (error) {
    console.error("Logout process failed");
    // Force logout even on error
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/";
  }
}

// Make authentication utilities available globally
window.authUtils = {
  isAuthenticated,
  checkPasswordChangeRequired,
  enforcePasswordChangeRequirement,
  isAdmin: isUserAdmin,
  isUserAdmin: isUserAdmin, // Add this for navigation.js compatibility
  updateAdminUI,
  updateAdminMenuItem,
  addSessionStatusIndicator,
  setupSecureHistoryManagement,
  logout,
  checkTokenValidity,
  checkCurrentSession,
  manualSessionCheck,
  handleAuthError,
  handleSessionExpiration,
  handleAccessDenied,
  initializeGlobalTokenMonitoring,
  stopGlobalTokenMonitoring,
  createAuthenticatedFetch,
  preventAuthPageBackNavigation,
  secureHistoryReplacement,
  testSingleSessionEnforcement, // Expose test function
};

// Backward compatibility - individual function exports
window.isUserAdmin = isUserAdmin;
window.updateAdminUI = updateAdminUI;
window.updateAdminMenuItem = updateAdminMenuItem;
window.addSessionStatusIndicator = addSessionStatusIndicator;
window.setupSecureHistoryManagement = setupSecureHistoryManagement;
window.checkTokenValidity = checkTokenValidity;
window.checkCurrentSession = checkCurrentSession;
window.manualSessionCheck = manualSessionCheck;
window.testSingleSessionEnforcement = testSingleSessionEnforcement;
window.handleAuthError = handleAuthError;
window.handleSessionExpiration = handleSessionExpiration;
window.initializeGlobalTokenMonitoring = initializeGlobalTokenMonitoring;

// Immediately invoke password change enforcement on script load
enforcePasswordChangeRequirement();
