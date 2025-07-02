// Force Password Change Page Module
// Contains functionality for mandatory password changes on first login

// Defensive wrapper to prevent autofill conflicts
function safeGetPasswordField(fieldId) {
    try {
        const field = document.getElementById(fieldId);
        if (field && field.nodeType === Node.ELEMENT_NODE) {
            return field;
        }
    } catch (error) {
        // Ignore autofill-related errors
    }
    return null;
}

// Security: Clear any sensitive URL parameters immediately
function clearSensitiveURLParameters() {
    if (window.location.search || window.location.hash) {
        console.warn('URL parameters cleared for security');
        window.history.replaceState(
            {},
            document.title,
            window.location.pathname
        );
    }

    // Prevent form data from being stored in browser history
    if (window.history && window.history.replaceState) {
        window.addEventListener('beforeunload', function () {
            window.history.replaceState(
                {},
                document.title,
                window.location.pathname
            );
        });
    }
}

// Initialize force password change page functionality
async function initializeForcePasswordChangePage() {
    // Clear sensitive URL parameters for security
    clearSensitiveURLParameters();

    // Check if user is authenticated and actually needs to change password
    await validateForcePasswordAccess();
    setupForcePasswordForm();
    displayUserInfo();

    // Clear any initial error states
    clearForcePasswordErrors();

    // Focus on new password field
    const newPasswordField = safeGetPasswordField('newPassword');
    if (newPasswordField) {
        setTimeout(() => {
            try {
                newPasswordField.focus();
            } catch (error) {
                // Ignore focus errors from autofill conflicts
            }
        }, 100);
    }
}

// Validate that user has access to this page
async function validateForcePasswordAccess() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) {
        // No authentication, redirect to login
        window.location.href = '/';
        return;
    }

    try {
        const user = JSON.parse(userStr);

        // First check local storage - if password change is required, stay on this page
        if (user.passwordChangeRequired === true) {
            // User needs to change password, stay on this page
            return;
        }

        // If local storage says no password change needed, double-check with server
        // This handles cases where localStorage might be stale
        const API_URL = window.apiClient.getAPIUrl();
        try {
            const userCheckResponse = await fetch(
                `${API_URL}/api/user/profile`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (userCheckResponse.ok) {
                const userProfile = await userCheckResponse.json();
                if (
                    userProfile.data &&
                    userProfile.data.passwordChangeRequired
                ) {
                    // Server says password change is still required, update local storage
                    user.passwordChangeRequired = true;
                    localStorage.setItem('user', JSON.stringify(user));
                    return; // Stay on this page
                } else if (
                    userProfile.data &&
                    !userProfile.data.passwordChangeRequired
                ) {
                    // Server confirms no password change needed, redirect
                    user.passwordChangeRequired = false;
                    localStorage.setItem('user', JSON.stringify(user));

                    // Redirect based on role
                    if (window.authUtils.isAdmin()) {
                        window.location.href = '/admin/';
                    } else {
                        window.location.href = '/welcome/';
                    }
                    return;
                }
            }
        } catch (serverError) {
            console.warn(
                'Could not verify password change status with server, using local storage'
            );
            // If server check fails, fall back to local storage value
        }

        // If we reach here and local storage says no password change needed, redirect
        if (!user.passwordChangeRequired) {
            if (window.authUtils.isAdmin()) {
                window.location.href = '/admin/';
            } else {
                window.location.href = '/welcome/';
            }
            return;
        }
    } catch (error) {
        console.error('Error validating force password access');
        // On error, fall back to login redirect for security
        window.location.href = '/';
        return;
    }
}

// Display user information
function displayUserInfo() {
    try {
        const userStr = localStorage.getItem('user');
        if (!userStr) return;

        const user = JSON.parse(userStr);
        const userNameElement = document.getElementById('userDisplayName');
        const userEmailElement = document.getElementById('userDisplayEmail');
        if (userNameElement) {
            userNameElement.textContent = `${user.firstName} ${user.lastName}`;
        }
        if (userEmailElement) {
            userEmailElement.textContent = user.email;
        }
    } catch (error) {
        console.error('Error displaying user info');
    }
}

// Set up force password change form functionality
function setupForcePasswordForm() {
    const forcePasswordForm = document.getElementById(
        'forcePasswordChangeForm'
    );
    if (!forcePasswordForm) return;

    // Set up field validation
    setupForcePasswordFieldValidation();

    // Set up logout button event listener
    setupLogoutButton();

    // Handle form submission
    forcePasswordForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        await changeForcePassword();
    });
}

// Set up logout button event listener
function setupLogoutButton() {
    const logoutButton = document.querySelector('.logout-link-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', function (e) {
            e.preventDefault();
            handleForcePasswordLogout();
        });
    }

    // Set up error modal "Try Again" button
    const tryAgainButton = document.querySelector('#errorModal .modal-btn');
    if (tryAgainButton) {
        tryAgainButton.addEventListener('click', function (e) {
            e.preventDefault();
            closeErrorModal();
        });
    }
}

// Set up field validation for force password form
function setupForcePasswordFieldValidation() {
    const newPasswordField = document.getElementById('newPassword');
    const confirmPasswordField = document.getElementById('confirmPassword');

    if (newPasswordField) {
        // Add shared password strength indicator
        window.passwordUtils.addPasswordStrengthIndicator(newPasswordField);

        newPasswordField.addEventListener('input', function () {
            // Check password match if confirm password has value
            if (confirmPasswordField && confirmPasswordField.value) {
                validateForcePasswordMatch();
            }
        });
    }

    if (confirmPasswordField) {
        confirmPasswordField.addEventListener('input', function () {
            validateForcePasswordMatch();
        });

        confirmPasswordField.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                changeForcePassword();
            }
        });
    }
}

// Update password validation indicators
// Validate password match for force password form
function validateForcePasswordMatch() {
    const newPasswordField = document.getElementById('newPassword');
    const confirmPasswordField = document.getElementById('confirmPassword');
    const matchIndicator = document.getElementById('passwordMatch');

    if (!newPasswordField || !confirmPasswordField || !matchIndicator) return;

    const isMatch = window.passwordUtils.passwordsMatch(
        newPasswordField.value,
        confirmPasswordField.value
    );

    if (confirmPasswordField.value === '') {
        matchIndicator.textContent = '';
        matchIndicator.className = 'password-match';
        return;
    }

    if (isMatch) {
        matchIndicator.textContent = '✓ Passwords match';
        matchIndicator.className = 'password-match valid';
    } else {
        matchIndicator.textContent = '✗ Passwords do not match';
        matchIndicator.className = 'password-match invalid';
    }
}

// Change password during forced password change
async function changeForcePassword() {
    // Prevent multiple simultaneous submissions
    if (changeForcePassword.isRunning) {
        return;
    }

    changeForcePassword.isRunning = true;

    const submitBtn = document.getElementById('changePasswordBtn');
    const originalText = submitBtn.textContent;
    let response = null;

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Changing Password...';

        // Pre-flight connectivity check
        const connectivity = await window.apiClient.checkConnectivity();
        if (!connectivity.connected) {
            throw new Error(`Connection failed: ${connectivity.error}`);
        }

        // Get form data
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword =
            document.getElementById('confirmPassword').value;

        // Validate input
        if (!newPassword || !confirmPassword) {
            throw new Error('Both password fields are required.');
        }

        // Validate new password
        const passwordValidation =
            window.passwordUtils.validatePassword(newPassword);
        if (!passwordValidation.isValid) {
            throw new Error('Password does not meet security requirements.');
        }

        // Validate password match
        if (
            !window.passwordUtils.passwordsMatch(newPassword, confirmPassword)
        ) {
            throw new Error('Passwords do not match.');
        }
        const token = localStorage.getItem('token');
        const API_URL = window.apiClient.getAPIUrl();

        // First, check if the user still needs to change their password
        // This prevents the error when password was already changed on another tab/device
        const userCheckResponse = await fetch(`${API_URL}/api/user/profile`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });

        if (userCheckResponse.ok) {
            const userProfile = await userCheckResponse.json();
            if (!userProfile.data || !userProfile.data.passwordChangeRequired) {
                // Password was already changed on another tab/device
                window.modalManager.showModal(
                    'info',
                    'Your password has already been changed on another tab or device. You will now be redirected to your dashboard.',
                    false,
                    { redirect: true }
                );

                // Update local storage to reflect the change
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    try {
                        const user = JSON.parse(userStr);
                        user.passwordChangeRequired = false;
                        localStorage.setItem('user', JSON.stringify(user));
                    } catch (error) {
                        console.error('Error updating local user data');
                    }
                }

                // Redirect after delay
                setTimeout(() => {
                    if (window.authUtils.isAdmin()) {
                        window.location.href = '/admin/';
                    } else {
                        window.location.href = '/welcome/';
                    }
                }, 2000);
                return;
            }
        }

        response = await fetch(`${API_URL}/api/user/force-change-password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                newPassword,
            }),
        });

        const result = await response.json();

        if (response.ok) {
            // Update user data to reflect password change
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    user.passwordChangeRequired = false;
                    localStorage.setItem('user', JSON.stringify(user));
                } catch (error) {
                    console.error('Error updating user data');
                }
            } // Clear the form
            document.getElementById('forcePasswordChangeForm').reset();
            clearForcePasswordErrors();

            // Reset password validation indicators
            resetForcePasswordValidationIndicators(); // Show success modal and redirect
            window.modalManager.showModal(
                'success',
                'Password changed successfully! Redirecting to your dashboard...',
                false,
                { redirect: true }
            );

            // Redirect based on user role after delay
            setTimeout(() => {
                if (window.authUtils.isAdmin()) {
                    window.location.href = '/admin/';
                } else {
                    window.location.href = '/welcome/';
                }
            }, 2000);
        } else {
            throw new Error(result.error || 'Failed to change password');
        }
    } catch (error) {
        console.error('Force password change failed');

        // Extract error message from response or error object
        let errorMessage = 'Failed to change password. Please try again.';

        if (error.message) {
            errorMessage = error.message;
        } else if (response) {
            // Handle different response status codes
            try {
                const result = await response.json();

                if (response.status === 400) {
                    errorMessage =
                        result.error ||
                        result.message ||
                        'Invalid request. Please check your input.';
                } else if (response.status === 500) {
                    // Server error - likely means password was already changed
                    if (
                        result.error &&
                        result.error.includes('currentPassword')
                    ) {
                        errorMessage =
                            'Your password has already been changed on another tab or device. Please refresh this page or navigate to your dashboard.';
                    } else {
                        errorMessage =
                            result.error ||
                            result.message ||
                            'Server error occurred. Your password may have already been changed on another tab or device.';
                    }
                } else if (response.status === 409) {
                    errorMessage =
                        'Password change conflict. Your password may have already been changed on another tab or device.';
                } else {
                    errorMessage =
                        result.error ||
                        result.message ||
                        `Server error (${response.status}). Please try again.`;
                }
            } catch (parseError) {
                // If we can't parse the response, provide status-based messages
                if (response.status === 500) {
                    errorMessage =
                        'Your password may have already been changed on another tab or device. Please refresh this page.';
                } else if (response.status === 409) {
                    errorMessage =
                        'Password change conflict. Your password may have already been changed elsewhere.';
                } else {
                    errorMessage = `Server error (${response.status}). Please try again.`;
                }
            }
        }

        // Always show modal for better user experience
        window.modalManager.showModal('error', errorMessage);
    } finally {
        // Reset the guard flag
        changeForcePassword.isRunning = false;

        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Show force password change success message
function showForcePasswordSuccess() {
    const forcePasswordSection = document.querySelector(
        '.force-password-container'
    );
    if (forcePasswordSection) {
        window.fieldValidation.showSectionMessage(
            forcePasswordSection,
            'Password changed successfully! Redirecting to your dashboard...',
            'success'
        );
    }
}

// Show force password change error message
function showForcePasswordError(message) {
    const forcePasswordSection = document.querySelector(
        '.force-password-container'
    );
    if (forcePasswordSection) {
        window.fieldValidation.showSectionMessage(
            forcePasswordSection,
            message,
            'error'
        );
    }
}

// Clear force password change errors
function clearForcePasswordErrors() {
    const forcePasswordSection = document.querySelector(
        '.force-password-container'
    );
    if (!forcePasswordSection) return;

    // Clear section-level error messages
    const messages = forcePasswordSection.querySelectorAll('.section-message');
    messages.forEach((message) => message.remove());

    // Clear field-level errors
    const errorGroups =
        forcePasswordSection.querySelectorAll('.form-group.error');
    errorGroups.forEach((group) => {
        group.classList.remove('error');
        const errorMsg = group.querySelector('.error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    });

    // Clear success states
    const successGroups = forcePasswordSection.querySelectorAll(
        '.form-group.success'
    );
    successGroups.forEach((group) => {
        group.classList.remove('success');
        const successMsg = group.querySelector('.success-message');
        if (successMsg) {
            successMsg.remove();
        }
    });
}

// Reset password validation indicators
function resetForcePasswordValidationIndicators() {
    // Clear password match indicator
    const matchIndicator = document.getElementById('passwordMatch');
    if (matchIndicator) {
        matchIndicator.textContent = '';
        matchIndicator.className = 'password-match';
    }

    // The shared password strength indicator will handle its own reset when the field is cleared
}

// Handle logout from force password page
function handleForcePasswordLogout() {
    window.modalManager.showLogoutConfirmation(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.clear();
        window.location.href = '/';
    });
}

// Close error modal
function closeErrorModal() {
    const errorModal = document.getElementById('errorModal');
    if (errorModal) {
        errorModal.style.display = 'none';
    }
}

// Expose functions to global scope
window.forcePasswordPage = {
    initializeForcePasswordChangePage,
    changeForcePassword,
    handleForcePasswordLogout,
};

// Also expose individual functions for HTML onclick handlers
window.closeErrorModal = closeErrorModal;

// Initialize the force password change page
initializeForcePasswordChangePage();
