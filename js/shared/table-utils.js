// Clean, unified table utilities - Version 2.0
// This replaces all table-specific code with a single unified implementation

/**
 * Clear legacy localStorage keys that might interfere with unified table system
 */
function clearLegacyTableStorage() {
    const legacyKeys = [
        'userTableColumnWidths',
        'sessionTableColumnWidths', 
        'patientTableColumnWidths',
        'hasSeenTableResizeTip',
        'userColumnWidths',
        'sessionColumnWidths',
        'patientColumnWidths'
    ];
    
    let clearedKeys = [];
    legacyKeys.forEach(key => {
        if (localStorage.getItem(key) !== null) {
            localStorage.removeItem(key);
            clearedKeys.push(key);
        }
    });
    
    if (clearedKeys.length > 0) {
        console.log(`🧹 TABLE-UTILS: Cleared legacy localStorage keys:`, clearedKeys);
    }
}

/**
 * Initialize table formatting and resizing for ANY data table
 * Call this once per page that has tables
 */
function initializeDataTables() {
    console.log('🔧 TABLE-UTILS: Initializing unified data tables...');
    console.log(`🔧 TABLE-UTILS: Page URL: ${window.location.pathname}`);
    
    // Clear any legacy localStorage that might interfere
    clearLegacyTableStorage();

    // Find all data tables on the page
    const tables = document.querySelectorAll('.data-table');

    if (tables.length === 0) {
        console.warn(
            '⚠️ TABLE-UTILS: No .data-table elements found on this page'
        );
        return;
    }

    console.log(`🔧 TABLE-UTILS: Found ${tables.length} tables to initialize`);

    tables.forEach((table, index) => {
        const tableId = table.id || `data-table-${index}`;
        console.log(`📋 TABLE-UTILS: Setting up table: ${tableId}`);
        console.log(`   - Page: ${window.location.pathname}`);
        console.log(`   - Classes: ${table.className}`);
        console.log(
            `   - Current style.tableLayout: ${
                table.style.tableLayout || 'not set'
            }`
        );
        console.log(
            `   - Current style.width: ${table.style.width || 'not set'}`
        );
        console.log(
            `   - Headers count: ${table.querySelectorAll('thead th').length}`
        );
        console.log(
            `   - Existing resize handles: ${
                table.querySelectorAll('.resize-handle').length
            }`
        );

        // Set up the table for resizing
        setupTableResizing(table, tableId);
        console.log(
            `   - After setupTableResizing - tableLayout: ${table.style.tableLayout}, width: ${table.style.width}`
        );

        // Load any saved column preferences
        loadColumnPreferences(table, tableId);
        console.log(`   - After loadColumnPreferences`);

        // Add resize handles
        addResizeHandles(table, tableId);
        console.log(
            `   - After addResizeHandles - handles: ${
                table.querySelectorAll('.resize-handle').length
            }`
        );

        console.log(
            `✅ TABLE-UTILS: Table ${tableId} initialized successfully`
        );
    });

    console.log('✅ TABLE-UTILS: All data tables initialized successfully');
}

/**
 * Set up table for resizing behavior
 */
function setupTableResizing(table, tableId) {
    // Ensure table has proper styling for resizing
    table.style.tableLayout = 'auto'; // Allow natural column sizing
    table.style.width = '100%'; // Fill container

    // Add necessary classes - ensure it's added consistently
    if (!table.classList.contains('resizable-table')) {
        table.classList.add('resizable-table');
        console.log(
            `🔧 TABLE-UTILS: Added resizable-table class to ${tableId}`
        );
    } else {
        console.log(
            `🔧 TABLE-UTILS: ${tableId} already has resizable-table class`
        );
    }
}

/**
 * Add resize handles to table headers
 */
function addResizeHandles(table, tableId) {
    const headers = table.querySelectorAll('thead th');

    // Remove any existing handles first
    table
        .querySelectorAll('.resize-handle')
        .forEach((handle) => handle.remove());

    headers.forEach((header, index) => {
        // Skip the last column (usually Actions)
        if (index < headers.length - 1) {
            const handle = document.createElement('div');
            handle.className = 'resize-handle';
            handle.setAttribute('data-column', index);

            // Make it accessible
            handle.setAttribute('role', 'separator');
            handle.setAttribute('aria-orientation', 'vertical');
            handle.setAttribute('tabindex', '0');
            handle.setAttribute('title', 'Drag to resize column');

            header.appendChild(handle);

            // Add event listeners
            setupResizeListeners(handle, header, table, tableId);

            // Add hover debugging (minimal for production)
            handle.addEventListener('mouseenter', () => {
                // Optional: uncomment for debugging
                // console.log(`🖱️ TABLE-UTILS: Mouse ENTER on ${tableId} resize handle for "${header.textContent.trim()}"`);
            });

            handle.addEventListener('mouseleave', () => {
                // Optional: uncomment for debugging
                // console.log(`🖱️ TABLE-UTILS: Mouse LEAVE on ${tableId} resize handle for "${header.textContent.trim()}"`);
            });

            // Add click debugging to test if handles are reachable
            handle.addEventListener('click', (e) => {
                console.log(
                    `🖱️ TABLE-UTILS: CLICK detected on ${tableId} resize handle for "${header.textContent.trim()}"`
                );
                console.log(`   - Event details:`, e);
                e.preventDefault();
                e.stopPropagation();
            });
        }
    });
}

/**
 * Set up resize event listeners for a handle
 */
function setupResizeListeners(handle, header, table, tableId) {
    console.log(
        `🔧 TABLE-UTILS: Setting up resize listeners for ${tableId} column ${header.textContent.trim()}`
    );

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    // Mouse down event
    handle.addEventListener('mousedown', (e) => {
        console.log(
            `�️ TABLE-UTILS: Mouse DOWN on ${tableId} resize handle for column "${header.textContent.trim()}"`
        );
        console.log(`   - Event target: ${e.target.className}`);
        console.log(`   - Header width: ${header.offsetWidth}px`);
        console.log(`   - Start X: ${e.pageX}`);

        isResizing = true;
        startX = e.pageX;
        startWidth = header.offsetWidth;

        table.classList.add('resizing');
        handle.classList.add('active');

        // Prevent text selection
        document.body.style.userSelect = 'none';

        // Create scoped mouse move handler
        const handleMouseMove = (moveEvent) => {
            if (!isResizing) return;

            const deltaX = moveEvent.pageX - startX;
            const newWidth = Math.max(50, startWidth + deltaX); // Minimum 50px

            console.log(
                `🖱️ TABLE-UTILS: Mouse MOVE on ${tableId} - deltaX: ${deltaX}, newWidth: ${newWidth}px, pageX: ${moveEvent.pageX}, startX: ${startX}`
            );

            // Apply the new width directly to the column
            header.style.width = `${newWidth}px`;

            moveEvent.preventDefault();
        };

        // Create scoped mouse up handler
        const handleMouseUp = (upEvent) => {
            if (!isResizing) return;

            console.log(
                `🖱️ TABLE-UTILS: Mouse UP on ${tableId} - final width: ${header.offsetWidth}px`
            );
            console.log(`   - Header style.width before cleanup: ${header.style.width}`);

            isResizing = false;
            table.classList.remove('resizing');
            handle.classList.remove('active');
            document.body.style.userSelect = '';

            // Clean up event listeners
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);

            console.log(`   - Header style.width after cleanup: ${header.style.width}`);
            console.log(`   - About to call saveColumnPreferences for ${tableId}`);

            // Save the new column widths
            saveColumnPreferences(table, tableId);
            
            console.log(`   - Header style.width after save: ${header.style.width}`);
            console.log(`   - Header offsetWidth after save: ${header.offsetWidth}px`);
        };

        // Add the scoped event listeners
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        e.preventDefault();
    });

    // Double-click to auto-size
    handle.addEventListener('dblclick', (e) => {
        e.preventDefault();
        autoSizeColumn(header, table, tableId);
    });

    // Keyboard support
    handle.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            const currentWidth = header.offsetWidth;
            const step = e.key === 'ArrowLeft' ? -10 : 10;
            const newWidth = Math.max(50, currentWidth + step);
            header.style.width = `${newWidth}px`;
            saveColumnPreferences(table, tableId);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            autoSizeColumn(header, table, tableId);
        }
    });
}

/**
 * Debug function to check resize handle setup on all tables
 * Call this from browser console to diagnose issues
 */
function debugTableResizeHandles() {
    console.log('🔍 DEBUG: Checking all table resize handles...');

    const tables = document.querySelectorAll('.data-table');

    tables.forEach((table, index) => {
        const tableId = table.id || `data-table-${index}`;
        const handles = table.querySelectorAll('.resize-handle');
        const headers = table.querySelectorAll('thead th');

        console.log(`📋 Table: ${tableId}`);
        console.log(`   - Headers: ${headers.length}`);
        console.log(`   - Resize handles: ${handles.length}`);
        console.log(`   - Table classes: ${table.className}`);
        console.log(`   - Table style.width: ${table.style.width}`);
        console.log(`   - Table style.tableLayout: ${table.style.tableLayout}`);

        handles.forEach((handle, handleIndex) => {
            const rect = handle.getBoundingClientRect();
            console.log(`     Handle ${handleIndex}:`);
            console.log(`       - Classes: ${handle.className}`);
            console.log(`       - Position: ${rect.left}, ${rect.top}`);
            console.log(`       - Size: ${rect.width}x${rect.height}`);
            console.log(
                `       - Visible: ${rect.width > 0 && rect.height > 0}`
            );
            console.log(
                `       - Data-column: ${handle.getAttribute('data-column')}`
            );

            // Test if handle is interactive
            const style = getComputedStyle(handle);
            console.log(`       - Cursor: ${style.cursor}`);
            console.log(`       - Pointer events: ${style.pointerEvents}`);
            console.log(`       - Display: ${style.display}`);
            console.log(`       - Visibility: ${style.visibility}`);
        });

        console.log(''); // Empty line for readability
    });
}

// Make it globally available for console debugging
window.debugTableResizeHandles = debugTableResizeHandles;

/**
 * Test function to simulate resize handle interactions
 * Call this from browser console: testResizeHandleInteraction()
 */
function testResizeHandleInteraction() {
    console.log('🧪 TEST: Simulating resize handle interactions...');

    const tables = document.querySelectorAll('.data-table');

    tables.forEach((table) => {
        const tableId = table.id || 'unknown';
        const handles = table.querySelectorAll('.resize-handle');

        console.log(`📋 Testing table: ${tableId}`);

        handles.forEach((handle, index) => {
            console.log(`   Testing handle ${index}...`);

            // Simulate mouseenter
            const enterEvent = new MouseEvent('mouseenter', {
                bubbles: true,
                cancelable: true,
                view: window,
            });
            handle.dispatchEvent(enterEvent);

            // Simulate mouseleave
            const leaveEvent = new MouseEvent('mouseleave', {
                bubbles: true,
                cancelable: true,
                view: window,
            });
            handle.dispatchEvent(leaveEvent);

            // Try to trigger a mousedown event
            const downEvent = new MouseEvent('mousedown', {
                bubbles: true,
                cancelable: true,
                view: window,
                pageX: 100,
                pageY: 100,
            });
            handle.dispatchEvent(downEvent);
        });
    });
}

// Make it globally available for console debugging
window.testResizeHandleInteraction = testResizeHandleInteraction;

/**
 * Auto-size a column based on its content
 */
function autoSizeColumn(header, table, tableId) {
    const columnIndex = Array.from(header.parentNode.children).indexOf(header);
    const cells = table.querySelectorAll(
        `td:nth-child(${columnIndex + 1}), th:nth-child(${columnIndex + 1})`
    );

    // Create temporary element to measure text width
    const measurer = document.createElement('div');
    measurer.style.cssText =
        'position: absolute; visibility: hidden; white-space: nowrap; font: inherit;';
    document.body.appendChild(measurer);

    let maxWidth = 80; // Minimum width

    cells.forEach((cell) => {
        measurer.textContent = cell.textContent.trim();
        const textWidth = measurer.offsetWidth;
        maxWidth = Math.max(maxWidth, textWidth + 40); // Add padding
    });

    document.body.removeChild(measurer);

    // Apply the calculated width
    header.style.width = `${maxWidth}px`;
    saveColumnPreferences(table, tableId);
}

/**
 * Save column preferences to localStorage using unified key format
 */
function saveColumnPreferences(table, tableId) {
    const headers = table.querySelectorAll('thead th');
    const widths = Array.from(headers).map(
        (header) => header.style.width || ''
    );

    const storageKey = `table-${tableId}-widths`;
    localStorage.setItem(storageKey, JSON.stringify(widths));
    console.log(`💾 TABLE-UTILS: Saved column widths for ${tableId}:`, widths);
}

/**
 * Load column preferences from localStorage using unified key format
 */
function loadColumnPreferences(table, tableId) {
    try {
        const storageKey = `table-${tableId}-widths`;
        const saved = localStorage.getItem(storageKey);
        if (!saved) {
            console.log(`📂 TABLE-UTILS: No saved widths found for ${tableId}`);
            return;
        }

        const widths = JSON.parse(saved);
        const headers = table.querySelectorAll('thead th');
        
        console.log(`📂 TABLE-UTILS: Loading saved widths for ${tableId}:`, widths);

        headers.forEach((header, index) => {
            if (widths[index] && widths[index] !== '') {
                header.style.width = widths[index];
                console.log(`   - Column ${index}: ${widths[index]}`);
            }
        });
    } catch (error) {
        console.warn(`❌ TABLE-UTILS: Error loading column preferences for ${tableId}:`, error);
    }
}

/**
 * Force reset all table column widths to defaults and clear storage
 */
function resetAllTableWidths() {
    const tables = document.querySelectorAll('.data-table');
    
    tables.forEach((table) => {
        const tableId = table.id || 'unknown';
        
        // Clear stored preferences
        const storageKey = `table-${tableId}-widths`;
        localStorage.removeItem(storageKey);
        
        // Reset all column widths
        const headers = table.querySelectorAll('thead th');
        headers.forEach((header) => {
            header.style.width = '';
        });
        
        console.log(`🔄 TABLE-UTILS: Reset column widths for ${tableId}`);
    });
}

/**
 * Debug function to track table class changes over time
 */
function debugTableClasses() {
    const tables = document.querySelectorAll('.data-table');
    console.log('🔍 TABLE-DEBUG: Current table classes:');
    tables.forEach((table) => {
        console.log(`   - ${table.id}: ${table.className}`);
    });
}

/**
 * Ensure all tables have consistent classes (call this after page load)
 */
function ensureTableConsistency() {
    const tables = document.querySelectorAll('.data-table');
    console.log('🔧 TABLE-UTILS: Ensuring table consistency...');

    tables.forEach((table) => {
        const tableId = table.id || 'unknown';

        // Ensure all tables have resizable-table class
        if (!table.classList.contains('resizable-table')) {
            table.classList.add('resizable-table');
            console.log(
                `🔧 TABLE-UTILS: Added missing resizable-table class to ${tableId}`
            );
        }

        // Ensure consistent styling
        if (table.style.tableLayout !== 'auto') {
            table.style.tableLayout = 'auto';
            console.log(`🔧 TABLE-UTILS: Fixed tableLayout for ${tableId}`);
        }

        if (table.style.width !== '100%') {
            table.style.width = '100%';
            console.log(`🔧 TABLE-UTILS: Fixed width for ${tableId}`);
        }
    });

    // Final verification
    debugTableClasses();
}

// Export for global use
window.initializeDataTables = initializeDataTables;
window.debugTableClasses = debugTableClasses;
window.ensureTableConsistency = ensureTableConsistency;
window.clearLegacyTableStorage = clearLegacyTableStorage;
window.resetAllTableWidths = resetAllTableWidths;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeDataTables();
        // Ensure consistency after a brief delay to allow for any late-loading content
        setTimeout(ensureTableConsistency, 1000);
    });
} else {
    // DOM is already ready
    initializeDataTables();
    setTimeout(ensureTableConsistency, 1000);
}
