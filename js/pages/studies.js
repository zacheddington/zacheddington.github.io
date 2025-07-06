// Studies Page Module
// Contains all study-related functionality including create/manage studies

// Global state for studies management
let selectedPatientId = null;
let allPatients = [];

// Initialize studies page functionality
function initializeStudiesPage() {
    // Determine which page we're on and initialize accordingly
    const currentPage = getCurrentStudyPageType();

    switch (currentPage) {
        case 'create-study':
            initializeCreateStudyPage();
            break;
        case 'manage-studies':
            initializeManageStudiesPage();
            break;
        case 'studies-index':
        default:
            initializeStudiesIndexPage();
            break;
    }
}

// Determine current page type based on URL
function getCurrentStudyPageType() {
    const path = window.location.pathname;
    if (path.includes('/studies/create-study/')) {
        return 'create-study';
    } else if (path.includes('/studies/manage-studies/')) {
        return 'manage-studies';
    } else if (path.includes('/studies/')) {
        return 'studies-index';
    }
    return 'studies-index';
}

// Initialize the studies index page
function initializeStudiesIndexPage() {
    console.log('Studies index page initialized');
}

// Initialize the manage studies page
function initializeManageStudiesPage() {
    console.log('Manage studies page initialized');
}

// Initialize the create study page
function initializeCreateStudyPage() {
    console.log('Create study page initialized');

    // Load all patients for selection
    loadAllPatients();

    // Setup physician checkbox logic
    setupPhysicianCheckbox();

    // Setup form submission
    setupStudyFormSubmission();

    // Setup navigation buttons
    setupStudyPageNavigation();
}

// Load all patients for selection
function loadAllPatients() {
    const patientListContainer = document.getElementById('patientList');

    if (!patientListContainer) return;

    // Show loading message
    patientListContainer.innerHTML =
        '<div class="loading-message">Loading patients...</div>';

    // Fetch all patients
    fetchAllPatients();

    async function fetchAllPatients() {
        try {
            console.log('Fetching patients from /api/patients...');
            const response = await window.apiClient.apiRequest('/api/patients');
            console.log('Patients API response:', response);

            if (response.patients && response.patients.length > 0) {
                console.log(`Found ${response.patients.length} patients`);
                displayPatientList(response.patients);
            } else {
                console.log('No patients found');
                showNoPatientsMessage();
            }
        } catch (error) {
            console.error('Failed to load patients:', error);
            patientListContainer.innerHTML = `
                <div class="loading-message" style="color: var(--color-error);">
                    Failed to load patients. Please try refreshing the page.
                    <br><small>Error: ${error.message}</small>
                </div>
            `;
        }
    }

    function displayPatientList(patients) {
        const listHTML = patients
            .map((patient) => {
                const fullName = `${patient.first_name}${
                    patient.middle_name ? ' ' + patient.middle_name : ''
                } ${patient.last_name}`;
                const dateOfBirth = formatDateForDisplay(patient.date_of_birth);

                return `
                <div class="patient-list-item" data-patient-id="${
                    patient.patient_key
                }">
                    <div>
                        <div class="patient-name">${escapeHtml(fullName)}</div>
                        <div class="patient-info">DOB: ${dateOfBirth}</div>
                    </div>
                    <div class="patient-select-btn">
                        <button type="button" class="btn btn-primary btn-sm">Select</button>
                    </div>
                </div>
            `;
            })
            .join('');

        patientListContainer.innerHTML = listHTML;

        // Add click handlers for patient selection
        patientListContainer.addEventListener('click', function (e) {
            const patientItem = e.target.closest('.patient-list-item');
            if (patientItem) {
                const patientId = patientItem.dataset.patientId;
                const patientData = patients.find(
                    (p) => p.patient_key.toString() === patientId
                );
                if (patientData) {
                    selectPatientFromList(patientData);
                }
            }
        });
    }

    function showNoPatientsMessage() {
        patientListContainer.innerHTML = `
            <div class="no-patients-message">
                <p>No patients found in the system.</p>
                <p><a href="/patients/create-patient/">Create a new patient</a> first before creating a study.</p>
            </div>
        `;
    }
}

// Select a patient from the list for the study
function selectPatientFromList(patientData) {
    selectedPatientId = patientData.patient_key;

    const fullName = `${patientData.first_name}${
        patientData.middle_name ? ' ' + patientData.middle_name : ''
    } ${patientData.last_name}`;
    const dateOfBirth = formatDateForDisplay(patientData.date_of_birth);
    const phone = patientData.phone
        ? formatPhoneNumber(patientData.phone)
        : 'No phone';

    const patientListContainer = document.getElementById('patientList');
    const selectedPatientContainer = document.getElementById(
        'selectedPatientInfo'
    );
    const studyForm = document.getElementById('createStudyForm');

    // Mark the selected patient in the list
    const allItems =
        patientListContainer.querySelectorAll('.patient-list-item');
    allItems.forEach((item) => item.classList.remove('selected'));

    const selectedItem = patientListContainer.querySelector(
        `[data-patient-id="${patientData.patient_key}"]`
    );
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }

    // Show selected patient info
    selectedPatientContainer.innerHTML = `
        <div class="selected-patient">
            <div class="selected-patient-header">
                <h4>Selected Patient</h4>
                <button type="button" class="btn btn-link" onclick="clearPatientSelection()">Change Patient</button>
            </div>
            <div class="selected-patient-details">
                <div class="patient-detail">
                    <strong>Name:</strong> ${escapeHtml(fullName)}
                </div>
                <div class="patient-detail">
                    <strong>Date of Birth:</strong> ${dateOfBirth}
                </div>
                <div class="patient-detail">
                    <strong>Phone:</strong> ${phone}
                </div>
            </div>
        </div>
    `;
    selectedPatientContainer.classList.remove('hidden');

    // Show study form
    studyForm.classList.remove('hidden');
}

// Clear patient selection
// Clear patient selection and return to patient list
function clearPatientSelection() {
    selectedPatientId = null;

    const patientListContainer = document.getElementById('patientList');
    const selectedPatientContainer = document.getElementById(
        'selectedPatientInfo'
    );
    const studyForm = document.getElementById('createStudyForm');

    // Remove selection from patient list
    const allItems =
        patientListContainer.querySelectorAll('.patient-list-item');
    allItems.forEach((item) => item.classList.remove('selected'));

    // Hide selected patient info and form
    selectedPatientContainer.classList.add('hidden');
    studyForm.classList.add('hidden');
}

// Setup physician checkbox logic
function setupPhysicianCheckbox() {
    const samePhysicianCheckbox = document.getElementById('samePhysician');
    const referringPhysicianInput =
        document.getElementById('referringPhysician');
    const interpretingPhysicianInput = document.getElementById(
        'interpretingPhysician'
    );

    if (
        !samePhysicianCheckbox ||
        !referringPhysicianInput ||
        !interpretingPhysicianInput
    )
        return;

    samePhysicianCheckbox.addEventListener('change', function () {
        if (this.checked) {
            // Copy referring physician to interpreting physician
            interpretingPhysicianInput.value = referringPhysicianInput.value;
            interpretingPhysicianInput.disabled = true;
            interpretingPhysicianInput.setAttribute('readonly', true);
        } else {
            // Enable interpreting physician field
            interpretingPhysicianInput.disabled = false;
            interpretingPhysicianInput.removeAttribute('readonly');
        }
    });

    // Also update interpreting physician when referring physician changes and checkbox is checked
    referringPhysicianInput.addEventListener('input', function () {
        if (samePhysicianCheckbox.checked) {
            interpretingPhysicianInput.value = this.value;
        }
    });
}

// Setup date validation using shared date utilities
function setupDateValidation() {
    const startDateInput = document.getElementById('startDate');

    if (!startDateInput) return;

    // Use shared date field validation if available
    if (window.fieldValidation && window.fieldValidation.setupDateField) {
        window.fieldValidation.setupDateField(startDateInput);
    } else {
        // Fallback date validation
        startDateInput.addEventListener('input', function () {
            const value = this.value;
            const isValid =
                /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/.test(
                    value
                );

            if (value && !isValid) {
                this.setCustomValidity(
                    'Please enter date in MM/DD/YYYY format'
                );
            } else {
                this.setCustomValidity('');
            }
        });
    }
}

// Setup study form submission
function setupStudyFormSubmission() {
    const form = document.getElementById('createStudyForm');

    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (!selectedPatientId) {
            alert('Please select a patient before creating the study.');
            return;
        }

        // Collect form data
        const formData = {
            patientId: selectedPatientId,
            referringPhysician: document
                .getElementById('referringPhysician')
                .value.trim(),
            interpretingPhysician: document
                .getElementById('interpretingPhysician')
                .value.trim(),
            startDate: document.getElementById('startDate').value.trim(),
            studyLength: parseInt(document.getElementById('studyLength').value),
        };

        // Validate form data
        if (
            !formData.referringPhysician ||
            !formData.interpretingPhysician ||
            !formData.startDate ||
            !formData.studyLength
        ) {
            alert('Please fill in all required fields.');
            return;
        }

        if (formData.studyLength < 1 || formData.studyLength > 4) {
            alert('Study length must be between 1 and 4 days.');
            return;
        }

        // Validate datetime input
        const startDateTime = new Date(formData.startDate);
        if (isNaN(startDateTime.getTime())) {
            alert('Please enter a valid start date and time.');
            return;
        }

        // Check if the date is in the future (optional validation)
        const now = new Date();
        if (startDateTime < now) {
            const proceed = confirm(
                'The selected start date is in the past. Do you want to continue?'
            );
            if (!proceed) return;
        }

        try {
            // Show loading modal
            if (window.modalManager && window.modalManager.showModal) {
                window.modalManager.showModal('loadingModal');
            }

            // Submit study creation request
            const response = await window.apiClient.apiRequest('/api/studies', {
                method: 'POST',
                body: JSON.stringify(formData),
            });

            if (response.success) {
                alert('Study created successfully!');
                // Redirect to studies management or clear form
                window.location.href = '/studies/';
            } else {
                throw new Error(response.message || 'Failed to create study');
            }
        } catch (error) {
            console.error('Study creation error:', error);
            alert(
                'Error creating study: ' +
                    (error.message || 'Please try again.')
            );
        } finally {
            // Hide loading modal
            if (window.modalManager && window.modalManager.hideModal) {
                window.modalManager.hideModal('loadingModal');
            }
        }
    });
}

// Setup navigation buttons
function setupStudyPageNavigation() {
    const cancelBtn = document.getElementById('cancelCreateStudy');
    const backBtn = document.getElementById('backToStudyChoice');

    if (cancelBtn) {
        cancelBtn.addEventListener('click', function () {
            if (
                confirm(
                    'Are you sure you want to cancel? All entered data will be lost.'
                )
            ) {
                window.location.href = '/studies/';
            }
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', function () {
            window.location.href = '/studies/';
        });
    }
}

// Utility function to format phone numbers (reuse from patients.js logic)
function formatPhoneNumber(phone) {
    if (!phone) return 'No phone';

    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX for 10-digit numbers
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(
            6
        )}`;
    }

    // Return as-is for other lengths
    return phone;
}

// Utility function to format date for display (reuse from patients.js logic)
function formatDateForDisplay(dateString) {
    if (!dateString) return 'Not provided';

    try {
        // Use the unified date utils for consistent formatting
        if (window.dateUtils && window.dateUtils.convertFromISODate) {
            return window.dateUtils.convertFromISODate(dateString);
        }

        // Fallback for legacy support
        const dateParts = dateString.split('T')[0].split('-');
        if (dateParts.length === 3) {
            const year = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]) - 1;
            const day = parseInt(dateParts[2]);
            const date = new Date(year, month, day);
            return date.toLocaleDateString();
        }
        return 'Invalid date';
    } catch (error) {
        console.warn('Date formatting error');
        return 'Invalid date';
    }
}

// Utility function to escape HTML characters
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions available globally
window.studiesPage = {
    initializeStudiesPage,
    initializeCreateStudyPage,
    initializeManageStudiesPage,
    selectPatientFromList,
    clearPatientSelection,
};

// Also expose individual functions for backward compatibility
window.selectPatientFromList = selectPatientFromList;
window.clearPatientSelection = clearPatientSelection;
