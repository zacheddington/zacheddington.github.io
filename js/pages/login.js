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
    loginForm.addEventListener('submit', async function (e) {
        console.log('🚀 Form submitted, preventing default...');
        e.preventDefault();
        await performLogin();
    });

    // Enter key handling for password field
    const passwordField = document.getElementById('password');
    if (passwordField) {
        passwordField.addEventListener('keypress', function (e) {
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
    const twofaField = document.getElementById('twofaToken');
    const backToLoginBtn = document.getElementById('backToLogin');

    if (usernameField) {
        usernameField.addEventListener('input', function () {
            clearLoginErrors();
        });

        usernameField.addEventListener('blur', function () {
            clearLoginErrors();
        });
    }

    if (passwordField) {
        passwordField.addEventListener('input', function () {
            clearLoginErrors();
        });
    }

    if (twofaField) {
        twofaField.addEventListener('input', function (e) {
            // Only allow numbers and limit to 6 digits
            e.target.value = e.target.value
                .replace(/[^0-9]/g, '')
                .substring(0, 6);
            clearLoginErrors();
        });

        twofaField.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                performLogin();
            }
        });
    }

    if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', function () {
            showCredentialsStep();
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
    // Prevent multiple simultaneous login attempts
    if (performLogin.isRunning) {
        console.log('🚫 Login already in progress, ignoring duplicate request');
        return;
    }

    performLogin.isRunning = true;

    const submitBtn = document.getElementById('loginBtn');
    const twofaSubmitBtn = document.getElementById('twofa-submit');
    const usernameField = document.getElementById('username');
    const passwordField = document.getElementById('password');
    const twofaField = document.getElementById('twofaToken');
    const credentialsStep = document.getElementById('credentialsStep');
    const twofaStep = document.getElementById('twofaStep');

    // Determine which step we're on
    const isOnTwofaStep = !twofaStep.classList.contains('hidden');
    const currentButton = isOnTwofaStep ? twofaSubmitBtn : submitBtn;
    const originalText = currentButton.textContent;

    let response = null;
    let loginSuccessful = false;

    try {
        // Disable current step controls
        currentButton.disabled = true;
        currentButton.textContent = isOnTwofaStep
            ? 'Verifying...'
            : 'Logging in...';

        if (!isOnTwofaStep) {
            usernameField.disabled = true;
            passwordField.disabled = true;
        } else {
            twofaField.disabled = true;
        }

        // Pre-flight connectivity check
        const connectivity = await window.apiClient.checkConnectivity();
        if (!connectivity.connected) {
            throw new Error(`Connection failed: ${connectivity.error}`);
        }

        // Get form data
        const username = usernameField.value.trim();
        const password = passwordField.value;
        const twofaToken = twofaField ? twofaField.value.trim() : null;

        // Validate input based on current step
        if (!isOnTwofaStep) {
            // Credentials step validation
            if (!username || !password) {
                throw new Error('Username and password are required.');
            }
            if (username.length < 2 || username.length > 50) {
                throw new Error(
                    'Username must be between 2 and 50 characters.'
                );
            }
        } else {
            // 2FA step validation
            if (!twofaToken || twofaToken.length !== 6) {
                throw new Error('Please enter a 6-digit authentication code.');
            }
        }

        const API_URL = window.apiClient.getAPIUrl();

        // Prepare login data
        const loginData = { username, password };
        if (twofaToken) {
            loginData.twofaToken = twofaToken;
        }

        response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(loginData),
        });

        const result = await response.json();

        if (response.ok) {
            // Handle both old and new response formats
            const responseData = result.data || result;
            const token = responseData.token;
            const user = responseData.user;

            // Store authentication data
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            // Mark login as successful to prevent button re-enabling
            loginSuccessful = true;

            // Check if user needs to change password
            if (user && user.force_password_change) {
                window.location.href = '/force-password-change/';
                return;
            }

            // Clear any error messages
            clearLoginErrors();

            // Immediate redirect - no success message, no delays
            if (window.authUtils.isAdmin()) {
                window.location.href = '/admin/';
            } else {
                window.location.href = '/welcome/';
            }
        } else {
            // Handle 2FA required case
            if (
                response.status === 400 &&
                result.error === '2FA token required'
            ) {
                // Only show 2FA step if we're currently on credentials step
                if (!isOnTwofaStep) {
                    show2FAStep();
                    // Reset the guard flag since we're transitioning steps
                    performLogin.isRunning = false;
                    return;
                } else {
                    // If we're already on 2FA step, this means invalid token
                    throw new Error(
                        'Invalid authentication code. Please try again.'
                    );
                }
            } else {
                throw new Error(result.error || 'Login failed');
            }
        }
    } catch (error) {
        console.error('Login error:', error);

        // Clear password field for security on credentials step
        if (!isOnTwofaStep) {
            passwordField.value = '';
        }

        // For authentication errors (401), show specific message
        if (response && response.status === 401) {
            window.modalManager.showModal(
                'error',
                'Invalid username or password. Please try again.'
            );
        } else {
            // For all other errors (including validation), show modal with error message
            window.modalManager.showModal('error', error.message);
        }
    } finally {
        // Reset the guard flag
        performLogin.isRunning = false;

        // Only re-enable form controls if login was not successful
        if (!loginSuccessful) {
            currentButton.disabled = false;
            currentButton.textContent = originalText;

            if (!isOnTwofaStep) {
                usernameField.disabled = false;
                passwordField.disabled = false;
            } else {
                twofaField.disabled = false;
            }
        }
    }
}

// Show 2FA step and hide credentials step
function show2FAStep() {
    const credentialsStep = document.getElementById('credentialsStep');
    const twofaStep = document.getElementById('twofaStep');
    const twofaField = document.getElementById('twofaToken');

    if (credentialsStep && twofaStep && twofaField) {
        credentialsStep.classList.add('hidden');
        twofaStep.classList.remove('hidden');

        // Clear any previous 2FA token
        twofaField.value = '';

        // Focus on 2FA field
        setTimeout(() => twofaField.focus(), 100);
    }
}

// Show credentials step and hide 2FA step
function showCredentialsStep() {
    const credentialsStep = document.getElementById('credentialsStep');
    const twofaStep = document.getElementById('twofaStep');
    const twofaField = document.getElementById('twofaToken');

    if (credentialsStep && twofaStep && twofaField) {
        twofaStep.classList.add('hidden');
        credentialsStep.classList.remove('hidden');

        // Clear any 2FA token
        twofaField.value = '';

        // Clear any error messages
        clearLoginErrors();
    }
}

// Show 2FA input field when required (legacy function for backward compatibility)
function show2FAField() {
    // Use the new step-based system
    show2FAStep();
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
    messages.forEach((message) => message.remove());

    // Clear field-level errors
    const errorGroups = loginSection.querySelectorAll('.form-group.error');
    errorGroups.forEach((group) => {
        group.classList.remove('error');
        const errorMsg = group.querySelector('.error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    });

    // Clear success states
    const successGroups = loginSection.querySelectorAll('.form-group.success');
    successGroups.forEach((group) => {
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
    performLogin,
};
