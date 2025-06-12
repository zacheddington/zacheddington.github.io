// Authentication Utilities
// Handles user authentication, admin checks, and session management

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
    console.error("Error parsing user data:", error);
    return false;
  }
}

// Utility functions for admin detection and menu management
function isUserAdmin(userData) {
  if (!userData) return false;

  // Use server-determined admin status with fallback for old data
  let isAdminUser = userData.isAdmin === true;

  // Fallback: If role data is missing and username is admin, assume admin
  if (userData.isAdmin === undefined && userData.username === "admin") {
    isAdminUser = true;
  }

  return isAdminUser;
}

function updateAdminUI(isAdmin) {
  if (isAdmin) {
    document.body.classList.add("is-admin");
  } else {
    document.body.classList.remove("is-admin");
  }
}

function updateAdminMenuItem(isAdmin) {
  const adminLink = document.querySelector(
    'a[data-page="admin"]'
  )?.parentElement;
  if (adminLink) {
    if (isAdmin) {
      adminLink.style.display = "block";
      adminLink.classList.remove("admin-only");
    } else {
      adminLink.style.display = "none";
    }
  }
}

// Add session status indicator
function addSessionStatusIndicator() {
  const indicator = document.createElement("div");
  indicator.className = "session-indicator";
  indicator.id = "sessionStatus";
  document.body.appendChild(indicator);

  // Update session status every 30 seconds
  const updateStatus = () => {
    const token = localStorage.getItem("token");
    const userData = JSON.parse(localStorage.getItem("user") || "{}");

    if (token && userData && Object.keys(userData).length > 0) {
      indicator.textContent = "🟢 Connected";
      indicator.style.cssText = `
                position: fixed;
                bottom: 10px;
                right: 10px;
                background: rgba(40, 167, 69, 0.9);
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 20px;
                font-size: 0.8rem;
                z-index: 1000;
                backdrop-filter: blur(5px);
            `;
    } else {
      indicator.textContent = "🔴 Disconnected";
      indicator.style.cssText = `
                position: fixed;
                bottom: 10px;
                right: 10px;
                background: rgba(220, 53, 69, 0.9);
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 20px;
                font-size: 0.8rem;
                z-index: 1000;
                backdrop-filter: blur(5px);
            `;
    }
  };

  updateStatus();
  setInterval(updateStatus, 30000);
}

// Function to set up secure history management
function setupSecureHistoryManagement() {
  // Prevent back button access to authenticated pages after logout
  window.addEventListener("beforeunload", function () {
    console.log("🟠 BEFOREUNLOAD triggered", {
      currentPath: window.location.pathname,
      successfulLoginNavigation: sessionStorage.getItem(
        "successfulLoginNavigation"
      ),
      token: localStorage.getItem("token") ? "EXISTS" : "MISSING",
    });

    // Only clear auth data if:
    // 1. We're on the login page AND
    // 2. No successful login navigation is in progress
    if (
      (window.location.pathname === "/" ||
        window.location.pathname === "/index.html") &&
      !sessionStorage.getItem("successfulLoginNavigation")
    ) {
      console.log(
        "🟠 CLEARING AUTH DATA ON BEFOREUNLOAD - User leaving login page"
      );
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("activeSession");
      sessionStorage.clear();
    } else {
      console.log(
        "🟠 PRESERVING AUTH DATA ON BEFOREUNLOAD - Successful login navigation in progress"
      );
    }
  });

  // Prevent right-click context menu that might expose navigation options
  document.addEventListener("contextmenu", function (event) {
    event.preventDefault();
  });

  // Enhanced security for browser back/forward navigation
  window.addEventListener("popstate", function (event) {
    const token = localStorage.getItem("token");
    const currentPath = window.location.pathname;

    console.log("🟡 POPSTATE - Browser navigation detected", {
      currentPath,
      hasToken: !!token,
      state: event.state,
    });

    // If user navigated back to an authenticated page without a token, redirect to login
    const authenticatedPages = [
      "/welcome/",
      "/profile/",
      "/admin/",
      "/patients/",
      "/view_eeg/",
      "/enter_eeg/",
      "/2fa-setup/",
      "/force-password-change/",
    ];
    const isAuthenticatedPage = authenticatedPages.some((page) =>
      currentPath.includes(page)
    );

    if (isAuthenticatedPage && !token) {
      console.log("🔴 UNAUTHORIZED ACCESS ATTEMPT - Redirecting to login");
      window.location.replace("/");
    }
  });
}

// Perform secure logout
async function logout(reason = "User logout") {
  try {
    console.log("🔓 Logging out user:", reason);

    // Attempt to notify server of logout
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const API_URL = window.apiClient.getAPIUrl();
        await fetch(`${API_URL}/api/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason }),
        });
      } catch (error) {
        console.warn("Server logout notification failed:", error);
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
        console.warn("Failed to clear caches:", error);
      }
    }

    // Redirect to login page
    window.location.href = "/";
  } catch (error) {
    console.error("Logout error:", error);
    // Force logout even on error
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/";
  }
}

// Make authentication utilities available globally
window.authUtils = {
  isAuthenticated,
  isAdmin: isUserAdmin,
  updateAdminUI,
  updateAdminMenuItem,
  addSessionStatusIndicator,
  setupSecureHistoryManagement,
  logout,
};

// Backward compatibility - individual function exports
window.isUserAdmin = isUserAdmin;
window.updateAdminUI = updateAdminUI;
window.updateAdminMenuItem = updateAdminMenuItem;
window.addSessionStatusIndicator = addSessionStatusIndicator;
window.setupSecureHistoryManagement = setupSecureHistoryManagement;
