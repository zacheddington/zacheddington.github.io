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
    }    /**
     * Set up field state management for all forms on the page
     */    setupFieldStateManagement() {
        // Find all input, select, and textarea elements
        const fields = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], input[type="tel"], select, textarea');
        
        fields.forEach(field => {
            // Set initial field requirements
            this.setFieldRequirement(field);
            
            // Add event listeners
            field.addEventListener('input', () => this.updateFieldState(field));
            field.addEventListener('blur', () => this.updateFieldState(field));
            field.addEventListener('focus', () => this.updateFieldState(field));
            
            // Add special handling for profile fields to ensure immediate updates
            const fieldId = field.id || field.name || field.dataset.fieldName;
            const isProfileField = ['firstName', 'lastName', 'middleName', 'email'].includes(fieldId);
            
            if (isProfileField) {
                // Add additional event listeners for profile fields
                field.addEventListener('keyup', () => {
                    // Delay slightly to ensure value is updated
                    setTimeout(() => this.updateFieldState(field), 10);
                });
                
                field.addEventListener('change', () => this.updateFieldState(field));
                
                // Add a property change observer for edge cases
                field.addEventListener('propertychange', () => this.updateFieldState(field));
            }
            
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
        }        // Debug logging for field requirement detection (can be removed in production)
        const isProfileField = ['firstName', 'lastName', 'middleName', 'email'].includes(fieldId);
        if (isProfileField && console.groupCollapsed) {
            console.groupCollapsed(`Field Requirement: ${fieldId}`);
            console.log('Field ID:', fieldId);
            console.log('Has required attribute:', field.hasAttribute('required'));
            console.log('Matches patterns:', requiredPatterns.some(pattern => 
                fieldId.toLowerCase().includes(pattern.toLowerCase())
            ));
            console.log('Final isRequired:', isRequired);
            console.log('Placeholder:', field.placeholder);
            console.log('Name:', field.name);
            console.groupEnd();
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
    }    /**
     * Update the visual state of a field based on its current value and validation
     */
    updateFieldState(field) {
        if (!field) return;

        // Set flag to prevent infinite recursion
        this._updatingState = true;

        const fieldId = field.id || field.name || field.dataset.fieldName;
        if (!fieldId) {
            this._updatingState = false;
            return;
        }

        // Remove all existing field state classes
        field.classList.remove('field-error', 'field-required', 'field-optional', 'field-filled', 'field-disabled');

        const value = field.value.trim();
        const isRequired = this.fieldRequirements.get(fieldId) || false;
        const hasError = this.hasFieldError(field);// Debug logging for profile fields (can be removed in production)
        const isProfileField = ['firstName', 'lastName', 'middleName', 'email'].includes(fieldId);
        if (isProfileField && console.groupCollapsed) {
            console.groupCollapsed(`Field State: ${fieldId}`);
            console.log('Value:', value);
            console.log('Disabled:', field.disabled);
            console.log('Is Required:', isRequired);
            console.log('Has Error:', hasError);
            console.log('Is Editing Mode:', this.isInEditingMode());
            console.groupEnd();
        }        // Additional check: If this is a profile field that appears disabled but shouldn't be
        // This handles edge cases where disabled state might be cached or not properly updated
        if (isProfileField && this.isInEditingMode()) {
            // Force check if field should actually be enabled in editing mode
            const profileFields = ['firstName', 'middleName', 'lastName', 'email'];
            if (profileFields.includes(fieldId) && field.disabled) {
                // Field should be enabled in editing mode, but it's disabled - force enable
                field.disabled = false;
            }
        }        // Check if field is disabled or readonly
        if (field.disabled || field.readOnly) {
            // Always show disabled state for readonly fields (like role field)
            field.classList.add('field-disabled');
            this._updatingState = false;
            return;
        }        // Priority: Error > Required Invalid > Required Empty > Filled > Optional Empty
        if (hasError) {
            field.classList.add('field-error');
        } else if (isRequired && (!value || this.isRequiredFieldIncomplete(field))) {
            // Required field that is either empty OR doesn't meet validation criteria
            field.classList.add('field-required');
        } else if (value) {
            field.classList.add('field-filled');
        } else {
            // Optional field with no value
            field.classList.add('field-optional');
        }

        // Clear the recursion protection flag
        this._updatingState = false;
    }    /**
     * Check if the profile is currently in editing mode
     */
    isInEditingMode() {
        const updateBtn = document.getElementById('updateProfileBtn');
        return updateBtn && updateBtn.textContent === 'Save Profile';
    }

    /**
     * Check if a required field is incomplete (has value but doesn't meet validation criteria)
     * This is different from hasFieldError - this checks for incomplete but not necessarily error state
     */
    isRequiredFieldIncomplete(field) {
        const fieldId = field.id || field.name || field.dataset.fieldName;
        if (!fieldId) return false;

        const value = field.value.trim();
        if (!value) return false; // Empty fields are handled separately        // Password validation for all password fields - use unified validation system
        if (field.type === 'password' && value) {
            // Use the unified password validation from main.js if available
            if (typeof window.validatePassword === 'function') {
                const validation = window.validatePassword(value);
                return !validation.isValid;
            }
            
            // Fallback validation if main.js not loaded yet (should match main.js exactly)
            if (value.length < 8) return true;
            if (!/[A-Z]/.test(value)) return true;
            if (!/[a-z]/.test(value)) return true;
            if (!/[0-9]/.test(value)) return true;
            if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return true;
            if (/\s/.test(value)) return true;
            
            // Check for common passwords
            const commonPasswords = [
                'password', 'password123', '123456', '123456789', 'qwerty', 'abc123',
                'Password1', 'password1', 'admin', 'administrator', 'welcome', 'login'
            ];
            if (commonPasswords.some(common => value.toLowerCase() === common.toLowerCase())) {
                return true;
            }
        }

        // Email validation - if has value but invalid format, it's incomplete
        if (field.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) return true;
        }

        // Password confirmation - if has value but doesn't match, it's incomplete
        if (fieldId.toLowerCase().includes('confirm') && fieldId.toLowerCase().includes('password') && value) {
            const newPasswordField = document.querySelector('input[id*="newPassword"], input[id*="new-password"], input[name*="newPassword"]');
            if (newPasswordField && value !== newPasswordField.value) return true;
        }

        return false;
    }/**
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
        if (errorMessage && !errorMessage.classList.contains('hidden')) return true;        // Check for password-specific error classes
        if (field.type === 'password') {
            if (field.classList.contains('password-mismatch')) return true;
            if (field.classList.contains('password-invalid')) return true;
        }

        // Email validation
        if (field.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) return true;
        }        // Password validation for all password fields (not just new passwords) - use unified system
        if (field.type === 'password' && value) {
            // Use the unified password validation from main.js if available
            if (typeof window.validatePassword === 'function') {
                const validation = window.validatePassword(value);
                return !validation.isValid;
            }
            
            // Fallback validation if main.js not loaded yet (should match main.js exactly)
            if (value.length < 8) return true;
            if (!/[A-Z]/.test(value)) return true;
            if (!/[a-z]/.test(value)) return true;
            if (!/[0-9]/.test(value)) return true;
            if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return true;
            if (/\s/.test(value)) return true;
            
            // Check for common passwords
            const commonPasswords = [
                'password', 'password123', '123456', '123456789', 'qwerty', 'abc123',
                'Password1', 'password1', 'admin', 'administrator', 'welcome', 'login'
            ];
            if (commonPasswords.some(common => value.toLowerCase() === common.toLowerCase())) {
                return true;
            }
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
    }    /**
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
            // Auto-detect requirement based on field attributes
            const autoDetectedRequired = field.hasAttribute('required') || 
                                       field.hasAttribute('data-required') ||
                                       field.classList.contains('required');
            this.fieldRequirements.set(fieldId, autoDetectedRequired);
        }

        // Note: Removed recursive updateFieldState call to prevent stack overflow
        // Field state will be updated by the next user interaction or manual call
    }

    /**
     * Update all fields on the page
     */    updateAllFields() {
        const fields = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], input[type="tel"], select, textarea');
        fields.forEach(field => this.updateFieldState(field));
    }    /**
     * Reset all field states to their initial state
     */
    resetAllFields() {
        const fields = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], input[type="tel"], select, textarea');
        fields.forEach(field => {
            field.classList.remove('field-error', 'field-required', 'field-optional', 'field-filled', 'field-disabled');
            this.setFieldRequirement(field);
            this.updateFieldState(field);
        });
    }

    /**
     * Force update a specific field by ID or element reference
     * Useful for manual triggering when field state needs immediate update
     */
    forceUpdateField(fieldSelector) {
        const field = typeof fieldSelector === 'string' ? 
            document.querySelector(fieldSelector) : fieldSelector;
            
        if (field) {
            this.updateFieldState(field);
            return true;
        }
        return false;
    }    /**
     * Force update all profile fields
     * Useful when profile editing state changes
     */
    updateProfileFields() {
        const profileFields = ['firstName', 'middleName', 'lastName', 'email'];
        profileFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                // Re-evaluate field requirements first
                this.setFieldRequirement(field);
                // Then update field state
                this.updateFieldState(field);
            }
        });
    }

    /**
     * Refresh field requirements for all fields
     * Useful when field attributes might have changed
     */    refreshFieldRequirements() {
        const fields = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], input[type="tel"], select, textarea');
        fields.forEach(field => {
            this.setFieldRequirement(field);
        });
    }
}

// Create global instance
window.fieldStateManager = new FieldStateManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FieldStateManager;
}
