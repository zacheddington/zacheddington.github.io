// Field Validation Utilities
// Handles form field validation, character limits, and error display

// Show character limit modal
function showCharacterLimitModal(fieldName, maxLength) {
    // Check if modal is already showing to prevent duplicates
    if (
        typeof window.modalManager !== 'undefined' &&
        window.modalManager.isShowingModal
    ) {
        return;
    }

    const message = `${fieldName} cannot exceed ${maxLength} characters. The text has been automatically trimmed.`;

    if (typeof showModal === 'function') {
        showModal('error', message);
    } else {
        alert(message);
    }
}

// Setup field validation for character limits
function setupFieldValidation(fields) {
    fields.forEach((field) => {
        const input = document.getElementById(field.id);
        if (input) {
            // Character count prevention
            input.addEventListener('input', function (e) {
                if (e.target.value.length > field.maxLength) {
                    e.target.value = e.target.value.substring(
                        0,
                        field.maxLength
                    );
                    showCharacterLimitModal(field.label, field.maxLength);
                }
            });

            // Paste prevention for overlength content
            input.addEventListener('paste', function (e) {
                setTimeout(() => {
                    if (e.target.value.length > field.maxLength) {
                        e.target.value = e.target.value.substring(
                            0,
                            field.maxLength
                        );
                        showCharacterLimitModal(field.label, field.maxLength);
                    }
                }, 0);
            });
        }
    });
}

// Show section message (inline error/success messages)
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
        ${
            type === 'success'
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

// Clear form errors
function clearFormErrors(section) {
    // Clear section-level error messages
    const errorMessage = section.querySelector('.section-message.error');
    if (errorMessage) {
        errorMessage.remove();
    }

    // Clear field-level errors
    const errorGroups = section.querySelectorAll('.form-group.error');
    errorGroups.forEach((group) => {
        group.classList.remove('error');
        const errorMsg = group.querySelector('.error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    });

    // Clear success states
    const successGroups = section.querySelectorAll('.form-group.success');
    successGroups.forEach((group) => {
        group.classList.remove('success');
        const successMsg = group.querySelector('.success-message');
        if (successMsg) {
            successMsg.remove();
        }
    });

    // Clear password matching classes
    const passwordInputs = section.querySelectorAll('input[type="password"]');
    passwordInputs.forEach((input) => {
        input.classList.remove('password-match', 'password-mismatch');
    });

    // Update field states using the field state manager
    if (window.fieldStateManager) {
        const allFields = section.querySelectorAll('input, select, textarea');
        allFields.forEach((field) => {
            window.fieldStateManager.updateFieldState(field);
        });
    }
}

// Validate email format
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate phone number (basic US phone number validation)
function validatePhoneNumber(phone) {
    // Accept both formatted (XXX) XXX-XXXX and unformatted XXXXXXXXXX
    const phoneRegex =
        /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$|^\d{10}$/;
    return phoneRegex.test(phone);
}

// Validate required fields
function validateRequiredFields(fields) {
    const errors = [];

    fields.forEach((field) => {
        const element = document.getElementById(field.id);
        if (element) {
            const value = element.value.trim();
            if (!value && field.required) {
                errors.push(`${field.label} is required.`);
            }
        }
    });

    return errors;
}

// Validate character limits
function validateCharacterLimits(fields) {
    const errors = [];

    fields.forEach((field) => {
        const element = document.getElementById(field.id);
        if (element) {
            const value = element.value.trim();
            if (value.length > field.maxLength) {
                errors.push(
                    `${field.label} must be ${field.maxLength} characters or less.`
                );
            }
        }
    });

    return errors;
}

// Make field validation utilities available globally
window.showCharacterLimitModal = showCharacterLimitModal;
window.setupFieldValidation = setupFieldValidation;
window.showSectionMessage = showSectionMessage;
window.clearFormErrors = clearFormErrors;
window.validateEmail = validateEmail;
window.validatePhoneNumber = validatePhoneNumber;
window.validateRequiredFields = validateRequiredFields;
window.validateCharacterLimits = validateCharacterLimits;

// Create a fieldValidation object for backwards compatibility
window.fieldValidation = {
    showSectionMessage: showSectionMessage,
    clearFormErrors: clearFormErrors,
    validateEmail: validateEmail,
    validatePhoneNumber: validatePhoneNumber,
    validateRequiredFields: validateRequiredFields,
    validateCharacterLimits: validateCharacterLimits,
    // Add empty updateFieldState function to prevent errors
    updateFieldState: function () {
        // This function is deprecated - no-op for compatibility
    },
};
