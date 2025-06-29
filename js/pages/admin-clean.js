// Clean Admin Page JS - Users Table Only
// This removes all table-specific code and uses unified table utilities

let allUsers = [];
let currentUserSort = { column: null, direction: null };

// Initialize manage users page
async function initializeManageUsers() {
    console.log('🔧 Initializing manage users page...');
    
    try {
        // Load users data first
        await loadUsers();
        
        // Set up user filter
        setupUserFilter();
        
        console.log('✅ Manage users page initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing manage users page:', error);
        showErrorMessage('Failed to load users. Please refresh the page.');
    }
}

// Load all users from API
async function loadUsers() {
    try {
        const response = await fetch('/api/users', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        allUsers = await response.json();
        console.log(`📊 Loaded ${allUsers.length} users`);
        
        // Display users in table
        displayUsers(allUsers);
        
    } catch (error) {
        console.error('Error loading users:', error);
        throw error;
    }
}

// Display users in the table
function displayUsers(users) {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) {
        console.error('Users table body not found');
        return;
    }
    
    if (!users || users.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem; color: var(--color-text-muted);">
                    No users found
                </td>
            </tr>
        `;
        return;
    }
    
    const tableHTML = users.map(user => createUserRowHTML(user)).join('');
    tableBody.innerHTML = tableHTML;
    
    // Attach event listeners for user actions
    attachUserEventListeners();
}

// Create HTML for a user row
function createUserRowHTML(user) {
    const canDelete = canDeleteUsers();
    
    return `
        <tr data-user-id="${user.id || user._id}">
            <td>${escapeHtml(user.username || 'N/A')}</td>
            <td>${escapeHtml(user.name || 'N/A')}</td>
            <td>${escapeHtml(user.email || 'N/A')}</td>
            <td>
                <select class="role-select" data-user-id="${user.id || user._id}">
                    <option value="user" ${(user.role || '').toLowerCase() === 'user' ? 'selected' : ''}>User</option>
                    <option value="administrator" ${(user.role || '').toLowerCase() === 'administrator' ? 'selected' : ''}>Administrator</option>
                </select>
            </td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-edit secondary-btn" data-user-id="${user.id || user._id}">
                        Edit
                    </button>
                    ${canDelete ? `
                        <button class="btn-delete danger-btn" data-user-id="${user.id || user._id}">
                            Delete
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `;
}

// Set up user filter functionality
function setupUserFilter() {
    const filterInput = document.getElementById('userFilter');
    if (!filterInput) return;
    
    filterInput.addEventListener('input', debounce(filterUsers, 300));
}

// Filter users based on search input
function filterUsers() {
    const filterValue = document.getElementById('userFilter').value.toLowerCase().trim();
    
    if (!filterValue) {
        displayUsers(allUsers);
        return;
    }
    
    const filteredUsers = allUsers.filter(user => {
        const searchableText = [
            user.username || '',
            user.name || '',
            user.email || ''
        ].join(' ').toLowerCase();
        
        return searchableText.includes(filterValue);
    });
    
    displayUsers(filteredUsers);
}

// Attach event listeners for user actions
function attachUserEventListeners() {
    // Role change listeners
    document.querySelectorAll('.role-select').forEach(select => {
        select.addEventListener('change', handleRoleChange);
    });
    
    // Edit button listeners
    document.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', handleEditUser);
    });
    
    // Delete button listeners
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', handleDeleteUser);
    });
}

// Handle role change
async function handleRoleChange(event) {
    const userId = event.target.getAttribute('data-user-id');
    const newRole = event.target.value;
    
    try {
        const response = await fetch(`/api/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ role: newRole })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update user role');
        }
        
        // Update local data
        const user = allUsers.find(u => (u.id || u._id) === userId);
        if (user) {
            user.role = newRole;
        }
        
        showSuccessMessage('User role updated successfully');
        
    } catch (error) {
        console.error('Error updating user role:', error);
        showErrorMessage('Failed to update user role');
        // Revert the select to original value
        await loadUsers();
    }
}

// Handle edit user
function handleEditUser(event) {
    const userId = event.target.getAttribute('data-user-id');
    // Navigate to edit user page or open edit modal
    console.log('Edit user:', userId);
    // Implementation depends on your edit user flow
}

// Handle delete user
async function handleDeleteUser(event) {
    const userId = event.target.getAttribute('data-user-id');
    const user = allUsers.find(u => (u.id || u._id) === userId);
    
    if (!user) return;
    
    if (!confirm(`Are you sure you want to delete user "${user.username}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete user');
        }
        
        // Remove from local array
        allUsers = allUsers.filter(u => (u.id || u._id) !== userId);
        
        // Refresh display
        displayUsers(allUsers);
        
        showSuccessMessage('User deleted successfully');
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showErrorMessage('Failed to delete user');
    }
}

// Utility functions
function canDeleteUsers() {
    try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        return userData.isAdmin === true || 
               (userData.roles && userData.roles.some(role => role && role.toLowerCase().includes('administrator')));
    } catch {
        return false;
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString();
    } catch {
        return 'Invalid date';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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

function showSuccessMessage(message) {
    console.log('✅', message);
    // Implement your success message UI
}

function showErrorMessage(message) {
    console.error('❌', message);
    // Implement your error message UI
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeManageUsers);
} else {
    initializeManageUsers();
}
