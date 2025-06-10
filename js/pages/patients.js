// Patients Page Module
// Contains all patient-related functionality including create/manage/navigation

// Global state for patient management
let allPatients = [];
let currentPatientSort = { column: null, direction: null };

// Initialize patients page functionality
function initializePatientsPage() {
    // Navigation handlers
    setupPatientsNavigation();
    
    // Form handlers
    setupCreatePatientForm();
    
    // Load hamburger menu
    if (document.getElementById('hamburger-menu')) {
        loadMenu();
    }
}

// Set up navigation between patient sections
function setupPatientsNavigation() {
    // Main patient choice buttons
    const createPatientBtn = document.getElementById('createPatientBtn');
    const managePatientBtn = document.getElementById('managePatientBtn');
    
    // Back buttons
    const backToChoiceFromCreate = document.getElementById('backToChoiceFromCreate');
    const backToChoiceFromManage = document.getElementById('backToChoiceFromManage');
    
    // Section elements
    const patientChoice = document.getElementById('patientChoice');
    const createPatientSection = document.getElementById('createPatientSection');
    const managePatientsSection = document.getElementById('managePatientsSection');
    
    if (createPatientBtn) {
        createPatientBtn.addEventListener('click', function() {
            patientChoice.classList.add('hidden');
            createPatientSection.classList.remove('hidden');
            clearCreatePatientErrors();
        });
    }
    
    if (managePatientBtn) {
        managePatientBtn.addEventListener('click', function() {
            patientChoice.classList.add('hidden');
            managePatientsSection.classList.remove('hidden');
            loadPatients();
            setupPatientFilter();
        });
    }
    
    if (backToChoiceFromCreate) {
        backToChoiceFromCreate.addEventListener('click', function() {
            createPatientSection.classList.add('hidden');
            patientChoice.classList.remove('hidden');
            // Clear form when going back
            const form = document.getElementById('createPatientForm');
            if (form) form.reset();
            clearCreatePatientErrors();
        });
    }
    
    if (backToChoiceFromManage) {
        backToChoiceFromManage.addEventListener('click', function() {
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
    createPatientForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        await createPatient();
    });
}

// Set up field validation for patient creation form
function setupCreatePatientFieldValidation() {
    const createPatientFields = [
        { id: 'patientFirstName', maxLength: 50, label: 'First name' },
        { id: 'patientMiddleName', maxLength: 50, label: 'Middle name' },
        { id: 'patientLastName', maxLength: 50, label: 'Last name' },
        { id: 'patientAddress', maxLength: 100, label: 'Address' }
    ];
    
    createPatientFields.forEach(field => {
        const input = document.getElementById(field.id);
        if (input) {
            // Character count prevention
            input.addEventListener('input', function(e) {
                if (e.target.value.length > field.maxLength) {
                    e.target.value = e.target.value.substring(0, field.maxLength);
                    window.fieldValidation.showCharacterLimitModal(field.label, field.maxLength);
                }
            });
            
            // Paste prevention for overlength content
            input.addEventListener('paste', function(e) {
                setTimeout(() => {
                    if (e.target.value.length > field.maxLength) {
                        e.target.value = e.target.value.substring(0, field.maxLength);
                        window.fieldValidation.showCharacterLimitModal(field.label, field.maxLength);
                    }
                }, 0);
            });
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
            middleName: document.getElementById('patientMiddleName').value.trim(),
            lastName: document.getElementById('patientLastName').value.trim(),
            address: document.getElementById('patientAddress').value.trim(),
            phone: document.getElementById('patientPhone').value.trim(),
            acceptsTexts: document.getElementById('acceptsTexts').value
        };
        
        // Validate required fields
        if (!formData.firstName || !formData.lastName || !formData.address || !formData.phone || !formData.acceptsTexts) {
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
        
        // Validate phone number (basic validation for 10 digits)
        const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
        if (!phoneRegex.test(formData.phone)) {
            throw new Error('Please enter a valid 10-digit phone number.');
        }
        
        const token = localStorage.getItem('token');
        const API_URL = window.apiClient.getAPIUrl();
        
        response = await fetch(`${API_URL}/api/patients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
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
            window.modalManager.showModal('success', successMessage);
            
            // Redirect back to patient choice page after brief delay
            setTimeout(() => {
                window.modalManager.closeModal();
                // Navigate back to main patient page
                document.getElementById('createPatientSection').classList.add('hidden');
                document.getElementById('patientChoice').classList.remove('hidden');
            }, 2500);
            
            // Refresh patients if we're on manage patients section
            if (typeof loadPatients === 'function' && !document.getElementById('managePatientsSection').classList.contains('hidden')) {
                setTimeout(() => {
                    loadPatients();
                }, 1000);
            }
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
    const createPatientSection = document.getElementById('createPatientSection');
    window.fieldValidation.showSectionMessage(createPatientSection, message, 'error');
}

// Clear patient creation errors
function clearCreatePatientErrors() {
    const createPatientSection = document.getElementById('createPatientSection');
    
    // Clear section-level error messages
    const errorMessage = createPatientSection.querySelector('.section-message.error');
    if (errorMessage) {
        errorMessage.remove();
    }
    
    // Clear field-level errors
    const errorGroups = createPatientSection.querySelectorAll('.form-group.error');
    errorGroups.forEach(group => {
        group.classList.remove('error');
        const errorMsg = group.querySelector('.error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    });
    
    // Clear success states
    const successGroups = createPatientSection.querySelectorAll('.form-group.success');
    successGroups.forEach(group => {
        group.classList.remove('success');
        const successMsg = group.querySelector('.success-message');
        if (successMsg) {
            successMsg.remove();
        }
    });
    
    // Update field states using the field state manager
    if (window.fieldStateManager) {
        const allFields = createPatientSection.querySelectorAll('input[type="text"], input[type="tel"], select');
        allFields.forEach(field => {
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
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            allPatients = await response.json();
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
            patientsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #dc3545;">Error loading patients. Please try again.</td></tr>';
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
        { index: 4, key: 'created', label: 'Created' }
    ];
    
    sortableColumns.forEach(column => {
        const header = headers[column.index];
        if (header) {
            header.style.cursor = 'pointer';
            header.innerHTML = `${column.label} <span class="sort-indicator" data-column="${column.key}"></span>`;
            header.addEventListener('click', () => handlePatientSort(column.key));
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
    }
    
    // Update sort indicators
    updatePatientSortIndicators();
    
    // Sort and display patients
    const sortedPatients = getSortedPatients();
    displayPatients(sortedPatients);
}

// Update visual sort indicators
function updatePatientSortIndicators() {
    const indicators = document.querySelectorAll('.sort-indicator');
    
    indicators.forEach(indicator => {
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
        
        if (aValue < bValue) return currentPatientSort.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return currentPatientSort.direction === 'asc' ? 1 : -1;
        return 0;
    });
}

// Display patients in the table
function displayPatients(patients) {
    const patientsTableBody = document.getElementById('patientsTableBody');
    const noPatientsFound = document.getElementById('noPatientsFound');
    
    if (!patientsTableBody) return;
    
    if (patients.length === 0) {
        patientsTableBody.innerHTML = '';
        if (noPatientsFound) noPatientsFound.classList.remove('hidden');
        return;
    }
    
    if (noPatientsFound) noPatientsFound.classList.add('hidden');
    
    patientsTableBody.innerHTML = patients.map(patient => {
        const fullName = patient.middle_name 
            ? `${patient.first_name} ${patient.middle_name} ${patient.last_name}`
            : `${patient.first_name} ${patient.last_name}`;
        
        const acceptsTexts = patient.accepts_texts ? 'Yes' : 'No';
        const acceptsTextsClass = patient.accepts_texts ? 'yes' : 'no';
        
        const createdDate = new Date(patient.created_at).toLocaleDateString();
        
        return `
            <tr data-patient-id="${patient.patient_key}">
                <td>
                    <div class="patient-name">
                        <div class="patient-full-name">${fullName}</div>
                    </div>
                </td>
                <td>${patient.address || ''}</td>
                <td>${patient.phone || ''}</td>
                <td>
                    <span class="accepts-texts ${acceptsTextsClass}">
                        ${acceptsTexts}
                    </span>
                </td>
                <td class="patient-created">${createdDate}</td>
                <td>
                    <div class="patient-actions">
                        <button class="btn-icon btn-edit" onclick="editPatient(${patient.patient_key})" title="Edit Patient">
                            ✏️
                        </button>
                        <button class="btn-icon btn-delete" onclick="deletePatient(${patient.patient_key}, '${fullName}')" title="Delete Patient">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Filter patients based on search input
function filterPatients() {
    const filterValue = document.getElementById('patientFilter').value.toLowerCase();
    
    if (!filterValue.trim()) {
        const sortedPatients = getSortedPatients();
        displayPatients(sortedPatients);
        return;
    }
    
    const filteredPatients = allPatients.filter(patient => {
        const fullName = patient.middle_name 
            ? `${patient.first_name} ${patient.middle_name} ${patient.last_name}`
            : `${patient.first_name} ${patient.last_name}`;
        
        return fullName.toLowerCase().includes(filterValue) ||
               (patient.phone && patient.phone.includes(filterValue)) ||
               (patient.address && patient.address.toLowerCase().includes(filterValue));
    });
    
    displayPatients(filteredPatients);
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
    console.log('Edit patient functionality not yet implemented for ID:', patientId);
    window.modalManager.showModal('info', 'Patient editing functionality will be implemented in a future update.');
}

function deletePatient(patientId, patientName) {
    console.log('Delete patient functionality not yet implemented for ID:', patientId);
    window.modalManager.showModal('info', 'Patient deletion functionality will be implemented in a future update.');
}

// Expose functions to global scope
window.patientsPage = {
    initializePatientsPage,
    setupPatientsNavigation,
    loadPatients,
    filterPatients,
    editPatient,
    deletePatient
};
