// Login Page Module
// Contains authentication functionality for user login

// Initialize login page functionality
function initializeLoginPage() {
    console.log('🔐 Initializing login page...');
    setupLoginForm();
    clearStoredCredentials();
    
    // Focus on username field if empty
    const usernameField = document.getElementById('username');
    if (usernameField && !usernameField.value) {
        setTimeout(() => usernameField.focus(), 100);
    }
    console.log('✅ Login page initialization complete');
}

// Clear any stored credentials on login page load
function clearStoredCredentials() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
}

// Set up login form functionality
function setupLoginForm() {
    console.log('📝 Setting up login form...');
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) {
        console.error('❌ Login form not found!');
        return;
    }
    
    // Set up field validation
    setupLoginFieldValidation();
    
    // Handle form submission
    loginForm.addEventListener('submit', async function(e) {
        console.log('🚀 Form submitted, preventing default...');
        e.preventDefault();
        await performLogin();
    });
    
    // Enter key handling for password field
    const passwordField = document.getElementById('password');
    if (passwordField) {
        passwordField.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                console.log('⏎ Enter key pressed, preventing default...');
                e.preventDefault();
                performLogin();
            }
        });
    }
    console.log('✅ Login form setup complete');
}

// Set up login form field validation
function setupLoginFieldValidation() {
    const usernameField = document.getElementById('username');
    const passwordField = document.getElementById('password');
    
    if (usernameField) {
        usernameField.addEventListener('input', function() {
            // Simple clear errors on input for login page
            clearLoginErrors();
        });
        
        // No blur validation for login - just clear errors
        usernameField.addEventListener('blur', function() {
            clearLoginErrors();
        });
    }
    
    if (passwordField) {
        passwordField.addEventListener('input', function() {
            // Simple clear errors on input for login page
            clearLoginErrors();
        });
    }
}

// Validate username field format (only for actual validation during submit)
function validateUsernameField() {
    const usernameField = document.getElementById('username');
    if (!usernameField || !usernameField.value) return false;
    
    // Simple username validation for login - just check it's not empty and reasonable length
    const username = usernameField.value.trim();
    return username.length >= 1 && username.length <= 100; // More lenient for login
}

// Perform user login
async function performLogin() {
    const submitBtn = document.getElementById('loginBtn');
    const originalText = submitBtn.textContent;
    let response = null;
    
    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';
        
        // Pre-flight connectivity check
        const connectivity = await window.apiClient.checkConnectivity();
        if (!connectivity.connected) {
            throw new Error(`Connection failed: ${connectivity.error}`);
        }
          // Get form data
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        // Validate input
        if (!username || !password) {
            throw new Error('Username and password are required.');
        }
        
        // Validate username format
        const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
        if (!usernameRegex.test(username)) {
            throw new Error('Please enter a valid username.');
        }
        
        const API_URL = window.apiClient.getAPIUrl();
        
        response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
          const result = await response.json();
        
        if (response.ok) {
            // Handle both old and new response formats
            const responseData = result.data || result; // Support both formats
            const token = responseData.token;
            const user = responseData.user;            // Store authentication data
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
              // Check if user needs to change password
            if (user && user.force_password_change) {
                // Redirect to force password change page
                window.location.href = '/force-password-change/';
                return;
            }
            
            // Show immediate success message without clearing anything
            clearLoginErrors();
            showLoginSuccess();
            
            // Immediate redirect - no delay, no form clearing
            if (window.authUtils.isAdmin()) {
                window.location.href = '/admin/';
            } else {
                window.location.href = '/welcome/';
            }
            
        } else {
            throw new Error(result.error || 'Login failed');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        
        // Use enhanced error categorization
        const errorInfo = window.apiClient.categorizeError(error, response);
        
        // Show appropriate feedback based on error type
        if (errorInfo.modal) {
            window.modalManager.showModal('error', errorInfo.message);
        } else {
            showLoginError(errorInfo.message);
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Show login success message
function showLoginSuccess() {
    const loginSection = document.querySelector('.login-container');
    const submitBtn = document.getElementById('loginBtn');
    
    if (loginSection && window.showSectionMessage) {
        window.showSectionMessage(loginSection, '✅ Success! Redirecting...', 'success');
    }
    
    // Also update the button to show success
    if (submitBtn) {
        submitBtn.textContent = '✅ Success!';
        submitBtn.style.backgroundColor = '#28a745';
    }
}

// Show login error message
function showLoginError(message) {
    const loginSection = document.querySelector('.login-container');
    if (loginSection && window.showSectionMessage) {
        window.showSectionMessage(loginSection, message, 'error');
    }
}

// Clear login errors and success messages
function clearLoginErrors() {
    const loginSection = document.querySelector('.login-container');
    if (!loginSection) return;
    
    // Clear section-level messages
    const messages = loginSection.querySelectorAll('.section-message');
    messages.forEach(message => message.remove());
    
    // Clear field-level errors
    const errorGroups = loginSection.querySelectorAll('.form-group.error');
    errorGroups.forEach(group => {
        group.classList.remove('error');
        const errorMsg = group.querySelector('.error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    });
    
    // Clear success states
    const successGroups = loginSection.querySelectorAll('.form-group.success');
    successGroups.forEach(group => {
        group.classList.remove('success');
        const successMsg = group.querySelector('.success-message');
        if (successMsg) {
            successMsg.remove();
        }
    });
}

// Expose functions to global scope
window.loginPage = {
    initializeLoginPage,
    performLogin
};

// Auto-initialize if we're on the login page and DOM is ready
(function() {
    console.log('🔄 Login script loaded, setting up immediate initialization...');
    
    function immediateInit() {
        const currentPath = window.location.pathname;
        const isLoginPage = currentPath === '/' || currentPath.endsWith('index.html') || currentPath.endsWith('login.html');
        
        if (isLoginPage && document.getElementById('loginForm')) {
            console.log('🔐 Immediate login page initialization...');
            initializeLoginPage();
            return true;
        }
        return false;
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🔄 Login page: DOM loaded for immediate init...');
            if (!immediateInit()) {
                // Retry after a short delay
                setTimeout(immediateInit, 50);
            }
        });
    } else {
        console.log('🔄 Login page: DOM already loaded for immediate init...');
        if (!immediateInit()) {
            setTimeout(immediateInit, 50);
        }
    }
})();
