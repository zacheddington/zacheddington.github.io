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
    }

    // Add event listener for window resize to adjust column widths
    window.addEventListener('resize', debounce(function() {
        // Only auto-adjust if no saved preferences
        if (!localStorage.getItem('patientTableColumnWidths')) {
            adjustPatientColumnWidths();
        } else {
            // Just refresh resize handles
            addPatientColumnResizeHandles();
        }
    }, 250));

    // Add a reset columns button to the filter actions
    const filterActions = document.querySelector('.filter-actions');
    if (filterActions) {
        const resetColumnsBtn = document.createElement('button');
        resetColumnsBtn.type = 'button';
        resetColumnsBtn.className = 'secondary-btn';
        resetColumnsBtn.id = 'resetPatientColumns';
        resetColumnsBtn.textContent = 'Reset Columns';
        resetColumnsBtn.addEventListener('click', function() {
            localStorage.removeItem('patientTableColumnWidths');
            adjustPatientColumnWidths();
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
            displayPatients(sortedPatients);
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
            header.style.cursor = 'pointer';
            header.innerHTML = `${column.label} <span class="sort-indicator" data-column="${column.key}"></span>`;
            header.addEventListener('click', () =>
                handlePatientSort(column.key)
            );
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
    updatePatientSortIndicators();

    // Sort and display patients
    const sortedPatients = getSortedPatients();
    displayPatients(sortedPatients);

    // Adjust column widths after sorting
    setTimeout(adjustPatientColumnWidths, 100);
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
}

// Filter patients based on search input
function filterPatients() {
    const filterValue = document
        .getElementById('patientFilter')
        .value.toLowerCase();

    if (!filterValue.trim()) {
        const sortedPatients = getSortedPatients();
        displayPatients(sortedPatients);
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

    displayPatients(filteredPatients);

    // Adjust column widths based on content after filtering
    setTimeout(adjustPatientColumnWidths, 100);
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

        // Create a hidden span to measure actual text width
        const measureElement = document.createElement('span');
        measureElement.style.visibility = 'hidden';
        measureElement.style.position = 'absolute';
        measureElement.style.whiteSpace = 'nowrap';
        measureElement.style.font = window.getComputedStyle(header).font;
        document.body.appendChild(measureElement);

        // Measure header width
        measureElement.textContent = header.textContent;
        let maxWidth = measureElement.offsetWidth + 40; // Add padding

        // Measure all cells in the column
        cells.forEach((cell) => {
            measureElement.textContent = cell.textContent;
            const cellWidth = measureElement.offsetWidth + 40; // Add padding

            // Update maxWidth if needed, with limits based on column type
            if (cellWidth > maxWidth) {
                if (columnType === 'address') {
                    maxWidth = Math.min(cellWidth, 300); // Address column can be wider
                } else if (columnType === 'accepts-texts') {
                    maxWidth = Math.min(cellWidth, 120); // Accepts Texts column should be compact
                } else if (columnType === 'actions') {
                    maxWidth = Math.min(cellWidth, 120); // Actions column has fixed size elements
                } else if (columnType === 'date') {
                    maxWidth = Math.min(cellWidth, 120); // Date column has fixed format
                } else if (columnType === 'phone') {
                    maxWidth = Math.min(cellWidth, 150); // Phone column has fixed format
                } else {
                    maxWidth = Math.min(cellWidth, 200); // General limit for other columns
                }
            }
        });

        // Apply the calculated width
        header.style.width = `${maxWidth}px`;
        header.style.minWidth = `${columnType === 'address' ? 150 : 80}px`; // Ensure minimum widths

        // Clean up
        document.body.removeChild(measureElement);
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
            header.appendChild(resizeHandle);

            // Add tooltip to indicate resizable column
            header.setAttribute('title', 'Drag to resize column');

            // Add resize listeners
            resizeHandle.addEventListener('mousedown', function (e) {
                startPatientColumnResize(e, header, index);
            });
        }
    });
}

// Function to handle column resizing
function startPatientColumnResize(event, header, columnIndex) {
    event.preventDefault();

    const table = document.querySelector('#patientsTable');
    const startX = event.pageX;
    const startWidth = header.offsetWidth;

    // Add resizing class to table
    table.classList.add('resizing');

    // Mark the handle as active
    event.target.classList.add('active');

    // Create and show a resize guide line
    const resizeGuide = document.createElement('div');
    resizeGuide.style.position = 'absolute';
    resizeGuide.style.top = '0';
    resizeGuide.style.bottom = '0';
    resizeGuide.style.width = '2px';
    resizeGuide.style.backgroundColor = 'var(--color-primary)';
    resizeGuide.style.opacity = '0.7';
    resizeGuide.style.left = `${event.pageX}px`;
    resizeGuide.style.zIndex = '1000';
    document.body.appendChild(resizeGuide);

    // Function to handle mouse movement during resize
    function handleMouseMove(e) {
        // Update guide position
        resizeGuide.style.left = `${e.pageX}px`;

        // Don't apply width during move for smoother performance
        // Just show the guide
    }

    // Function to handle mouse up (end of resize)
    function handleMouseUp(e) {
        // Remove event listeners
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);

        // Calculate the final width
        const newWidth = Math.max(80, startWidth + (e.pageX - startX)); // Minimum 80px width

        // Apply the new width to the column
        header.style.width = `${newWidth}px`;

        // Remove the resize guide
        document.body.removeChild(resizeGuide);

        // Remove the resizing class
        table.classList.remove('resizing');

        // Remove active from handle
        event.target.classList.remove('active');

        // Save column width in localStorage for persistence
        savePatientColumnWidthPreferences();
    }

    // Add event listeners for mouse movement and release
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
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
