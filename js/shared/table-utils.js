// Clean, unified table utilities - Version 2.0
// This replaces all table-specific code with a single unified implementation

/**
 * Initialize table formatting and resizing for ANY data table
 * Call this once per page that has tables
 */
function initializeDataTables() {
    console.log('🔧 TABLE-UTILS: Initializing unified data tables...');
    console.log(`🔧 TABLE-UTILS: Page URL: ${window.location.pathname}`);

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

    // Add necessary classes with detailed logging
    console.log(`🔧 TABLE-UTILS: Adding resizable-table class to ${tableId}`);
    console.log(`   - Classes before: ${table.className}`);
    table.classList.add('resizable-table');
    console.log(`   - Classes after: ${table.className}`);
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
        }
    });
}

/**
 * Set up resize event listeners for a handle
 */
function setupResizeListeners(handle, header, table, tableId) {
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    // Mouse down event
    handle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.pageX;
        startWidth = header.offsetWidth;

        table.classList.add('resizing');
        handle.classList.add('active');

        // Prevent text selection
        document.body.style.userSelect = 'none';

        e.preventDefault();
    });

    // Mouse move event (on document to catch moves outside the handle)
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const deltaX = e.pageX - startX;
        const newWidth = Math.max(50, startWidth + deltaX); // Minimum 50px

        // Apply the new width directly to the column
        header.style.width = `${newWidth}px`;

        e.preventDefault();
    });

    // Mouse up event
    document.addEventListener('mouseup', () => {
        if (!isResizing) return;

        isResizing = false;
        table.classList.remove('resizing');
        handle.classList.remove('active');
        document.body.style.userSelect = '';

        // Save the new column widths
        saveColumnPreferences(table, tableId);
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
 * Save column preferences to localStorage
 */
function saveColumnPreferences(table, tableId) {
    const headers = table.querySelectorAll('thead th');
    const widths = Array.from(headers).map(
        (header) => header.style.width || ''
    );

    localStorage.setItem(`table-${tableId}-widths`, JSON.stringify(widths));
}

/**
 * Load column preferences from localStorage
 */
function loadColumnPreferences(table, tableId) {
    try {
        const saved = localStorage.getItem(`table-${tableId}-widths`);
        if (!saved) return;

        const widths = JSON.parse(saved);
        const headers = table.querySelectorAll('thead th');

        headers.forEach((header, index) => {
            if (widths[index] && widths[index] !== '') {
                header.style.width = widths[index];
            }
        });
    } catch (error) {
        console.warn('Error loading column preferences:', error);
    }
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

// Export for global use
window.initializeDataTables = initializeDataTables;
window.debugTableClasses = debugTableClasses;

// Add periodic debugging (will be removed later)
setTimeout(() => {
    console.log('🔍 TABLE-DEBUG: Checking table classes after 2 seconds...');
    debugTableClasses();
}, 2000);

setTimeout(() => {
    console.log('🔍 TABLE-DEBUG: Checking table classes after 5 seconds...');
    debugTableClasses();
}, 5000);

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDataTables);
} else {
    // DOM is already ready
    initializeDataTables();
}
