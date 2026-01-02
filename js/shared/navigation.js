// Top Navigation Utilities
// Handles top menu loading, navigation, and page transitions

// Application version - update this with each deployment
const APP_VERSION = "0.0.489";

// Load application footer with version
function loadAppFooter() {
  // Check if footer already exists
  if (document.querySelector(".app-footer")) {
    return;
  }

  const footer = document.createElement("footer");
  footer.className = "app-footer";
  footer.innerHTML = `<span class="version-text">Integris Neuro Data Entry ${APP_VERSION}</span>`;
  document.body.appendChild(footer);
}

// Load top navigation menu
async function loadTopNavigation() {
  // Always load the footer on every page
  loadAppFooter();

  try {
    const headerContainer = document.querySelector(".app-header");
    if (!headerContainer) {
      // This is expected on pages like login, force-password-change, etc.
      return;
    }

    // Check if navigation is already loaded
    const existingNav = headerContainer.querySelector(".top-nav-menu");
    if (existingNav) {
      // Navigation already exists, just update admin visibility
      if (window.authUtils && window.authUtils.updateAdminUI) {
        const userDataString = localStorage.getItem("user") || "{}";
        const userData = JSON.parse(userDataString);
        window.authUtils.updateAdminUI(userData);
      }
      return;
    }

    // Use the proper navigation directly instead of loading from menu.html
    createProperNavigation();

    // Update admin menu visibility based on user role
    if (window.authUtils && window.authUtils.updateAdminUI) {
      const userDataString = localStorage.getItem("user") || "{}";
      const userData = JSON.parse(userDataString);
      window.authUtils.updateAdminUI(userData);
    }
  } catch (err) {
    console.error("❌ NAV: Error loading top navigation");
  }
}

// Create proper navigation with dropdowns and icons
function createProperNavigation() {
  const headerContainer = document.querySelector(".app-header");
  if (!headerContainer) return;

  // Use absolute paths from root to avoid relative path issues
  const fallbackNav = `
        <nav class="top-nav-menu">
            <ul>
                <li><a href="/welcome/" data-page="welcome">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9,22 9,12 15,12 15,22"/>
                    </svg>
                    Home
                </a></li>                <li class="nav-dropdown"><a href="/patients/" data-page="patients" class="dropdown-trigger">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    Patients
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="dropdown-arrow">
                        <polyline points="6,9 12,15 18,9"></polyline>
                    </svg>
                </a>
                <div class="dropdown-content">
                    <a href="/patients/create-patient/">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M20 8v6M23 11h-6"/>
                        </svg>
                        Create New Patient
                    </a>
                    <a href="/patients/manage-patients/">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        Manage Patients
                    </a>
                </div></li>
                <li class="nav-dropdown"><a href="/studies/" data-page="studies" class="dropdown-trigger">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10,9 9,9 8,9"/>
                    </svg>
                    Studies
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="dropdown-arrow">
                        <polyline points="6,9 12,15 18,9"></polyline>
                    </svg>
                </a>
                <div class="dropdown-content">
                    <a href="/studies/create-study/">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                            <line x1="12" y1="18" x2="12" y2="12"/>
                            <line x1="9" y1="15" x2="15" y2="15"/>
                        </svg>
                        Create New Study
                    </a>
                    <a href="/studies/manage-studies/">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                        Manage Studies
                    </a>
                </div></li>
                <li><a href="/profile/" data-page="profile">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                    Profile
                </a></li>                <li class="nav-dropdown admin-only">
                    <a href="/admin/" data-page="admin" class="dropdown-trigger">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                        </svg>
                        Administration
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="dropdown-arrow">
                            <polyline points="6,9 12,15 18,9"></polyline>
                        </svg>
                    </a>
                    <div class="dropdown-content">
                        <a href="/admin/create-user/">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M22 11h-6m3-3v6"/>
                            </svg>
                            Create New User
                        </a>                        <a href="/admin/manage-users/">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                            Manage Users
                        </a>
                        <a href="/admin/manage-sessions/">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            Session Management
                        </a>
                    </div>
                </li>
            </ul>
        </nav>
        <div class="user-profile">
            <button class="logout-btn" id="logoutBtn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16,17 21,12 16,7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Logout
            </button>
        </div>
    `;
  headerContainer.insertAdjacentHTML("beforeend", fallbackNav);
  setupTopNavigation(); // Update admin menu visibility for fallback navigation too
}

// Setup top navigation functionality
function setupTopNavigation() {
  // Set active page
  setActiveNavItem();

  // Setup mobile dropdown functionality
  setupMobileDropdowns();

  // Setup logout button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      if (window.authUtils && window.authUtils.logout) {
        window.authUtils.logout();
      } else {
        // Fallback logout
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/";
      }
    });
  }

  // Initialize admin UI after a short delay to ensure DOM is ready
  setTimeout(() => {
    if (window.authUtils && window.authUtils.updateAdminUI) {
      const userDataString = localStorage.getItem("user") || "{}";
      const userData = JSON.parse(userDataString);
      window.authUtils.updateAdminUI(userData);
    }
  }, 50);
}

// Set active navigation item based on current page
function setActiveNavItem() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll(".top-nav-menu a[data-page]");

  navLinks.forEach((link) => {
    const page = link.getAttribute("data-page");
    // Remove active class first
    link.classList.remove("active");

    // Check if current path matches this page
    if (currentPath.includes(`/${page}/`)) {
      link.classList.add("active");
    }
  });
}

// Page transition with fade effect
function setupFadeNavigation() {
  const navLinks = document.querySelectorAll(".top-nav-menu a[data-page]");

  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();

      const targetUrl = this.getAttribute("href");
      const currentPage = document.body;

      // Add fade-out class
      currentPage.style.opacity = "0";
      currentPage.style.transition = "opacity 0.15s ease-out";

      // Navigate after fade-out completes
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 150);
    });
  });
}

// Patient number validation (keeping this for compatibility)
function setupPatientNumberValidation() {
  const patientNumberInput = document.getElementById("patientNumber");
  const tooltip = document.getElementById("patientNumberTooltip");

  if (!patientNumberInput || !tooltip) {
    return;
  }

  patientNumberInput.addEventListener("input", function () {
    const value = this.value;
    const isValid = /^\d{4}$/.test(value);

    if (value.length > 0 && !isValid) {
      tooltip.textContent = "Patient number must be exactly 4 digits";
      tooltip.classList.add("show");
    } else {
      tooltip.classList.remove("show");
    }
  });

  patientNumberInput.addEventListener("focus", function () {
    tooltip.classList.remove("show");
  });
}

/**
 * Setup navigation dropdowns - ROBUST MOBILE VERSION
 * CSS hover works on desktop, JavaScript handles touch devices properly
 */
function setupMobileDropdowns() {
  // Early return if already setup to prevent multiple initializations
  if (window._mobileDropdownsSetup) return;
  window._mobileDropdownsSetup = true;

  const dropdowns = document.querySelectorAll(".nav-dropdown");

  // More robust touch detection for various mobile devices
  const isTouchDevice = (() => {
    // Check multiple touch indicators
    if ("ontouchstart" in window) return true;
    if (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) return true;
    if (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0)
      return true;

    // Check for mobile user agents as backup
    const mobileRegex =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    if (mobileRegex.test(navigator.userAgent)) return true;

    // Check for small screen size as final indicator
    if (window.screen && window.screen.width <= 768) return true;

    return false;
  })();

  // Clear any existing global listeners first to prevent duplicates
  if (window._dropdownClickHandler) {
    document.removeEventListener("click", window._dropdownClickHandler);
  }
  if (window._dropdownTouchHandler) {
    document.removeEventListener("touchstart", window._dropdownTouchHandler);
  }

  // Store dropdown states to prevent race conditions - use global storage
  if (!window._dropdownStates) {
    window._dropdownStates = new Map();
  }
  const dropdownStates = window._dropdownStates;

  // Define the click handler function FIRST
  function handleDropdownClick(e) {
    // Find the dropdown container
    const dropdown = e.target.closest(".nav-dropdown");
    if (!dropdown) {
      return;
    }

    const trigger = dropdown.querySelector(".dropdown-trigger");

    // For touch devices, use special two-tap behavior
    if (isTouchDevice) {
      // Immediately prevent any other handlers from interfering on touch devices
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const state = dropdownStates.get(dropdown);
      if (!state) {
        return;
      }

      if (state.isNavigating) {
        return;
      }

      if (state.isOpen) {
        // Second tap - navigate
        state.isNavigating = true;
        dropdown.classList.remove("mobile-open");
        state.isOpen = false;

        const href = trigger.getAttribute("href");
        if (href && href !== "#") {
          // Small delay to ensure click event completes
          setTimeout(() => {
            window.location.href = href;
          }, 100);
        }
      } else {
        // First tap - close others and open this one
        dropdowns.forEach((otherDropdown) => {
          const otherState = dropdownStates.get(otherDropdown);
          if (otherState) {
            otherState.isOpen = false;
            otherState.isNavigating = false;
          }
          otherDropdown.classList.remove("mobile-open");
        });

        dropdown.classList.add("mobile-open");
        state.isOpen = true;
        state.isNavigating = false;
      }
    } else {
      // For desktop, allow normal navigation - don't prevent default
      // CSS hover will handle the dropdown display
      return;
    }
  }

  dropdowns.forEach((dropdown, index) => {
    const trigger = dropdown.querySelector(".dropdown-trigger");
    if (!trigger) return;

    const hasDropdownContent = dropdown.querySelector(".dropdown-content");
    if (!hasDropdownContent) return;

    // Initialize state tracking
    dropdownStates.set(dropdown, { isOpen: false, isNavigating: false });

    // Remove ALL possible event listeners that might interfere
    trigger.removeEventListener("click", handleDropdownClick);
    trigger.removeEventListener("touchstart", handleDropdownClick);
    trigger.removeEventListener("touchend", handleDropdownClick);

    // For touch devices, use both touchstart AND click to ensure we catch the event
    if (isTouchDevice) {
      // Add touchstart with immediate response
      trigger.addEventListener("touchstart", handleDropdownClick, {
        passive: false,
      });
    }

    // Always add click as backup
    trigger.addEventListener("click", handleDropdownClick);
  });

  // Close dropdowns when clicking outside, with state management
  window._dropdownClickHandler = function (e) {
    const dropdowns = document.querySelectorAll(".nav-dropdown");
    const dropdownStates = window._dropdownStates;

    // Don't close if clicking on a dropdown item
    if (e.target.closest(".dropdown-content a")) {
      // Allow dropdown item navigation, close dropdown after click
      dropdowns.forEach((dropdown) => {
        const state = dropdownStates.get(dropdown);
        if (state) {
          state.isOpen = false;
          state.isNavigating = false;
        }
        dropdown.classList.remove("mobile-open");
      });
      return;
    }

    // Close if clicking outside any dropdown
    if (!e.target.closest(".nav-dropdown")) {
      dropdowns.forEach((dropdown) => {
        const state = dropdownStates.get(dropdown);
        if (state) {
          state.isOpen = false;
          state.isNavigating = false;
        }
        dropdown.classList.remove("mobile-open");
      });
    }
  };

  document.addEventListener("click", window._dropdownClickHandler);

  // Also add touchstart handler for mobile outside clicks (passive to not interfere with scroll)
  if (isTouchDevice) {
    window._dropdownTouchHandler = function (e) {
      const dropdowns = document.querySelectorAll(".nav-dropdown");
      const dropdownStates = window._dropdownStates;

      // Only handle if not touching a dropdown and there are open dropdowns
      const hasOpenDropdowns = Array.from(dropdowns).some((dd) =>
        dd.classList.contains("mobile-open")
      );

      if (hasOpenDropdowns && !e.target.closest(".nav-dropdown")) {
        // Use requestAnimationFrame to avoid interfering with scroll
        requestAnimationFrame(() => {
          dropdowns.forEach((dropdown) => {
            const state = dropdownStates.get(dropdown);
            if (state) {
              state.isOpen = false;
              state.isNavigating = false;
            }
            dropdown.classList.remove("mobile-open");
          });
        });
      }
    };

    document.addEventListener("touchstart", window._dropdownTouchHandler, {
      passive: true,
    });
  }
}

// Make navigation utilities available globally
window.navigation = {
  loadTopNavigation,
  loadMenu: loadTopNavigation, // Add loadMenu for backward compatibility
  loadAppFooter,
  setupFadeNavigation,
  setupPatientNumberValidation,
  APP_VERSION,
};

// Also expose individual functions for backward compatibility
window.loadMenu = loadTopNavigation; // Backward compatibility
window.loadTopNavigation = loadTopNavigation;
window.loadAppFooter = loadAppFooter;
window.setupFadeNavigation = setupFadeNavigation;
window.setupPatientNumberValidation = setupPatientNumberValidation;
