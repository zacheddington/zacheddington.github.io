document.addEventListener('DOMContentLoaded', function() {
    const API_URL = 'https://integrisneuro-eec31e4aaab1.herokuapp.com'; // or your local server
    const FADE_DURATION = 450;
    
    // Unified modal management
    const modalManager = {
        isShowingModal: false,
        
        showModal: function(type, message) {
            if (this.isShowingModal) return;
            
            this.isShowingModal = true;
            const modalHtml = `
                <div class="modal" id="feedbackModal" tabindex="-1">
                    <div class="modal-content ${type}">
                        <h2>${type === 'success' ? '✓ Success!' : '⚠ Error'}</h2>
                        <p>${message}</p>
                        ${type === 'success' ? '' : '<button class="modal-btn" onclick="closeModal()">Close</button>'}
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Add keyboard event listener for error modals
            if (type !== 'success') {
                const modal = document.getElementById('feedbackModal');
                modal.focus();
                modal.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                        closeModal();
                    }
                });
            }
            
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

    // Make modal functions globally available
    window.showModal = modalManager.showModal.bind(modalManager);
    window.closeModal = modalManager.closeModal.bind(modalManager);

    // Handle login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Login form submitted!'); // <-- Add this

            if (modalManager.isShowingModal) return;

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

                const data = await response.json();                // Update the login handler to store admin status correctly
                if (response.ok && data.token) {
                    // Log all properties received from the server
                    console.log('User object received from server:', data.user);
                    console.log('All server user properties:', Object.keys(data.user));
                    console.log('Admin status received:', data.user.isAdmin, typeof data.user.isAdmin);
                    console.log('Roles received:', data.user.roles);

                    // Store all properties for debugging
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));

                    // Use role-based admin status from server response
                    const isAdminUser = data.user.isAdmin === true;
                    
                    if (isAdminUser) {
                        document.body.classList.add('is-admin');
                        console.log('Added is-admin class to body during login');
                    }

                    document.body.classList.add('fade-out');
                    setTimeout(() => {
                        window.location.href = "welcome/";
                    }, FADE_DURATION);
                } else {
                    const message = response.status === 401 
                        ? 'Invalid username or password'
                        : data.error || 'Login failed';
                    
                    modalManager.showModal('error', message);
                }
            } catch (err) {
                console.error('Login error:', err);
                modalManager.showModal('error', 'Connection error. Please try again.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
            }
        });
    } else {
        console.log('loginForm not found!');
    }    // Set admin class on body if user is admin (for all pages)
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    console.log('Page load - User data:', userData);
    console.log('Page load - All user properties:', Object.keys(userData));
    console.log('Page load - Admin status:', userData.isAdmin, typeof userData.isAdmin);
    console.log('Page load - Role keys:', userData.roleKeys);
    console.log('Page load - Roles:', userData.roles);
    
    // Use server-determined admin status with fallback for old data
    let isAdminUser = userData.isAdmin === true;
      // Fallback: If role data is missing and username is admin, assume admin
    // This handles users who logged in before role-based auth was implemented
    if (userData.isAdmin === undefined && userData.username === 'admin') {
        isAdminUser = true;
        console.log('Using fallback admin detection for username: admin');
        
        // Show a subtle notification that they should refresh their login
        if (!sessionStorage.getItem('legacy-auth-notice-shown')) {
            console.log('Showing legacy auth notice');
            setTimeout(() => {
                const notice = document.createElement('div');
                notice.style.cssText = `
                    position: fixed; 
                    top: 10px; 
                    right: 10px; 
                    background: #2196F3; 
                    color: white; 
                    padding: 10px 15px; 
                    border-radius: 4px; 
                    font-size: 0.9rem;
                    z-index: 10000;
                    cursor: pointer;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                `;
                notice.textContent = 'Enhanced authentication available - click to refresh login';
                notice.onclick = () => {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.href = '/';
                };
                document.body.appendChild(notice);
                
                // Auto-hide after 8 seconds
                setTimeout(() => {
                    if (notice.parentNode) {
                        notice.remove();
                    }
                }, 8000);
            }, 2000);
            sessionStorage.setItem('legacy-auth-notice-shown', 'true');
        }
    }
    
    console.log('Is admin user check result:', isAdminUser);
    
    if (isAdminUser) {
        document.body.classList.add('is-admin');
        console.log('Added is-admin class to body on page load');
    }

    // Menu and navigation functionality
    if (document.getElementById('hamburger-menu')) {
        loadMenu();
    }
      // Setup general navigation links
    document.querySelectorAll('.fade-nav').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = link.getAttribute('href');
            if (href && href !== '#') {
                e.preventDefault();
                handleNavigation(href);
            }
        });
    });    // Patient number validation - only allow numbers and hyphens
    const patientNumberInput = document.getElementById('patientNumber');
    if (patientNumberInput) {
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = 'Only numbers and hyphens are allowed';
        
        // Get the input wrapper and append tooltip
        const inputWrapper = patientNumberInput.closest('.input-wrapper');
        if (inputWrapper) {
            inputWrapper.appendChild(tooltip);
        }

        let tooltipTimeout;

        const showTooltip = () => {
            tooltip.classList.add('show');
            clearTimeout(tooltipTimeout);
            tooltipTimeout = setTimeout(() => {
                tooltip.classList.remove('show');
            }, 2000);
        };

        patientNumberInput.addEventListener('input', function(e) {
            // Remove any characters that are not numbers or hyphens
            const value = e.target.value;
            const filteredValue = value.replace(/[^0-9\-]/g, '');
            
            if (value !== filteredValue) {
                e.target.value = filteredValue;
                showTooltip();
            }
        });

        // Also prevent invalid characters from being typed and show tooltip
        patientNumberInput.addEventListener('keypress', function(e) {
            const char = String.fromCharCode(e.which);
            if (!/[0-9\-]/.test(char)) {
                e.preventDefault();
                showTooltip();
            }
        });

        // Hide tooltip when input is focused and user starts typing valid characters
        patientNumberInput.addEventListener('focus', function() {
            tooltip.classList.remove('show');
        });
    }
    
});

async function loadMenu() {
    try {
        const response = await fetch('../html/menu.html');
        const html = await response.text();
        document.getElementById('hamburger-menu').innerHTML = html;

        // Setup hamburger button click handler
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const sideMenu = document.getElementById('sideMenu');
        
        if (hamburgerBtn && sideMenu) {
            hamburgerBtn.addEventListener('click', () => {
                document.body.classList.toggle('menu-open');
                hamburgerBtn.classList.toggle('active');
                sideMenu.classList.toggle('active');
            });

            // Hide current page in menu
            const currentPath = window.location.pathname;
            const currentPage = currentPath.split('/').filter(Boolean).pop() || 'welcome';
            
            const menuItems = sideMenu.querySelectorAll('a[data-page]');
            menuItems.forEach(item => {
                if (item.getAttribute('data-page') === currentPage) {
                    item.parentElement.style.display = 'none';
                }
            });            // Check if user is admin and show/hide admin link
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            console.log('Menu - User data from storage:', userData);
            console.log('Menu - All user properties:', Object.keys(userData));
            console.log('Menu - Admin status:', userData.isAdmin, typeof userData.isAdmin);
            console.log('Menu - Role keys:', userData.roleKeys);
            console.log('Menu - Roles:', userData.roles);

            // Use server-determined admin status with fallback for old data
            let isAdminUser = userData.isAdmin === true;
            
            // Fallback: If role data is missing and username is admin, assume admin
            // This handles users who logged in before role-based auth was implemented
            if (userData.isAdmin === undefined && userData.username === 'admin') {
                isAdminUser = true;
                console.log('Menu - Using fallback admin detection for username: admin');
            }
            
            console.log('Menu - Is admin user result:', isAdminUser);

            const adminLink = sideMenu.querySelector('a[data-page="admin"]')?.parentElement;
            if (adminLink) {
                console.log('Admin link found in menu');
                // Show admin link if user is admin
                if (isAdminUser) {
                    adminLink.style.display = 'block';
                    adminLink.classList.remove('admin-only'); // Remove class that hides it
                    console.log('Showing admin link');
                } else {
                    adminLink.style.display = 'none';
                    console.log('Hiding admin link');
                }
            } else {
                console.log('Admin link not found in menu');
            }
        }

        // Add click handler for logout
        const logoutLink = document.getElementById('logoutLink');
        logoutLink?.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = '../';
        });

    } catch (err) {
        console.error('Error loading menu:', err);
    }
}