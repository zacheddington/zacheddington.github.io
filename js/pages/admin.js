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
    } // Load hamburger menu for all admin pages
    if (document.getElementById('hamburger-menu') && window.navigation) {
        window.navigation.loadMenu();
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

    console.log('Manage users page initialized');
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
            displayUsers(sortedUsers);
        } else {
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
            console.error('Failed to load roles for user management');
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
            header.style.cursor = 'pointer';
            header.classList.add('sortable-column');
            header.innerHTML = `${column.label} <span class="sort-indicator" data-column="${column.key}"></span>`;
            header.addEventListener('click', () => handleSort(column.key));
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
    updateSortIndicators();

    // Update reset sort button visibility
    updateResetSortButton();

    // Sort and display users
    const sortedUsers = getSortedUsers();
    displayUsers(sortedUsers);
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

    if (!usersTableBody) return;

    if (users.length === 0) {
        usersTableBody.innerHTML = '';
        if (noUsersFound) noUsersFound.classList.remove('hidden');
        return;
    }

    if (noUsersFound) noUsersFound.classList.add('hidden');

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
                <td class="user-username">${user.username}</td>
                <td class="user-fullname">${fullName}</td>
                <td class="user-email">${user.email}</td>
                <td>
                    <span class="user-role ${roleClass}" data-role-key="${primaryRoleKey}">
                        ${primaryRole}
                    </span>
                </td>
                <td class="user-created">${createdDate}</td>
                <td>
                    <div class="user-actions">
                        <button class="btn-icon btn-edit" onclick="editUserRole(${
                            user.user_key
                        })" title="Edit Role" ${
                isCurrentUser ? 'disabled' : ''
            }>
                            ✏️
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteUser(${
                            user.user_key
                        }, '${user.username}')" title="Delete User" ${
                isCurrentUser ? 'disabled' : ''
            }>
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
        })
        .join('');
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
}

// Setup user filter
function setupUserFilter() {
    const userFilter = document.getElementById('userFilter');
    if (userFilter) {
        userFilter.addEventListener('input', filterUsers);
    }
}

// Placeholder functions for user editing and deletion
function editUserRole(userId) {
    console.log('Edit user role functionality for ID:', userId);
    window.modalManager.showModal(
        'info',
        'User role editing functionality will be implemented in a future update.'
    );
}

function deleteUser(userId, username) {
    console.log('Delete user functionality for ID:', userId);
    window.modalManager.showModal(
        'info',
        'User deletion functionality will be implemented in a future update.'
    );
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

// Make admin functions available globally
window.adminPage = {
    initializeAdminPage,
    setupAdminNavigation,
    loadUsers,
    editUserRole,
    deleteUser,
};
