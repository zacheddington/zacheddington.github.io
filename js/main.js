document.addEventListener('DOMContentLoaded', function() {
    const API_URL = 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
    const FADE_DURATION = 450;

    // Handle login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        let isShowingModal = false;

        // Update closeModal function for login form
        const originalCloseModal = window.closeModal;
        window.closeModal = function() {
            if (originalCloseModal) originalCloseModal();
            const modal = document.getElementById('feedbackModal');
            if (modal) {
                modal.remove();
                isShowingModal = false; // Reset modal state
            }
        };

        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Prevent multiple modals
            if (isShowingModal) {
                return;
            }

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
                    isShowingModal = true;
                    const message = response.status === 401 
                        ? 'Invalid username or password'
                        : data.error || 'Login failed';
                    
                    showModal('error', message);
                }
            } catch (err) {
                isShowingModal = true;
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

    // Unified modal management
    const modalManager = {
        isShowingModal: false,
        
        showModal: function(type, message) {
            if (this.isShowingModal) return;
            
            this.isShowingModal = true;
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
        },
        
        closeModal: function() {
            const modal = document.getElementById('feedbackModal');
            if (modal) {
                modal.remove();
                this.isShowingModal = false;
                
                // Reset all input modal states for EEG form
                const inputs = ['patientNumber', 'firstName', 'middleName', 'lastName', 'address'];
                inputs.forEach(id => {
                    const input = document.getElementById(id);
                    if (input) input.dataset.showingModal = 'false';
                });
            }
        }
    };

    // Replace all showModal calls with modalManager.showModal
    window.showModal = modalManager.showModal.bind(modalManager);
    window.closeModal = modalManager.closeModal.bind(modalManager);

    // Update login form handler
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            if (modalManager.isShowingModal) return;

            // Prevent multiple modals
            if (isShowingModal) {
                return;
            }

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
                    isShowingModal = true;
                    const message = response.status === 401 
                        ? 'Invalid username or password'
                        : data.error || 'Login failed';
                    
                    showModal('error', message);
                }
            } catch (err) {
                isShowingModal = true;
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

    // Unified modal management
    const modalManager = {
        isShowingModal: false,
        
        showModal: function(type, message) {
            if (this.isShowingModal) return;
            
            this.isShowingModal = true;
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
            
            if