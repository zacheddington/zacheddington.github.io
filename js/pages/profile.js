// Profile Page Module
// Contains user profile management functionality including password changes

// Initialize profile page functionality
function initializeProfilePage() {
    setupPasswordChangeForm();
    loadUserProfile();
    load2FAStatus(); // Add 2FA status loading

    // Load hamburger menu
    if (document.getElementById('hamburger-menu')) {
        loadMenu();
    }
}

// Load user profile information
async function loadUserProfile() {
    try {
        const API_URL = window.apiClient.getAPIUrl();
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_URL}/api/user/profile`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (response.ok) {
            const result = await response.json();

            // Extract profile data from response
            const profile = result.data || result; // Handle both response formats
            displayUserProfile(profile);
        } else {
            console.error(
                'Failed to load user profile from API, trying localStorage fallback'
            );
            loadProfileFromLocalStorage();
        }
    } catch (error) {
        console.error(
            'Error loading user profile from API, trying localStorage fallback:',
            error
        );
        loadProfileFromLocalStorage();
    }
}

// Fallback function to load profile from localStorage
function loadProfileFromLocalStorage() {
    try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');

        if (
            userData &&
            (userData.firstName || userData.first_name || userData.username)
        ) {
            // Determine role display - use the first role from the roles array, or fallback
            let roleDisplay = 'User'; // Default fallback
            if (
                userData.roles &&
                Array.isArray(userData.roles) &&
                userData.roles.length > 0
            ) {
                roleDisplay = userData.roles[0]; // Use first role from array
            } else if (userData.role) {
                roleDisplay = userData.role; // Fallback to single role property
            } else if (userData.isAdmin) {
                roleDisplay = 'Administrator'; // Admin fallback
            }

            const profile = {
                first_name: userData.firstName || userData.first_name || 'User',
                middle_name: userData.middleName || userData.middle_name || '',
                last_name: userData.lastName || userData.last_name || '',
                email: userData.email || 'Not available',
                role: roleDisplay,
                username: userData.username || userData.email || 'Unknown',
            };

            displayUserProfile(profile);
        } else {
            console.error('No user data available in localStorage');
            displayProfileError();
        }
    } catch (error) {
        console.error('Error loading user data from localStorage:', error);
        displayProfileError();
    }
}

// Display user profile information
function displayUserProfile(profile) {
    const userNameElement = document.getElementById('userName');
    const userEmailElement = document.getElementById('userEmail');
    const userRoleElement = document.getElementById('userRole');

    if (userNameElement) {
        const fullName = `${profile.first_name || ''} ${
            profile.middle_name || ''
        } ${profile.last_name || ''}`.trim();
        userNameElement.textContent = fullName || profile.username || 'User';
    }
    if (userEmailElement) {
        userEmailElement.textContent = profile.email || 'Not available';
    }
    if (userRoleElement) {
        userRoleElement.textContent = profile.role || 'User';
    }

    // Hide loading indicators
    const loadingElements = document.querySelectorAll('.loading');
    loadingElements.forEach((el) => (el.style.display = 'none'));
}

// Display error state when profile cannot be loaded
function displayProfileError() {
    const userNameElement = document.getElementById('userName');
    const userEmailElement = document.getElementById('userEmail');
    const userRoleElement = document.getElementById('userRole');

    if (userNameElement) userNameElement.textContent = 'Unable to load';
    if (userEmailElement) userEmailElement.textContent = 'Unable to load';
    if (userRoleElement) userRoleElement.textContent = 'Unable to load';
    // Hide loading indicators
    const loadingElements = document.querySelectorAll('.loading');
    loadingElements.forEach((el) => (el.style.display = 'none'));
}

// Set up password change form functionality
function setupPasswordChangeForm() {
    const passwordChangeForm = document.getElementById('passwordChangeForm');
    if (!passwordChangeForm) return;

    // Set up field validation
    setupProfileFieldValidation();

    // Handle form submission
    passwordChangeForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        await changePassword();
    });

    // Set up profile update form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            await updateProfile();
        });
    }
}

// Set up profile form field validation
function setupProfileFieldValidation() {
    // Password field validation
    const currentPasswordField = document.getElementById('currentPassword');
    const newPasswordField = document.getElementById('newPassword');
    const confirmPasswordField = document.getElementById('confirmPassword');

    if (currentPasswordField) {
        currentPasswordField.addEventListener('input', function () {
            window.fieldValidation.updateFieldState(currentPasswordField);
        });
    }

    if (newPasswordField) {
        // Add password strength indicator for profile password form
        window.passwordUtils.addPasswordStrengthIndicator(newPasswordField);

        newPasswordField.addEventListener('input', function () {
            // Update field state
            if (
                window.fieldValidation &&
                window.fieldValidation.updateFieldState
            ) {
                window.fieldValidation.updateFieldState(newPasswordField);
            }

            // Check password match if confirm password has value
            if (confirmPasswordField && confirmPasswordField.value) {
                validatePasswordMatch();
            }
        });
    }

    if (confirmPasswordField) {
        confirmPasswordField.addEventListener('input', function () {
            validatePasswordMatch();
            if (
                window.fieldValidation &&
                window.fieldValidation.updateFieldState
            ) {
                window.fieldValidation.updateFieldState(confirmPasswordField);
            }
        });
    }
}

// Validate password match
function validatePasswordMatch() {
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

// Change user password
async function changePassword() {
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
        const currentPassword =
            document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword =
            document.getElementById('confirmPassword').value;

        // Validate input
        if (!currentPassword || !newPassword || !confirmPassword) {
            throw new Error('All password fields are required.');
        }

        // Validate new password
        const passwordValidation =
            window.passwordUtils.validatePassword(newPassword);
        if (!passwordValidation.isValid) {
            throw new Error(
                'New password does not meet security requirements.'
            );
        }

        // Validate password match
        if (
            !window.passwordUtils.passwordsMatch(newPassword, confirmPassword)
        ) {
            throw new Error('New passwords do not match.');
        }

        // Check if new password is different from current
        if (newPassword === currentPassword) {
            throw new Error(
                'New password must be different from current password.'
            );
        }

        const token = localStorage.getItem('token');
        const API_URL = window.apiClient.getAPIUrl();

        response = await fetch(`${API_URL}/api/user/change-password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                currentPassword,
                newPassword,
            }),
        });

        const result = await response.json();

        if (response.ok) {
            // Clear the form
            document.getElementById('passwordChangeForm').reset();
            clearPasswordChangeErrors();

            // Reset password validation indicators
            resetPasswordValidationIndicators();

            // Show success modal
            window.modalManager.showModal(
                'success',
                'Password changed successfully!'
            );
        } else {
            throw new Error(result.error || 'Failed to change password');
        }
    } catch (error) {
        console.error('Change password error:', error);

        // Use enhanced error categorization
        const errorInfo = window.apiClient.categorizeError(error, response);

        // Show appropriate feedback based on error type
        if (errorInfo.modal) {
            window.modalManager.showModal('error', errorInfo.message);
        } else {
            showPasswordChangeError(errorInfo.message);
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Show password change error message
function showPasswordChangeError(message) {
    const passwordChangeSection = document.getElementById(
        'passwordChangeSection'
    );
    if (passwordChangeSection) {
        window.fieldValidation.showSectionMessage(
            passwordChangeSection,
            message,
            'error'
        );
    }
}

// Clear password change errors
function clearPasswordChangeErrors() {
    const passwordChangeSection = document.getElementById(
        'passwordChangeSection'
    );
    if (!passwordChangeSection) return;

    // Clear section-level error messages
    const errorMessage = passwordChangeSection.querySelector(
        '.section-message.error'
    );
    if (errorMessage) {
        errorMessage.remove();
    }

    // Clear field-level errors
    const errorGroups =
        passwordChangeSection.querySelectorAll('.form-group.error');
    errorGroups.forEach((group) => {
        group.classList.remove('error');
        const errorMsg = group.querySelector('.error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    });

    // Clear success states
    const successGroups = passwordChangeSection.querySelectorAll(
        '.form-group.success'
    );
    successGroups.forEach((group) => {
        group.classList.remove('success');
        const successMsg = group.querySelector('.success-message');
        if (successMsg) {
            successMsg.remove();
        }
    });

    // Update field states
    const allFields = passwordChangeSection.querySelectorAll(
        'input[type="password"]'
    );
    allFields.forEach((field) => {
        window.fieldValidation.updateFieldState(field);
    });
}

// Reset password validation indicators
function resetPasswordValidationIndicators() {
    // Clear password match indicator
    const matchIndicator = document.getElementById('passwordMatch');
    if (matchIndicator) {
        matchIndicator.textContent = '';
        matchIndicator.className = 'password-match';
    }

    // Reset the password strength indicator if it exists
    const newPasswordField = document.getElementById('newPassword');
    if (newPasswordField && newPasswordField.value) {
        newPasswordField.value = '';
        // Trigger update to clear the strength indicator
        window.passwordUtils.updatePasswordStrength('', newPasswordField.id);
    }
}

// Update user profile information
async function updateProfile() {
    const submitBtn = document.getElementById('updateProfileBtn');
    const originalText = submitBtn.textContent;
    let response = null;

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating Profile...';

        // Get form data
        const firstName = document.getElementById('firstName').value.trim();
        const middleName = document.getElementById('middleName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('email').value.trim();

        // Validate required fields
        if (!firstName || !lastName || !email) {
            throw new Error('First name, last name, and email are required.');
        }

        const token = localStorage.getItem('token');
        const API_URL = window.apiClient.getAPIUrl();

        response = await fetch(`${API_URL}/api/user/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                firstName,
                middleName,
                lastName,
                email,
            }),
        });

        const result = await response.json();

        if (response.ok) {
            // Update the display sections with new data
            const profile = result.data || result;
            displayUserProfile(profile);

            // Show success message
            window.modalManager.showModal(
                'success',
                'Profile updated successfully!'
            );
        } else {
            throw new Error(result.error || 'Failed to update profile');
        }
    } catch (error) {
        console.error('Update profile error:', error);

        // Use enhanced error categorization
        const errorInfo = window.apiClient.categorizeError(error, response);

        // Show appropriate feedback
        window.modalManager.showModal('error', errorInfo.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Load 2FA status and setup UI
async function load2FAStatus() {
    try {
        const twofaStatus = document.getElementById('twofaStatus');
        const twofaActions = document.getElementById('twofaActions');

        if (!twofaStatus || !twofaActions) return;

        const API_URL = window.apiClient.getAPIUrl();
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_URL}/api/2fa/status`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (response.ok) {
            const result = await response.json();
            const isEnabled = result.data?.enabled || false;

            // Update status badge
            twofaStatus.textContent = isEnabled ? 'Enabled' : 'Disabled';
            twofaStatus.className = `status-badge ${
                isEnabled ? 'enabled' : 'disabled'
            }`;

            // Setup action buttons
            if (isEnabled) {
                twofaActions.innerHTML = `
                    <button type="button" class="secondary-btn" onclick="disable2FA()">
                        Disable 2FA
                    </button>
                `;
            } else {
                twofaActions.innerHTML = `
                    <button type="button" class="submit-btn" onclick="enable2FA()">
                        Enable 2FA
                    </button>
                `;
            }
        } else {
            throw new Error('Failed to load 2FA status');
        }
    } catch (error) {
        console.error('Error loading 2FA status:', error);
        const twofaStatus = document.getElementById('twofaStatus');
        const twofaActions = document.getElementById('twofaActions');

        if (twofaStatus) {
            twofaStatus.textContent = 'Error';
            twofaStatus.className = 'status-badge error';
        }

        if (twofaActions) {
            twofaActions.innerHTML = `
                <button type="button" class="secondary-btn" onclick="load2FAStatus()">
                    Retry Loading
                </button>
            `;
        }
    }
}

// Enable 2FA function
function enable2FA() {
    window.location.href = '../2fa-setup/';
}

// Disable 2FA function
async function disable2FA() {
    // Create a custom modal for password input
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.innerHTML = `
        <div class="modal-content">
            <h2>Disable Two-Factor Authentication</h2>
            <p>Please enter your current password to disable 2FA:</p>
            <form id="disable2faForm">
                <input type="text" name="username" autocomplete="username" style="display: none;" readonly>
                <div class="form-group">
                    <label for="disable2faPassword">Current Password</label>
                    <input type="password" id="disable2faPassword" class="modal-input" required autocomplete="current-password">
                </div>
                <div class="modal-actions">
                    <button type="button" class="secondary-btn" id="cancel2faDisable">Cancel</button>
                    <button type="submit" class="primary-btn" id="confirm2faDisable">Disable 2FA</button>
                </div>
            </form>
            <div class="modal-hint">Press Escape to cancel</div>
        </div>
    `;

    // Add keyboard and event handling
    modalOverlay.tabIndex = '-1';
    modalOverlay.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });

    modalOverlay.addEventListener('click', function (e) {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    function closeModal() {
        document.body.removeChild(modalOverlay);
    }

    // Handle form submission
    const form = modalOverlay.querySelector('#disable2faForm');
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const password = document.getElementById('disable2faPassword').value;
        const submitBtn = document.getElementById('confirm2faDisable');
        const originalText = submitBtn.textContent;

        if (!password) return;

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Disabling...';

            const API_URL = window.apiClient.getAPIUrl();
            const token = localStorage.getItem('token');

            const response = await fetch(`${API_URL}/api/2fa/disable`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ password }),
            });

            const result = await response.json();

            if (response.ok) {
                closeModal();
                window.modalManager.showModal(
                    'success',
                    '2FA has been disabled successfully.'
                );
                load2FAStatus(); // Refresh status
            } else {
                window.modalManager.showModal(
                    'error',
                    result.error || 'Failed to disable 2FA.'
                );
                closeModal();
            }
        } catch (error) {
            console.error('Error disabling 2FA:', error);
            window.modalManager.showModal(
                'error',
                'Network error. Please try again.'
            );
            closeModal();
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });

    // Handle cancel button
    const cancelBtn = modalOverlay.querySelector('#cancel2faDisable');
    cancelBtn.addEventListener('click', closeModal); // Add modal to page and focus
    document.body.appendChild(modalOverlay);
    modalOverlay.focus();

    // Populate the hidden username field for accessibility
    const usernameField = modalOverlay.querySelector('input[name="username"]');
    if (usernameField) {
        try {
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            const username = userData.email || userData.username || '';
            if (username) {
                usernameField.value = username;
            }
        } catch (error) {
            console.log(
                'Could not populate username for accessibility:',
                error
            );
        }
    }

    // Focus the password input
    setTimeout(() => {
        document.getElementById('disable2faPassword').focus();
    }, 100);
}

// Expose functions to global scope
window.profilePage = {
    initializeProfilePage,
    loadUserProfile,
    changePassword,
    updateProfile,
};

// Make 2FA functions globally available
window.load2FAStatus = load2FAStatus;
window.enable2FA = enable2FA;
window.disable2FA = disable2FA;
