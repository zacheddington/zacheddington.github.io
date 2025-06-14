// Admin Page Module
// Handles all admin page functionality including user management

// Global variables for admin page
let allUsers = [];
let currentRoles = [];
let currentSort = { column: null, direction: null };

// Initialize admin page
function initializeAdminPage() {
    // Determine which page we're on and initialize accordingly
    const currentPage = getCurrentPageType();

    switch (currentPage) {
        case 'create-user':
            initializeCreateUserPage();
            break;
        case 'manage-users':
            initializeManageUsersPage();
            break;
        case 'admin-index':
        default:
            initializeAdminIndexPage();
            break;
    }
}

// Determine current page type based on URL or page elements
function getCurrentPageType() {
    const path = window.location.pathname;
    if (path.includes('/admin/create-user/')) {
        return 'create-user';
    } else if (path.includes('/admin/manage-users/')) {
        return 'manage-users';
    } else if (path.includes('/admin/')) {
        return 'admin-index';
    }
    return 'admin-index';
}

// Initialize the admin index page (choice page)
function initializeAdminIndexPage() {
    // No specific initialization needed for choice page
    console.log('Admin index page initialized');
}

// Initialize the create user page
function initializeCreateUserPage() {
    // Load roles for dropdown
    loadRoles();

    // Setup create user form
    setupCreateUserForm();

    console.log('Create user page initialized');
}

// Initialize the manage users page
function initializeManageUsersPage() {
    // Load users and setup user management
    loadUsers();
    loadRolesForUserManagement();
    setupUserFilter();

    // Apply column preferences or auto-size if no preferences exist
    try {
        loadColumnWidthPreferences();
    } catch (e) {
        console.error('Error loading column preferences:', e);
        adjustColumnWidths();
    } // Add event listener for window resize to adjust column widths
    window.addEventListener(
        'resize',
        debounce(function () {
            // Only auto-adjust if no saved preferences
            if (!localStorage.getItem('userTableColumnWidths')) {
                adjustColumnWidths();
            } else {
                // For responsive tables, check if we've crossed a breakpoint
                const width = window.innerWidth;
                if (
                    !window.lastWidth ||
                    (width < 480 && window.lastWidth >= 480) ||
                    (width >= 480 &&
                        width < 768 &&
                        (window.lastWidth < 480 || window.lastWidth >= 768)) ||
                    (width >= 768 && window.lastWidth < 768)
                ) {
                    // We've crossed a responsive breakpoint, adjust columns
                    adjustColumnWidths();
                } else {
                    // Just refresh resize handles
                    addColumnResizeHandles();
                }
            }
            window.lastWidth = window.innerWidth;
        }, 250)
    );

    // Add a reset columns button to the filter actions
    const filterActions = document.querySelector('.filter-actions');
    if (filterActions) {
        const resetColumnsBtn = document.createElement('button');
        resetColumnsBtn.type = 'button';
        resetColumnsBtn.className = 'secondary-btn';
        resetColumnsBtn.id = 'resetColumns';
        resetColumnsBtn.textContent = 'Reset Columns';
        resetColumnsBtn.title =
            'Reset all column widths to optimal size based on content';
        resetColumnsBtn.addEventListener('click', function () {
            localStorage.removeItem('userTableColumnWidths');
            adjustColumnWidths();
            // Announce to screen readers
            announceForScreenReader(
                'Table columns have been reset to optimal width'
            );
        });
        filterActions.appendChild(resetColumnsBtn);
    }

    console.log('Manage users page initialized');
}

// Function to set up table for resizing (simplified)
function adjustColumnWidths() {
    const table = document.querySelector('.users-table');
    if (!table) return;

    // Use auto layout to allow table to expand beyond container width
    table.style.tableLayout = 'auto';
    table.style.minWidth = 'max-content'; // Allow table to expand as needed

    // Add column resize handles
    addColumnResizeHandles();
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

// Helper function to show loading state during API operations
function setUserActionLoading(userId, isLoading) {
    const userRow = document.querySelector(`tr[data-user-id="${userId}"]`);
    if (!userRow) return;

    const actionButtons = userRow.querySelectorAll('.user-actions button');
    const roleSelect = userRow.querySelector('.role-select');

    if (isLoading) {
        actionButtons.forEach((btn) => {
            btn.disabled = true;
            btn.style.opacity = '0.6';
        });
        if (roleSelect) {
            roleSelect.disabled = true;
            roleSelect.style.opacity = '0.6';
        }
    } else {
        actionButtons.forEach((btn) => {
            btn.disabled = false;
            btn.style.opacity = '1';
        });
        if (roleSelect) {
            roleSelect.disabled = false;
            roleSelect.style.opacity = '1';
        }
    }
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

// Setup admin navigation
function setupAdminNavigation() {
    const adminChoice = document.getElementById('adminChoice');
    const createUserSection = document.getElementById('createUserSection');
    const manageUsersSection = document.getElementById('manageUsersSection');

    // Choice button handlers
    const createUserBtn = document.getElementById('createUserBtn');
    const manageUsersBtn = document.getElementById('manageUsersBtn');

    if (createUserBtn) {
        createUserBtn.addEventListener('click', function () {
            adminChoice.classList.add('hidden');
            createUserSection.classList.remove('hidden');
        });
    }

    if (manageUsersBtn) {
        manageUsersBtn.addEventListener('click', function () {
            adminChoice.classList.add('hidden');
            manageUsersSection.classList.remove('hidden');
            // Load users and setup user management
            loadUsers();
            loadRolesForUserManagement();
            setupUserFilter();
        });
    }
    // Cancel button handler
    document
        .getElementById('cancelCreateUser')
        ?.addEventListener('click', function () {
            createUserSection.classList.add('hidden');
            adminChoice.classList.remove('hidden');
            document.getElementById('createUserForm')?.reset();
            clearCreateUserErrors();
        });

    // Back button handlers
    document
        .getElementById('backToChoiceFromCreateUser')
        ?.addEventListener('click', function () {
            createUserSection.classList.add('hidden');
            adminChoice.classList.remove('hidden');
            document.getElementById('createUserForm')?.reset();
            clearCreateUserErrors();
        });

    document
        .getElementById('backToChoiceFromManageUsers')
        ?.addEventListener('click', function () {
            manageUsersSection.classList.add('hidden');
            adminChoice.classList.remove('hidden');
        });
}

// Load roles for dropdown
async function loadRoles() {
    try {
        const API_URL = getAPIUrl();
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_URL}/api/roles`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (response.ok) {
            const result = await response.json();
            const roles = result.data; // Extract data from response object
            const roleSelect = document.getElementById('userRole');
            if (roleSelect) {
                // Clear existing options except the placeholder
                roleSelect.innerHTML =
                    '<option value="">Select a role...</option>';

                // Add role options
                roles.forEach((role) => {
                    const option = document.createElement('option');
                    option.value = role.role_key;
                    option.textContent = role.role_name;
                    roleSelect.appendChild(option);
                });
            }
        } else {
            console.error('Failed to load roles');
        }
    } catch (error) {
        console.error('Error loading roles:', error);
    }
}

// Setup create user form
function setupCreateUserForm() {
    const createUserForm = document.getElementById('createUserForm');
    if (!createUserForm) return;

    // Get form elements
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const newUsername = document.getElementById('newUsername');

    // Add password strength indicator for create user form
    if (newPassword) {
        addPasswordStrengthIndicator(newPassword);
    }

    // Real-time password confirmation validation
    if (newPassword && confirmPassword) {
        confirmPassword.addEventListener('input', function () {
            validatePasswordMatch();
            // Update field states
            if (window.fieldStateManager) {
                window.fieldStateManager.updateFieldState(confirmPassword);
            }
        });

        newPassword.addEventListener('input', function () {
            validatePasswordMatch();
            updatePasswordStrength(newPassword.value, newPassword.id);
            // Update field states
            if (window.fieldStateManager) {
                window.fieldStateManager.updateFieldState(newPassword);
            }
        });
    } // Username availability checking (debounced)
    if (newUsername) {
        let usernameTimeout;
        newUsername.addEventListener('input', function () {
            // Clear previous validation state when user types
            clearUsernameValidation();

            clearTimeout(usernameTimeout);
            usernameTimeout = setTimeout(() => {
                checkUsernameAvailability(newUsername.value.trim());
            }, 500);
            // Update field states
            if (window.fieldStateManager) {
                window.fieldStateManager.updateFieldState(newUsername);
            }
        });
    }

    // Character limit validation for create user form fields
    setupCreateUserFieldValidation();

    // Handle form submission
    createUserForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        await createUser();
    });
}

// Setup field validation for create user form
function setupCreateUserFieldValidation() {
    const createUserFields = [
        { id: 'firstName', maxLength: 50, label: 'First name' },
        { id: 'middleName', maxLength: 50, label: 'Middle name' },
        { id: 'lastName', maxLength: 50, label: 'Last name' },
        { id: 'email', maxLength: 50, label: 'Email' },
        { id: 'newUsername', maxLength: 50, label: 'Username' },
    ];

    setupFieldValidation(createUserFields);
}

// Check username availability
async function checkUsernameAvailability(username) {
    if (!username || username.length < 3) {
        clearUsernameValidation();
        return;
    }

    try {
        const API_URL = getAPIUrl();
        const token = localStorage.getItem('token');

        const usernameInput = document.getElementById('newUsername');
        const usernameGroup = usernameInput.closest('.form-group');

        // Clear existing validation states and show checking state
        usernameGroup.classList.remove('error', 'success');
        const existingMessage = usernameGroup.querySelector(
            '.error-message, .success-message'
        );
        if (existingMessage) {
            existingMessage.remove();
        } // Add checking indicator
        const checkingMsg = document.createElement('div');
        checkingMsg.className = 'checking-message';
        checkingMsg.textContent = 'Checking username availability...';
        checkingMsg.style.color = '#6c757d';
        checkingMsg.style.fontSize = '0.85rem';
        checkingMsg.style.marginTop = '0.25rem';
        usernameGroup.appendChild(checkingMsg);

        // Update submit button state
        updateCreateUserSubmitButton();

        const response = await fetch(`${API_URL}/api/check-username`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ username }),
        });

        const result = await response.json();

        // Remove checking message
        const currentCheckingMsg =
            usernameGroup.querySelector('.checking-message');
        if (currentCheckingMsg) {
            currentCheckingMsg.remove();
        }
        if (response.ok && result.data) {
            if (result.data.available) {
                usernameGroup.classList.add('success');
                const successMsg = document.createElement('div');
                successMsg.className = 'success-message';
                successMsg.textContent = 'Username is available';
                usernameGroup.appendChild(successMsg);
            } else {
                usernameGroup.classList.add('error');
                const errorMsg = document.createElement('div');
                errorMsg.className = 'error-message';
                errorMsg.textContent = 'Username is already taken';
                usernameGroup.appendChild(errorMsg);
            }
        } else {
            // Handle API error
            console.error('Username check failed:', result);
            usernameGroup.classList.add('error');
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.textContent = 'Unable to check username availability';
            usernameGroup.appendChild(errorMsg);
        }

        // Update submit button state
        updateCreateUserSubmitButton();
    } catch (error) {
        console.error('Error checking username availability:', error);
        // Show error state on network/API failure
        const usernameInput = document.getElementById('newUsername');
        const usernameGroup = usernameInput.closest('.form-group');

        // Remove checking message if present
        const checkingMsg = usernameGroup.querySelector('.checking-message');
        if (checkingMsg) {
            checkingMsg.remove();
        }

        usernameGroup.classList.add('error');
        const errorMsg = document.createElement('div');
        errorMsg.className = 'error-message';
        errorMsg.textContent = 'Unable to check username availability';
        usernameGroup.appendChild(errorMsg);

        // Update submit button state
        updateCreateUserSubmitButton();
    }
}

// Clear username validation
function clearUsernameValidation() {
    const usernameInput = document.getElementById('newUsername');
    if (usernameInput) {
        const usernameGroup = usernameInput.closest('.form-group');
        usernameGroup.classList.remove('error', 'success');
        const existingMessage = usernameGroup.querySelector(
            '.error-message, .success-message, .checking-message'
        );
        if (existingMessage) {
            existingMessage.remove();
        }

        // Update submit button state
        updateCreateUserSubmitButton();
    }
}

// Create new user
async function createUser() {
    const submitBtn = document.getElementById('createUserSubmitBtn');
    const originalText = submitBtn.textContent;
    let response = null;

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating User...';

        // Pre-flight connectivity check
        const connectivity = await checkConnectivity();
        if (!connectivity.connected) {
            throw new Error(`Connection failed: ${connectivity.error}`);
        }

        // Get form data
        const formData = {
            firstName: document.getElementById('firstName').value.trim(),
            middleName: document.getElementById('middleName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            email: document.getElementById('email').value.trim(),
            username: document.getElementById('newUsername').value.trim(),
            password: document.getElementById('newPassword').value,
            roleKey: document.getElementById('userRole').value,
        };

        // Validate required fields
        if (
            !formData.firstName ||
            !formData.lastName ||
            !formData.email ||
            !formData.username ||
            !formData.password ||
            !formData.roleKey
        ) {
            throw new Error('All fields except middle name are required.');
        }

        // Validate password confirmation
        const confirmPassword =
            document.getElementById('confirmPassword').value;
        if (formData.password !== confirmPassword) {
            throw new Error('Passwords do not match.');
        }

        // Validate character limits
        const fieldErrors = validateCharacterLimits([
            { id: 'firstName', maxLength: 50, label: 'First name' },
            { id: 'middleName', maxLength: 50, label: 'Middle name' },
            { id: 'lastName', maxLength: 50, label: 'Last name' },
            { id: 'email', maxLength: 50, label: 'Email' },
            { id: 'newUsername', maxLength: 50, label: 'Username' },
        ]);

        if (fieldErrors.length > 0) {
            throw new Error(fieldErrors.join(' '));
        }

        // Validate email format
        if (!validateEmail(formData.email)) {
            throw new Error('Please enter a valid email address.');
        } // Validate password strength using healthcare standards
        const passwordValidation = validatePasswordStrength(formData.password);
        if (!passwordValidation.isValid) {
            const errorMessages = passwordValidation.failed.join('\\n• ');
            throw new Error(
                `Password does not meet security requirements:\\n• ${errorMessages}`
            );
        }

        // Check username validation state before submitting
        const usernameInput = document.getElementById('newUsername');
        const usernameGroup = usernameInput.closest('.form-group');
        if (usernameGroup.classList.contains('error')) {
            throw new Error(
                'Username is not available. Please choose a different username.'
            );
        }

        // Ensure username availability has been checked
        if (!usernameGroup.classList.contains('success')) {
            throw new Error(
                'Please wait for username availability check to complete.'
            );
        }

        const token = localStorage.getItem('token');
        const API_URL = getAPIUrl();

        response = await fetch(`${API_URL}/api/create-user`, {
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
            document.getElementById('createUserForm').reset();
            clearCreateUserErrors();

            // Show success modal with simple personalized message
            const userName = formData.middleName
                ? `${formData.firstName} ${formData.middleName} ${formData.lastName}`
                : `${formData.firstName} ${formData.lastName}`;
            const successMessage = `Success, new user for ${userName} created!`;
            window.modalManager.showModal('success', successMessage); // Redirect back to admin choice page after brief delay
            setTimeout(() => {
                window.modalManager.closeModal();
                // Navigate back to main admin page using clean URL
                window.location.href = '../';
            }, 2500);
        } else {
            throw new Error(result.error || 'Failed to create user');
        }
    } catch (error) {
        console.error('Create user error:', error);

        // Use enhanced error categorization
        const errorInfo = categorizeError(error, response);

        // Show appropriate feedback based on error type
        if (errorInfo.modal) {
            window.modalManager.showModal('error', errorInfo.message);
        } else {
            showCreateUserError(errorInfo.message);
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Show create user error
function showCreateUserError(message) {
    const createUserSection = document.getElementById('createUserSection');
    showSectionMessage(createUserSection, message, 'error');
}

// Clear create user errors
function clearCreateUserErrors() {
    const createUserSection = document.getElementById('createUserSection');
    clearFormErrors(createUserSection);
}

// Load users for management
async function loadUsers() {
    try {
        const API_URL = getAPIUrl();
        const token = localStorage.getItem('token');

        const usersLoading = document.getElementById('usersLoading');
        const usersTableBody = document.getElementById('usersTableBody');

        if (usersLoading) usersLoading.style.display = 'block';
        if (usersTableBody) usersTableBody.innerHTML = '';

        const response = await fetch(`${API_URL}/api/users`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (response.ok) {
            const result = await response.json();
            allUsers = result.data; // Extract data from response object
            setupTableSorting();
            const sortedUsers = getSortedUsers();

            // Check if we have saved column widths
            try {
                const savedWidths = JSON.parse(
                    localStorage.getItem('userTableColumnWidths')
                );
                if (savedWidths && Array.isArray(savedWidths)) {
                    // Display users with saved column widths
                    displayUsersPreserveWidths(sortedUsers, savedWidths);
                } else {
                    // No saved preferences, just display and auto-adjust
                    displayUsers(sortedUsers);
                }
            } catch (e) {
                console.error(
                    'Error applying column widths after loading users:',
                    e
                );
                displayUsers(sortedUsers);
            }
        } else {
            // Use global auth error handler for consistent experience
            if (response.status === 401 || response.status === 403) {
                window.handleAuthError(response, 'loading users');
                // Hide loading indicator
                if (usersLoading) usersLoading.style.display = 'none';
                return;
            }
            throw new Error('Failed to load users');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        const usersTableBody = document.getElementById('usersTableBody');
        if (usersTableBody) {
            usersTableBody.innerHTML =
                '<tr><td colspan="6" style="text-align: center; color: #dc3545;">Error loading users. Please try again.</td></tr>';
        }
    } finally {
        const usersLoading = document.getElementById('usersLoading');
        if (usersLoading) usersLoading.style.display = 'none';
    }
}

// Load roles for user management
async function loadRolesForUserManagement() {
    try {
        const API_URL = getAPIUrl();
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_URL}/api/roles`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (response.ok) {
            const result = await response.json();
            currentRoles = result.data; // Extract data from response object
        } else {
            // Use global auth error handler for consistent experience
            if (response.status === 401 || response.status === 403) {
                window.handleAuthError(response, 'loading roles');
                currentRoles = [];
            } else {
                console.error('Failed to load roles for user management');
                currentRoles = [];
            }
        }
    } catch (error) {
        console.error('Error loading roles for user management:', error);
    }
}

// Setup table sorting
function setupTableSorting() {
    const table = document.getElementById('usersTable');
    if (!table) return;

    const headers = table.querySelectorAll('thead th');

    // Define sortable columns (exclude Actions column)
    const sortableColumns = [
        { index: 0, key: 'username', label: 'Username' },
        { index: 1, key: 'fullName', label: 'Full Name' },
        { index: 2, key: 'email', label: 'Email' },
        { index: 3, key: 'role', label: 'Role' },
        { index: 4, key: 'created', label: 'Created' },
    ];
    sortableColumns.forEach((column) => {
        const header = headers[column.index];
        if (header) {
            header.style.cursor = 'default'; // Remove pointer cursor from entire header
            header.classList.add('sortable-column');
            header.innerHTML = `${column.label} <span class="sort-indicator" data-column="${column.key}"></span>`;

            // Only add click handler to the sort indicator, not the entire header
            const sortIndicator = header.querySelector('.sort-indicator');
            if (sortIndicator) {
                sortIndicator.style.cursor = 'pointer';
                sortIndicator.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent event bubbling
                    handleSort(column.key);
                });
            }
        }
    });
}

// Handle table sorting
function handleSort(columnKey) {
    // Determine new sort direction
    if (currentSort.column === columnKey) {
        // Same column clicked
        if (currentSort.direction === null) {
            currentSort.direction = 'asc';
        } else if (currentSort.direction === 'asc') {
            currentSort.direction = 'desc';
        } else {
            currentSort.direction = null;
        }
    } else {
        // Different column clicked
        currentSort.column = columnKey;
        currentSort.direction = 'asc';
    }

    // Update sort indicators
    updateSortIndicators(); // Update reset sort button visibility
    updateResetSortButton();

    // Capture current column widths before making any changes
    const table = document.querySelector('.users-table');
    let columnWidths = [];

    if (table) {
        // Store current column widths
        const headers = Array.from(table.querySelectorAll('th'));
        columnWidths = headers.map((header) => header.style.width);
    }

    // Sort and display users
    const sortedUsers = getSortedUsers();
    displayUsersPreserveWidths(sortedUsers, columnWidths);
}

// Update sort indicators
function updateSortIndicators() {
    const indicators = document.querySelectorAll('.sort-indicator');

    indicators.forEach((indicator) => {
        const column = indicator.dataset.column;
        if (column === currentSort.column) {
            if (currentSort.direction === 'asc') {
                indicator.textContent = ' ↑';
            } else if (currentSort.direction === 'desc') {
                indicator.textContent = ' ↓';
            } else {
                indicator.textContent = '';
            }
        } else {
            indicator.textContent = '';
        }
    });
}

// Update reset sort button visibility
function updateResetSortButton() {
    const resetBtn = document.getElementById('resetSort');
    if (resetBtn) {
        resetBtn.style.display = currentSort.column ? 'inline-block' : 'none';
    }
}

// Get sorted users
function getSortedUsers() {
    if (!currentSort.column || !currentSort.direction) {
        return allUsers;
    }

    return [...allUsers].sort((a, b) => {
        let aValue, bValue;

        switch (currentSort.column) {
            case 'username':
                aValue = a.username?.toLowerCase() || '';
                bValue = b.username?.toLowerCase() || '';
                break;
            case 'fullName':
                aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
                bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
                break;
            case 'email':
                aValue = a.email?.toLowerCase() || '';
                bValue = b.email?.toLowerCase() || '';
                break;
            case 'role':
                aValue = a.roles && a.roles[0] ? a.roles[0].toLowerCase() : '';
                bValue = b.roles && b.roles[0] ? b.roles[0].toLowerCase() : '';
                break;
            case 'created':
                aValue = new Date(a.created_at);
                bValue = new Date(b.created_at);
                break;
            default:
                return 0;
        }

        if (aValue < bValue) return currentSort.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });
}

// Display users in table
function displayUsers(users) {
    const usersTableBody = document.getElementById('usersTableBody');
    const noUsersFound = document.getElementById('noUsersFound');
    const tableContainer = document.querySelector('.table-responsive');

    if (!usersTableBody) return;

    if (users.length === 0) {
        usersTableBody.innerHTML = '';
        if (noUsersFound) noUsersFound.classList.remove('hidden');
        return;
    }

    if (noUsersFound) noUsersFound.classList.add('hidden'); // Reset scroll position when displaying new data
    if (tableContainer) {
        tableContainer.scrollLeft = 0;
    }

    // Add title attributes to cells for better tooltips
    usersTableBody.addEventListener('mouseover', function (e) {
        if (e.target.tagName === 'TD') {
            e.target.title = e.target.textContent;
        }
    });

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    usersTableBody.innerHTML = users
        .map((user) => {
            const fullName = user.middle_name
                ? `${user.first_name} ${user.middle_name} ${user.last_name}`
                : `${user.first_name} ${user.last_name}`;

            const primaryRole =
                user.roles && user.roles.length > 0 ? user.roles[0] : 'User';
            const primaryRoleKey =
                user.role_keys && user.role_keys.length > 0
                    ? user.role_keys[0]
                    : 2;
            const roleClass = primaryRole.toLowerCase().replace(/[^a-z]/g, '');

            const createdDate = new Date(user.created_at).toLocaleDateString();
            const isCurrentUser = currentUser.username === user.username;
            return `
            <tr data-user-id="${user.user_key}">
                <td class="user-username" title="${user.username}">${
                user.username
            }</td>
                <td class="user-fullname" title="${fullName}">${fullName}</td>
                <td class="user-email" title="${user.email}">${
                user.email
            }</td>                <td>
                    ${
                        currentRoles.length > 0
                            ? `<select class="role-select" onchange="window.adminPage.editUserRole(${
                                  user.user_key
                              }, this.value)" ${
                                  isCurrentUser ? 'disabled' : ''
                              }>
                            ${currentRoles
                                .map(
                                    (role) => `
                                <option value="${role.role_key}" ${
                                        role.role_key == primaryRoleKey
                                            ? 'selected'
                                            : ''
                                    }>
                                    ${role.role_name}
                                </option>
                            `
                                )
                                .join('')}
                        </select>`
                            : `<span class="user-role ${roleClass}" data-role-key="${primaryRoleKey}" title="${primaryRole}">
                                ${primaryRole}
                            </span>`
                    }
                </td>
                <td class="user-created" title="${createdDate}">${createdDate}</td>                <td>
                    <div class="user-actions">
                        ${
                            !isCurrentUser
                                ? `<button class="btn-icon btn-delete" onclick="window.adminPage.deleteUser(${user.user_key}, '${user.username}')" title="Delete User">
                                🗑️
                            </button>`
                                : `<span title="Cannot delete your own account">-</span>`
                        }
                    </div>
                </td>
            </tr>
        `;
        })
        .join('');

    // Adjust column widths after rendering
    setTimeout(adjustColumnWidths, 100);
}

// Display users in the table while preserving column widths
function displayUsersPreserveWidths(users, columnWidths = []) {
    const usersTableBody = document.getElementById('usersTableBody');
    const noUsersFound = document.getElementById('noUsersFound');
    const tableContainer = document.querySelector('.table-responsive');
    const table = document.querySelector('.users-table');

    if (!usersTableBody || !table) return;

    // Show resize tip message if this is the first time (using localStorage)
    if (!localStorage.getItem('hasSeenTableResizeTip')) {
        const tipDiv = document.createElement('div');
        tipDiv.className = 'info-message resize-tip';
        tipDiv.innerHTML = `
            <span class="tip-icon">💡</span>
            <span>Tip: You can resize columns by dragging the edge between headers. Double-click to auto-size.</span>
            <button class="tip-close" aria-label="Dismiss tip">✕</button>
        `;

        // Add the tip above the table
        tableContainer.parentNode.insertBefore(tipDiv, tableContainer);

        // Add dismiss functionality
        tipDiv
            .querySelector('.tip-close')
            .addEventListener('click', function () {
                tipDiv.remove();
                localStorage.setItem('hasSeenTableResizeTip', 'true');
            });

        // Auto dismiss after 10 seconds
        setTimeout(() => {
            if (tipDiv.parentNode) {
                tipDiv.remove();
                localStorage.setItem('hasSeenTableResizeTip', 'true');
            }
        }, 10000);
    }

    if (users.length === 0) {
        usersTableBody.innerHTML = '';
        if (noUsersFound) noUsersFound.classList.remove('hidden');
        return;
    }

    if (noUsersFound) noUsersFound.classList.add('hidden');

    // Reset scroll position when displaying new data
    if (tableContainer) {
        tableContainer.scrollLeft = 0;
    }

    // Set the table to fixed layout to maintain column widths during update
    table.style.tableLayout = 'fixed';

    // Add title attributes to cells for better tooltips
    usersTableBody.addEventListener('mouseover', function (e) {
        if (e.target.tagName === 'TD') {
            e.target.title = e.target.textContent;
        }
    });

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    // Generate the HTML for the table rows
    usersTableBody.innerHTML = users
        .map((user) => {
            const fullName = user.middle_name
                ? `${user.first_name} ${user.middle_name} ${user.last_name}`
                : `${user.first_name} ${user.last_name}`;

            const primaryRole =
                user.roles && user.roles.length > 0 ? user.roles[0] : 'User';
            const primaryRoleKey =
                user.role_keys && user.role_keys.length > 0
                    ? user.role_keys[0]
                    : 2;

            const createdDate = user.created_at
                ? new Date(user.created_at).toLocaleDateString()
                : '';

            return `
            <tr data-user-id="${user.user_key}">
                <td class="user-username" title="${user.username}">${
                user.username
            }</td>
                <td class="user-fullname" title="${fullName}">${fullName}</td>
                <td class="user-email" title="${user.email || ''}">${
                user.email || ''
            }</td>
                <td class="user-role" title="${primaryRole}">
                    ${
                        currentRoles.length > 0
                            ? `<select class="role-select" onchange="window.adminPage.editUserRole(${
                                  user.user_key
                              }, this.value)">
                            ${currentRoles
                                .map(
                                    (role) => `
                                <option value="${role.role_key}" ${
                                        role.role_key == primaryRoleKey
                                            ? 'selected'
                                            : ''
                                    }>
                                    ${role.role_name}
                                </option>
                            `
                                )
                                .join('')}
                        </select>`
                            : primaryRole
                    }
                </td>
                <td class="user-created" title="${createdDate}">${createdDate}</td>
                <td>
                    <div class="user-actions">
                        ${
                            currentUser.user_key !== user.user_key
                                ? `<button class="btn-icon btn-delete" onclick="window.adminPage.deleteUser(${user.user_key}, '${user.username}')" title="Delete User">
                                🗑️
                            </button>`
                                : `<span title="Cannot delete your own account">-</span>`
                        }
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

    // Add column resize handles
    addColumnResizeHandles();
}

// Filter users
function filterUsers() {
    const filterValue = document
        .getElementById('userFilter')
        .value.toLowerCase();

    if (!filterValue.trim()) {
        const sortedUsers = getSortedUsers();
        displayUsers(sortedUsers);
        return;
    }

    const filteredUsers = allUsers.filter((user) => {
        const fullName = user.middle_name
            ? `${user.first_name} ${user.middle_name} ${user.last_name}`
            : `${user.first_name} ${user.last_name}`;

        const primaryRole =
            user.roles && user.roles.length > 0 ? user.roles[0] : 'User';

        return (
            user.username.toLowerCase().includes(filterValue) ||
            fullName.toLowerCase().includes(filterValue) ||
            user.email.toLowerCase().includes(filterValue) ||
            primaryRole.toLowerCase().includes(filterValue)
        );
    });

    displayUsers(filteredUsers);

    // Adjust column widths based on content after filtering
    setTimeout(adjustColumnWidths, 100);
}

// Setup user filter
function setupUserFilter() {
    const userFilter = document.getElementById('userFilter');
    if (userFilter) {
        userFilter.addEventListener('input', filterUsers);
    }
}

// Function to handle user role editing
async function editUserRole(userId, newRoleKey) {
    // If newRoleKey is provided, we're handling a dropdown change
    if (newRoleKey !== undefined) {
        console.log('Updating user role:', { userId, newRoleKey });

        // Find the role name from currentRoles array
        const selectedRole = currentRoles.find(
            (role) => role.role_key == newRoleKey
        );
        const roleName = selectedRole ? selectedRole.role_name : 'Unknown'; // Show confirmation modal
        window.modalManager.showConfirmModal(
            '🔄 Change User Role',
            `Are you sure you want to change this user's role to ${roleName}?`,
            async () => {
                try {
                    // Show loading state
                    setUserActionLoading(userId, true);

                    // First, check user dependencies for debugging
                    console.log(
                        `Attempting to delete user ${userId} (${username})`
                    );
                    await checkUserDependencies(userId);

                    const API_URL = getAPIUrl();
                    const token = localStorage.getItem('token');

                    const response = await fetch(
                        `${API_URL}/api/users/${userId}/role`,
                        {
                            method: 'PUT',
                            headers: {
                                Authorization: `Bearer ${token}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                roleKey: newRoleKey,
                            }),
                        }
                    );

                    if (response.ok) {
                        const result = await response.json();

                        // Update the user in the local array
                        const userIndex = allUsers.findIndex(
                            (user) => user.user_key == userId
                        );
                        if (userIndex !== -1) {
                            allUsers[userIndex].role_key = newRoleKey;
                            allUsers[userIndex].role_name = roleName;
                        }

                        // Refresh the table display
                        displayFilteredUsers();

                        // Show success message
                        window.modalManager.showModal(
                            'success',
                            `User role successfully updated to ${roleName}.`
                        );
                    } else {
                        const errorData = await response.json();
                        throw new Error(
                            errorData.message || 'Failed to update user role'
                        );
                    }
                } catch (error) {
                    console.error('Error updating user role:', error);
                    window.modalManager.showModal(
                        'error',
                        `Failed to update user role: ${error.message}`
                    );
                } finally {
                    // Hide loading state
                    setUserActionLoading(userId, false);
                }
            }
        );
    } else {
        // Legacy single parameter call - show info modal
        console.log('Edit user role functionality for ID:', userId);
        window.modalManager.showModal(
            'info',
            'Please use the role dropdown to change user roles.'
        );
    }
}

async function deleteUser(userId, username) {
    // Show confirmation modal with strong warning
    window.modalManager.showConfirmModal(
        '🗑️ Delete User',
        `Are you sure you want to permanently delete user "${username}"? This action cannot be undone and will remove all associated data.`,
        async () => {
            try {
                // Show loading state
                setUserActionLoading(userId, true);

                // Check if user has any dependencies
                const userDependencies = await checkUserDependencies(userId);
                if (userDependencies) {
                    // If dependencies exist, show info modal with details
                    window.modalManager.showModal(
                        'info',
                        `User "${username}" has associated data that prevents deletion. Please remove or reassign this data before deleting the user.`
                    );
                    return;
                }

                const API_URL = getAPIUrl();
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_URL}/api/users/${userId}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                // Log response details for debugging
                console.log('Delete response status:', response.status);
                console.log(
                    'Delete response headers:',
                    Object.fromEntries(response.headers.entries())
                );

                if (response.ok) {
                    // Remove the user from the local array
                    const userIndex = allUsers.findIndex(
                        (user) => user.user_key == userId
                    );
                    if (userIndex !== -1) {
                        allUsers.splice(userIndex, 1);
                    }

                    // Refresh the table display
                    displayFilteredUsers();

                    // Show success message
                    window.modalManager.showModal(
                        'success',
                        `User "${username}" has been successfully deleted.`
                    );
                } else {
                    // Enhanced error handling for different scenarios
                    let errorMessage = 'Failed to delete user';

                    try {
                        const errorData = await response.json();
                        errorMessage =
                            errorData.message ||
                            errorData.error ||
                            errorMessage;
                    } catch (jsonError) {
                        // If we can't parse JSON, use status-based messages
                        switch (response.status) {
                            case 400:
                                errorMessage =
                                    'Cannot delete this user. You may be trying to delete your own account.';
                                break;
                            case 403:
                                errorMessage =
                                    'You do not have permission to delete users.';
                                break;
                            case 404:
                                errorMessage =
                                    'User not found or already deleted.';
                                break;
                            case 500:
                                console.error('Server error details:', {
                                    userId,
                                    username,
                                    status: response.status,
                                    statusText: response.statusText,
                                });
                                errorMessage = `Server error while deleting user "${username}" (ID: ${userId}). This is likely due to:\n\n• Database constraints (user has associated data)\n• Foreign key relationships preventing deletion\n• Server-side database issues\n\nPlease contact your system administrator with this error information.`;
                                break;
                            default:
                                errorMessage = `Server error (${response.status}). Please try again or contact your administrator.`;
                        }
                    }

                    if (response.status === 404) {
                        // Handle case where backend delete endpoint doesn't exist yet
                        window.modalManager.showModal(
                            'info',
                            'User deletion functionality is not yet available on the server. Please contact your system administrator.'
                        );
                    } else {
                        window.modalManager.showModal('error', errorMessage);
                    }
                }
            } catch (error) {
                let errorMessage = 'An error occurred while deleting the user.';

                if (
                    error.message.includes('404') ||
                    error.message.includes('Not Found')
                ) {
                    // Backend endpoint doesn't exist yet
                    window.modalManager.showModal(
                        'info',
                        'User deletion functionality is not yet available on the server. Please contact your system administrator.'
                    );
                    return;
                } else if (
                    error.message.includes('Network') ||
                    error.message.includes('fetch')
                ) {
                    errorMessage =
                        'Network error. Please check your connection and try again.';
                } else if (error.message.includes('timeout')) {
                    errorMessage = 'Request timed out. Please try again.';
                } else {
                    errorMessage = `Failed to delete user: ${error.message}`;
                }

                window.modalManager.showModal('error', errorMessage);
            } finally {
                // Hide loading state
                setUserActionLoading(userId, false);
            }
        }
    );
}

// Check if user has any dependencies that might prevent deletion
async function checkUserDependencies(userId) {
    try {
        const API_URL = getAPIUrl();
        const token = localStorage.getItem('token');

        // Try to get user details to see if they have associated data
        const response = await fetch(`${API_URL}/api/users/${userId}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const userData = await response.json();
            // Log user data to help diagnose the issue
            console.log('User data before deletion attempt:', userData);
            return userData;
        }
    } catch (error) {
        console.log('Could not fetch user dependencies:', error);
    }
    return null;
}

// Update submit button state based on form validation
function updateCreateUserSubmitButton() {
    const submitBtn = document.getElementById('createUserSubmitBtn');
    const usernameInput = document.getElementById('newUsername');

    if (!submitBtn || !usernameInput) return;

    const usernameGroup = usernameInput.closest('.form-group');
    const hasUsernameError = usernameGroup.classList.contains('error');
    const isCheckingUsername = usernameGroup.querySelector('.checking-message');

    // Disable submit if username has error or is being checked
    if (hasUsernameError || isCheckingUsername) {
        submitBtn.disabled = true;
        submitBtn.textContent = isCheckingUsername
            ? 'Checking Username...'
            : 'Create User';
    } else {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create User';
    }
}

// Function to add resize handles to table columns
function addColumnResizeHandles() {
    const table = document.querySelector('.users-table');
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
            ); // Add double-click to auto-size functionality
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
                    saveColumnWidthPreferences();
                }
                // Enter key to auto-size
                else if (e.key === 'Enter') {
                    e.preventDefault();
                    autoSizeColumn(header, index);
                }
            });
        }
    });
}

// Function to handle column resizing
function startColumnResize(event, header, columnIndex) {
    // Accept both mouse and touch events
    if (event.preventDefault) event.preventDefault();

    const table = document.querySelector('.users-table');
    const startX = event.pageX || event.clientX; // For calculations
    const startWidth = header.offsetWidth;
    const handle = event.target;

    // Update ARIA attributes for accessibility
    handle.setAttribute('aria-valuenow', startWidth); // Add resizing class to table
    table.classList.add('resizing');
    // Mark the handle as active
    handle.classList.add('active'); // Function to handle mouse/touch movement during resize
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
    } // Function to handle mouse/touch up (end of resize)
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

        // Apply the final width immediately
        header.style.width = `${newWidth}px`;

        // Update ARIA value for accessibility
        handle.setAttribute('aria-valuenow', newWidth);

        // Remove the resizing class
        table.classList.remove('resizing');

        // Remove active from handle
        handle.classList.remove('active');

        // Save column width in localStorage for persistence
        saveColumnWidthPreferences();

        // Announce resize completion for screen readers
        announceForScreenReader(`Column ${header.textContent.trim()} resized`);
    } // Add event listeners for mouse/touch movement and release
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
    announcement.classList.add('sr-only'); // Screen reader only
    announcement.textContent = message;
    document.body.appendChild(announcement);

    // Remove after announcement is made
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

// Enhanced auto-size function that measures actual content width
function autoSizeColumn(header, columnIndex) {
    const table = document.querySelector('.users-table');
    if (!table) return;

    // Get all cells in this column
    const cells = Array.from(
        table.querySelectorAll(`tbody tr td:nth-child(${columnIndex + 1})`)
    );

    // Use canvas for accurate text measurement
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        // Fallback to simple calculation if canvas is not available
        const headerText = header.textContent;
        let maxWidth = Math.max(headerText.length * 8 + 40, 80); // Rough estimation

        // Apply the calculated width
        header.style.width = `${maxWidth}px`;

        // Save the updated column widths
        saveColumnWidthPreferences();

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
    ); // Add padding, minimum 80px    // Measure all cells in the column to find the widest content
    cells.forEach((cell) => {
        // Get the actual text content from the cell or its children
        let cellText = '';

        // Handle different cell types properly
        if (cell.querySelector('.user-full-name')) {
            cellText = cell.querySelector('.user-full-name').textContent.trim();
        } else if (cell.querySelector('.user-actions')) {
            // For action cells, measure the actual button content
            cellText = '✏️ Edit Role 🗑️ Delete'; // More accurate representation
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
    const columnType = getAdminColumnType(header.textContent);

    if (columnType === 'email') {
        maxWidth = Math.min(maxWidth, 400); // Email column max width for long emails
        maxWidth = Math.max(maxWidth, 200); // Email column min width
    } else if (columnType === 'username') {
        maxWidth = Math.min(maxWidth, 200); // Username column max width
        maxWidth = Math.max(maxWidth, 120); // Username column min width
    } else if (columnType === 'name') {
        maxWidth = Math.min(maxWidth, 250); // Name column max width
        maxWidth = Math.max(maxWidth, 150); // Name column min width
    } else if (columnType === 'role') {
        maxWidth = Math.min(maxWidth, 150); // Role column max width
        maxWidth = Math.max(maxWidth, 100); // Role column min width
    } else if (columnType === 'created') {
        maxWidth = Math.min(maxWidth, 150); // Created column max width
        maxWidth = Math.max(maxWidth, 100); // Created column min width
    } else if (columnType === 'actions') {
        maxWidth = 140; // Actions column fixed width
    } else {
        maxWidth = Math.min(maxWidth, 300); // General max width
        maxWidth = Math.max(maxWidth, 100); // Minimum width for readability
    }

    // Apply the calculated width
    header.style.width = `${maxWidth}px`;

    // Save the updated column widths
    saveColumnWidthPreferences();

    // Announce the change to screen readers
    announceForScreenReader(`Column ${header.textContent.trim()} auto-sized`);
}

// Function to save column width preferences
function saveColumnWidthPreferences() {
    const table = document.querySelector('.users-table');
    if (!table) return;

    const headers = Array.from(table.querySelectorAll('th'));
    const widths = headers.map((header) => header.style.width);

    localStorage.setItem('userTableColumnWidths', JSON.stringify(widths));
}

// Function to load column width preferences
function loadColumnWidthPreferences() {
    const table = document.querySelector('.users-table');
    if (!table) return;

    try {
        const savedWidths = JSON.parse(
            localStorage.getItem('userTableColumnWidths')
        );

        if (savedWidths && Array.isArray(savedWidths)) {
            const headers = Array.from(table.querySelectorAll('th'));

            headers.forEach((header, index) => {
                if (savedWidths[index]) {
                    header.style.width = savedWidths[index];
                }
            });

            table.style.tableLayout = 'fixed';
        } else {
            // No saved preferences, run auto-sizing algorithm
            adjustColumnWidths();
        }
    } catch (error) {
        console.error('Error loading column width preferences:', error);
        adjustColumnWidths();
    }
}

// Function to determine the column type based on header text
function getAdminColumnType(headerText) {
    headerText = headerText.toLowerCase();

    if (headerText.includes('username')) {
        return 'username';
    } else if (headerText.includes('name')) {
        return 'name';
    } else if (headerText.includes('email')) {
        return 'email';
    } else if (headerText.includes('role')) {
        return 'role';
    } else if (headerText.includes('created')) {
        return 'created';
    } else if (headerText.includes('action')) {
        return 'actions';
    }
    return 'general';
}

// Make admin functions available globally
window.adminPage = {
    initializeAdminPage,
    setupAdminNavigation,
    loadUsers,
    editUserRole,
    deleteUser,
};
