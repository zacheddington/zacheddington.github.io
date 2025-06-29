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
            setupTopNavigation();
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
    if (window.authUtils && window.authUtils.updateAdminMenuItem) {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        // Use proper admin detection
        const isAdmin = window.authUtils.isUserAdmin
            ? window.authUtils.isUserAdmin(userData)
            : false;
        window.authUtils.updateAdminMenuItem(isAdmin);
    }
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
 * Setup mobile-friendly dropdown navigation
 */
function setupMobileDropdowns() {
    const dropdowns = document.querySelectorAll('.nav-dropdown');
    console.log('Setting up mobile dropdowns, found:', dropdowns.length);

    dropdowns.forEach((dropdown) => {
        const trigger = dropdown.querySelector('.dropdown-trigger');
        const content = dropdown.querySelector('.dropdown-content');

        if (!trigger || !content) {
            console.warn('Missing trigger or content for dropdown:', dropdown);
            return;
        }

        // Remove existing listeners to prevent duplicates
        const existingHandler = trigger._mobileDropdownHandler;
        if (existingHandler) {
            trigger.removeEventListener('click', existingHandler);
        }

        // Create new click handler
        const clickHandler = function (e) {
            console.log(
                'Dropdown trigger clicked:',
                trigger.textContent.trim()
            );

            // Check if we're on a mobile device or small screen
            const isMobile =
                window.innerWidth <= 768 ||
                ('ontouchstart' in window && window.innerWidth <= 1024);

            if (!isMobile) {
                // On desktop, allow normal navigation to the main page
                // Don't prevent default, let the link work normally
                console.log('Desktop mode: allowing navigation');
                return;
            }

            // Mobile behavior: toggle dropdown
            e.preventDefault();
            e.stopPropagation();

            // Close other open dropdowns
            dropdowns.forEach((otherDropdown) => {
                if (otherDropdown !== dropdown) {
                    otherDropdown.classList.remove('mobile-open');
                }
            });

            // Toggle current dropdown
            const isOpen = dropdown.classList.contains('mobile-open');
            if (isOpen) {
                dropdown.classList.remove('mobile-open');
                console.log('Closed dropdown');
                console.log(
                    'DEBUG: Dropdown classes after close:',
                    dropdown.className
                );
            } else {
                dropdown.classList.add('mobile-open');
                console.log('Opened dropdown');
                console.log(
                    'DEBUG: Dropdown classes after open:',
                    dropdown.className
                );
                console.log('DEBUG: Dropdown content element:', content);
                console.log('DEBUG: Body classes:', document.body.className);
                console.log(
                    'DEBUG: Is admin body?',
                    document.body.classList.contains('is-admin')
                );
                console.log('DEBUG: Window width:', window.innerWidth);

                const computedStyle = window.getComputedStyle(content);
                console.log(
                    'DEBUG: Dropdown content opacity:',
                    computedStyle.opacity
                );
                console.log(
                    'DEBUG: Dropdown content visibility:',
                    computedStyle.visibility
                );
                console.log(
                    'DEBUG: Dropdown content display:',
                    computedStyle.display
                );
                console.log(
                    'DEBUG: Dropdown content background:',
                    computedStyle.backgroundColor
                );
                console.log(
                    'DEBUG: Dropdown content border:',
                    computedStyle.border
                );
                console.log(
                    'DEBUG: Dropdown content z-index:',
                    computedStyle.zIndex
                );
                console.log(
                    'DEBUG: Dropdown content position:',
                    computedStyle.position
                );

                // Try to force the styles directly via JavaScript to test
                // Use the same aggressive approach that worked for the test element
                content.style.cssText = `
                    transition: none !important;
                    opacity: 1 !important;
                    visibility: visible !important;
                    background: red !important;
                    border: 5px solid lime !important;
                    z-index: 999999 !important;
                    display: block !important;
                    position: fixed !important;
                    top: 150px !important;
                    left: 20px !important;
                    width: 250px !important;
                    height: 150px !important;
                    pointer-events: auto !important;
                `;

                // Log the dropdown content to see what's inside
                console.log('DEBUG: Dropdown innerHTML:', content.innerHTML);
                console.log(
                    'DEBUG: Dropdown children count:',
                    content.children.length
                );

                // Add debug text to make sure it has visible content
                const originalContent = content.innerHTML;
                content.innerHTML = `
                    <div style="color: white !important; font-size: 16px !important; padding: 10px !important; font-weight: bold !important;">
                        DROPDOWN MENU SHOULD BE HERE!
                        <br>Original content below:
                    </div>
                    ${originalContent}
                `;

                // Create a test element that should definitely be visible
                const testDiv = document.createElement('div');
                testDiv.innerHTML = 'TEST DROPDOWN - YOU SHOULD SEE THIS!';
                testDiv.style.cssText = `
                    position: fixed !important;
                    top: 100px !important;
                    left: 20px !important;
                    width: 300px !important;
                    height: 100px !important;
                    background: lime !important;
                    color: black !important;
                    border: 5px solid blue !important;
                    z-index: 999999 !important;
                    font-size: 16px !important;
                    font-weight: bold !important;
                    display: block !important;
                    opacity: 1 !important;
                    visibility: visible !important;
                    pointer-events: auto !important;
                `;
                document.body.appendChild(testDiv);

                // Remove test element and restore content after 3 seconds
                setTimeout(() => {
                    if (testDiv.parentNode) {
                        testDiv.parentNode.removeChild(testDiv);
                    }
                    content.innerHTML = originalContent;
                }, 3000);

                // Get positioning info
                const rect = content.getBoundingClientRect();
                console.log('DEBUG: Dropdown positioning:');
                console.log('  - Top:', rect.top);
                console.log('  - Left:', rect.left);
                console.log('  - Bottom:', rect.bottom);
                console.log('  - Right:', rect.right);
                console.log('  - Width:', rect.width);
                console.log('  - Height:', rect.height);
                console.log('  - Viewport height:', window.innerHeight);
                console.log('  - Viewport width:', window.innerWidth);

                // Check if it's visible in viewport
                const isVisible =
                    rect.top < window.innerHeight &&
                    rect.bottom > 0 &&
                    rect.left < window.innerWidth &&
                    rect.right > 0;
                console.log('  - Is in viewport?', isVisible);

                console.log(
                    'DEBUG: Forced styles applied directly via JS (transitions disabled)'
                );
            }
        };

        // Store reference for cleanup
        trigger._mobileDropdownHandler = clickHandler;

        // Add primary event listener
        trigger.addEventListener('click', clickHandler);

        // Only add touchend for actual touch devices to prevent double-firing
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            trigger.addEventListener(
                'touchend',
                function (e) {
                    // Only handle touchend on mobile screens
                    if (window.innerWidth <= 768) {
                        // Prevent the click event from also firing
                        e.preventDefault();
                        clickHandler(e);
                    }
                },
                { passive: false }
            );
        }

        // Handle clicks on dropdown content links
        const dropdownLinks = content.querySelectorAll('a');
        dropdownLinks.forEach((link) => {
            link.addEventListener('click', function (e) {
                // Allow normal navigation, just close the dropdown
                dropdown.classList.remove('mobile-open');
                console.log('Dropdown link clicked, closing dropdown');
            });
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.nav-dropdown')) {
            dropdowns.forEach((dropdown) => {
                dropdown.classList.remove('mobile-open');
            });
        }
    });

    // Close dropdowns on escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            dropdowns.forEach((dropdown) => {
                dropdown.classList.remove('mobile-open');
            });
        }
    });
}

// Handle window resize to ensure dropdowns work correctly on orientation change
let resizeTimeout;
window.addEventListener('resize', function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function () {
        console.log('Window resized, reinitializing mobile dropdowns');

        // Close all mobile dropdowns when switching to desktop
        const dropdowns = document.querySelectorAll('.nav-dropdown');
        dropdowns.forEach((dropdown) => {
            dropdown.classList.remove('mobile-open');
        });

        setupMobileDropdowns();
    }, 250);
});

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
