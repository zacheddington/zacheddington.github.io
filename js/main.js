document.addEventListener('DOMContentLoaded', function() {
    const API_URL = 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
    const FADE_DURATION = 450;

    // Handle login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';

            try {
                const username = document.getElementById('username').value.trim();
                const password = document.getElementById('password').value;

                const response = await fetch(`${API_URL}/api/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();
                
                if (response.ok && data.token) {
                    console.log('Login response:', data); // Add this debug log
                    
                    // Store token and user data including admin status
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify({
                        username: data.user.username,
                        firstName: data.user.first_name,
                        lastName: data.user.last_name,
                        is_admin: data.user.is_admin // Make sure we use the same property name as server
                    }));
                    
                    // Add admin class to body if user is admin
                    if (data.user.is_admin) {
                        document.body.classList.add('is-admin');
                    }
                    
                    document.body.classList.add('fade-out');
                    setTimeout(() => {
                        window.location.href = "welcome/";
                    }, FADE_DURATION);
                } else {
                    const message = response.status === 401 
                        ? 'Invalid username or password'
                        : data.error || 'Login failed';
                    
                    showModal('error', message);
                }
            } catch (err) {
                console.error('Login error:', err);
                showModal('error', 'Connection error. Please try again.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
            }
        });
    }

    // Load and setup the menu
    async function loadMenu() {
        try {
            const response = await fetch('../html/menu.html');
            const html = await response.text();
            document.getElementById('hamburger-menu').innerHTML = html;

            // After menu is loaded, update visibility based on user role
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            console.log('User data from storage:', userData); // Add this debug log
            
            const adminLink = document.querySelector('a[data-page="admin"]')?.parentElement;
            if (adminLink) {
                console.log('Admin link found, is_admin:', userData.is_admin); // Add this debug log
                adminLink.style.display = userData.is_admin ? 'block' : 'none';
            }

            // Setup menu event listeners
            setupMenuHandlers();
        } catch (err) {
            console.error('Error loading menu:', err)
        }
    }

    function setupMenuHandlers() {
        // Remove current page link from menu
        const path = window.location.pathname.split("/").filter(Boolean);
        const pageKey = path.includes('welcome') ? 'welcome' 
                    : path.includes('enter_eeg') ? 'enter_eeg'
                    : path.includes('view_eeg') ? 'view_eeg'
                    : path.includes('profile') ? 'profile' 
                    : '';

        document.querySelectorAll('.side-menu a[data-page]').forEach(link => {
            if (link.getAttribute('data-page') === pageKey) {
                link.parentElement.style.display = 'none';
            }
        });

        // Setup hamburger menu functionality
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const sideMenu = document.getElementById('sideMenu');
        const logoutLink = document.getElementById('logoutLink');

        if (hamburgerBtn && sideMenu) {
            hamburgerBtn.onclick = function() {
                sideMenu.classList.toggle('open');
                hamburgerBtn.classList.toggle('open');
            };

            // Close menu when clicking outside
            document.addEventListener('click', function(event) {
                if (sideMenu.classList.contains('open') && 
                    !sideMenu.contains(event.target) && 
                    !hamburgerBtn.contains(event.target)) {
                    sideMenu.classList.remove('open');
                    hamburgerBtn.classList.remove('open');
                }
            });
        }

        // Setup menu navigation
        document.querySelectorAll('.side-menu a').forEach(link => {
            link.addEventListener('click', function(e) {
                const href = link.getAttribute('href');
                if (href && href !== '#') {
                    e.preventDefault();
                    sideMenu.classList.remove('open');
                    hamburgerBtn.classList.remove('open');
                    handleNavigation(href);
                }
            });
        });

        // Setup logout functionality
        if (logoutLink) {
            logoutLink.onclick = function(e) {
                e.preventDefault();
                handleNavigation("/");
            };
        }
    }

    // Navigation helper function
    const handleNavigation = (href) => {
        document.body.classList.add('fade-out');
        setTimeout(() => {
            window.location.href = href;
        }, FADE_DURATION);
    };

    // Setup general navigation links
    document.querySelectorAll('.fade-nav').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = link.getAttribute('href');
            if (href && href !== '#') {
                e.preventDefault();
                handleNavigation(href);
            }
        });
    });

    // Handle EEG form submission if present
    const eegForm = document.querySelector('.eeg-form');
    const showModal = (type, message) => {
        const modalHtml = `
            <div class="modal" id="feedbackModal">
                <div class="modal-content ${type}">
                    <h2>${type === 'success' ? '✓ Success!' : '⚠ Error'}</h2>
                    <p>${message}</p>
                    ${type === 'success' ? '' : '<button class="modal-btn" onclick="closeModal()">Close</button>'}
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        if (type === 'success') {
            setTimeout(() => {
                document.body.classList.add('fade-out');
                setTimeout(() => {
                    window.location.href = "../welcome/";
                }, FADE_DURATION);
            }, 2000);
        }
    };

    window.closeModal = () => {
        const modal = document.getElementById('feedbackModal');
        if (modal) {
            modal.remove();
            // Reset all input modal states
            [patientNumber, firstName, middleName, lastName, address].forEach(input => {
                if (input) input.dataset.showingModal = 'false';
            });
        }
    };

    if (eegForm) {
        // Add a submitting flag to track form state
        let isSubmitting = false;

        // Update submit button styles when disabled
        const submitButton = eegForm.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.style.transition = 'opacity 0.3s ease';
        }

        // Add input validation listeners
        const patientNumber = document.getElementById('patientNumber');
        const firstName = document.getElementById('firstName');
        const middleName = document.getElementById('middleName');
        const lastName = document.getElementById('lastName');
        const address = document.getElementById('address');

        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = 'Only numbers and hyphens are allowed';
        patientNumber.parentElement.appendChild(tooltip);

        let tooltipTimeout;

        // Validate patient number (numbers and hyphens only, max 20 chars)
        patientNumber?.addEventListener('input', (e) => {
            const originalValue = e.target.value;
            const newValue = originalValue.replace(/[^0-9-]/g, '');
            
            // If characters were removed, show tooltip
            if (originalValue !== newValue) {
                e.target.value = newValue;
                tooltip.classList.add('show');
                clearTimeout(tooltipTimeout);
                tooltipTimeout = setTimeout(() => {
                    tooltip.classList.remove('show');
                }, 2000);
            }

            // Handle max length without multiple modals
            if (newValue.length > 20) {
                e.target.value = newValue.slice(0, 20);
                if (patientNumber.dataset.showingModal !== 'true') {
                    patientNumber.dataset.showingModal = 'true';
                    showModal('error', 'Patient Number must be 20 characters or less');
                }
            } else {
                patientNumber.dataset.showingModal = 'false';
            }
        });

        // Clean up tooltip when leaving the input
        patientNumber?.addEventListener('blur', () => {
            tooltip.classList.remove('show');
            clearTimeout(tooltipTimeout);
        });

        // Validate name lengths (50 chars) without multiple modals
        [firstName, middleName, lastName].forEach(input => {
            input?.addEventListener('input', (e) => {
                if (e.target.value.length > 50) {
                    e.target.value = e.target.value.slice(0, 50);
                    if (input.dataset.showingModal !== 'true') {
                        input.dataset.showingModal = 'true';
                        const labelText = document.querySelector(`label[for="${input.id}"]`)?.textContent || input.placeholder;
                        showModal('error', `${labelText} must be 50 characters or less`);
                    }
                } else {
                    input.dataset.showingModal = 'false';
                }
            });
        });

        // Do the same for address
        address?.addEventListener('input', (e) => {
            if (e.target.value.length > 100) {
                e.target.value = e.target.value.slice(0, 100);
                if (address.dataset.showingModal !== 'true') {
                    address.dataset.showingModal = 'true';
                    const labelText = document.querySelector('label[for="address"]')?.textContent || 'Address';
                    showModal('error', `${labelText} must be 100 characters or less`);
                }
            } else {
                address.dataset.showingModal = 'false';
            }
        });

        eegForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Prevent multiple submissions
            if (isSubmitting) {
                console.log('Form submission already in progress');
                return;
            }

            try {
                isSubmitting = true;
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.style.opacity = '0.5';
                }

                const who = 'PlaceholderUser'; // Replace with actual logged-in user logic
                
                // Enhanced validation
                const validationErrors = [];
                
                if (!patientNumber?.value) validationErrors.push('Patient Number is required');
                if (!firstName?.value) validationErrors.push('First Name is required');
                if (!lastName?.value) validationErrors.push('Last Name is required');
                
                if (validationErrors.length > 0) {
                    showModal('error', validationErrors.join('<br>'));
                    return;
                }

                const data = {
                    patientNumber: patientNumber.value,
                    firstName: firstName.value,
                    middleName: middleName?.value || '',
                    lastName: lastName.value,
                    address: address?.value || '',
                    who: who,
                    datewhen: new Date().toISOString()
                };

                console.log('Submitting data:', data);

                const response = await fetch('https://integrisneuro-eec31e4aaab1.herokuapp.com/api/eeg', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const responseData = await response.json();

                if (response.ok) {
                    showModal('success', 'Patient information saved successfully!');
                    // Disable all form inputs
                    Array.from(eegForm.elements).forEach(input => {
                        input.disabled = true;
                    });
                } else {
                    showModal('error', `Server Error: ${responseData.error || 'Unknown error occurred'}`);
                    // Re-enable submission on error
                    isSubmitting = false;
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.style.opacity = '1';
                    }
                }
            } catch (err) {
                console.error('Submission error:', err);
                showModal('error', 'Network Error: Unable to connect to the server');
                // Re-enable submission on error
                isSubmitting = false;
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.style.opacity = '1';
                }
            }
        });
    }

    // Update your API calls to include token
    const makeAuthenticatedRequest = async (url, options = {}) => {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/';
            return;
        }

        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
            return;
        }

        return response;
    };

    // Check if current page is admin and user is admin
    if (window.location.pathname.includes('/admin/')) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user.isAdmin) {
            window.location.href = '../welcome/';
            return;
        }
        initializeAdminPage();
    }

    function initializeAdminPage() {
        // Tab switching
        const tabs = document.querySelectorAll('.tab-btn');
        tabs?.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const contentId = `${tab.dataset.tab}-tab`;
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(contentId).classList.add('active');
            });
        });

        // Create user form handling
        const createUserForm = document.getElementById('createUserForm');
        createUserForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const password = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (password !== confirmPassword) {
                showModal('error', 'Passwords do not match');
                return;
            }

            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_URL}/api/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        username: document.getElementById('newUsername').value,
                        password: password,
                        firstName: document.getElementById('firstName').value,
                        lastName: document.getElementById('lastName').value,
                        email: document.getElementById('email').value
                    })
                });

                const data = await response.json();
                
                if (response.ok) {
                    showModal('success', 'User created successfully');
                    createUserForm.reset();
                    loadUsers(); // Refresh user list
                } else {
                    showModal('error', data.error || 'Failed to create user');
                }
            } catch (err) {
                console.error('Error creating user:', err);
                showModal('error', 'Connection error. Please try again.');
            }
        });

        // Load users initially
        loadUsers();
    }

    async function loadUsers() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const users = await response.json();
                const usersList = document.querySelector('.users-list');
                
                usersList.innerHTML = users.map(user => `
                    <div class="user-card" data-user-id="${user.user_key}">
                        <div class="user-info">
                            <h3>${user.username}</h3>
                            <p>${user.first_name} ${user.last_name}</p>
                            <p>${user.email}</p>
                        </div>
                        <div class="user-actions">
                            <button class="edit-btn">Edit</button>
                            <button class="reset-btn">Reset Password</button>
                            <button class="delete-btn">Delete</button>
                        </div>
                    </div>
                `).join('');

                setupUserActions();
            }
        } catch (err) {
            console.error('Error loading users:', err);
        }
    }

    function setupUserActions() {
        document.querySelectorAll('.user-card').forEach(card => {
            const userId = card.dataset.userId;
            
            card.querySelector('.edit-btn')?.addEventListener('click', () => handleEditUser(userId));
            card.querySelector('.reset-btn')?.addEventListener('click', () => handleResetPassword(userId));
            card.querySelector('.delete-btn')?.addEventListener('click', () => handleDeleteUser(userId));
        });
    }

    if (document.getElementById('hamburger-menu')) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.is_admin) {
            document.body.classList.add('is-admin');
        }
        loadMenu();
    }
});