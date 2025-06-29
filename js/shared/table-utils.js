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
        // No tables found - this is normal for pages without tables
        return;
    }

    tables.forEach((table, index) => {
        const tableId = table.id || `data-table-${index}`;

        // Set up the table for resizing
        setupTableResizing(table, tableId);

        // Set intelligent default column widths first
        setDefaultColumnWidths(table, tableId);

        // Load any saved column preferences (will override defaults if they exist)
        loadColumnPreferences(table, tableId);

        // Add resize handles
        addResizeHandles(table, tableId);

        // Set up dropdown revert functionality
        setupDropdownRevertHandlers(table);

        // Set up table sorting functionality
        setupTableSorting(table, tableId);

        // Set up row selection functionality
        setupRowSelection(table);

        // Fix mobile select behavior
        fixMobileSelectBehavior(table);

        // Set intelligent default column widths
        setDefaultColumnWidths(table, tableId);
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
            // Add extra space for dropdown arrow and internal padding
            measurer.textContent = textToMeasure;
            const textWidth = measurer.offsetWidth;
            maxWidth = Math.max(maxWidth, textWidth + 80); // Increased from 60 to 80 for dropdown UI elements
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
 * Set up dropdown revert handlers for table dropdowns
 * This ensures that when a confirmation modal is cancelled,
 * dropdowns revert to their original values
 */
function setupDropdownRevertHandlers(table) {
    const dropdowns = table.querySelectorAll('select');

    dropdowns.forEach((dropdown) => {
        // Store the original value when the dropdown is focused
        dropdown.addEventListener('focus', function () {
            this.setAttribute('data-original-value', this.value);
        });

        // Handle change events - store original value for potential revert
        dropdown.addEventListener('change', function () {
            const originalValue = this.getAttribute('data-original-value');
            const newValue = this.value;

            // Only proceed if value actually changed
            if (originalValue !== newValue) {
                // Store both values on the element for external access
                this.setAttribute('data-original-value', originalValue);
                this.setAttribute('data-new-value', newValue);

                // Add a revert method to the dropdown element
                this.revertToOriginal = function () {
                    this.value = originalValue;
                    this.removeAttribute('data-new-value');
                };
            }
        });
    });
}

/**
 * Set up table sorting functionality
 */
function setupTableSorting(table, tableId) {
    const headers = table.querySelectorAll('thead th');

    // Store original data for reset functionality
    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    // Store original row order
    const originalRows = Array.from(tbody.querySelectorAll('tr')).map((row) =>
        row.cloneNode(true)
    );
    table.dataset.originalRows = JSON.stringify(
        originalRows.map((row) => row.outerHTML)
    );

    headers.forEach((header, index) => {
        // Skip the last column (Actions) - don't make it sortable
        if (index === headers.length - 1) return;

        // Make header sortable
        header.classList.add('sortable');
        header.setAttribute('data-column-index', index);
        header.style.cursor = 'pointer';

        // Add click handler
        header.addEventListener('click', (e) => {
            // Don't trigger sort if clicking on resize handle
            if (e.target.classList.contains('resize-handle')) return;

            handleColumnSort(table, header, index);
        });
    });
}

/**
 * Handle column sorting when header is clicked
 */
function handleColumnSort(table, header, columnIndex) {
    const currentSort = header.dataset.sortDirection || 'none';
    const tbody = table.querySelector('tbody');

    // Clear all other column sort indicators
    const allHeaders = table.querySelectorAll('thead th');
    allHeaders.forEach((h) => {
        h.classList.remove('sort-asc', 'sort-desc');
        h.dataset.sortDirection = 'none';
    });

    let newSortDirection;

    // Determine new sort direction
    if (currentSort === 'none') {
        newSortDirection = 'asc';
    } else if (currentSort === 'asc') {
        newSortDirection = 'desc';
    } else {
        newSortDirection = 'none';
    }

    // Apply sort or reset to original
    if (newSortDirection === 'none') {
        // Reset to original order
        resetTableToOriginalOrder(table);
    } else {
        // Sort the table
        sortTableByColumn(table, columnIndex, newSortDirection);
        header.classList.add(`sort-${newSortDirection}`);
    }

    // Update header state
    header.dataset.sortDirection = newSortDirection;
}

/**
 * Sort table by specified column
 */
function sortTableByColumn(table, columnIndex, direction) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));

    // Sort rows based on column content
    rows.sort((a, b) => {
        const aCell = a.querySelector(`td:nth-child(${columnIndex + 1})`);
        const bCell = b.querySelector(`td:nth-child(${columnIndex + 1})`);

        if (!aCell || !bCell) return 0;

        let aVal = getCellSortValue(aCell);
        let bVal = getCellSortValue(bCell);

        // Handle different data types
        if (isNumeric(aVal) && isNumeric(bVal)) {
            aVal = parseFloat(aVal);
            bVal = parseFloat(bVal);
        } else if (isDate(aVal) && isDate(bVal)) {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
        } else {
            // String comparison
            aVal = aVal.toString().toLowerCase();
            bVal = bVal.toString().toLowerCase();
        }

        if (direction === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
    });

    // Clear tbody and append sorted rows
    tbody.innerHTML = '';
    rows.forEach((row) => tbody.appendChild(row));
}

/**
 * Get the sortable value from a table cell
 */
function getCellSortValue(cell) {
    // Check for data-sort attribute first
    if (cell.hasAttribute('data-sort')) {
        return cell.getAttribute('data-sort');
    }

    // Handle dropdowns/selects - use selected option text
    const select = cell.querySelector('select');
    if (select) {
        const selectedOption = select.options[select.selectedIndex];
        return selectedOption ? selectedOption.textContent.trim() : '';
    }

    // Handle nested elements - get text from specific elements
    const nameElement = cell.querySelector(
        '.patient-full-name, .user-fullname'
    );
    if (nameElement) {
        return nameElement.textContent.trim();
    }

    // Default to cell text content
    return cell.textContent.trim();
}

/**
 * Reset table to original row order
 */
function resetTableToOriginalOrder(table) {
    const tbody = table.querySelector('tbody');
    const originalRowsData = table.dataset.originalRows;

    if (originalRowsData) {
        try {
            const originalRowsHtml = JSON.parse(originalRowsData);
            tbody.innerHTML = originalRowsHtml.join('');

            // Re-initialize dropdowns after resetting
            setupDropdownRevertHandlers(table);
        } catch (e) {
            console.error('Error restoring original table order:', e);
        }
    }
}

/**
 * Check if a value is numeric
 */
function isNumeric(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
}

/**
 * Check if a value is a date
 */
function isDate(value) {
    // Common date patterns
    const datePatterns = [
        /^\d{1,2}\/\d{1,2}\/\d{4}$/, // MM/DD/YYYY or M/D/YYYY
        /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
        /^\d{1,2}-\d{1,2}-\d{4}$/, // MM-DD-YYYY or M-D-YYYY
    ];

    return datePatterns.some((pattern) =>
        pattern.test(value.toString().trim())
    );
}

/**
 * Set up row selection functionality
 */
function setupRowSelection(table) {
    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    // Add click event listener to the table body (event delegation)
    tbody.addEventListener('click', function (e) {
        // Find the row that was clicked
        let targetRow = e.target.closest('tr');

        // Don't proceed if no row found or if clicking on a button/input/select
        if (
            !targetRow ||
            e.target.tagName === 'BUTTON' ||
            e.target.tagName === 'INPUT' ||
            e.target.tagName === 'SELECT' ||
            e.target.classList.contains('resize-handle')
        ) {
            return;
        }

        // Remove active class from all rows in this table
        const allRows = tbody.querySelectorAll('tr');
        allRows.forEach((row) => row.classList.remove('active'));

        // Add active class to the clicked row
        targetRow.classList.add('active');

        // Prevent text selection and focus
        e.preventDefault();
        e.stopPropagation();

        // Ensure no element receives focus
        if (document.activeElement && document.activeElement.blur) {
            document.activeElement.blur();
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

/**
 * Set intelligent default column widths based on table type and screen size
 */
function setDefaultColumnWidths(table, tableId) {
    const headers = table.querySelectorAll('thead th');
    if (headers.length === 0) return;

    // Check if we already have saved widths
    const key = `tableColumnWidths_${tableId}`;
    const existingWidths = localStorage.getItem(key);
    if (existingWidths) {
        // User has already customized this table, don't override
        return;
    }

    // Determine screen size
    const isMobile = window.innerWidth <= 768;
    const isTablet = window.innerWidth <= 1024 && window.innerWidth > 768;

    // Get default width configurations based on table type
    const defaultWidths = getTableDefaultWidths(
        tableId,
        headers.length,
        isMobile,
        isTablet
    );

    // Apply default widths
    headers.forEach((header, index) => {
        const width = defaultWidths[index] || defaultWidths.default || 150;
        header.style.width = width + 'px';
        header.style.minWidth = width + 'px';
        header.style.maxWidth = width + 'px';
    });

    // Update table width after setting columns
    updateTableWidth(table);
}

/**
 * Get default column widths for different table types
 */
function getTableDefaultWidths(tableId, columnCount, isMobile, isTablet) {
    // Base widths for different column types
    const widths = {
        narrow: isMobile ? 80 : 100, // ID, short text
        small: isMobile ? 120 : 150, // Names, short data
        medium: isMobile ? 140 : 180, // Addresses, longer text
        large: isMobile ? 160 : 220, // Long descriptions
        date: isMobile ? 110 : 130, // Date columns
        actions: isMobile ? 80 : 100, // Action buttons
        default: isMobile ? 120 : 150, // Fallback
    };

    // Define column configurations for each table type
    if (tableId.includes('users') || tableId.includes('user')) {
        // Users table: Username, Name, Email, Role, Created, Actions
        return [
            widths.small, // Username
            widths.medium, // Name
            widths.large, // Email
            widths.small, // Role
            widths.date, // Created
            widths.actions, // Actions
        ];
    }

    if (tableId.includes('patients') || tableId.includes('patient')) {
        // Patients table: Name, DOB, Phone, Accepts Texts, Address, Last Updated, Created, Actions
        return [
            widths.medium, // Name
            widths.date, // Date of Birth
            widths.small, // Phone
            widths.narrow, // Accepts Texts
            widths.large, // Address
            widths.date, // Last Updated
            widths.date, // Created
            widths.actions, // Actions
        ];
    }

    if (tableId.includes('sessions') || tableId.includes('session')) {
        // Sessions table: User, Status, Login, Last Activity, Logout, IP, Browser, Actions
        return [
            widths.small, // User
            widths.narrow, // Status
            widths.date, // Login
            widths.date, // Last Activity
            widths.date, // Logout
            widths.small, // IP Address
            widths.medium, // Browser
            widths.actions, // Actions
        ];
    }

    // Fallback: distribute space evenly with reasonable minimums
    const defaultWidths = [];
    for (let i = 0; i < columnCount; i++) {
        defaultWidths.push(widths.default);
    }
    return defaultWidths;
}

/**
 * Handle window resize to adjust table layout
 */
function handleWindowResize() {
    const tables = document.querySelectorAll('.data-table');

    // Debounce resize events
    clearTimeout(window.tableResizeTimeout);
    window.tableResizeTimeout = setTimeout(() => {
        tables.forEach((table) => {
            updateTableWidth(table);
            ensureTableConsistency(table);
        });
    }, 250);
}

// Add window resize listener
window.addEventListener('resize', handleWindowResize);

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
    setupDropdownRevertHandlers,
    setupTableSorting,
    setupRowSelection,
    ensureTableConsistency,
    clearLegacyTableStorage,
    setDefaultColumnWidths,
    handleWindowResize,
    fixMobileSelectBehavior,
};

/**
 * Fix mobile select dropdown behavior
 */
function fixMobileSelectBehavior(table) {
    const selects = table.querySelectorAll('select');

    selects.forEach((select) => {
        // Add mobile-specific event handling
        select.addEventListener(
            'touchstart',
            function (e) {
                // Ensure the select element can receive focus on mobile
                e.stopPropagation();
            },
            { passive: true }
        );

        select.addEventListener(
            'touchend',
            function (e) {
                // Prevent any interference with native select behavior
                e.stopPropagation();
            },
            { passive: true }
        );

        // Ensure select is focusable on mobile
        if (!select.hasAttribute('tabindex')) {
            select.setAttribute('tabindex', '0');
        }

        // Add styles to ensure proper mobile interaction
        select.style.zIndex = '1000';
        select.style.position = 'relative';
    });
}
