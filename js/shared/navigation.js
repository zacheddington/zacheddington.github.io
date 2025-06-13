// Navigation Utilities
// Handles menu loading, navigation, and page transitions

// Load hamburger menu
async function loadMenu() {
    try {
        const hamburgerContainer = document.getElementById('hamburger-menu');
        if (!hamburgerContainer) {
            console.warn('Hamburger container not found');
            return;
        }

        // Determine the correct path to menu.html based on current location
        const path = window.location.pathname;
        let menuPath = '/html/menu.html';

        // If we're in a subfolder, adjust the path
        if (
            path.includes('/admin/') ||
            path.includes('/patients/') ||
            path.includes('/profile/') ||
            path.includes('/welcome/') ||
            path.includes('/view_eeg/') ||
            path.includes('/enter_eeg/') ||
            path.includes('/force-password-change/') ||
            path.includes('/2fa-setup/')
        ) {
            const depth = (path.match(/\//g) || []).length - 1;
            if (depth > 1) {
                menuPath = '../../html/menu.html';
            } else {
                menuPath = '../html/menu.html';
            }
        }

        const response = await fetch(menuPath);
        if (!response.ok) {
            throw new Error(`Failed to load menu: ${response.status}`);
        }

        const menuHTML = await response.text();
        hamburgerContainer.innerHTML = menuHTML; // Add hamburger menu functionality
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const sideMenu = document.getElementById('sideMenu');

        // Create overlay element for better menu interaction
        const menuOverlay = document.createElement('div');
        menuOverlay.className = 'menu-overlay';
        menuOverlay.id = 'menuOverlay';
        document.body.appendChild(menuOverlay);

        if (hamburgerBtn && sideMenu) {
            // Close menu function
            function closeMenu() {
                sideMenu.classList.remove('open');
                hamburgerBtn.classList.remove('active');
                menuOverlay.classList.remove('active');
                document.body.classList.remove('menu-active');

                // Reset sidebar positioning when closed
                sideMenu.style.left = '-300px';
            }

            // Ensure menu is closed on page load (handles any cached state)
            closeMenu();

            // Add comprehensive browser navigation handlers to close menu
            window.addEventListener('popstate', closeMenu);
            window.addEventListener('beforeunload', closeMenu);
            window.addEventListener('pagehide', closeMenu);

            // Add page visibility change handler (for back/forward navigation)
            document.addEventListener('visibilitychange', function () {
                if (document.visibilityState === 'visible') {
                    // Page became visible again (user returned from back/forward)
                    closeMenu();
                }
            });

            // Add window focus handler (additional safety net)
            window.addEventListener('focus', closeMenu);

            // Add pageshow event (fires when page is loaded from cache)
            window.addEventListener('pageshow', function (event) {
                if (event.persisted) {
                    // Page was loaded from cache (back/forward navigation)
                    closeMenu();
                }
            });
            hamburgerBtn.addEventListener('click', function () {
                const isOpening = !sideMenu.classList.contains('open');
                sideMenu.classList.toggle('open');
                hamburgerBtn.classList.toggle('active');
                menuOverlay.classList.toggle('active', isOpening);
                document.body.classList.toggle('menu-active', isOpening);

                // Force sidebar positioning when opening
                if (isOpening) {
                    sideMenu.style.position = 'fixed';
                    sideMenu.style.top = '0';
                    sideMenu.style.left = '0';
                    sideMenu.style.height = '100vh';
                    sideMenu.style.zIndex = '1000';
                    sideMenu.style.overflowY = 'auto';
                }
            });

            // Close menu when clicking outside or on overlay
            menuOverlay.addEventListener('click', closeMenu);

            document.addEventListener('click', function (e) {
                if (
                    !hamburgerBtn.contains(e.target) &&
                    !sideMenu.contains(e.target)
                ) {
                    closeMenu();
                }
            });

            // Hide current page in menu
            const currentPath = window.location.pathname;
            const currentPage =
                currentPath.split('/').filter(Boolean).pop() || 'welcome';

            const menuItems = sideMenu.querySelectorAll('a[data-page]');
            menuItems.forEach((item) => {
                if (item.getAttribute('data-page') === currentPage) {
                    item.parentElement.style.display = 'none';
                }
            });

            // Check if user is admin and show/hide admin link
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            const isAdmin = isUserAdmin(userData);
            updateAdminMenuItem(isAdmin);
        }

        // Add click handler for logout with confirmation (prevent duplicates)
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink && !logoutLink.hasAttribute('data-logout-handler')) {
            logoutLink.setAttribute('data-logout-handler', 'true');
            logoutLink.addEventListener('click', async (e) => {
                e.preventDefault();

                // Use enhanced logout modal instead of confirm()
                window.modalManager.showLogoutConfirmation(async () => {
                    // Show logging out indicator
                    logoutLink.textContent = 'Logging out...';
                    logoutLink.style.pointerEvents = 'none';

                    try {
                        // Use the auth-utils logout function
                        if (window.authUtils && window.authUtils.logout) {
                            await window.authUtils.logout(
                                'User clicked logout'
                            );
                        } else {
                            // Fallback logout
                            localStorage.clear();
                            sessionStorage.clear();
                            window.location.href = '/';
                        }
                    } catch (err) {
                        console.error('Logout error:', err);
                        // Force logout even if server call fails
                        localStorage.clear();
                        sessionStorage.clear();
                        window.location.href = '/';
                    }
                });
            });
        }
    } catch (err) {
        console.error('Error loading menu:', err);
    }
}

// Setup navigation with fade effects
function setupFadeNavigation() {
    // No longer needed - page-transitions.js handles all navigation automatically
    // This function is kept for backward compatibility but does nothing
    console.log(
        'setupFadeNavigation called - transitions now handled by page-transitions.js'
    );
}

// Setup patient number validation (specific utility)
function setupPatientNumberValidation() {
    const patientNumberInput = document.getElementById('patientNumber');
    if (patientNumberInput) {
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = 'Only numbers and hyphens are allowed';

        // Get the input wrapper and append tooltip
        const inputWrapper = patientNumberInput.closest('.input-wrapper');
        if (inputWrapper) {
            inputWrapper.appendChild(tooltip);
        }

        let tooltipTimeout;

        const showTooltip = () => {
            tooltip.classList.add('show');
            clearTimeout(tooltipTimeout);
            tooltipTimeout = setTimeout(() => {
                tooltip.classList.remove('show');
            }, 2000);
        };

        patientNumberInput.addEventListener('input', function (e) {
            // Remove any characters that are not numbers or hyphens
            const value = e.target.value;
            const filteredValue = value.replace(/[^0-9\-]/g, '');

            if (value !== filteredValue) {
                e.target.value = filteredValue;
                showTooltip();
            }
        });

        // Also prevent invalid characters from being typed and show tooltip
        patientNumberInput.addEventListener('keypress', function (e) {
            const char = String.fromCharCode(e.which);
            if (!/[0-9\-]/.test(char)) {
                e.preventDefault();
                showTooltip();
            }
        });

        // Hide tooltip when input is focused and user starts typing valid characters
        patientNumberInput.addEventListener('focus', function () {
            tooltip.classList.remove('show');
        });
    }
}

// Make navigation utilities available globally
window.navigation = {
    loadMenu,
    setupFadeNavigation,
    setupPatientNumberValidation,
};

// Also expose individual functions for backward compatibility
window.loadMenu = loadMenu;
window.setupFadeNavigation = setupFadeNavigation;
window.setupPatientNumberValidation = setupPatientNumberValidation;
