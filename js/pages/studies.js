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

    // Setup patient search functionality
    setupPatientSearch();

    // Setup physician checkbox logic
    setupPhysicianCheckbox();

    // Setup date validation
    setupDateValidation();

    // Setup form submission
    setupStudyFormSubmission();

    // Setup navigation buttons
    setupStudyPageNavigation();
}

// Setup patient search functionality
function setupPatientSearch() {
    const searchInput = document.getElementById('patientSearch');
    const resultsContainer = document.getElementById('patientSearchResults');
    const selectedPatientContainer = document.getElementById(
        'selectedPatientInfo'
    );
    const studyForm = document.getElementById('createStudyForm');

    if (!searchInput) return;

    let searchTimeout;

    searchInput.addEventListener('input', function () {
        const query = this.value.trim();

        // Clear previous timeout
        clearTimeout(searchTimeout);

        if (query.length < 2) {
            resultsContainer.classList.add('hidden');
            return;
        }

        // Debounce search
        searchTimeout = setTimeout(() => {
            searchPatients(query);
        }, 300);
    });

    async function searchPatients(query) {
        try {
            resultsContainer.innerHTML =
                '<div class="loading-message">Searching patients...</div>';
            resultsContainer.classList.remove('hidden');

            const response = await window.apiClient.get(
                `/api/patients?search=${encodeURIComponent(query)}&limit=10`
            );

            if (response.patients && response.patients.length > 0) {
                displayPatientResults(response.patients);
            } else {
                resultsContainer.innerHTML =
                    '<div class="no-results">No patients found matching your search.</div>';
            }
        } catch (error) {
            console.error('Patient search error:', error);
            resultsContainer.innerHTML =
                '<div class="error-message">Error searching patients. Please try again.</div>';
        }
    }

    function displayPatientResults(patients) {
        const resultsHtml = patients
            .map((patient) => {
                const fullName = patient.middle_name
                    ? `${patient.first_name} ${patient.middle_name} ${patient.last_name}`
                    : `${patient.first_name} ${patient.last_name}`;

                const formattedPhone = patient.phone
                    ? formatPhoneNumber(patient.phone)
                    : 'No phone';
                const dateOfBirth = formatDateForDisplay(patient.date_of_birth);

                return `
                <div class="patient-result" data-patient-id="${
                    patient.patient_key
                }" onclick="selectPatient(${
                    patient.patient_key
                }, '${fullName.replace(
                    /'/g,
                    "\\'"
                )}', '${formattedPhone}', '${dateOfBirth}')">
                    <div class="patient-result-name">${fullName}</div>
                    <div class="patient-result-details">
                        <span>DOB: ${dateOfBirth}</span>
                        <span>Phone: ${formattedPhone}</span>
                    </div>
                </div>
            `;
            })
            .join('');

        resultsContainer.innerHTML = `
            <div class="search-results-header">Select a patient:</div>
            ${resultsHtml}
        `;
    }
}

// Select a patient for the study
function selectPatient(patientId, patientName, phone, dateOfBirth) {
    selectedPatientId = patientId;

    const resultsContainer = document.getElementById('patientSearchResults');
    const selectedPatientContainer = document.getElementById(
        'selectedPatientInfo'
    );
    const studyForm = document.getElementById('createStudyForm');
    const searchInput = document.getElementById('patientSearch');

    // Hide search results
    resultsContainer.classList.add('hidden');

    // Show selected patient info
    selectedPatientContainer.innerHTML = `
        <div class="selected-patient">
            <div class="selected-patient-header">
                <h4>Selected Patient</h4>
                <button type="button" class="btn btn-link" onclick="clearPatientSelection()">Change Patient</button>
            </div>
            <div class="selected-patient-details">
                <div class="patient-detail">
                    <strong>Name:</strong> ${patientName}
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

    // Clear and disable search input
    searchInput.value = '';
    searchInput.disabled = true;
}

// Clear patient selection
function clearPatientSelection() {
    selectedPatientId = null;

    const resultsContainer = document.getElementById('patientSearchResults');
    const selectedPatientContainer = document.getElementById(
        'selectedPatientInfo'
    );
    const studyForm = document.getElementById('createStudyForm');
    const searchInput = document.getElementById('patientSearch');

    // Hide selected patient and form
    selectedPatientContainer.classList.add('hidden');
    studyForm.classList.add('hidden');
    resultsContainer.classList.add('hidden');

    // Re-enable search input
    searchInput.disabled = false;
    searchInput.focus();
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

        if (formData.studyLength < 1 || formData.studyLength > 365) {
            alert('Study length must be between 1 and 365 days.');
            return;
        }

        try {
            // Show loading modal
            if (window.modalManager && window.modalManager.showModal) {
                window.modalManager.showModal('loadingModal');
            }

            // Submit study creation request
            const response = await window.apiClient.post(
                '/api/studies',
                formData
            );

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
    if (!phone) return '';

    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(
            6
        )}`;
    }

    return phone; // Return original if not 10 digits
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

// Make functions available globally
window.studiesPage = {
    initializeStudiesPage,
    initializeCreateStudyPage,
    initializeManageStudiesPage,
    selectPatient,
    clearPatientSelection,
};

// Also expose individual functions for backward compatibility
window.selectPatient = selectPatient;
window.clearPatientSelection = clearPatientSelection;
