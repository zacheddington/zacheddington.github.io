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

document.addEventListener('DOMContentLoaded', function() {    // Detect if running locally or in production
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
    const FADE_DURATION = 450;
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
            submitBtn.textContent = 'Logging in...';

            try {
                const username = document.getElementById('username').value.trim();
                const password = document.getElementById('password').value;                const response = await fetch(`${API_URL}/api/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
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
                    updateAdminUI(isAdmin);                    // Add a delay to ensure all data is persisted and session is initialized before navigation
                    document.body.classList.add('fade-out');
                    setTimeout(() => {
                        window.location.href = "welcome/";
                    }, FADE_DURATION + 200); // Extended delay for robust session persistence
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
    }
      // Initialize profile page if we're on it
    if (window.location.pathname.includes('/profile/')) {
        initializeProfilePage();
    }
    
    // Initialize admin page if we're on it
    if (window.location.pathname.includes('/admin/')) {
        initializeAdminPage();
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
            });
            
            confirmPassword.addEventListener('input', function() {
                validatePasswordMatch();
                toggleClearButton();
            });
              newPassword.addEventListener('input', function() {
                validatePasswordMatch();
                updatePasswordStrength(newPassword.value, newPassword.id);
                toggleClearButton();
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
        });
        
        newPassword.addEventListener('input', function() {
            validateCreateUserPasswordMatch();
            updatePasswordStrength(newPassword.value, newPassword.id);
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
        });
    }
    
    // Character limit validation for create user form fields
    setupCreateUserFieldValidation();
    
    // Handle form submission
    createUserForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        await createUser();
    });
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

async function createUser() {
    const submitBtn = document.getElementById('createUserSubmitBtn');
    const originalText = submitBtn.textContent;
    let response = null;
    
    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating User...';
        
        // Pre-flight connectivity check
        const connectivity = await checkConnectivity();
        if (!connectivity.connected) {
            throw new Error(`Connection failed: ${connectivity.error}`);
        }
        
        // Get form data
        const formData = {
            firstName: document.getElementById('firstName').value.trim(),
            middleName: document.getElementById('middleName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            email: document.getElementById('email').value.trim(),
            username: document.getElementById('newUsername').value.trim(),
            password: document.getElementById('newPassword').value,
            roleKey: document.getElementById('userRole').value
        };
        
        // Validate required fields
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.username || !formData.password || !formData.roleKey) {
            throw new Error('All fields except middle name are required.');
        }
        
        // Validate password confirmation
        const confirmPassword = document.getElementById('confirmPassword').value;
        if (formData.password !== confirmPassword) {
            throw new Error('Passwords do not match.');
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
        if (formData.username.length > 50) {
            throw new Error('Username must be 50 characters or less.');
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            throw new Error('Please enter a valid email address.');
        }
        
        // Validate password strength using healthcare standards
        const passwordValidation = validatePasswordStrength(formData.password);
        if (!passwordValidation.isValid) {
            const errorMessages = passwordValidation.failed.join('\n• ');
            throw new Error(`Password does not meet security requirements:\n• ${errorMessages}`);
        }
        
        const token = localStorage.getItem('token');
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
        
        response = await fetch(`${API_URL}/api/create-user`, {
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
            document.getElementById('createUserForm').reset();
            clearCreateUserErrors();
            
            // Show success modal with simple personalized message
            const userName = formData.middleName 
                ? `${formData.firstName} ${formData.middleName} ${formData.lastName}`
                : `${formData.firstName} ${formData.lastName}`;
            const successMessage = `Success, new user for ${userName} created!`;
            window.modalManager.showModal('success', successMessage);
            
            // Redirect back to admin choice page after brief delay
            setTimeout(() => {
                window.modalManager.closeModal();
                // Navigate back to main admin page
                document.getElementById('createUserSection').classList.add('hidden');
                document.getElementById('adminChoice').classList.remove('hidden');
            }, 2500);
            
            // Refresh users list if we're on manage users section
            if (typeof loadUsers === 'function' && !document.getElementById('manageUsersSection').classList.contains('hidden')) {
                setTimeout(() => {
                    loadUsers();
                }, 1000);
            }
        } else {
            throw new Error(result.error || 'Failed to create user');
        }
        
    } catch (error) {
        console.error('Create user error:', error);
        
        // Use enhanced error categorization
        const errorInfo = categorizeError(error, response);
        
        // Show appropriate feedback based on error type
        if (errorInfo.modal) {
            window.modalManager.showModal('error', errorInfo.message);
        } else {
            showCreateUserError(errorInfo.message);
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

function showCreateUserError(message) {
    const createUserSection = document.getElementById('createUserSection');
    showSectionMessage(createUserSection, message, 'error');
}

function clearCreateUserErrors() {
    const createUserSection = document.getElementById('createUserSection');
    
    // Clear section-level error messages
    const errorMessage = createUserSection.querySelector('.section-message.error-message');
    if (errorMessage) {
        errorMessage.remove();
    }
    
    // Clear field-level errors
    const errorGroups = createUserSection.querySelectorAll('.form-group.error');
    errorGroups.forEach(group => {
        group.classList.remove('error');
        const errorMsg = group.querySelector('.error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    });
    
    // Clear success states
    const successGroups = createUserSection.querySelectorAll('.form-group.success');
    successGroups.forEach(group => {
        group.classList.remove('success');
        const successMsg = group.querySelector('.success-message');
        if (successMsg) {
            successMsg.remove();
        }
    });
      // Clear password matching classes
    const passwordInputs = createUserSection.querySelectorAll('input[type="password"]');
    passwordInputs.forEach(input => {
        input.classList.remove('password-match', 'password-mismatch');
    });
}

// User Management Functions
let allUsers = [];
let currentRoles = [];
let currentSort = { column: null, direction: null }; // 'asc', 'desc', or null

async function loadUsers() {
    try {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
        const token = localStorage.getItem('token');
        
        const usersLoading = document.getElementById('usersLoading');
        const usersTableBody = document.getElementById('usersTableBody');
        
        if (usersLoading) usersLoading.style.display = 'block';
        if (usersTableBody) usersTableBody.innerHTML = '';
        
        const response = await fetch(`${API_URL}/api/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            allUsers = await response.json();
            await loadRolesForUserManagement();
            setupTableSorting();
            displayUsers(allUsers);
        } else {
            console.error('Failed to load users');
            if (usersTableBody) {
                usersTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #dc3545;">Failed to load users. Please refresh the page.</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading users:', error);
        const usersTableBody = document.getElementById('usersTableBody');
        if (usersTableBody) {
            usersTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #dc3545;">Error loading users. Please check your connection.</td></tr>';
        }
    } finally {
        const usersLoading = document.getElementById('usersLoading');
        if (usersLoading) usersLoading.style.display = 'none';
    }
}

async function loadRolesForUserManagement() {
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
            currentRoles = await response.json();
        } else {
            console.error('Failed to load roles for user management');
        }
    } catch (error) {
        console.error('Error loading roles for user management:', error);
    }
}

function setupTableSorting() {
    const table = document.getElementById('usersTable');
    if (!table) return;
    
    const headers = table.querySelectorAll('thead th');
    
    // Define sortable columns (exclude Actions column)
    const sortableColumns = [
        { index: 0, key: 'username', label: 'Username' },
        { index: 1, key: 'fullName', label: 'Full Name' },
        { index: 2, key: 'email', label: 'Email' },
        { index: 3, key: 'role', label: 'Role' },
        { index: 4, key: 'created', label: 'Created' }
    ];    sortableColumns.forEach(column => {
        const header = headers[column.index];
        if (header) {
            // Make header clickable and add styling
            header.style.cursor = 'pointer';
            header.style.userSelect = 'none';
            header.classList.add('sortable-column');
            header.setAttribute('title', `Click to sort by ${column.label}`);
            
            // Add sort indicator container with sortable wrapper
            const originalText = header.textContent;
            header.innerHTML = `
                <div class="sortable-header">
                    <span class="header-text">${originalText}</span>
                    <span class="sort-indicator" data-column="${column.key}"></span>
                </div>
            `;
            
            // Add click event listener
            header.addEventListener('click', () => handleSort(column.key));
        }
    });
}

function handleSort(columnKey) {
    // Determine new sort direction
    if (currentSort.column === columnKey) {
        // Same column clicked
        if (currentSort.direction === null) {
            currentSort.direction = 'asc';
        } else if (currentSort.direction === 'asc') {
            currentSort.direction = 'desc';
        } else {
            // Remove sort
            currentSort.column = null;
            currentSort.direction = null;
        }
    } else {
        // Different column clicked
        currentSort.column = columnKey;
        currentSort.direction = 'asc';
    }
      // Update sort indicators
    updateSortIndicators();
    
    // Update reset sort button visibility
    updateResetSortButton();
    
    // Sort and display users
    const sortedUsers = getSortedUsers();
    displayUsers(sortedUsers);
}

function updateSortIndicators() {
    const indicators = document.querySelectorAll('.sort-indicator');
    
    indicators.forEach(indicator => {
        const column = indicator.dataset.column;
        const header = indicator.closest('th');
        
        if (column === currentSort.column) {
            if (currentSort.direction === 'asc') {
                indicator.innerHTML = ' ▲';
                indicator.className = 'sort-indicator sort-asc';
                header.setAttribute('title', `Sorted ascending. Click to sort descending.`);
            } else if (currentSort.direction === 'desc') {
                indicator.innerHTML = ' ▼';
                indicator.className = 'sort-indicator sort-desc';
                header.setAttribute('title', `Sorted descending. Click to remove sort.`);
            }
        } else {
            indicator.innerHTML = '';
            indicator.className = 'sort-indicator';
            const columnLabel = header.querySelector('.header-text').textContent;
            header.setAttribute('title', `Click to sort by ${columnLabel}`);
        }
    });
}

function getSortedUsers() {
    if (!currentSort.column || !currentSort.direction) {
        return [...allUsers];
    }
    
    return [...allUsers].sort((a, b) => {
        let valueA, valueB;
        
        switch (currentSort.column) {
            case 'username':
                valueA = a.username || '';
                valueB = b.username || '';
                break;
            case 'fullName':
                valueA = [a.first_name, a.middle_name, a.last_name]
                    .filter(name => name && name.trim())
                    .join(' ') || '';
                valueB = [b.first_name, b.middle_name, b.last_name]
                    .filter(name => name && name.trim())
                    .join(' ') || '';
                break;
            case 'email':
                valueA = a.email || '';
                valueB = b.email || '';
                break;
            case 'role':
                valueA = (a.roles && a.roles.length > 0) ? a.roles[0] : 'User';
                valueB = (b.roles && b.roles.length > 0) ? b.roles[0] : 'User';
                break;
            case 'created':
                valueA = new Date(a.date_created);
                valueB = new Date(b.date_created);
                break;
            default:
                return 0;
        }
        
        // Handle date sorting
        if (currentSort.column === 'created') {
            return currentSort.direction === 'asc' ? valueA - valueB : valueB - valueA;
        }
        
        // Handle string sorting (case insensitive)
        const comparison = valueA.toString().toLowerCase().localeCompare(valueB.toString().toLowerCase());
        return currentSort.direction === 'asc' ? comparison : -comparison;
    });
}

function displayUsers(users) {
    const usersTableBody = document.getElementById('usersTableBody');
    const noUsersFound = document.getElementById('noUsersFound');
    
    if (!usersTableBody) return;
    
    if (users.length === 0) {
        usersTableBody.innerHTML = '';
        if (noUsersFound) noUsersFound.classList.remove('hidden');
        return;
    }
    
    if (noUsersFound) noUsersFound.classList.add('hidden');
    
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    usersTableBody.innerHTML = users.map(user => {
        const fullName = [user.first_name, user.middle_name, user.last_name]
            .filter(name => name && name.trim())
            .join(' ');
        
        const primaryRole = user.roles && user.roles.length > 0 ? user.roles[0] : 'User';
        const primaryRoleKey = user.role_keys && user.role_keys.length > 0 ? user.role_keys[0] : 2;
        
        const createdDate = new Date(user.date_created).toLocaleDateString();
        
        const isCurrentUser = currentUser.username === user.username;
        const roleClass = primaryRole.toLowerCase().replace(/[^a-z]/g, '');
        
        return `
            <tr data-user-id="${user.user_key}">
                <td>
                    <strong>${user.username}</strong>
                    ${isCurrentUser ? '<span style="color: #009688; font-size: 0.8rem;">(You)</span>' : ''}
                </td>
                <td>
                    <div class="user-name">
                        <span class="user-full-name">${fullName || 'N/A'}</span>
                    </div>
                </td>
                <td>${user.email || 'N/A'}</td>
                <td>
                    <span class="user-role ${roleClass}" data-role-key="${primaryRoleKey}">
                        ${primaryRole}
                    </span>
                </td>
                <td>
                    <span class="user-created">${createdDate}</span>
                </td>
                <td>
                    <div class="user-actions">
                        <button class="btn-icon btn-edit" onclick="editUserRole(${user.user_key})" title="Edit Role" ${isCurrentUser ? 'disabled' : ''}>
                            ✏️
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteUser(${user.user_key}, '${user.username}')" title="Delete User" ${isCurrentUser ? 'disabled' : ''}>
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterUsers() {
    const filterValue = document.getElementById('userFilter').value.toLowerCase();
    
    if (!filterValue.trim()) {
        const sortedUsers = getSortedUsers();
        displayUsers(sortedUsers);
        return;
    }
    
    const filteredUsers = allUsers.filter(user => {
        const fullName = [user.first_name, user.middle_name, user.last_name]
            .filter(name => name && name.trim())
            .join(' ').toLowerCase();
        
        return user.username.toLowerCase().includes(filterValue) ||
               fullName.includes(filterValue) ||
               (user.email && user.email.toLowerCase().includes(filterValue)) ||
               (user.roles && user.roles.some(role => role.toLowerCase().includes(filterValue)));
    });
    
    // Apply current sorting to filtered results
    const sortedFilteredUsers = currentSort.column && currentSort.direction 
        ? filteredUsers.sort((a, b) => {
            // Same sorting logic as getSortedUsers but for filtered array
            let valueA, valueB;
            
            switch (currentSort.column) {
                case 'username':
                    valueA = a.username || '';
                    valueB = b.username || '';
                    break;
                case 'fullName':
                    valueA = [a.first_name, a.middle_name, a.last_name]
                        .filter(name => name && name.trim())
                        .join(' ') || '';
                    valueB = [b.first_name, b.middle_name, b.last_name]
                        .filter(name => name && name.trim())
                        .join(' ') || '';
                    break;
                case 'email':
                    valueA = a.email || '';
                    valueB = b.email || '';
                    break;
                case 'role':
                    valueA = (a.roles && a.roles.length > 0) ? a.roles[0] : 'User';
                    valueB = (b.roles && b.roles.length > 0) ? b.roles[0] : 'User';
                    break;
                case 'created':
                    valueA = new Date(a.date_created);
                    valueB = new Date(b.date_created);
                    break;
                default:
                return 0;
            }
            
            if (currentSort.column === 'created') {
                return currentSort.direction === 'asc' ? valueA - valueB : valueB - valueA;
            }
            
            const comparison = valueA.toString().toLowerCase().localeCompare(valueB.toString().toLowerCase());
            return currentSort.direction === 'asc' ? comparison : -comparison;
        })
        : filteredUsers;
    
    displayUsers(sortedFilteredUsers);
}

function setupUserFilter() {
    const userFilter = document.getElementById('userFilter');
    if (userFilter) {
        userFilter.addEventListener('input', filterUsers);
    }
    
    // Setup reset sort button
    const resetSortBtn = document.getElementById('resetSort');
    if (resetSortBtn) {
        resetSortBtn.addEventListener('click', function() {
            currentSort.column = null;
            currentSort.direction = null;
            updateSortIndicators();
            updateResetSortButton();
            
            // Re-apply current filter with no sorting
            filterUsers();
        });
    }
}

function updateResetSortButton() {
    const resetSortBtn = document.getElementById('resetSort');
    if (resetSortBtn) {
        if (currentSort.column && currentSort.direction) {
            resetSortBtn.style.display = 'inline-block';
            resetSortBtn.textContent = `Clear Sort (${currentSort.column} ${currentSort.direction})`;
        } else {
            resetSortBtn.style.display = 'none';
        }
    }
}

function editUserRole(userId) {
    const row = document.querySelector(`tr[data-user-id="${userId}"]`);
    if (!row) return;
    
    const roleCell = row.querySelector('td:nth-child(4)');
    const actionsCell = row.querySelector('td:nth-child(6)');
    
    const currentRoleSpan = roleCell.querySelector('.user-role');
    const currentRoleKey = currentRoleSpan.dataset.roleKey;
    
    // Create role select dropdown
    const roleSelect = document.createElement('select');
    roleSelect.className = 'role-select';
    roleSelect.innerHTML = currentRoles.map(role => 
        `<option value="${role.role_key}" ${role.role_key == currentRoleKey ? 'selected' : ''}>
            ${role.role_name}
        </option>`
    ).join('');
    
    // Replace role display with select
    roleCell.innerHTML = '';
    roleCell.appendChild(roleSelect);
    
    // Update actions to show save/cancel
    actionsCell.innerHTML = `
        <div class="user-actions">
            <button class="btn-icon btn-save" onclick="saveUserRole(${userId})" title="Save Changes">
                ✓
            </button>
            <button class="btn-icon btn-cancel" onclick="cancelEditUserRole(${userId})" title="Cancel">
                ✕
            </button>
        </div>
    `;
    
    roleSelect.focus();
}

function cancelEditUserRole(userId) {
    // Reload the users to reset the UI
    const user = allUsers.find(u => u.user_key == userId);
    if (user) {
        const row = document.querySelector(`tr[data-user-id="${userId}"]`);
        if (row) {
            const primaryRole = user.roles && user.roles.length > 0 ? user.roles[0] : 'User';
            const primaryRoleKey = user.role_keys && user.role_keys.length > 0 ? user.role_keys[0] : 2;
            const roleClass = primaryRole.toLowerCase().replace(/[^a-z]/g, '');
            
            const roleCell = row.querySelector('td:nth-child(4)');
            const actionsCell = row.querySelector('td:nth-child(6)');
            
            roleCell.innerHTML = `
                <span class="user-role ${roleClass}" data-role-key="${primaryRoleKey}">
                    ${primaryRole}
                </span>
            `;
            
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            const isCurrentUser = currentUser.username === user.username;
            
            actionsCell.innerHTML = `
                <div class="user-actions">
                    <button class="btn-icon btn-edit" onclick="editUserRole(${userId})" title="Edit Role" ${isCurrentUser ? 'disabled' : ''}>
                        ✏️
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteUser(${userId}, '${user.username}')" title="Delete User" ${isCurrentUser ? 'disabled' : ''}>
                        🗑️
                   
                    </button>
                </div>
            `;
        }
    }
}

async function saveUserRole(userId) {
    try {
        const row = document.querySelector(`tr[data-user-id="${userId}"]`);
        if (!row) return;
        
        const roleSelect = row.querySelector('.role-select');
        const newRoleKey = roleSelect.value;
        
        if (!newRoleKey) {
            window.modalManager.showModal('error', 'Please select a role.');
            return;
        }
        
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_URL}/api/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ roleKey: newRoleKey })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Update the user in allUsers array
            const userIndex = allUsers.findIndex(u => u.user_key == userId);
            if (userIndex !== -1) {
                const selectedRole = currentRoles.find(r => r.role_key == newRoleKey);
                if (selectedRole) {
                    allUsers[userIndex].roles = [selectedRole.role_name];
                    allUsers[userIndex].role_keys = [selectedRole.role_key];
                }
            }
            
            // Refresh the display with current sort maintained
            const sortedUsers = getSortedUsers();
            displayUsers(sortedUsers);
            
            window.modalManager.showModal('success', `User role updated successfully to ${currentRoles.find(r => r.role_key == newRoleKey)?.role_name || 'Unknown'}.`);
        } else {
            throw new Error(result.error || 'Failed to update user role');
        }
        
    } catch (error) {
        console.error('Error updating user role:', error);
        cancelEditUserRole(userId);
        
        const errorMessage = error.message.includes('admin privileges') 
            ? 'You cannot remove admin privileges from your own account.' 
            : error.message || 'Failed to update user role. Please try again.';
            
        window.modalManager.showModal('error', errorMessage);
    }
}

async function deleteUser(userId, username) {
    // Prevent multiple simultaneous delete operations
    if (deleteUser.isDeleting) {
        return;
    }
    
    try {
        deleteUser.isDeleting = true;
        
        // Show confirmation modal
        const confirmDelete = await showDeleteUserModal(username);
        if (!confirmDelete) {
            deleteUser.isDeleting = false;
            return;
        }
        
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_URL}/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Remove user from allUsers array
            allUsers = allUsers.filter(u => u.user_key != userId);
            
            // Refresh the display with current sort maintained
            const sortedUsers = getSortedUsers();
            displayUsers(sortedUsers);
            
            window.modalManager.showModal('success', `User "${username}" has been successfully deleted from the system.`);
        } else {
            throw new Error(result.error || 'Failed to delete user');
        }
          } catch (error) {
        console.error('Error deleting user:', error);
        
        const errorMessage = error.message.includes('your own account') 
            ? 'You cannot delete your own account.' 
            : error.message || 'Failed to delete user. Please try again.';
            
        window.modalManager.showModal('error', errorMessage);
    } finally {
        deleteUser.isDeleting = false;
    }
}

function showDeleteUserModal(username) {
    return new Promise((resolve) => {
        // Prevent duplicate modals
        const existingModal = document.querySelector('.modal-overlay');
        if (existingModal) {
            return resolve(false);
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>⚠️ Delete User Account</h3>
                </div>
                <div class="modal-body">
                    <p><strong>Are you sure you want to delete the user "${username}"?</strong></p>
                    <p style="color: #dc3545; margin-top: 1rem;">This action cannot be undone. The user account and all associated data will be permanently removed from the system.</p>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn secondary" id="cancelDeleteUser">Cancel</button>
                    <button class="modal-btn danger" id="confirmDeleteUser">Delete User</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Focus on the modal for accessibility
        modal.focus();
        
        // Set up event handlers
        const cancelHandler = () => {
            document.body.removeChild(modal);
            resolve(false);
        };
        
        const confirmHandler = () => {
            document.body.removeChild(modal);
            resolve(true);
        };
        
        document.getElementById('cancelDeleteUser').addEventListener('click', cancelHandler);
        document.getElementById('confirmDeleteUser').addEventListener('click', confirmHandler);
        
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

// Password Strength Functions
function addPasswordStrengthIndicator(passwordElement) {
    if (!passwordElement) return;
    
    const formGroup = passwordElement.closest('.form-group');
    if (!formGroup) return;
    
    // Check if indicator already exists
    if (formGroup.querySelector('.password-strength-container')) return;
    
    // Create password strength container
    const strengthContainer = document.createElement('div');
    strengthContainer.className = 'password-strength-container';
    
    // Create strength bar
    const strengthBar = document.createElement('div');
    strengthBar.className = 'password-strength-bar';
    
    const strengthFill = document.createElement('div');
    strengthFill.className = 'password-strength-fill';
    strengthBar.appendChild(strengthFill);
    
    // Create strength text
    const strengthText = document.createElement('div');
    strengthText.className = 'password-strength-text';
    strengthText.textContent = 'Password Strength: ';
    
    // Create requirements list
    const requirementsContainer = document.createElement('div');
    requirementsContainer.className = 'password-requirements';
    
    const requirementTitle = document.createElement('div');
    requirementTitle.className = 'requirement-title';
    requirementTitle.textContent = 'Password Requirements:';
    
    const requirements = [
        'At least 8 characters long',
        'At least one uppercase letter (A-Z)',
        'At least one lowercase letter (a-z)', 
        'At least one number (0-9)',
        'At least one special character (!@#$%...)',
        'No spaces allowed'
    ];
    
    requirementsContainer.appendChild(requirementTitle);
    requirements.forEach(req => {
        const reqElement = document.createElement('div');
        reqElement.className = 'requirement';
        reqElement.textContent = `• ${req}`;
        requirementsContainer.appendChild(reqElement);
    });
    
    // Assemble the strength indicator
    strengthContainer.appendChild(strengthText);
    strengthContainer.appendChild(strengthBar);
    strengthContainer.appendChild(requirementsContainer);
    
    // Insert after the password field
    const fieldNote = formGroup.querySelector('.field-note');
    if (fieldNote) {
        formGroup.insertBefore(strengthContainer, fieldNote.nextSibling);
    } else {
        formGroup.appendChild(strengthContainer);
    }
}

function updatePasswordStrength(password, inputId) {
    const passwordElement = document.getElementById(inputId);
    if (!passwordElement) return;
    
    const formGroup = passwordElement.closest('.form-group');
    const strengthContainer = formGroup.querySelector('.password-strength-container');
    
    if (!strengthContainer) return;
    
    const strengthFill = strengthContainer.querySelector('.password-strength-fill');
    const strengthText = strengthContainer.querySelector('.password-strength-text');
    const requirements = strengthContainer.querySelectorAll('.requirement');
    
    if (!password) {
        // Reset when password is empty
        strengthFill.style.width = '0%';
        strengthFill.style.backgroundColor = '#e9ecef';
        strengthText.textContent = 'Password Strength: ';
        passwordElement.classList.remove('password-strong', 'password-weak', 'password-invalid');
        
        requirements.forEach(req => {
            req.style.color = '#495057';
        });
        return;
    }
    
    const validation = validatePasswordStrength(password);
    const score = calculatePasswordScore(password);
    
    // Update strength bar
    let strength = 'Very Weak';
    let color = '#dc3545';
    let width = '20%';
    
    if (score >= 80) {
        strength = 'Very Strong';
        color = '#28a745';
        width = '100%';
        passwordElement.classList.remove('password-weak', 'password-invalid');
        passwordElement.classList.add('password-strong');
    } else if (score >= 60) {
        strength = 'Strong';
        color = '#20c997';
        width = '80%';
        passwordElement.classList.remove('password-weak', 'password-invalid');
        passwordElement.classList.add('password-strong');
    } else if (score >= 40) {
        strength = 'Medium';
        color = '#ffc107';
        width = '60%';
        passwordElement.classList.remove('password-strong', 'password-invalid');
        passwordElement.classList.add('password-weak');
    } else if (score >= 20) {
        strength = 'Weak';
        color = '#fd7e14';
        width = '40%';
        passwordElement.classList.remove('password-strong', 'password-invalid');
        passwordElement.classList.add('password-weak');
    } else {
        strength = 'Very Weak';
        color = '#dc3545';
        width = '20%';
        passwordElement.classList.remove('password-strong', 'password-weak');
        passwordElement.classList.add('password-invalid');
    }
    
    strengthFill.style.width = width;
    strengthFill.style.backgroundColor = color;
    strengthText.textContent = `Password Strength: ${strength}`;
    
    // Update individual requirements
    if (requirements.length >= 6) {
        requirements[0].style.color = password.length >= 8 ? '#28a745' : '#dc3545';
        requirements[1].style.color = /[A-Z]/.test(password) ? '#28a745' : '#dc3545';
        requirements[2].style.color = /[a-z]/.test(password) ? '#28a745' : '#dc3545';
        requirements[3].style.color = /[0-9]/.test(password) ? '#28a745' : '#dc3545';
        requirements[4].style.color = /[!@#$%^&*(),.?":{}|<>]/.test(password) ? '#28a745' : '#dc3545';
        requirements[5].style.color = !/\s/.test(password) ? '#28a745' : '#dc3545';
    }
}

function validatePasswordStrength(password) {
    const failed = [];
    let isValid = true;
    
    if (!password) {
        return { isValid: false, failed: ['Password is required'] };
    }
    
    if (password.length < 8) {
        failed.push('Password must be at least 8 characters long');
        isValid = false;
    }
    
    if (!/[A-Z]/.test(password)) {
        failed.push('Password must contain at least one uppercase letter');
        isValid = false;
    }
    
    if (!/[a-z]/.test(password)) {
        failed.push('Password must contain at least one lowercase letter');
        isValid = false;
    }
    
    if (!/[0-9]/.test(password)) {
        failed.push('Password must contain at least one number');
        isValid = false;
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        failed.push('Password must contain at least one special character (!@#$%^&*...)');
        isValid = false;
    }
    
    if (/\s/.test(password)) {
        failed.push('Password cannot contain spaces');
        isValid = false;
    }
    
    // Check for common passwords
    const commonPasswords = [
        'password', 'password123', '123456', '123456789', 'qwerty', 'abc123',
        'Password1', 'password1', 'admin', 'administrator', 'welcome', 'login'
    ];
    
    if (commonPasswords.some(common => password.toLowerCase() === common.toLowerCase())) {
        failed.push('Password is too common - please choose a stronger password');
        isValid = false;
    }
    
    return { isValid, failed };
}

function calculatePasswordScore(password) {
    let score = 0;
    
    // Length scoring
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;
    
    // Character type scoring
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/[0-9]/.test(password)) score += 10;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 15;
    
    // Complexity bonus
    const charTypes = [
        /[a-z]/.test(password),
        /[A-Z]/.test(password),
        /[0-9]/.test(password),
        /[!@#$%^&*(),.?":{}|<>]/.test(password)
    ].filter(Boolean).length;
    
    if (charTypes >= 3) score += 10;
    if (charTypes === 4) score += 5;
    
    // Penalties
    if (/\s/.test(password)) score -= 20;
    if (password.length < 8) score -= 30;
    
    // Common password penalty
    const commonPasswords = [
        'password', 'password123', '123456', '123456789', 'qwerty', 'abc123',
        'Password1', 'password1', 'admin', 'administrator', 'welcome', 'login'
    ];
    
    if (commonPasswords.some(common => password.toLowerCase() === common.toLowerCase())) {
        score -= 50;
    }
    
    return Math.max(0, Math.min(100, score));
}