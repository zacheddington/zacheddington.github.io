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
    } // Setup edit patient modal
    setupEditPatientModal();

    // Setup delete patient modal
    setupDeletePatientModal(); // Apply column preferences or auto-size if no preferences exist
    try {
        loadPatientColumnWidthPreferences();
    } catch (e) {
        console.error('Error loading patient column preferences');
        adjustPatientColumnWidths();
    } // Add event listener for window resize to adjust column widths
    window.addEventListener(
        'resize',
        debounce(function () {
            // Only auto-adjust if no saved preferences
            if (!localStorage.getItem('patientTableColumnWidths')) {
                adjustPatientColumnWidths();
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
                    adjustPatientColumnWidths();
                } else {
                    // Just refresh resize handles
                    addPatientColumnResizeHandles();
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
        } // Add a test to simulate data if database is unavailable
        if (API_URL.includes('localhost') && !window.FORCE_REAL_API) {
            // Test if API is actually available
            try {
                const testResponse = await fetch(`${API_URL}/api/health`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!testResponse.ok) {
                    // Use test data for debugging
                    const testPatients = [
                        {
                            patient_key: 'test-1',
                            first_name: 'John',
                            last_name: 'Doe',
                            middle_name: 'M',
                            date_of_birth: '1990-01-01',
                            phone: '555-1234',
                            accepts_texts: true,
                            address_1: '123 Main St',
                            address_2: 'Apt 1',
                            city: 'Anytown',
                            state: 'CA',
                            zip: '12345',
                            date_created: new Date().toISOString(),
                            date_updated: new Date().toISOString(),
                        },
                    ];

                    allPatients = testPatients;
                    setupPatientTableSorting();
                    const sortedPatients = getSortedPatients();

                    displayPatients(sortedPatients);

                    if (patientsLoading) {
                        patientsLoading.style.display = 'none';
                    }
                    return;
                }
            } catch (healthError) {
                // Health check failed, continuing with normal flow...
            }
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

// Debug function to display information in the DOM
function showDebugInfo(message, data = null) {
    let debugDiv = document.getElementById('debugInfo');
    if (!debugDiv) {
        debugDiv = document.createElement('div');
        debugDiv.id = 'debugInfo';
        debugDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #f0f0f0;
            border: 1px solid #ccc;
            padding: 10px;
            max-width: 400px;
            max-height: 300px;
            overflow-y: auto;
            z-index: 10000;
            font-family: monospace;
            font-size: 12px;
        `;
        document.body.appendChild(debugDiv);
    }

    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.style.marginBottom = '5px';
    logEntry.innerHTML = `<strong>[${timestamp}]</strong> ${message}`;
    if (data) {
        logEntry.innerHTML += `<br><pre>${JSON.stringify(data, null, 2)}</pre>`;
    }
    debugDiv.appendChild(logEntry);
    debugDiv.scrollTop = debugDiv.scrollHeight;
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
    const patientsTableBody = document.getElementById('patientsTableBody');
    const noPatientsFound = document.getElementById('noPatientsFound');
    const tableContainer = document.querySelector('.table-responsive');

    if (!patientsTableBody) {
        console.error('❌ patientsTableBody not found in displayPatients');
        return;
    }

    if (patients.length === 0) {
        patientsTableBody.innerHTML = '';
        if (noPatientsFound) noPatientsFound.classList.remove('hidden');
        return;
    }

    if (noPatientsFound) noPatientsFound.classList.add('hidden');

    // Reset scroll position when displaying new data
    if (tableContainer) {
        tableContainer.scrollLeft = 0;
    } // Make sure tooltips are added to column headers
    addColumnResizeTooltips(); // Update the table body with new data
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
    patientsTableBody.innerHTML = htmlRows;

    // FORCE RESET TABLE LAYOUT TO FIX COLUMN ALIGNMENT ISSUE
    const table = document.getElementById('patientsTable');
    if (table) {
        table.style.tableLayout = 'auto';
        table.style.width = '100%';

        // Force recalculation by temporarily changing display
        table.style.display = 'none';
        table.offsetHeight; // Force reflow
        table.style.display = 'table';

        // Clear any saved column widths that might be causing issues
        const headers = table.querySelectorAll('th');
        headers.forEach((th) => {
            th.style.width = 'auto';
            th.style.minWidth = '';
        });
    } // Adjust column widths after rendering
    setTimeout(adjustPatientColumnWidths, 100);

    // Add column resize tooltips
    addColumnResizeTooltips();

    // Add column resize handles after rendering the table
    addPatientColumnResizeHandles();
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

    // Add column resize handles and tooltips
    addPatientColumnResizeHandles();
    addColumnResizeTooltips();
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
    if (!table) return;

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
            );

            // Add resize listeners for mouse
            resizeHandle.addEventListener('mousedown', function (e) {
                startPatientColumnResize(e, header, index);
            });

            // Add touch support
            resizeHandle.addEventListener(
                'touchstart',
                function (e) {
                    // Prevent scrolling while resizing
                    e.preventDefault();
                    const touch = e.touches[0];
                    startPatientColumnResize(touch, header, index);
                },
                { passive: false }
            );

            // Add double-click to auto-size functionality
            resizeHandle.addEventListener('dblclick', function (e) {
                e.preventDefault();
                e.stopPropagation();
                autoSizePatientColumn(header, index);
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
                    autoSizePatientColumn(header, index);
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
                }
                // Enter key to auto-size
                else if (e.key === 'Enter') {
                    e.preventDefault();
                    autoSizePatientColumn(header, index);
                }
            });
        }
    });
}

// Function to handle patient column resizing
function startPatientColumnResize(event, header, columnIndex) {
    // Accept both mouse and touch events
    if (event.preventDefault) event.preventDefault();

    const table = document.querySelector('#patientsTable');
    const startX = event.pageX || event.clientX;
    const startWidth = header.offsetWidth;
    const handle = event.target;

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

        // Calculate new width immediately for responsive feedback
        const deltaX = pageX - startX;
        const newWidth = Math.max(80, Math.min(500, startWidth + deltaX));

        // Use requestAnimationFrame for smooth updates
        if (!handlePointerMove.rafId) {
            handlePointerMove.rafId = requestAnimationFrame(() => {
                header.style.width = `${newWidth}px`;
                handlePointerMove.rafId = null;
            });
        }

        // Only update ARIA value periodically to reduce overhead
        if (
            !handlePointerMove.lastAriaUpdate ||
            Date.now() - handlePointerMove.lastAriaUpdate > 100
        ) {
            handle.setAttribute('aria-valuenow', newWidth);
            handlePointerMove.lastAriaUpdate = Date.now();
        }
    }

    // Function to handle mouse/touch up (end of resize)
    function handlePointerUp(e) {
        // Cancel any pending animation frame
        if (handlePointerMove.rafId) {
            cancelAnimationFrame(handlePointerMove.rafId);
            handlePointerMove.rafId = null;
        }

        // Remove event listeners
        document.removeEventListener('mousemove', handlePointerMove);
        document.removeEventListener('mouseup', handlePointerUp);
        document.removeEventListener('touchmove', handlePointerMove);
        document.removeEventListener('touchend', handlePointerUp);

        // Clean up classes
        table.classList.remove('resizing');
        handle.classList.remove('active');

        // Save the new column widths to localStorage
        savePatientColumnWidthPreferences();

        // Remove tracking properties
        delete handlePointerMove.rafId;
        delete handlePointerMove.lastAriaUpdate;
    }

    // Add event listeners for move and up
    document.addEventListener('mousemove', handlePointerMove);
    document.addEventListener('mouseup', handlePointerUp);
    document.addEventListener('touchmove', handlePointerMove, {
        passive: false,
    });
    document.addEventListener('touchend', handlePointerUp);
}

// Auto-size patient column based on content
function autoSizePatientColumn(header, columnIndex) {
    const table = document.querySelector('#patientsTable');
    if (!table) return;

    // Get all cells in this column
    const cells = Array.from(
        table.querySelectorAll(
            `tr td:nth-child(${columnIndex + 1}), tr th:nth-child(${
                columnIndex + 1
            })`
        )
    );

    // Calculate the maximum content width
    let maxWidth = 100; // Minimum width
    cells.forEach((cell) => {
        const textWidth = getTextWidth(
            cell.textContent || cell.innerText,
            getComputedStyle(cell)
        );
        maxWidth = Math.max(maxWidth, textWidth + 20); // Add padding
    });

    // Apply the new width
    const newWidth = Math.min(maxWidth, 500); // Cap at maximum width
    header.style.width = newWidth + 'px';

    // Save preferences
    savePatientColumnWidthPreferences();

    // Update ARIA value
    const resizeHandle = header.querySelector('.column-resize-handle');
    if (resizeHandle) {
        resizeHandle.setAttribute('aria-valuenow', newWidth);
    }
}

// Save patient column width preferences to localStorage
function savePatientColumnWidthPreferences() {
    try {
        const table = document.querySelector('#patientsTable');
        if (table) {
            const headers = Array.from(table.querySelectorAll('th'));
            const widths = headers.map(
                (header) => header.style.width || 'auto'
            );
            localStorage.setItem(
                'patientTableColumnWidths',
                JSON.stringify(widths)
            );
        }
    } catch (e) {
        console.error('Error saving patient column preferences');
    }
}

// Helper function to calculate text width
function getTextWidth(text, font) {
    const canvas =
        getTextWidth.canvas ||
        (getTextWidth.canvas = document.createElement('canvas'));
    const context = canvas.getContext('2d');
    context.font = `${font.fontSize} ${font.fontFamily}`;
    const metrics = context.measureText(text);
    return metrics.width;
}

// Setup edit patient modal functionality
function setupEditPatientModal() {
    const modal = document.getElementById('editPatientModal');
    const closeBtn = modal.querySelector('.close');
    const editPatientForm = document.getElementById('editPatientForm');

    if (!modal || !closeBtn || !editPatientForm) {
        console.error('❌ Missing modal elements, aborting setup');
        return;
    }

    // Variables to track mouse events for proper click-outside detection
    let mouseDownTarget = null;
    let mouseUpTarget = null;

    // Close modal when clicking the X button
    closeBtn.addEventListener('click', function () {
        closeEditPatientModal();
    });

    // Track mousedown to know where click started
    window.addEventListener('mousedown', function (event) {
        mouseDownTarget = event.target;
    });

    // Track mouseup to know where click ended
    window.addEventListener('mouseup', function (event) {
        mouseUpTarget = event.target;

        // Only close modal if both mousedown AND mouseup happened on the modal background
        // This prevents closing when user drags from inside form to outside
        if (
            modal.style.display === 'block' &&
            mouseDownTarget === modal &&
            mouseUpTarget === modal
        ) {
            closeEditPatientModal();
        }

        // Reset tracking variables
        mouseDownTarget = null;
        mouseUpTarget = null;
    });

    // Handle form submission
    editPatientForm.addEventListener('submit', handleEditPatientSubmit); // Close modal on Escape key
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && modal.style.display === 'block') {
            closeEditPatientModal();
        }
    });

    // Setup phone number formatting for edit form
    setupEditFormPhoneFormatting();

    // Setup date validation for edit form
    setupEditFormDateValidation();

    // Setup zip code formatting for edit form
    setupEditFormZipFormatting();
}

// Set up phone number formatting for the edit patient form
function setupEditFormPhoneFormatting() {
    const phoneInput = document.getElementById('editPatientPhone');
    if (!phoneInput) {
        console.warn('⚠️ Phone input not found in edit form');
        return;
    }

    // Format phone number as user types
    phoneInput.addEventListener('input', function (e) {
        let value = e.target.value;

        // Remove all non-digit characters
        const digits = value.replace(/\D/g, '');

        // Limit to 10 digits
        const limitedDigits = digits.substring(0, 10);

        // Format as (XXX) XXX-XXXX
        let formattedValue = '';
        if (limitedDigits.length > 0) {
            if (limitedDigits.length <= 3) {
                formattedValue = `(${limitedDigits}`;
            } else if (limitedDigits.length <= 6) {
                formattedValue = `(${limitedDigits.slice(
                    0,
                    3
                )}) ${limitedDigits.slice(3)}`;
            } else {
                formattedValue = `(${limitedDigits.slice(
                    0,
                    3
                )}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
            }
        }

        // Update the input value
        e.target.value = formattedValue;
    });

    // Handle paste events
    phoneInput.addEventListener('paste', function (e) {
        setTimeout(() => {
            // Trigger the input event to format the pasted content
            phoneInput.dispatchEvent(new Event('input'));
        }, 0);
    });

    // Prevent non-numeric input (except backspace, delete, tab, etc.)

    phoneInput.addEventListener('keydown', function (e) {
        // Allow: backspace, delete, tab, escape, enter
        if (
            [8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
            // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
            (e.keyCode === 65 && e.ctrlKey === true) ||
            (e.keyCode === 67 && e.ctrlKey === true) ||
            (e.keyCode === 86 && e.ctrlKey === true) ||
            (e.keyCode === 88 && e.ctrlKey === true) ||
            // Allow: home, end, left, right
            (e.keyCode >= 35 && e.keyCode <= 39)
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

// Setup date validation for edit form
function setupEditFormDateValidation() {
    const dateInput = document.getElementById('editPatientDateOfBirth');
    if (!dateInput) {
        console.warn('⚠️ Date of birth input not found in edit form');
        return;
    }

    // Simple validation on change (when user finishes editing)
    dateInput.addEventListener('change', function (e) {
        const value = e.target.value;
        if (value) {
            const date = new Date(value);
            const today = new Date();

            // Check if date is valid
            if (isNaN(date.getTime())) {
                e.target.setCustomValidity('Please enter a valid date');
                return;
            }

            // Check if date is not in the future
            if (date > today) {
                e.target.setCustomValidity(
                    'Date of birth cannot be in the future'
                );
                return;
            }

            // Check if date is reasonable (not too far in the past)
            const minDate = new Date();
            minDate.setFullYear(minDate.getFullYear() - 150);
            if (date < minDate) {
                e.target.setCustomValidity(
                    'Please enter a reasonable date of birth'
                );
                return;
            }

            // Clear any custom validity if all checks pass
            e.target.setCustomValidity('');
        }
    }); // Clear custom validity when user starts typing
    dateInput.addEventListener('input', function (e) {
        e.target.setCustomValidity('');

        let value = e.target.value;

        // Only process if we have a reasonable length to avoid interfering with normal typing
        if (value.length >= 5) {
            // Check if year part is getting too long (more than 4 digits before first hyphen)
            const firstHyphenIndex = value.indexOf('-');
            if (firstHyphenIndex > 4) {
                // The year part is too long, truncate it to 4 digits
                const yearPart = value.substring(0, 4);
                const remainingPart = value.substring(firstHyphenIndex);
                e.target.value = yearPart + remainingPart;
            } else if (firstHyphenIndex === -1 && value.length > 4) {
                // No hyphen yet but year is getting long, truncate to 4 digits
                e.target.value = value.substring(0, 4);
            }
        }
    });
}

// Setup zip code formatting for edit form
function setupEditFormZipFormatting() {
    const zipInput = document.getElementById('editPatientZip');
    if (!zipInput) {
        console.warn('⚠️ Zip code input not found in edit form');
        return;
    }

    // Format zip code as user types
    zipInput.addEventListener('input', function (e) {
        let value = e.target.value;

        // Remove all non-digit characters
        const digits = value.replace(/\D/g, '');

        // Limit to 10 digits max (XXXXX-XXXX format)
        const limitedDigits = digits.substring(0, 10);

        // Format as XXXXX-XXXX for 6+ digits, or just XXXXX for 5 or fewer
        let formattedValue = '';
        if (limitedDigits.length <= 5) {
            formattedValue = limitedDigits;
        } else {
            formattedValue = `${limitedDigits.slice(
                0,
                5
            )}-${limitedDigits.slice(5)}`;
        }

        // Update the input value
        e.target.value = formattedValue;
    });

    // Handle paste events
    zipInput.addEventListener('paste', function (e) {
        setTimeout(() => {
            // Trigger the input event to format the pasted content
            zipInput.dispatchEvent(new Event('input'));
        }, 0);
    });

    // Prevent non-numeric input (except backspace, delete, tab, etc.)
    zipInput.addEventListener('keydown', function (e) {
        // Allow: backspace, delete, tab, escape, enter, hyphen
        if (
            [8, 9, 27, 13, 46, 189, 109].indexOf(e.keyCode) !== -1 ||
            // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
            (e.keyCode === 65 && e.ctrlKey === true) ||
            (e.keyCode === 67 && e.ctrlKey === true) ||
            (e.keyCode === 86 && e.ctrlKey === true) ||
            (e.keyCode === 88 && e.ctrlKey === true) ||
            // Allow: home, end, left, right
            (e.keyCode >= 35 && e.keyCode <= 39)
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

// Setup delete patient modal
function setupDeletePatientModal() {
    const modal = document.getElementById('deletePatientModal');
    if (!modal) {
        console.warn('⚠️ Delete patient modal not found');
        return;
    }

    const closeBtn = modal.querySelector('.close');

    // Variables to track mouse events for proper click-outside detection
    let mouseDownTarget = null;
    let mouseUpTarget = null;

    // Close modal when clicking the X button
    if (closeBtn) {
        closeBtn.addEventListener('click', function () {
            closeDeletePatientModal();
        });
    }

    // Track mousedown to know where click started
    window.addEventListener('mousedown', function (event) {
        mouseDownTarget = event.target;
    });

    // Track mouseup to know where click ended
    window.addEventListener('mouseup', function (event) {
        mouseUpTarget = event.target;

        // Only close modal if both mousedown AND mouseup happened on the modal background
        if (
            modal.style.display === 'block' &&
            mouseDownTarget === modal &&
            mouseUpTarget === modal
        ) {
            closeDeletePatientModal();
        }

        // Reset tracking variables
        mouseDownTarget = null;
        mouseUpTarget = null;
    });
}

// Export functions to window object for main.js to access
if (typeof window !== 'undefined') {
    window.patientsPage = {
        initializePatientsPage,
        initializeCreatePatientPage,
        initializeManagePatientsPage,
        initializePatientsIndexPage,
        editPatient,
        deletePatient,
        closeEditPatientModal,
        closeDeletePatientModal,
    };
}
