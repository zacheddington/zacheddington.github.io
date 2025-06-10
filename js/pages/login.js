// Login Page Module
// Contains authentication functionality for user login

// Initialize login page functionality
function initializeLoginPage() {
    setupLoginForm();
    clearStoredCredentials();
    
    // Focus on email field if empty
    const emailField = document.getElementById('email');
    if (emailField && !emailField.value) {
        setTimeout(() => emailField.focus(), 100);
    }
}

// Clear any stored credentials on login page load
function clearStoredCredentials() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
}

// Set up login form functionality
function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    
    // Set up field validation
    setupLoginFieldValidation();
    
    // Handle form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        await performLogin();
    });
    
    // Enter key handling for password field
    const passwordField = document.getElementById('password');
    if (passwordField) {
        passwordField.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                performLogin();
            }
        });
    }
}

// Set up login form field validation
function setupLoginFieldValidation() {
    const emailField = document.getElementById('email');
    const passwordField = document.getElementById('password');
    
    if (emailField) {
        emailField.addEventListener('input', function() {
            window.fieldValidation.updateFieldState(emailField);
            clearLoginErrors();
        });
        
        emailField.addEventListener('blur', function() {
            validateEmailField();
        });
    }
    
    if (passwordField) {
        passwordField.addEventListener('input', function() {
            window.fieldValidation.updateFieldState(passwordField);
            clearLoginErrors();
        });
    }
}

// Validate email field format
function validateEmailField() {
    const emailField = document.getElementById('email');
    if (!emailField || !emailField.value) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(emailField.value);
    
    const formGroup = emailField.closest('.form-group');
    if (!isValid) {
        formGroup.classList.add('error');
        formGroup.classList.remove('success');
        
        // Remove existing error message
        const existingError = formGroup.querySelector('.error-message');
        if (existingError) existingError.remove();
        
        // Add error message
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = 'Please enter a valid email address';
        formGroup.appendChild(errorMessage);
    } else {
        formGroup.classList.remove('error');
        const errorMessage = formGroup.querySelector('.error-message');
        if (errorMessage) errorMessage.remove();
    }
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
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        
        // Validate input
        if (!email || !password) {
            throw new Error('Email and password are required.');
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Please enter a valid email address.');
        }
        
        const API_URL = window.apiClient.getAPIUrl();
        
        response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Store authentication data
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));
            
            // Check if user needs to change password
            if (result.user.force_password_change) {
                // Redirect to force password change page
                window.location.href = '/force-password.html';
                return;
            }
            
            // Clear form
            document.getElementById('loginForm').reset();
            clearLoginErrors();
            
            // Show success message briefly before redirect
            showLoginSuccess();
            
            // Redirect based on user role after short delay
            setTimeout(() => {
                if (window.authUtils.isAdmin()) {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/patients.html';
                }
            }, 1000);
            
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
    if (loginSection) {
        window.fieldValidation.showSectionMessage(loginSection, 'Login successful! Redirecting...', 'success');
    }
}

// Show login error message
function showLoginError(message) {
    const loginSection = document.querySelector('.login-container');
    if (loginSection) {
        window.fieldValidation.showSectionMessage(loginSection, message, 'error');
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

// Handle forgot password (placeholder for future implementation)
function handleForgotPassword() {
    window.modalManager.showModal('info', 'Password reset functionality will be implemented in a future update. Please contact your administrator for assistance.');
}

// Expose functions to global scope
window.loginPage = {
    initializeLoginPage,
    performLogin,
    handleForgotPassword
};
