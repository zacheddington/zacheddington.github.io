// Admin Page Module
// Handles all admin page functionality including user management

// Global variables for admin page
let allUsers = [];
let currentRoles = [];

// Initialize admin page
function initializeAdminPage() {
    // Determine which page we're on and initialize accordingly
    const currentPage = getCurrentPageType();

    switch (currentPage) {
        case 'create-user':
            initializeCreateUserPage();
            break;
        case 'manage-users':
            // Handle async initialization properly
            initializeManageUsersPage();
            break;
        case 'manage-sessions':
            initializeSessionManagement();
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
    } else if (path.includes('/admin/manage-sessions/')) {
        return 'manage-sessions';
    } else if (path.includes('/admin/')) {
        return 'admin-index';
    }
    return 'admin-index';
}

// Initialize the admin index page (choice page)
function initializeAdminIndexPage() {
    // Setup navigation between admin sections
    setupAdminNavigation();
    // Admin index page initialized
}

// Initialize the create user page
function initializeCreateUserPage() {
    // Load roles for dropdown
    loadRoles();

    // Setup create user form
    setupCreateUserForm();

    // Create user page initialized
}

// Initialize the manage users page
async function initializeManageUsersPage() {
    // Clear any legacy localStorage keys that might interfere with unified table system
    // Use the local implementation instead of import
    const legacyKeys = [
        'userTableColumnWidths',
        'sessionColumnPreferences',
        'patientTableColumnWidths',
        'tableColumnPreferences',
        'userTableSortState',
        'patientTableSortState',
    ];

    legacyKeys.forEach((key) => {
        if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
        }
    });

    // Load roles and users - simplified approach matching patients pattern
    try {
        await loadRolesForUserManagement();
        await loadUsers();
    } catch (error) {
        console.error('Failed to initialize manage users page:', error);
    }

    // Setup user filter
    setupUserFilter();

    // Tables are auto-initialized by table-utils.js
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

    const actionButtons = userRow.querySelectorAll('.table-actions button');
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
    const sessionManagementSection = document.getElementById(
        'sessionManagementSection'
    );

    // Choice button handlers
    const createUserBtn = document.getElementById('createUserBtn');
    const manageUsersBtn = document.getElementById('manageUsersBtn');
    const manageSessionsBtn = document.getElementById('manageSessionsBtn');
    if (createUserBtn) {
        createUserBtn.addEventListener('click', function () {
            window.location.href = './create-user/';
        });
    }
    if (manageUsersBtn) {
        manageUsersBtn.addEventListener('click', function () {
            window.location.href = './manage-users/';
        });
    }

    if (manageSessionsBtn) {
        manageSessionsBtn.addEventListener('click', function () {
            window.location.href = './manage-sessions/';
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

    // Back button handler for session management
    document
        .getElementById('backToChoiceFromSessionManagement')
        ?.addEventListener('click', function () {
            sessionManagementSection.classList.add('hidden');
            adminChoice.classList.remove('hidden');
        });
}

// Load roles for dropdown
async function loadRoles() {
    try {
        const API_URL = window.apiClient.getAPIUrl();
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
            // Failed to load roles
        }
    } catch (error) {
        // Error loading roles
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
        });

        newPassword.addEventListener('input', function () {
            validatePasswordMatch();
            updatePasswordStrength(newPassword.value, newPassword.id);
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
        const API_URL = window.apiClient.getAPIUrl();
        const token = localStorage.getItem('token');

        const usernameInput = document.getElementById('newUsername');
        const usernameGroup = usernameInput.closest('.form-group');

        // Clear existing validation states and show checking state
        usernameGroup.classList.remove('error', 'success');
        const existingMessage = usernameGroup.querySelector(
            '.error-message, .success-message, .checking-message'
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
            usernameGroup.classList.add('error');
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.textContent = 'Unable to check username availability';
            usernameGroup.appendChild(errorMsg);
        }

        // Update submit button state
        updateCreateUserSubmitButton();
    } catch (error) {
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
        const connectivity = await window.apiClient.checkConnectivity();
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
        const API_URL = window.apiClient.getAPIUrl();

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
            window.modalManager.showModal('success', successMessage, false, {
                redirect: true,
            }); // Redirect back to admin choice page after brief delay
            setTimeout(() => {
                window.modalManager.closeModal();
                // Navigate back to main admin page using clean URL
                window.location.href = '../';
            }, 2500);
        } else {
            throw new Error(result.error || 'Failed to create user');
        }
    } catch (error) {
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
        const API_URL = window.apiClient.getAPIUrl();
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

            // Display users (filter persistence is automatic via table-utils)
            const usersToShow = getUsersForDisplay();
            displayUsers(usersToShow);
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

// Alias function for backward compatibility - now with filter persistence
function displayFilteredUsers() {
    // Just refresh the display with current filter applied
    reapplyCurrentUserFilter();
}

// Function to re-apply current filter after data changes
function reapplyCurrentUserFilter() {
    const userFilter = document.getElementById('userFilter');
    if (userFilter && userFilter.value.trim()) {
        // If there's a filter value, re-run the filter
        filterUsers();
    } else {
        // If no filter, show all users
        const usersToShow = getUsersForDisplay();
        displayUsers(usersToShow);
    }
}

// Load roles for user management
async function loadRolesForUserManagement() {
    try {
        const API_URL = window.apiClient.getAPIUrl();
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
            console.error('Failed to load roles');
            // Use global auth error handler for consistent experience
            if (response.status === 401 || response.status === 403) {
                window.handleAuthError(response, 'loading roles');
                currentRoles = [];
            } else {
                // Failed to load roles for user management
                currentRoles = [];
            }
        }
    } catch (error) {
        console.error('Failed to load roles for user management');
        currentRoles = [];
    }
}

// Simple function that returns users for display (no sorting - let table handle that)
function getUsersForDisplay() {
    return allUsers; // Return all users unsorted - let unified table system handle everything
}

// Display users in table
function displayUsers(users) {
    const usersTableBody = document.getElementById('usersTableBody');
    const noUsersFound = document.getElementById('noUsersFound');
    const tableContainer = document.querySelector('.table-responsive');
    const usersTable = document.querySelector('#usersTable');

    if (!usersTableBody) {
        console.warn('usersTableBody not found');
        return;
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
            const roleClass = primaryRole.toLowerCase().replace(/[^a-z]/g, ''); // Handle date creation with better error checking
            let createdDate = 'No date';
            if (user.date_created) {
                try {
                    const dateObj = new Date(user.date_created);
                    // Check if the date is valid
                    if (!isNaN(dateObj.getTime())) {
                        createdDate = dateObj.toLocaleDateString();
                    } else {
                        console.warn(
                            'Invalid date for user:',
                            user.username,
                            'date_created:',
                            user.date_created
                        );
                        createdDate = 'Invalid date';
                    }
                } catch (error) {
                    console.error(
                        'Date parsing error for user:',
                        user.username,
                        error
                    );
                    createdDate = 'Date error';
                }
            }
            const isCurrentUser = currentUser.username === user.username;
            return `
            <tr data-user-id="${user.user_key}">
                <td class="user-username" title="${user.username}">${
                user.username
            }</td>
                <td class="user-fullname" title="${fullName}">${fullName}</td>
                <td class="cell-email" title="${user.email}">${
                user.email
            }</td>                <td>
                    ${
                        currentRoles.length > 0
                            ? `<select class="role-select" onchange="window.adminPage.editUserRole(${
                                  user.user_key
                              }, this.value)" title="Select user role" ${
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
                <td class="cell-date" title="${createdDate}">${createdDate}</td>                <td>
                    <div class="table-actions">
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

    // Update the original order after loading new data
    if (window.updateTableOriginalOrder) {
        window.updateTableOriginalOrder('usersTable');
    }

    // Re-initialize tables after content is populated to ensure resize handles work
    if (window.initializeDataTables) {
        window.initializeDataTables();
    }

    // Trigger automatic filter reapplication
    if (window.autoReapplyTableFilter) {
        window.autoReapplyTableFilter('usersTable');
    }

    // Setup revert functionality for role select dropdowns
    setupRoleSelectRevertFunctionality();
}

// Filter users
function filterUsers() {
    const filterValue = document
        .getElementById('userFilter')
        .value.toLowerCase();

    if (!filterValue.trim()) {
        const usersToShow = getUsersForDisplay();
        displayUsers(usersToShow);
        return;
    }
    const filteredUsers = allUsers.filter((user) => {
        // Build full name with null/undefined safety
        const firstName = user.first_name || '';
        const middleName = user.middle_name || '';
        const lastName = user.last_name || '';

        const fullName = middleName
            ? `${firstName} ${middleName} ${lastName}`
            : `${firstName} ${lastName}`;

        const primaryRole =
            user.roles && user.roles.length > 0 ? user.roles[0] : 'User';

        return (
            (user.username || '').toLowerCase().includes(filterValue) ||
            fullName.toLowerCase().includes(filterValue) ||
            (user.email || '').toLowerCase().includes(filterValue) ||
            primaryRole.toLowerCase().includes(filterValue)
        );
    });

    displayUsers(filteredUsers);
}

// Setup user filter (now automatic via table-utils.js)
function setupUserFilter() {
    const userFilter = document.getElementById('userFilter');
    if (userFilter) {
        userFilter.addEventListener('input', filterUsers);
    }
}

// Function to handle user role editing
async function editUserRole(userId, newRoleKey) {
    // Check if user is trying to edit their own role
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const user = allUsers.find((u) => u.user_key == userId);

    if (user && currentUser.username === user.username) {
        window.modalManager.showModal(
            'error',
            'You cannot change your own role.'
        );
        // Reset the dropdown to its original value
        const roleSelect = document.querySelector(
            `select[onchange*="${userId}"]`
        );
        if (roleSelect) {
            const currentRoleKey =
                user.role_keys && user.role_keys.length > 0
                    ? user.role_keys[0]
                    : 2;
            roleSelect.value = currentRoleKey;
        }
        return;
    }

    // If newRoleKey is provided, we're handling a dropdown change
    if (newRoleKey !== undefined) {
        // Get the user data to access username
        const username = user ? user.username : `User ${userId}`;

        // Find the role name from currentRoles array
        const selectedRole = currentRoles.find(
            (role) => role.role_key == newRoleKey
        );
        const roleName = selectedRole ? selectedRole.role_name : 'Unknown';

        // Show confirmation modal
        window.modalManager.showConfirmModal(
            '🔄 Change User Role',
            `Are you sure you want to change this user's role to ${roleName}?`,
            async () => {
                try {
                    // Show loading state
                    setUserActionLoading(userId, true);

                    // Update user role directly - the server will handle validation
                    const token = localStorage.getItem('token');
                    const API_URL = window.apiClient.getAPIUrl();

                    const response = await fetch(
                        `${API_URL}/api/users/${userId}/role`,
                        {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                                roleKey: newRoleKey,
                            }),
                        }
                    );

                    if (response.ok) {
                        // Update successful - refresh user data
                        await loadUsers();

                        // Update the original value for the role select dropdown
                        const roleSelect = document.querySelector(
                            `select[onchange*="${userId}"]`
                        );
                        if (
                            roleSelect &&
                            typeof roleSelect.updateOriginalValue === 'function'
                        ) {
                            roleSelect.updateOriginalValue();
                        }

                        window.modalManager.showModal(
                            'success',
                            'User role updated successfully!'
                        );
                    } else if (response.status === 404) {
                        // User not found - remove from local display
                        const userIndex = allUsers.findIndex(
                            (u) => u.user_key == userId
                        );
                        if (userIndex !== -1) {
                            allUsers.splice(userIndex, 1);
                        }
                        displayFilteredUsers();
                        window.modalManager.showModal(
                            'info',
                            `User "${username}" was not found on the server (may have been already deleted). Removed from local display.`
                        );
                    } else {
                        const errorData = await response.json();
                        throw new Error(
                            errorData.message || 'Failed to update user role'
                        );
                    }
                } catch (error) {
                    // Error updating user role
                    window.modalManager.showModal(
                        'error',
                        `Failed to update user role: ${error.message}`
                    );
                } finally {
                    // Hide loading state
                    setUserActionLoading(userId, false);
                }
            },
            () => {
                // Cancel callback - use the generic dropdown revert functionality
                const roleSelect = document.querySelector(
                    `select[onchange*="${userId}"]`
                );
                if (
                    roleSelect &&
                    typeof roleSelect.revertToOriginal === 'function'
                ) {
                    roleSelect.revertToOriginal();
                }
            }
        );
    } else {
        // Legacy single parameter call - show info modal
        window.modalManager.showModal(
            'info',
            'Please use the role dropdown to change user roles.'
        );
    }
}

async function deleteUser(userId, username) {
    // Check if user is trying to delete their own account
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    if (currentUser.username === username) {
        window.modalManager.showModal(
            'error',
            'You cannot delete your own account.'
        );
        return;
    }

    // Show confirmation modal with strong warning
    window.modalManager.showConfirmModal(
        '🗑️ Delete User',
        `Are you sure you want to permanently delete user "${username}"? This action cannot be undone and will remove all associated data.`,
        async () => {
            try {
                // Show loading state
                setUserActionLoading(userId, true); // Note: Proceeding directly to delete since individual user GET endpoint doesn't exist
                const API_URL = window.apiClient.getAPIUrl();
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_URL}/api/users/${userId}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

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
                                errorMessage = `Cannot delete user "${username}" (ID: ${userId}) due to database constraints.\n\nThis user likely has:\n• Role assignments in tbl_user_role\n• Associated name data in tbl_name_data\n• Other linked records preventing deletion\n\nThe server should handle these relationships automatically, but there may be a database constraint issue.\n\nPlease contact your system administrator to:\n1. Check database foreign key constraints\n2. Verify the deletion logic handles all relationships\n3. Review server logs for specific constraint violations`;
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
        const API_URL = window.apiClient.getAPIUrl();
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
            return { exists: true, data: userData };
        } else if (response.status === 404) {
            return { exists: false, error: 'User not found' };
        } else {
            return { exists: false, error: `HTTP ${response.status}` };
        }
    } catch (error) {
        return { exists: false, error: error.message };
    }
}

// Check for specific foreign key constraints that might prevent deletion
async function analyzeUserConstraints(userId, username) {
    try {
        const API_URL = window.apiClient.getAPIUrl();
        const token = localStorage.getItem('token');

        // Try to get detailed user information
        const userResponse = await fetch(`${API_URL}/api/users/${userId}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (userResponse.ok) {
            const userData = await userResponse.json();
            // Check if user has name_key reference and role assignments
            // These should be handled by server deletion logic
        }
    } catch (error) {
        // Error analyzing user constraints
    }
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

// Session Management Functions
// ============================

// Global variables for session management
let allSessions = [];

// Initialize session management
async function initializeSessionManagement() {
    try {
        // Tables are auto-initialized by table-utils.js

        // Load all sessions
        await loadAllSessions();

        // Setup simple session filter (unified with Users/Patients)
        setupSessionFilter();

        // Setup session actions
        setupSessionActions();
    } catch (error) {
        console.error('Error initializing session management:', error);
        if (window.modalManager) {
            window.modalManager.showModal(
                'error',
                'Error loading session management'
            );
        } else {
            alert('Error loading session management');
        }
    }
}

// Load all sessions from the API
async function loadAllSessions() {
    try {
        const API_URL = window.apiClient.getAPIUrl();
        const token = localStorage.getItem('token');

        showSessionsLoading(true);

        const response = await fetch(`${API_URL}/api/sessions`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (response.ok) {
            const result = await response.json();
            allSessions = result.data || [];

            // Display sessions in table (unified pattern)
            displaySessions(allSessions);

            // Update session statistics
            updateSessionStats();
        } else {
            // Log the error response for debugging
            const errorText = await response.text();
            console.error(
                'API Error Response:',
                response.status,
                response.statusText,
                errorText
            );
            throw new Error(
                `Failed to load sessions: ${response.status} - ${errorText}`
            );
        }
    } catch (error) {
        console.error('Error loading sessions:', error);
        if (window.modalManager) {
            window.modalManager.showModal(
                'error',
                'Failed to load sessions. Please try again.'
            );
        } else {
            alert('Failed to load sessions. Please try again.');
        }
        allSessions = [];
        displaySessions([]);
    } finally {
        showSessionsLoading(false);
    }
}

// Setup simple session filter (unified with Users/Patients pattern)
function setupSessionFilter() {
    const sessionFilter = document.getElementById('sessionFilter');
    if (sessionFilter) {
        sessionFilter.addEventListener('input', filterSessions);
    }
}

// Filter sessions based on search input (unified pattern)
function filterSessions() {
    const filterValue = document
        .getElementById('sessionFilter')
        .value.toLowerCase();

    if (!filterValue.trim()) {
        displaySessions(allSessions);
        return;
    }

    const filteredSessions = allSessions.filter((session) => {
        return (
            (session.username || '').toLowerCase().includes(filterValue) ||
            (session.ip_address || '').toLowerCase().includes(filterValue) ||
            (session.browser_info || '').toLowerCase().includes(filterValue)
        );
    });

    displaySessions(filteredSessions);
}

// Display sessions in the table
function displaySessions(sessions) {
    // Use the specific ID for session management page
    const tbody = document.querySelector('#sessionsTableBody');
    const noSessionsFound = document.getElementById('noSessionsFound');
    const sessionsTable = document.querySelector('#sessionsTable');

    if (!tbody) {
        console.error('No tbody element found with #sessionsTableBody');
        return;
    }

    if (sessions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="no-data">No sessions found</td>
            </tr>
        `;
        if (noSessionsFound) noSessionsFound.classList.remove('hidden');
        return;
    }

    if (noSessionsFound) noSessionsFound.classList.add('hidden');

    const sessionRows = sessions.map((session, index) => {
        const loginTime = new Date(session.login_time).toLocaleString();
        const lastActivity = session.last_activity
            ? new Date(session.last_activity).toLocaleString()
            : 'Never';
        const logoutTime = session.logout_time
            ? new Date(session.logout_time).toLocaleString()
            : '-';

        const statusBadge = session.is_active
            ? '<span class="status-badge active">Active</span>'
            : '<span class="status-badge inactive">Inactive</span>';

        const revokeButton = session.is_active
            ? `<button class="btn btn-danger btn-sm" onclick="window.adminPage.revokeSession('${session.session_id}')">Revoke</button>`
            : '<span class="text-muted">-</span>';

        const rowHtml = `
            <tr data-session-id="${session.session_id}">
                <td>${escapeHtml(session.username)}</td>
                <td>${statusBadge}</td>
                <td>${loginTime}</td>
                <td>${lastActivity}</td>
                <td>${logoutTime}</td>
                <td>${escapeHtml(session.ip_address || 'Unknown')}</td>
                <td>${escapeHtml(session.browser_info || 'Unknown')}</td>
                <td>
                    <div class="table-actions">
                        ${revokeButton}
                    </div>
                </td>
            </tr>        `;

        return rowHtml;
    });
    const finalHtml = sessionRows.join('');

    tbody.innerHTML = finalHtml;

    // Update the original order after loading new data
    if (window.updateTableOriginalOrder) {
        window.updateTableOriginalOrder('sessionsTable');
    }

    // Re-initialize tables after content is populated to ensure resize handles work
    if (window.initializeDataTables) {
        window.initializeDataTables();
    }

    // Trigger automatic filter reapplication
    if (window.autoReapplyTableFilter) {
        window.autoReapplyTableFilter('sessionsTable');
    }

    // Set table layout to fixed for column resizing to work
    // Sessions table rendered successfully
}

// Setup session action handlers
function setupSessionActions() {
    const revokeAllBtn = document.getElementById('revokeAllSessionsBtn');
    const cleanupBtn = document.getElementById('cleanupExpiredBtn');
    const refreshBtn = document.getElementById('refreshSessionsBtn');

    if (revokeAllBtn) {
        revokeAllBtn.addEventListener('click', function () {
            const userFilter =
                document.getElementById('sessionUserFilter')?.value;
            if (userFilter) {
                revokeAllUserSessions(userFilter);
            } else {
                if (window.modalManager) {
                    window.modalManager.showModal(
                        'warning',
                        'Please select a specific user to revoke all sessions'
                    );
                } else {
                    alert(
                        'Please select a specific user to revoke all sessions'
                    );
                }
            }
        });
    }

    if (cleanupBtn) {
        cleanupBtn.addEventListener('click', function () {
            cleanupExpiredSessions();
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            loadAllSessions();
        });
    }
}

// Revoke a specific session
async function revokeSession(sessionId) {
    if (
        !confirm(
            'Are you sure you want to revoke this session? The user will be logged out immediately.'
        )
    ) {
        return;
    }

    try {
        const API_URL = window.apiClient.getAPIUrl();
        const token = localStorage.getItem('token');

        setSessionActionLoading(sessionId, true);

        const response = await fetch(
            `${API_URL}/api/sessions/${sessionId}/revoke`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reason: 'Admin revocation',
                }),
            }
        );
        if (response.ok) {
            if (window.modalManager) {
                window.modalManager.showModal(
                    'success',
                    'Session revoked successfully'
                );
            } else {
                alert('Session revoked successfully');
            }
            // Reload sessions to reflect changes
            await loadAllSessions();
        } else {
            throw new Error(`Failed to revoke session: ${response.status}`);
        }
    } catch (error) {
        console.error('Error revoking session:', error);
        if (window.modalManager) {
            window.modalManager.showModal(
                'error',
                'Failed to revoke session. Please try again.'
            );
        } else {
            alert('Failed to revoke session. Please try again.');
        }
    } finally {
        setSessionActionLoading(sessionId, false);
    }
}

// Revoke all sessions for a specific user
async function revokeAllUserSessions(username) {
    if (
        !confirm(
            `Are you sure you want to revoke ALL sessions for user "${username}"? This will log them out of all devices immediately.`
        )
    ) {
        return;
    }

    try {
        const API_URL = window.apiClient.getAPIUrl();
        const token = localStorage.getItem('token');

        const response = await fetch(
            `${API_URL}/api/sessions/revoke-user/${encodeURIComponent(
                username
            )}`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reason: 'Admin bulk revocation',
                }),
            }
        );
        if (response.ok) {
            const result = await response.json();
            if (window.modalManager) {
                window.modalManager.showModal(
                    'success',
                    `Revoked ${
                        result.revokedCount || 0
                    } sessions for user ${username}`
                );
            } else {
                alert(
                    `Revoked ${
                        result.revokedCount || 0
                    } sessions for user ${username}`
                );
            }
            // Reload sessions to reflect changes
            await loadAllSessions();
        } else {
            throw new Error(
                `Failed to revoke user sessions: ${response.status}`
            );
        }
    } catch (error) {
        console.error('Error revoking user sessions:', error);
        if (window.modalManager) {
            window.modalManager.showModal(
                'error',
                'Failed to revoke user sessions. Please try again.'
            );
        } else {
            alert('Failed to revoke user sessions. Please try again.');
        }
    }
}

// Force logout a user (alias for revokeAllUserSessions)
async function forceLogoutUser(username) {
    return await revokeAllUserSessions(username);
}

// Cleanup expired sessions
async function cleanupExpiredSessions() {
    if (
        !confirm(
            'Are you sure you want to cleanup all expired sessions? This will permanently remove inactive session records.'
        )
    ) {
        return;
    }

    try {
        const API_URL = window.apiClient.getAPIUrl();
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_URL}/api/sessions/cleanup`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (response.ok) {
            const result = await response.json();
            alert(`Cleaned up ${result.cleanedCount || 0} expired sessions`);
            // Reload sessions to reflect changes
            await loadAllSessions();
        } else {
            throw new Error(`Failed to cleanup sessions: ${response.status}`);
        }
    } catch (error) {
        console.error('Error cleaning up sessions:', error);
        if (window.modalManager) {
            window.modalManager.showModal(
                'error',
                'Failed to cleanup sessions. Please try again.'
            );
        } else {
            alert('Failed to cleanup sessions. Please try again.');
        }
    }
}

// Update session statistics (simplified for unified table system)
function updateSessionStats() {
    const totalSessions = allSessions.length;
    const activeSessions = allSessions.filter((s) => s.is_active).length;
    const inactiveSessions = totalSessions - activeSessions;

    // Update stats display
    const statsContainer = document.querySelector('.session-stats');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Total Sessions:</span>
                <span class="stat-value">${totalSessions}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Active:</span>
                <span class="stat-value active">${activeSessions}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Inactive:</span>
                <span class="stat-value inactive">${inactiveSessions}</span>
            </div>
        `;
    }
}

// Show/hide sessions loading state
function showSessionsLoading(isLoading) {
    const loadingIndicator = document.getElementById('sessionsLoading');
    const sessionsTable = document.querySelector('#sessionsTable');

    if (loadingIndicator) {
        if (isLoading) {
            loadingIndicator.classList.remove('hidden');
            if (sessionsTable) sessionsTable.style.opacity = '0.5';
        } else {
            loadingIndicator.classList.add('hidden');
            if (sessionsTable) sessionsTable.style.opacity = '1';
        }
    }
}

// Set loading state for session actions
function setSessionActionLoading(sessionId, isLoading) {
    const sessionRow = document.querySelector(
        `tr[data-session-id="${sessionId}"]`
    );
    if (!sessionRow) return;

    const actionButtons = sessionRow.querySelectorAll('.table-actions button');

    if (isLoading) {
        actionButtons.forEach((btn) => {
            btn.disabled = true;
            btn.style.opacity = '0.6';
            btn.textContent = 'Processing...';
        });
    } else {
        actionButtons.forEach((btn) => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.textContent = 'Revoke';
        });
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Setup revert functionality for role select dropdowns
function setupRoleSelectRevertFunctionality() {
    // Find all role select dropdowns
    const roleSelects = document.querySelectorAll('.role-select');

    roleSelects.forEach((roleSelect) => {
        // Store the original value when the dropdown is first set up
        if (!roleSelect.hasAttribute('data-original-value')) {
            roleSelect.setAttribute('data-original-value', roleSelect.value);
        }

        // Add revert function to the dropdown element
        roleSelect.revertToOriginal = function () {
            const originalValue = this.getAttribute('data-original-value');
            if (originalValue !== null) {
                this.value = originalValue;
            }
        };

        // Update the stored original value when the change is confirmed (after successful API call)
        // This will be called from the success callback in editUserRole
        roleSelect.updateOriginalValue = function () {
            this.setAttribute('data-original-value', this.value);
        };
    });
}

// Make functions available globally
window.adminPage = {
    initializeAdminPage,
    editUserRole,
    deleteUser,
    revokeSession,
    loadAllSessions,
    displaySessions,
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.adminPage;
}
