// Password Utilities
// Handles password validation, strength checking, and related functionality

// Healthcare-compliant password validation
function validatePasswordStrength(password) {
    const requirements = {
        minLength: password.length >= 8,
        hasUpperCase: /[A-Z]/.test(password),
        hasLowerCase: /[a-z]/.test(password),
        hasNumbers: /[0-9]/.test(password),
        hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
        noSpaces: !/\s/.test(password)
    };
    
    const passed = Object.values(requirements).filter(Boolean).length;
    const total = Object.keys(requirements).length;
    const isValid = passed === total;
    
    const failed = [];
    if (!requirements.minLength) failed.push('At least 8 characters long');
    if (!requirements.hasUpperCase) failed.push('At least one uppercase letter (A-Z)');
    if (!requirements.hasLowerCase) failed.push('At least one lowercase letter (a-z)');
    if (!requirements.hasNumbers) failed.push('At least one number (0-9)');
    if (!requirements.hasSpecialChar) failed.push('At least one special character (!@#$%...)');
    if (!requirements.noSpaces) failed.push('No spaces allowed');
    
    return {
        isValid,
        strength: passed / total,
        passed,
        total,
        requirements,
        failed
    };
}

// Calculate password strength score
function calculatePasswordScore(password) {
    let score = 0;
    
    // Length bonus
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 15;
    if (password.length >= 16) score += 10;
    
    // Character variety
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/[0-9]/.test(password)) score += 10;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15;
    
    // Pattern diversity
    if (/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/.test(password)) score += 10;
    if (/(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) score += 5;
    
    // Penalties
    if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
    if (/123|abc|qwe|asd|zxc/i.test(password)) score -= 15; // Sequential patterns
    if (/\s/.test(password)) score -= 20;
    if (password.length < 8) score -= 30;
    
    // Common password penalty
    const commonPasswords = [
        'password', 'password123', '123456', '123456789', 'qwerty', 'abc123',
        'Password1', 'password1', 'admin', 'administrator', 'welcome', 'login'
    ];
    
    if (commonPasswords.some(common => password.toLowerCase() === common.toLowerCase())) {
        score -= 50;
    }
    
    return Math.max(0, Math.min(100, score));
}

// Update password strength indicator
function updatePasswordStrength(password, inputId) {
    const validation = validatePasswordStrength(password);
    const score = calculatePasswordScore(password);
    
    const strengthFill = document.querySelector(`#${inputId} + .password-strength-container .password-strength-fill`);
    const strengthText = document.querySelector(`#${inputId} + .password-strength-container .password-strength-text`);
    const requirementsList = document.querySelector(`#${inputId} + .password-strength-container .password-requirements`);
    
    if (!strengthFill || !strengthText) return;
    
    // Update strength bar
    strengthFill.style.width = `${score}%`;
    
    // Update colors and text based on score
    let strengthLevel, color;
    if (score < 30) {
        strengthLevel = 'Very Weak';
        color = '#dc3545';
    } else if (score < 50) {
        strengthLevel = 'Weak';
        color = '#fd7e14';
    } else if (score < 70) {
        strengthLevel = 'Fair';
        color = '#ffc107';
    } else if (score < 90) {
        strengthLevel = 'Good';
        color = '#20c997';
    } else {
        strengthLevel = 'Excellent';
        color = '#28a745';
    }
    
    strengthFill.style.backgroundColor = color;
    strengthText.innerHTML = `Password Strength: <strong style="color: ${color};">${strengthLevel}</strong> (${score}/100)`;
    
    // Update requirements checklist
    if (requirementsList) {
        const requirementItems = requirementsList.querySelectorAll('.requirement-item');
        requirementItems.forEach((item, index) => {
            const requirementKeys = Object.keys(validation.requirements);
            const requirementKey = requirementKeys[index];
            const isValid = validation.requirements[requirementKey];
            
            item.style.color = isValid ? '#28a745' : '#dc3545';
            item.style.fontWeight = isValid ? '500' : '400';
            const icon = item.querySelector('.requirement-icon');
            if (icon) {
                icon.textContent = isValid ? '✓' : '✗';
                icon.style.color = isValid ? '#28a745' : '#dc3545';
            }
        });
    }
}

// Add password strength indicator to input field
function addPasswordStrengthIndicator(passwordInput) {
    // Don't add if already exists
    if (passwordInput.nextElementSibling && passwordInput.nextElementSibling.classList.contains('password-strength-container')) {
        return;
    }
    
    // Create strength container
    const strengthContainer = document.createElement('div');
    strengthContainer.className = 'password-strength-container';
    
    // Create strength bar
    const strengthBar = document.createElement('div');
    strengthBar.className = 'password-strength-bar';
    
    const strengthFill = document.createElement('div');
    strengthFill.className = 'password-strength-fill';
    strengthBar.appendChild(strengthFill);
    
    // Create strength text
    const strengthText = document.createElement('div');
    strengthText.className = 'password-strength-text';
    strengthText.textContent = 'Password Strength: ';
    
    // Create requirements list
    const requirementsContainer = document.createElement('div');
    requirementsContainer.className = 'password-requirements';
    
    const requirementTitle = document.createElement('div');
    requirementTitle.className = 'requirement-title';
    requirementTitle.textContent = 'Password Requirements:';
    
    const requirements = [
        'At least 8 characters long',
        'At least one uppercase letter (A-Z)',
        'At least one lowercase letter (a-z)', 
        'At least one number (0-9)',
        'At least one special character (!@#$%...)',
        'No spaces allowed'
    ];
    
    requirementsContainer.appendChild(requirementTitle);
    requirements.forEach(req => {
        const reqItem = document.createElement('div');
        reqItem.className = 'requirement-item';
        reqItem.innerHTML = `<span class="requirement-icon">✗</span> ${req}`;
        requirementsContainer.appendChild(reqItem);
    });
    
    // Assemble the container
    strengthContainer.appendChild(strengthBar);
    strengthContainer.appendChild(strengthText);
    strengthContainer.appendChild(requirementsContainer);
    
    // Insert after the password input
    passwordInput.parentNode.insertBefore(strengthContainer, passwordInput.nextSibling);
    
    // Add event listener for real-time updates
    passwordInput.addEventListener('input', function() {
        updatePasswordStrength(passwordInput.value, passwordInput.id);
    });
    
    // Initial check
    if (passwordInput.value) {
        updatePasswordStrength(passwordInput.value, passwordInput.id);
    }
}

// Validate password match between two fields
function validatePasswordMatch(newPasswordId = 'newPassword', confirmPasswordId = 'confirmPassword') {
    const newPassword = document.getElementById(newPasswordId).value;
    const confirmPasswordElement = document.getElementById(confirmPasswordId);
    const confirmPassword = confirmPasswordElement.value;
    const confirmGroup = confirmPasswordElement.closest('.form-group');
    
    // Remove existing error/success classes and messages
    confirmGroup.classList.remove('error', 'success');
    confirmPasswordElement.classList.remove('password-match', 'password-mismatch');
    const existingMessage = confirmGroup.querySelector('.error-message, .success-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    if (confirmPassword && newPassword) {
        if (newPassword === confirmPassword) {
            confirmGroup.classList.add('success');
            confirmPasswordElement.classList.add('password-match');
            const successMsg = document.createElement('div');
            successMsg.className = 'success-message';
            successMsg.textContent = 'Passwords match';
            confirmGroup.appendChild(successMsg);
        } else {
            confirmGroup.classList.add('error');
            confirmPasswordElement.classList.add('password-mismatch');
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.textContent = 'Passwords do not match';
            confirmGroup.appendChild(errorMsg);
        }
    }
    
    // Update field states using the field state manager
    if (window.fieldStateManager) {
        window.fieldStateManager.updateFieldState(confirmPasswordElement);
        const newPasswordElement = document.getElementById(newPasswordId);
        if (newPasswordElement) {
            window.fieldStateManager.updateFieldState(newPasswordElement);
        }
    }
}

// Check if two passwords match
function passwordsMatch(password1, password2) {
    return password1 === password2;
}

// Simple password validation wrapper for consistency
function validatePassword(password) {
    return validatePasswordStrength(password);
}

// Make password utilities available globally
window.validatePasswordStrength = validatePasswordStrength;
window.calculatePasswordScore = calculatePasswordScore;
window.updatePasswordStrength = updatePasswordStrength;
window.addPasswordStrengthIndicator = addPasswordStrengthIndicator;
window.validatePasswordMatch = validatePasswordMatch;
window.passwordsMatch = passwordsMatch;
window.validatePassword = validatePassword;

// Create a passwordUtils object for more organized access
window.passwordUtils = {
    validatePasswordStrength,
    calculatePasswordScore,
    updatePasswordStrength,
    addPasswordStrengthIndicator,
    validatePasswordMatch,
    passwordsMatch,
    validatePassword
};
