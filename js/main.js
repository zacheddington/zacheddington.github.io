// Main JavaScript Controller
// Centralized initialization and page routing for the modular application

// Application configuration
const APP_CONFIG = {
    // Define which modules are required for each page
    pageModules: {
        'login.html': ['login'],
        'force-password.html': ['force-password'],
        'admin.html': ['admin'],
        'patients.html': ['patients'],
        'profile.html': ['profile'],
    }, // Shared modules required by all pages
    sharedModules: [
        'api-client',
        'modal-manager',
        'password-utils',
        'field-validation',
        'auth-utils',
        'navigation',
        'table-utils',
        'address-validation',
    ],
};

// Module loading state
let modulesLoaded = {
    shared: false,
    page: false,
};

// Current page information
let currentPage = null;

// Initialize application
function initializeApp() {
    // Determine current page
    currentPage = getCurrentPage();

    // Check authentication for protected pages
    if (shouldCheckAuth(currentPage)) {
        if (!window.authUtils.isAuthenticated()) {
            window.location.href = '/';
            return;
        }

        // Initialize global token monitoring for authenticated pages
        if (window.authUtils.initializeGlobalTokenMonitoring) {
            const tokenValid =
                window.authUtils.initializeGlobalTokenMonitoring();
            if (!tokenValid) {
                return; // Token expired, redirect handled by monitoring
            }
        } // Set up global authenticated fetch wrapper
        if (window.authUtils.createAuthenticatedFetch) {
            window.authUtils.createAuthenticatedFetch();
        }
        // Prevent back navigation to auth pages
        if (window.authUtils.preventAuthPageBackNavigation) {
            window.authUtils.preventAuthPageBackNavigation();
        } // Secure history replacement
        if (window.authUtils.secureHistoryReplacement) {
            window.authUtils.secureHistoryReplacement();
        } // Load navigation menu for authenticated pages
        if (window.navigation && window.navigation.loadMenu) {
            window.navigation.loadMenu();
        }
    } // Initialize page-specific functionality
    initializePage(currentPage);
}

// Get current page name from URL
function getCurrentPage() {
    const path = window.location.pathname; // Handle directory-based paths (all pages are index.html in named folders)
    if (path === '/' || path === '/index.html') {
        return 'index.html'; // Root login page
    } else if (path.startsWith('/welcome/')) {
        return 'welcome.html';
    } else if (path.startsWith('/admin/')) {
        return 'admin.html';
    } else if (path.startsWith('/patients/')) {
        return 'patients.html';
    } else if (path.startsWith('/profile/')) {
        return 'profile.html';
    } else if (path.startsWith('/force-password-change/')) {
        return 'force-password.html';
    } else if (path.startsWith('/2fa-setup/')) {
        return '2fa-setup.html';
    } else {
        // Fallback to filename for other cases
        const page = path.split('/').pop() || 'index.html';
        return page;
    }
}

// Check if page requires authentication
function shouldCheckAuth(page) {
    const publicPages = ['login.html', 'index.html', ''];
    return !publicPages.includes(page);
}

// Initialize page-specific functionality
function initializePage(page) {
    switch (page) {
        case 'login.html':
        case 'index.html':
        case '':
            if (window.loginPage) {
                window.loginPage.initializeLoginPage();
            }
            break;
        case 'welcome.html':
            // Welcome page initialization can go here if needed
            // Navigation is loaded centrally above, no need to call it again

            // Ensure admin-only elements are properly hidden/shown based on user role
            // Use setTimeout to ensure DOM elements are fully rendered
            setTimeout(() => {
                if (window.authUtils && window.authUtils.updateAdminMenuItem) {
                    const userData = JSON.parse(
                        localStorage.getItem('user') || '{}'
                    );
                    const isAdmin = window.authUtils.isUserAdmin
                        ? window.authUtils.isUserAdmin(userData)
                        : false;
                    window.authUtils.updateAdminMenuItem(isAdmin);
                }
            }, 100);
            break;
        case 'force-password.html':
            if (window.forcePasswordPage) {
                window.forcePasswordPage.initializeForcePasswordChangePage();
            }
            break;

        case '2fa-setup.html':
            if (window.tfaSetupPage) {
                window.tfaSetupPage.initialize2FASetupPage();
            }
            break;
        case 'admin.html':
            if (window.adminPage) {
                window.adminPage.initializeAdminPage();
            } // Navigation is loaded centrally above, no need to call it again
            break;
        case 'patients.html':
            if (window.patientsPage) {
                try {
                    // Handle both sync and async initialization
                    const result = window.patientsPage.initializePatientsPage();
                    if (result && typeof result.then === 'function') {
                        result.catch((error) => {
                            console.error(
                                'Error in patients page initialization:',
                                error
                            );
                        });
                    }
                } catch (error) {
                    console.error(
                        'Error calling patientsPage.initializePatientsPage():',
                        error
                    );
                }
            }
            // Navigation is loaded centrally above, no need to call it again
            break;

        case 'profile.html':
            if (window.profilePage) {
                window.profilePage.initializeProfilePage();
            }
            // Navigation is loaded centrally above, no need to call it again
            break;
        default:
            // Navigation is loaded centrally above for authenticated pages
            break;
    }
}

// Enhanced error handler for uncaught errors
function setupGlobalErrorHandling() {
    window.addEventListener('error', function (event) {
        console.error('Global error caught:', event.error);

        // Don't show modal for script loading errors during development
        if (
            event.error &&
            event.error.message &&
            (event.error.message.includes('Loading module') ||
                event.error.message.includes('script error'))
        ) {
            return;
        }

        // Show user-friendly error message for unexpected errors
        if (window.modalManager) {
            window.modalManager.showModal(
                'error',
                'An unexpected error occurred. Please refresh the page and try again.'
            );
        }
    });

    window.addEventListener('unhandledrejection', function (event) {
        console.error('Unhandled promise rejection:', event.reason);

        // Don't show modal for module loading rejections
        if (
            event.reason &&
            typeof event.reason === 'string' &&
            event.reason.includes('Loading module')
        ) {
            return;
        }

        // Show user-friendly error message for unexpected promise rejections
        if (window.modalManager) {
            window.modalManager.showModal(
                'error',
                'An unexpected error occurred. Please refresh the page and try again.'
            );
        }
    });
}

// Page visibility change handler
function setupPageVisibilityHandling() {
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
            // Page became visible - could check authentication status
            if (
                shouldCheckAuth(currentPage) &&
                !window.authUtils.isAuthenticated()
            ) {
                window.location.href = '/';
            }
        }
    });
}

// Keyboard shortcut handling
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function (event) {
        // Escape key closes modals
        if (event.key === 'Escape' && window.modalManager) {
            window.modalManager.closeModal();
        } // Ctrl/Cmd + / shows help (placeholder for future implementation)
        if ((event.ctrlKey || event.metaKey) && event.key === '/') {
            event.preventDefault();
            // Placeholder for help modal
        }
    });
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        initializeApp();
        setupGlobalErrorHandling();
        setupPageVisibilityHandling();
        setupKeyboardShortcuts();
    });
} else {
    // DOM already loaded
    initializeApp();
    setupGlobalErrorHandling();
    setupPageVisibilityHandling();
    setupKeyboardShortcuts();
}

// Expose utility functions to global scope
window.app = {
    getCurrentPage,
    initializePage,
    shouldCheckAuth,
};

// Development helpers (only available in development)
if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
) {
    window.appDebug = {
        currentPage,
        modulesLoaded,
        config: APP_CONFIG,
        reinitialize: initializeApp,
    };
}
