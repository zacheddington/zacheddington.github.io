/**
 * Field State Management System
 * Manages color-coding for form fields based on their state:
 * - field-error: Error state (pale red with dark red outline)
 * - field-required: Required but not filled (pale yellow with dark yellow outline)
 * - field-optional: Optional and empty (pale green with dark green outline)
 * - field-filled: Filled/valid (no color, plain field)
 * - field-disabled: Disabled (light gray with greyed text)
 */

class FieldStateManager {
    constructor() {
        this.fieldStates = new Map();
        this.fieldRequirements = new Map();
        this.initializeFieldStateSystem();
    }

    /**
     * Initialize the field state system for all forms
     */
    initializeFieldStateSystem() {
        // Add event listeners when DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupFieldStateManagement());
        } else {
            this.setupFieldStateManagement();
        }
    }

    /**
     * Set up field state management for all forms on the page
     */
    setupFieldStateManagement() {
        // Find all input, select, and textarea elements
        const fields = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], select, textarea');
        
        fields.forEach(field => {
            // Set initial field requirements
            this.setFieldRequirement(field);
            
            // Add event listeners
            field.addEventListener('input', () => this.updateFieldState(field));
            field.addEventListener('blur', () => this.updateFieldState(field));
            field.addEventListener('focus', () => this.updateFieldState(field));
            
            // Set initial state
            this.updateFieldState(field);
        });
    }    /**
     * Determine if a field is required based on HTML attributes and context
     */
    setFieldRequirement(field) {
        const fieldId = field.id || field.name || field.dataset.fieldName;
        if (!fieldId) return;

        // Check for required attribute
        let isRequired = field.hasAttribute('required');
        
        // Check for specific field patterns that should be required
        const requiredPatterns = [
            'username', 'email', 'password', 'currentPassword', 'newPassword', 'confirmPassword',
            'firstName', 'lastName', 'role', 'eegDate', 'patientId'
        ];

        if (!isRequired) {
            isRequired = requiredPatterns.some(pattern => 
                fieldId.toLowerCase().includes(pattern.toLowerCase()) ||
                field.placeholder?.toLowerCase().includes(pattern.toLowerCase()) ||
                field.name?.toLowerCase().includes(pattern.toLowerCase())
            );
        }

        // Special cases for password confirmation
        if (fieldId.includes('confirm') && fieldId.toLowerCase().includes('password')) {
            isRequired = true;
        }
        
        // Check if label indicates required field (has asterisk)
        if (!isRequired) {
            const label = field.closest('.form-group')?.querySelector('label');
            if (label && label.textContent.includes('*')) {
                isRequired = true;
            }
        }

        this.fieldRequirements.set(fieldId, isRequired);
    }

    /**
     * Update the visual state of a field based on its current value and validation
     */
    updateFieldState(field) {
        if (!field) return;

        const fieldId = field.id || field.name || field.dataset.fieldName;
        if (!fieldId) return;

        // Remove all existing field state classes
        field.classList.remove('field-error', 'field-required', 'field-optional', 'field-filled', 'field-disabled');

        // Check if field is disabled
        if (field.disabled) {
            field.classList.add('field-disabled');
            return;
        }

        const value = field.value.trim();
        const isRequired = this.fieldRequirements.get(fieldId) || false;
        const hasError = this.hasFieldError(field);

        // Priority: Error > Required Empty > Filled > Optional Empty
        if (hasError) {
            field.classList.add('field-error');
        } else if (isRequired && !value) {
            field.classList.add('field-required');
        } else if (value) {
            field.classList.add('field-filled');
        } else {
            // Optional field with no value
            field.classList.add('field-optional');
        }
    }    /**
     * Check if a field has validation errors
     */
    hasFieldError(field) {
        const fieldId = field.id || field.name || field.dataset.fieldName;
        if (!fieldId) return false;

        const value = field.value.trim();

        // Check if field is in an error state (has error message or error class on parent)
        const formGroup = field.closest('.form-group');
        if (formGroup && formGroup.classList.contains('error')) return true;

        // Check for error messages
        const errorMessage = formGroup?.querySelector('.error-message');
        if (errorMessage && !errorMessage.classList.contains('hidden')) return true;

        // Check for password-specific error classes
        if (field.type === 'password') {
            if (field.classList.contains('password-mismatch')) return true;
            if (field.classList.contains('password-invalid')) return true;
            if (field.classList.contains('password-weak') && value.length > 0) {
                // Only consider weak passwords as errors if they have content
                const score = this.calculatePasswordScore(value);
                return score < 40; // Consider very weak passwords as errors
            }
        }

        // Email validation
        if (field.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) return true;
        }

        // Password validation for new passwords
        if (field.type === 'password' && fieldId.toLowerCase().includes('new') && value) {
            // Check password strength (at least 8 characters, with letters and numbers)
            if (value.length < 8) return true;
            if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) return true;
        }

        // Password confirmation validation
        if (fieldId.toLowerCase().includes('confirm') && fieldId.toLowerCase().includes('password') && value) {
            const newPasswordField = document.querySelector('input[id*="newPassword"], input[id*="new-password"], input[name*="newPassword"]');
            if (newPasswordField && value !== newPasswordField.value) return true;
        }

        return false;
    }

    /**
     * Calculate password score (similar to main.js but simplified)
     */
    calculatePasswordScore(password) {
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
        
        return Math.max(0, Math.min(100, score));
    }

    /**
     * Manually set a field's state
     */
    setFieldState(fieldSelector, state) {
        const field = document.querySelector(fieldSelector);
        if (!field) return;

        field.classList.remove('field-error', 'field-required', 'field-optional', 'field-filled', 'field-disabled');
        if (state && ['field-error', 'field-required', 'field-optional', 'field-filled', 'field-disabled'].includes(state)) {
            field.classList.add(state);
        }
    }

    /**
     * Manually set a field as required or optional
     */
    setFieldRequirement(field, isRequired = null) {
        if (typeof field === 'string') {
            field = document.querySelector(field);
        }
        if (!field) return;

        const fieldId = field.id || field.name || field.dataset.fieldName;
        if (!fieldId) return;

        if (isRequired !== null) {
            this.fieldRequirements.set(fieldId, isRequired);
        } else {
            // Auto-detect requirement
            this.setFieldRequirement(field);
        }

        this.updateFieldState(field);
    }

    /**
     * Update all fields on the page
     */
    updateAllFields() {
        const fields = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], select, textarea');
        fields.forEach(field => this.updateFieldState(field));
    }

    /**
     * Reset all field states to their initial state
     */
    resetAllFields() {
        const fields = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], select, textarea');
        fields.forEach(field => {
            field.classList.remove('field-error', 'field-required', 'field-optional', 'field-filled', 'field-disabled');
            this.setFieldRequirement(field);
            this.updateFieldState(field);
        });
    }
}

// Create global instance
window.fieldStateManager = new FieldStateManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FieldStateManager;
}
