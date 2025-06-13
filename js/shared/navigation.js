// Navigation Utilities
// Handles menu loading, navigation, and page transitions

// Load hamburger menu
async function loadMenu() {
    try {
        const hamburgerContainer = document.getElementById('hamburger-menu');
        if (!hamburgerContainer) {
            console.warn('Hamburger container not found');
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

        const response = await fetch(menuPath);
        if (!response.ok) {
            throw new Error(`Failed to load menu: ${response.status}`);
        }

        const menuHTML = await response.text();
        hamburgerContainer.innerHTML = menuHTML; // Add hamburger menu functionality
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const sideMenu = document.getElementById('sideMenu');

        // Create overlay element for better menu interaction
        const menuOverlay = document.createElement('div');
        menuOverlay.className = 'menu-overlay';
        menuOverlay.id = 'menuOverlay';
        document.body.appendChild(menuOverlay);

        if (hamburgerBtn && sideMenu) {
            // Close menu function
            function closeMenu() {
                sideMenu.classList.remove('open');
                hamburgerBtn.classList.remove('active');
                menuOverlay.classList.remove('active');
                document.body.classList.remove('menu-active');

                // Stop scroll monitoring
                stopScrollMonitoring();

                // Restore body properties
                document.body.style.removeProperty('position');
                document.body.style.removeProperty('display');
                document.body.style.removeProperty('align-items');
                document.body.style.removeProperty('justify-content');
                document.body.style.removeProperty('flex-direction');
                document.body.style.removeProperty('transform');
                document.body.style.removeProperty('contain');
                document.body.style.removeProperty('isolation');

                // Restore html properties
                document.documentElement.style.removeProperty('transform');
                document.documentElement.style.removeProperty('position');
                document.documentElement.style.removeProperty('contain');
                document.documentElement.style.removeProperty('isolation');

                // Re-enable transitions for closing animation
                sideMenu.style.removeProperty('transition');
                menuOverlay.style.removeProperty('transition');

                // Reset sidebar positioning when closed (allow CSS to handle the animation)
                sideMenu.style.removeProperty('left');
                sideMenu.style.removeProperty('position');
                sideMenu.style.removeProperty('top');
                sideMenu.style.removeProperty('height');
                sideMenu.style.removeProperty('width');
                sideMenu.style.removeProperty('z-index');

                // Reset overlay
                menuOverlay.style.opacity = '0';
                menuOverlay.style.visibility = 'hidden';
                menuOverlay.style.pointerEvents = 'none';
                menuOverlay.style.removeProperty('position');
                menuOverlay.style.removeProperty('top');
                menuOverlay.style.removeProperty('left');
                menuOverlay.style.removeProperty('width');
                menuOverlay.style.removeProperty('height');
                menuOverlay.style.removeProperty('z-index');
            }

            // Ensure menu is closed on page load (handles any cached state)
            closeMenu();

            // Add comprehensive browser navigation handlers to close menu
            window.addEventListener('popstate', closeMenu);
            window.addEventListener('beforeunload', closeMenu);
            window.addEventListener('pagehide', closeMenu);

            // Add page visibility change handler (for back/forward navigation)
            document.addEventListener('visibilitychange', function () {
                if (document.visibilityState === 'visible') {
                    // Page became visible again (user returned from back/forward)
                    closeMenu();
                }
            });

            // Add window focus handler (additional safety net)
            window.addEventListener('focus', closeMenu);

            // Add pageshow event (fires when page is loaded from cache)
            window.addEventListener('pageshow', function (event) {
                if (event.persisted) {
                    // Page was loaded from cache (back/forward navigation)
                    closeMenu();
                }
            });
            hamburgerBtn.addEventListener('click', function () {
                const isOpening = !sideMenu.classList.contains('open');

                console.log('🍔 HAMBURGER CLICKED - Opening:', isOpening);
                console.log(
                    '📊 Current viewport:',
                    window.innerWidth,
                    'x',
                    window.innerHeight
                );
                console.log(
                    '📜 Current scroll:',
                    window.scrollX,
                    window.scrollY
                );

                sideMenu.classList.toggle('open');
                hamburgerBtn.classList.toggle('active');
                menuOverlay.classList.toggle('active', isOpening);
                document.body.classList.toggle('menu-active', isOpening);
                if (isOpening) {
                    console.log(
                        '🚀 OPENING MENU - Starting aggressive positioning...'
                    );

                    // CRITICAL: Disable transitions immediately to prevent animation interference
                    sideMenu.style.setProperty(
                        'transition',
                        'none',
                        'important'
                    );
                    menuOverlay.style.setProperty(
                        'transition',
                        'none',
                        'important'
                    );

                    // Log initial element states
                    const sideMenuRect = sideMenu.getBoundingClientRect();
                    const overlayRect = menuOverlay.getBoundingClientRect();
                    console.log('📐 Initial sidebar rect:', {
                        top: sideMenuRect.top,
                        left: sideMenuRect.left,
                        width: sideMenuRect.width,
                        height: sideMenuRect.height,
                    });
                    console.log('📐 Initial overlay rect:', {
                        top: overlayRect.top,
                        left: overlayRect.left,
                        width: overlayRect.width,
                        height: overlayRect.height,
                    });
                    // Override body properties that might interfere with fixed positioning
                    document.body.style.setProperty(
                        'position',
                        'static',
                        'important'
                    );
                    document.body.style.setProperty(
                        'display',
                        'block',
                        'important'
                    );
                    document.body.style.setProperty(
                        'align-items',
                        'normal',
                        'important'
                    );
                    document.body.style.setProperty(
                        'justify-content',
                        'normal',
                        'important'
                    );
                    document.body.style.setProperty(
                        'flex-direction',
                        'initial',
                        'important'
                    );
                    document.body.style.setProperty(
                        'transform',
                        'none',
                        'important'
                    );
                    document.body.style.setProperty(
                        'contain',
                        'none',
                        'important'
                    );
                    document.body.style.setProperty(
                        'isolation',
                        'auto',
                        'important'
                    );

                    console.log('🔧 Forcing html/body properties...');
                    // CRITICAL: Ensure elements are positioned relative to viewport, not page
                    // Remove any transform on html and body that might interfere
                    document.documentElement.style.setProperty(
                        'transform',
                        'none',
                        'important'
                    );
                    document.documentElement.style.setProperty(
                        'position',
                        'static',
                        'important'
                    );
                    document.documentElement.style.setProperty(
                        'contain',
                        'none',
                        'important'
                    );

                    console.log(
                        '🎯 APPLYING AGGRESSIVE SIDEBAR POSITIONING...'
                    );
                    // IMMEDIATE: Force sidebar to viewport position before any other operations
                    sideMenu.style.setProperty('left', '0px', 'important');
                    sideMenu.style.setProperty(
                        'position',
                        'fixed',
                        'important'
                    );
                    sideMenu.style.setProperty('top', '0px', 'important');
                    sideMenu.style.setProperty('height', '100vh', 'important');
                    sideMenu.style.setProperty('width', '300px', 'important');
                    sideMenu.style.setProperty(
                        'z-index',
                        '1000',
                        'important'
                    ); /* Above overlay */

                    // Force immediate reflow to apply position changes
                    sideMenu.offsetHeight; // Trigger reflow

                    // Double-check and force position again (overrides any lingering transitions)
                    setTimeout(() => {
                        sideMenu.style.setProperty('left', '0px', 'important');
                        sideMenu.style.setProperty(
                            'position',
                            'fixed',
                            'important'
                        );
                        console.log('🔧 FORCED POSITION RECHECK at left: 0px');
                    }, 0);

                    // Ensure viewport-relative positioning
                    sideMenu.style.setProperty(
                        'transform',
                        'none',
                        'important'
                    );
                    sideMenu.style.setProperty(
                        'will-change',
                        'auto',
                        'important'
                    );
                    sideMenu.style.setProperty('contain', 'none', 'important');
                    sideMenu.style.setProperty(
                        'isolation',
                        'auto',
                        'important'
                    );
                    sideMenu.style.setProperty(
                        'pointer-events',
                        'auto',
                        'important'
                    );
                    sideMenu.style.setProperty(
                        'overflow-y',
                        'auto',
                        'important'
                    ); // Log sidebar positioning after applying styles
                    setTimeout(() => {
                        const newSideMenuRect =
                            sideMenu.getBoundingClientRect();
                        console.log('✅ Sidebar positioned:', {
                            top: newSideMenuRect.top,
                            left: newSideMenuRect.left,
                            width: newSideMenuRect.width,
                            height: newSideMenuRect.height,
                            position:
                                window.getComputedStyle(sideMenu).position,
                            zIndex: window.getComputedStyle(sideMenu).zIndex,
                        });

                        // CRITICAL CHECK: If sidebar is not at left: 0, force it again
                        if (newSideMenuRect.left !== 0) {
                            console.warn(
                                '⚠️ SIDEBAR NOT AT LEFT 0! Current left:',
                                newSideMenuRect.left,
                                '- FORCING AGAIN'
                            );
                            sideMenu.style.setProperty(
                                'left',
                                '0px',
                                'important'
                            );
                            sideMenu.style.setProperty(
                                'position',
                                'fixed',
                                'important'
                            );
                            sideMenu.style.setProperty(
                                'transform',
                                'translateX(0px)',
                                'important'
                            );

                            // Check again after forced correction
                            setTimeout(() => {
                                const correctedRect =
                                    sideMenu.getBoundingClientRect();
                                console.log(
                                    '🔧 AFTER CORRECTION - Sidebar at:',
                                    correctedRect.left
                                );
                            }, 50);
                        } else {
                            console.log(
                                '✅ SIDEBAR CORRECTLY POSITIONED AT LEFT: 0'
                            );
                        }
                    }, 50);
                    console.log(
                        '🎯 APPLYING AGGRESSIVE OVERLAY POSITIONING...'
                    );

                    // Force overlay to cover full viewport with lower z-index than sidebar
                    menuOverlay.style.setProperty(
                        'position',
                        'fixed',
                        'important'
                    );
                    menuOverlay.style.setProperty('top', '0px', 'important');
                    menuOverlay.style.setProperty(
                        'left',
                        '300px',
                        'important'
                    ); /* Start after sidebar */
                    menuOverlay.style.setProperty(
                        'width',
                        'calc(100vw - 300px)',
                        'important'
                    ); /* Width minus sidebar */
                    menuOverlay.style.setProperty(
                        'height',
                        '100vh',
                        'important'
                    );
                    menuOverlay.style.setProperty(
                        'z-index',
                        '999',
                        'important'
                    ); /* Below sidebar */

                    // Log overlay positioning after applying styles
                    setTimeout(() => {
                        const newOverlayRect =
                            menuOverlay.getBoundingClientRect();
                        console.log('✅ Overlay positioned:', {
                            top: newOverlayRect.top,
                            left: newOverlayRect.left,
                            width: newOverlayRect.width,
                            height: newOverlayRect.height,
                            position:
                                window.getComputedStyle(menuOverlay).position,
                            zIndex: window.getComputedStyle(menuOverlay).zIndex,
                        });
                    }, 50);
                    menuOverlay.style.setProperty(
                        'contain',
                        'none',
                        'important'
                    );
                    menuOverlay.style.setProperty(
                        'isolation',
                        'auto',
                        'important'
                    );
                    menuOverlay.style.setProperty(
                        'transform',
                        'none',
                        'important'
                    );
                    menuOverlay.style.setProperty(
                        'pointer-events',
                        'auto',
                        'important'
                    ); // Start monitoring to keep sidebar pinned
                    startScrollMonitoring(); // Nuclear option: Force viewport positioning after a brief delay
                    setTimeout(() => {
                        diagnosticCheck();
                        forceViewportPositioning();
                    }, 100);
                } else {
                    // Stop monitoring when closing
                    stopScrollMonitoring();
                }
            }); // Close menu when clicking outside or on overlay
            menuOverlay.addEventListener('click', closeMenu);

            document.addEventListener('click', function (e) {
                if (
                    !hamburgerBtn.contains(e.target) &&
                    !sideMenu.contains(e.target)
                ) {
                    closeMenu();
                }
            });

            // Hide current page in menu
            const currentPath = window.location.pathname;
            const currentPage =
                currentPath.split('/').filter(Boolean).pop() || 'welcome';

            const menuItems = sideMenu.querySelectorAll('a[data-page]');
            menuItems.forEach((item) => {
                if (item.getAttribute('data-page') === currentPage) {
                    item.parentElement.style.display = 'none';
                }
            });

            // Check if user is admin and show/hide admin link
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            const isAdmin = isUserAdmin(userData);
            updateAdminMenuItem(isAdmin);
        }

        // Add click handler for logout with confirmation (prevent duplicates)
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink && !logoutLink.hasAttribute('data-logout-handler')) {
            logoutLink.setAttribute('data-logout-handler', 'true');
            logoutLink.addEventListener('click', async (e) => {
                e.preventDefault();

                // Use enhanced logout modal instead of confirm()
                window.modalManager.showLogoutConfirmation(async () => {
                    // Show logging out indicator
                    logoutLink.textContent = 'Logging out...';
                    logoutLink.style.pointerEvents = 'none';

                    try {
                        // Use the auth-utils logout function
                        if (window.authUtils && window.authUtils.logout) {
                            await window.authUtils.logout(
                                'User clicked logout'
                            );
                        } else {
                            // Fallback logout
                            localStorage.clear();
                            sessionStorage.clear();
                            window.location.href = '/';
                        }
                    } catch (err) {
                        console.error('Logout error:', err);
                        // Force logout even if server call fails
                        localStorage.clear();
                        sessionStorage.clear();
                        window.location.href = '/';
                    }
                });
            });
        }
    } catch (err) {
        console.error('Error loading menu:', err);
    }
}

// Setup navigation with fade effects
function setupFadeNavigation() {
    // No longer needed - page-transitions.js handles all navigation automatically
    // This function is kept for backward compatibility but does nothing
    console.log(
        'setupFadeNavigation called - transitions now handled by page-transitions.js'
    );
}

// Setup patient number validation (specific utility)
function setupPatientNumberValidation() {
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

        patientNumberInput.addEventListener('input', function (e) {
            // Remove any characters that are not numbers or hyphens
            const value = e.target.value;
            const filteredValue = value.replace(/[^0-9\-]/g, '');

            if (value !== filteredValue) {
                e.target.value = filteredValue;
                showTooltip();
            }
        });

        // Also prevent invalid characters from being typed and show tooltip
        patientNumberInput.addEventListener('keypress', function (e) {
            const char = String.fromCharCode(e.which);
            if (!/[0-9\-]/.test(char)) {
                e.preventDefault();
                showTooltip();
            }
        });

        // Hide tooltip when input is focused and user starts typing valid characters
        patientNumberInput.addEventListener('focus', function () {
            tooltip.classList.remove('show');
        });
    }
}

// Make navigation utilities available globally
window.navigation = {
    loadMenu,
    setupFadeNavigation,
    setupPatientNumberValidation,
};

// Also expose individual functions for backward compatibility
window.loadMenu = loadMenu;
window.setupFadeNavigation = setupFadeNavigation;
window.setupPatientNumberValidation = setupPatientNumberValidation;

// Add scroll monitoring to keep sidebar pinned
let scrollMonitor;

function ensureSidebarPinned() {
    const sidebar = document.querySelector('.side-menu');
    if (
        sidebar &&
        (sidebar.classList.contains('open') ||
            sidebar.classList.contains('active'))
    ) {
        console.log(
            '🔄 SCROLL MONITOR - Enforcing sidebar position at scroll:',
            window.scrollY
        );

        // CRITICAL: Ensure viewport-relative positioning
        document.documentElement.style.setProperty(
            'transform',
            'none',
            'important'
        );
        document.documentElement.style.setProperty(
            'position',
            'static',
            'important'
        );

        // Force positioning on every scroll if sidebar is open
        sidebar.style.setProperty('position', 'fixed', 'important');
        sidebar.style.setProperty('top', '0px', 'important');
        sidebar.style.setProperty('left', '0px', 'important');
        sidebar.style.setProperty('height', '100vh', 'important');
        sidebar.style.setProperty(
            'z-index',
            '1000',
            'important'
        ); /* Above overlay */
        sidebar.style.setProperty('width', '300px', 'important');
        sidebar.style.setProperty('contain', 'none', 'important');
        sidebar.style.setProperty('isolation', 'auto', 'important');
        sidebar.style.setProperty('transform', 'none', 'important'); // Also ensure overlay covers full viewport but stays below sidebar
        const overlay = document.querySelector('.menu-overlay');
        if (overlay && overlay.classList.contains('active')) {
            overlay.style.setProperty('position', 'fixed', 'important');
            overlay.style.setProperty('top', '0px', 'important');
            overlay.style.setProperty(
                'left',
                '300px',
                'important'
            ); /* Start after sidebar */
            overlay.style.setProperty(
                'width',
                'calc(100vw - 300px)',
                'important'
            ); /* Width minus sidebar */
            overlay.style.setProperty('height', '100vh', 'important');
            overlay.style.setProperty(
                'z-index',
                '999',
                'important'
            ); /* Below sidebar */
            overlay.style.setProperty('contain', 'none', 'important');
            overlay.style.setProperty('isolation', 'auto', 'important');
            overlay.style.setProperty('transform', 'none', 'important');
        }
    }
}

// Monitor scroll events when sidebar is open - now uses absolute positioning
function startScrollMonitoring() {
    console.log('🚀 Starting scroll monitoring with absolute positioning...');
    if (scrollMonitor) {
        clearInterval(scrollMonitor);
    }

    // Initial positioning
    forceViewportPositioning();

    // Update positions on scroll and resize
    scrollMonitor = setInterval(() => {
        if (window.updateSidebarPosition) {
            window.updateSidebarPosition();
        }
    }, 16); // ~60fps for smooth movement

    window.addEventListener(
        'scroll',
        () => {
            if (window.updateSidebarPosition) {
                window.updateSidebarPosition();
            }
        },
        { passive: true }
    );

    window.addEventListener(
        'resize',
        () => {
            if (window.updateSidebarPosition) {
                window.updateSidebarPosition();
            }
        },
        { passive: true }
    );
}

function stopScrollMonitoring() {
    if (scrollMonitor) {
        clearInterval(scrollMonitor);
        scrollMonitor = null;
    }

    // Remove scroll and resize listeners
    window.removeEventListener('scroll', window.updateSidebarPosition);
    window.removeEventListener('resize', window.updateSidebarPosition);

    // Clean up the global function
    if (window.updateSidebarPosition) {
        delete window.updateSidebarPosition;
    }

    console.log('🛑 Scroll monitoring stopped');
}

// Nuclear option: Remove all interfering CSS properties
function forceViewportPositioning() {
    console.log(
        '☢️  REVOLUTIONARY APPROACH - Using absolute positioning with viewport calculations...'
    );

    const sidebar =
        document.querySelector('.side-menu') ||
        document.querySelector('#sideMenu');
    const overlay =
        document.querySelector('.menu-overlay') ||
        document.querySelector('#menuOverlay');

    if (!sidebar || !overlay) {
        console.error('❌ Sidebar or overlay not found!');
        return;
    }

    console.log('🔍 Current scroll position:', window.scrollX, window.scrollY);
    console.log('🔍 Viewport size:', window.innerWidth, window.innerHeight);

    // Calculate absolute positions that account for scroll to simulate viewport positioning
    const sidebarTop = window.scrollY;
    const sidebarLeft = window.scrollX;
    const overlayTop = window.scrollY;
    const overlayLeft = window.scrollX + 300;

    console.log('🧮 Calculated viewport-relative positions:', {
        sidebarTop,
        sidebarLeft,
        overlayTop,
        overlayLeft,
    });

    // REVOLUTIONARY: Use absolute positioning with scroll-adjusted coordinates
    sidebar.style.cssText = `
        position: absolute !important;
        top: ${sidebarTop}px !important;
        left: ${sidebarLeft}px !important;
        width: 300px !important;
        height: ${window.innerHeight}px !important;
        z-index: 10001 !important;
        background: white !important;
        box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1) !important;
        padding: 90px 20px 20px !important;
        margin: 0 !important;
        overflow-y: auto !important;
        box-sizing: border-box !important;
        transform: none !important;
        will-change: auto !important;
        contain: none !important;
        isolation: auto !important;
        pointer-events: auto !important;
        perspective: none !important;
    `;

    overlay.style.cssText = `
        position: absolute !important;
        top: ${overlayTop}px !important;
        left: ${overlayLeft}px !important;
        width: ${window.innerWidth - 300}px !important;
        height: ${window.innerHeight}px !important;
        z-index: 10000 !important;
        background: rgba(0, 0, 0, 0.3) !important;
        margin: 0 !important;
        padding: 0 !important;
        transform: none !important;
        will-change: auto !important;
        contain: none !important;
        isolation: auto !important;
        pointer-events: auto !important;
        opacity: 1 !important;
        visibility: visible !important;
        perspective: none !important;
    `;

    console.log('☢️  Absolute positioning applied!');

    // Check final positioning
    setTimeout(() => {
        const sidebarRect = sidebar.getBoundingClientRect();
        const overlayRect = overlay.getBoundingClientRect();
        console.log('📐 Sidebar rect (should be 0,0):', sidebarRect);
        console.log('📐 Overlay rect (should be 300,0):', overlayRect);

        // Create global function to update positions on scroll
        window.updateSidebarPosition = function () {
            const newTop = window.scrollY;
            const newLeft = window.scrollX;
            const newOverlayLeft = window.scrollX + 300;

            sidebar.style.top = `${newTop}px`;
            sidebar.style.left = `${newLeft}px`;
            sidebar.style.height = `${window.innerHeight}px`;

            overlay.style.top = `${newTop}px`;
            overlay.style.left = `${newOverlayLeft}px`;
            overlay.style.width = `${window.innerWidth - 300}px`;
            overlay.style.height = `${window.innerHeight}px`;

            console.log('🔄 Updated to viewport positions:', {
                newTop,
                newLeft,
                newOverlayLeft,
            });
        };
    }, 10);
}

// Diagnostic function to identify what's causing the positioning offset
function diagnosticCheck() {
    console.log('🔍 DIAGNOSTIC CHECK - Analyzing positioning context...');

    // Check document and body styles
    const docStyle = window.getComputedStyle(document.documentElement);
    const bodyStyle = window.getComputedStyle(document.body);

    console.log('📋 Document element styles:', {
        transform: docStyle.transform,
        position: docStyle.position,
        contain: docStyle.contain,
        isolation: docStyle.isolation,
        perspective: docStyle.perspective,
    });

    console.log('📋 Body styles:', {
        transform: bodyStyle.transform,
        position: bodyStyle.position,
        contain: bodyStyle.contain,
        isolation: bodyStyle.isolation,
        perspective: bodyStyle.perspective,
    });

    // Check for any elements with transforms
    const elementsWithTransforms = [];
    document.querySelectorAll('*').forEach((el) => {
        const style = window.getComputedStyle(el);
        if (style.transform !== 'none') {
            elementsWithTransforms.push({
                element: el,
                tag: el.tagName,
                class: el.className,
                transform: style.transform,
            });
        }
    });

    console.log('🔧 Elements with transforms:', elementsWithTransforms);

    // Check viewport vs page coordinates
    console.log('📐 Viewport info:', {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        devicePixelRatio: window.devicePixelRatio,
    });
}
