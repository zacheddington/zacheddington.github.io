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
                const password = document.getElementById('password').value;

                const response = await fetch(`${API_URL}/api/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });                const data = await response.json();                if (response.ok && data.token) {
                    // Store authentication data
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));// Initialize session management (browser-lifetime storage)                    // CRITICAL: Ensure this happens immediately and synchronously
                    if (window.SessionManager) {
                        window.SessionManager.initSession();
                          } else {
                        // Fallback: manual session initialization with tab ID
                        const loginTime = Date.now();
                        const tabId = 'tab_' + loginTime + '_' + Math.random().toString(36).substr(2, 9);
                        
                        // Store in both sessionStorage and localStorage for resilience
                        sessionStorage.setItem('currentTabId', tabId);
                        localStorage.setItem('lastTabId', tabId);
                        localStorage.setItem('loginTimestamp', loginTime.toString());
                        sessionStorage.setItem('loginTime', loginTime.toString());
                        sessionStorage.setItem('lastActivity', loginTime.toString());
                        
                        // Store session data in localStorage as well
                        const sessionData = {
                            loginTime: loginTime,
                            lastActivity: loginTime,
                            tabId: tabId,
                            lastHeartbeat: loginTime,
                            isRecentLogin: true
                        };                        localStorage.setItem('activeSession', JSON.stringify(sessionData));
                    }
                    
                    // Use utility function to check admin status and update UI
                    const isAdmin = isUserAdmin(data.user);
                    updateAdminUI(isAdmin);

                    // Add a small delay to ensure sessionStorage is persisted before navigation
                    document.body.classList.add('fade-out');
                    setTimeout(() => {
                        
                        window.location.href = "welcome/";
                    }, FADE_DURATION);
                } else {                    const message = response.status === 401 
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
                    item.parentElement.style.display = 'none';                }
            });
            
            // Check if user is admin and show/hide admin link
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

// Network connectivity and database health check
async function checkConnectivity() {
    try {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const API_URL = isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
        
        // Simple connectivity test with short timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${API_URL}/api/health`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
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
            });
        }
        
        // Real-time password confirmation validation
        const newPassword = document.getElementById('newPassword');
        const confirmPassword = document.getElementById('confirmPassword');
        
        if (newPassword && confirmPassword) {
            confirmPassword.addEventListener('input', function() {
                validatePasswordMatch();
            });
            
            newPassword.addEventListener('input', function() {
                validatePasswordMatch();
            });
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
        
        if (newPassword.length < 6) {
            throw new Error('New password must be at least 6 characters long.');
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
    const existingMessage = confirmGroup.querySelector('.error-message, .success-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    if (confirmPassword && newPassword) {
        if (newPassword === confirmPassword) {
            confirmGroup.classList.add('success');
            const successMsg = document.createElement('div');
            successMsg.className = 'success-message';
            successMsg.textContent = 'Passwords match';
            confirmGroup.appendChild(successMsg);
        } else {
            confirmGroup.classList.add('error');
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