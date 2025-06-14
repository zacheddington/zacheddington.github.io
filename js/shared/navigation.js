// Top Navigation Utilities
// Handles top menu loading, navigation, and page transitions

// Load top navigation menu
async function loadTopNavigation() {
    try {
        const headerContainer = document.querySelector('.app-header');
        if (!headerContainer) {
            console.warn('Header container not found');
            return;
        }

        // Check if navigation is already loaded
        const existingNav = headerContainer.querySelector('.top-nav-menu');
        if (existingNav) {
            console.log('Top navigation already loaded');
            setupTopNavigation();
            return;
        }

        // Determine the correct path to menu.html based on current location
        const path = window.location.pathname;
        let menuPath = '/html/menu.html';

        // If we're in a subfolder, adjust the path
        if (
            path.includes('/admin/') ||
            path.includes('/patients/') ||
            path.includes('/profile/') ||
            path.includes('/welcome/') ||
            path.includes('/force-password-change/') ||
            path.includes('/2fa-setup/')
        ) {
            const depth = (path.match(/\//g) || []).length - 1;
            if (depth > 1) {
                menuPath = '../../html/menu.html';
            } else {
                menuPath = '../html/menu.html';
            }
        }

        console.log('Loading menu from:', menuPath);
        const response = await fetch(menuPath);
        if (!response.ok) {
            throw new Error(`Failed to load menu: ${response.status}`);
        }
        const menuHTML = await response.text();

        // Insert navigation directly into the header
        headerContainer.insertAdjacentHTML('beforeend', menuHTML);

        setupTopNavigation();
        console.log('✅ Top navigation loaded successfully');
    } catch (err) {
        console.error('Error loading top navigation:', err);

        // Fallback: create a simple navigation inline if loading fails
        createFallbackNavigation();
    }
}

// Create fallback navigation if menu.html fails to load
function createFallbackNavigation() {
    const headerContainer = document.querySelector('.app-header');
    if (!headerContainer) return;

    const fallbackNav = `
        <nav class="top-nav-menu">
            <ul>
                <li><a href="/welcome/" data-page="welcome">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9,22 9,12 15,12 15,22"/>
                    </svg>
                    Home
                </a></li>
                <li><a href="/patients/" data-page="patients">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    Patients
                </a></li>
                <li><a href="/profile/" data-page="profile">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                    Profile
                </a></li>
                <li class="admin-only dropdown">
                    <a href="/admin/" data-page="admin">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                        </svg>
                        Admin
                    </a>
                    <div class="dropdown-content">
                        <a href="/admin/manage-users/">Manage Users</a>
                        <a href="/admin/create-user/">Create User</a>
                    </div>
                </li>
            </ul>
        </nav>
        <div class="user-profile">
            <button class="logout-btn" id="logoutBtn">Logout</button>
        </div>
    `;

    headerContainer.insertAdjacentHTML('beforeend', fallbackNav);
    setupTopNavigation();
    console.log('✅ Fallback navigation created');
}

// Setup top navigation functionality
function setupTopNavigation() {
    // Set active page
    setActiveNavItem();

    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            if (window.authUtils && window.authUtils.logout) {
                window.authUtils.logout();
            } else {
                // Fallback logout
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/';
            }
        });
    }
}

// Set active navigation item based on current page
function setActiveNavItem() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.top-nav-menu a[data-page]');

    navLinks.forEach((link) => {
        const page = link.getAttribute('data-page');
        // Remove active class first
        link.classList.remove('active');

        // Check if current path matches this page
        if (currentPath.includes(`/${page}/`)) {
            link.classList.add('active');
        }
    });
}

// Page transition with fade effect
function setupFadeNavigation() {
    const navLinks = document.querySelectorAll('.top-nav-menu a[data-page]');

    navLinks.forEach((link) => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            const targetUrl = this.getAttribute('href');
            const currentPage = document.body;

            // Add fade-out class
            currentPage.style.opacity = '0';
            currentPage.style.transition = 'opacity 0.15s ease-out';

            // Navigate after fade-out completes
            setTimeout(() => {
                window.location.href = targetUrl;
            }, 150);
        });
    });
}

// Patient number validation (keeping this for compatibility)
function setupPatientNumberValidation() {
    const patientNumberInput = document.getElementById('patientNumber');
    const tooltip = document.getElementById('patientNumberTooltip');

    if (!patientNumberInput || !tooltip) {
        return;
    }

    patientNumberInput.addEventListener('input', function () {
        const value = this.value;
        const isValid = /^\d{4}$/.test(value);

        if (value.length > 0 && !isValid) {
            tooltip.textContent = 'Patient number must be exactly 4 digits';
            tooltip.classList.add('show');
        } else {
            tooltip.classList.remove('show');
        }
    });

    patientNumberInput.addEventListener('focus', function () {
        tooltip.classList.remove('show');
    });
}

// Make navigation utilities available globally
window.navigation = {
    loadTopNavigation,
    loadMenu: loadTopNavigation, // Add loadMenu for backward compatibility
    setupFadeNavigation,
    setupPatientNumberValidation,
};

// Also expose individual functions for backward compatibility
window.loadMenu = loadTopNavigation; // Backward compatibility
window.loadTopNavigation = loadTopNavigation;
window.setupFadeNavigation = setupFadeNavigation;
window.setupPatientNumberValidation = setupPatientNumberValidation;

console.log('✅ Top navigation utilities loaded');
