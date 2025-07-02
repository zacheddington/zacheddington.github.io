// Date Utilities
// Handles date formatting, validation, and conversion

// Format date input as user types (MM/DD/YYYY)
function formatDateInput(input) {
    let value = input.value.replace(/\D/g, ''); // Remove non-digits

    if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2);
    }
    if (value.length >= 5) {
        value = value.substring(0, 5) + '/' + value.substring(5, 9);
    }

    input.value = value;
}

// Validate date format and values
function validateDateInput(dateString) {
    // Check format MM/DD/YYYY
    const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;

    if (!dateRegex.test(dateString)) {
        return {
            valid: false,
            error: 'Please enter date in MM/DD/YYYY format',
        };
    }

    const [month, day, year] = dateString
        .split('/')
        .map((num) => parseInt(num, 10));

    // Create date object
    const date = new Date(year, month - 1, day);

    // Check if date is valid (handles things like 02/30/2023)
    if (
        date.getMonth() !== month - 1 ||
        date.getDate() !== day ||
        date.getFullYear() !== year
    ) {
        return { valid: false, error: 'Please enter a valid date' };
    }

    // Check if date is not in the future
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of today

    if (date > today) {
        return { valid: false, error: 'Date of birth cannot be in the future' };
    }

    // Check if date is not too far in the past (reasonable birth date)
    const minDate = new Date(1900, 0, 1);
    if (date < minDate) {
        return { valid: false, error: 'Please enter a date after 1900' };
    }

    return { valid: true, date: date };
}

// Convert MM/DD/YYYY to YYYY-MM-DD for backend
function convertToISODate(dateString) {
    if (!dateString) return '';

    const validation = validateDateInput(dateString);
    if (!validation.valid) return '';

    const [month, day, year] = dateString.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// Convert YYYY-MM-DD to MM/DD/YYYY for display
function convertFromISODate(isoDateString) {
    if (!isoDateString) return '';

    try {
        // Handle both YYYY-MM-DD and YYYY-MM-DDTHH:mm:ss formats
        const datePart = isoDateString.split('T')[0];
        const [year, month, day] = datePart.split('-');

        // Remove leading zeros and format
        const displayMonth = parseInt(month, 10).toString().padStart(2, '0');
        const displayDay = parseInt(day, 10).toString().padStart(2, '0');

        return `${displayMonth}/${displayDay}/${year}`;
    } catch (error) {
        console.error('Error converting ISO date:', error);
        return '';
    }
}

// Setup date input formatting for a field
function setupDateInput(fieldId) {
    const input = document.getElementById(fieldId);
    if (!input) return;

    // Format as user types
    input.addEventListener('input', function (e) {
        formatDateInput(e.target);

        // Clear any previous validation styling
        clearDateValidation(e.target);
    });

    // Validate on blur
    input.addEventListener('blur', function (e) {
        const value = e.target.value.trim();
        if (value) {
            const validation = validateDateInput(value);
            if (!validation.valid) {
                showDateValidationError(e.target, validation.error);
            } else {
                showDateValidationSuccess(e.target);
            }
        }
    });

    // Handle paste events
    input.addEventListener('paste', function (e) {
        setTimeout(() => {
            formatDateInput(e.target);
            clearDateValidation(e.target);
        }, 0);
    });

    // Prevent invalid characters
    input.addEventListener('keypress', function (e) {
        // Allow backspace, delete, tab, escape, enter
        if (
            [8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
            // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
            (e.keyCode === 65 && e.ctrlKey) ||
            (e.keyCode === 67 && e.ctrlKey) ||
            (e.keyCode === 86 && e.ctrlKey) ||
            (e.keyCode === 88 && e.ctrlKey)
        ) {
            return;
        }

        // Ensure that it is a number and stop the keypress
        if (
            (e.shiftKey || e.keyCode < 48 || e.keyCode > 57) &&
            (e.keyCode < 96 || e.keyCode > 105)
        ) {
            e.preventDefault();
        }
    });
}

// Clear date validation styling
function clearDateValidation(input) {
    const formGroup = input.closest('.form-group');
    if (formGroup) {
        formGroup.classList.remove('error', 'success');

        // Remove any existing error/success messages
        const existingMessage = formGroup.querySelector(
            '.error-message, .success-message'
        );
        if (existingMessage) {
            existingMessage.remove();
        }
    }
}

// Show date validation error
function showDateValidationError(input, message) {
    const formGroup = input.closest('.form-group');
    if (formGroup) {
        clearDateValidation(input);

        formGroup.classList.add('error');

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        formGroup.appendChild(errorDiv);
    }
}

// Show date validation success
function showDateValidationSuccess(input) {
    const formGroup = input.closest('.form-group');
    if (formGroup) {
        clearDateValidation(input);
        formGroup.classList.add('success');
    }
}

// Make date utilities available globally
window.dateUtils = {
    formatDateInput,
    validateDateInput,
    convertToISODate,
    convertFromISODate,
    setupDateInput,
    clearDateValidation,
    showDateValidationError,
    showDateValidationSuccess,
};
