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
    console.log('🔍 DateUtils: Validating date:', dateString);

    // Check format MM/DD/YYYY
    const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;

    if (!dateRegex.test(dateString)) {
        console.log('🔍 DateUtils: Date format invalid');
        return {
            valid: false,
            error: 'Please enter date in MM/DD/YYYY format',
        };
    }

    const [month, day, year] = dateString
        .split('/')
        .map((num) => parseInt(num, 10));

    console.log('🔍 DateUtils: Parsed date parts:', { month, day, year });

    // Create date object using setFullYear to handle years before 1900 properly
    const date = new Date();
    date.setFullYear(year, month - 1, day);
    date.setHours(0, 0, 0, 0); // Set to start of day

    // Check if date is valid (handles things like 02/30/2023)
    if (
        date.getMonth() !== month - 1 ||
        date.getDate() !== day ||
        date.getFullYear() !== year
    ) {
        console.log('🔍 DateUtils: Date is invalid (e.g., 02/30/2023)');
        return { valid: false, error: 'Please enter a valid date' };
    }

    console.log('🔍 DateUtils: Date is valid calendar date');

    // Check if date is not too far in the past (reasonable birth date) FIRST
    const minDate = new Date();
    minDate.setFullYear(1900, 0, 1);
    minDate.setHours(0, 0, 0, 0);

    if (date < minDate) {
        return { valid: false, error: 'Please enter a date after 12/31/1899' };
    }

    // Check if date is not in the future
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of today

    if (date > today) {
        return { valid: false, error: 'Date of birth cannot be in the future' };
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

        // Clear any custom validity state to reset browser validation
        e.target.setCustomValidity('');
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

            // Clear any custom validity state to reset browser validation
            e.target.setCustomValidity('');
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
    // Remove any existing error/success messages only (no visual styling)
    const formGroup = input.closest('.form-group');
    if (formGroup) {
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
    // For consistency with other fields, don't show visual error feedback
    // Just clear any existing messages and let form submission handle validation
    clearDateValidation(input);
}

// Show date validation success
function showDateValidationSuccess(input) {
    // Only clear validation messages without adding visual styling
    const formGroup = input.closest('.form-group');
    if (formGroup) {
        clearDateValidation(input);
        // No success styling for consistency with other fields
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
