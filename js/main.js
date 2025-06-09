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
    if (adminLink) {
        // Check if we're currently on the admin page
        const currentPath = window.location.pathname;
        const currentPage = currentPath.split('/').filter(Boolean).pop() || 'welcome';
        const isCurrentPage = currentPage === 'admin';
        
        if (isAdmin && !isCurrentPage) {
            adminLink.style.display = 'block';
            adminLink.classList.remove('admin-only');
        } else {
            adminLink.style.display = 'none';
        }
    }
}

// Handle both normal page loads and back/forward cache restores
function initializePage() {    // Detect if running locally or in production
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
    const FADE_DURATION = 500;
    
    // Check if current page is login page
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath === '/' || currentPath === '/index.html' || currentPath === '';
    
    // Clear authentication data if on login page to ensure clean state
    // BUT only if we don't have a valid session that was just created
    if (isLoginPage && document.getElementById('loginForm')) {
        const hasValidSession = sessionStorage.getItem('currentTabId') && localStorage.getItem('token');
        
        if (!hasValidSession) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.clear();
        }
    }
    
    // Unified modal management
    const modalManager = {
        isShowingModal: false,
        
        showModal: function(type, message) {
            if (this.isShowingModal) return;
            
            this.isShowingModal = true;            const modalHtml = `
                <div class="modal" id="feedbackModal" tabindex="-1">
                    <div class="modal-content ${type}">
                        <h2>${type === 'success' ? '✓ Success!' : '⚠ Error'}</h2>
                        <p>${message}</p>
                        <button class="modal-btn" onclick="closeModal()">Close</button>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
              // Add keyboard event listener for all modals
            const modal = document.getElementById('feedbackModal');
            modal.focus();
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                    closeModal();
                }
            });if (type === 'success') {
                // Only redirect to welcome page if we're not on the admin page
                const isAdminPage = window.location.pathname.includes('/admin/');
                if (!isAdminPage) {
                    setTimeout(() => {
                        document.body.classList.add('fade-out');
                        setTimeout(() => {
                            window.location.href = "../welcome/";
                        }, FADE_DURATION);
                    }, 2000);
                } else {
                    // On admin pages, auto-hide success modal after 4 seconds
                    setTimeout(() => {
                        this.closeModal();
                    }, 4000);
                }
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
        }    };    // Make modal functions globally available
    window.showModal = modalManager.showModal.bind(modalManager);
    window.closeModal = modalManager.closeModal.bind(modalManager);
    window.modalManager = modalManager; // Make modalManager globally accessible
    
    // Handle login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            if (modalManager.isShowingModal) {
                return;
            }

            const submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';            try {
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
                });
                
                const data = await response.json();
                
                // Handle 2FA requirement
                if (response.ok && data.requires2FA) {
                    // Show 2FA input field
                    document.getElementById('twofaGroup').classList.remove('hidden');
                    document.getElementById('twofaCode').focus();
                    submitBtn.textContent = 'Verify Code';
                    window.modalManager.showModal('success', '2FA verification required. Please enter your authenticator code.');
                    return;
                }
                
                if (response.ok && data.token) {
                    // Store authentication data
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));                    // Initialize session management - ensure proper session creation
                    try {
                        if (window.SessionManager && typeof window.SessionManager.initSession === 'function') {
                            console.log('Initializing session with SessionManager');
                            window.SessionManager.initSession();
                            
                            // Verify session was created and give time for persistence
                            await new Promise(resolve => setTimeout(resolve, 200));
                            
                            // Double-check that session data persisted correctly
                            const sessionData = window.SessionManager.getSessionData();
                            const currentTabId = sessionStorage.getItem('currentTabId');
                            
                            console.log('Session verification after init:', {
                                sessionData: sessionData,
                                currentTabId: currentTabId,
                                hasSessionData: !!sessionData,
                                hasTabId: !!currentTabId
                            });
                            
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
                            
                            console.log('Fallback session initialized:', tabId);
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
                    updateAdminUI(isAdmin);

                    // Check if user needs to change password on first login
                    if (data.user.passwordChangeRequired) {
                        // Redirect to forced password change page
                        document.body.classList.add('fade-out');
                        setTimeout(() => {
                            window.location.href = "force-password-change/";
                        }, FADE_DURATION + 200);
                    } else {
                        // Normal login flow - redirect to welcome page
                        document.body.classList.add('fade-out');
                        setTimeout(() => {
                            window.location.href = "welcome/";
                        }, FADE_DURATION + 200); // Extended delay for robust session persistence
                    }
                } else {const message = response.status === 401 
                        ? 'Invalid username or password'
                        : data.error || 'Login failed';
                    
                    window.modalManager.showModal('error', message);
                }            } catch (err) {
                console.error('Login error:', err);
                window.modalManager.showModal('error', 'Connection error. Please try again.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
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
                document.body.classList.add('fade-out');                setTimeout(() => {
                    window.location.href = href;
                }, FADE_DURATION);
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
    }
      // Initialize profile page if we're on it
    if (window.location.pathname.includes('/profile/')) {
        initializeProfilePage();
    }
      // Initialize admin page if we're on it
    if (window.location.pathname.includes('/admin/')) {
        initializeAdminPage();
    }
    
    // Initialize patient page if present
    if (document.getElementById('patientChoice')) {
        initializePatientPage();
    }
}

// Handle both normal page loads and bfcache restores
document.addEventListener('DOMContentLoaded', initializePage);
window.addEventListener('pageshow', function(event) {
    // If page was restored from bfcache, reinitialize
    if (event.persisted) {
        console.log('Page restored from bfcache, reinitializing...');
        initializePage();
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
            });            // Hide current page in menu
            const currentPath = window.location.pathname;
            const currentPage = currentPath.split('/').filter(Boolean).pop() || 'welcome';
            
            const menuItems = sideMenu.querySelectorAll('a[data-page]');
            menuItems.forEach(item => {
                const itemPage = item.getAttribute('data-page');
                if (itemPage === currentPage) {
                    item.parentElement.style.display = 'none';
                }
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
            }            // Add tab ID indicator - shows last 4 characters of session ID for session tracking
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
        });        // Handle cancel button
        const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
        if (cancelPasswordBtn) {
            cancelPasswordBtn.addEventListener('click', function() {
                passwordForm.reset();
                clearPasswordErrors();
                
                // Reset password strength indicators after clearing
                const newPassword = document.getElementById('newPassword');
                if (newPassword) {
                    updatePasswordStrength('', newPassword.id);
                }
                
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
    
    // Initialize 2FA management if on profile page
    if (document.getElementById('twofaStatus')) {
        initialize2FAManagement();
    }
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
            // Enhanced input handler with field state management
            input.addEventListener('input', function(e) {
                // Character count prevention
                if (e.target.value.length > field.maxLength) {
                    e.target.value = e.target.value.substring(0, field.maxLength);
                    showCharacterLimitModal(field.label, field.maxLength);
                }
                
                // Immediate field state update for content changes
                if (window.fieldStateManager) {
                    // Force immediate update for responsive field state changes
                    window.fieldStateManager.forceUpdateField(e.target);
                }
            });
            
            // Additional event listeners for field state management
            input.addEventListener('keyup', function(e) {
                // Handle immediate content clearing (backspace, delete, etc.)
                if (window.fieldStateManager) {
                    setTimeout(() => {
                        window.fieldStateManager.forceUpdateField(e.target);
                    }, 10); // Small delay to ensure value is updated
                }
            });
            
            input.addEventListener('change', function(e) {
                // Handle value changes from other sources (cut, paste, etc.)
                if (window.fieldStateManager) {
                    window.fieldStateManager.forceUpdateField(e.target);
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

function showCharacterLimitModal(fieldName, maxLength) {
    // Check if modal is already showing to prevent duplicates
    if (typeof window.modalManager !== 'undefined' && window.modalManager.isShowingModal) {
        return;
    }
    
    const message = `${fieldName} cannot exceed ${maxLength} characters. The text has been automatically trimmed.`;
    
    if (typeof showModal === 'function') {
        showModal('error', message);
    } else if (typeof window.modalManager !== 'undefined') {
        window.modalManager.showModal('error', message);
    } else {
        alert(message); // Fallback
    }
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
        }          // Validate new password strength using healthcare standards and current password check
        const passwordValidation = validatePasswordWithCurrentCheck(newPassword, currentPassword);
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
    
    // Reset password strength indicators for empty password fields
    const newPasswordField = passwordSection.querySelector('#newPassword');
    if (newPasswordField && !newPasswordField.value.trim()) {
        updatePasswordStrength('', newPasswordField.id);
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
            // Update field state after changing disabled status
            if (window.fieldStateManager) {
                window.fieldStateManager.updateFieldState(field);
            }
        }
    });
    
    if (updateBtn) {
        updateBtn.textContent = isEditing ? 'Save Profile' : 'Update Profile';
    }
    
    if (cancelBtn) {
        cancelBtn.style.display = isEditing ? 'inline-block' : 'none';
    }
      // Force update all profile fields after state change
    if (window.fieldStateManager && window.fieldStateManager.updateProfileFields) {
        // Small delay to ensure DOM updates are complete
        setTimeout(() => {
            // First refresh field requirements to ensure email field is properly detected
            if (window.fieldStateManager.refreshFieldRequirements) {
                window.fieldStateManager.refreshFieldRequirements();
            }
            // Then update all profile field states
            window.fieldStateManager.updateProfileFields();
        }, 50);
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
        
        // Update field states after restoring values using enhanced method
        if (window.fieldStateManager) {
            if (window.fieldStateManager.updateProfileFields) {
                // Use the new dedicated method for profile fields
                window.fieldStateManager.updateProfileFields();
            } else {
                // Fallback to individual updates
                ['firstName', 'middleName', 'lastName', 'email'].forEach(fieldId => {
                    const field = document.getElementById(fieldId);
                    if (field) {
                        window.fieldStateManager.updateFieldState(field);
                    }
                });
            }
        }
    }
    
    setProfileEditingState(false);
    
    // Clear stored original data
    delete window.originalProfileData;
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

function setupAdminNavigation() {
    const adminChoice = document.getElementById('adminChoice');
    const createUserSection = document.getElementById('createUserSection');
    const manageUsersSection = document.getElementById('manageUsersSection');
    
    // Choice button handlers
    document.getElementById('createUserBtn')?.addEventListener('click', function() {
        adminChoice.classList.add('hidden');
        createUserSection.classList.remove('hidden');
    });
      document.getElementById('manageUsersBtn')?.addEventListener('click', function() {
        adminChoice.classList.add('hidden');
        manageUsersSection.classList.remove('hidden');
        // Load users and setup user management
        loadUsers();
        loadRolesForUserManagement();
        setupUserFilter();
    });
    
    // Cancel button handler
    document.getElementById('cancelCreateUser')?.addEventListener('click', function() {
        createUserSection.classList.add('hidden');
        adminChoice.classList.remove('hidden');
        document.getElementById('createUserForm')?.reset();
        clearCreateUserErrors();
    });
}

async function loadRoles() {
    try {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_URL}/api/roles`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const roles = await response.json();
            const roleSelect = document.getElementById('userRole');
            if (roleSelect) {
                // Clear existing options except the placeholder
                roleSelect.innerHTML = '<option value="">Select a role...</option>';
                
                // Add role options
                roles.forEach(role => {
                    const option = document.createElement('option');
                    option.value = role.role_key;
                    option.textContent = role.role_name;
                    roleSelect.appendChild(option);
                });
            }
        } else {
            console.error('Failed to load roles');
        }
    } catch (error) {
        console.error('Error loading roles:', error);
    }
}

function setupCreateUserForm() {
    const createUserForm = document.getElementById('createUserForm');
    if (!createUserForm) return;
    
    // Get form elements
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const newUsername = document.getElementById('newUsername');
    
    // Add password strength indicator for create user form
    if (newPassword) {
        addPasswordStrengthIndicator(newPassword);
    }
      // Real-time password confirmation validation
    if (newPassword && confirmPassword) {
        confirmPassword.addEventListener('input', function() {
            validateCreateUserPasswordMatch();
            // Update field states
            if (window.fieldStateManager) {
                window.fieldStateManager.updateFieldState(confirmPassword);
            }        });
        
        newPassword.addEventListener('input', function() {
            validateCreateUserPasswordMatch();
            // Update field states
            if (window.fieldStateManager) {
                window.fieldStateManager.updateFieldState(newPassword);
            }
        });
    }
    
    // Username availability checking (debounced)
    if (newUsername) {
        let usernameTimeout;
        newUsername.addEventListener('input', function() {
            clearTimeout(usernameTimeout);
            usernameTimeout = setTimeout(() => {
                checkUsernameAvailability(newUsername.value.trim());
            }, 500);
            // Update field states
            if (window.fieldStateManager) {
                window.fieldStateManager.updateFieldState(newUsername);
            }
        });
    }
    
    // Character limit validation for create user form fields
    setupCreateUserFieldValidation();
      // Handle form submission
    createUserForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        await createUser();
    });
    
    // Initialize field state management for create user form
    if (window.fieldStateManager) {
        // Small delay to ensure form is fully rendered
        setTimeout(() => {
            const formFields = createUserForm.querySelectorAll('input, select, textarea');
            formFields.forEach(field => {
                window.fieldStateManager.updateFieldState(field);
            });
        }, 100);
    }
}

async function createUser() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
    
    const form = document.getElementById('createUserForm');
    const formData = new FormData(form);    const newUser = {
        username: formData.get('username'),
        firstName: formData.get('firstName'),
        middleName: formData.get('middleName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword'),
        roleKey: formData.get('role')
    };
    
    // Debug logging
    console.log('Form data collected:', newUser);
    console.log('FormData entries:', Array.from(formData.entries()));
      // Validate required fields
    if (!newUser.username || !newUser.firstName || !newUser.lastName || !newUser.email || !newUser.password || !newUser.confirmPassword || !newUser.roleKey) {
        console.log('Validation failed - missing fields:', {
            username: !!newUser.username,
            firstName: !!newUser.firstName,
            lastName: !!newUser.lastName,
            email: !!newUser.email,
            password: !!newUser.password,
            confirmPassword: !!newUser.confirmPassword,
            roleKey: !!newUser.roleKey
        });
        window.modalManager.showModal('error', 'All fields except middle name are required.');
        return;
    }
    
    // Validate password match
    if (newUser.password !== newUser.confirmPassword) {
        window.modalManager.showModal('error', 'Passwords do not match.');
        return;
    }
    
    try {        const response = await fetch(`${API_URL}/api/create-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(newUser)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            window.modalManager.showModal('success', 'User created successfully!');
            form.reset();
            clearCreateUserErrors();
            document.getElementById('createUserSection').classList.add('hidden');
            // Refresh the users list
            loadUsers();
        } else {
            window.modalManager.showModal('error', result.error || 'Failed to create user');
        }
        
    } catch (error) {
        console.error('Error creating user:', error);
        window.modalManager.showModal('error', 'Network error. Please try again.');
    }
}

function validateCreateUserPasswordMatch() {
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

async function checkUsernameAvailability(username) {
    if (!username || username.length < 3) {
        clearUsernameValidation();
        return;
    }
    
    try {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_URL}/api/check-username`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ username })
        });
        
        const result = await response.json();
        const usernameInput = document.getElementById('newUsername');
        const usernameGroup = usernameInput.closest('.form-group');
        
        // Clear existing validation states
        usernameGroup.classList.remove('error', 'success');
        const existingMessage = usernameGroup.querySelector('.error-message, .success-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        if (response.ok) {
            if (result.available) {
                usernameGroup.classList.add('success');
                const successMsg = document.createElement('div');
                successMsg.className = 'success-message';
                successMsg.textContent = 'Username is available';
                usernameGroup.appendChild(successMsg);
            } else {
                usernameGroup.classList.add('error');
                const errorMsg = document.createElement('div');
                errorMsg.className = 'error-message';
                errorMsg.textContent = 'Username is already taken';
                usernameGroup.appendChild(errorMsg);
            }
        }
    } catch (error) {
        console.error('Error checking username availability:', error);
    }
}

function clearUsernameValidation() {
    const usernameInput = document.getElementById('newUsername');
    if (usernameInput) {
        const usernameGroup = usernameInput.closest('.form-group');
        usernameGroup.classList.remove('error', 'success');
        const existingMessage = usernameGroup.querySelector('.error-message, .success-message');
        if (existingMessage) {
            existingMessage.remove();
        }
    }
}

function setupCreateUserFieldValidation() {
    const createUserFields = [
        { id: 'firstName', maxLength: 50, label: 'First name' },
        { id: 'middleName', maxLength: 50, label: 'Middle name' },
        { id: 'lastName', maxLength: 50, label: 'Last name' },
        { id: 'email', maxLength: 50, label: 'Email' },
        { id: 'newUsername', maxLength: 50, label: 'Username' }
    ];
    
    createUserFields.forEach(field => {
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

// Password strength indicator functions
function addPasswordStrengthIndicator(passwordField) {
    if (!passwordField || passwordField.dataset.strengthAdded === 'true') {
        return; // Already added or field doesn't exist
    }
    
    // Create strength indicator container
    const strengthContainer = document.createElement('div');
    strengthContainer.className = 'password-strength-container';
    strengthContainer.style.marginTop = '5px';
    
    // Create strength bar
    const strengthBar = document.createElement('div');
    strengthBar.className = 'password-strength-bar';
    strengthBar.style.height = '4px';
    strengthBar.style.backgroundColor = '#e0e0e0';
    strengthBar.style.borderRadius = '2px';
    strengthBar.style.overflow = 'hidden';
    
    const strengthFill = document.createElement('div');
    strengthFill.className = 'password-strength-fill';
    strengthFill.style.height = '100%';
    strengthFill.style.width = '0%';
    strengthFill.style.transition = 'width 0.3s ease, background-color 0.3s ease';
    strengthFill.style.borderRadius = '2px';
    
    strengthBar.appendChild(strengthFill);
    
    // Create strength text
    const strengthText = document.createElement('div');
    strengthText.className = 'password-strength-text';
    strengthText.style.fontSize = '12px';
    strengthText.style.marginTop = '2px';
    strengthText.style.color = '#666';
    strengthText.textContent = 'Password strength will appear here';
    
    strengthContainer.appendChild(strengthBar);
    strengthContainer.appendChild(strengthText);
    
    // Insert after the password field
    passwordField.parentNode.insertBefore(strengthContainer, passwordField.nextSibling);
    
    // Add event listener
    passwordField.addEventListener('input', function() {
        updatePasswordStrength(passwordField, strengthFill, strengthText);
    });
    
    // Mark as added to prevent duplicates
    passwordField.dataset.strengthAdded = 'true';
}

function updatePasswordStrength(passwordField, strengthFill, strengthText) {
    const password = passwordField.value;
    const strength = calculatePasswordStrength(password);
    
    // Update strength bar
    strengthFill.style.width = strength.percentage + '%';
    strengthFill.style.backgroundColor = strength.color;
    
    // Update strength text
    strengthText.textContent = strength.message;
    strengthText.style.color = strength.color;
}

function calculatePasswordStrength(password) {
    if (!password) {
        return {
            percentage: 0,
            color: '#e0e0e0',
            message: 'Enter a password'
        };
    }
    
    let score = 0;
    let feedback = [];
    
    // Length check
    if (password.length >= 8) {
        score += 20;
    } else {
        feedback.push('at least 8 characters');
    }
    
    // Uppercase check
    if (/[A-Z]/.test(password)) {
        score += 20;
    } else {
        feedback.push('uppercase letter');
    }
    
    // Lowercase check
    if (/[a-z]/.test(password)) {
        score += 20;
    } else {
        feedback.push('lowercase letter');
    }
    
    // Number check
    if (/\d/.test(password)) {
        score += 20;
    } else {
        feedback.push('number');
    }
    
    // Special character check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        score += 20;
    } else {
        feedback.push('special character');
    }
    
    // Determine strength level and color
    let level, color, message;
    
    if (score < 40) {
        level = 'Weak';
        color = '#ff4757';
        message = `Weak - Add: ${feedback.join(', ')}`;
    } else if (score < 60) {
        level = 'Fair';
        color = '#ffa502';
        message = `Fair - Add: ${feedback.join(', ')}`;
    } else if (score < 80) {
        level = 'Good';
        color = '#3742fa';
        message = feedback.length > 0 ? `Good - Add: ${feedback.join(', ')}` : 'Good password';
    } else {
        level = 'Strong';
        color = '#2ed573';
        message = 'Strong password';
    }
    
    return {
        percentage: score,
        color: color,
        message: message,
        level: level
    };
}

// Password validation functions
function validatePasswordWithCurrentCheck(newPassword, currentPassword) {
    const failed = [];
    
    // Check if new password is same as current password
    if (newPassword === currentPassword) {
        failed.push('New password must be different from current password');
    }
    
    // Healthcare-grade password requirements
    if (newPassword.length < 12) {
        failed.push('At least 12 characters');
    }
    
    if (!/[a-z]/.test(newPassword)) {
        failed.push('At least one lowercase letter');
    }
    
    if (!/[A-Z]/.test(newPassword)) {
        failed.push('At least one uppercase letter');
    }
    
    if (!/\d/.test(newPassword)) {
        failed.push('At least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
        failed.push('At least one special character');
    }
    
    // Check for common patterns (prevent sequential, repeated, etc.)
    if (/(.)\1{2,}/.test(newPassword)) {
        failed.push('No more than 2 consecutive identical characters');
    }
    
    if (/012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(newPassword)) {
        failed.push('No sequential characters (123, abc, etc.)');
    }
    
    return {
        isValid: failed.length === 0,
        failed: failed,
        score: calculatePasswordStrength(newPassword).percentage
    };
}

// User management functions
async function editUser(username) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
    
    try {
        // For now, show a modal indicating this feature is coming soon
        // In a full implementation, this would open an edit modal
        window.modalManager.showModal('info', `Edit user functionality for "${username}" is coming soon.`);
        
        // TODO: Implement user editing functionality
        // This would typically:
        // 1. Fetch user details
        // 2. Show edit modal with pre-filled form
        // 3. Handle form submission
        // 4. Update user data via API
        
    } catch (error) {
        console.error('Error in editUser:', error);
        window.modalManager.showModal('error', 'Error opening user editor.');
    }
}

async function deleteUser(userId, username) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
    
    // Show confirmation dialog
    const confirmed = confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`);
    
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            window.modalManager.showModal('success', `User "${username}" has been deleted successfully.`);
            // Refresh the users list
            loadUsers();
        } else {
            window.modalManager.showModal('error', result.error || 'Failed to delete user');
        }
        
    } catch (error) {
        console.error('Error deleting user:', error);
        window.modalManager.showModal('error', 'Network error. Please try again.');
    }
}

// Additional admin utility functions
async function loadRolesForUserManagement() {
    // This function loads roles for the user management section
    try {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_URL}/api/roles`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const roles = await response.json();
            console.log('Roles loaded for user management:', roles);
            // TODO: Populate role filters/dropdowns in user management section
        } else {
            console.error('Failed to load roles for user management');
        }
    } catch (error) {
        console.error('Error loading roles for user management:', error);
    }
}

function setupUserFilter() {
    // This function sets up filtering functionality for the user management section
    const filterInput = document.getElementById('userFilter');
    if (filterInput) {
        filterInput.addEventListener('input', function(e) {
            const filterText = e.target.value.toLowerCase();
            const userItems = document.querySelectorAll('.user-item');
            
            userItems.forEach(item => {
                const userText = item.textContent.toLowerCase();
                if (userText.includes(filterText)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
}

// Patient Page Functionality
function initializePatientPage() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
    
    // Setup navigation handlers
    setupPatientNavigation();
    
    // Setup form handlers
    setupCreatePatientForm();
    
    // Load hamburger menu
    if (document.getElementById('hamburger-menu')) {
        loadMenu();
    }
}

function setupPatientNavigation() {
    const patientChoice = document.getElementById('patientChoice');
    const createPatientSection = document.getElementById('createPatientSection');
    const managePatientsSection = document.getElementById('managePatientsSection');
    
    // Choice button handlers
    document.getElementById('createPatientBtn')?.addEventListener('click', function() {
        patientChoice.classList.add('hidden');
        createPatientSection.classList.remove('hidden');
    });
      
    document.getElementById('managePatientsBtn')?.addEventListener('click', function() {
        patientChoice.classList.add('hidden');
        managePatientsSection.classList.remove('hidden');
        // Load patients for management
        loadPatients();
        setupPatientFilter();
    });
    
    // Cancel button handler
    document.getElementById('cancelCreatePatient')?.addEventListener('click', function() {
        createPatientSection.classList.add('hidden');
        patientChoice.classList.remove('hidden');
        document.getElementById('createPatientForm')?.reset();
        clearCreatePatientErrors();
    });
}

function setupCreatePatientForm() {
    const createPatientForm = document.getElementById('createPatientForm');
    if (!createPatientForm) return;
    
    // Handle form submission
    createPatientForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        await handleCreatePatient();
    });
    
    // Phone number formatting and validation
    const phoneInput = document.getElementById('patientPhone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            // Remove all non-digits
            let value = e.target.value.replace(/\D/g, '');
            
            // Format as (XXX) XXX-XXXX
            if (value.length >= 6) {
                value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
            } else if (value.length >= 3) {
                value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
            }
            
            e.target.value = value;
        });
    }
}

async function loadPatients() {
    try {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
        const token = localStorage.getItem('token');
        
        const loadingDiv = document.getElementById('patientsLoading');
        const tableBody = document.getElementById('patientsTableBody');
        const noResults = document.getElementById('noPatientsFound');
        
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (noResults) noResults.classList.add('hidden');
        
        const response = await fetch(`${API_URL}/api/patients`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const patients = await response.json();
            
            if (loadingDiv) loadingDiv.style.display = 'none';
            
            if (patients.length === 0) {
                if (noResults) noResults.classList.remove('hidden');
                return;
            }
            
            // Populate table
            if (tableBody) {
                tableBody.innerHTML = patients.map(patient => `
                    <tr data-patient-key="${patient.patient_key}">
                        <td>${patient.first_name} ${patient.middle_name || ''} ${patient.last_name}</td>
                        <td>${patient.address}, ${patient.city}, ${patient.state} ${patient.zip_code}</td>
                        <td>${patient.phone}</td>
                        <td>${patient.accepts_texts ? 'Yes' : 'No'}</td>
                        <td>${new Date(patient.date_when).toLocaleDateString()}</td>
                        <td>
                            <button class="delete-btn" onclick="deletePatient(${patient.patient_key})" title="Delete Patient">
                                Delete
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        } else {
            console.error('Failed to load patients');
            if (loadingDiv) loadingDiv.style.display = 'none';
            if (noResults) {
                noResults.textContent = 'Failed to load patients. Please try again.';
                noResults.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Error loading patients:', error);
        const loadingDiv = document.getElementById('patientsLoading');
        const noResults = document.getElementById('noPatientsFound');
        
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (noResults) {
            noResults.textContent = 'Error loading patients. Please check your connection.';
            noResults.classList.remove('hidden');
        }
    }
}

async function handleCreatePatient() {
    const submitBtn = document.getElementById('createPatientSubmitBtn');
    const originalText = submitBtn.textContent;
    
    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';
        
        const formData = {
            firstName: document.getElementById('patientFirstName').value.trim(),
            middleName: document.getElementById('patientMiddleName').value.trim(),
            lastName: document.getElementById('patientLastName').value.trim(),
            address: document.getElementById('patientAddress').value.trim(),
            city: document.getElementById('patientCity').value.trim(),
            state: document.getElementById('patientState').value,
            zipCode: document.getElementById('patientZipCode').value.trim(),
            phone: document.getElementById('patientPhone').value.trim(),
            acceptsTexts: document.getElementById('acceptsTexts').value === 'yes'
        };
        
        // Basic validation
        if (!formData.firstName || !formData.lastName || !formData.address || 
            !formData.city || !formData.state || !formData.zipCode || !formData.phone) {
            throw new Error('All required fields must be filled out.');
        }
        
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_URL}/api/patients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            window.modalManager.showModal('success', 'Patient created successfully!');
            document.getElementById('createPatientForm').reset();
        } else {
            throw new Error(result.error || 'Failed to create patient');
        }
        
    } catch (error) {
        console.error('Create patient error:', error);
        window.modalManager.showModal('error', error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

function setupPatientFilter() {
    const filterInput = document.getElementById('patientFilter');
    if (!filterInput) return;
    
    filterInput.addEventListener('input', function() {
        filterPatients(this.value.trim().toLowerCase());
    });
}

function filterPatients(searchTerm) {
    const tableBody = document.getElementById('patientsTableBody');
    const rows = tableBody.querySelectorAll('tr');
    let visibleCount = 0;
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const isVisible = !searchTerm || text.includes(searchTerm);
        row.style.display = isVisible ? '' : 'none';
        if (isVisible) visibleCount++;
    });
    
    // Show/hide no results message
    const noResults = document.getElementById('noPatientsFound');
    if (noResults) {
        if (visibleCount === 0 && searchTerm) {
            noResults.textContent = 'No patients found matching your search.';
            noResults.classList.remove('hidden');
        } else {
            noResults.classList.add('hidden');
        }
    }
}

async function deletePatient(patientKey) {
    if (!confirm('Are you sure you want to delete this patient? This action cannot be undone.')) {
        return;
    }
    
    try {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_URL}/api/patients/${patientKey}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            // Remove row from table
            const row = document.querySelector(`tr[data-patient-key="${patientKey}"]`);
            if (row) {
                row.remove();
            }
            window.modalManager.showModal('success', 'Patient deleted successfully.');
        } else {
            const result = await response.json();
            throw new Error(result.error || 'Failed to delete patient');
        }
        
    } catch (error) {
        console.error('Delete patient error:', error);
        window.modalManager.showModal('error', error.message);
    }
}

// Admin helper functions
function clearCreateUserErrors() {
    const formGroups = document.querySelectorAll('#createUserForm .form-group');
    formGroups.forEach(group => {
        group.classList.remove('error', 'success');
        const errorMessage = group.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    });
}

async function loadUsers() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
    
    try {        const response = await fetch(`${API_URL}/api/users`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const users = await response.json();
            displayUsers(users);
        } else {
            console.error('Failed to load users');
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function displayUsers(users) {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;
    
    if (users.length === 0) {
        usersList.innerHTML = '<p>No users found.</p>';
        return;
    }
      usersList.innerHTML = users.map(user => `
        <div class="user-item">
            <div class="user-info">
                <strong>${user.username}</strong>
                <span>${user.first_name} ${user.last_name}</span>
            </div>
            <div class="user-actions">
                <button onclick="editUser('${user.username}')" class="btn-secondary">Edit</button>
                <button onclick="deleteUser(${user.user_key}, '${user.username}')" class="btn-danger">Delete</button>
            </div>
        </div>
    `).join('');
}

// 2FA Management Functions
function initialize2FAManagement() {
    // Check 2FA status and setup UI
    check2FAStatus();
}

async function check2FAStatus() {
    try {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_URL}/api/2fa/status`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            update2FAStatus(data.enabled, data.setupDate);
        } else {
            console.error('Failed to check 2FA status');
            update2FAStatus(false);
        }
        
    } catch (error) {
        console.error('Error checking 2FA status:', error);
        update2FAStatus(false);
    }
}

function update2FAStatus(enabled, setupDate) {
    const statusBadge = document.getElementById('twofaStatus');
    const actionsContainer = document.getElementById('twofaActions');
    
    if (!statusBadge || !actionsContainer) return;
    
    if (enabled) {
        statusBadge.textContent = 'Enabled';
        statusBadge.className = 'status-badge enabled';
        
        let setupText = '';
        if (setupDate) {
            setupText = `<p class="setup-date">Enabled on: ${new Date(setupDate).toLocaleDateString()}</p>`;
        }
        
        actionsContainer.innerHTML = `
            ${setupText}
            <button class="secondary-btn" onclick="disable2FA()">Disable 2FA</button>
        `;
    } else {
        statusBadge.textContent = 'Disabled';
        statusBadge.className = 'status-badge disabled';
        
        actionsContainer.innerHTML = `
            <p class="security-note">Two-factor authentication is not enabled. Enable it to improve your account security.</p>
            <button class="primary-btn" onclick="setup2FA()">Enable 2FA</button>
        `;
    }
}

function setup2FA() {
    // Redirect to 2FA setup page
    window.location.href = '../2fa-setup/';
}

async function disable2FA() {
    const password = prompt('Enter your current password to disable 2FA:');
    if (!password) return;
    
    try {
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
            window.modalManager.showModal('success', '2FA has been disabled successfully.');
            // Refresh 2FA status
            check2FAStatus();
        } else {
            window.modalManager.showModal('error', result.error || 'Failed to disable 2FA');
        }
        
    } catch (error) {
        console.error('Error disabling 2FA:', error);
        window.modalManager.showModal('error', 'Network error. Please try again.');
    }
}