// Utility functions for admin detection and menu management
function isUserAdmin(userData) {
    if (!userData) return false;
    
    // Use server-determined admin status with fallback for old data
    let isAdminUser = userData.isAdmin === true;
    
    // Fallback: If role data is missing and username is admin, assume admin
    if (userData.isAdmin === undefined && userData.username === 'admin') {
        isAdminUser = true;
        console.log('Using fallback admin detection for username: admin');
    }
    
    return isAdminUser;
}

function updateAdminUI(isAdmin) {
    if (isAdmin) {
        document.body.classList.add('is-admin');
        console.log('Added is-admin class to body');
    } else {
        document.body.classList.remove('is-admin');
    }
}

function updateAdminMenuItem(isAdmin) {
    const adminLink = document.querySelector('a[data-page="admin"]')?.parentElement;
    if (adminLink) {
        if (isAdmin) {
            adminLink.style.display = 'block';
            adminLink.classList.remove('admin-only');
            console.log('Showing admin menu item');
        } else {
            adminLink.style.display = 'none';
            console.log('Hiding admin menu item');
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Detect if running locally or in production
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
    const FADE_DURATION = 450;
    
    console.log(`Running in ${isLocal ? 'LOCAL' : 'PRODUCTION'} mode, API_URL: ${API_URL}`);
      // Check if current page is login page
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath === '/' || currentPath === '/index.html' || currentPath.endsWith('/');
    
    // Clear authentication data if on login page to ensure clean state
    // BUT only if we don't have a valid session that was just created
    if (isLoginPage && document.getElementById('loginForm')) {
        const hasValidSession = sessionStorage.getItem('currentTabId') && localStorage.getItem('token');
        
        if (!hasValidSession) {
            console.log('On login page - clearing any stale authentication data');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.clear();
        } else {
            console.log('On login page but have valid session - not clearing data');
        }
    }
    
    // Unified modal management
    const modalManager = {
        isShowingModal: false,
        
        showModal: function(type, message) {
            if (this.isShowingModal) return;
            
            this.isShowingModal = true;
            const modalHtml = `
                <div class="modal" id="feedbackModal" tabindex="-1">
                    <div class="modal-content ${type}">
                        <h2>${type === 'success' ? '✓ Success!' : '⚠ Error'}</h2>
                        <p>${message}</p>
                        ${type === 'success' ? '' : '<button class="modal-btn" onclick="closeModal()">Close</button>'}
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Add keyboard event listener for error modals
            if (type !== 'success') {
                const modal = document.getElementById('feedbackModal');
                modal.focus();
                modal.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                        closeModal();
                    }
                });
            }
            
            if (type === 'success') {
                setTimeout(() => {
                    document.body.classList.add('fade-out');
                    setTimeout(() => {
                        window.location.href = "../welcome/";
                    }, FADE_DURATION);
                }, 2000);
            }
        },
        
        closeModal: function() {
            const modal = document.getElementById('feedbackModal');
            if (modal) {
                modal.remove();
                this.isShowingModal = false;
                
                // Reset all input modal states for EEG form
                const inputs = ['patientNumber', 'firstName', 'middleName', 'lastName', 'address'];
                inputs.forEach(id => {
                    const input = document.getElementById(id);
                    if (input) input.dataset.showingModal = 'false';
                });
            }
        }
    };

    // Make modal functions globally available
    window.showModal = modalManager.showModal.bind(modalManager);
    window.closeModal = modalManager.closeModal.bind(modalManager);    // Handle login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            if (modalManager.isShowingModal) {
                return;
            }

            const submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';

            try {
                const username = document.getElementById('username').value.trim();
                const password = document.getElementById('password').value;

                const response = await fetch(`${API_URL}/api/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();                if (response.ok && data.token) {
                    // Store authentication data
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));                    // Initialize session management (browser-lifetime storage)
                    // CRITICAL: Ensure this happens immediately and synchronously
                    if (window.SessionManager) {
                        window.SessionManager.initSession();
                        console.log('Session initialized before navigation');
                        
                        // Verify session was created
                        const tabId = window.SessionManager.tabId;
                        const storedTabId = sessionStorage.getItem('currentTabId');
                        console.log('SessionManager tabId:', tabId);
                        console.log('SessionStorage tabId:', storedTabId);
                        
                    } else {
                        // Fallback: manual session initialization with tab ID
                        const loginTime = Date.now();
                        const tabId = 'tab_' + loginTime + '_' + Math.random().toString(36).substr(2, 9);
                        
                        sessionStorage.setItem('currentTabId', tabId);
                        sessionStorage.setItem('loginTime', loginTime.toString());
                        sessionStorage.setItem('lastActivity', loginTime.toString());
                        
                        // Store session data in localStorage as well
                        const sessionData = {
                            loginTime: loginTime,
                            lastActivity: loginTime,
                            tabId: tabId,
                            lastHeartbeat: loginTime
                        };
                        localStorage.setItem('activeSession', JSON.stringify(sessionData));
                        
                        console.log('Fallback session initialization completed with tab ID:', tabId);
                    }                    // Use utility function to check admin status and update UI
                    const isAdmin = isUserAdmin(data.user);
                    updateAdminUI(isAdmin);

                    // Add a small delay to ensure sessionStorage is persisted before navigation
                    console.log('About to navigate to welcome page...');
                    document.body.classList.add('fade-out');
                    setTimeout(() => {
                        // Double-check that session data is still there before navigation
                        const finalTabId = sessionStorage.getItem('currentTabId');
                        console.log('Final tab ID before navigation:', finalTabId);
                        
                        window.location.href = "welcome/";
                    }, FADE_DURATION);
                } else {
                    const message = response.status === 401 
                        ? 'Invalid username or password'
                        : data.error || 'Login failed';
                    
                    modalManager.showModal('error', message);
                }
            } catch (err) {
                console.error('Login error:', err);
                modalManager.showModal('error', 'Connection error. Please try again.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
            }        });    }    // Set admin class on body if user is admin (for authenticated pages only)
    if (!isLoginPage && !document.getElementById('loginForm')) {
        const token = localStorage.getItem('token');
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        
        // Only update admin UI if we have a valid token and user data
        if (token && userData && Object.keys(userData).length > 0) {
            console.log('Valid authentication found, updating admin UI');
            // Use utility function to check admin status and update UI
            const isAdmin = isUserAdmin(userData);
            updateAdminUI(isAdmin);
            
            // Show legacy auth notice if needed
            if (userData.isAdmin === undefined && userData.username === 'admin') {
                if (!sessionStorage.getItem('legacy-auth-notice-shown')) {
                    setTimeout(() => {
                    const notice = document.createElement('div');
                    notice.style.cssText = `
                        position: fixed; 
                        top: 10px; 
                        right: 10px; 
                        background: #2196F3; 
                        color: white; 
                        padding: 10px 15px; 
                        border-radius: 4px; 
                        font-size: 0.9rem;
                        z-index: 10000;
                        cursor: pointer;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                    `;
                    notice.textContent = 'Enhanced authentication available - click to refresh login';
                    notice.onclick = () => {
                        localStorage.clear();
                        sessionStorage.clear();
                        window.location.href = '/';
                    };
                    document.body.appendChild(notice);
                    
                    // Auto-hide after 8 seconds
                    setTimeout(() => {
                        if (notice.parentNode) {
                            notice.remove();
                        }
                    }, 8000);
                }, 2000);
                sessionStorage.setItem('legacy-auth-notice-shown', 'true');
            }
        } else {
            console.log('No valid authentication data found, skipping admin UI updates');
        }
    }
}

// Menu and navigation functionality
    if (document.getElementById('hamburger-menu')) {
        loadMenu();
    }

    // Add session status indicator for authenticated pages
    // Only call isPublicPage if it's defined (auth.js is loaded)
    if (typeof isPublicPage === 'function' && !isPublicPage() && localStorage.getItem('token')) {
        addSessionStatusIndicator();
    }      // Setup general navigation links - but only if handleNavigation exists
    document.querySelectorAll('.fade-nav').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = link.getAttribute('href');
            if (href && href !== '#') {
                e.preventDefault();
                // Simple fade navigation without custom function
                document.body.classList.add('fade-out');
                setTimeout(() => {
                    window.location.href = href;
                }, FADE_DURATION);
            }
        });
    });// Patient number validation - only allow numbers and hyphens
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

        patientNumberInput.addEventListener('input', function(e) {
            // Remove any characters that are not numbers or hyphens
            const value = e.target.value;
            const filteredValue = value.replace(/[^0-9\-]/g, '');
            
            if (value !== filteredValue) {
                e.target.value = filteredValue;
                showTooltip();
            }
        });

        // Also prevent invalid characters from being typed and show tooltip
        patientNumberInput.addEventListener('keypress', function(e) {
            const char = String.fromCharCode(e.which);
            if (!/[0-9\-]/.test(char)) {
                e.preventDefault();
                showTooltip();
            }
        });

        // Hide tooltip when input is focused and user starts typing valid characters
        patientNumberInput.addEventListener('focus', function() {
            tooltip.classList.remove('show');
        });
    }
    
});

async function loadMenu() {
    try {
        const response = await fetch('../html/menu.html');
        const html = await response.text();
        document.getElementById('hamburger-menu').innerHTML = html;

        // Setup hamburger button click handler
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const sideMenu = document.getElementById('sideMenu');
        
        if (hamburgerBtn && sideMenu) {
            hamburgerBtn.addEventListener('click', () => {
                document.body.classList.toggle('menu-open');
                hamburgerBtn.classList.toggle('active');
                sideMenu.classList.toggle('active');
            });

            // Hide current page in menu
            const currentPath = window.location.pathname;
            const currentPage = currentPath.split('/').filter(Boolean).pop() || 'welcome';
            
            const menuItems = sideMenu.querySelectorAll('a[data-page]');
            menuItems.forEach(item => {
                if (item.getAttribute('data-page') === currentPage) {
                    item.parentElement.style.display = 'none';
                }
            });            // Check if user is admin and show/hide admin link
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            const isAdmin = isUserAdmin(userData);
            updateAdminMenuItem(isAdmin);
        }        // Add click handler for logout with confirmation
        const logoutLink = document.getElementById('logoutLink');
        logoutLink?.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Use enhanced logout modal instead of confirm()
            const shouldLogout = await showLogoutModal();
            if (!shouldLogout) {
                return;
            }

            // Show logging out indicator
            logoutLink.textContent = 'Logging out...';
            logoutLink.style.pointerEvents = 'none';

            try {
                // Use the enhanced logout function from auth.js
                if (window.performLogout) {
                    await window.performLogout('User clicked logout');
                } else {
                    // Fallback logout if auth.js not loaded
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.href = '../';
                }
            } catch (err) {
                console.error('Logout error:', err);
                // Force logout even if server call fails
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '../';
            }
        });

    } catch (err) {        console.error('Error loading menu:', err);
    }
}

// Add session status indicator
function addSessionStatusIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'session-status';
    indicator.id = 'sessionStatus';
    document.body.appendChild(indicator);

    // Update session status every 30 seconds
    const updateStatus = () => {
        if (!window.SessionManager) return;

        const sessionData = window.SessionManager.getSessionData();
        const now = Date.now();

        if (sessionData && sessionData.loginTime && sessionData.lastActivity) {
            const sessionAge = Math.floor((now - sessionData.loginTime) / 1000 / 60); // minutes
            const inactiveTime = Math.floor((now - sessionData.lastActivity) / 1000 / 60); // minutes
            const remainingSession = Math.floor((8 * 60) - sessionAge); // minutes until session expires
            const remainingActivity = Math.floor(30 - inactiveTime); // minutes until inactivity timeout

            let statusText = `Session: ${sessionAge}m`;
            let isWarning = false;

            // Show warning if session is expiring soon (less than 30 minutes)
            if (remainingSession < 30) {
                statusText = `⚠ Session expires in ${remainingSession}m`;
                isWarning = true;
            }
            // Show warning if inactive for more than 25 minutes
            else if (remainingActivity < 5) {
                statusText = `⚠ Inactive timeout in ${remainingActivity}m`;
                isWarning = true;
            }

            // Add tab ID indicator for debugging (can be removed later)
            const currentTabId = sessionStorage.getItem('currentTabId');
            if (currentTabId) {
                const shortTabId = currentTabId.substring(currentTabId.length - 4);
                statusText += ` (${shortTabId})`;
            }

            indicator.textContent = statusText;
            indicator.className = isWarning ? 'session-status warning' : 'session-status';
        } else {
            indicator.textContent = '⚠ Session invalid';
            indicator.className = 'session-status warning';
        }
    };

    updateStatus();
    setInterval(updateStatus, 30000); // Update every 30 seconds
}

// Enhanced logout modal
function showLogoutModal() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'logout-modal';
        modal.innerHTML = `
            <div class="logout-modal-content">
                <h3>Confirm Logout</h3>
                <p>Are you sure you want to logout? You will need to login again to access the application.</p>
                <div class="logout-modal-buttons">
                    <button class="logout-modal-btn cancel">Cancel</button>
                    <button class="logout-modal-btn confirm">Logout</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const confirmBtn = modal.querySelector('.confirm');
        const cancelBtn = modal.querySelector('.cancel');

        confirmBtn.addEventListener('click', () => {
            modal.remove();
            resolve(true);
        });

        cancelBtn.addEventListener('click', () => {
            modal.remove();
            resolve(false);
        });

        // ESC key to cancel
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleKeydown);
                resolve(false);
            }
        };
        document.addEventListener('keydown', handleKeydown);
    });
}