// Authentication Utilities
// Handles user authentication, admin checks, and session management

// Global token expiration handling
let tokenExpirationCheckInterval = null;
let isSessionExpiredModalShown = false;

// Check if JWT token is valid and not expired
function checkTokenValidity() {
    const token = localStorage.getItem('token');

    if (!token) {
        return false;
    }

    try {
        // Parse JWT token (simple base64 decode)
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
            console.warn('Invalid token format');
            return false;
        }

        const payload = JSON.parse(atob(tokenParts[1]));

        // Check if token has expired
        const currentTime = Math.floor(Date.now() / 1000);

        if (payload.exp && payload.exp < currentTime) {
            console.warn('Token has expired');
            return false;
        }

        return true;
    } catch (error) {
        console.warn('Error checking token validity:', error);
        return false;
    }
}

// Handle authentication errors globally
function handleAuthError(response, context = '') {
    if (response.status === 401) {
        console.error(
            `Authentication failed${
                context ? ' for ' + context : ''
            } - token may be expired`
        );
        handleSessionExpiration(
            'Your session has expired. Please log in again.'
        );
        return true;
    } else if (response.status === 403) {
        console.error(
            `Access denied${
                context ? ' for ' + context : ''
            } - insufficient permissions`
        );
        handleAccessDenied(
            'You do not have permission to access this resource.'
        );
        return true;
    }
    return false;
}

// Handle session expiration
function handleSessionExpiration(
    message = 'Your session has expired. Please log in again.'
) {
    if (isSessionExpiredModalShown) {
        return; // Prevent multiple modals
    }

    isSessionExpiredModalShown = true;

    // Clear expired token
    localStorage.removeItem('token');

    if (window.modalManager) {
        window.modalManager.showModal('error', message);
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
    } else {
        // Fallback if modalManager not available
        alert(message);
        window.location.href = '/';
    }
}

// Handle access denied (403) errors
function handleAccessDenied(
    message = 'Access denied. You do not have permission to perform this action.'
) {
    if (window.modalManager) {
        window.modalManager.showModal('error', message);
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
        if (!currentPath.includes('/index.html') && currentPath !== '/') {
            handleSessionExpiration();
            return false;
        }
    }

    // Set up periodic token checking (every 5 minutes)
    if (tokenExpirationCheckInterval) {
        clearInterval(tokenExpirationCheckInterval);
    }

    tokenExpirationCheckInterval = setInterval(() => {
        if (!checkTokenValidity()) {
            const currentPath = window.location.pathname;
            // Only show expiration if not on login page
            if (!currentPath.includes('/index.html') && currentPath !== '/') {
                handleSessionExpiration();
            }
        }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return true;
}

// Create a global fetch wrapper that handles auth errors
function createAuthenticatedFetch() {
    const originalFetch = window.fetch;

    window.fetch = async function (url, options = {}) {
        // Add token to headers if not present and token exists
        const token = localStorage.getItem('token');
        if (
            token &&
            options.headers &&
            !options.headers['Authorization'] &&
            !options.headers.Authorization
        ) {
            options.headers['Authorization'] = `Bearer ${token}`;
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
                if (url.includes('/api/')) {
                    handleAuthError(response, `API call to ${url}`);
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
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!token || !user) {
        return false;
    }

    try {
        const userData = JSON.parse(user);
        return userData && Object.keys(userData).length > 0;
    } catch (error) {
        console.error('Error parsing user data:', error);
        return false;
    }
}

// Utility functions for admin detection and menu management
function isUserAdmin(userData) {
    console.log('🔍 isUserAdmin: Input userData:', userData);

    if (!userData) {
        console.log('❌ isUserAdmin: No userData provided');
        return false;
    }

    // Use server-determined admin status with fallback for old data
    let isAdminUser = userData.isAdmin === true;
    console.log('🔍 isUserAdmin: userData.isAdmin === true?', isAdminUser);

    // Fallback: If role data is missing and username is admin, assume admin
    if (userData.isAdmin === undefined && userData.username === 'admin') {
        isAdminUser = true;
        console.log('🔍 isUserAdmin: Fallback 1 - username is "admin"');
    }

    // Additional fallback: if username contains 'admin' (case insensitive)
    if (
        !isAdminUser &&
        userData.username &&
        userData.username.toLowerCase().includes('admin')
    ) {
        isAdminUser = true;
        console.log('🔍 isUserAdmin: Fallback 2 - username contains "admin"');
    }

    console.log('✅ isUserAdmin: Final result:', isAdminUser);
    return isAdminUser;
}

function updateAdminUI(isAdmin) {
    if (isAdmin) {
        document.body.classList.add('is-admin');
    } else {
        document.body.classList.remove('is-admin');
    }
}

function updateAdminMenuItem(isAdmin) {
    console.log('🔍 updateAdminMenuItem: Called with isAdmin:', isAdmin);
    // Update body class to control admin-only elements via CSS
    if (isAdmin) {
        document.body.classList.add('is-admin');
        console.log('✅ updateAdminMenuItem: Added is-admin class to body');
    } else {
        document.body.classList.remove('is-admin');
        console.log('❌ updateAdminMenuItem: Removed is-admin class from body');
    }

    // Log current body classes
    console.log(
        '🔍 updateAdminMenuItem: Current body classes:',
        document.body.className
    );
}

// Add session status indicator
function addSessionStatusIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'session-indicator';
    indicator.id = 'sessionStatus';
    document.body.appendChild(indicator);

    // Update session status every 30 seconds
    const updateStatus = () => {
        const token = localStorage.getItem('token');
        const userData = JSON.parse(localStorage.getItem('user') || '{}');

        if (token && userData && Object.keys(userData).length > 0) {
            indicator.textContent = '🟢 Connected';
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
            indicator.textContent = '🔴 Disconnected';
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
    window.addEventListener('beforeunload', function () {
        console.log('🟠 BEFOREUNLOAD triggered', {
            currentPath: window.location.pathname,
            successfulLoginNavigation: sessionStorage.getItem(
                'successfulLoginNavigation'
            ),
            token: localStorage.getItem('token') ? 'EXISTS' : 'MISSING',
        });

        // Only clear auth data if:
        // 1. We're on the login page AND
        // 2. No successful login navigation is in progress
        if (
            (window.location.pathname === '/' ||
                window.location.pathname === '/index.html') &&
            !sessionStorage.getItem('successfulLoginNavigation')
        ) {
            console.log(
                '🟠 CLEARING AUTH DATA ON BEFOREUNLOAD - User leaving login page'
            );
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('activeSession');
            sessionStorage.clear();
        } else {
            console.log(
                '🟠 PRESERVING AUTH DATA ON BEFOREUNLOAD - Successful login navigation in progress'
            );
        }
    });

    // Prevent right-click context menu that might expose navigation options
    document.addEventListener('contextmenu', function (event) {
        event.preventDefault();
    });

    // Enhanced security for browser back/forward navigation
    window.addEventListener('popstate', function (event) {
        const token = localStorage.getItem('token');
        const currentPath = window.location.pathname;

        console.log('🟡 POPSTATE - Browser navigation detected', {
            currentPath,
            hasToken: !!token,
            state: event.state,
        });

        // If user navigated back to an authenticated page without a token, redirect to login
        const authenticatedPages = [
            '/welcome/',
            '/profile/',
            '/admin/',
            '/patients/',
            '/view_eeg/',
            '/enter_eeg/',
            '/2fa-setup/',
            '/force-password-change/',
        ];
        const isAuthenticatedPage = authenticatedPages.some((page) =>
            currentPath.includes(page)
        );

        if (isAuthenticatedPage && !token) {
            console.log(
                '🔴 UNAUTHORIZED ACCESS ATTEMPT - Redirecting to login'
            );
            window.location.replace('/');
        }
    });
}

// Replace browser history to prevent navigation back to login
function secureHistoryReplacement() {
    const currentPath = window.location.pathname;

    // Only do this for authenticated pages
    const authenticatedPages = [
        '/welcome/',
        '/admin/',
        '/patients/',
        '/profile/',
        '/enter_eeg/',
        '/view_eeg/',
    ];

    if (authenticatedPages.some((page) => currentPath.includes(page))) {
        // Replace the current history entry to break the back button chain
        if (window.history.replaceState) {
            window.history.replaceState(
                { page: 'authenticated', preventBack: true },
                '',
                window.location.href
            );
        }

        // Add additional history entry to make back button less functional
        if (window.history.pushState) {
            window.history.pushState(
                { page: 'authenticated', preventBack: true },
                '',
                window.location.href
            );
        }
    }
}

// Prevent navigation back to auth pages once authenticated
function preventAuthPageBackNavigation() {
    // Only run this on authenticated pages
    const currentPath = window.location.pathname;
    const authPages = [
        '/',
        '/index.html',
        '/2fa-setup/',
        '/force-password-change/',
    ];

    if (authPages.some((page) => currentPath.includes(page))) {
        return; // Don't prevent navigation on auth pages themselves
    }

    // Replace current history entry to prevent back navigation to auth pages
    if (window.history.replaceState) {
        window.history.replaceState(null, '', window.location.href);
    }

    // Listen for back button and redirect to current page
    window.addEventListener('popstate', function (event) {
        const token = localStorage.getItem('token');
        if (token && checkTokenValidity()) {
            // User is authenticated, stay on current page
            window.history.pushState(null, '', window.location.href);
        }
    });
}

// Perform secure logout
async function logout(reason = 'User logout') {
    try {
        console.log('🔓 Logging out user:', reason);

        // Attempt to notify server of logout
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const API_URL = window.apiClient.getAPIUrl();
                await fetch(`${API_URL}/api/logout`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ reason }),
                });
            } catch (error) {
                console.warn('Server logout notification failed:', error);
                // Continue with client-side logout even if server call fails
            }
        }

        // Clear all authentication data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.clear();

        // Clear any cached data
        if ('caches' in window) {
            try {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map((name) => caches.delete(name))
                );
            } catch (error) {
                console.warn('Failed to clear caches:', error);
            }
        }

        // Redirect to login page
        window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
        // Force logout even on error
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
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
    checkTokenValidity,
    handleAuthError,
    handleSessionExpiration,
    handleAccessDenied,
    initializeGlobalTokenMonitoring,
    stopGlobalTokenMonitoring,
    createAuthenticatedFetch,
    preventAuthPageBackNavigation,
    secureHistoryReplacement,
};

// Backward compatibility - individual function exports
window.isUserAdmin = isUserAdmin;
window.updateAdminUI = updateAdminUI;
window.updateAdminMenuItem = updateAdminMenuItem;
window.addSessionStatusIndicator = addSessionStatusIndicator;
window.setupSecureHistoryManagement = setupSecureHistoryManagement;
window.checkTokenValidity = checkTokenValidity;
window.handleAuthError = handleAuthError;
window.handleSessionExpiration = handleSessionExpiration;
window.initializeGlobalTokenMonitoring = initializeGlobalTokenMonitoring;
