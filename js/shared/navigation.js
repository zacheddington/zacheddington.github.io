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
        hamburgerContainer.innerHTML = menuHTML;

        // CRITICAL FIX: Move sidebar outside the header to avoid stacking context issues
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const sideMenu = document.getElementById('sideMenu');

        if (sideMenu) {
            // Remove sidebar from header and append directly to body
            console.log(
                '🔧 MOVING SIDEBAR OUTSIDE HEADER to avoid stacking context...'
            );
            const sideMenuClone = sideMenu.cloneNode(true);
            sideMenu.remove(); // Remove from header
            document.body.appendChild(sideMenuClone); // Add directly to body
            console.log(
                '✅ SIDEBAR MOVED TO BODY - No longer constrained by header stacking context'
            );
        }

        // Create overlay element for better menu interaction
        const menuOverlay = document.createElement('div');
        menuOverlay.className = 'menu-overlay';
        menuOverlay.id = 'menuOverlay';
        document.body.appendChild(menuOverlay);

        if (hamburgerBtn && document.getElementById('sideMenu')) {
            // Get the moved sidebar (now in body, not in header)
            const sideMenu = document.getElementById('sideMenu');
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
                    startScrollMonitoring();

                    // Single diagnostic check after positioning is complete
                    setTimeout(() => {
                        diagnosticCheck();
                    }, 200);
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

// Monitor scroll events when sidebar is open - now uses fixed positioning only
function startScrollMonitoring() {
    console.log('🚀 Starting menu with fixed positioning...');

    // Clear any existing monitors
    if (scrollMonitor) {
        clearInterval(scrollMonitor);
        scrollMonitor = null;
    }

    // Apply initial fixed positioning
    forceViewportPositioning();

    // ADD DIAGNOSTIC SCROLL MONITORING
    // This is temporary to debug what's happening during scroll
    console.log(
        '🔍 Adding diagnostic scroll listener to track sidebar behavior...'
    );

    const diagnosticScrollHandler = () => {
        const sidebar =
            document.querySelector('.side-menu') ||
            document.querySelector('#sideMenu');
        if (sidebar) {
            const rect = sidebar.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(sidebar);
            console.log(
                `📊 SCROLL DEBUG - ScrollY: ${window.scrollY}, Sidebar rect: top=${rect.top}, left=${rect.left}, position=${computedStyle.position}`
            ); // If sidebar is not at correct position, log what's wrong
            if (rect.top !== 0 || rect.left !== 0) {
                console.warn(
                    `⚠️ SIDEBAR POSITION INCORRECT - Expected (0,0), Got (${rect.left}, ${rect.top})`
                );
                console.log(`🔧 Sidebar computed styles:`, {
                    position: computedStyle.position,
                    top: computedStyle.top,
                    left: computedStyle.left,
                    transform: computedStyle.transform,
                    zIndex: computedStyle.zIndex,
                });

                // DIAGNOSE THE STACKING CONTEXT ISSUE
                console.log('🔍 ANALYZING STACKING CONTEXT...');
                let parent = sidebar.parentElement;
                let depth = 0;
                while (parent && depth < 5) {
                    const parentStyle = window.getComputedStyle(parent);
                    const problematicProps = {};

                    if (parentStyle.transform !== 'none')
                        problematicProps.transform = parentStyle.transform;
                    if (parentStyle.willChange !== 'auto')
                        problematicProps.willChange = parentStyle.willChange;
                    if (parentStyle.contain !== 'none')
                        problematicProps.contain = parentStyle.contain;
                    if (parentStyle.perspective !== 'none')
                        problematicProps.perspective = parentStyle.perspective;
                    if (parentStyle.filter !== 'none')
                        problematicProps.filter = parentStyle.filter;
                    if (parentStyle.isolation !== 'auto')
                        problematicProps.isolation = parentStyle.isolation;

                    if (Object.keys(problematicProps).length > 0) {
                        console.warn(
                            `🚨 STACKING CONTEXT CREATOR FOUND:`,
                            parent.tagName,
                            parent.className,
                            problematicProps
                        );

                        // TRY TO FIX THE STACKING CONTEXT
                        Object.keys(problematicProps).forEach((prop) => {
                            const resetValue =
                                prop === 'transform'
                                    ? 'none'
                                    : prop === 'willChange'
                                    ? 'auto'
                                    : prop === 'contain'
                                    ? 'none'
                                    : prop === 'perspective'
                                    ? 'none'
                                    : prop === 'filter'
                                    ? 'none'
                                    : prop === 'isolation'
                                    ? 'auto'
                                    : 'initial';
                            parent.style.setProperty(
                                prop,
                                resetValue,
                                'important'
                            );
                            console.log(
                                `🔧 Reset ${prop} to ${resetValue} on`,
                                parent.tagName
                            );
                        });
                    }

                    parent = parent.parentElement;
                    depth++;
                } // FORCE CORRECTION IMMEDIATELY
                console.log('🚨 EMERGENCY POSITION CORRECTION'); // NUCLEAR OPTION: Move sidebar to body if it's not already there
                if (sidebar.parentElement !== document.body) {
                    console.log(
                        '🚨 MOVING SIDEBAR TO BODY TO ESCAPE STACKING CONTEXT'
                    );
                    document.body.appendChild(sidebar);
                }

                // ULTRA AGGRESSIVE POSITIONING
                console.log('🔥 ULTRA AGGRESSIVE POSITION RESET');

                // Clear all existing styles and start fresh
                sidebar.style.cssText = '';

                // Apply ultra-aggressive fixed positioning
                sidebar.style.cssText = `
                    position: fixed !important;
                    top: 0px !important;
                    left: 0px !important;
                    width: 300px !important;
                    height: 100vh !important;
                    z-index: 99999 !important;
                    background: white !important;
                    transform: none !important;
                    margin: 0 !important;
                    padding: 90px 20px 20px !important;
                    box-sizing: border-box !important;
                    overflow-y: auto !important;
                    will-change: auto !important;
                    contain: none !important;
                    isolation: auto !important;
                    perspective: none !important;
                    filter: none !important;
                    clip-path: none !important;
                    mask: none !important;
                    mix-blend-mode: normal !important;
                    opacity: 1 !important;
                    visibility: visible !important;
                    display: block !important;
                    pointer-events: auto !important;
                `;

                // Force multiple reflows
                sidebar.offsetHeight;
                sidebar.getBoundingClientRect();

                // Check what the browser ACTUALLY applied
                const afterResetStyle = window.getComputedStyle(sidebar);
                console.log('🔍 COMPUTED STYLES AFTER ULTRA RESET:', {
                    position: afterResetStyle.position,
                    top: afterResetStyle.top,
                    left: afterResetStyle.left,
                    transform: afterResetStyle.transform,
                    willChange: afterResetStyle.willChange,
                    contain: afterResetStyle.contain,
                }); // Double-check after correction
                setTimeout(() => {
                    const correctedRect = sidebar.getBoundingClientRect();
                    console.log(
                        `✅ After correction: top=${correctedRect.top}, left=${correctedRect.left}`
                    );

                    // If STILL not fixed, try the absolute nuclear option
                    if (correctedRect.top !== 0) {
                        console.log(
                            '💀 FINAL NUCLEAR OPTION: Creating brand new sidebar element'
                        );

                        // Hide the broken sidebar
                        sidebar.style.display = 'none';

                        // Create a completely new sidebar element
                        const newSidebar = document.createElement('div');
                        newSidebar.className = 'side-menu nuclear-sidebar';
                        newSidebar.innerHTML = sidebar.innerHTML;

                        // Apply positioning to the new element
                        newSidebar.style.cssText = `
                            position: fixed !important;
                            top: 0px !important;
                            left: 0px !important;
                            width: 300px !important;
                            height: 100vh !important;
                            z-index: 99999 !important;
                            background: white !important;
                            transform: none !important;
                            margin: 0 !important;
                            padding: 90px 20px 20px !important;
                            box-sizing: border-box !important;
                            overflow-y: auto !important;
                        `;

                        // Add to body
                        document.body.appendChild(newSidebar);

                        setTimeout(() => {
                            const nuclearRect =
                                newSidebar.getBoundingClientRect();
                            console.log(
                                `💀 Nuclear sidebar position: top=${nuclearRect.top}, left=${nuclearRect.left}`
                            );
                        }, 10);
                    }
                }, 10);
            }
        }
    };

    // Add scroll listener for diagnostics
    window.addEventListener('scroll', diagnosticScrollHandler, {
        passive: true,
    });

    // Store reference to remove later
    window.diagnosticScrollHandler = diagnosticScrollHandler;

    console.log(
        '✅ Menu opened with fixed positioning and diagnostic monitoring enabled'
    );
}

function stopScrollMonitoring() {
    if (scrollMonitor) {
        clearInterval(scrollMonitor);
        scrollMonitor = null;
    }

    // Remove diagnostic scroll listener
    if (window.diagnosticScrollHandler) {
        window.removeEventListener('scroll', window.diagnosticScrollHandler);
        delete window.diagnosticScrollHandler;
        console.log('🧹 Diagnostic scroll monitoring stopped');
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

// Nuclear option: Force true viewport positioning with fixed positioning
function forceViewportPositioning() {
    console.log(
        '☢️  VIEWPORT PINNING - Using fixed positioning for true viewport pinning...'
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
    console.log('🔍 Viewport size:', window.innerWidth, window.innerHeight); // TRUE VIEWPORT PINNING: Use fixed positioning relative to viewport
    console.log(
        '🧮 Setting viewport-pinned positions: sidebar (0,0), overlay (300,0)'
    ); // NUCLEAR: Remove any interfering properties from all parent elements
    const body = document.body;
    const html = document.documentElement;

    // NUCLEAR: Remove any transforms from ALL elements that could interfere
    console.log('🔧 NUCLEAR: Removing all transforms from document...');
    const allElements = document.querySelectorAll('*');
    allElements.forEach((el) => {
        const computedStyle = window.getComputedStyle(el);
        if (computedStyle.transform !== 'none') {
            console.log(
                '🧹 Removing transform from:',
                el.tagName,
                el.className
            );
            el.style.setProperty('transform', 'none', 'important');
        }
        if (computedStyle.contain !== 'none') {
            el.style.setProperty('contain', 'none', 'important');
        }
        if (computedStyle.isolation !== 'auto') {
            el.style.setProperty('isolation', 'auto', 'important');
        }
    });

    // Force clean state on html and body
    [html, body].forEach((el) => {
        el.style.setProperty('transform', 'none', 'important');
        el.style.setProperty('position', 'static', 'important');
        el.style.setProperty('contain', 'none', 'important');
        el.style.setProperty('isolation', 'auto', 'important');
        el.style.setProperty('perspective', 'none', 'important');
        el.style.setProperty('margin', '0', 'important');
        el.style.setProperty('padding', '0', 'important');
    });

    // FIXED POSITIONING: Use only fixed positioning (no scroll calculations)
    console.log('🔧 USING FIXED POSITIONING for true viewport pinning');

    sidebar.style.cssText = `
        position: fixed !important;
        top: 0px !important;
        left: 0px !important;
        width: 300px !important;
        height: 100vh !important;
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
        transition: none !important;
        border: none !important;
        outline: none !important;
    `; // Force reflow and re-apply positioning multiple times
    sidebar.offsetHeight;

    overlay.style.cssText = `
        position: fixed !important;
        top: 0px !important;
        left: 300px !important;
        width: calc(100vw - 300px) !important;
        height: 100vh !important;
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
        transition: none !important;
        border: none !important;
        outline: none !important;
    `;

    overlay.offsetHeight;

    // AGGRESSIVE: Set position multiple times with different methods
    setTimeout(() => {
        sidebar.style.setProperty('position', 'fixed', 'important');
        sidebar.style.setProperty('top', '0px', 'important');
        sidebar.style.setProperty('left', '0px', 'important');
        overlay.style.setProperty('position', 'fixed', 'important');
        overlay.style.setProperty('top', '0px', 'important');
        overlay.style.setProperty('left', '300px', 'important');
    }, 0);

    setTimeout(() => {
        sidebar.style.setProperty('position', 'fixed', 'important');
        sidebar.style.setProperty('top', '0px', 'important');
        sidebar.style.setProperty('left', '0px', 'important');
        overlay.style.setProperty('position', 'fixed', 'important');
        overlay.style.setProperty('top', '0px', 'important');
        overlay.style.setProperty('left', '300px', 'important');
    }, 10);

    setTimeout(() => {
        sidebar.style.setProperty('position', 'fixed', 'important');
        sidebar.style.setProperty('top', '0px', 'important');
        sidebar.style.setProperty('left', '0px', 'important');
        overlay.style.setProperty('position', 'fixed', 'important');
        overlay.style.setProperty('top', '0px', 'important');
        overlay.style.setProperty('left', '300px', 'important');
    }, 50);
    console.log('☢️  Fixed positioning applied for viewport pinning!');

    // Check final positioning multiple times to see if something changes it
    setTimeout(() => {
        const sidebarRect = sidebar.getBoundingClientRect();
        const overlayRect = overlay.getBoundingClientRect();
        console.log('📐 Sidebar rect (should be 0,0):', sidebarRect);
        console.log('📐 Overlay rect (should be 300,0):', overlayRect);

        // Log computed styles for debugging
        const sidebarComputed = window.getComputedStyle(sidebar);
        console.log('🔍 Sidebar computed styles after 100ms:', {
            position: sidebarComputed.position,
            top: sidebarComputed.top,
            left: sidebarComputed.left,
            transform: sidebarComputed.transform,
            zIndex: sidebarComputed.zIndex,
            transition: sidebarComputed.transition,
        });

        // Verify positioning is correct
        if (sidebarRect.top === 0 && sidebarRect.left === 0) {
            console.log('✅ VIEWPORT PINNING SUCCESSFUL - Sidebar at (0,0)');
        } else {
            console.warn('⚠️ VIEWPORT PINNING ISSUE - Sidebar not at (0,0):', {
                top: sidebarRect.top,
                left: sidebarRect.left,
            });

            // AGGRESSIVE CORRECTION: Force position again with multiple approaches
            console.log('🔧 APPLYING AGGRESSIVE CORRECTION FOR SIDEBAR...');

            // Method 1: Direct style override
            sidebar.style.setProperty('top', '0px', 'important');
            sidebar.style.setProperty('left', '0px', 'important');
            sidebar.style.setProperty('position', 'fixed', 'important');

            // Method 2: Force via transform if needed
            sidebar.style.setProperty(
                'transform',
                'translate3d(0px, 0px, 0px)',
                'important'
            );

            // Method 3: Use inset property
            sidebar.style.setProperty(
                'inset',
                '0px auto auto 0px',
                'important'
            );

            // Check again after correction
            setTimeout(() => {
                const correctedRect = sidebar.getBoundingClientRect();
                console.log(
                    '🔧 AFTER CORRECTION - Sidebar at:',
                    correctedRect.top,
                    correctedRect.left
                );

                if (correctedRect.top !== 0) {
                    console.error(
                        '🚨 CRITICAL: Unable to pin sidebar to viewport top'
                    );

                    // NUCLEAR OPTION: Remove and re-insert sidebar with clean DOM
                    console.log(
                        '☢️ NUCLEAR DOM RESET - Removing and recreating sidebar...'
                    );
                    const parent = sidebar.parentNode;
                    const sidebarClone = sidebar.cloneNode(true);
                    parent.removeChild(sidebar);

                    // Clean the clone and apply nuclear positioning
                    sidebarClone.style.cssText = `
                        position: fixed !important;
                        top: 0px !important;
                        left: 0px !important;
                        width: 300px !important;
                        height: 100vh !important;
                        z-index: 50000 !important;
                        background: white !important;
                        box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1) !important;
                        padding: 90px 20px 20px !important;
                        margin: 0 !important;
                        overflow-y: auto !important;
                        box-sizing: border-box !important;
                        transform: translate3d(0px, 0px, 0px) !important;
                        inset: 0px auto auto 0px !important;
                    `;

                    parent.appendChild(sidebarClone);
                    console.log('☢️ NUCLEAR DOM RESET COMPLETE');

                    // Final check after nuclear reset
                    setTimeout(() => {
                        const finalRect = sidebarClone.getBoundingClientRect();
                        console.log(
                            '☢️ NUCLEAR RESULT - Final sidebar position:',
                            finalRect.top,
                            finalRect.left
                        );

                        if (finalRect.top !== 0) {
                            console.log(
                                '🔄 TRYING ALTERNATIVE: position: sticky'
                            );
                            sidebarClone.style.setProperty(
                                'position',
                                'sticky',
                                'important'
                            );
                            sidebarClone.style.setProperty(
                                'top',
                                '0px',
                                'important'
                            );
                            sidebarClone.style.setProperty(
                                'left',
                                '0px',
                                'important'
                            );
                        }
                    }, 100);
                }
            }, 50);
        }

        if (overlayRect.top === 0 && overlayRect.left === 300) {
            console.log('✅ VIEWPORT PINNING SUCCESSFUL - Overlay at (300,0)');
        } else {
            console.warn(
                '⚠️ VIEWPORT PINNING ISSUE - Overlay not at (300,0):',
                {
                    top: overlayRect.top,
                    left: overlayRect.left,
                }
            );

            // AGGRESSIVE CORRECTION: Force position again
            console.log('🔧 APPLYING AGGRESSIVE CORRECTION FOR OVERLAY...');

            overlay.style.setProperty('top', '0px', 'important');
            overlay.style.setProperty('left', '300px', 'important');
            overlay.style.setProperty('position', 'fixed', 'important');
            overlay.style.setProperty(
                'transform',
                'translate3d(300px, 0px, 0px)',
                'important'
            );
            overlay.style.setProperty(
                'inset',
                '0px 0px auto 300px',
                'important'
            );

            setTimeout(() => {
                const correctedRect = overlay.getBoundingClientRect();
                console.log(
                    '🔧 AFTER CORRECTION - Overlay at:',
                    correctedRect.top,
                    correctedRect.left
                );
            }, 50);
        }
    }, 100);

    // Add a longer delayed check to see if something changes the position later
    setTimeout(() => {
        console.log(
            '🕐 DELAYED CHECK (1 second) - Verifying sidebar position...'
        );
        const delayedSidebarRect = sidebar.getBoundingClientRect();
        const delayedSidebarComputed = window.getComputedStyle(sidebar);

        console.log('📐 Delayed sidebar rect:', delayedSidebarRect);
        console.log('🔍 Delayed sidebar computed styles:', {
            position: delayedSidebarComputed.position,
            top: delayedSidebarComputed.top,
            left: delayedSidebarComputed.left,
            transform: delayedSidebarComputed.transform,
            transition: delayedSidebarComputed.transition,
        });

        if (delayedSidebarRect.top !== 0 || delayedSidebarRect.left !== 0) {
            console.error('🚨 DELAYED POSITION DRIFT DETECTED!');
            console.log(
                'Expected: (0,0), Actual: (' +
                    delayedSidebarRect.left +
                    ',' +
                    delayedSidebarRect.top +
                    ')'
            );

            // Check if any parent has transforms
            let parent = sidebar.parentElement;
            while (parent && parent !== document.body) {
                const parentStyle = window.getComputedStyle(parent);
                if (parentStyle.transform !== 'none') {
                    console.warn(
                        '🔍 Found transform on parent:',
                        parent.tagName,
                        parent.className,
                        'transform:',
                        parentStyle.transform
                    );
                }
                parent = parent.parentElement;
            }
        } else {
            console.log('✅ DELAYED CHECK PASSED - Sidebar still at (0,0)');
        }
    }, 1000);
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
        top: docStyle.top,
        left: docStyle.left,
        margin: docStyle.margin,
        padding: docStyle.padding,
    });

    console.log('📋 Body styles:', {
        transform: bodyStyle.transform,
        position: bodyStyle.position,
        contain: bodyStyle.contain,
        isolation: bodyStyle.isolation,
        perspective: bodyStyle.perspective,
        top: bodyStyle.top,
        left: bodyStyle.left,
        margin: bodyStyle.margin,
        padding: bodyStyle.padding,
    });

    // Check sidebar and overlay parent elements for potential issues
    const sidebar =
        document.querySelector('.side-menu') ||
        document.querySelector('#sideMenu');
    const overlay =
        document.querySelector('.menu-overlay') ||
        document.querySelector('#menuOverlay');

    if (sidebar) {
        console.log('🔍 SIDEBAR PARENT CHAIN ANALYSIS:');
        let parent = sidebar.parentElement;
        let depth = 0;
        while (parent && depth < 5) {
            const parentStyle = window.getComputedStyle(parent);
            console.log(
                `📋 Parent ${depth} (${parent.tagName}.${parent.className}):`,
                {
                    position: parentStyle.position,
                    transform: parentStyle.transform,
                    contain: parentStyle.contain,
                    isolation: parentStyle.isolation,
                    top: parentStyle.top,
                    left: parentStyle.left,
                    margin: parentStyle.margin,
                    padding: parentStyle.padding,
                    overflow: parentStyle.overflow,
                    zIndex: parentStyle.zIndex,
                }
            );
            parent = parent.parentElement;
            depth++;
        }

        // Check sidebar's own computed styles
        const sidebarStyle = window.getComputedStyle(sidebar);
        console.log('🔍 SIDEBAR COMPUTED STYLES:', {
            position: sidebarStyle.position,
            top: sidebarStyle.top,
            left: sidebarStyle.left,
            transform: sidebarStyle.transform,
            zIndex: sidebarStyle.zIndex,
            offsetParent: sidebar.offsetParent
                ? sidebar.offsetParent.tagName
                : 'null',
        });
    }

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
