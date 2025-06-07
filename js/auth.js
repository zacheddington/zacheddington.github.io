// Only the login page is public
const publicPaths = ['/index.html', '/', ''];

// Session management constants
const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every minute
const ACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes of inactivity
const TAB_CHECK_INTERVAL = 5 * 1000; // Check for multiple tabs every 5 seconds
const MASTER_TAB_HEARTBEAT = 3 * 1000; // Master tab heartbeat every 3 seconds

// Single-tab enforcement constants
const MASTER_TAB_TIMEOUT = 10 * 1000; // 10 seconds without master tab heartbeat
const TAB_TAKEOVER_DELAY = 2 * 1000; // 2 second delay before allowing tab takeover

// Check if current page is public
const isPublicPage = () => {
    const fullPath = window.location.pathname;
    // Normalize path by removing trailing slash
    const normalizedPath = fullPath.endsWith('/') ? fullPath.slice(0, -1) : fullPath;
    return publicPaths.includes(normalizedPath) || normalizedPath === '';
};

// Enhanced session management with tab-specific tracking and single-tab enforcement
const SessionManager = {
    tabId: null,
    heartbeatInterval: null,
    masterTabInterval: null,
    tabCheckInterval: null,
    isMasterTab: false,
    
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
            lastHeartbeat: loginTime,
            isRecentLogin: true, // Flag for recent login grace period
            masterTabId: SessionManager.tabId, // This tab becomes the master
            masterTabHeartbeat: loginTime
        };
        
        localStorage.setItem('activeSession', JSON.stringify(sessionData));
        
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
                SessionManager.attemptTabTakeover();
            } else {
                // Master tab is alive, this tab should be closed
                console.log('Multiple tabs detected - closing secondary tab');
                SessionManager.showMultipleTabWarning();
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
    },

    // Show warning about multiple tabs
    showMultipleTabWarning: () => {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Create modal content
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            max-width: 400px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;

        modal.innerHTML = `
            <h2 style="color: #e74c3c; margin-bottom: 20px;">⚠️ Multiple Tabs Detected</h2>
            <p style="margin-bottom: 20px; line-height: 1.5;">
                For data security and to prevent database conflicts, only one tab can access the application at a time.
            </p>
            <p style="margin-bottom: 30px; font-weight: bold; color: #2c3e50;">
                Please close this tab and continue using your original tab.
            </p>
            <button id="closeTabBtn" style="
                background: #e74c3c;
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                margin-right: 10px;
            ">Close This Tab</button>
            <button id="forceCloseBtn" style="
                background: #95a5a6;
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
            ">Force Close Other Tabs</button>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Handle close tab button
        document.getElementById('closeTabBtn').addEventListener('click', () => {
            window.close();
        });

        // Handle force close button (clear session and redirect)
        document.getElementById('forceCloseBtn').addEventListener('click', () => {
            SessionManager.forceTabTakeover();
        });

        // Disable page interaction
        document.body.style.pointerEvents = 'none';
        overlay.style.pointerEvents = 'auto';
    },

    // Force this tab to become the master (emergency override)
    forceTabTakeover: () => {
        console.log('Force takeover initiated by user');
        
        const sessionData = SessionManager.getSessionData();
        if (sessionData) {
            const now = Date.now();
            
            // Force update session data
            sessionData.masterTabId = SessionManager.tabId;
            sessionData.masterTabHeartbeat = now;
            sessionData.lastActivity = now;
            localStorage.setItem('activeSession', JSON.stringify(sessionData));
            
            // Set this tab as master
            SessionManager.isMasterTab = true;
            SessionManager.startMasterTabHeartbeat();
        }
        
        // Reload the page to clear the warning modal
        window.location.reload();
    },    // Show tab takeover success message
    showTabTakeoverMessage: () => {
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #27ae60;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 9999;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        message.textContent = '✓ Tab successfully activated';
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 3000);
    },

    // Show message when new tab is denied access
    showNewTabDeniedMessage: () => {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Create modal content
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            max-width: 400px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;

        modal.innerHTML = `
            <h2 style="color: #e67e22; margin-bottom: 20px;">🚫 Access Restricted</h2>
            <p style="margin-bottom: 20px; line-height: 1.5;">
                You already have the application open in another tab. For data security and to prevent conflicts, only one tab can be active at a time.
            </p>
            <p style="margin-bottom: 30px; font-weight: bold; color: #2c3e50;">
                Please return to your existing tab or close it first.
            </p>
            <button id="closeNewTabBtn" style="
                background: #e67e22;
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                margin-right: 10px;
            ">Close This Tab</button>
            <button id="loginNewTabBtn" style="
                background: #3498db;
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
            ">Login in This Tab</button>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Handle close tab button
        document.getElementById('closeNewTabBtn').addEventListener('click', () => {
            window.close();
        });

        // Handle login button (redirect to login page)
        document.getElementById('loginNewTabBtn').addEventListener('click', () => {
            window.location.href = '/';
        });

        // Disable page interaction
        document.body.style.pointerEvents = 'none';
        overlay.style.pointerEvents = 'auto';
    },

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
    },// Setup tab close detection
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
    }// Check if this is a new tab/window - if no tab ID exists, this is a fresh tab
    const currentTabId = sessionStorage.getItem('currentTabId');
    console.log('Current tab ID from sessionStorage:', currentTabId);
    
    // Also check localStorage for session data
    const sessionData = SessionManager.getSessionData();
    console.log('Session data from localStorage:', sessionData);
    
    // Grace period for recent logins - if login was within last 30 seconds and we have session data,
    // allow access even without sessionStorage tab ID (handles immediate post-login navigation)
    const now = Date.now();
    const loginTimestamp = parseInt(localStorage.getItem('loginTimestamp') || '0');
    const isRecentLogin = (now - loginTimestamp) < 30000; // 30 seconds grace period
    
    console.log('Login timestamp:', loginTimestamp, 'Recent login:', isRecentLogin);
      if (!currentTabId) {
        if (isRecentLogin && sessionData && sessionData.tabId) {
            console.log('No sessionStorage tab ID but recent login detected - allowing access and restoring session');
            // Restore the session for this tab
            sessionStorage.setItem('currentTabId', sessionData.tabId);
            SessionManager.tabId = sessionData.tabId;
            
            // Clear the recent login flag to prevent abuse
            sessionData.isRecentLogin = false;
            localStorage.setItem('activeSession', JSON.stringify(sessionData));
        } else {
            console.log('New tab detected - checking for existing session');
            
            // Check if there's an active session with a master tab
            if (sessionData && sessionData.masterTabId) {
                const now = Date.now();
                const masterTabHeartbeat = sessionData.masterTabHeartbeat || 0;
                
                // If master tab is alive, deny access to this new tab
                if (now - masterTabHeartbeat <= MASTER_TAB_TIMEOUT) {
                    console.log('Active master tab detected - denying access to new tab');
                    SessionManager.showNewTabDeniedMessage();
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
    }

    // Start tab monitoring if not already running
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