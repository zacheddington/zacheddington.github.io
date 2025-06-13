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
    } // Load hamburger menu for all patient pages
    if (document.getElementById('hamburger-menu') && window.navigation) {
        window.navigation.loadMenu();
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

    // Add a reset columns button to the filter actions
    const filterActions = document.querySelector('.filter-actions');
    if (filterActions) {
        const resetColumnsBtn = document.createElement('button');
        resetColumnsBtn.type = 'button';
        resetColumnsBtn.className = 'secondary-btn';
        resetColumnsBtn.id = 'resetPatientColumns';
        resetColumnsBtn.textContent = 'Reset Columns';
        resetColumnsBtn.title =
            'Reset all column widths to optimal size based on content';
        resetColumnsBtn.addEventListener('click', function () {
            localStorage.removeItem('patientTableColumnWidths');
            adjustPatientColumnWidths();
            // Announce to screen readers
            announceForScreenReader(
                'Table columns have been reset to optimal width'
            );
        });
        filterActions.appendChild(resetColumnsBtn);
    }

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

// Set up patient table sorting functionality
function setupPatientTableSorting() {
    const table = document.getElementById('patientsTable');
    if (!table) return;

    const headers = table.querySelectorAll('thead th');

    // Define sortable columns
    const sortableColumns = [
        { index: 0, key: 'fullName', label: 'Name' },
        { index: 1, key: 'address', label: 'Address' },
        { index: 2, key: 'phone', label: 'Phone' },
        { index: 3, key: 'acceptsTexts', label: 'Accepts Texts' },
        { index: 4, key: 'created', label: 'Created' },
    ];
    sortableColumns.forEach((column) => {
        const header = headers[column.index];
        if (header) {
            header.style.cursor = 'default'; // Remove pointer cursor from entire header
            header.classList.add('sortable-column'); // Add sortable-column class for styling
            header.innerHTML = `${column.label} <span class="sort-indicator" data-column="${column.key}"></span>`;

            // Only add click handler to the sort indicator, not the entire header
            const sortIndicator = header.querySelector('.sort-indicator');
            if (sortIndicator) {
                sortIndicator.style.cursor = 'pointer';
                sortIndicator.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent event bubbling
                    handlePatientSort(column.key);
                });
            }
        }
    });
}

// Handle patient table sorting
function handlePatientSort(columnKey) {
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
    } // Update sort indicators
    updatePatientSortIndicators(); // Capture current column widths before making any changes
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

// Update visual sort indicators
function updatePatientSortIndicators() {
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

// Get sorted patient list
function getSortedPatients() {
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
    }

    // Set the table to fixed layout to maintain column widths during update
    table.style.tableLayout = 'fixed';

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

// Function to adjust column widths based on content
function adjustPatientColumnWidths() {
    const table = document.querySelector('#patientsTable');
    if (!table) return;

    // Set table-layout to auto to allow content-based sizing
    table.style.tableLayout = 'auto';

    // Get all table headers
    const headers = Array.from(table.querySelectorAll('th'));

    // Use canvas for more accurate text measurement
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // Calculate optimal widths based on actual content
    headers.forEach((header, index) => {
        const cells = Array.from(
            table.querySelectorAll(`tbody tr td:nth-child(${index + 1})`)
        );

        // Remove any previous width to get natural content width
        header.style.width = '';
        cells.forEach((cell) => {
            cell.style.width = '';
        });

        // Get the content type to optimize column width
        const columnType = getPatientColumnType(header.textContent);

        let maxWidth = 80; // Minimum width

        if (context) {
            // Measure header width with canvas
            const headerStyle = window.getComputedStyle(header);
            context.font = `${headerStyle.fontWeight} ${headerStyle.fontSize} ${headerStyle.fontFamily}`;
            maxWidth = Math.max(
                context.measureText(header.textContent).width + 40,
                80
            );

            // Measure all cells in the column
            cells.forEach((cell) => {
                let cellText = '';

                // Handle different cell types properly
                if (cell.querySelector('.patient-full-name')) {
                    cellText = cell
                        .querySelector('.patient-full-name')
                        .textContent.trim();
                } else if (cell.querySelector('.accepts-texts')) {
                    cellText = cell
                        .querySelector('.accepts-texts')
                        .textContent.trim();
                } else if (cell.querySelector('.patient-actions')) {
                    cellText = '✏️ Edit 🗑️ Delete'; // Representative text for action buttons
                } else {
                    cellText = cell.textContent.trim();
                }

                if (cellText) {
                    const cellStyle = window.getComputedStyle(cell);
                    context.font = `${cellStyle.fontWeight} ${cellStyle.fontSize} ${cellStyle.fontFamily}`;
                    const cellWidth = context.measureText(cellText).width + 40; // Add padding
                    maxWidth = Math.max(maxWidth, cellWidth);
                }
            });
        } else {
            // Fallback for browsers without canvas support
            maxWidth = Math.max(header.textContent.length * 8 + 40, 80);
            cells.forEach((cell) => {
                const cellText = cell.textContent.trim();
                if (cellText) {
                    maxWidth = Math.max(maxWidth, cellText.length * 8 + 40);
                }
            });
        }

        // Apply constraints based on column type
        if (columnType === 'address') {
            maxWidth = Math.min(maxWidth, 300); // Address column max width
            maxWidth = Math.max(maxWidth, 150); // Address column min width
        } else if (columnType === 'accepts-texts') {
            maxWidth = Math.min(maxWidth, 120); // Accepts Texts column max width
        } else if (columnType === 'actions') {
            maxWidth = 120; // Actions column fixed width
        } else if (columnType === 'phone') {
            maxWidth = Math.min(maxWidth, 150); // Phone column max width
            maxWidth = Math.max(maxWidth, 120); // Phone column min width
        } else {
            maxWidth = Math.min(maxWidth, 250); // General max width
            maxWidth = Math.max(maxWidth, 100); // General min width
        }

        // Apply the calculated width
        header.style.width = `${maxWidth}px`;
    });

    // After a small delay, switch back to fixed layout for better performance
    setTimeout(() => {
        table.style.tableLayout = 'fixed';
        // Add column resize handles after setting initial widths
        addPatientColumnResizeHandles();
    }, 100);
}

// Function to determine the column type based on header text
function getPatientColumnType(headerText) {
    headerText = headerText.toLowerCase();

    if (headerText.includes('address')) {
        return 'address';
    } else if (headerText.includes('accepts texts')) {
        return 'accepts-texts';
    } else if (headerText.includes('actions')) {
        return 'actions';
    } else if (headerText.includes('created') || headerText.includes('date')) {
        return 'date';
    } else if (headerText.includes('phone')) {
        return 'phone';
    } else if (headerText.includes('name')) {
        return 'name';
    } else {
        return 'general';
    }
}

// Function to add resize handles to table columns
function addPatientColumnResizeHandles() {
    const table = document.querySelector('#patientsTable');
    if (!table) return;

    const headers = Array.from(table.querySelectorAll('th'));

    // Remove any existing resize handles
    table.querySelectorAll('.column-resize-handle').forEach((handle) => {
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
            ); // Add double-click to auto-size functionality (on both handle and header)
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

// Function to handle column resizing
function startPatientColumnResize(event, header, columnIndex) {
    // Accept both mouse and touch events
    if (event.preventDefault) event.preventDefault();

    const table = document.querySelector('#patientsTable');
    const startX = event.pageX || event.clientX; // For calculations
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

        // Throttle the resize for better performance
        if (!handlePointerMove.throttleTimer) {
            handlePointerMove.throttleTimer = setTimeout(() => {
                // Calculate new width
                const deltaX = pageX - startX;
                const newWidth = Math.max(
                    80,
                    Math.min(500, startWidth + deltaX)
                );

                // Apply the new width
                header.style.width = `${newWidth}px`;
                handle.setAttribute('aria-valuenow', newWidth);

                // Clear the throttle timer
                handlePointerMove.throttleTimer = null;
            }, 10); // 10ms throttle
        }
    }

    // Function to handle mouse/touch up (end of resize)
    function handlePointerUp(e) {
        // Remove event listeners
        document.removeEventListener('mousemove', handlePointerMove);
        document.removeEventListener('mouseup', handlePointerUp);
        document.removeEventListener('touchmove', handlePointerMove);
        document.removeEventListener('touchend', handlePointerUp);
        document.removeEventListener('touchcancel', handlePointerUp);

        // Get pageX from mouse or touch event
        const pageX =
            e.pageX ||
            (e.changedTouches && e.changedTouches[0]
                ? e.changedTouches[0].pageX
                : startX);

        // Calculate the final width with constraints
        const newWidth = Math.max(
            80,
            Math.min(500, startWidth + (pageX - startX))
        ); // Min 80px, Max 500px

        // Apply the new width to the column with a transition for smoothness
        header.style.transition = 'width 0.1s ease-out';
        header.style.width = `${newWidth}px`;

        // Update ARIA value for accessibility
        handle.setAttribute('aria-valuenow', newWidth);

        // Remove the resizing class
        table.classList.remove('resizing');

        // Remove active from handle
        handle.classList.remove('active');

        // Reset transition after width is applied
        setTimeout(() => {
            header.style.transition = '';
        }, 100); // Save column width in localStorage for persistence
        savePatientColumnWidthPreferences();

        // Announce resize completion for screen readers
        announceForScreenReader(`Column ${header.textContent.trim()} resized`);
    }

    // Add event listeners for mouse/touch movement and release
    document.addEventListener('mousemove', handlePointerMove, {
        passive: true,
    });
    document.addEventListener('mouseup', handlePointerUp);

    // Add touch event handlers
    document.addEventListener('touchmove', handlePointerMove, {
        passive: true,
    });
    document.addEventListener('touchend', handlePointerUp);
    document.addEventListener('touchcancel', handlePointerUp);
}

// Function to announce changes to screen readers
function announceForScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.classList.add('sr-only'); // Screen reader only
    announcement.textContent = message;
    document.body.appendChild(announcement);

    // Remove after announcement is made
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

// Function to auto-size a specific column
function autoSizePatientColumn(header, columnIndex) {
    const table = document.querySelector('#patientsTable');
    if (!table) return;

    // Get all cells in this column
    const cells = Array.from(
        table.querySelectorAll(`tbody tr td:nth-child(${columnIndex + 1})`)
    );

    // Remove any previous width to get natural content width
    header.style.width = '';
    cells.forEach((cell) => {
        cell.style.width = '';
    });

    // Get the content type to optimize column width
    const columnType = getPatientColumnType(header.textContent); // Use canvas for more accurate text measurement
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
        // Fallback to simple calculation if canvas is not available
        const headerText = header.textContent;
        let maxWidth = Math.max(headerText.length * 8 + 40, 80); // Rough estimation

        // Apply the calculated width
        header.style.width = `${maxWidth}px`;

        // Save and announce
        setTimeout(() => {
            table.style.tableLayout = 'fixed';
            savePatientColumnWidthPreferences();
        }, 50);

        announceForScreenReader(
            `Column ${header.textContent.trim()} automatically sized`
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
        if (cell.querySelector('.patient-full-name')) {
            cellText = cell
                .querySelector('.patient-full-name')
                .textContent.trim();
        } else if (cell.querySelector('.accepts-texts')) {
            cellText = cell.querySelector('.accepts-texts').textContent.trim();
        } else if (cell.querySelector('.patient-actions')) {
            // For action cells, measure the actual button content
            cellText = '✏️ Edit 🗑️ Delete'; // More accurate representation
        } else {
            // Get the raw text content and clean it
            cellText = cell.textContent.trim();
        }

        if (cellText) {
            // Use canvas to measure text width more accurately
            const cellStyle = window.getComputedStyle(cell);
            context.font = `${cellStyle.fontWeight} ${cellStyle.fontSize} ${cellStyle.fontFamily}`;
            const cellWidth = context.measureText(cellText).width + 40; // Add padding

            // Find the maximum width needed
            maxWidth = Math.max(maxWidth, cellWidth);
        }
    });

    // Apply constraints based on column type
    if (columnType === 'address') {
        maxWidth = Math.min(maxWidth, 300); // Address column max width
        maxWidth = Math.max(maxWidth, 150); // Address column min width
    } else if (columnType === 'accepts-texts') {
        maxWidth = Math.min(maxWidth, 120); // Accepts Texts column max width
    } else if (columnType === 'actions') {
        maxWidth = 120; // Actions column fixed width
    } else if (columnType === 'phone') {
        maxWidth = Math.min(maxWidth, 150); // Phone column max width
        maxWidth = Math.max(maxWidth, 120); // Phone column min width
    } else {
        maxWidth = Math.min(maxWidth, 250); // General max width
        maxWidth = Math.max(maxWidth, 100); // Minimum width for readability
    }

    // Apply the calculated width
    header.style.width = `${maxWidth}px`;

    // Save the updated column widths to localStorage
    setTimeout(() => {
        table.style.tableLayout = 'fixed';
        savePatientColumnWidthPreferences();
    }, 50);

    // Announce the change to screen readers
    announceForScreenReader(
        `Column ${header.textContent.trim()} automatically sized`
    );
}

// Function to save column width preferences
function savePatientColumnWidthPreferences() {
    const table = document.querySelector('#patientsTable');
    if (!table) return;

    const headers = Array.from(table.querySelectorAll('th'));
    const widths = headers.map((header) => header.style.width);

    localStorage.setItem('patientTableColumnWidths', JSON.stringify(widths));
}

// Function to load column width preferences
function loadPatientColumnWidthPreferences() {
    const table = document.querySelector('#patientsTable');
    if (!table) return;

    try {
        const savedWidths = JSON.parse(
            localStorage.getItem('patientTableColumnWidths')
        );

        if (savedWidths && Array.isArray(savedWidths)) {
            const headers = Array.from(table.querySelectorAll('th'));

            headers.forEach((header, index) => {
                if (savedWidths[index]) {
                    header.style.width = savedWidths[index];
                }
            });

            table.style.tableLayout = 'fixed';
            // Add resize handles after applying saved widths
            addPatientColumnResizeHandles();
        } else {
            // No saved preferences, run auto-sizing algorithm
            adjustPatientColumnWidths();
        }
    } catch (error) {
        console.error('Error loading patient column width preferences:', error);
        adjustPatientColumnWidths();
    }
}
