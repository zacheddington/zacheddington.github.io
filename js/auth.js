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

// Enhanced session management with tab-specific tracking
const SessionManager = {
    tabId: null,
    heartbeatInterval: null,
    
    // Generate unique tab ID and initialize session
    initSession: () => {
        // Generate unique tab identifier
        SessionManager.tabId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const loginTime = Date.now();
        
        // Store session data in localStorage with tab-specific key
        const sessionData = {
            loginTime: loginTime,
            lastActivity: loginTime,
            tabId: SessionManager.tabId,
            lastHeartbeat: loginTime
        };
        
        localStorage.setItem('activeSession', JSON.stringify(sessionData));
        
        // Store tab ID in sessionStorage (this will be unique per tab/window)
        sessionStorage.setItem('currentTabId', SessionManager.tabId);
        
        console.log('Session initialized with tab-specific tracking:', SessionManager.tabId);
        
        // Set up tab close detection and heartbeat
        SessionManager.setupTabCloseDetection();
        SessionManager.startHeartbeat();
    },

    // Start heartbeat to keep session alive
    startHeartbeat: () => {
        SessionManager.heartbeatInterval = setInterval(() => {
            const sessionData = SessionManager.getSessionData();
            if (sessionData && sessionData.tabId === SessionManager.tabId) {
                sessionData.lastHeartbeat = Date.now();
                localStorage.setItem('activeSession', JSON.stringify(sessionData));
            }
        }, 30000); // Heartbeat every 30 seconds
    },

    // Stop heartbeat
    stopHeartbeat: () => {
        if (SessionManager.heartbeatInterval) {
            clearInterval(SessionManager.heartbeatInterval);
            SessionManager.heartbeatInterval = null;
        }
    },

    // Update last activity timestamp for current tab
    updateActivity: () => {
        const sessionData = SessionManager.getSessionData();
        if (sessionData && sessionData.tabId === SessionManager.tabId) {
            sessionData.lastActivity = Date.now();
            sessionData.lastHeartbeat = Date.now();
            localStorage.setItem('activeSession', JSON.stringify(sessionData));
        }
    },

    // Get current session data
    getSessionData: () => {
        try {
            const data = localStorage.getItem('activeSession');
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error parsing session data:', e);
            return null;
        }
    },    // Setup tab close detection
    setupTabCloseDetection: () => {
        // Clear session when tab/window is actually closed (not just switched)
        window.addEventListener('beforeunload', (event) => {
            // Only clear if the user is navigating away from the domain or closing the tab
            // Don't clear on internal navigation within the app
            const isInternalNavigation = event.target.activeElement && 
                event.target.activeElement.tagName === 'A' && 
                event.target.activeElement.hostname === window.location.hostname;
            
            if (!isInternalNavigation) {
                // Mark this tab as closed - use a timestamp approach
                const closeTime = Date.now();
                sessionStorage.setItem('tabCloseTime', closeTime.toString());
                
                // Set a delayed clear to distinguish between tab close and refresh
                setTimeout(() => {
                    const currentCloseTime = sessionStorage.getItem('tabCloseTime');
                    if (currentCloseTime === closeTime.toString()) {
                        // Tab was actually closed, not just refreshed
                        SessionManager.clearSession();
                    }
                }, 100);
            }
        });
        
        // Handle page refresh vs tab close detection
        window.addEventListener('load', () => {
            // Clear any pending close time since the page loaded successfully
            sessionStorage.removeItem('tabCloseTime');
        });
    },    // Check if session is valid for current tab
    isSessionValid: () => {
        // Get stored tab ID for this tab/window
        const currentTabId = sessionStorage.getItem('currentTabId');
        SessionManager.tabId = currentTabId;
        
        if (!currentTabId) {
            console.log('Session invalid: No tab ID found');
            return false;
        }
        
        const sessionData = SessionManager.getSessionData();
        
        console.log('Session validation check:', {
            currentTabId: currentTabId,
            sessionData: sessionData,
            hasSessionData: !!sessionData
        });

        if (!sessionData) {
            console.log('Session invalid: No session data found');
            return false;
        }
        
        // Check if this tab's session matches the active session
        if (sessionData.tabId !== currentTabId) {
            console.log('Session invalid: Tab ID mismatch');
            return false;
        }
        
        const now = Date.now();
        const { loginTime, lastActivity, lastHeartbeat } = sessionData;

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

        // Check if heartbeat is too old (indicates tab might be closed)
        if (lastHeartbeat && now - lastHeartbeat > 120000) { // 2 minutes without heartbeat
            console.log('Session expired: Heartbeat timeout - tab may be closed');
            return false;
        }

        console.log('Session validation passed');
        return true;
    },

    // Clear all session data
    clearSession: () => {
        SessionManager.stopHeartbeat();
        localStorage.removeItem('activeSession');
        sessionStorage.clear();
        console.log('Session data cleared');
    }
};

// Enhanced logout function
const performLogout = async (reason = 'User initiated') => {
    console.log(`Logout triggered: ${reason}`);
    
    try {        // Call server logout endpoint if token exists
        const token = localStorage.getItem('token');
        if (token) {
            // Detect if running locally or in production
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
            
            await fetch(`${API_URL}/api/logout`, {
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
    }

    // Check if this is a new tab/window - if no tab ID exists, this is a fresh tab
    const currentTabId = sessionStorage.getItem('currentTabId');
    
    if (!currentTabId) {
        console.log('New tab detected - no tab ID found, redirecting to login');
        // Don't clear session data - just redirect this tab to login
        // The original logged-in tab should still work
        window.location.href = '/';
        return;
    }

    // Check if session is valid for this specific tab
    if (!SessionManager.isSessionValid()) {
        console.log('Session invalid or expired, logging out');
        performLogout('Invalid session');
        return;
    }

    // Restore the tab ID and start heartbeat if not already running
    SessionManager.tabId = currentTabId;
    if (!SessionManager.heartbeatInterval) {
        SessionManager.startHeartbeat();
    }

    // Start monitoring for this session
    startActivityMonitoring();
    
    console.log('Authentication check passed for tab:', currentTabId);
};

// Make logout function globally available
window.performLogout = performLogout;
window.SessionManager = SessionManager;

// Run auth check when page loads
document.addEventListener('DOMContentLoaded', checkAuth);