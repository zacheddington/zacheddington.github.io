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
        'patientColumnWidths',
    ];

    let clearedKeys = [];
    legacyKeys.forEach((key) => {
        if (localStorage.getItem(key) !== null) {
            localStorage.removeItem(key);
            clearedKeys.push(key);
        }
    });
}

/**
 * Initialize table formatting and resizing for ANY data table
 * Call this once per page that has tables
 */
function initializeDataTables() {
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

    tables.forEach((table, index) => {
        const tableId = table.id || `data-table-${index}`;

        // Set up the table for resizing
        setupTableResizing(table, tableId);

        // Load any saved column preferences
        loadColumnPreferences(table, tableId);

        // Add resize handles
        addResizeHandles(table, tableId);
    });
}

/**
 * Set up table for resizing behavior
 */
function setupTableResizing(table, tableId) {
    // Use fixed layout to preserve exact column widths after resize
    table.style.tableLayout = 'fixed';
    table.style.width = 'auto'; // Allow dynamic sizing
    table.style.minWidth = '100%'; // Minimum container width

    // Add necessary classes - ensure it's added consistently
    if (!table.classList.contains('resizable-table')) {
        table.classList.add('resizable-table');
    }

    if (tableId) {
        table.classList.add(`${tableId}-table`);
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
        // Add resize handles to ALL columns including the last one
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

        e.preventDefault();
        e.stopPropagation();

        // Prevent text selection during resize
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        document.body.style.mozUserSelect = 'none';

        // Add visual feedback
        header.classList.add('resizing');
        table.classList.add('table-resizing');

        // Prevent text selection
        document.body.style.userSelect = 'none';

        // Create scoped mouse move handler
        const handleMouseMove = (moveEvent) => {
            if (!isResizing) return;

            const deltaX = moveEvent.pageX - startX;
            const newWidth = Math.max(50, startWidth + deltaX); // Minimum 50px

            // Apply the new width directly to the column
            header.style.width = `${newWidth}px`;
            header.style.minWidth = `${newWidth}px`;
            header.style.maxWidth = `${newWidth}px`;

            // Calculate and update total table width
            updateTableWidth(table);

            moveEvent.preventDefault();
        };

        // Create scoped mouse up handler
        const handleMouseUp = (upEvent) => {
            if (!isResizing) return;

            isResizing = false;

            // Remove visual feedback
            header.classList.remove('resizing');
            table.classList.remove('table-resizing');

            // Restore text selection
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
            document.body.style.mozUserSelect = '';

            // Update table width after resize completion
            updateTableWidth(table);

            // Save the new width
            saveColumnWidth(
                table,
                tableId,
                handle.getAttribute('data-column'),
                header.offsetWidth
            );

            // Ensure table consistency
            ensureTableConsistency(table);

            // Clean up event listeners
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);

            upEvent.preventDefault();
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
            header.style.minWidth = `${newWidth}px`;
            header.style.maxWidth = `${newWidth}px`;

            // Update table width after keyboard resize
            updateTableWidth(table);

            saveColumnWidth(
                table,
                tableId,
                handle.getAttribute('data-column'),
                newWidth
            );
            ensureTableConsistency(table);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            autoSizeColumn(header, table, tableId);
        }
    });
}

/**
 * Save column width to localStorage
 */
function saveColumnWidth(table, tableId, columnIndex, width) {
    if (!tableId) return;

    const key = `tableColumnWidths_${tableId}`;
    let widths = {};

    try {
        const existing = localStorage.getItem(key);
        if (existing) {
            widths = JSON.parse(existing);
        }
    } catch (e) {
        // Ignore parsing errors
    }

    widths[columnIndex] = width;
    localStorage.setItem(key, JSON.stringify(widths));
}

/**
 * Load column preferences from localStorage
 */
function loadColumnPreferences(table, tableId) {
    if (!tableId) return;

    const key = `tableColumnWidths_${tableId}`;
    let widths = {};

    try {
        const existing = localStorage.getItem(key);
        if (existing) {
            widths = JSON.parse(existing);
        }
    } catch (e) {
        // Ignore parsing errors
        return;
    }

    // Apply saved widths
    const headers = table.querySelectorAll('thead th');
    headers.forEach((header, index) => {
        if (widths[index]) {
            const width = widths[index];
            header.style.width = width + 'px';
            header.style.minWidth = width + 'px';
            header.style.maxWidth = width + 'px';
        }
    });
}

/**
 * Ensure table remains consistent after resize operations
 */
function ensureTableConsistency(table) {
    // Maintain fixed table layout for precise control
    if (table.style.tableLayout !== 'fixed') {
        table.style.tableLayout = 'fixed';
    }

    // Update table width based on column widths
    updateTableWidth(table);
}

/**
 * Update table width based on sum of column widths
 */
function updateTableWidth(table) {
    const headers = table.querySelectorAll('thead th');
    let totalWidth = 0;

    headers.forEach((header) => {
        const width = parseInt(header.style.width) || header.offsetWidth || 150; // Default width if not set
        totalWidth += width;
    });

    // Set table width to sum of columns, but maintain minimum of 100%
    const containerWidth = table.parentElement.offsetWidth;
    const finalWidth = Math.max(totalWidth, containerWidth);

    table.style.width = `${finalWidth}px`;
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
        let textToMeasure = '';

        // Handle dropdowns/select elements specially
        const selectElement = cell.querySelector('select');
        if (selectElement) {
            // For dropdowns, find the longest option text instead of concatenated text
            let longestOptionText = '';
            const options = selectElement.querySelectorAll('option');
            options.forEach((option) => {
                if (option.textContent.length > longestOptionText.length) {
                    longestOptionText = option.textContent;
                }
            });
            textToMeasure = longestOptionText.trim();
            // Add extra space for dropdown arrow
            measurer.textContent = textToMeasure;
            const textWidth = measurer.offsetWidth;
            maxWidth = Math.max(maxWidth, textWidth + 60); // Extra padding for dropdown arrow
        } else {
            // For regular cells, use the text content
            textToMeasure = cell.textContent.trim();
            measurer.textContent = textToMeasure;
            const textWidth = measurer.offsetWidth;
            maxWidth = Math.max(maxWidth, textWidth + 40); // Regular padding
        }
    });

    document.body.removeChild(measurer);

    // Apply the calculated width
    header.style.width = `${maxWidth}px`;
    header.style.minWidth = `${maxWidth}px`;
    header.style.maxWidth = `${maxWidth}px`;

    saveColumnWidth(table, tableId, columnIndex, maxWidth);
    ensureTableConsistency(table);
}

/**
 * Set up real-time filtering for any table
 */
function setupTableFiltering(table, filterInput) {
    if (!filterInput) return;

    filterInput.addEventListener('input', () => {
        const filterValue = filterInput.value.toLowerCase().trim();
        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');

        rows.forEach((row) => {
            if (filterValue === '') {
                row.style.display = '';
                return;
            }

            const cells = row.querySelectorAll('td');
            let matchFound = false;

            cells.forEach((cell) => {
                const cellText = cell.textContent.toLowerCase();
                if (cellText.includes(filterValue)) {
                    matchFound = true;
                }
            });

            row.style.display = matchFound ? '' : 'none';
        });
    });
}

/**
 * Initialize real-time filtering for all tables on page
 */
function initializeTableFiltering() {
    // Look for filter inputs and their corresponding tables
    const filterInputs = document.querySelectorAll('[data-filter-table]');

    filterInputs.forEach((filterInput) => {
        const tableSelector = filterInput.getAttribute('data-filter-table');
        const table = document.querySelector(tableSelector);

        if (table) {
            setupTableFiltering(table, filterInput);
        }
    });
}

/**
 * Main initialization function - call this on page load
 */
function initializeTables() {
    initializeDataTables();
    initializeTableFiltering();
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTables);
} else {
    initializeTables();
}

// Export for manual initialization if needed
window.TableUtils = {
    initializeDataTables,
    initializeTableFiltering,
    setupTableFiltering,
    ensureTableConsistency,
    clearLegacyTableStorage,
};
