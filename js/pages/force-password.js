// Force Password Change Page Module
// Contains functionality for mandatory password changes on first login

// Initialize force password change page functionality
function initializeForcePasswordPage() {
    // Check if user is authenticated and actually needs to change password
    validateForcePasswordAccess();
    
    setupForcePasswordForm();
    displayUserInfo();
    
    // Focus on new password field
    const newPasswordField = document.getElementById('newPassword');
    if (newPasswordField) {
        setTimeout(() => newPasswordField.focus(), 100);
    }
}

// Validate that user has access to this page
function validateForcePasswordAccess() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
        // No authentication, redirect to login
        window.location.href = '/login.html';
        return;
    }
    
    try {
        const user = JSON.parse(userStr);
        if (!user.force_password_change) {
            // User doesn't need to change password, redirect based on role
            if (window.authUtils.isAdmin()) {
                window.location.href = '/admin.html';
            } else {
                window.location.href = '/patients.html';
            }
            return;
        }
    } catch (error) {
        console.error('Error parsing user data:', error);
        window.location.href = '/login.html';
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
            userNameElement.textContent = `${user.first_name} ${user.last_name}`;
        }
        if (userEmailElement) {
            userEmailElement.textContent = user.email;
        }
    } catch (error) {
        console.error('Error displaying user info:', error);
    }
}

// Set up force password change form functionality
function setupForcePasswordForm() {
    const forcePasswordForm = document.getElementById('forcePasswordChangeForm');
    if (!forcePasswordForm) return;
    
    // Set up field validation
    setupForcePasswordFieldValidation();
    
    // Handle form submission
    forcePasswordForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        await changeForcePassword();
    });
}

// Set up field validation for force password form
function setupForcePasswordFieldValidation() {
    const newPasswordField = document.getElementById('newPassword');
    const confirmPasswordField = document.getElementById('confirmPassword');
    
    if (newPasswordField) {
        newPasswordField.addEventListener('input', function() {
            const validation = window.passwordUtils.validatePassword(newPasswordField.value);
            
            // Update validation indicators
            updateForcePasswordValidationIndicators(validation);
            
            // Update field state
            window.fieldValidation.updateFieldState(newPasswordField);
            
            // Check password match if confirm password has value
            if (confirmPasswordField && confirmPasswordField.value) {
                validateForcePasswordMatch();
            }
        });
    }
    
    if (confirmPasswordField) {
        confirmPasswordField.addEventListener('input', function() {
            validateForcePasswordMatch();
            window.fieldValidation.updateFieldState(confirmPasswordField);
        });
        
        confirmPasswordField.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                changeForcePassword();
            }
        });
    }
}

// Update password validation indicators
function updateForcePasswordValidationIndicators(validation) {
    const requirements = [
        { id: 'lengthReq', key: 'minLength' },
        { id: 'uppercaseReq', key: 'hasUppercase' },
        { id: 'lowercaseReq', key: 'hasLowercase' },
        { id: 'digitReq', key: 'hasDigit' },
        { id: 'specialReq', key: 'hasSpecialChar' }
    ];
    
    requirements.forEach(req => {
        const element = document.getElementById(req.id);
        if (element) {
            if (validation[req.key]) {
                element.classList.add('valid');
                element.classList.remove('invalid');
            } else {
                element.classList.add('invalid');
                element.classList.remove('valid');
            }
        }
    });
}

// Validate password match for force password form
function validateForcePasswordMatch() {
    const newPasswordField = document.getElementById('newPassword');
    const confirmPasswordField = document.getElementById('confirmPassword');
    const matchIndicator = document.getElementById('passwordMatch');
    
    if (!newPasswordField || !confirmPasswordField || !matchIndicator) return;
    
    const isMatch = window.passwordUtils.passwordsMatch(newPasswordField.value, confirmPasswordField.value);
    
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
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validate input
        if (!newPassword || !confirmPassword) {
            throw new Error('Both password fields are required.');
        }
        
        // Validate new password
        const passwordValidation = window.passwordUtils.validatePassword(newPassword);
        if (!passwordValidation.isValid) {
            throw new Error('Password does not meet security requirements.');
        }
        
        // Validate password match
        if (!window.passwordUtils.passwordsMatch(newPassword, confirmPassword)) {
            throw new Error('Passwords do not match.');
        }
        
        const token = localStorage.getItem('token');
        const API_URL = window.apiClient.getAPIUrl();
        
        response = await fetch(`${API_URL}/api/force-change-password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                newPassword
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Update user data to reflect password change
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    user.force_password_change = false;
                    localStorage.setItem('user', JSON.stringify(user));
                } catch (error) {
                    console.error('Error updating user data:', error);
                }
            }
            
            // Clear the form
            document.getElementById('forcePasswordForm').reset();
            clearForcePasswordErrors();
            
            // Reset password validation indicators
            resetForcePasswordValidationIndicators();
            
            // Show success message and redirect
            showForcePasswordSuccess();
            
            // Redirect based on user role after delay
            setTimeout(() => {
                if (window.authUtils.isAdmin()) {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/patients.html';
                }
            }, 2000);
            
        } else {
            throw new Error(result.error || 'Failed to change password');
        }
        
    } catch (error) {
        console.error('Force password change error:', error);
        
        // Use enhanced error categorization
        const errorInfo = window.apiClient.categorizeError(error, response);
        
        // Show appropriate feedback based on error type
        if (errorInfo.modal) {
            window.modalManager.showModal('error', errorInfo.message);
        } else {
            showForcePasswordError(errorInfo.message);
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Show force password change success message
function showForcePasswordSuccess() {
    const forcePasswordSection = document.querySelector('.force-password-container');
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
    const forcePasswordSection = document.querySelector('.force-password-container');
    if (forcePasswordSection) {
        window.fieldValidation.showSectionMessage(forcePasswordSection, message, 'error');
    }
}

// Clear force password change errors
function clearForcePasswordErrors() {
    const forcePasswordSection = document.querySelector('.force-password-container');
    if (!forcePasswordSection) return;
    
    // Clear section-level error messages
    const messages = forcePasswordSection.querySelectorAll('.section-message');
    messages.forEach(message => message.remove());
    
    // Clear field-level errors
    const errorGroups = forcePasswordSection.querySelectorAll('.form-group.error');
    errorGroups.forEach(group => {
        group.classList.remove('error');
        const errorMsg = group.querySelector('.error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    });
    
    // Clear success states
    const successGroups = forcePasswordSection.querySelectorAll('.form-group.success');
    successGroups.forEach(group => {
        group.classList.remove('success');
        const successMsg = group.querySelector('.success-message');
        if (successMsg) {
            successMsg.remove();
        }
    });
}

// Reset password validation indicators
function resetForcePasswordValidationIndicators() {
    const requirements = ['lengthReq', 'uppercaseReq', 'lowercaseReq', 'digitReq', 'specialReq'];
    
    requirements.forEach(reqId => {
        const element = document.getElementById(reqId);
        if (element) {
            element.classList.remove('valid', 'invalid');
        }
    });
    
    // Clear password match indicator
    const matchIndicator = document.getElementById('passwordMatch');
    if (matchIndicator) {
        matchIndicator.textContent = '';
        matchIndicator.className = 'password-match';
    }
}

// Handle logout from force password page
function handleForcePasswordLogout() {
    window.modalManager.showLogoutConfirmation(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.clear();
        window.location.href = '/login.html';
    });
}

// Expose functions to global scope
window.forcePasswordPage = {
    initializeForcePasswordPage,
    changeForcePassword,
    handleForcePasswordLogout
};
