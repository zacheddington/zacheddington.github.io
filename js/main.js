// Utility functions for admin detection and menu management
function isUserAdmin(userData) {
    if (!userData) return false;
    
    // Use server-determined admin status with fallback for old data
    let isAdminUser = userData.isAdmin === true;
      // Fallback: If role data is missing and username is admin, assume admin
    if (userData.isAdmin === undefined && userData.username === 'admin') {
        isAdminUser = true;
    }
    
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
    const adminLink = document.querySelector('a[data-page="admin"]')?.parentElement;
    if (adminLink) {        if (isAdmin) {
            adminLink.style.display = 'block';
            adminLink.classList.remove('admin-only');
        } else {
            adminLink.style.display = 'none';
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Detect if running locally or in production
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '';
    const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
    
    const FADE_DURATION = 450;    // Check if current page is login page
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath === '/' || currentPath === '/index.html' || currentPath === '';
    
    console.log('🟣 PAGE CHECK', {
        currentPath,
        isLoginPage,
        hasLoginForm: !!document.getElementById('loginForm')
    });
      // SECURITY FIX: Always clear authentication data when user visits login page
    // This prevents users from using back button to bypass authentication
    if (isLoginPage && document.getElementById('loginForm')) {
        console.log('🟣 ENTERING LOGIN PAGE LOGIC', {
            isLoginPage,
            hasLoginForm: !!document.getElementById('loginForm'),
            authRedirect: sessionStorage.getItem('authRedirect'),
            loginInProgress: sessionStorage.getItem('loginInProgress'),
            token: localStorage.getItem('token') ? 'EXISTS' : 'MISSING'
        });// Check if this is a direct navigation to login page (not a redirect from auth.js)
        const isDirectNavigation = !sessionStorage.getItem('authRedirect');
        
        // Only clear auth data if this is direct navigation AND there's existing auth data
        // BUT NOT if a login is currently in progress
        const hasExistingAuthData = localStorage.getItem('token') || localStorage.getItem('user');
        const isLoginInProgress = sessionStorage.getItem('loginInProgress');
          if (isDirectNavigation && hasExistingAuthData && !isLoginInProgress) {
            console.log('🔴 CLEARING AUTH DATA - Direct navigation detected', {
                isDirectNavigation,
                hasExistingAuthData,
                isLoginInProgress,
                token: localStorage.getItem('token') ? 'EXISTS' : 'MISSING',
                user: localStorage.getItem('user') ? 'EXISTS' : 'MISSING',
                authRedirect: sessionStorage.getItem('authRedirect'),
                loginInProgress: sessionStorage.getItem('loginInProgress')
            });
            
            // Clear all authentication data to force fresh login
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('loginTimestamp');
            localStorage.removeItem('activeSession');
            localStorage.removeItem('lastTabId');
            
            // Clear specific sessionStorage items that could allow bypassing auth
            sessionStorage.removeItem('currentTabId');
            sessionStorage.removeItem('tabCloseTime');
            sessionStorage.removeItem('loginFlowActive');
            
            // Clear browser history state to prevent back button access
            if (window.history && window.history.replaceState) {
                window.history.replaceState(null, document.title, window.location.pathname);
            }
            
            console.log('🔴 AUTH DATA CLEARED - Direct navigation to login page detected');        } else {
            console.log('🟢 PRESERVING AUTH STATE', {
                isDirectNavigation,
                hasExistingAuthData,
                isLoginInProgress,
                token: localStorage.getItem('token') ? 'EXISTS' : 'MISSING',
                user: localStorage.getItem('user') ? 'EXISTS' : 'MISSING',
                authRedirect: sessionStorage.getItem('authRedirect'),
                loginInProgress: sessionStorage.getItem('loginInProgress')
            });
            
            // Remove the redirect flag since we've handled it
            sessionStorage.removeItem('authRedirect');
            console.log('🟢 Legitimate auth redirect detected - preserving auth state');
        }
        
        // Additional security: Prevent caching of authenticated pages
        // This ensures browsers don't cache pages that should require authentication
        if (isLoginPage && document.getElementById('loginForm')) {
            // Clear any cached data that might allow back button access
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for(let registration of registrations) {
                        registration.unregister();
                    }
                }).catch(function(error) {
                    console.log('Service worker unregistration failed:', error);
                });
            }
            
            // Clear any cached data that might allow back button access
            if (window.caches) {
                caches.keys().then(function(names) {
                    for (let name of names) {
                        caches.delete(name);
                    }
                }).catch(function(error) {
                    console.log('Cache clearing failed:', error);
                });
            }
            
            // Prevent browser from caching this page
            window.addEventListener('pageshow', function(event) {
                if (event.persisted) {
                    // Page was loaded from cache, force reload to ensure fresh state
                    window.location.reload();
                }
            });
            
            // Clear any lingering form data
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.reset();
            }
            
            // Enhanced history management to prevent back button bypass
            setupSecureHistoryManagement();
        }
    }
    
    // Function to set up secure history management
    function setupSecureHistoryManagement() {
        // Prevent back button from accessing authenticated content
        let historyCleared = false;
        
        // Clear history when login page is loaded directly
        if (!historyCleared && window.history && window.history.length > 1) {
            // Replace all history entries with the current login page
            window.history.replaceState(null, document.title, window.location.pathname);
            historyCleared = true;
            console.log('History cleared for security');
        }
        
        // Monitor for back button attempts
        window.addEventListener('popstate', function(event) {
            // If someone tries to go back from login page, keep them on login page
            event.preventDefault();
            window.history.replaceState(null, document.title, window.location.pathname);
            console.log('Back button blocked on login page');
        });        // Monitor for navigation attempts
        window.addEventListener('beforeunload', function(event) {
            console.log('🟠 BEFOREUNLOAD EVENT', {
                currentPath: window.location.pathname,
                loginInProgress: sessionStorage.getItem('loginInProgress'),
                successfulLoginNavigation: sessionStorage.getItem('successfulLoginNavigation'),
                token: localStorage.getItem('token') ? 'EXISTS' : 'MISSING'
            });
            
            // Only clear auth data if:
            // 1. We're on the login page AND
            // 2. No successful login navigation is in progress
            if ((window.location.pathname === '/' || window.location.pathname === '/index.html') && 
                !sessionStorage.getItem('successfulLoginNavigation')) {
                
                console.log('🟠 CLEARING AUTH DATA ON BEFOREUNLOAD - User leaving login page');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('activeSession');
                sessionStorage.clear();
            } else {
                console.log('🟠 PRESERVING AUTH DATA ON BEFOREUNLOAD - Successful login navigation in progress');
            }
        });
        
        // Prevent right-click context menu that might expose navigation options
        document.addEventListener('contextmenu', function(event) {
            event.preventDefault();
        });
        
        // Prevent common keyboard shortcuts that might bypass security
        document.addEventListener('keydown', function(event) {
            // Prevent Ctrl+Shift+I (Developer Tools)
            if (event.ctrlKey && event.shiftKey && event.key === 'I') {
                event.preventDefault();
            }
            // Prevent F12 (Developer Tools)
            if (event.key === 'F12') {
                event.preventDefault();
            }
            // Prevent Ctrl+U (View Source)
            if (event.ctrlKey && event.key === 'u') {
                event.preventDefault();
            }
            // Prevent Alt+Left/Right (Browser Back/Forward)
            if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
                event.preventDefault();
            }
            // Prevent Backspace navigation
            if (event.key === 'Backspace' && !['INPUT', 'TEXTAREA'].includes(event.target.tagName)) {
                event.preventDefault();
            }
        });
    }
    
    // Unified modal management
    const modalManager = {
        isShowingModal: false,        showModal: function(type, message, force = false) {
            // For error messages, allow overriding existing modals
            if (this.isShowingModal && !force && type !== 'error') {
                return false;
            }
            
            // Close any existing modal first
            if (this.isShowingModal) {
                this.closeModal();
            }
            
            this.isShowingModal = true;
            
            const modalHtml = `
                <div class="modal" id="feedbackModal" tabindex="-1" style="display: flex !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; background-color: rgba(0, 0, 0, 0.5) !important; z-index: 9999 !important; justify-content: center !important; align-items: center !important;">
                    <div class="modal-content ${type}" style="display: block !important; background: white !important; padding: 2rem !important; border-radius: 8px !important; max-width: 90% !important; width: 400px !important; text-align: center !important; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1) !important;">
                        <h2>${type === 'success' ? '✓ Success!' : '⚠ Error'}</h2>
                        <p>${message}</p>
                        <button class="modal-btn" onclick="closeModal()" style="margin-top: 1rem !important; padding: 0.5rem 1rem !important; border: none !important; border-radius: 4px !important; background: #f44336 !important; color: white !important; cursor: pointer !important;">Close</button>
                    </div>
                </div>
            `;            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Small timeout to ensure DOM is ready
            setTimeout(() => {                // Verify the modal is in the DOM
                const modalElement = document.getElementById('feedbackModal');
                if (modalElement) {
                    modalElement.style.display = 'flex';
                    modalElement.style.position = 'fixed';
                    modalElement.style.top = '0';
                    modalElement.style.left = '0';
                    modalElement.style.width = '100%';
                    modalElement.style.height = '100%';
                    modalElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                    modalElement.style.zIndex = '99999';
                    modalElement.style.justifyContent = 'center';
                    modalElement.style.alignItems = 'center';
                      // Force styles on modal content too
                    const modalContent = modalElement.querySelector('.modal-content');
                    if (modalContent) {
                        modalContent.style.display = 'block';
                        modalContent.style.backgroundColor = 'white';
                        modalContent.style.padding = '2rem';
                        modalContent.style.borderRadius = '8px';
                        modalContent.style.maxWidth = '90%';
                        modalContent.style.width = '400px';
                        modalContent.style.textAlign = 'center';
                        modalContent.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
                    }
                    
                    // Focus the modal for accessibility
                    modalElement.focus();
                      } else {
                    // Error message would go here if needed
                }
            }, 10);
              // Add keyboard event listener for all modals
            const modal = document.getElementById('feedbackModal');
            modal.focus();                modal.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                    closeModal();
                }
            });
            
            if (type === 'success') {
                // Only redirect to welcome page if we're not on the admin page
                const isAdminPage = window.location.pathname.includes('/admin/');
                if (!isAdminPage) {
                    setTimeout(() => {
                        document.body.classList.add('fade-out');
                        setTimeout(() => {
                            window.location.href = "../welcome/";
                        }, FADE_DURATION);
                    }, 2000);
                } else {                    // On admin pages, auto-hide success modal after 4 seconds
                    setTimeout(() => {
                        this.closeModal();
                    }, 4000);
                }
            }
  
            return true;
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
            } else {
                this.isShowingModal = false;
            }
        }};    // Make modal functions globally available
    window.showModal = modalManager.showModal.bind(modalManager);
    window.closeModal = modalManager.closeModal.bind(modalManager);
    window.modalManager = modalManager; // Make modalManager globally accessible
      // Handle login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        // Track 2FA state
        let is2FAMode = false;
        
        // Handle "Back to Login" button
        const backToLoginBtn = document.getElementById('backToLogin');
        if (backToLoginBtn) {            backToLoginBtn.addEventListener('click', function() {
                // Clear login in progress flag when going back to login
                sessionStorage.removeItem('loginInProgress');
                
                // Reset to username/password mode
                is2FAMode = false;
                
                // Restore required attributes
                document.getElementById('username').setAttribute('required', '');
                document.getElementById('password').setAttribute('required', '');
                
                // Show username/password fields and hide 2FA field
                document.getElementById('usernameGroup').classList.remove('hidden');
                document.getElementById('passwordGroup').classList.remove('hidden');
                document.getElementById('twofaGroup').classList.add('hidden');
                
                // Clear all form fields for security
                document.getElementById('username').value = '';
                document.getElementById('password').value = '';
                document.getElementById('twofaCode').value = '';
                
                const submitBtn = loginForm.querySelector('button[type="submit"]');
                submitBtn.textContent = 'Login';
                submitBtn.disabled = false;
                
                // Focus back to username field
                document.getElementById('username').focus();
            });
        }        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Set login in progress flag to prevent auth clearing during login
            sessionStorage.setItem('loginInProgress', 'true');

            // Close any existing modal before processing new submission
            if (modalManager.isShowingModal) {
                modalManager.closeModal();
            }

            const submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
              // Update button text based on mode
            submitBtn.textContent = is2FAMode ? 'Verifying...' : 'Logging in...';
            
            try {
                const username = document.getElementById('username').value.trim();
                const password = document.getElementById('password').value;
                const twofaCode = document.getElementById('twofaCode').value.trim();
                
                const response = await fetch(`${API_URL}/api/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ username, password, twofaToken: twofaCode })
                });                // Parse JSON response with error handling
                let data;
                try {                data = await response.json();
                } catch (jsonError) {
                    // If JSON parsing fails, create a fallback data object
                    console.error('JSON parsing error:', jsonError);
                    data = { error: response.status === 401 ? 'Authentication failed' : 'Server error' };
                }

                // Handle 2FA requirement - switch UI instead of showing modal
                if (data.requires2FA && !is2FAMode) {
                    // Switch to 2FA mode
                    is2FAMode = true;
                    
                    // Clear password for security (username/password were accepted)
                    document.getElementById('password').value = '';
                    
                    // Remove required attributes from hidden fields to prevent validation issues
                    document.getElementById('username').removeAttribute('required');
                    document.getElementById('password').removeAttribute('required');
                    
                    // Hide username/password fields and show 2FA field
                    document.getElementById('usernameGroup').classList.add('hidden');
                    document.getElementById('passwordGroup').classList.add('hidden');
                    document.getElementById('twofaGroup').classList.remove('hidden');
                    document.getElementById('backToLogin').classList.remove('hidden');
                    
                    // Focus on 2FA input
                    document.getElementById('twofaCode').focus();
                    
                    // Reset button state
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Verify Code';
                    
                    return; // Exit early, don't process as login success or error
                }
                  if (response.ok && data.token) {
                    console.log('🟢 LOGIN SUCCESS - Storing auth data', {
                        token: data.token ? 'RECEIVED' : 'MISSING',
                        user: data.user ? 'RECEIVED' : 'MISSING'
                    });
                    
                    // Store authentication data
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    console.log('🟢 AUTH DATA STORED', {
                        token: localStorage.getItem('token') ? 'STORED' : 'FAILED',
                        user: localStorage.getItem('user') ? 'STORED' : 'FAILED'
                    });// Initialize session management - ensure proper session creation
                    try {
                        if (window.SessionManager && typeof window.SessionManager.initSession === 'function') {                            window.SessionManager.initSession();
                            
                            // Verify session was created and give time for persistence
                            await new Promise(resolve => setTimeout(resolve, 200));
                            
                            // Double-check that session data persisted correctly
                            const sessionData = window.SessionManager.getSessionData();
                            const currentTabId = sessionStorage.getItem('currentTabId');
                            
                            // If session didn't persist properly, try again
                            if (!sessionData || !currentTabId) {
                                console.warn('Session data not properly persisted, trying again...');
                                window.SessionManager.initSession();
                                await new Promise(resolve => setTimeout(resolve, 100));
                            }
                        } else {
                            console.warn('SessionManager not available, using fallback session initialization');
                            // Enhanced fallback with session structure compatible with SessionManager
                            const loginTime = Date.now();
                            const tabId = 'tab_' + loginTime + '_' + Math.random().toString(36).substr(2, 9);
                            
                            // Create session data structure compatible with SessionManager
                            const sessionData = {
                                loginTime: loginTime,
                                lastActivity: loginTime,
                                tabId: tabId,
                                lastHeartbeat: loginTime,
                                isRecentLogin: true,
                                masterTabId: tabId,
                                masterTabHeartbeat: loginTime
                            };
                              localStorage.setItem('activeSession', JSON.stringify(sessionData));
                            sessionStorage.setItem('currentTabId', tabId);
                            localStorage.setItem('lastTabId', tabId);
                            localStorage.setItem('loginTimestamp', loginTime.toString());
                        }
                    } catch (sessionError) {
                        console.error('Session initialization error:', sessionError);
                        // Even if session init fails, continue with basic session tracking
                        const loginTime = Date.now();
                        const tabId = 'tab_' + loginTime + '_' + Math.random().toString(36).substr(2, 9);
                        sessionStorage.setItem('currentTabId', tabId);
                        localStorage.setItem('loginTimestamp', loginTime.toString());
                    }
                      // Use utility function to check admin status and update UI
                    const isAdmin = isUserAdmin(data.user);
                    updateAdminUI(isAdmin);                    // Add a delay to ensure all data is persisted and session is initialized before navigation
                    console.log('🟢 PREPARING NAVIGATION', {
                        token: localStorage.getItem('token') ? 'EXISTS' : 'MISSING',
                        user: localStorage.getItem('user') ? 'EXISTS' : 'MISSING',
                        sessionData: window.SessionManager ? window.SessionManager.getSessionData() : 'NO_SESSION_MANAGER',
                        currentTabId: sessionStorage.getItem('currentTabId')
                    });
                    
                    document.body.classList.add('fade-out');
                    setTimeout(() => {                        console.log('🟢 NAVIGATING TO WELCOME - Final auth check', {
                            token: localStorage.getItem('token') ? 'EXISTS' : 'MISSING',
                            user: localStorage.getItem('user') ? 'EXISTS' : 'MISSING',
                            loginInProgress: sessionStorage.getItem('loginInProgress')
                        });
                        
                        // Set flag to indicate successful login navigation in progress
                        sessionStorage.setItem('successfulLoginNavigation', 'true');
                        
                        // Clear login in progress flag before navigation
                        sessionStorage.removeItem('loginInProgress');
                        window.location.href = "welcome/";
                    }, FADE_DURATION + 200); // Extended delay for robust session persistence
                } else {
                    // Context-aware error messages
                    let message;
                    if (response.status === 401) {
                        if (is2FAMode) {
                            message = data.error === 'Invalid 2FA code' ? 'Invalid 2FA code. Please try again.' : 'Invalid 2FA code. Please try again.';
                        } else {
                            message = 'Invalid username or password';
                        }                    } else {
                        message = data.error || 'Login failed';
                    }
                    
                    try {
                        const result = window.modalManager.showModal('error', message, true); // Force show error modal                        // Clear the 2FA code field when showing error modal
                        if (is2FAMode) {
                            document.getElementById('twofaCode').value = '';
                            document.getElementById('twofaCode').focus();
                        }
                    } catch (modalError) {
                        console.error('ERROR in showModal call:', modalError);
                    }
                }
            } catch (err) {
                console.error('Login error:', err);
                window.modalManager.showModal('error', 'Connection error. Please try again.', true); // Force show error modal            } finally {
                // Clear login in progress flag
                sessionStorage.removeItem('loginInProgress');
                
                submitBtn.disabled = false;
                // Restore correct button text based on current mode
                submitBtn.textContent = is2FAMode ? 'Verify Code' : 'Login';
            }
        });
    }
    
    // Set admin class on body if user is admin (for authenticated pages only)
    if (!isLoginPage && !document.getElementById('loginForm')) {
        const token = localStorage.getItem('token');
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
          // Only update admin UI if we have a valid token and user data
        if (token && userData && Object.keys(userData).length > 0) {
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
                    }, 8000);                }, 2000);
                sessionStorage.setItem('legacy-auth-notice-shown', 'true');
                }
            }        } else {
            // No valid authentication data found, skip admin UI updates
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
                    window.location.href = href;                }, FADE_DURATION);
            }
        });
    });
    
    // Patient number validation - only allow numbers and hyphens
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
            const char = String.fromCharCode(e.which);            if (!/[0-9\-]/.test(char)) {
                e.preventDefault();
                showTooltip();
            }
        });

        // Hide tooltip when input is focused and user starts typing valid characters
        patientNumberInput.addEventListener('focus', function() {
            tooltip.classList.remove('show');
        });
    }    // Initialize profile page if we're on it
    if (window.location.pathname.includes('/profile/')) {
        initializeProfilePage();
    }
      // Initialize admin page if we're on it
    if (window.location.pathname.includes('/admin/')) {
        initializeAdminPage();
    }
    
    // Initialize patients page if we're on it
    if (window.location.pathname.includes('/patients/')) {
        initializePatientsPage();
    }
    
    // Initialize force password change page if we're on it
    if (window.location.pathname.includes('/force-password-change/')) {
        initializeForcePasswordChangePage();
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
            });            // Close menu when clicking outside of it
            document.addEventListener('click', (e) => {
                const isMenuOpen = sideMenu.classList.contains('active');
                const isClickInsideMenu = sideMenu.contains(e.target);
                const isClickOnHamburger = hamburgerBtn.contains(e.target);
                
                if (isMenuOpen && !isClickInsideMenu && !isClickOnHamburger) {
                    document.body.classList.remove('menu-open');
                    hamburgerBtn.classList.remove('active');
                    sideMenu.classList.remove('active');
                }
            });

            // Hide current page in menu
            const currentPath = window.location.pathname;
            const currentPage = currentPath.split('/').filter(Boolean).pop() || 'welcome';
            
            const menuItems = sideMenu.querySelectorAll('a[data-page]');
            menuItems.forEach(item => {
                if (item.getAttribute('data-page') === currentPage) {
                    item.parentElement.style.display = 'none';                }
            });
            
            // Check if user is admin and show/hide admin link
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            const isAdmin = isUserAdmin(userData);
            updateAdminMenuItem(isAdmin);
        }        // Add click handler for logout with confirmation (prevent duplicates)
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink && !logoutLink.hasAttribute('data-logout-handler')) {
            logoutLink.setAttribute('data-logout-handler', 'true');
            logoutLink.addEventListener('click', async (e) => {
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
        }

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
        // Remove any existing logout modals to prevent duplicates
        const existingModal = document.querySelector('.logout-modal');
        if (existingModal) {
            existingModal.remove();
        }

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

// Network connectivity and database health check
async function checkConnectivity() {
    try {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
        
        // Simple connectivity test with short timeout using public endpoint
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${API_URL}/api/health/public`, {
            method: 'GET',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return { connected: true, status: response.status };
    } catch (error) {
        if (error.name === 'AbortError') {
            return { connected: false, error: 'Connection timeout' };
        }
        return { connected: false, error: error.message };
    }
}

// Enhanced error categorization
function categorizeError(error, response = null) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return {
            type: 'network',
            message: 'Connection failed. Please check your internet connection and try again.',
            modal: true
        };
    }
    
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return {
            type: 'timeout',
            message: 'Request timed out. The server may be temporarily unavailable. Please try again.',
            modal: true
        };
    }
    
    if (response && response.status >= 500) {
        return {
            type: 'server',
            message: 'Server error occurred. Please try again later or contact support if the problem persists.',
            modal: true
        };
    }
    
    if (error.message.includes('Database connection')) {
        return {
            type: 'database',
            message: 'Database connection lost. Please try again in a moment.',
            modal: true
        };
    }
    
    if (error.message.includes('Email address is already in use')) {
        return {
            type: 'validation',
            message: 'This email address is already in use by another account. Please use a different email address.',
            modal: false
        };
    }
    
    if (error.message.includes('Current password is incorrect')) {
        return {
            type: 'validation',
            message: 'Current password is incorrect. Please verify your current password and try again.',
            modal: false
        };
    }
    
    return {
        type: 'general',
        message: error.message || 'An unexpected error occurred. Please try again.',
        modal: false
    };
}

// Profile Page Functionality
function initializeProfilePage() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
    
    // Load user data into form
    loadUserProfile();
    
    // Load 2FA status
    load2FAStatus();
    
    // Set initial profile editing state
    setProfileEditingState(false);
    
    // Handle profile form submission
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const updateBtn = document.getElementById('updateProfileBtn');
            const isEditing = updateBtn.textContent === 'Save Profile';

            if (isEditing) {
                // User clicked "Save Profile" - submit the update
                await updateUserProfile();
            } else {
                // User clicked "Update Profile" - enable editing mode
                enableProfileEditing();
            }
        });
        
        // Handle cancel button
        const cancelBtn = document.getElementById('cancelProfileBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                cancelProfileEditing();
            });
        }
    }
    
    // Handle password form submission
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await updateUserPassword();
        });
          // Handle cancel button
        const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
        if (cancelPasswordBtn) {
            cancelPasswordBtn.addEventListener('click', function() {
                passwordForm.reset();
                clearPasswordErrors();
                // Hide the clear button after clearing
                cancelPasswordBtn.style.display = 'none';
            });
        }
          // Real-time password confirmation validation
        const newPassword = document.getElementById('newPassword');
        const confirmPassword = document.getElementById('confirmPassword');
        const currentPassword = document.getElementById('currentPassword');
          if (newPassword && confirmPassword && currentPassword) {
            // Add password strength indicator for profile page
            addPasswordStrengthIndicator(newPassword);
            
            // Function to toggle Clear button visibility
            const toggleClearButton = () => {
                const hasContent = currentPassword.value.trim() || newPassword.value.trim() || confirmPassword.value.trim();
                if (cancelPasswordBtn) {
                    cancelPasswordBtn.style.display = hasContent ? 'inline-block' : 'none';
                }
            };
              // Add event listeners to all password fields to monitor changes
            currentPassword.addEventListener('input', function() {
                toggleClearButton();
                // Update field states
                if (window.fieldStateManager) {
                    window.fieldStateManager.updateFieldState(currentPassword);
                }
            });
            
            confirmPassword.addEventListener('input', function() {
                validatePasswordMatch();
                toggleClearButton();
                // Update field states
                if (window.fieldStateManager) {
                    window.fieldStateManager.updateFieldState(confirmPassword);
                }
            });
              newPassword.addEventListener('input', function() {
                validatePasswordMatch();
                updatePasswordStrength(newPassword.value, newPassword.id);
                toggleClearButton();
                // Update field states
                if (window.fieldStateManager) {
                    window.fieldStateManager.updateFieldState(newPassword);
                }
            });
            
            // Initial check on page load
            toggleClearButton();
        }
    }
    
    // Add character limit validation for profile fields
    setupProfileFieldValidation();
}

function setupProfileFieldValidation() {
    const profileFields = [
        { id: 'firstName', maxLength: 50, label: 'First name' },
        { id: 'middleName', maxLength: 50, label: 'Middle name' },
        { id: 'lastName', maxLength: 50, label: 'Last name' },
        { id: 'email', maxLength: 50, label: 'Email' }
    ];
    
    profileFields.forEach(field => {
        const input = document.getElementById(field.id);
        if (input) {
            // Character count prevention
            input.addEventListener('input', function(e) {
                if (e.target.value.length > field.maxLength) {
                    e.target.value = e.target.value.substring(0, field.maxLength);
                    showCharacterLimitModal(field.label, field.maxLength);
                }
            });
            
            // Paste prevention for overlength content
            input.addEventListener('paste', function(e) {
                setTimeout(() => {
                    if (e.target.value.length > field.maxLength) {
                        e.target.value = e.target.value.substring(0, field.maxLength);
                        showCharacterLimitModal(field.label, field.maxLength);
                    }
                }, 0);
            });
        }
    });
}

async function loadUserProfile() {
    try {        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        
        // Populate form fields
        document.getElementById('firstName').value = userData.firstName || '';
        document.getElementById('middleName').value = userData.middleName || '';
        document.getElementById('lastName').value = userData.lastName || '';
        document.getElementById('email').value = userData.email || '';
        
        // Populate hidden username field for password form accessibility
        const passwordFormUsername = document.getElementById('passwordFormUsername');
        if (passwordFormUsername) {
            passwordFormUsername.value = userData.username || '';
        }
        
        // Display role (read-only)
        const roleField = document.getElementById('role');
        if (userData.roles && userData.roles.length > 0) {
            roleField.value = userData.roles.join(', ');
        } else {
            roleField.value = 'User';
        }
          // Display account information
        document.getElementById('usernameDisplay').textContent = userData.username || '-';
        
        // Format last login if available
        const loginTimestamp = localStorage.getItem('loginTimestamp');
        if (loginTimestamp) {
            const loginDate = new Date(parseInt(loginTimestamp));
            document.getElementById('lastLoginDisplay').textContent = loginDate.toLocaleString();
        }
        
        // Set initial disabled state for profile fields
        setProfileEditingState(false);
        
    } catch (error) {
        console.error('Error loading user profile:', error);
        showModal('error', 'Failed to load profile information.');
    }
}

async function updateUserProfile() {
    const updateBtn = document.getElementById('updateProfileBtn');
    const originalText = updateBtn.textContent;
    let response = null; // Declare response variable in outer scope
    
    try {
        updateBtn.disabled = true;
        updateBtn.textContent = 'Saving...';
        
        // Pre-flight connectivity check
        const connectivity = await checkConnectivity();
        if (!connectivity.connected) {
            throw new Error(`Connection failed: ${connectivity.error}`);
        }
        
        const formData = {
            firstName: document.getElementById('firstName').value.trim(),
            middleName: document.getElementById('middleName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            email: document.getElementById('email').value.trim()
        };
          // Validate required fields
        if (!formData.firstName || !formData.lastName || !formData.email) {
            throw new Error('First name, last name, and email are required.');
        }
        
        // Validate character limits
        if (formData.firstName.length > 50) {
            throw new Error('First name must be 50 characters or less.');
        }
        if (formData.middleName && formData.middleName.length > 50) {
            throw new Error('Middle name must be 50 characters or less.');
        }
        if (formData.lastName.length > 50) {
            throw new Error('Last name must be 50 characters or less.');
        }
        if (formData.email.length > 50) {
            throw new Error('Email must be 50 characters or less.');
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            throw new Error('Please enter a valid email address.');
        }
        
        const token = localStorage.getItem('token');
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
        
        response = await fetch(`${API_URL}/api/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();        if (response.ok) {
            // Update local storage with new user data
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            userData.firstName = formData.firstName;
            userData.middleName = formData.middleName;
            userData.lastName = formData.lastName;
            userData.email = formData.email;
            localStorage.setItem('user', JSON.stringify(userData));
            
            // Return to disabled state after successful update
            setProfileEditingState(false);
            delete window.originalProfileData;
            
            // Show success modal with additional details
            const successMessage = `Profile updated successfully! Your information has been saved to the database.${result.nameKey ? ` (Record ID: ${result.nameKey})` : ''}`;
            window.modalManager.showModal('success', successMessage);
        } else {
            throw new Error(result.error || 'Failed to update profile');
        }
          } catch (error) {
        console.error('Profile update error:', error);
        
        // Use enhanced error categorization
        const errorInfo = categorizeError(error, response);
        
        // Show appropriate feedback based on error type
        if (errorInfo.modal) {
            window.modalManager.showModal('error', errorInfo.message);        } else {
            showProfileError(errorInfo.message);
        }
    } finally {
        updateBtn.disabled = false;
        // Only restore button text if we haven't switched to disabled state (successful update)
        if (updateBtn.textContent === 'Saving...') {
            updateBtn.textContent = originalText;
        }
    }
}

async function updateUserPassword() {
    const updateBtn = document.getElementById('updatePasswordBtn');
    const originalText = updateBtn.textContent;
    let response = null; // Declare response variable in outer scope
    
    try {
        updateBtn.disabled = true;
        updateBtn.textContent = 'Updating...';
        
        // Pre-flight connectivity check
        const connectivity = await checkConnectivity();
        if (!connectivity.connected) {
            throw new Error(`Connection failed: ${connectivity.error}`);
        }
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validate passwords
        if (!currentPassword || !newPassword || !confirmPassword) {
            throw new Error('All password fields are required.');
        }
        
        if (newPassword !== confirmPassword) {
            throw new Error('New passwords do not match.');
        }
          // Validate new password strength using healthcare standards
        const passwordValidation = validatePasswordStrength(newPassword);
        if (!passwordValidation.isValid) {
            const errorMessages = passwordValidation.failed.join('\n• ');
            throw new Error(`New password does not meet security requirements:\n• ${errorMessages}`);
        }
        
        const token = localStorage.getItem('token');
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
          const response = await fetch(`${API_URL}/api/change-password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });
        
        const result = await response.json();
        if (response.ok) {
            // Clear the form
            document.getElementById('passwordForm').reset();
            clearPasswordErrors();
            
            // Show success modal instead of inline message
            window.modalManager.showModal('success', 'Password changed successfully! Your new password is now active.');
        } else {
            throw new Error(result.error || 'Failed to change password');
        }
    } catch (error) {
        console.error('Password change error:', error);
        
        // Use enhanced error categorization
        const errorInfo = categorizeError(error, response);
        
        // Show appropriate feedback based on error type
        if (errorInfo.modal) {
            window.modalManager.showModal('error', errorInfo.message);
        } else {
            showPasswordError(errorInfo.message);
        }
    } finally {
        updateBtn.disabled = false;
        updateBtn.textContent = originalText;
    }
}

function validatePasswordMatch() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPasswordElement = document.getElementById('confirmPassword');
    const confirmPassword = confirmPasswordElement.value;
    const confirmGroup = confirmPasswordElement.closest('.form-group');
    
    // Remove existing error/success classes and messages
    confirmGroup.classList.remove('error', 'success');
    confirmPasswordElement.classList.remove('password-match', 'password-mismatch');
    const existingMessage = confirmGroup.querySelector('.error-message, .success-message');
    if (existingMessage) {
        existingMessage.remove();
    }
      if (confirmPassword && newPassword) {
        if (newPassword === confirmPassword) {
            confirmGroup.classList.add('success');
            confirmPasswordElement.classList.add('password-match');
            const successMsg = document.createElement('div');
            successMsg.className = 'success-message';
            successMsg.textContent = 'Passwords match';
            confirmGroup.appendChild(successMsg);
        } else {
            confirmGroup.classList.add('error');
            confirmPasswordElement.classList.add('password-mismatch');
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.textContent = 'Passwords do not match';
            confirmGroup.appendChild(errorMsg);
        }
    }
    
    // Update field states using the field state manager
    if (window.fieldStateManager) {
        window.fieldStateManager.updateFieldState(confirmPasswordElement);
        const newPasswordElement = document.getElementById('newPassword');
        if (newPasswordElement) {
            window.fieldStateManager.updateFieldState(newPasswordElement);
        }
    }
}

function showProfileSuccess(message) {
    const profileSection = document.querySelector('.profile-section:first-child');
    showSectionMessage(profileSection, message, 'success');
}

function showProfileError(message) {
    const profileSection = document.querySelector('.profile-section:first-child');
    showSectionMessage(profileSection, message, 'error');
}

function showPasswordSuccess(message) {
    const passwordSection = document.querySelector('.profile-section:nth-child(2)');
    showSectionMessage(passwordSection, message, 'success');
}

function showPasswordError(message) {
    const passwordSection = document.querySelector('.profile-section:nth-child(2)');
    showSectionMessage(passwordSection, message, 'error');
}

function showSectionMessage(section, message, type) {
    // Check if section exists
    if (!section) {
        console.error('Section not found for message display:', message);
        // Fallback to showing modal
        if (typeof showModal === 'function') {
            showModal(type, message);
        }
        return;
    }
    
    // Remove existing messages
    const existingMessage = section.querySelector('.section-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `section-message ${type}`;
    messageDiv.style.cssText = `
        padding: 0.75rem 1rem;
        border-radius: 4px;
        margin-bottom: 1rem;
        font-weight: 500;
        ${type === 'success' 
            ? 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;' 
            : 'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;'
        }
    `;
    messageDiv.textContent = message;
    
    // Insert after the h2
    const h2 = section.querySelector('h2');
    h2.parentNode.insertBefore(messageDiv, h2.nextSibling);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}

function clearPasswordErrors() {
    const passwordSection = document.querySelector('.profile-section:nth-child(2)');
    const errorMessage = passwordSection.querySelector('.section-message.error');
    if (errorMessage) {
        errorMessage.remove();
    }
    
    // Clear field-level errors
    const errorGroups = passwordSection.querySelectorAll('.form-group.error');
    errorGroups.forEach(group => {
        group.classList.remove('error');
        const errorMsg = group.querySelector('.error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    });
    
    // Clear success states
    const successGroups = passwordSection.querySelectorAll('.form-group.success');
    successGroups.forEach(group => {
        group.classList.remove('success');
        const successMsg = group.querySelector('.success-message');
        if (successMsg) {
            successMsg.remove();
        }
    });
      // Clear password matching classes
    const passwordInputs = passwordSection.querySelectorAll('input[type="password"]');
    passwordInputs.forEach(input => {
        input.classList.remove('password-match', 'password-mismatch');
    });
    
    // Update field states using the field state manager
    if (window.fieldStateManager) {
        passwordInputs.forEach(input => {
            window.fieldStateManager.updateFieldState(input);
        });
    }
    
    // Hide the clear button if all password fields are empty after clearing errors
    const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
    if (cancelPasswordBtn) {
        const allPasswordFields = passwordSection.querySelectorAll('input[type="password"]');
        const hasContent = Array.from(allPasswordFields).some(input => input.value.trim());
        if (!hasContent) {
            cancelPasswordBtn.style.display = 'none';
        }
    }
}

// Profile editing state management functions
function setProfileEditingState(isEditing) {
    const profileFields = ['firstName', 'middleName', 'lastName', 'email'];
    const updateBtn = document.getElementById('updateProfileBtn');
    const cancelBtn = document.getElementById('cancelProfileBtn');
    
    profileFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.disabled = !isEditing;
        }
    });
    
    if (updateBtn) {
        updateBtn.textContent = isEditing ? 'Save Profile' : 'Update Profile';
    }
    
    if (cancelBtn) {
        cancelBtn.style.display = isEditing ? 'inline-block' : 'none';
    }
}

function enableProfileEditing() {
    // Store original values for potential cancellation
    const originalData = {
        firstName: document.getElementById('firstName').value,
        middleName: document.getElementById('middleName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value
    };
    
    // Store in a data attribute or global variable for access during cancel
    window.originalProfileData = originalData;
    
    setProfileEditingState(true);
}

function cancelProfileEditing() {
    // Restore original values
    if (window.originalProfileData) {
        document.getElementById('firstName').value = window.originalProfileData.firstName;
        document.getElementById('middleName').value = window.originalProfileData.middleName;
        document.getElementById('lastName').value = window.originalProfileData.lastName;
        document.getElementById('email').value = window.originalProfileData.email;
    }
    
    setProfileEditingState(false);
    
    // Clear stored original data
    delete window.originalProfileData;
}

// 2FA Profile Page Functions
async function load2FAStatus() {
    try {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
        const token = localStorage.getItem('token');
        
        // Check if user is logged in
        if (!token) {
            console.error('No authentication token found');
            update2FAStatus(false, null, 'Please log in to view 2FA settings');
            return;
        }
        
        const response = await fetch(`${API_URL}/api/2fa/status`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            update2FAStatus(data.enabled, data.setupDate);
        } else {
            console.error('Failed to load 2FA status:', response.status, response.statusText);
            if (response.status === 401) {
                update2FAStatus(false, null, 'Authentication expired. Please log in again.');
            } else {
                update2FAStatus(false);
            }
        }
        
    } catch (error) {
        console.error('Error loading 2FA status:', error);
        update2FAStatus(false, null, 'Unable to load 2FA status. Please check your connection.');
    }
}

function update2FAStatus(enabled, setupDate = null, errorMessage = null) {
    const statusBadge = document.getElementById('twofaStatus');
    const actionsContainer = document.getElementById('twofaActions');
    
    if (!statusBadge || !actionsContainer) {
        console.error('2FA elements not found on page');
        return;
    }
    
    if (errorMessage) {
        statusBadge.textContent = 'Error';
        statusBadge.className = 'status-badge error';
        
        actionsContainer.innerHTML = `
            <p class="security-note error">${errorMessage}</p>
        `;
        return;
    }
    
    if (enabled) {
        statusBadge.textContent = 'Enabled';
        statusBadge.className = 'status-badge enabled';
        
        let setupInfo = '';
        if (setupDate) {
            const date = new Date(setupDate);
            setupInfo = `<p class="setup-date">Enabled on: ${date.toLocaleDateString()}</p>`;
        }
        
        actionsContainer.innerHTML = `
            ${setupInfo}
            <button class="secondary-btn" onclick="disable2FA()" id="disable2FABtn">Disable 2FA</button>
        `;
    } else {
        statusBadge.textContent = 'Disabled';
        statusBadge.className = 'status-badge disabled';
        
        actionsContainer.innerHTML = `
            <p class="security-note">2FA is not currently enabled for your account.</p>
            <button class="primary-btn" onclick="setup2FA()" id="setup2FABtn">Enable 2FA</button>
        `;
    }
}

function setup2FA() {
    // Redirect to the 2FA setup page
    window.location.href = '../2fa-setup/';
}

async function disable2FA() {
    try {
        // Show password confirmation modal
        const password = await show2FAPasswordModal();
        if (!password) {
            return; // User cancelled
        }
        
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_URL}/api/2fa/disable`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword: password })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Update the UI to reflect disabled status
            update2FAStatus(false);
            window.modalManager.showModal('success', '2FA has been successfully disabled for your account.');
        } else {
            throw new Error(result.error || 'Failed to disable 2FA');
        }
        
    } catch (error) {
        console.error('Error disabling 2FA:', error);
        window.modalManager.showModal('error', error.message || 'Failed to disable 2FA. Please try again.');
    }
}

function show2FAPasswordModal() {
    return new Promise((resolve) => {
        // Prevent duplicate modals
        const existingModal = document.querySelector('.modal-overlay');
        if (existingModal) {
            return resolve(null);
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🔒 Disable Two-Factor Authentication</h3>
                </div>
                <div class="modal-body">
                    <p><strong>Enter your current password to disable 2FA:</strong></p>
                    <div class="form-group">
                        <input type="password" id="disable2FAPassword" placeholder="Current Password" style="width: 100%; padding: 12px; border: 2px solid #b2dfdb; border-radius: 6px; font-size: 1rem;">
                    </div>
                    <p style="color: #dc3545; margin-top: 1rem; font-size: 0.9rem;">⚠️ Warning: Disabling 2FA will reduce your account security. You will only need your password to log in.</p>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn secondary" id="cancel2FADisable">Cancel</button>
                    <button class="modal-btn danger" id="confirm2FADisable">Disable 2FA</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const passwordInput = document.getElementById('disable2FAPassword');
        passwordInput.focus();
        
        // Set up event handlers
        const cancelHandler = () => {
            document.body.removeChild(modal);
            resolve(null);
        };
        
        const confirmHandler = () => {
            const password = passwordInput.value.trim();
            if (!password) {
                passwordInput.style.borderColor = '#dc3545';
                passwordInput.focus();
                return;
            }
            document.body.removeChild(modal);
            resolve(password);
        };
        
        document.getElementById('cancel2FADisable').addEventListener('click', cancelHandler);
        document.getElementById('confirm2FADisable').addEventListener('click', confirmHandler);
        
        // Keyboard support
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                cancelHandler();
            } else if (e.key === 'Enter') {
                confirmHandler();
            }
        });
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                cancelHandler();
            }
        });
    });
}

// Admin Page Functionality
function initializeAdminPage() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
    
    // Load roles for dropdown
    loadRoles();
    
    // Navigation handlers
    setupAdminNavigation();
    
    // Form handlers
    setupCreateUserForm();
    
    // Load hamburger menu
    if (document.getElementById('hamburger-menu')) {
        loadMenu();
    }
}

// Patients Page Functionality
function initializePatientsPage() {
    // Navigation handlers
    setupPatientsNavigation();
    
    // Form handlers
    setupCreatePatientForm();
    
    // Load hamburger menu
    if (document.getElementById('hamburger-menu')) {
        loadMenu();
    }
}

// Force Password Change Page Functionality
function initializeForcePasswordChangePage() {
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const forcePasswordChangeForm = document.getElementById('forcePasswordChangeForm');
    
    if (newPassword && confirmPassword) {
        // Add password strength indicator for new password field
        addPasswordStrengthIndicator(newPassword);
        
        // Real-time password confirmation validation
        confirmPassword.addEventListener('input', function() {
            validateForcePasswordMatch();
            // Update field states
            if (window.fieldStateManager) {
                window.fieldStateManager.updateFieldState(confirmPassword);
            }
        });
        
        newPassword.addEventListener('input', function() {
            validateForcePasswordMatch();
            updatePasswordStrength(newPassword.value, newPassword.id);
            // Update field states
            if (window.fieldStateManager) {
                window.fieldStateManager.updateFieldState(newPassword);
            }
        });
    }
    
    // Handle form submission
    if (forcePasswordChangeForm) {
        forcePasswordChangeForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleForcePasswordChange();
        });
    }
}

function validateForcePasswordMatch() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPasswordElement = document.getElementById('confirmPassword');
    const confirmPassword = confirmPasswordElement.value;
    const confirmGroup = confirmPasswordElement.closest('.form-group');
    
    // Remove existing error/success classes and messages
    confirmGroup.classList.remove('error', 'success');
    confirmPasswordElement.classList.remove('password-match', 'password-mismatch');
    const existingMessage = confirmGroup.querySelector('.error-message, .success-message');
    if (existingMessage) {
        existingMessage.remove();
    }
      if (confirmPassword && newPassword) {
        if (newPassword === confirmPassword) {
            confirmGroup.classList.add('success');
            confirmPasswordElement.classList.add('password-match');
            const successMsg = document.createElement('div');
            successMsg.className = 'success-message';
            successMsg.textContent = 'Passwords match';
            confirmGroup.appendChild(successMsg);
        } else {
            confirmGroup.classList.add('error');
            confirmPasswordElement.classList.add('password-mismatch');
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.textContent = 'Passwords do not match';
            confirmGroup.appendChild(errorMsg);
        }
    }
    
    // Update field states using the field state manager
    if (window.fieldStateManager) {
        window.fieldStateManager.updateFieldState(confirmPasswordElement);
        const newPasswordElement = document.getElementById('newPassword');
        if (newPasswordElement) {
            window.fieldStateManager.updateFieldState(newPasswordElement);
        }
    }
}

async function handleForcePasswordChange() {
    const submitBtn = document.getElementById('changePasswordBtn');
    const originalText = submitBtn.textContent;
    const errorContainer = document.getElementById('errorContainer');
    const errorMessage = document.getElementById('errorMessage');
    
    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Changing Password...';
        
        // Hide any existing errors
        if (errorContainer) {
            errorContainer.style.display = 'none';
        }
        
        // Get form data
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validate required fields
        if (!currentPassword || !newPassword || !confirmPassword) {
            throw new Error('All password fields are required.');
        }
        
        // Validate password confirmation
        if (newPassword !== confirmPassword) {
            throw new Error('New passwords do not match.');
        }
          // Validate new password strength using healthcare standards
        const passwordValidation = validatePasswordStrength(newPassword);
        if (!passwordValidation.isValid) {
            const errorMessages = passwordValidation.failed.join('\n• ');
            throw new Error(`New password does not meet security requirements:\n• ${errorMessages}`);
        }
        
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication required. Please login again.');
        }
        
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
        
        const response = await fetch(`${API_URL}/api/force-change-password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Update user data to reflect password change is no longer required
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            userData.passwordChangeRequired = false;
            localStorage.setItem('user', JSON.stringify(userData));
            
            // Show success modal or redirect
            if (window.modalManager) {
                window.modalManager.showModal('success', 'Password changed successfully! Redirecting to main system...');
                setTimeout(() => {
                    window.location.href = '../welcome/';
                }, 2000);
            } else {
                // Fallback if modal manager not available
                alert('Password changed successfully! Redirecting...');
                window.location.href = '../welcome/';
            }
        } else {
            throw new Error(result.error || 'Failed to change password');
        }
    } catch (error) {
        console.error('Force password change error:', error);
        
        // Show error in the error container
        if (errorContainer && errorMessage) {
            errorMessage.textContent = error.message;
            errorContainer.style.display = 'block';
        } else if (window.modalManager) {
            window.modalManager.showModal('error', error.message);
        } else {
            alert('Error: ' + error.message);
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Patients Page Functions
function setupCreatePatientForm() {
    const createPatientForm = document.getElementById('createPatientForm');
    if (!createPatientForm) return;
    
    // Character limit validation for create patient form fields
    setupCreatePatientFieldValidation();
    
    // Handle form submission
    createPatientForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        await createPatient();
    });
}

function setupCreatePatientFieldValidation() {
    const createPatientFields = [
        { id: 'patientFirstName', maxLength: 50, label: 'First name' },
        { id: 'patientMiddleName', maxLength: 50, label: 'Middle name' },
        { id: 'patientLastName', maxLength: 50, label: 'Last name' },
        { id: 'patientAddress', maxLength: 100, label: 'Address' }
    ];
    
    createPatientFields.forEach(field => {
        const input = document.getElementById(field.id);
        if (input) {
            // Character count prevention
            input.addEventListener('input', function(e) {
                if (e.target.value.length > field.maxLength) {
                    e.target.value = e.target.value.substring(0, field.maxLength);
                    showCharacterLimitModal(field.label, field.maxLength);
                }
            });
            
            // Paste prevention for overlength content
            input.addEventListener('paste', function(e) {
                setTimeout(() => {
                    if (e.target.value.length > field.maxLength) {
                        e.target.value = e.target.value.substring(0, field.maxLength);
                        showCharacterLimitModal(field.label, field.maxLength);
                    }
                }, 0);
            });
        }
    });
}

async function createPatient() {
    const submitBtn = document.getElementById('createPatientSubmitBtn');
    const originalText = submitBtn.textContent;
    let response = null;
    
    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Patient...';
        
        // Pre-flight connectivity check
        const connectivity = await checkConnectivity();
        if (!connectivity.connected) {
            throw new Error(`Connection failed: ${connectivity.error}`);
        }
        
        // Get form data
        const formData = {
            firstName: document.getElementById('patientFirstName').value.trim(),
            middleName: document.getElementById('patientMiddleName').value.trim(),
            lastName: document.getElementById('patientLastName').value.trim(),
            address: document.getElementById('patientAddress').value.trim(),
            phone: document.getElementById('patientPhone').value.trim(),
            acceptsTexts: document.getElementById('acceptsTexts').value
        };
        
        // Validate required fields
        if (!formData.firstName || !formData.lastName || !formData.address || !formData.phone || !formData.acceptsTexts) {
            throw new Error('All fields except middle name are required.');
        }
        
        // Validate character limits
        if (formData.firstName.length > 50) {
            throw new Error('First name must be 50 characters or less.');
        }
        if (formData.middleName && formData.middleName.length > 50) {
            throw new Error('Middle name must be 50 characters or less.');
        }
        if (formData.lastName.length > 50) {
            throw new Error('Last name must be 50 characters or less.');
        }
        if (formData.address.length > 100) {
            throw new Error('Address must be 100 characters or less.');
        }
        
        // Validate phone number (basic validation for 10 digits)
        const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
        if (!phoneRegex.test(formData.phone)) {
            throw new Error('Please enter a valid 10-digit phone number.');
        }
        
        const token = localStorage.getItem('token');
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
        
        response = await fetch(`${API_URL}/api/patients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Clear the form
            document.getElementById('createPatientForm').reset();
            clearCreatePatientErrors();
            
            // Show success modal with simple personalized message
            const patientName = formData.middleName 
                ? `${formData.firstName} ${formData.middleName} ${formData.lastName}`
                : `${formData.firstName} ${formData.lastName}`;
            const successMessage = `Success, new patient ${patientName} created!`;
            window.modalManager.showModal('success', successMessage);
            
            // Redirect back to patient choice page after brief delay
            setTimeout(() => {
                window.modalManager.closeModal();
                // Navigate back to main patient page
                document.getElementById('createPatientSection').classList.add('hidden');
                document.getElementById('patientChoice').classList.remove('hidden');
            }, 2500);
            
            // Refresh patients if we're on manage patients section
            if (typeof loadPatients === 'function' && !document.getElementById('managePatientsSection').classList.contains('hidden')) {
                setTimeout(() => {
                    loadPatients();
                }, 1000);
            }
        } else {
            throw new Error(result.error || 'Failed to create patient');
        }
        
    } catch (error) {
        console.error('Create patient error:', error);
        
        // Use enhanced error categorization
        const errorInfo = categorizeError(error, response);
        
        // Show appropriate feedback based on error type
        if (errorInfo.modal) {
            window.modalManager.showModal('error', errorInfo.message);
        } else {
            showCreatePatientError(errorInfo.message);
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

function showCreatePatientError(message) {
    const createPatientSection = document.getElementById('createPatientSection');
    showSectionMessage(createPatientSection, message, 'error');
}

function clearCreatePatientErrors() {
    const createPatientSection = document.getElementById('createPatientSection');
    
    // Clear section-level error messages
    const errorMessage = createPatientSection.querySelector('.section-message.error');
    if (errorMessage) {
        errorMessage.remove();
    }
    
    // Clear field-level errors
    const errorGroups = createPatientSection.querySelectorAll('.form-group.error');
    errorGroups.forEach(group => {
        group.classList.remove('error');
        const errorMsg = group.querySelector('.error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    });
    
    // Clear success states
    const successGroups = createPatientSection.querySelectorAll('.form-group.success');
    successGroups.forEach(group => {
        group.classList.remove('success');
        const successMsg = group.querySelector('.success-message');
        if (successMsg) {
            successMsg.remove();
        }
    });
    
    // Update field states using the field state manager
    if (window.fieldStateManager) {
        const allFields = createPatientSection.querySelectorAll('input[type="text"], input[type="tel"], select');
        allFields.forEach(field => {
            window.fieldStateManager.updateFieldState(field);
        });
    }
}

// Patient Management Functions
let allPatients = [];
let currentPatientSort = { column: null, direction: null };

async function loadPatients() {
    try {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
        const token = localStorage.getItem('token');
        
        const patientsLoading = document.getElementById('patientsLoading');
        const patientsTableBody = document.getElementById('patientsTableBody');
        
        if (patientsLoading) patientsLoading.style.display = 'block';
        if (patientsTableBody) patientsTableBody.innerHTML = '';
        
        const response = await fetch(`${API_URL}/api/patients`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            allPatients = await response.json();
            setupPatientTableSorting();
            const sortedPatients = getSortedPatients();
            displayPatients(sortedPatients);
        } else {
            throw new Error('Failed to load patients');
        }
    } catch (error) {
        console.error('Error loading patients:', error);
        const patientsTableBody = document.getElementById('patientsTableBody');
        if (patientsTableBody) {
            patientsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #dc3545;">Error loading patients. Please try again.</td></tr>';
        }
    } finally {
        const patientsLoading = document.getElementById('patientsLoading');
        if (patientsLoading) patientsLoading.style.display = 'none';
    }
}

function setupPatientTableSorting() {
    const table = document.getElementById('patientsTable');
    if (!table) return;
    
    const headers = table.querySelectorAll('thead th');
    
    // Define sortable columns
    const sortableColumns = [
        { index: 0, key: 'fullName', label: 'Name' },
        { index: 1, key: 'address', label: 'Address' },
        { index: 2, key: 'phone', label: 'Phone' },
        { index: 3, key: 'acceptsTexts', label: 'Accepts Texts' },
        { index: 4, key: 'created', label: 'Created' }
    ];
    
    sortableColumns.forEach(column => {
        const header = headers[column.index];
        if (header) {
            header.style.cursor = 'pointer';
            header.innerHTML = `${column.label} <span class="sort-indicator" data-column="${column.key}"></span>`;
            header.addEventListener('click', () => handlePatientSort(column.key));
        }
    });
}

function handlePatientSort(columnKey) {
    // Determine new sort direction
    if (currentPatientSort.column === columnKey) {
        if (currentPatientSort.direction === null) {
            currentPatientSort.direction = 'asc';
        } else if (currentPatientSort.direction === 'asc') {
            currentPatientSort.direction = 'desc';
        } else {
            currentPatientSort.direction = null;
        }
    } else {
        currentPatientSort.column = columnKey;
        currentPatientSort.direction = 'asc';
    }
    
    // Update sort indicators
    updatePatientSortIndicators();
    
    // Sort and display patients
    const sortedPatients = getSortedPatients();
    displayPatients(sortedPatients);
}

function updatePatientSortIndicators() {
    const indicators = document.querySelectorAll('.sort-indicator');
    
    indicators.forEach(indicator => {
        const column = indicator.dataset.column;
        if (column === currentPatientSort.column) {
            if (currentPatientSort.direction === 'asc') {
                indicator.textContent = ' ↑';
            } else if (currentPatientSort.direction === 'desc') {
                indicator.textContent = ' ↓';
            } else {
                indicator.textContent = '';
            }
        } else {
            indicator.textContent = '';
        }
    });
}

function getSortedPatients() {
    if (!currentPatientSort.column || !currentPatientSort.direction) {
        return allPatients;
    }
    
    return [...allPatients].sort((a, b) => {
        let aValue, bValue;
        
        switch (currentPatientSort.column) {
            case 'fullName':
                aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
                bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
                break;
            case 'address':
                aValue = a.address?.toLowerCase() || '';
                bValue = b.address?.toLowerCase() || '';
                break;
            case 'phone':
                aValue = a.phone || '';
                bValue = b.phone || '';
                break;
            case 'acceptsTexts':
                aValue = a.accepts_texts ? 'yes' : 'no';
                bValue = b.accepts_texts ? 'yes' : 'no';
                break;
            case 'created':
                aValue = new Date(a.created_at);
                bValue = new Date(b.created_at);
                break;
            default:
                return 0;
        }
        
        if (aValue < bValue) return currentPatientSort.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return currentPatientSort.direction === 'asc' ? 1 : -1;
        return 0;
    });
}

function displayPatients(patients) {
    const patientsTableBody = document.getElementById('patientsTableBody');
    const noPatientsFound = document.getElementById('noPatientsFound');
    
    if (!patientsTableBody) return;
    
    if (patients.length === 0) {
        patientsTableBody.innerHTML = '';
        if (noPatientsFound) noPatientsFound.classList.remove('hidden');
        return;
    }
    
    if (noPatientsFound) noPatientsFound.classList.add('hidden');
    
    patientsTableBody.innerHTML = patients.map(patient => {
        const fullName = patient.middle_name 
            ? `${patient.first_name} ${patient.middle_name} ${patient.last_name}`
            : `${patient.first_name} ${patient.last_name}`;
        
        const acceptsTexts = patient.accepts_texts ? 'Yes' : 'No';
        const acceptsTextsClass = patient.accepts_texts ? 'yes' : 'no';
        
        const createdDate = new Date(patient.created_at).toLocaleDateString();
        
        return `
            <tr data-patient-id="${patient.patient_key}">
                <td>
                    <div class="patient-name">
                        <div class="patient-full-name">${fullName}</div>
                    </div>
                </td>
                <td>${patient.address || ''}</td>
                <td>${patient.phone || ''}</td>
                <td>
                    <span class="accepts-texts ${acceptsTextsClass}">
                        ${acceptsTexts}
                    </span>
                </td>
                <td class="patient-created">${createdDate}</td>
                <td>
                    <div class="patient-actions">
                        <button class="btn-icon btn-edit" onclick="editPatient(${patient.patient_key})" title="Edit Patient">
                            ✏️
                        </button>
                        <button class="btn-icon btn-delete" onclick="deletePatient(${patient.patient_key}, '${fullName}')" title="Delete Patient">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterPatients() {
    const filterValue = document.getElementById('patientFilter').value.toLowerCase();
    
    if (!filterValue.trim()) {
        const sortedPatients = getSortedPatients();
        displayPatients(sortedPatients);
        return;
    }
    
    const filteredPatients = allPatients.filter(patient => {
        const fullName = patient.middle_name 
            ? `${patient.first_name} ${patient.middle_name} ${patient.last_name}`
            : `${patient.first_name} ${patient.last_name}`;
        
        return fullName.toLowerCase().includes(filterValue) ||
               (patient.phone && patient.phone.includes(filterValue)) ||
               (patient.address && patient.address.toLowerCase().includes(filterValue));
    });
    
    displayPatients(filteredPatients);
}

function setupPatientFilter() {
    const patientFilter = document.getElementById('patientFilter');
    if (patientFilter) {
        patientFilter.addEventListener('input', filterPatients);
    }
}

// Placeholder functions for patient editing and deletion
function editPatient(patientId) {
    console.log('Edit patient functionality not yet implemented for ID:', patientId);
    window.modalManager.showModal('info', 'Patient editing functionality will be implemented in a future update.');
}

function deletePatient(patientId, patientName) {
    console.log('Delete patient functionality not yet implemented for ID:', patientId);
    window.modalManager.showModal('info', 'Patient deletion functionality will be implemented in a future update.');
}