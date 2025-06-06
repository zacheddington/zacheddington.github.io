// Only the login page is public
const publicPaths = ['/index.html', '/', ''];

// Session management constants
const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every minute
const ACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes of inactivity

// Check if current page is public
const isPublicPage = () => {
    const fullPath = window.location.pathname;
    // Normalize path by removing trailing slash
    const normalizedPath = fullPath.endsWith('/') ? fullPath.slice(0, -1) : fullPath;
    return publicPaths.includes(normalizedPath) || normalizedPath === '';
};

// Enhanced session management
const SessionManager = {
    // Store login timestamp using sessionStorage (clears when browser closes)
    initSession: () => {
        const loginTime = Date.now();
        sessionStorage.setItem('loginTime', loginTime.toString());
        sessionStorage.setItem('lastActivity', loginTime.toString());
        console.log('Session initialized with browser-lifetime storage');
    },

    // Update last activity timestamp
    updateActivity: () => {
        sessionStorage.setItem('lastActivity', Date.now().toString());
    },

    // Check if session is valid
    isSessionValid: () => {
        const loginTime = parseInt(sessionStorage.getItem('loginTime') || '0');
        const lastActivity = parseInt(sessionStorage.getItem('lastActivity') || '0');
        const now = Date.now();

        // If no session data, session is invalid
        if (!loginTime || !lastActivity) {
            return false;
        }

        // Check if total session time exceeded
        if (now - loginTime > SESSION_TIMEOUT) {
            console.log('Session expired: Total session time exceeded');
            return false;
        }

        // Check if user has been inactive too long
        if (now - lastActivity > ACTIVITY_TIMEOUT) {
            console.log('Session expired: Inactivity timeout');
            return false;
        }

        return true;
    },

    // Clear all session data
    clearSession: () => {
        localStorage.clear();
        sessionStorage.clear();
        console.log('All session data cleared');
    }
};

// Enhanced logout function
const performLogout = async (reason = 'User initiated') => {
    console.log(`Logout triggered: ${reason}`);
    
    try {
        // Call server logout endpoint if token exists
        const token = localStorage.getItem('token');
        if (token) {
            await fetch('https://integrisneuro-eec31e4aaab1.herokuapp.com/api/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }).catch(err => console.log('Server logout call failed:', err));
        }
    } catch (err) {
        console.log('Logout API call failed:', err);
    }

    // Clear all local data
    SessionManager.clearSession();
    
    // Redirect to login page
    window.location.href = '/';
};

// Activity monitoring
const startActivityMonitoring = () => {
    // Track user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    activityEvents.forEach(event => {
        document.addEventListener(event, SessionManager.updateActivity, true);
    });

    // Check session validity periodically
    setInterval(() => {
        if (!isPublicPage() && !SessionManager.isSessionValid()) {
            performLogout('Session timeout');
        }
    }, ACTIVITY_CHECK_INTERVAL);

    console.log('Activity monitoring started');
};

// Check authentication
const checkAuth = () => {
    if (isPublicPage()) {
        return; // Public page, no auth required
    }

    const token = localStorage.getItem('token');
    
    if (!token) {
        console.log('No token found, redirecting to login');
        window.location.href = '/';
        return;
    }    // Check if session is valid (this handles browser close scenario)
    if (!SessionManager.isSessionValid()) {
        // If user has a valid token but no session data, initialize session
        // This handles the case where user logged in from login page without auth.js
        const token = localStorage.getItem('token');
        if (token) {
            console.log('Valid token found but no session data, initializing session');
            SessionManager.initSession();
        } else {
            console.log('Session invalid, logging out');
            performLogout('Invalid session');
            return;
        }
    }

    // Start monitoring for this session
    startActivityMonitoring();
    
    console.log('Authentication check passed');
};

// Make logout function globally available
window.performLogout = performLogout;
window.SessionManager = SessionManager;

// Run auth check when page loads
document.addEventListener('DOMContentLoaded', checkAuth);