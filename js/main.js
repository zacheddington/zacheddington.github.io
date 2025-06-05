console.log('main.js loaded on', window.location.pathname);
let myElement = document.getElementById("loginForm");

if (myElement) {
  // Element with the ID "myElement" exists in the DOM
  console.log("loginForm exists!");
} else {
  // Element with the ID "myElement" does not exist in the DOM
  console.log("loginForm does not exist.");
}
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

                const data = await response.json();
                
                // Update the login handler to store admin status correctly
                if (response.ok && data.token) {
                    // Log all properties received from the server
                    console.log('User object received from server:', data.user);

                    // Store all properties for debugging
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));

                    // Use the correct admin property for menu logic
                    if (data.user.isadmin) {
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
    });
    
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
            });

            // Check if user is admin and show/hide admin link
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            console.log('User data from storage:', userData);

            const adminLink = sideMenu.querySelector('a[data-page="admin"]')?.parentElement;
            if (adminLink) {
                console.log('Admin link found, isadmin:', userData.isadmin);
                adminLink.style.display = userData.isadmin ? 'block' : 'none';
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