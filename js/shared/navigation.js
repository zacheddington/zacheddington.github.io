// Top Navigation Utilities
// Handles top menu loading, navigation, and page transitions

// Load top navigation menu
async function loadTopNavigation() {
    try {
        const headerContainer = document.querySelector('.app-header');
        if (!headerContainer) {
            // This is expected on pages like login, force-password-change, etc.
            return;
        }

        // Check if navigation is already loaded
        const existingNav = headerContainer.querySelector('.top-nav-menu');
        if (existingNav) {
            // Navigation already exists, just update admin visibility
            if (window.authUtils && window.authUtils.updateAdminMenuItem) {
                const userDataString = localStorage.getItem('user') || '{}';
                const userData = JSON.parse(userDataString);
                let isAdmin = window.authUtils.isUserAdmin
                    ? window.authUtils.isUserAdmin(userData)
                    : false;
                window.authUtils.updateAdminMenuItem(isAdmin);
            }
            return;
        }

        // Use the proper navigation directly instead of loading from menu.html
        createProperNavigation();

        // Update admin menu visibility based on user role
        if (window.authUtils && window.authUtils.updateAdminMenuItem) {
            const userDataString = localStorage.getItem('user') || '{}';
            const userData = JSON.parse(userDataString);

            // Use proper admin detection
            let isAdmin = window.authUtils.isUserAdmin
                ? window.authUtils.isUserAdmin(userData)
                : false;

            window.authUtils.updateAdminMenuItem(isAdmin);
        }
    } catch (err) {
        console.error('❌ NAV: Error loading top navigation');
    }
}

// Create proper navigation with dropdowns and icons
function createProperNavigation() {
    const headerContainer = document.querySelector('.app-header');
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
    headerContainer.insertAdjacentHTML('beforeend', fallbackNav);
    setupTopNavigation(); // Update admin menu visibility for fallback navigation too

    // ULTIMATE DEBUG: Check dropdown visibility at all screen sizes
    setInterval(() => {
        const dropdowns = document.querySelectorAll(
            '.nav-dropdown .dropdown-content'
        );
        const width = window.innerWidth;

        console.log(
            `🔍 ULTIMATE DEBUG at ${width}px - Found ${dropdowns.length} dropdowns:`
        );

        dropdowns.forEach((dropdown, i) => {
            const styles = window.getComputedStyle(dropdown);
            console.log(`  Dropdown ${i}:`, {
                display: styles.display,
                opacity: styles.opacity,
                visibility: styles.visibility,
                backgroundColor: styles.backgroundColor,
                border: styles.border,
                position: styles.position,
                zIndex: styles.zIndex,
                top: styles.top,
                right: styles.right,
                transform: styles.transform,
            });

            // Check if element is actually visible in viewport
            const rect = dropdown.getBoundingClientRect();
            console.log(`  Dropdown ${i} position:`, {
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                inViewport:
                    rect.top >= 0 &&
                    rect.left >= 0 &&
                    rect.bottom <= window.innerHeight &&
                    rect.right <= window.innerWidth,
            });
        });
    }, 2000);
}

// Setup top navigation functionality
function setupTopNavigation() {
    // Set active page
    setActiveNavItem();

    // Setup mobile dropdown functionality
    setupMobileDropdowns();

    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            if (window.authUtils && window.authUtils.logout) {
                window.authUtils.logout();
            } else {
                // Fallback logout
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/';
            }
        });
    }
}

// Set active navigation item based on current page
function setActiveNavItem() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.top-nav-menu a[data-page]');

    navLinks.forEach((link) => {
        const page = link.getAttribute('data-page');
        // Remove active class first
        link.classList.remove('active');

        // Check if current path matches this page
        if (currentPath.includes(`/${page}/`)) {
            link.classList.add('active');
        }
    });
}

// Page transition with fade effect
function setupFadeNavigation() {
    const navLinks = document.querySelectorAll('.top-nav-menu a[data-page]');

    navLinks.forEach((link) => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            const targetUrl = this.getAttribute('href');
            const currentPage = document.body;

            // Add fade-out class
            currentPage.style.opacity = '0';
            currentPage.style.transition = 'opacity 0.15s ease-out';

            // Navigate after fade-out completes
            setTimeout(() => {
                window.location.href = targetUrl;
            }, 150);
        });
    });
}

// Patient number validation (keeping this for compatibility)
function setupPatientNumberValidation() {
    const patientNumberInput = document.getElementById('patientNumber');
    const tooltip = document.getElementById('patientNumberTooltip');

    if (!patientNumberInput || !tooltip) {
        return;
    }

    patientNumberInput.addEventListener('input', function () {
        const value = this.value;
        const isValid = /^\d{4}$/.test(value);

        if (value.length > 0 && !isValid) {
            tooltip.textContent = 'Patient number must be exactly 4 digits';
            tooltip.classList.add('show');
        } else {
            tooltip.classList.remove('show');
        }
    });

    patientNumberInput.addEventListener('focus', function () {
        tooltip.classList.remove('show');
    });
}

/**
 * Setup navigation dropdowns with unified mouse vs touch detection
 * Mouse input: Uses CSS :hover dropdowns at all screen sizes
 * Touch input: Uses JavaScript toggle dropdowns at all screen sizes
 */
function setupMobileDropdowns() {
    const dropdowns = document.querySelectorAll('.nav-dropdown');

    // Track input method - starts as unknown
    let isUsingTouch = null;

    dropdowns.forEach((dropdown, index) => {
        const trigger = dropdown.querySelector('.dropdown-trigger');
        const content = dropdown.querySelector('.dropdown-content');

        if (!trigger || !content) {
            return;
        }

        // Remove existing listeners to prevent duplicates
        if (trigger._clickHandler) {
            trigger.removeEventListener('click', trigger._clickHandler);
        }
        if (trigger._touchHandler) {
            trigger.removeEventListener('touchstart', trigger._touchHandler);
        }
        if (trigger._mouseHandler) {
            trigger.removeEventListener('mouseenter', trigger._mouseHandler);
        }

        // Touch start handler - detects touch input
        const touchStartHandler = function (e) {
            isUsingTouch = true;

            // For touch, prevent default click behavior and handle with JS
            e.preventDefault();

            // Close other dropdowns
            dropdowns.forEach((otherDropdown) => {
                if (otherDropdown !== dropdown) {
                    otherDropdown.classList.remove('mobile-open');
                }
            });

            // Toggle current dropdown
            dropdown.classList.toggle('mobile-open');
        };

        // Click handler - only prevents navigation on touch devices
        const clickHandler = function (e) {
            // If this is a touch device, prevent navigation
            if (isUsingTouch === true) {
                e.preventDefault();
                return;
            }

            // For mouse devices, allow normal navigation
            // CSS :hover will handle the dropdown display
        };

        // Mouse move handler - detects mouse input more reliably
        const mouseMoveHandler = function (e) {
            // If we detect mouse movement, we're definitely using mouse
            if (isUsingTouch !== false) {
                isUsingTouch = false;
                // Remove any mobile-open classes since we're using CSS hover
                dropdowns.forEach((dropdown) => {
                    dropdown.classList.remove('mobile-open');
                });
            }
        };

        // Store references for cleanup
        trigger._clickHandler = clickHandler;
        trigger._touchHandler = touchStartHandler;
        trigger._mouseHandler = mouseMoveHandler;

        // Add event listeners
        trigger.addEventListener('click', clickHandler);
        trigger.addEventListener('touchstart', touchStartHandler, {
            passive: false,
        });
        trigger.addEventListener('mousemove', mouseMoveHandler);

        // Handle clicks on dropdown content links
        const dropdownLinks = content.querySelectorAll('a');
        dropdownLinks.forEach((link) => {
            link.addEventListener('click', function (e) {
                // Close dropdown when link is clicked (for touch devices only)
                if (isUsingTouch === true) {
                    dropdown.classList.remove('mobile-open');
                }
            });
        });
    });

    // Close dropdowns when clicking outside (for touch devices only)
    document.addEventListener('click', function (e) {
        if (isUsingTouch === true && !e.target.closest('.nav-dropdown')) {
            dropdowns.forEach((dropdown) => {
                dropdown.classList.remove('mobile-open');
            });
        }
    });

    // Close dropdowns on escape key (for touch devices only)
    document.addEventListener('keydown', function (e) {
        if (isUsingTouch === true && e.key === 'Escape') {
            dropdowns.forEach((dropdown) => {
                dropdown.classList.remove('mobile-open');
            });
        }
    });
}

// Make navigation utilities available globally
window.navigation = {
    loadTopNavigation,
    loadMenu: loadTopNavigation, // Add loadMenu for backward compatibility
    setupFadeNavigation,
    setupPatientNumberValidation,
};

// Also expose individual functions for backward compatibility
window.loadMenu = loadTopNavigation; // Backward compatibility
window.loadTopNavigation = loadTopNavigation;
window.setupFadeNavigation = setupFadeNavigation;
window.setupPatientNumberValidation = setupPatientNumberValidation;
