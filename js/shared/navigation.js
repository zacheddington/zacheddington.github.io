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
            path.includes('/view_eeg/') ||
            path.includes('/enter_eeg/') ||
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

        // Find the page title element and insert navigation after it
        const pageTitle = headerContainer.querySelector('.page-title');
        if (pageTitle) {
            pageTitle.insertAdjacentHTML('afterend', menuHTML);
        } else {
            headerContainer.insertAdjacentHTML('beforeend', menuHTML);
        }

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
                <li><a href="/welcome/" data-page="welcome">🏠 Home</a></li>
                <li><a href="/patients/" data-page="patients">👥 Patients</a></li>
                <li><a href="/enter_eeg/" data-page="enter_eeg">📊 Enter EEG</a></li>
                <li><a href="/view_eeg/" data-page="view_eeg">📈 View EEG</a></li>
                <li><a href="/profile/" data-page="profile">👤 Profile</a></li>
                <li class="admin-only dropdown">
                    <a href="/admin/" data-page="admin">⚙️ Admin</a>
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

    const pageTitle = headerContainer.querySelector('.page-title');
    if (pageTitle) {
        pageTitle.insertAdjacentHTML('afterend', fallbackNav);
    } else {
        headerContainer.insertAdjacentHTML('beforeend', fallbackNav);
    }

    setupTopNavigation();
    console.log('✅ Fallback navigation created');
}

// Setup top navigation functionality
function setupTopNavigation() {
    // Set active page
    setActiveNavItem();

    // Setup logout functionality
    setupLogout();

    // Setup admin visibility
    setupAdminVisibility();

    console.log('✅ Top navigation setup complete');
}

// Set active navigation item based on current page
function setActiveNavItem() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.top-nav-menu a[data-page]');

    navLinks.forEach((link) => {
        const page = link.getAttribute('data-page');
        link.classList.remove('active');

        if (currentPath.includes(`/${page}/`)) {
            link.classList.add('active');
        }
    });
}

// Setup logout functionality
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutLink = document.getElementById('logoutLink');

    const handleLogout = () => {
        if (confirm('Are you sure you want to logout?')) {
            // Clear any stored authentication data
            localStorage.clear();
            sessionStorage.clear();

            // Redirect to login page
            window.location.href = '/';
        }
    };

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }
}

// Setup admin menu visibility based on user role
function setupAdminVisibility() {
    // This would typically check user permissions from localStorage or API
    // For now, we'll show admin items by default
    const isAdmin = true; // Replace with actual permission check

    if (isAdmin) {
        document.body.classList.add('admin');
        const adminItems = document.querySelectorAll('.admin-only');
        adminItems.forEach((item) => {
            item.style.display = 'block';
        });
    }
}

// Fade navigation for smooth page transitions
function setupFadeNavigation() {
    const navLinks = document.querySelectorAll('.top-nav-menu a[href^="/"]');

    navLinks.forEach((link) => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');

            // Don't prevent default for external links or if no fade needed
            if (!href || href.startsWith('http') || href.startsWith('#')) {
                return;
            }

            e.preventDefault();

            // Add fade out effect
            document.body.style.opacity = '0.8';
            document.body.style.transition = 'opacity 0.2s ease';

            // Navigate after short delay
            setTimeout(() => {
                window.location.href = href;
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
    setupFadeNavigation,
    setupPatientNumberValidation,
};

// Also expose individual functions for backward compatibility
window.loadMenu = loadTopNavigation; // Backward compatibility
window.loadTopNavigation = loadTopNavigation;
window.setupFadeNavigation = setupFadeNavigation;
window.setupPatientNumberValidation = setupPatientNumberValidation;

console.log('✅ Top navigation utilities loaded');
