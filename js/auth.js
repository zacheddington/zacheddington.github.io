// Only the login page is public, force-password-change requires authentication but has special handling
const publicPaths = ['/index.html', '/', ''];
const specialAuthPaths = ['/force-password-change/', '/force-password-change/index.html'];

// Session management constants
const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every minute
const ACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes of inactivity
const TAB_CHECK_INTERVAL = 1 * 1000; // Check for multiple tabs every 1 second
const MASTER_TAB_HEARTBEAT = 1 * 1000; // Master tab heartbeat every 1 second

// Single-tab enforcement constants
const MASTER_TAB_TIMEOUT = 3 * 1000; // 3 seconds without master tab heartbeat
const TAB_TAKEOVER_DELAY = 1 * 1000; // 1 second delay before allowing tab takeover

// Check if current page is public
const isPublicPage = () => {
    const fullPath = window.location.pathname;
    // Normalize path by removing trailing slash
    const normalizedPath = fullPath.endsWith('/') ? fullPath.slice(0, -1) : fullPath;
    return publicPaths.includes(normalizedPath) || normalizedPath === '';
};

// Check if current page is a special auth page (requires token but has custom handling)
const isSpecialAuthPage = () => {
    const fullPath = window.location.pathname;
    return specialAuthPaths.some(path => fullPath.includes(path.replace('/', '')));
};

// Enhanced session management with tab-specific tracking and single-tab enforcement
const SessionManager = {
    tabId: null,
    heartbeatInterval: null,
    masterTabInterval: null,
    tabCheckInterval: null,
    isMasterTab: false,    // Generate unique tab ID and initialize session
    initSession: () => {
        // Prevent double initialization
        if (SessionManager.tabId) {
            console.log('Session already initialized, skipping duplicate initialization');  
            return;
        }
        
        // Check if this tab already has a tab ID (from previous session or page reload)
        let existingTabId = sessionStorage.getItem('currentTabId');
        
        // If we have an existing tab ID and valid session data for it, reuse it
        if (existingTabId) {
            const sessionData = SessionManager.getSessionData();
            if (sessionData && sessionData.tabId === existingTabId) {
                console.log('Reusing existing tab ID:', existingTabId);
                SessionManager.tabId = existingTabId;
                
                // Update the session with current login time
                sessionData.loginTime = Date.now();
                sessionData.lastActivity = Date.now();
                sessionData.lastHeartbeat = Date.now();
                sessionData.isRecentLogin = true;
                localStorage.setItem('activeSession', JSON.stringify(sessionData));
                
                // Set this tab as master if no master exists or master is stale
                const now = Date.now();
                const masterTabHeartbeat = sessionData.masterTabHeartbeat || 0;
                if (!sessionData.masterTabId || (now - masterTabHeartbeat) > MASTER_TAB_TIMEOUT) {
                    sessionData.masterTabId = SessionManager.tabId;
                    sessionData.masterTabHeartbeat = now;
                    localStorage.setItem('activeSession', JSON.stringify(sessionData));
                    SessionManager.isMasterTab = true;
                }
                
                // Set up monitoring
                SessionManager.setupTabCloseDetection();
                SessionManager.startHeartbeat();
                if (SessionManager.isMasterTab) {
                    SessionManager.startMasterTabHeartbeat();
                }
                SessionManager.startTabMonitoring();
                return;
            }
        }
        
        // Generate new unique tab identifier
        SessionManager.tabId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const loginTime = Date.now();
        
        console.log('Generated new tab ID:', SessionManager.tabId);
        
        // Store session data in localStorage with tab-specific key
        const sessionData = {
            loginTime: loginTime,
            lastActivity: loginTime,
            tabId: SessionManager.tabId,
            lastHeartbeat: loginTime,
            isRecentLogin: true, // Flag for recent login grace period
            masterTabId: SessionManager.tabId, // This tab becomes the master
            masterTabHeartbeat: loginTime
        };          localStorage.setItem('activeSession', JSON.stringify(sessionData));
        
        // Store tab ID in BOTH sessionStorage and localStorage for resilience
        sessionStorage.setItem('currentTabId', SessionManager.tabId);
        localStorage.setItem('lastTabId', SessionManager.tabId);
        localStorage.setItem('loginTimestamp', loginTime.toString());
        
        // Set this tab as master
        SessionManager.isMasterTab = true;
        
        console.log('Session initialized with single-tab enforcement:', SessionManager.tabId);
        
        // Set up tab close detection, heartbeat, and single-tab monitoring
        SessionManager.setupTabCloseDetection();
        SessionManager.startHeartbeat();
        SessionManager.startMasterTabHeartbeat();
        SessionManager.startTabMonitoring();
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
    },    // Stop heartbeat
    stopHeartbeat: () => {
        if (SessionManager.heartbeatInterval) {
            clearInterval(SessionManager.heartbeatInterval);
            SessionManager.heartbeatInterval = null;
        }
    },

    // Start master tab heartbeat (for single-tab enforcement)
    startMasterTabHeartbeat: () => {
        if (!SessionManager.isMasterTab) return;
        
        SessionManager.masterTabInterval = setInterval(() => {
            const sessionData = SessionManager.getSessionData();
            if (sessionData && sessionData.masterTabId === SessionManager.tabId) {
                sessionData.masterTabHeartbeat = Date.now();
                localStorage.setItem('activeSession', JSON.stringify(sessionData));
            }
        }, MASTER_TAB_HEARTBEAT);
    },

    // Stop master tab heartbeat
    stopMasterTabHeartbeat: () => {
        if (SessionManager.masterTabInterval) {
            clearInterval(SessionManager.masterTabInterval);
            SessionManager.masterTabInterval = null;
        }
    },

    // Start monitoring for multiple tabs
    startTabMonitoring: () => {
        SessionManager.tabCheckInterval = setInterval(() => {
            SessionManager.checkForMultipleTabs();
        }, TAB_CHECK_INTERVAL);
    },

    // Stop tab monitoring
    stopTabMonitoring: () => {
        if (SessionManager.tabCheckInterval) {
            clearInterval(SessionManager.tabCheckInterval);
            SessionManager.tabCheckInterval = null;
        }
    },

    // Check for multiple tabs and enforce single-tab rule
    checkForMultipleTabs: () => {
        const sessionData = SessionManager.getSessionData();
        if (!sessionData) return;

        const now = Date.now();
        const masterTabId = sessionData.masterTabId;
        const masterTabHeartbeat = sessionData.masterTabHeartbeat || 0;

        // If this is not the master tab
        if (SessionManager.tabId !== masterTabId) {
            // Check if master tab is still alive
            if (now - masterTabHeartbeat > MASTER_TAB_TIMEOUT) {
                // Master tab is dead, this tab can take over
                console.log('Master tab appears dead, attempting takeover...');
                SessionManager.attemptTabTakeover();            } else {
                // Master tab is alive, this tab should be closed
                console.log('Multiple tabs detected - closing secondary tab');
                SessionManager.showTabAccessModal();
                return;
            }
        }

        // If this is the master tab, ensure we're still the master
        if (SessionManager.isMasterTab && SessionManager.tabId === masterTabId) {
            // Update our heartbeat
            sessionData.masterTabHeartbeat = now;
            localStorage.setItem('activeSession', JSON.stringify(sessionData));
        }
    },

    // Attempt to take over as master tab
    attemptTabTakeover: () => {
        setTimeout(() => {
            const sessionData = SessionManager.getSessionData();
            if (!sessionData) return;

            const now = Date.now();
            const masterTabHeartbeat = sessionData.masterTabHeartbeat || 0;

            // Double-check that master tab is still dead
            if (now - masterTabHeartbeat > MASTER_TAB_TIMEOUT) {
                console.log('Taking over as master tab:', SessionManager.tabId);
                
                // Update session data to make this tab the master
                sessionData.masterTabId = SessionManager.tabId;
                sessionData.masterTabHeartbeat = now;
                localStorage.setItem('activeSession', JSON.stringify(sessionData));
                
                // Set this tab as master and start master heartbeat
                SessionManager.isMasterTab = true;
                SessionManager.startMasterTabHeartbeat();
                
                // Show success message
                SessionManager.showTabTakeoverMessage();
            }
        }, TAB_TAKEOVER_DELAY);
    },    // Show unified modal for tab access restrictions (loads from HTML file)
    showTabAccessModal: async () => {
        // Prevent duplicate modals - if one already exists, don't create another
        if (document.querySelector('.tab-modal-overlay')) {
            console.log('Tab access modal already exists, skipping creation');
            return;
        }
        
        try {
            // Load modal HTML template
            const response = await fetch('../html/tab-access-modal.html');
            const modalHtml = await response.text();
            
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.className = 'tab-modal-overlay';
            overlay.innerHTML = modalHtml;
            
            document.body.appendChild(overlay);

            // Handle "Go to Login" button
            overlay.querySelector('#closeTabBtn').addEventListener('click', () => {
                sessionStorage.clear();
                window.location.href = '/';
            });

            // Disable page interaction except for modal
            document.body.style.pointerEvents = 'none';
            overlay.style.pointerEvents = 'auto';
            
        } catch (error) {
            console.error('Error loading tab access modal:', error);
            // Fallback to simple alert if HTML loading fails
            alert('Multiple tabs detected: Please close this tab and continue using your original tab.');
        }
    },

    // Show tab takeover success message
    showTabTakeoverMessage: () => {
        const message = document.createElement('div');
        message.className = 'tab-success-message';
        message.textContent = '✓ Tab successfully activated';
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 3000);    },

    // Update last activity timestamp for current tab
    updateActivity: () => {
        const sessionData = SessionManager.getSessionData();
        if (sessionData && sessionData.tabId === SessionManager.tabId) {
            sessionData.lastActivity = Date.now();
            sessionData.lastHeartbeat = Date.now();
            localStorage.setItem('activeSession', JSON.stringify(sessionData));
        }
    },    // Get current session data
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
        // Track if navigation is happening programmatically
        let isNavigating = false;
        
        // Override navigation methods to detect programmatic navigation
        const originalAssign = window.location.assign;
        const originalReplace = window.location.replace;        // Track programmatic navigation
        const trackNavigation = () => {
            isNavigating = true;
            setTimeout(() => { isNavigating = false; }, 1500); // Extended to 1500ms for login flow
        };
          // Override window.location setters and methods
        window.location.assign = function(url) {
            trackNavigation();
            return originalAssign.call(this, url);
        };
        
        window.location.replace = function(url) {
            trackNavigation();
            return originalReplace.call(this, url);
        };        // Override href setter to detect programmatic navigation
        // Check if we've already overridden this property to avoid redefinition error
        if (!window._authHrefOverridden) {
            const originalHref = Object.getOwnPropertyDescriptor(window.location, 'href') || 
                               Object.getOwnPropertyDescriptor(Location.prototype, 'href');
            if (originalHref && originalHref.set && originalHref.configurable !== false) {
                try {
                    Object.defineProperty(window.location, 'href', {
                        set: function(url) {
                            trackNavigation();
                            return originalHref.set.call(this, url);
                        },
                        get: originalHref.get,
                        configurable: true,
                        enumerable: originalHref.enumerable
                    });
                    // Mark as overridden globally to prevent future attempts
                    window._authHrefOverridden = true;
                } catch (error) {
                    // Silently continue without href tracking - other methods will still work
                    window._authHrefOverridden = true; // Prevent retry attempts
                }
            }
        }// Monitor for programmatic href changes
        let lastHref = window.location.href;
        const hrefWatcher = setInterval(() => {
            if (window.location.href !== lastHref) {
                console.log('🔧 DEBUGGING: Href change detected:', lastHref, '->', window.location.href);
                trackNavigation();
                lastHref = window.location.href;
            }
        }, 100);        // Monitor for login form submissions specifically
        document.addEventListener('submit', (event) => {
            if (event.target && event.target.id === 'loginForm') {
                trackNavigation();
                // Extended tracking for login flow with longer protection
                setTimeout(() => {
                    isNavigating = true;
                    setTimeout(() => { 
                        isNavigating = false; 
                    }, 3000); // 3 second extended protection for complete login flow
                }, 100);
                
                // Also set a login flag in localStorage for additional detection
                localStorage.setItem('loginFlowActive', Date.now().toString());
                setTimeout(() => {
                    localStorage.removeItem('loginFlowActive');
                }, 5000); // Clear flag after 5 seconds
            }
        });        // Clear session when tab/window is actually closed (not just switched)
        window.addEventListener('beforeunload', (event) => {
            // Enhanced detection for internal navigation vs tab close
            const currentHostname = window.location.hostname;
              // Check various indicators of internal navigation
            const isInternalNavigation = 
                // Programmatic navigation detected
                isNavigating ||
                // Login flow is active (recently submitted login form)
                (() => {
                    const loginFlowTimestamp = localStorage.getItem('loginFlowActive');
                    return loginFlowTimestamp && (Date.now() - parseInt(loginFlowTimestamp)) < 5000;
                })() ||
                // Link-based navigation
                (event.target && event.target.activeElement && 
                 event.target.activeElement.tagName === 'A' && 
                 event.target.activeElement.hostname === currentHostname) ||
                // Form submission to same domain
                (event.target && event.target.activeElement && 
                 event.target.activeElement.tagName === 'BUTTON' &&
                 event.target.activeElement.form) ||
                // Page refresh detection (Ctrl+R, F5, etc.)
                (event.type === 'beforeunload' && !event.returnValue);
              // Extended grace period indicators for login flow
            const isLikelyInternalNavigation = 
                // Recent login (within 10 minutes) suggests this might be login flow navigation
                (() => {
                    const loginTimestamp = parseInt(localStorage.getItem('loginTimestamp') || '0');
                    const now = Date.now();
                    return (now - loginTimestamp) < 600000; // Extended to 10 minutes
                })() ||
                // Very active session suggests ongoing use
                (() => {
                    const sessionData = SessionManager.getSessionData();
                    return sessionData && sessionData.lastActivity && 
                           (Date.now() - sessionData.lastActivity) < 120000; // Active within last 2 minutes
                })() ||
                // Recent session initialization
                (() => {
                    const sessionData = SessionManager.getSessionData();
                    return sessionData && sessionData.loginTime && 
                           (Date.now() - sessionData.loginTime) < 180000; // Session created within 3 minutes
                })();
            
            // Only clear session if this is clearly not internal navigation
            if (!isInternalNavigation && !isLikelyInternalNavigation) {
                // Mark this tab as closed - use a timestamp approach
                const closeTime = Date.now();
                sessionStorage.setItem('tabCloseTime', closeTime.toString());
                  // Increased delay to better distinguish between tab close and navigation
                setTimeout(() => {
                    const currentCloseTime = sessionStorage.getItem('tabCloseTime');
                    if (currentCloseTime === closeTime.toString()) {
                        // Tab was actually closed, not just refreshed/navigated
                        console.log('Tab close detected - clearing session');
                        SessionManager.clearSession();
                        clearInterval(hrefWatcher);
                    }
                }, 750); // Increased from 500ms to 750ms for better login flow detection
            } else {
                console.log('Internal navigation detected - preserving session');
            }
        });
        
        // Handle page refresh vs tab close detection
        window.addEventListener('load', () => {
            // Clear any pending close time since the page loaded successfully
            sessionStorage.removeItem('tabCloseTime');
        });
        
        // Clean up href watcher when session is cleared
        const originalClearSession = SessionManager.clearSession;
        SessionManager.clearSession = function() {
            clearInterval(hrefWatcher);
            return originalClearSession.call(this);
        };
    },    // Check if session is valid for current tab
    isSessionValid: () => {
        // Get stored tab ID for this tab/window - prioritize SessionManager.tabId if already set
        const currentTabId = SessionManager.tabId || sessionStorage.getItem('currentTabId');
        
        if (!currentTabId) {
            console.log('Session invalid: No tab ID found');
            return false;
        }
        
        // Ensure SessionManager.tabId is set
        SessionManager.tabId = currentTabId;
        
        const sessionData = SessionManager.getSessionData();

        if (!sessionData) {
            console.log('Session invalid: No session data found');
            return false;
        }
        
        // Check if this tab's session matches the active session
        if (sessionData.tabId !== currentTabId) {
            console.log('Session invalid: Tab ID mismatch - sessionData.tabId:', sessionData.tabId, 'currentTabId:', currentTabId);
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
    },    // Clear all session data
    clearSession: () => {
        SessionManager.stopHeartbeat();
        SessionManager.stopMasterTabHeartbeat();
        SessionManager.stopTabMonitoring();
        SessionManager.isMasterTab = false;
        localStorage.removeItem('activeSession');
        sessionStorage.clear();
        console.log('Session data cleared with single-tab enforcement cleanup');
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
        }    }, ACTIVITY_CHECK_INTERVAL);

    console.log('Activity monitoring started');
};

// Check authentication
const checkAuth = () => {
    if (isPublicPage()) {
        return; // Public page, no auth required
    }    const token = localStorage.getItem('token');
    
    if (!token) {
        console.log('No token found, redirecting to login');
        window.location.href = '/';
        return;
    }
    
    // Check for forced password change requirement
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const currentPath = window.location.pathname;
    const isForcePasswordChangePage = currentPath.includes('/force-password-change/');
    
    // If user requires password change and is not on the force password change page, redirect
    if (userData.passwordChangeRequired === true && !isForcePasswordChangePage) {
        console.log('User requires password change, redirecting to force-password-change page');
        window.location.href = '/force-password-change/';
        return;
    }
    
    // If user is on force password change page but doesn't require it, redirect to welcome
    if (isForcePasswordChangePage && userData.passwordChangeRequired !== true) {
        console.log('User does not require password change, redirecting to welcome page');
        window.location.href = '/welcome/';
        return;
    }
    
    // Check if this is a new tab/window - if no tab ID exists, this is a fresh tab
    let currentTabId = sessionStorage.getItem('currentTabId');
    
    // Also check localStorage for session data
    const sessionData = SessionManager.getSessionData();
    
    // Extended grace period for recent logins - if login was within last 3 minutes and we have session data,
    // allow access even without sessionStorage tab ID (handles immediate post-login navigation)
    const now = Date.now();
    const loginTimestamp = parseInt(localStorage.getItem('loginTimestamp') || '0');
    const isRecentLogin = (now - loginTimestamp) < 180000; // 3 minutes grace period for login flow
    
    if (!currentTabId) {
        if (isRecentLogin && sessionData && sessionData.tabId) {
            console.log('No sessionStorage tab ID but recent login detected - allowing access and restoring session');
            // Restore the session for this tab
            sessionStorage.setItem('currentTabId', sessionData.tabId);
            SessionManager.tabId = sessionData.tabId;
            
            // Update the current tab ID variable for the rest of the function
            currentTabId = sessionData.tabId;            // Don't clear the recent login flag immediately - keep it for a bit longer
            // This helps with multiple page loads during login flow
            if ((now - loginTimestamp) > 120000) { // Only clear after 2 minutes for extended grace
                sessionData.isRecentLogin = false;
                localStorage.setItem('activeSession', JSON.stringify(sessionData));
            }
        } else if (isRecentLogin && !sessionData) {
            // Edge case: recent login but no session data - try to recover from localStorage backup
            const lastTabId = localStorage.getItem('lastTabId');
            if (lastTabId) {
                console.log('Attempting session recovery with lastTabId:', lastTabId);
                sessionStorage.setItem('currentTabId', lastTabId);
                SessionManager.tabId = lastTabId;
                currentTabId = lastTabId;
                
                // Re-initialize session if possible
                if (window.SessionManager && typeof window.SessionManager.initSession === 'function') {
                    try {
                        window.SessionManager.initSession();
                    } catch (e) {
                        console.warn('Session re-initialization failed:', e);
                    }
                }
            } else {
                console.log('No active session found - redirecting to login');
                window.location.href = '/';
                return;
            }
        } else {
            console.log('New tab detected - checking for existing session');
            
            // Check if there's an active session with a master tab
            if (sessionData && sessionData.masterTabId) {
                const now = Date.now();
                const masterTabHeartbeat = sessionData.masterTabHeartbeat || 0;                // If master tab is alive, deny access to this new tab
                if (now - masterTabHeartbeat <= MASTER_TAB_TIMEOUT) {
                    console.log('Active master tab detected - denying access to new tab');
                    SessionManager.showTabAccessModal();
                    return;
                } else {
                    console.log('Master tab appears inactive - allowing new tab access');
                }
            }
            
            console.log('No active session found - redirecting to login');
            window.location.href = '/';
            return;
        }
    }

    // Check if session is valid for this specific tab
    if (!SessionManager.isSessionValid()) {
        console.log('Session invalid or expired, logging out');
        performLogout('Invalid session');
        return;
    }    // Restore the tab ID and start heartbeat if not already running
    SessionManager.tabId = currentTabId;
    if (!SessionManager.heartbeatInterval) {
        SessionManager.startHeartbeat();
    }

    // Check if this tab should be the master tab (reuse existing sessionData variable)
    if (sessionData && sessionData.masterTabId === SessionManager.tabId) {
        SessionManager.isMasterTab = true;
        if (!SessionManager.masterTabInterval) {
            SessionManager.startMasterTabHeartbeat();
        }
    }    // Start tab monitoring if not already running
    if (!SessionManager.tabCheckInterval) {
        SessionManager.startTabMonitoring();
    }

    // Start monitoring for this session
    startActivityMonitoring();
    
    console.log('Authentication check passed for tab:', currentTabId, 'Master tab:', SessionManager.isMasterTab);
};

// Make logout function globally available
window.performLogout = performLogout;
window.SessionManager = SessionManager;

// Run auth check when page loads
document.addEventListener('DOMContentLoaded', checkAuth);