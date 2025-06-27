// Patients Page Module
// Contains all patient-related functionality including create/manage/navigation

// Global state for patient management
let allPatients = [];
let currentPatientSort = { column: null, direction: null };

// Utility function to format date without timezone issues
function formatDateForDisplay(dateString) {
    if (!dateString) return 'Not provided';

    try {
        // Split the date string to avoid timezone issues
        const dateParts = dateString.split('T')[0].split('-'); // Get YYYY-MM-DD part
        if (dateParts.length === 3) {
            const year = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
            const day = parseInt(dateParts[2]);

            // Create date with local timezone
            const date = new Date(year, month, day);
            return date.toLocaleDateString();
        }
        return 'Invalid date';
    } catch (error) {
        console.warn('Date formatting error');
        return 'Invalid date';
    }
}

// Check if current user can delete patients
function canDeletePatients() {
    try {
        const userStr = localStorage.getItem('user');
        if (!userStr) return false;

        const userData = JSON.parse(userStr);

        // Use the same logic as auth-utils.js isUserAdmin function
        if (userData.isAdmin === true) {
            return true;
        }

        if (userData.roles && Array.isArray(userData.roles)) {
            const hasAdminRole = userData.roles.some(
                (role) => role && role.toLowerCase().includes('administrator')
            );
            if (hasAdminRole) {
                return true;
            }
        }

        if (userData.username === 'admin') {
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error checking user permissions');
        return false;
    }
}

// Initialize patients page functionality
function initializePatientsPage() {
    // Determine which page we're on and initialize accordingly
    const currentPage = getCurrentPageType();

    switch (currentPage) {
        case 'create-patient':
            initializeCreatePatientPage();
            break;
        case 'manage-patients':
            initializeManagePatientsPage();
            break;
        case 'patients-index':
        default:
            initializePatientsIndexPage();
            break;
    }
}

// Determine current page type based on URL or page elements
function getCurrentPageType() {
    const path = window.location.pathname;
    if (path.includes('/patients/create-patient/')) {
        return 'create-patient';
    } else if (path.includes('/patients/manage-patients/')) {
        return 'manage-patients';
    } else if (path.includes('/patients/')) {
        return 'patients-index';
    }
    return 'patients-index';
}

// Initialize the patients index page (choice page)
function initializePatientsIndexPage() {
    // No specific initialization needed for choice page
}

// Initialize the create patient page
function initializeCreatePatientPage() {
    // Setup create patient form
    setupCreatePatientForm();
}

// Initialize the manage patients page
async function initializeManagePatientsPage() {
    // Check if required elements exist
    const patientsTableBody = document.getElementById('patientsTableBody');
    const patientsLoading = document.getElementById('patientsLoading');
    const patientsTable = document.getElementById('patientsTable');
    const managePatientsSection = document.getElementById(
        'managePatientsSection'
    );

    if (!patientsTableBody) {
        console.error('❌ patientsTableBody element not found!');
    }

    if (!patientsLoading) {
        console.error('❌ patientsLoading element not found!');
    }

    // Load patients and setup patient management
    try {
        await loadPatients();
    } catch (error) {
        console.error('Failed to load patients');
    }
    try {
        setupPatientFilter();
    } catch (error) {
        console.error('Failed to setup patient filter');
    }

    // Setup edit patient modal
    setupEditPatientModal();

    // Setup delete patient modal
    setupDeletePatientModal();

    // Initialize table formatting and resizing using unified utilities
    window.tableUtils.initializeTableFormatting({
        tableSelector: '#patientsTable',
        storageKey: 'patientsTableColumnWidths',
        getColumnType: window.tableUtils.getDefaultColumnType,
    });

    // Add event listener for window resize to adjust column widths
    window.addEventListener(
        'resize',
        debounce(function () {
            // Only auto-adjust if no saved preferences
            if (!localStorage.getItem('patientsTableColumnWidths')) {
                window.tableUtils.adjustTableColumnWidths('#patientsTable');
            } else {
                // For responsive tables, check if we've crossed a breakpoint
                const width = window.innerWidth;
                if (
                    !window.lastPatientWidth ||
                    (width < 480 && window.lastPatientWidth >= 480) ||
                    (width >= 480 &&
                        width < 768 &&
                        (window.lastPatientWidth < 480 ||
                            window.lastPatientWidth >= 768)) ||
                    (width >= 768 && window.lastPatientWidth < 768)
                ) {
                    // We've crossed a responsive breakpoint, adjust columns
                    window.tableUtils.adjustTableColumnWidths('.users-table');
                    // Re-add resize handles after adjustment
                    setTimeout(() => {
                        window.tableUtils.addTableColumnResizeHandles(
                            '.users-table',
                            'patientsTableColumnWidths'
                        );
                    }, 100);
                }
            }
            window.lastPatientWidth = window.innerWidth;
        }, 250)
    );
}

// Simple debounce function to limit how often a function is called
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Format phone number for display
function formatPhoneNumber(phone) {
    if (!phone) return '';

    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX for 10 digit numbers
    if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(
            6
        )}`;
    }

    // For other lengths, just return the original
    return phone;
}

// Set up navigation between patient sections
function setupPatientsNavigation() {
    // Main patient choice buttons
    const createPatientBtn = document.getElementById('createPatientBtn');
    const managePatientsBtn = document.getElementById('managePatientsBtn');

    // Back buttons
    const backToChoiceFromCreate = document.getElementById(
        'backToChoiceFromCreate'
    );
    const backToChoiceFromManage = document.getElementById(
        'backToChoiceFromManage'
    );

    // Section elements
    const patientChoice = document.getElementById('patientChoice');
    const createPatientSection = document.getElementById(
        'createPatientSection'
    );
    const managePatientsSection = document.getElementById(
        'managePatientsSection'
    );

    if (createPatientBtn) {
        createPatientBtn.addEventListener('click', function () {
            patientChoice.classList.add('hidden');
            createPatientSection.classList.remove('hidden');
            clearCreatePatientErrors();
        });
    }
    if (managePatientsBtn) {
        managePatientsBtn.addEventListener('click', function () {
            patientChoice.classList.add('hidden');
            managePatientsSection.classList.remove('hidden');
            loadPatients();
            setupPatientFilter();
        });
    }

    if (backToChoiceFromCreate) {
        backToChoiceFromCreate.addEventListener('click', function () {
            createPatientSection.classList.add('hidden');
            patientChoice.classList.remove('hidden');
            // Clear form when going back
            const form = document.getElementById('createPatientForm');
            if (form) form.reset();
            clearCreatePatientErrors();
        });
    }

    if (backToChoiceFromManage) {
        backToChoiceFromManage.addEventListener('click', function () {
            managePatientsSection.classList.add('hidden');
            patientChoice.classList.remove('hidden');
        });
    }
}

// Set up create patient form and validation
function setupCreatePatientForm() {
    const createPatientForm = document.getElementById('createPatientForm');

    if (!createPatientForm) {
        console.error('Create patient form not found!');
        return;
    }

    // Character limit validation for create patient form fields
    setupCreatePatientFieldValidation();

    // Handle form submission
    createPatientForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        await createPatient();
    });

    // Handle cancel button
    const cancelBtn = document.getElementById('cancelCreatePatient');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function () {
            // Clear form and go back to patient choice
            document.getElementById('createPatientForm').reset();
            clearCreatePatientErrors();
            document
                .getElementById('createPatientSection')
                .classList.add('hidden');
            document.getElementById('patientChoice').classList.remove('hidden');
        });
    }
}

// Set up field validation for patient creation form
function setupCreatePatientFieldValidation() {
    const createPatientFields = [
        { id: 'patientFirstName', maxLength: 50, label: 'First name' },
        { id: 'patientMiddleName', maxLength: 50, label: 'Middle name' },
        { id: 'patientLastName', maxLength: 50, label: 'Last name' },
        { id: 'patientAddress1', maxLength: 100, label: 'Street Address' },
        { id: 'patientAddress2', maxLength: 50, label: 'Unit/Apartment' },
        { id: 'patientCity', maxLength: 50, label: 'City' },
        { id: 'patientZip', maxLength: 10, label: 'ZIP Code' },
    ];

    createPatientFields.forEach((field) => {
        const input = document.getElementById(field.id);
        if (input) {
            // Character count prevention
            input.addEventListener('input', function (e) {
                if (e.target.value.length > field.maxLength) {
                    e.target.value = e.target.value.substring(
                        0,
                        field.maxLength
                    );
                    window.fieldValidation.showCharacterLimitModal(
                        field.label,
                        field.maxLength
                    );
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
                        window.fieldValidation.showCharacterLimitModal(
                            field.label,
                            field.maxLength
                        );
                    }
                }, 0);
            });
        }
    });

    // Set up date of birth field
    const dobInput = document.getElementById('patientDateOfBirth');
    if (dobInput) {
        // Set max date to today
        const today = new Date().toISOString().split('T')[0];
        dobInput.setAttribute('max', today);
    }

    // Set up phone number formatting
    setupPatientPhoneFormatting();

    // Set up ZIP code formatting
    setupZipCodeFormatting();
}

// Set up phone number formatting for patient phone field
function setupPatientPhoneFormatting() {
    const phoneInput = document.getElementById('patientPhone');

    if (!phoneInput) {
        console.error('Phone input not found!');
        return;
    }

    // Format phone number as user types
    phoneInput.addEventListener('input', function (e) {
        let value = e.target.value.replace(/\D/g, ''); // Remove all non-digits

        // Limit to 10 digits maximum
        if (value.length > 10) {
            value = value.slice(0, 10);
        }

        // Format as (XXX) XXX-XXXX
        let formatted = '';
        if (value.length >= 6) {
            formatted = `(${value.slice(0, 3)}) ${value.slice(
                3,
                6
            )}-${value.slice(6)}`;
        } else if (value.length >= 3) {
            formatted = `(${value.slice(0, 3)}) ${value.slice(3)}`;
        } else if (value.length > 0) {
            formatted = value;
        } else {
            formatted = '';
        }

        e.target.value = formatted;
    });

    // Handle paste events
    phoneInput.addEventListener('paste', function (e) {
        setTimeout(() => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 10) {
                value = value.slice(0, 10);
            }
            if (value.length >= 6) {
                e.target.value = `(${value.slice(0, 3)}) ${value.slice(
                    3,
                    6
                )}-${value.slice(6)}`;
            } else if (value.length >= 3) {
                e.target.value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
            } else {
                e.target.value = value;
            }
        }, 0);
    }); // Prevent non-numeric input on keydown (more reliable than keypress)
    phoneInput.addEventListener('keydown', function (e) {
        const allowedKeys = [
            'Backspace',
            'Delete',
            'Tab',
            'Escape',
            'Enter',
            'ArrowLeft',
            'ArrowRight',
            'ArrowUp',
            'ArrowDown',
            'Home',
            'End',
        ];

        // Allow control keys
        if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) {
            return;
        }

        // Only allow digits
        if (!/[0-9]/.test(e.key)) {
            e.preventDefault();
        }
    }); // Also prevent keypress for extra security
    phoneInput.addEventListener('keypress', function (e) {
        const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter'];
        if (allowedKeys.includes(e.key)) return;

        if (!/[0-9]/.test(e.key)) {
            e.preventDefault();
        }
    });
}

// Set up ZIP code formatting for patient ZIP field
function setupZipCodeFormatting() {
    const zipInput = document.getElementById('patientZip');

    if (!zipInput) {
        console.error('ZIP input not found!');
        return;
    }

    // Format ZIP code as user types
    zipInput.addEventListener('input', function (e) {
        let value = e.target.value.replace(/\D/g, ''); // Remove all non-digits

        // Limit to 9 digits maximum (for ZIP+4)
        if (value.length > 9) {
            value = value.slice(0, 9);
        }

        // Format as XXXXX-XXXX if more than 5 digits
        let formatted = '';
        if (value.length > 5) {
            formatted = `${value.slice(0, 5)}-${value.slice(5)}`;
        } else {
            formatted = value;
        }

        e.target.value = formatted;
    });

    // Handle paste events
    zipInput.addEventListener('paste', function (e) {
        setTimeout(() => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 9) {
                value = value.slice(0, 9);
            }
            if (value.length > 5) {
                e.target.value = `${value.slice(0, 5)}-${value.slice(5)}`;
            } else {
                e.target.value = value;
            }
        }, 0);
    }); // Prevent non-numeric input
    zipInput.addEventListener('keydown', function (e) {
        const allowedKeys = [
            'Backspace',
            'Delete',
            'Tab',
            'Escape',
            'Enter',
            'ArrowLeft',
            'ArrowRight',
            'ArrowUp',
            'ArrowDown',
            'Home',
            'End',
        ];

        // Allow control keys
        if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) {
            return;
        }

        // Only allow digits
        if (!/[0-9]/.test(e.key)) {
            e.preventDefault();
        }
    });
}

// Set up structured address autocomplete for patient address fields
// Create new patient
async function createPatient() {
    const submitBtn = document.getElementById('createPatientSubmitBtn');
    const originalText = submitBtn.textContent;
    let response = null;

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Patient...';

        // Pre-flight connectivity check
        const connectivity = await window.apiClient.checkConnectivity();
        if (!connectivity.connected) {
            throw new Error(`Connection failed: ${connectivity.error}`);
        } // Get form data
        const formData = {
            firstName: document.getElementById('patientFirstName').value.trim(),
            middleName: document
                .getElementById('patientMiddleName')
                .value.trim(),
            lastName: document.getElementById('patientLastName').value.trim(),
            dateOfBirth: document.getElementById('patientDateOfBirth').value,
            address1: document.getElementById('patientAddress1').value.trim(),
            address2: document.getElementById('patientAddress2').value.trim(),
            city: document.getElementById('patientCity').value.trim(),
            state: document.getElementById('patientState').value,
            zip: document.getElementById('patientZip').value.trim(),
            phone: document.getElementById('patientPhone').value.trim(),
            acceptsTexts: document.getElementById('acceptsTexts').value,
        }; // Validate required fields
        if (
            !formData.firstName ||
            !formData.lastName ||
            !formData.dateOfBirth ||
            !formData.address1 ||
            !formData.city ||
            !formData.state ||
            !formData.zip ||
            !formData.phone ||
            !formData.acceptsTexts
        ) {
            throw new Error('All required fields must be filled out.');
        } // Validate character limits
        if (formData.firstName.length > 50) {
            throw new Error('First name must be 50 characters or less.');
        }
        if (formData.middleName && formData.middleName.length > 50) {
            throw new Error('Middle name must be 50 characters or less.');
        }
        if (formData.lastName.length > 50) {
            throw new Error('Last name must be 50 characters or less.');
        }
        if (formData.address1.length > 100) {
            throw new Error('Street address must be 100 characters or less.');
        }
        if (formData.address2 && formData.address2.length > 50) {
            throw new Error('Unit/Apartment must be 50 characters or less.');
        }
        if (formData.city.length > 50) {
            throw new Error('City must be 50 characters or less.');
        }

        // Validate date of birth
        const today = new Date();
        const birthDate = new Date(formData.dateOfBirth);

        if (isNaN(birthDate.getTime())) {
            throw new Error('Please enter a valid date of birth.');
        }

        if (birthDate >= today) {
            throw new Error('Date of birth must be in the past.');
        }

        // Check if age is reasonable (not more than 150 years old)
        const age = today.getFullYear() - birthDate.getFullYear();
        if (age > 150) {
            throw new Error('Please enter a valid date of birth.');
        }

        // Enhanced address validation using shared validation
        if (
            window.addressValidation &&
            window.addressValidation.validateAddress
        ) {
            const fullAddress = `${formData.address1}${
                formData.address2 ? ' ' + formData.address2 : ''
            }, ${formData.city}, ${formData.state} ${formData.zip}`;
            const addressValidation =
                await window.addressValidation.validateAddress(fullAddress);
            if (!addressValidation.isValid) {
                if (addressValidation.warning) {
                    // Show warning but allow submission
                    console.warn(
                        'Address validation warning:',
                        addressValidation.error
                    );
                } else {
                    throw new Error(addressValidation.error);
                }
            }
        }

        // Validate phone number using shared validation function
        if (!window.fieldValidation.validatePhoneNumber(formData.phone)) {
            throw new Error('Please enter a valid 10-digit phone number.');
        }

        // Clean the phone number for submission (keep only digits)
        formData.phone = formData.phone.replace(/\D/g, '');

        const token = localStorage.getItem('token');
        const API_URL = window.apiClient.getAPIUrl();

        response = await fetch(`${API_URL}/api/patients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (response.ok) {
            // Clear the form
            document.getElementById('createPatientForm').reset();
            clearCreatePatientErrors(); // Show success modal with simple personalized message
            const patientName = formData.middleName
                ? `${formData.firstName} ${formData.middleName} ${formData.lastName}`
                : `${formData.firstName} ${formData.lastName}`;
            const successMessage = `Success, new patient ${patientName} created!`;
            window.modalManager.showModal('success', successMessage, false, {
                redirect: true,
            }); // Redirect back to patient choice page after brief delay
            setTimeout(() => {
                window.modalManager.closeModal();
                // Navigate back to main patient page using absolute URL
                window.location.href = '/patients/';
            }, 2500);
        } else {
            // Check for authentication/authorization errors first
            if (response.status === 401 || response.status === 403) {
                window.handleAuthError(response, 'creating patient');
                return;
            }
            throw new Error(result.error || 'Failed to create patient');
        }
    } catch (error) {
        console.error('Patient creation failed');

        // Use enhanced error categorization
        const errorInfo = window.apiClient.categorizeError(error, response);

        // Show appropriate feedback based on error type
        if (errorInfo.modal) {
            window.modalManager.showModal('error', errorInfo.message);
        } else {
            showCreatePatientError(errorInfo.message);
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Show error message for patient creation
function showCreatePatientError(message) {
    const createPatientSection = document.getElementById(
        'createPatientSection'
    );
    window.fieldValidation.showSectionMessage(
        createPatientSection,
        message,
        'error'
    );
}

// Clear patient creation errors
function clearCreatePatientErrors() {
    const createPatientSection = document.getElementById(
        'createPatientSection'
    );

    // Clear section-level error messages
    const errorMessage = createPatientSection.querySelector(
        '.section-message.error'
    );
    if (errorMessage) {
        errorMessage.remove();
    }

    // Clear field-level errors
    const errorGroups =
        createPatientSection.querySelectorAll('.form-group.error');
    errorGroups.forEach((group) => {
        group.classList.remove('error');
        const errorMsg = group.querySelector('.error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    });

    // Clear success states
    const successGroups = createPatientSection.querySelectorAll(
        '.form-group.success'
    );
    successGroups.forEach((group) => {
        group.classList.remove('success');
        const successMsg = group.querySelector('.success-message');
        if (successMsg) {
            successMsg.remove();
        }
    });

    // Update field states using the field state manager
    if (window.fieldStateManager) {
        const allFields = createPatientSection.querySelectorAll(
            'input[type="text"], input[type="tel"], select'
        );
        allFields.forEach((field) => {
            window.fieldStateManager.updateFieldState(field);
        });
    }
}

// Load all patients from the server
async function loadPatients() {
    try {
        // Check if apiClient is available
        if (!window.apiClient) {
            console.error('❌ window.apiClient is not available');
            throw new Error('API client not loaded');
        }

        const API_URL = window.apiClient.getAPIUrl();
        const token = localStorage.getItem('token');

        const patientsLoading = document.getElementById('patientsLoading');
        const patientsTableBody = document.getElementById('patientsTableBody');

        if (patientsLoading) {
            patientsLoading.style.display = 'block';
        }
        if (patientsTableBody) {
            patientsTableBody.innerHTML = '';
        }

        const response = await fetch(`${API_URL}/api/patients`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (response.ok) {
            const result = await response.json();
            allPatients = result.data; // Extract data from response object

            setupPatientTableSorting();
            const sortedPatients = getSortedPatients();

            // Force clear column widths to fix display issues
            localStorage.removeItem('patientTableColumnWidths');

            // Always use default display for now
            displayPatients(sortedPatients);
        } else {
            // Use global auth error handler for consistent experience
            if (response.status === 401 || response.status === 403) {
                window.handleAuthError(response, 'loading patients');
                return;
            }
            throw new Error('Failed to load patients');
        }
    } catch (error) {
        console.error('Failed to load patients');
        const patientsTableBody = document.getElementById('patientsTableBody');
        if (patientsTableBody) {
            patientsTableBody.innerHTML =
                '<tr><td colspan="7" style="text-align: center; color: #dc3545;">Error loading patients. Please try again.</td></tr>';
        }
    } finally {
        const patientsLoading = document.getElementById('patientsLoading');
        if (patientsLoading) {
            patientsLoading.style.display = 'none';
        } else {
            console.error('❌ Loading element not found!');
        }
    }
}

// Set up patient table sorting functionality using shared utility
function setupPatientTableSorting() {
    // Define sortable columns - Updated to include Last Updated column
    const sortableColumns = [
        { index: 0, key: 'fullName', label: 'Name' },
        { index: 1, key: 'dateOfBirth', label: 'Date of Birth' },
        { index: 2, key: 'phone', label: 'Phone' },
        { index: 3, key: 'acceptsTexts', label: 'Accepts Texts' },
        { index: 4, key: 'address', label: 'Address' },
        { index: 5, key: 'updated', label: 'Last Updated' },
        { index: 6, key: 'created', label: 'Created' },
    ];

    // Use shared table sorting utility
    if (window.tableUtils) {
        window.tableUtils.setupTableSorting({
            tableId: 'patientsTable',
            sortableColumns: sortableColumns,
            currentSort: currentPatientSort,
            handleSort: handlePatientSort,
            updateSortIndicators: updatePatientSortIndicators,
        });
    }
}

// Handle patient table sorting using shared utility
function handlePatientSort(columnKey) {
    // Use shared table sorting utility for logic
    if (window.tableUtils) {
        window.tableUtils.handleTableSort(
            columnKey,
            currentPatientSort,
            updatePatientSortIndicators,
            refreshPatientsDisplay
        );
    } else {
        // Fallback to original logic
        handlePatientSortFallback(columnKey);
    }
}

// Fallback sort handler for when shared utility isn't available
function handlePatientSortFallback(columnKey) {
    // Determine new sort direction
    if (currentPatientSort.column === columnKey) {
        if (currentPatientSort.direction === null) {
            currentPatientSort.direction = 'asc';
        } else if (currentPatientSort.direction === 'asc') {
            currentPatientSort.direction = 'desc';
        } else {
            currentPatientSort.direction = null;
        }
    } else {
        currentPatientSort.column = columnKey;
        currentPatientSort.direction = 'asc';
    }

    // Update sort indicators
    updatePatientSortIndicators();

    // Refresh display
    refreshPatientsDisplay();
}

// Refresh patients display while preserving column widths
function refreshPatientsDisplay() {
    // Capture current column widths before making any changes
    const table = document.querySelector('#patientsTable');
    let columnWidths = [];

    if (table) {
        // Store current column widths
        const headers = Array.from(table.querySelectorAll('th'));
        columnWidths = headers.map((header) => header.style.width);
    }

    // Sort and display patients
    const sortedPatients = getSortedPatients();

    // Apply display patients without resetting column widths
    displayPatientsPreserveWidths(sortedPatients, columnWidths);
}

// Update visual sort indicators using shared utility with fallback
function updatePatientSortIndicators() {
    if (window.tableUtils) {
        window.tableUtils.updateTableSortIndicators(
            'patientsTable',
            currentPatientSort
        );
    } else {
        // Fallback to original logic
        const indicators = document.querySelectorAll('.sort-indicator');

        indicators.forEach((indicator) => {
            const column = indicator.dataset.column;
            if (column === currentPatientSort.column) {
                if (currentPatientSort.direction === 'asc') {
                    indicator.textContent = ' ↑';
                } else if (currentPatientSort.direction === 'desc') {
                    indicator.textContent = ' ↓';
                } else {
                    indicator.textContent = '';
                }
            } else {
                indicator.textContent = '';
            }
        });
    }
}

// Get sorted patient list using shared utility with fallback
function getSortedPatients() {
    if (window.tableUtils) {
        return window.tableUtils.sortTableData(
            allPatients,
            currentPatientSort,
            getPatientValueForSort
        );
    } else {
        // Fallback to original logic
        return getSortedPatientsFallback();
    }
}

// Extract sortable value from patient object for shared utility
function getPatientValueForSort(patient, columnKey) {
    switch (columnKey) {
        case 'fullName':
            return `${patient.first_name} ${patient.last_name}`.toLowerCase();
        case 'dateOfBirth':
            return patient.date_of_birth
                ? new Date(patient.date_of_birth)
                : new Date(0);
        case 'address':
            return patient.address?.toLowerCase() || '';
        case 'phone':
            return patient.phone || '';
        case 'acceptsTexts':
            return patient.accepts_texts ? 'yes' : 'no';
        case 'updated':
            return patient.date_updated
                ? new Date(patient.date_updated)
                : new Date(0);
        case 'created':
            return patient.date_created
                ? new Date(patient.date_created)
                : new Date(0);
        default:
            return '';
    }
}

// Fallback sort function for when shared utility isn't available
function getSortedPatientsFallback() {
    if (!currentPatientSort.column || !currentPatientSort.direction) {
        return allPatients;
    }

    return [...allPatients].sort((a, b) => {
        let aValue, bValue;
        switch (currentPatientSort.column) {
            case 'fullName':
                aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
                bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
                break;
            case 'dateOfBirth':
                aValue = a.date_of_birth
                    ? new Date(a.date_of_birth)
                    : new Date(0);
                bValue = b.date_of_birth
                    ? new Date(b.date_of_birth)
                    : new Date(0);
                break;
            case 'address':
                aValue = a.address?.toLowerCase() || '';
                bValue = b.address?.toLowerCase() || '';
                break;
            case 'phone':
                aValue = a.phone || '';
                bValue = b.phone || '';
                break;
            case 'acceptsTexts':
                aValue = a.accepts_texts ? 'yes' : 'no';
                bValue = b.accepts_texts ? 'yes' : 'no';
                break;
            case 'updated':
                aValue = a.date_updated
                    ? new Date(a.date_updated)
                    : new Date(0);
                bValue = b.date_updated
                    ? new Date(b.date_updated)
                    : new Date(0);
                break;
            case 'created':
                aValue = a.date_created
                    ? new Date(a.date_created)
                    : new Date(0);
                bValue = b.date_created
                    ? new Date(b.date_created)
                    : new Date(0);
                break;
            default:
                return 0;
        }

        if (aValue < bValue)
            return currentPatientSort.direction === 'asc' ? -1 : 1;
        if (aValue > bValue)
            return currentPatientSort.direction === 'asc' ? 1 : -1;
        return 0;
    });
}

// Display patients in the table
function displayPatients(patients) {
    console.log('🔍 displayPatients called with:', patients);

    const patientsTableBody = document.getElementById('patientsTableBody');
    const noPatientsFound = document.getElementById('noPatientsFound');
    const tableContainer = document.querySelector('.table-responsive');

    if (!patientsTableBody) {
        console.error('❌ patientsTableBody not found in displayPatients');
        return;
    }

    console.log('✅ Found patientsTableBody element:', patientsTableBody);

    if (patients.length === 0) {
        console.log('⚠️ No patients to display');
        patientsTableBody.innerHTML = '';
        if (noPatientsFound) noPatientsFound.classList.remove('hidden');
        return;
    }

    console.log('📊 Creating patient rows for', patients.length, 'patients');

    if (noPatientsFound) noPatientsFound.classList.add('hidden');

    // Reset scroll position when displaying new data
    if (tableContainer) {
        tableContainer.scrollLeft = 0;
    } // Make sure tooltips are added to column headers
    // (Tooltips are now handled by the unified table utilities)
    // Update the table body with new data
    const htmlRows = patients
        .map((patient, index) => {
            const fullName = patient.middle_name
                ? `${patient.first_name} ${patient.middle_name} ${patient.last_name}`
                : `${patient.first_name} ${patient.last_name}`;

            const acceptsTexts = patient.accepts_texts ? 'Yes' : 'No';
            const acceptsTextsClass = patient.accepts_texts ? 'yes' : 'no'; // Format phone number
            const formattedPhone = patient.phone
                ? formatPhoneNumber(patient.phone)
                : '';

            // Format date fields
            const createdDate = patient.date_created
                ? new Date(patient.date_created).toLocaleDateString()
                : 'No date';
            const updatedDate = patient.date_updated
                ? new Date(patient.date_updated).toLocaleDateString()
                : 'No date';

            // Format date of birth without timezone issues
            const dateOfBirth = formatDateForDisplay(patient.date_of_birth);

            // Check if user can delete patients
            const canDelete = canDeletePatients();
            const canEdit = canDeletePatients(); // Use same admin check for editing

            const editButton = canEdit
                ? `<button class="btn-icon btn-edit" onclick="editPatient(${patient.patient_key})" title="Edit Patient">
                    ✏️
                </button>`
                : '';

            const deleteButton = canDelete
                ? `<button class="btn-icon btn-delete" onclick="deletePatient(${
                      patient.patient_key
                  }, '${fullName.replace(
                      /'/g,
                      "\\'"
                  )}' )" title="Delete Patient">
                    🗑️
                </button>`
                : '';
            const rowHtml = `
            <tr data-patient-id="${patient.patient_key}">
                <td class="patient-name" title="${fullName}">
                    <div class="patient-full-name">${fullName}</div>
                </td>
                <td class="patient-dob" title="${dateOfBirth}">${dateOfBirth}</td>
                <td class="patient-phone" title="${formattedPhone}">${formattedPhone}</td>
                <td>
                    <span class="accepts-texts ${acceptsTextsClass}" title="${acceptsTexts}">
                        ${acceptsTexts}
                    </span>
                </td>
                <td class="patient-address" title="${patient.address || ''}">${
                patient.address || ''
            }</td>
                <td class="patient-updated" title="${updatedDate}">${updatedDate}</td>
                <td class="patient-created" title="${createdDate}">${createdDate}</td>
                <td>
                    <div class="patient-actions">
                        ${editButton}
                        ${deleteButton}
                    </div>
                </td>
            </tr>
        `;

            return rowHtml;
        })
        .join('');
    console.log('🔧 Generated HTML length:', htmlRows.length);
    console.log(
        '🔧 Sample HTML (first 200 chars):',
        htmlRows.substring(0, 200)
    );

    patientsTableBody.innerHTML = htmlRows;
    console.log(
        '✅ Set patientsTableBody.innerHTML, tbody now contains:',
        patientsTableBody.children.length,
        'rows'
    );
    
    // Manual test - add a simple row to verify DOM manipulation works
    console.log('🧪 Manual test: Adding a test row to patients table');
    const testRow = document.createElement('tr');
    testRow.innerHTML = '<td colspan="8" style="background: yellow; color: black; font-weight: bold;">TEST ROW - PATIENTS TABLE RENDERING WORKS</td>';
    patientsTableBody.appendChild(testRow);
    console.log('🧪 Test row added, patientsTableBody now contains:', patientsTableBody.children.length, 'rows'); // FORCE RESET TABLE LAYOUT TO FIX COLUMN ALIGNMENT ISSUE
    const table = document.getElementById('patientsTable');
    if (table) {
        // Set table layout to fixed for column resizing to work
        table.style.tableLayout = 'fixed';
        table.style.width = '100%';

        // Force recalculation by temporarily changing display
        table.style.display = 'none';
        table.offsetHeight; // Force reflow
        table.style.display = 'table';
    } // Add resize handles after rendering table content
    setTimeout(() => {
        window.tableUtils.addTableColumnResizeHandles(
            '#patientsTable',
            'patientsTableColumnWidths'
        );
    }, 100);
}

// Display patients in the table while preserving column widths
function displayPatientsPreserveWidths(patients, columnWidths = []) {
    const patientsTableBody = document.getElementById('patientsTableBody');
    const noPatientsFound = document.getElementById('noPatientsFound');
    const tableContainer = document.querySelector('.table-responsive');
    const table = document.querySelector('#patientsTable');

    if (!patientsTableBody || !table) {
        console.error('❌ Required DOM elements missing for patient display');
        return;
    }

    // Check for empty results
    if (patients.length === 0) {
        patientsTableBody.innerHTML = '';
        if (noPatientsFound) noPatientsFound.classList.remove('hidden');
        return;
    }
    if (noPatientsFound) noPatientsFound.classList.add('hidden');

    // Reset scroll position when displaying new data
    if (tableContainer) {
        tableContainer.scrollLeft = 0;
    }

    // Set the table to auto layout to allow proper expansion
    table.style.tableLayout = 'auto';
    table.style.minWidth = 'max-content'; // Allow table to expand as needed

    // Update the table body with new data
    const patientRows = patients
        .map((patient, index) => {
            const fullName = patient.middle_name
                ? `${patient.first_name} ${patient.middle_name} ${patient.last_name}`
                : `${patient.first_name} ${patient.last_name}`;

            const acceptsTexts = patient.accepts_texts ? 'Yes' : 'No';
            const acceptsTextsClass = patient.accepts_texts ? 'yes' : 'no'; // Format phone number
            const formattedPhone = patient.phone
                ? formatPhoneNumber(patient.phone)
                : '';

            // Format date fields
            const createdDate = patient.date_created
                ? new Date(patient.date_created).toLocaleDateString()
                : 'No date';
            const updatedDate = patient.date_updated
                ? new Date(patient.date_updated).toLocaleDateString()
                : 'No date';

            // Format date of birth without timezone issues
            const dateOfBirth = formatDateForDisplay(patient.date_of_birth);

            // Check if user can delete patients
            const canDelete = canDeletePatients();
            const canEdit = canDeletePatients(); // Use same admin check for editing

            const editButton = canEdit
                ? `<button class="btn-icon btn-edit" onclick="editPatient(${patient.patient_key})" title="Edit Patient">
                    ✏️
                </button>`
                : '';

            const deleteButton = canDelete
                ? `<button class="btn-icon btn-delete" onclick="deletePatient(${
                      patient.patient_key
                  }, '${fullName.replace(
                      /'/g,
                      "\\'"
                  )}' )" title="Delete Patient">
                    🗑️
                </button>`
                : '';
            return `
            <tr data-patient-id="${patient.patient_key}">
                <td class="patient-name" title="${fullName}">
                    <div class="patient-full-name">${fullName}</div>
                </td>
                <td class="patient-dob" title="${dateOfBirth}">${dateOfBirth}</td>
                <td class="patient-phone" title="${formattedPhone}">${formattedPhone}</td>
                <td>
                    <span class="accepts-texts ${acceptsTextsClass}" title="${acceptsTexts}">
                        ${acceptsTexts}
                    </span>
                </td>
                <td class="patient-address" title="${patient.address || ''}">${
                patient.address || ''
            }</td>
                <td class="patient-updated" title="${updatedDate}">${updatedDate}</td>
                <td class="patient-created" title="${createdDate}">${createdDate}</td>
                <td>
                    <div class="patient-actions">
                        ${editButton}
                        ${deleteButton}
                    </div>
                </td>
            </tr>
        `;
        })
        .join('');

    patientsTableBody.innerHTML = patientRows; // FORCE RESET TABLE LAYOUT TO FIX COLUMN ALIGNMENT ISSUE (same as displayPatients)
    const patientTable = document.querySelector('#patientsTable');
    if (patientTable) {
        patientTable.style.tableLayout = 'auto';
        patientTable.style.width = '100%'; // Force recalculation by temporarily changing display        patientTable.style.display = 'none';
        patientTable.offsetHeight; // Force reflow
        patientTable.style.display = 'table';
    }

    // Reapply column widths if provided
    if (columnWidths.length > 0) {
        const headers = Array.from(table.querySelectorAll('th'));
        headers.forEach((header, index) => {
            if (columnWidths[index] && columnWidths[index] !== '') {
                header.style.width = columnWidths[index];
            }
        });
    }

    // Add column resize handles
    window.tableUtils.addTableColumnResizeHandles(
        '.users-table',
        'patientsTableColumnWidths'
    );
}

// Function to add tooltips to column headers to indicate they can be resized
function addColumnResizeTooltips() {
    const table = document.querySelector('#patientsTable');
    if (!table) return;

    const headers = Array.from(table.querySelectorAll('th'));

    // Add tooltip to each header except the last one (actions column)
    headers.forEach((header, index) => {
        if (index < headers.length - 1) {
            // Skip last column (actions)
            header.title =
                'Drag edge to resize column | Double-click to auto-size';
        }
    });
}

// Filter patients based on search input
function filterPatients() {
    // Capture current column widths before making any changes
    const table = document.querySelector('#patientsTable');
    let columnWidths = [];

    if (table) {
        // Store current column widths
        const headers = Array.from(table.querySelectorAll('th'));
        columnWidths = headers.map((header) => header.style.width);
    }

    const filterValue = document
        .getElementById('patientFilter')
        .value.toLowerCase();

    if (!filterValue.trim()) {
        const sortedPatients = getSortedPatients();
        displayPatientsPreserveWidths(sortedPatients, columnWidths);
        return;
    }
    const filteredPatients = allPatients.filter((patient) => {
        // Build full name with null/undefined safety
        const firstName = patient.first_name || '';
        const middleName = patient.middle_name || '';
        const lastName = patient.last_name || '';

        const fullName = middleName
            ? `${firstName} ${middleName} ${lastName}`
            : `${firstName} ${lastName}`;

        return (
            fullName.toLowerCase().includes(filterValue) ||
            (patient.phone && patient.phone.includes(filterValue)) ||
            (patient.address &&
                patient.address.toLowerCase().includes(filterValue))
        );
    });

    // Display filtered patients while preserving column widths
    displayPatientsPreserveWidths(filteredPatients, columnWidths);
}

// Set up patient filter functionality
function setupPatientFilter() {
    const patientFilter = document.getElementById('patientFilter');
    if (patientFilter) {
        patientFilter.addEventListener('input', filterPatients);
    }
}

// Edit patient functionality
async function editPatient(patientId) {
    // Check if user has permission to edit patients
    if (!canDeletePatients()) {
        alert('You do not have permission to edit patients.');
        return;
    }

    try {
        // Fetch patient data using standard fetch API
        const API_URL = window.apiClient.getAPIUrl();
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_URL}/api/patients/${patientId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch patient data: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'Failed to fetch patient data');
        }

        const patient = result.data;

        // Fill the form with patient data
        document.getElementById('editPatientFirstName').value =
            patient.first_name || '';
        document.getElementById('editPatientMiddleName').value =
            patient.middle_name || '';
        document.getElementById('editPatientLastName').value =
            patient.last_name || ''; // Format date properly for input field
        let dateValue = '';
        if (patient.date_of_birth) {
            try {
                // Handle different date formats that might come from backend
                let dateStr = patient.date_of_birth;

                // If it contains 'T', split on that first
                if (dateStr.includes('T')) {
                    dateStr = dateStr.split('T')[0];
                }

                // Ensure the date format is valid YYYY-MM-DD
                const dateParts = dateStr.split('-');
                if (dateParts.length === 3) {
                    // Ensure year is only 4 digits
                    const year = dateParts[0].substring(0, 4);
                    const month = dateParts[1].padStart(2, '0');
                    const day = dateParts[2].padStart(2, '0');
                    dateValue = `${year}-${month}-${day}`;
                }
            } catch (error) {
                console.warn(
                    'Invalid date format for patient:',
                    patient.date_of_birth,
                    error
                );
                dateValue = '';
            }
        }
        document.getElementById('editPatientDateOfBirth').value = dateValue;
        document.getElementById('editPatientPhone').value = patient.phone || '';

        // Format the phone number after setting it
        const phoneInput = document.getElementById('editPatientPhone');
        if (phoneInput.value) {
            // Format the phone number display
            phoneInput.value = formatPhoneNumber(phoneInput.value);
        }
        document.getElementById('editAcceptsTexts').value =
            patient.accepts_texts ? 'yes' : 'no';
        document.getElementById('editPatientAddress1').value =
            patient.street_1 || '';
        document.getElementById('editPatientAddress2').value =
            patient.street_2 || '';
        document.getElementById('editPatientCity').value = patient.city || '';
        document.getElementById('editPatientState').value = patient.state || '';
        document.getElementById('editPatientZip').value = patient.zip || ''; // Store patient ID for form submission
        document
            .getElementById('editPatientForm')
            .setAttribute('data-patient-id', patientId); // Show the modal first for better UX
        const modal = document.getElementById('editPatientModal');
        modal.style.display = 'block';

        // Initialize structured address and field validation asynchronously
        setTimeout(() => {
            // Initialize structured address for the edit form
            if (window.StructuredAddress) {
                window.StructuredAddress.initialize('edit');
            }

            // Apply field validation
            if (window.FieldValidation) {
                window.FieldValidation.applyPhoneFormatting('editPatientPhone');
                window.FieldValidation.applyZipValidation('editPatientZip');
            }
        }, 0);
    } catch (error) {
        console.error('Failed to fetch patient data');
        window.modalManager.showModal(
            'error',
            'Failed to load patient data. Please try again.'
        );
    }
}

// Delete patient functionality
async function deletePatient(patientId, patientName) {
    try {
        // Show styled confirmation modal instead of browser confirm
        const modal = document.getElementById('deletePatientModal');
        const patientNameSpan = document.getElementById('deletePatientName');
        const confirmBtn = document.getElementById('confirmDeleteBtn');

        if (!modal || !patientNameSpan || !confirmBtn) {
            console.error('Delete modal elements not found');
            return;
        }

        // Set patient name in modal
        patientNameSpan.textContent = patientName || 'this patient';

        // Show the modal
        modal.style.display = 'block'; // Set up the confirm button click handler
        confirmBtn.onclick = async () => {
            try {
                // Close modal and show loading
                modal.style.display = 'none';

                // Make DELETE request to API using fetch
                const API_URL = window.getAPIUrl
                    ? window.getAPIUrl()
                    : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
                const token = localStorage.getItem('token');

                const response = await fetch(
                    `${API_URL}/api/patients/${patientId}`,
                    {
                        method: 'DELETE',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );
                if (!response.ok) {
                    if (response.status === 403) {
                        throw new Error(
                            'You do not have permission to delete patients. Admin privileges required.'
                        );
                    } else if (response.status === 401) {
                        throw new Error(
                            'Authentication required. Please log in again.'
                        );
                    } else {
                        throw new Error(
                            `HTTP error! status: ${response.status}`
                        );
                    }
                }

                const data = await response.json();
                if (!data.success) {
                    throw new Error(data.message || 'Failed to delete patient');
                }

                // Show success message
                if (window.modalManager && window.modalManager.showModal) {
                    window.modalManager.showModal(
                        'success',
                        'Patient deleted successfully.'
                    );
                } // Reload the patients list to reflect the change
                await loadPatients();
            } catch (error) {
                console.error('Patient deletion failed');

                if (window.modalManager && window.modalManager.showModal) {
                    window.modalManager.showModal(
                        'error',
                        'Failed to delete patient. Please try again.'
                    );
                }
            }
        };
    } catch (error) {
        console.error('Failed to setup delete confirmation');
    }
}

// Close delete patient modal
function closeDeletePatientModal() {
    const modal = document.getElementById('deletePatientModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Make closeDeletePatientModal globally available
window.closeDeletePatientModal = closeDeletePatientModal;

// Close edit patient modal
function closeEditPatientModal() {
    const modal = document.getElementById('editPatientModal');
    if (modal) {
        modal.style.display = 'none';

        // Clear form data
        const form = document.getElementById('editPatientForm');
        if (form) {
            form.reset();
            form.removeAttribute('data-patient-id');
        }
    } else {
        console.error('❌ Modal not found when trying to close');
    }
}

// Handle edit patient form submission
async function handleEditPatientSubmit(event) {
    event.preventDefault();

    // Check if user has permission to edit patients
    if (!canDeletePatients()) {
        window.modalManager.showModal(
            'error',
            'You do not have permission to edit patients.'
        );
        return;
    }

    const form = event.target;
    const patientId = form.getAttribute('data-patient-id');

    if (!patientId) {
        window.modalManager.showModal(
            'error',
            'Patient ID not found. Please try again.'
        );
        return;
    }

    // Get form data
    const formData = new FormData(form);
    const patientData = {
        firstName: formData.get('firstName'),
        middleName: formData.get('middleName') || '',
        lastName: formData.get('lastName'),
        dateOfBirth: formData.get('dateOfBirth'),
        phone: formData.get('phone'),
        acceptsTexts: formData.get('acceptsTexts'),
        address1: formData.get('address1'),
        address2: formData.get('address2') || '',
        city: formData.get('city'),
        state: formData.get('state'),
        zip: formData.get('zip'),
    };

    // Get API URL
    const API_URL = window.apiClient.getAPIUrl();
    const token = localStorage.getItem('token');

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');

    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');
    submitBtn.disabled = true;
    try {
        const response = await fetch(`${API_URL}/api/patients/${patientId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(patientData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `HTTP error! status: ${response.status}, body: ${errorText}`
            );
        }

        const result = await response.json();

        if (result.success) {
            window.modalManager.showModal(
                'success',
                'Patient updated successfully'
            );

            closeEditPatientModal();

            // Refresh the patients list
            loadPatients();
        } else {
            throw new Error(result.message || 'Failed to update patient');
        }
    } catch (error) {
        console.error('Patient update failed');
        window.modalManager.showModal(
            'error',
            'Failed to update patient. Please try again.'
        );
    } finally {
        // Reset button state
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
        submitBtn.disabled = false;
    }
}

// Load patient column width preferences from localStorage
function loadPatientColumnWidthPreferences() {
    try {
        const savedWidths = JSON.parse(
            localStorage.getItem('patientTableColumnWidths')
        );
        if (savedWidths && Array.isArray(savedWidths)) {
            const table = document.querySelector('#patientsTable');
            if (table) {
                const headers = Array.from(table.querySelectorAll('th'));
                headers.forEach((header, index) => {
                    if (savedWidths[index]) {
                        header.style.width = savedWidths[index];
                    }
                });
                addPatientColumnResizeHandles();
            }
        }
    } catch (e) {
        console.error('Error loading patient column preferences');
        adjustPatientColumnWidths();
    }
}

// Save patient table column width preferences to localStorage
function savePatientColumnWidthPreferences() {
    try {
        const table = document.querySelector('#patientsTable');
        if (!table) return;

        const headers = Array.from(table.querySelectorAll('th'));
        const widths = headers.map((header) => header.style.width);

        localStorage.setItem(
            'patientTableColumnWidths',
            JSON.stringify(widths)
        );
    } catch (error) {
        console.error('Error saving patient column preferences:', error);
    }
}

// Adjust patient table column widths automatically
function adjustPatientColumnWidths() {
    const table = document.querySelector('#patientsTable');
    if (!table) return;

    const headers = Array.from(table.querySelectorAll('th')); // Define optimal widths for each column
    const columnWidths = [
        '200px',
        '120px',
        '150px',
        '120px',
        '250px',
        '120px',
        '100px',
    ]; // Name, DOB, Phone, Accepts Texts, Address, Created, Actions

    headers.forEach((header, index) => {
        if (columnWidths[index]) {
            header.style.width = columnWidths[index];
        }
    });

    addPatientColumnResizeHandles();
    savePatientColumnWidthPreferences();
}

// Add column resize handles to patient table
function addPatientColumnResizeHandles() {
    const table = document.querySelector('#patientsTable');
    if (!table) {
        console.error('❌ No patients table found with #patientsTable id');
        return;
    }

    const headers = Array.from(table.querySelectorAll('th'));

    // Remove any existing resize handles
    document.querySelectorAll('.column-resize-handle').forEach((handle) => {
        handle.remove();
    });

    // Add resize handle to each header except the last one (actions column)
    headers.forEach((header, index) => {
        if (index < headers.length - 1) {
            // Skip last column (actions)
            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'column-resize-handle';
            resizeHandle.setAttribute('role', 'separator');
            resizeHandle.setAttribute('aria-orientation', 'vertical');
            resizeHandle.setAttribute('aria-valuemin', '80'); // Minimum width
            resizeHandle.setAttribute('aria-valuemax', '500'); // Maximum width
            resizeHandle.setAttribute('aria-valuenow', header.offsetWidth);
            resizeHandle.setAttribute('tabindex', '0'); // Make focusable for keyboard
            header.appendChild(resizeHandle);

            // Add tooltip to indicate resizable column
            header.setAttribute(
                'title',
                'Drag to resize column | Double-click to auto-size'
            ); // Add resize listeners for mouse
            resizeHandle.addEventListener('mousedown', function (e) {
                startColumnResize(e, header, index);
            });

            // Add touch support
            resizeHandle.addEventListener(
                'touchstart',
                function (e) {
                    // Prevent scrolling while resizing
                    e.preventDefault();
                    const touch = e.touches[0];
                    startColumnResize(touch, header, index);
                },
                { passive: false }
            );

            // Add double-click to auto-size functionality
            resizeHandle.addEventListener('dblclick', function (e) {
                e.preventDefault();
                e.stopPropagation();
                autoSizeColumn(header, index);
            });

            // Also add double-click to the header itself for better UX
            header.addEventListener('dblclick', function (e) {
                // Only trigger if not clicking on sort indicator or other interactive elements
                if (
                    !e.target.classList.contains('sort-indicator') &&
                    !e.target.closest('.sort-indicator') &&
                    !e.target.classList.contains('column-resize-handle')
                ) {
                    e.preventDefault();
                    e.stopPropagation();
                    autoSizeColumn(header, index);
                }
            });

            // Add keyboard support
            resizeHandle.addEventListener('keydown', function (e) {
                // Respond to left/right arrow keys
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    const currentWidth = header.offsetWidth;
                    const step = e.key === 'ArrowLeft' ? -10 : 10;
                    const newWidth = Math.max(80, currentWidth + step);
                    header.style.width = newWidth + 'px';
                    this.setAttribute('aria-valuenow', newWidth);
                    savePatientColumnWidthPreferences();
                } // Enter key to auto-size
                else if (e.key === 'Enter') {
                    e.preventDefault();
                    autoSizeColumn(header, index);
                }
            });
        }
    });
}

// Column Resize Functions for Patients Table

function startColumnResize(event, header, columnIndex) {
    // Accept both mouse and touch events
    if (event.preventDefault) event.preventDefault();

    const table = document.querySelector('#patientsTable');
    const startX = event.pageX || event.clientX;
    const startWidth = header.offsetWidth;
    const handle = event.target;

    // Store initial widths of all columns to prevent redistribution
    const headers = Array.from(table.querySelectorAll('th'));
    const initialWidths = headers.map((h) => h.offsetWidth);
    const initialTableWidth = table.offsetWidth;

    // Apply initial widths immediately to prevent layout shift
    headers.forEach((h, index) => {
        h.style.width = `${initialWidths[index]}px`;
    });

    // Set table to fixed layout AFTER setting initial widths
    table.style.tableLayout = 'fixed';
    table.style.width = `${initialTableWidth}px`;

    // Force a layout reflow to stabilize the table
    table.offsetHeight; // This forces a reflow

    // Update ARIA attributes for accessibility
    handle.setAttribute('aria-valuenow', startWidth);

    // Add resizing class to table
    table.classList.add('resizing');

    // Mark the handle as active
    handle.classList.add('active');

    // Function to handle mouse/touch movement during resize
    function handlePointerMove(e) {
        // Get pageX for calculations
        const pageX =
            e.pageX ||
            (e.touches && e.touches[0] ? e.touches[0].pageX : startX);

        // Calculate new width
        const deltaX = pageX - startX;
        const newWidth = Math.max(80, Math.min(500, startWidth + deltaX));

        // Calculate the change in width
        const widthChange = newWidth - startWidth;

        // Apply new width to the resizing column
        header.style.width = `${newWidth}px`;

        // Adjust table width to accommodate the change without affecting other columns
        const newTableWidth = initialTableWidth + widthChange;
        table.style.width = `${newTableWidth}px`;

        // Ensure all other columns maintain their original widths
        headers.forEach((h, index) => {
            if (index !== columnIndex) {
                h.style.width = `${initialWidths[index]}px`;
            }
        });

        // Update ARIA value
        handle.setAttribute('aria-valuenow', newWidth);
    }

    // Function to handle mouse/touch up (end of resize)
    function handlePointerUp(e) {
        // Remove event listeners
        document.removeEventListener('mousemove', handlePointerMove);
        document.removeEventListener('mouseup', handlePointerUp);
        document.removeEventListener('touchmove', handlePointerMove);
        document.removeEventListener('touchend', handlePointerUp);
        document.removeEventListener('touchcancel', handlePointerUp);

        // Get final position
        const pageX =
            e.pageX ||
            (e.changedTouches && e.changedTouches[0]
                ? e.changedTouches[0].pageX
                : startX);

        // Calculate the final width with constraints
        const deltaX = pageX - startX;
        const newWidth = Math.max(80, Math.min(500, startWidth + deltaX));

        // Apply the final width
        header.style.width = `${newWidth}px`;

        // Calculate final table width
        const widthChange = newWidth - startWidth;
        const newTableWidth = initialTableWidth + widthChange;
        table.style.width = `${newTableWidth}px`;

        // Ensure all other columns maintain their widths
        headers.forEach((h, index) => {
            if (index !== columnIndex) {
                h.style.width = `${initialWidths[index]}px`;
            }
        });

        // Update ARIA value for accessibility
        handle.setAttribute('aria-valuenow', newWidth);

        // Save column width in localStorage for persistence
        savePatientColumnWidthPreferences();

        // Announce resize completion for screen readers
        announceForScreenReader(`Column ${header.textContent.trim()} resized`);

        // Remove the resizing class
        table.classList.remove('resizing');

        // Remove active from handle
        handle.classList.remove('active');
    }

    // Add event listeners for mouse/touch movement and release
    document.addEventListener('mousemove', handlePointerMove, {
        passive: false,
    });
    document.addEventListener('mouseup', handlePointerUp);

    // Add touch event handlers
    document.addEventListener('touchmove', handlePointerMove, {
        passive: false,
    });
    document.addEventListener('touchend', handlePointerUp);
    document.addEventListener('touchcancel', handlePointerUp);
}

// Function to announce changes to screen readers
function announceForScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.classList.add('sr-only');
    announcement.textContent = message;
    document.body.appendChild(announcement);

    // Remove after announcement is made
    setTimeout(() => {
        if (document.body.contains(announcement)) {
            document.body.removeChild(announcement);
        }
    }, 1000);
}

// Enhanced auto-size function that measures actual content width (similar to admin.js)
function autoSizeColumn(header, columnIndex) {
    const table = document.querySelector('#patientsTable');
    if (!table) return;

    // Store initial widths and table width to prevent redistribution (same as manual resize)
    const headers = Array.from(table.querySelectorAll('th'));
    const initialWidths = headers.map((h) => h.offsetWidth);
    const initialTableWidth = table.offsetWidth;

    // Apply initial widths immediately to prevent layout shift
    headers.forEach((h, index) => {
        h.style.width = `${initialWidths[index]}px`;
    });

    // Set table to fixed layout
    table.style.tableLayout = 'fixed';
    table.style.width = `${initialTableWidth}px`;

    // Get all cells in this column
    const cells = Array.from(
        table.querySelectorAll(`tbody tr td:nth-child(${columnIndex + 1})`)
    );

    // If table is empty, just use header text for sizing
    if (cells.length === 0) {
        const headerText = header.textContent;
        let maxWidth = Math.max(headerText.length * 10 + 40, 100); // Slightly more generous for headers

        // Apply column type constraints even for empty tables
        const columnType = getPatientColumnType(headerText);
        if (columnType === 'actions') {
            maxWidth = 110; // Default actions column width for patients
        }

        // Calculate width difference and update table width accordingly
        const widthDifference = maxWidth - initialWidths[columnIndex];
        header.style.width = `${maxWidth}px`;

        // Adjust the table width to accommodate the change
        const newTableWidth = initialTableWidth + widthDifference;
        table.style.width = `${newTableWidth}px`;

        // Ensure all other columns maintain their exact original widths
        headers.forEach((h, index) => {
            if (index !== columnIndex) {
                h.style.width = `${initialWidths[index]}px`;
            }
        });

        savePatientColumnWidthPreferences();
        announceForScreenReader(
            `Column ${header.textContent.trim()} auto-sized`
        );
        return;
    }

    // Use canvas for accurate text measurement
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        // Fallback to simple calculation if canvas is not available
        const headerText = header.textContent;
        let maxWidth = Math.max(headerText.length * 8 + 40, 80); // Rough estimation

        // Apply the calculated width with proper width difference handling
        const widthDifference = maxWidth - initialWidths[columnIndex];
        header.style.width = `${maxWidth}px`;

        // Adjust the table width to accommodate the change
        const newTableWidth = initialTableWidth + widthDifference;
        table.style.width = `${newTableWidth}px`;

        // Ensure all other columns maintain their exact original widths
        headers.forEach((h, index) => {
            if (index !== columnIndex) {
                h.style.width = `${initialWidths[index]}px`;
            }
        });

        // Save the updated column widths
        savePatientColumnWidthPreferences();

        // Announce the change to screen readers
        announceForScreenReader(
            `Column ${header.textContent.trim()} auto-sized`
        );
        return;
    }

    const headerStyle = window.getComputedStyle(header);
    context.font = `${headerStyle.fontWeight} ${headerStyle.fontSize} ${headerStyle.fontFamily}`;

    // Measure header width
    let maxWidth = Math.max(
        context.measureText(header.textContent).width + 40,
        80
    ); // Add padding, minimum 80px

    // Measure all cells in the column to find the widest content
    cells.forEach((cell) => {
        // Get the actual text content from the cell or its children
        let cellText = '';

        // Handle different cell types properly
        if (cell.querySelector('.patient-actions')) {
            // For action cells, measure the actual button content
            const actionButtons = cell.querySelectorAll('button');
            let buttonWidths = 0;
            actionButtons.forEach((btn) => {
                // Get actual button text and add some padding for button styling
                const btnText = btn.textContent.trim();
                const btnWidth = context.measureText(btnText).width + 30; // padding for button styling
                buttonWidths += btnWidth;
            });
            cellText = buttonWidths > 0 ? 'MEASURED_BUTTONS' : 'Edit Delete'; // fallback text
        } else {
            // Get the raw text content and clean it
            cellText = cell.textContent.trim();
        }

        if (cellText) {
            // Use canvas to measure text width more accurately
            const cellStyle = window.getComputedStyle(cell);
            context.font = `${cellStyle.fontWeight} ${cellStyle.fontSize} ${cellStyle.fontFamily}`;

            let cellWidth;
            if (cellText === 'MEASURED_BUTTONS') {
                // Use the pre-calculated button widths plus some margin
                const actionButtons = cell.querySelectorAll('button');
                cellWidth = 0;
                actionButtons.forEach((btn) => {
                    const btnText = btn.textContent.trim();
                    const btnWidth = context.measureText(btnText).width + 30; // padding for button styling
                    cellWidth += btnWidth;
                });
                cellWidth += actionButtons.length > 1 ? 10 : 0; // gap between buttons
                cellWidth += 20; // cell padding
            } else {
                cellWidth = context.measureText(cellText).width + 40; // Add padding
            }

            // Find the maximum width needed
            maxWidth = Math.max(maxWidth, cellWidth);
        }
    });

    // Apply constraints based on column type
    const columnType = getPatientColumnType(header.textContent);

    if (columnType === 'name') {
        maxWidth = Math.min(maxWidth, 250); // Name column max width
        maxWidth = Math.max(maxWidth, 150); // Name column min width
    } else if (columnType === 'dob') {
        maxWidth = Math.min(maxWidth, 130); // DOB column max width
        maxWidth = Math.max(maxWidth, 110); // DOB column min width
    } else if (columnType === 'phone') {
        maxWidth = Math.min(maxWidth, 150); // Phone column max width
        maxWidth = Math.max(maxWidth, 120); // Phone column min width
    } else if (columnType === 'accepts_texts') {
        maxWidth = Math.min(maxWidth, 120); // Accepts Texts column max width
        maxWidth = Math.max(maxWidth, 100); // Accepts Texts column min width
    } else if (columnType === 'address') {
        maxWidth = Math.min(maxWidth, 300); // Address column max width
        maxWidth = Math.max(maxWidth, 200); // Address column min width
    } else if (columnType === 'date') {
        maxWidth = Math.min(maxWidth, 150); // Date columns max width
        maxWidth = Math.max(maxWidth, 120); // Date columns min width
    } else if (columnType === 'actions') {
        // Calculate actions column width more precisely based on actual button content
        const actionCells = table.querySelectorAll(
            'tbody tr td:nth-child(' + (columnIndex + 1) + ') .patient-actions'
        );
        if (actionCells.length > 0) {
            // Measure actual action buttons
            const sampleCell = actionCells[0];
            const buttons = sampleCell.querySelectorAll('button');
            let totalButtonWidth = 0;
            buttons.forEach((btn) => {
                totalButtonWidth += btn.offsetWidth || 70; // fallback width if not measured
            });
            totalButtonWidth += buttons.length > 1 ? 10 : 0; // gap between buttons
            totalButtonWidth += 20; // cell padding
            maxWidth = Math.max(totalButtonWidth, 100); // minimum 100px
            maxWidth = Math.min(maxWidth, 160); // maximum 160px to prevent excessive width
        } else {
            maxWidth = 110; // default fallback for actions column
        }
    } else {
        maxWidth = Math.min(maxWidth, 300); // General max width
        maxWidth = Math.max(maxWidth, 100); // Minimum width for readability
    }

    // Apply the calculated width to the target column only
    const widthDifference = maxWidth - initialWidths[columnIndex];
    header.style.width = `${maxWidth}px`;

    // Adjust the table width to accommodate the change without affecting other columns
    const newTableWidth = initialTableWidth + widthDifference;
    table.style.width = `${newTableWidth}px`;

    // Ensure all other columns maintain their exact original widths
    headers.forEach((h, index) => {
        if (index !== columnIndex) {
            h.style.width = `${initialWidths[index]}px`;
        }
    });

    // Save the updated column widths
    savePatientColumnWidthPreferences();

    // Announce the change to screen readers
    announceForScreenReader(`Column ${header.textContent.trim()} auto-sized`);
}

// Helper function to determine patient column type
function getPatientColumnType(headerText) {
    const text = headerText.toLowerCase().trim();

    if (text.includes('name')) {
        return 'name';
    } else if (text.includes('birth') || text.includes('dob')) {
        return 'dob';
    } else if (text.includes('phone')) {
        return 'phone';
    } else if (text.includes('text')) {
        return 'accepts_texts';
    } else if (text.includes('address')) {
        return 'address';
    } else if (text.includes('updated') || text.includes('created')) {
        return 'date';
    } else if (text.includes('action')) {
        return 'actions';
    }

    return 'general';
}

// Setup edit patient modal functionality
function setupEditPatientModal() {
    const modal = document.getElementById('editPatientModal');
    const closeBtn = document.querySelector('#editPatientModal .close');
    const cancelBtn = document.getElementById('cancelEditPatient');
    const form = document.getElementById('editPatientForm');

    // Close modal when clicking X button
    if (closeBtn) {
        closeBtn.addEventListener('click', closeEditPatientModal);
    }

    // Close modal when clicking Cancel button
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeEditPatientModal);
    }

    // Close modal when clicking outside of it
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                closeEditPatientModal();
            }
        });
    }

    // Handle form submission
    if (form) {
        form.addEventListener('submit', handleEditPatientSubmit);
    }
}

// Setup delete patient modal functionality
function setupDeletePatientModal() {
    const modal = document.getElementById('deletePatientModal');
    const closeBtn = document.querySelector('#deletePatientModal .close');
    const cancelBtn = document.getElementById('cancelDeletePatient');

    // Close modal when clicking X button
    if (closeBtn) {
        closeBtn.addEventListener('click', closeDeletePatientModal);
    }

    // Close modal when clicking Cancel button
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeDeletePatientModal);
    }

    // Close modal when clicking outside of it
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                closeDeletePatientModal();
            }
        });
    }
}

// Make functions globally available for inline onclick handlers
window.editPatient = editPatient;
window.deletePatient = deletePatient;

// Export functions for global access
window.patientsPage = {
    initializePatientsPage,
    loadPatients,
    displayPatients,
    setupEditPatientModal,
    setupDeletePatientModal,
    savePatientColumnWidthPreferences,
    adjustPatientColumnWidths,
    addPatientColumnResizeHandles,
    editPatient,
    deletePatient,
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.patientsPage;
}
