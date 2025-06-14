// Patients Page Module
// Contains all patient-related functionality including create/manage/navigation

// Global state for patient management
let allPatients = [];
let currentPatientSort = { column: null, direction: null };

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
    console.log('Patients index page initialized');
}

// Initialize the create patient page
function initializeCreatePatientPage() {
    // Setup create patient form
    setupCreatePatientForm();

    console.log('Create patient page initialized');
}

// Initialize the manage patients page
function initializeManagePatientsPage() {
    // Load patients and setup patient management
    loadPatients();
    setupPatientFilter();

    // Apply column preferences or auto-size if no preferences exist
    try {
        loadPatientColumnWidthPreferences();
    } catch (e) {
        console.error('Error loading patient column preferences:', e);
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

    console.log('Manage patients page initialized');
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
    if (!createPatientForm) return;

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
        { id: 'patientAddress', maxLength: 100, label: 'Address' },
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

    // Set up phone number formatting
    setupPatientPhoneFormatting();
}

// Set up phone number formatting for patient phone field
function setupPatientPhoneFormatting() {
    const phoneInput = document.getElementById('patientPhone');
    if (!phoneInput) return;

    // Format phone number as user types
    phoneInput.addEventListener('input', function (e) {
        let value = e.target.value.replace(/\D/g, ''); // Remove all non-digits

        // Limit to 10 digits
        if (value.length > 10) {
            value = value.slice(0, 10);
        }

        // Format as (XXX) XXX-XXXX
        if (value.length >= 6) {
            e.target.value = `(${value.slice(0, 3)}) ${value.slice(
                3,
                6
            )}-${value.slice(6)}`;
        } else if (value.length >= 3) {
            e.target.value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
        } else if (value.length > 0) {
            e.target.value = value;
        }
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
            }
        }, 0);
    });

    // Prevent non-numeric keypress except backspace, delete, tab, escape, enter
    phoneInput.addEventListener('keypress', function (e) {
        const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter'];
        if (allowedKeys.includes(e.key)) return;

        if (!/[0-9]/.test(e.key)) {
            e.preventDefault();
        }
    });
}

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
        }

        // Get form data
        const formData = {
            firstName: document.getElementById('patientFirstName').value.trim(),
            middleName: document
                .getElementById('patientMiddleName')
                .value.trim(),
            lastName: document.getElementById('patientLastName').value.trim(),
            address: document.getElementById('patientAddress').value.trim(),
            phone: document.getElementById('patientPhone').value.trim(),
            acceptsTexts: document.getElementById('acceptsTexts').value,
        };

        // Validate required fields
        if (
            !formData.firstName ||
            !formData.lastName ||
            !formData.address ||
            !formData.phone ||
            !formData.acceptsTexts
        ) {
            throw new Error('All fields except middle name are required.');
        }

        // Validate character limits
        if (formData.firstName.length > 50) {
            throw new Error('First name must be 50 characters or less.');
        }
        if (formData.middleName && formData.middleName.length > 50) {
            throw new Error('Middle name must be 50 characters or less.');
        }
        if (formData.lastName.length > 50) {
            throw new Error('Last name must be 50 characters or less.');
        }
        if (formData.address.length > 100) {
            throw new Error('Address must be 100 characters or less.');
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
            clearCreatePatientErrors();

            // Show success modal with simple personalized message
            const patientName = formData.middleName
                ? `${formData.firstName} ${formData.middleName} ${formData.lastName}`
                : `${formData.firstName} ${formData.lastName}`;
            const successMessage = `Success, new patient ${patientName} created!`;
            window.modalManager.showModal('success', successMessage); // Redirect back to patient choice page after brief delay
            setTimeout(() => {
                window.modalManager.closeModal();
                // Navigate back to main patient page using clean URL
                window.location.href = '../';
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
        console.error('Create patient error:', error);

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
        const API_URL = window.apiClient.getAPIUrl();
        const token = localStorage.getItem('token');

        const patientsLoading = document.getElementById('patientsLoading');
        const patientsTableBody = document.getElementById('patientsTableBody');

        if (patientsLoading) patientsLoading.style.display = 'block';
        if (patientsTableBody) patientsTableBody.innerHTML = '';

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

            // Check if we have saved column widths
            try {
                const savedWidths = JSON.parse(
                    localStorage.getItem('patientTableColumnWidths')
                );
                if (savedWidths && Array.isArray(savedWidths)) {
                    // Display patients with saved column widths
                    displayPatientsPreserveWidths(sortedPatients, savedWidths);
                } else {
                    // No saved preferences, just display and auto-adjust
                    displayPatients(sortedPatients);
                }
            } catch (e) {
                console.error(
                    'Error applying column widths after loading patients:',
                    e
                );
                displayPatients(sortedPatients);
            }
        } else {
            // Use global auth error handler for consistent experience
            if (response.status === 401 || response.status === 403) {
                window.handleAuthError(response, 'loading patients');
                return;
            }
            throw new Error('Failed to load patients');
        }
    } catch (error) {
        console.error('Error loading patients:', error);
        const patientsTableBody = document.getElementById('patientsTableBody');
        if (patientsTableBody) {
            patientsTableBody.innerHTML =
                '<tr><td colspan="6" style="text-align: center; color: #dc3545;">Error loading patients. Please try again.</td></tr>';
        }
    } finally {
        const patientsLoading = document.getElementById('patientsLoading');
        if (patientsLoading) patientsLoading.style.display = 'none';
    }
}

// Set up patient table sorting functionality using shared utility
function setupPatientTableSorting() {
    // Define sortable columns
    const sortableColumns = [
        { index: 0, key: 'fullName', label: 'Name' },
        { index: 1, key: 'address', label: 'Address' },
        { index: 2, key: 'phone', label: 'Phone' },
        { index: 3, key: 'acceptsTexts', label: 'Accepts Texts' },
        { index: 4, key: 'created', label: 'Created' },
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
        case 'address':
            return patient.address?.toLowerCase() || '';
        case 'phone':
            return patient.phone || '';
        case 'acceptsTexts':
            return patient.accepts_texts ? 'yes' : 'no';
        case 'created':
            return new Date(patient.created_at);
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
            case 'created':
                aValue = new Date(a.created_at);
                bValue = new Date(b.created_at);
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

    if (!patientsTableBody) return;

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

    // Make sure tooltips are added to column headers
    addColumnResizeTooltips();
    patientsTableBody.innerHTML = patients
        .map((patient) => {
            const fullName = patient.middle_name
                ? `${patient.first_name} ${patient.middle_name} ${patient.last_name}`
                : `${patient.first_name} ${patient.last_name}`;

            const acceptsTexts = patient.accepts_texts ? 'Yes' : 'No';
            const acceptsTextsClass = patient.accepts_texts ? 'yes' : 'no';

            const createdDate = new Date(
                patient.created_at
            ).toLocaleDateString();

            return `
            <tr data-patient-id="${patient.patient_key}">
                <td class="patient-name" title="${fullName}">
                    <div class="patient-full-name">${fullName}</div>
                </td>
                <td class="patient-address" title="${patient.address || ''}">${
                patient.address || ''
            }</td>
                <td class="patient-phone" title="${patient.phone || ''}">${
                patient.phone || ''
            }</td>
                <td>
                    <span class="accepts-texts ${acceptsTextsClass}" title="${acceptsTexts}">
                        ${acceptsTexts}
                    </span>
                </td>
                <td class="patient-created" title="${createdDate}">${createdDate}</td>
                <td>
                    <div class="patient-actions">
                        <button class="btn-icon btn-edit" onclick="editPatient(${
                            patient.patient_key
                        })" title="Edit Patient">
                            ✏️
                        </button>
                        <button class="btn-icon btn-delete" onclick="deletePatient(${
                            patient.patient_key
                        }, '${fullName}')" title="Delete Patient">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
        })
        .join('');

    // Adjust column widths after rendering
    setTimeout(adjustPatientColumnWidths, 100);

    // Add column resize tooltips
    addColumnResizeTooltips();
}

// Display patients in the table while preserving column widths
function displayPatientsPreserveWidths(patients, columnWidths = []) {
    const patientsTableBody = document.getElementById('patientsTableBody');
    const noPatientsFound = document.getElementById('noPatientsFound');
    const tableContainer = document.querySelector('.table-responsive');
    const table = document.querySelector('#patientsTable');

    if (!patientsTableBody || !table) return;

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
    } // Set the table to auto layout to allow proper expansion
    table.style.tableLayout = 'auto';
    table.style.minWidth = 'max-content'; // Allow table to expand as needed

    // Update the table body with new data
    patientsTableBody.innerHTML = patients
        .map((patient) => {
            const fullName = patient.middle_name
                ? `${patient.first_name} ${patient.middle_name} ${patient.last_name}`
                : `${patient.first_name} ${patient.last_name}`;

            const acceptsTexts = patient.accepts_texts ? 'Yes' : 'No';
            const acceptsTextsClass = patient.accepts_texts ? 'yes' : 'no';

            const createdDate = new Date(
                patient.created_at
            ).toLocaleDateString();

            return `
            <tr data-patient-id="${patient.patient_key}">
                <td class="patient-name" title="${fullName}">
                    <div class="patient-full-name">${fullName}</div>
                </td>
                <td class="patient-address" title="${patient.address || ''}">${
                patient.address || ''
            }</td>
                <td class="patient-phone" title="${patient.phone || ''}">${
                patient.phone || ''
            }</td>
                <td>
                    <span class="accepts-texts ${acceptsTextsClass}" title="${acceptsTexts}">
                        ${acceptsTexts}
                    </span>
                </td>
                <td class="patient-created" title="${createdDate}">${createdDate}</td>
                <td>
                    <div class="patient-actions">
                        <button class="btn-icon btn-edit" onclick="editPatient(${
                            patient.patient_key
                        })" title="Edit Patient">
                            ✏️
                        </button>
                        <button class="btn-icon btn-delete" onclick="deletePatient(${
                            patient.patient_key
                        }, '${fullName}')" title="Delete Patient">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
        })
        .join('');

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
        const fullName = patient.middle_name
            ? `${patient.first_name} ${patient.middle_name} ${patient.last_name}`
            : `${patient.first_name} ${patient.last_name}`;

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

// Placeholder functions for patient editing and deletion
function editPatient(patientId) {
    console.log(
        'Edit patient functionality not yet implemented for ID:',
        patientId
    );
    window.modalManager.showModal(
        'info',
        'Patient editing functionality will be implemented in a future update.'
    );
}

function deletePatient(patientId, patientName) {
    console.log(
        'Delete patient functionality not yet implemented for ID:',
        patientId
    );
    window.modalManager.showModal(
        'info',
        'Patient deletion functionality will be implemented in a future update.'
    );
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
        console.error('Error loading patient column preferences:', e);
        adjustPatientColumnWidths();
    }
}

// Adjust patient table column widths automatically
function adjustPatientColumnWidths() {
    const table = document.querySelector('#patientsTable');
    if (!table) return;

    const headers = Array.from(table.querySelectorAll('th'));

    // Define optimal widths for each column
    const columnWidths = ['200px', '250px', '150px', '120px', '120px', '100px']; // Name, Address, Phone, Accepts Texts, Created, Actions

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
        console.error('Error saving patient column preferences:', e);
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
