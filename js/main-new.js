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
        'profile.html': ['profile']
    },
    
    // Shared modules required by all pages
    sharedModules: [
        'api-client',
        'modal-manager',
        'password-utils',
        'field-validation',
        'auth-utils',
        'navigation'
    ]
};

// Module loading state
let modulesLoaded = {
    shared: false,
    page: false
};

// Current page information
let currentPage = null;

// Initialize application
function initializeApp() {
    // Determine current page
    currentPage = getCurrentPage();
    console.log('Initializing app for page:', currentPage);
    
    // Check authentication for protected pages
    if (shouldCheckAuth(currentPage)) {
        if (!window.authUtils.isAuthenticated()) {
            console.log('User not authenticated, redirecting to login');
            window.location.href = '/login.html';
            return;
        }
    }
    
    // Initialize page-specific functionality
    initializePage(currentPage);
}

// Get current page name from URL
function getCurrentPage() {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    return page;
}

// Check if page requires authentication
function shouldCheckAuth(page) {
    const publicPages = ['login.html', 'index.html', ''];
    return !publicPages.includes(page);
}

// Initialize page-specific functionality
function initializePage(page) {
    console.log('Initializing page functionality for:', page);
    
    switch(page) {
        case 'login.html':
            if (window.loginPage) {
                window.loginPage.initializeLoginPage();
            }
            break;
            
        case 'force-password.html':
            if (window.forcePasswordPage) {
                window.forcePasswordPage.initializeForcePasswordPage();
            }
            break;
            
        case 'admin.html':
            if (window.adminPage) {
                window.adminPage.initializeAdminPage();
            }
            break;
            
        case 'patients.html':
            if (window.patientsPage) {
                window.patientsPage.initializePatientsPage();
            }
            break;
            
        case 'profile.html':
            if (window.profilePage) {
                window.profilePage.initializeProfilePage();
            }
            break;
            
        default:
            console.log('No specific initialization for page:', page);
            // Load basic menu functionality if hamburger menu exists
            if (document.getElementById('hamburger-menu') && window.navigation) {
                window.navigation.loadMenu();
            }
            break;
    }
}

// Enhanced error handler for uncaught errors
function setupGlobalErrorHandling() {
    window.addEventListener('error', function(event) {
        console.error('Global error caught:', event.error);
        
        // Don't show modal for script loading errors during development
        if (event.error && event.error.message && 
            (event.error.message.includes('Loading module') || 
             event.error.message.includes('script error'))) {
            return;
        }
        
        // Show user-friendly error message for unexpected errors
        if (window.modalManager) {
            window.modalManager.showModal('error', 
                'An unexpected error occurred. Please refresh the page and try again.');
        }
    });
    
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        
        // Don't show modal for module loading rejections
        if (event.reason && typeof event.reason === 'string' && 
            event.reason.includes('Loading module')) {
            return;
        }
        
        // Show user-friendly error message for unexpected promise rejections
        if (window.modalManager) {
            window.modalManager.showModal('error', 
                'An unexpected error occurred. Please refresh the page and try again.');
        }
    });
}

// Page visibility change handler
function setupPageVisibilityHandling() {
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            // Page became visible - could check authentication status
            if (shouldCheckAuth(currentPage) && !window.authUtils.isAuthenticated()) {
                window.location.href = '/login.html';
            }
        }
    });
}

// Keyboard shortcut handling
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(event) {
        // Escape key closes modals
        if (event.key === 'Escape' && window.modalManager) {
            window.modalManager.closeModal();
        }
        
        // Ctrl/Cmd + / shows help (placeholder for future implementation)
        if ((event.ctrlKey || event.metaKey) && event.key === '/') {
            event.preventDefault();
            // Placeholder for help modal
            console.log('Help shortcut pressed');
        }
    });
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM loaded, initializing app...');
        initializeApp();
        setupGlobalErrorHandling();
        setupPageVisibilityHandling();
        setupKeyboardShortcuts();
    });
} else {
    // DOM already loaded
    console.log('DOM already loaded, initializing app...');
    initializeApp();
    setupGlobalErrorHandling();
    setupPageVisibilityHandling();
    setupKeyboardShortcuts();
}

// Expose utility functions to global scope
window.app = {
    getCurrentPage,
    initializePage,
    shouldCheckAuth
};

// Development helpers (only available in development)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.appDebug = {
        currentPage,
        modulesLoaded,
        config: APP_CONFIG,
        reinitialize: initializeApp
    };
    
    console.log('Development mode: appDebug object available');
}
