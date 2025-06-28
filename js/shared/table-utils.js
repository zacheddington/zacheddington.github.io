// Shared Table Utilities
// Common functionality for sortable tables across the application

/**
 * Generic table sorting utility
 * @param {Object} config - Configuration object
 * @param {string} config.tableId - ID of the table element
 * @param {Array} config.sortableColumns - Array of sortable column definitions
 * @param {Object} config.currentSort - Current sort state object (should have column and direction properties)
 * @param {Function} config.handleSort - Sort handler function
 * @param {Function} config.updateSortIndicators - Function to update visual sort indicators
 */
function setupTableSorting(config) {
    const {
        tableId,
        sortableColumns,
        currentSort,
        handleSort,
        updateSortIndicators,
    } = config;

    const table = document.getElementById(tableId);
    if (!table) {
        console.warn(`Table not found`);
        return;
    }

    const headers = table.querySelectorAll('thead th');

    sortableColumns.forEach((column) => {
        const header = headers[column.index];
        if (header) {
            header.style.cursor = 'default'; // Remove pointer cursor from entire header
            header.classList.add('sortable-column');
            header.innerHTML = `${column.label} <span class="sort-indicator" data-column="${column.key}"></span>`;

            // Only add click handler to the sort indicator, not the entire header
            const sortIndicator = header.querySelector('.sort-indicator');
            if (sortIndicator) {
                sortIndicator.style.cursor = 'pointer';
                sortIndicator.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent event bubbling
                    handleSort(column.key);
                });
            }
        }
    });
}

/**
 * Generic sort handler logic
 * @param {string} columnKey - The column key to sort by
 * @param {Object} currentSort - Current sort state object (should have column and direction properties)
 * @param {Function} updateSortIndicators - Function to update visual sort indicators
 * @param {Function} refreshDisplay - Function to refresh the table display
 */
function handleTableSort(
    columnKey,
    currentSort,
    updateSortIndicators,
    refreshDisplay
) {
    // Determine new sort direction
    if (currentSort.column === columnKey) {
        // Same column clicked
        if (currentSort.direction === null) {
            currentSort.direction = 'asc';
        } else if (currentSort.direction === 'asc') {
            currentSort.direction = 'desc';
        } else {
            currentSort.direction = null;
        }
    } else {
        // Different column clicked
        currentSort.column = columnKey;
        currentSort.direction = 'asc';
    }

    // Update sort indicators
    updateSortIndicators();

    // Refresh the table display
    refreshDisplay();
}

/**
 * Generic function to update sort indicators
 * @param {string} tableId - ID of the table element
 * @param {Object} currentSort - Current sort state object
 */
function updateTableSortIndicators(tableId, currentSort) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const indicators = table.querySelectorAll('.sort-indicator');
    indicators.forEach((indicator) => {
        const column = indicator.getAttribute('data-column');
        indicator.classList.remove('sort-asc', 'sort-desc');

        if (currentSort.column === column) {
            if (currentSort.direction === 'asc') {
                indicator.classList.add('sort-asc');
                indicator.textContent = ' ↑';
            } else if (currentSort.direction === 'desc') {
                indicator.classList.add('sort-desc');
                indicator.textContent = ' ↓';
            } else {
                indicator.textContent = '';
            }
        } else {
            indicator.textContent = '';
        }
    });
}

/**
 * Generic sorting function for array of objects
 * @param {Array} data - Array of objects to sort
 * @param {Object} sortConfig - Sort configuration (column and direction)
 * @param {Function} getValueForSort - Function to extract sortable value from data item
 * @returns {Array} Sorted array
 */
function sortTableData(data, sortConfig, getValueForSort) {
    if (!sortConfig.column || !sortConfig.direction) {
        return data; // Return original array if no sorting
    }

    return [...data].sort((a, b) => {
        const aValue = getValueForSort(a, sortConfig.column);
        const bValue = getValueForSort(b, sortConfig.column);

        // Handle null/undefined values
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
        if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;

        // Compare values
        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            comparison = aValue
                .toLowerCase()
                .localeCompare(bValue.toLowerCase());
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
            comparison = aValue - bValue;
        } else if (aValue instanceof Date && bValue instanceof Date) {
            comparison = aValue.getTime() - bValue.getTime();
        } else {
            // Convert to strings and compare
            comparison = String(aValue)
                .toLowerCase()
                .localeCompare(String(bValue).toLowerCase());
        }

        return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
}

// ============================================================================
// TABLE FORMATTING AND RESIZING UTILITIES
// ============================================================================

/**
 * Initialize table formatting and resizing for a given table
 * @param {Object} config - Configuration object
 * @param {string} config.tableSelector - CSS selector for the table (e.g., '.users-table', '#patientsTable')
 * @param {string} config.storageKey - LocalStorage key for saving column preferences (e.g., 'userTableColumnWidths')
 * @param {Function} config.getColumnType - Function to determine column type from header text
 */
function initializeTableFormatting(config) {
    const { tableSelector, storageKey, getColumnType } = config;

    const table = document.querySelector(tableSelector);
    if (!table) {
        console.warn(`Table not found with selector: ${tableSelector}`);
        return;
    }

    // Load column preferences or apply auto-sizing
    loadTableColumnWidthPreferences(tableSelector, storageKey);

    // Add resize handles
    addTableColumnResizeHandles(tableSelector, storageKey, getColumnType);

    // Setup responsive resize handler
    setupTableResponsiveResize(tableSelector, storageKey);
}

/**
 * Adjust column widths for a table using auto-sizing
 * @param {string} tableSelector - CSS selector for the table
 */
function adjustTableColumnWidths(tableSelector) {
    const table = document.querySelector(tableSelector);
    if (!table) return;

    // Use auto layout to allow table to expand beyond container width
    table.style.tableLayout = 'auto';
    table.style.minWidth = 'max-content'; // Allow table to expand as needed
}

/**
 * Simple debounce function to limit how often a function is called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Get the column type based on header text for appropriate sizing constraints
 * @param {string} headerText - The header text to analyze
 * @returns {string} The column type
 */
function getDefaultColumnType(headerText) {
    const header = headerText.toLowerCase().trim();

    if (header.includes('email')) {
        return 'email';
    } else if (header.includes('username') || header.includes('user')) {
        return 'username';
    } else if (header.includes('name') || header.includes('full name')) {
        return 'name';
    } else if (header.includes('role')) {
        return 'role';
    } else if (header.includes('created') || header.includes('date')) {
        return 'created';
    } else if (header.includes('action')) {
        return 'actions';
    } else if (header.includes('status')) {
        return 'status';
    } else if (header.includes('login') || header.includes('activity')) {
        return 'datetime';
    } else if (header.includes('ip') || header.includes('address')) {
        return 'ip';
    } else if (header.includes('browser')) {
        return 'browser';
    } else if (header.includes('phone') || header.includes('contact')) {
        return 'phone';
    } else if (header.includes('mrn') || header.includes('id')) {
        return 'id';
    } else if (header.includes('birth') || header.includes('dob')) {
        return 'date';
    } else {
        return 'general';
    }
}

/**
 * Function to announce changes to screen readers
 * @param {string} message - Message to announce
 */
function announceForScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.classList.add('sr-only'); // Screen reader only
    announcement.textContent = message;
    document.body.appendChild(announcement);

    // Remove after announcement is made
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

/**
 * Add resize handles to table columns
 * @param {string} tableSelector - CSS selector for the table
 * @param {string} storageKey - LocalStorage key for saving preferences
 * @param {Function} getColumnType - Function to determine column type
 */
function addTableColumnResizeHandles(
    tableSelector,
    storageKey,
    getColumnType = getDefaultColumnType
) {
    const table = document.querySelector(tableSelector);
    if (!table) {
        console.error(`❌ No table found with selector: ${tableSelector}`);
        return;
    }

    const headers = Array.from(table.querySelectorAll('th'));

    // Remove any existing resize handles
    document.querySelectorAll('.column-resize-handle').forEach((handle) => {
        handle.remove();
    });

    // Add resize handle to each header except the last one (actions column)
    headers.forEach((header, index) => {
        if (index < headers.length - 1) {
            // Skip last column (actions)
            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'column-resize-handle';
            resizeHandle.setAttribute('role', 'separator');
            resizeHandle.setAttribute('aria-orientation', 'vertical');
            resizeHandle.setAttribute('aria-valuemin', '80'); // Minimum width
            resizeHandle.setAttribute('aria-valuemax', '500'); // Maximum width
            resizeHandle.setAttribute('aria-valuenow', header.offsetWidth);
            resizeHandle.setAttribute('tabindex', '0'); // Make focusable for keyboard
            header.appendChild(resizeHandle);

            // Add tooltip to indicate resizable column
            header.setAttribute(
                'title',
                'Drag to resize column | Double-click to auto-size'
            );

            // Add resize listeners for mouse
            resizeHandle.addEventListener('mousedown', function (e) {
                startTableColumnResize(
                    e,
                    header,
                    index,
                    tableSelector,
                    storageKey
                );
            });

            // Add touch support
            resizeHandle.addEventListener(
                'touchstart',
                function (e) {
                    // Prevent scrolling while resizing
                    e.preventDefault();
                    const touch = e.touches[0];
                    startTableColumnResize(
                        touch,
                        header,
                        index,
                        tableSelector,
                        storageKey
                    );
                },
                { passive: false }
            );

            // Add double-click to auto-size functionality
            resizeHandle.addEventListener('dblclick', function (e) {
                e.preventDefault();
                e.stopPropagation();
                autoSizeTableColumn(
                    header,
                    index,
                    tableSelector,
                    storageKey,
                    getColumnType
                );
            });

            // Also add double-click to the header itself for better UX
            header.addEventListener('dblclick', function (e) {
                // Only trigger if not clicking on sort indicator or other interactive elements
                if (
                    !e.target.classList.contains('sort-indicator') &&
                    !e.target.closest('.sort-indicator') &&
                    !e.target.classList.contains('column-resize-handle')
                ) {
                    e.preventDefault();
                    e.stopPropagation();
                    autoSizeTableColumn(
                        header,
                        index,
                        tableSelector,
                        storageKey,
                        getColumnType
                    );
                }
            });

            // Add keyboard support
            resizeHandle.addEventListener('keydown', function (e) {
                // Respond to left/right arrow keys
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    const currentWidth = header.offsetWidth;
                    const step = e.key === 'ArrowLeft' ? -10 : 10;
                    const newWidth = Math.max(80, currentWidth + step);
                    header.style.width = newWidth + 'px';
                    this.setAttribute('aria-valuenow', newWidth);
                    saveTableColumnWidthPreferences(tableSelector, storageKey);
                }
                // Enter key to auto-size
                else if (e.key === 'Enter') {
                    e.preventDefault();
                    autoSizeTableColumn(
                        header,
                        index,
                        tableSelector,
                        storageKey,
                        getColumnType
                    );
                }
            });
        }
    });
}

/**
 * Handle column resizing start
 * @param {Event} event - Mouse or touch event
 * @param {Element} header - Header element being resized
 * @param {number} columnIndex - Index of the column
 * @param {string} tableSelector - CSS selector for the table
 * @param {string} storageKey - LocalStorage key for saving preferences
 */
function startTableColumnResize(
    event,
    header,
    columnIndex,
    tableSelector,
    storageKey
) {
    // Accept both mouse and touch events
    if (event.preventDefault) event.preventDefault();

    const table = document.querySelector(tableSelector);
    const startX = event.pageX || event.clientX;
    const startWidth = header.offsetWidth;
    const handle = event.target;

    // Store initial widths of ALL columns to preserve them
    const headers = Array.from(table.querySelectorAll('th'));
    const initialWidths = headers.map((h) => h.offsetWidth);
    
    // Set table to fixed layout IMMEDIATELY to prevent auto-adjustments
    table.style.tableLayout = 'fixed';
    
    // Apply current widths to all headers to lock them in place
    headers.forEach((h, index) => {
        h.style.width = `${initialWidths[index]}px`;
    });

    // Add visual feedback
    table.classList.add('resizing');
    handle.classList.add('active');

    let animationId = null;

    function doResize(e) {
        const currentX = e.pageX || e.clientX;
        const diff = currentX - startX;
        const newWidth = Math.max(80, Math.min(500, startWidth + diff));

        // Cancel any pending animation frame
        if (animationId) {
            cancelAnimationFrame(animationId);
        }

        // Use requestAnimationFrame for smooth updates
        animationId = requestAnimationFrame(() => {
            // ONLY resize the target column - keep all others exactly the same
            header.style.width = `${newWidth}px`;
            
            // Update ARIA attribute
            handle.setAttribute('aria-valuenow', newWidth);
            
            animationId = null;
        });
    }

    function stopResize() {
        // Clean up event listeners
        document.removeEventListener('mousemove', doResize);
        document.removeEventListener('mouseup', stopResize);
        document.removeEventListener('touchmove', doResize);
        document.removeEventListener('touchend', stopResize);

        // Cancel any pending animation
        if (animationId) {
            cancelAnimationFrame(animationId);
        }

        // Remove visual feedback
        table.classList.remove('resizing');
        handle.classList.remove('active');

        // Save preferences after resize
        saveTableColumnWidthPreferences(tableSelector, storageKey);

        // Announce change for screen readers
        announceForScreenReader(`Column ${header.textContent.trim()} resized`);
    }

    // Add event listeners
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);
    document.addEventListener('touchmove', doResize, { passive: false });
    document.addEventListener('touchend', stopResize);
}

/**
 * Auto-size a table column based on content
 * @param {Element} header - Header element to auto-size
 * @param {number} columnIndex - Index of the column
 * @param {string} tableSelector - CSS selector for the table
 * @param {string} storageKey - LocalStorage key for saving preferences
 * @param {Function} getColumnType - Function to determine column type
 */
function autoSizeTableColumn(
    header,
    columnIndex,
    tableSelector,
    storageKey,
    getColumnType = getDefaultColumnType
) {
    const table = document.querySelector(tableSelector);
    if (!table) return;

    // Ensure table is in fixed layout mode
    table.style.tableLayout = 'fixed';

    // Get all cells in this column (including header)
    const cells = Array.from(
        table.querySelectorAll(`tr td:nth-child(${columnIndex + 1}), tr th:nth-child(${columnIndex + 1})`)
    );

    if (cells.length === 0) return;

    // Create a temporary element to measure text width
    const measureElement = document.createElement('div');
    measureElement.style.position = 'absolute';
    measureElement.style.visibility = 'hidden';
    measureElement.style.whiteSpace = 'nowrap';
    measureElement.style.fontSize = getComputedStyle(table).fontSize || '14px';
    measureElement.style.fontFamily = getComputedStyle(table).fontFamily || 'system-ui';
    document.body.appendChild(measureElement);

    let maxWidth = 80; // Minimum width

    // Measure each cell's content
    cells.forEach(cell => {
        const cellText = cell.textContent.trim();
        if (!cellText) return;

        measureElement.textContent = cellText;
        const textWidth = measureElement.offsetWidth;
        
        // Add padding (left + right padding + some buffer)
        const cellPadding = 32; // Generous padding for readability
        const totalWidth = textWidth + cellPadding;
        
        maxWidth = Math.max(maxWidth, totalWidth);
    });

    // Clean up
    document.body.removeChild(measureElement);

    // Apply column type constraints
    const columnType = getColumnType(header.textContent);
    
    // Set reasonable min/max constraints based on column type
    const constraints = {
        'email': { min: 120, max: 300 },
        'username': { min: 100, max: 200 },
        'name': { min: 120, max: 250 },
        'fullName': { min: 150, max: 280 },
        'role': { min: 100, max: 180 },
        'date': { min: 100, max: 150 },
        'datetime': { min: 140, max: 200 },
        'phone': { min: 120, max: 160 },
        'address': { min: 150, max: 350 },
        'actions': { min: 80, max: 150 },
        'status': { min: 80, max: 120 },
        'general': { min: 80, max: 300 }
    };

    const constraint = constraints[columnType] || constraints.general;
    maxWidth = Math.max(constraint.min, Math.min(constraint.max, maxWidth));

    // Apply the new width
    header.style.width = `${maxWidth}px`;

    // Save preferences
    saveTableColumnWidthPreferences(tableSelector, storageKey);

    // Announce change for screen readers
    announceForScreenReader(`Column ${header.textContent.trim()} auto-sized to ${maxWidth}px`);
}

/**
 * Save column width preferences to localStorage
 * @param {string} tableSelector - CSS selector for the table
 * @param {string} storageKey - LocalStorage key for saving preferences
 */
function saveTableColumnWidthPreferences(tableSelector, storageKey) {
    const table = document.querySelector(tableSelector);
    if (!table) return;

    const headers = Array.from(table.querySelectorAll('th'));
    const widths = headers.map((header) => header.style.width);

    localStorage.setItem(storageKey, JSON.stringify(widths));
}

/**
 * Load column width preferences from localStorage
 * @param {string} tableSelector - CSS selector for the table
 * @param {string} storageKey - LocalStorage key for loading preferences
 */
function loadTableColumnWidthPreferences(tableSelector, storageKey) {
    const table = document.querySelector(tableSelector);
    if (!table) return;

    try {
        const savedWidths = JSON.parse(localStorage.getItem(storageKey));

        if (savedWidths && Array.isArray(savedWidths)) {
            const headers = Array.from(table.querySelectorAll('th'));

            headers.forEach((header, index) => {
                if (savedWidths[index]) {
                    header.style.width = savedWidths[index];
                }
            });

            table.style.tableLayout = 'fixed';
        } else {
            // No saved preferences, run auto-sizing algorithm
            adjustTableColumnWidths(tableSelector);
        }
    } catch (error) {
        // Error loading column width preferences
        adjustTableColumnWidths(tableSelector);
    }
}

/**
 * Setup responsive resize handler for tables
 * @param {string} tableSelector - CSS selector for the table
 * @param {string} storageKey - LocalStorage key for preferences
 */
function setupTableResponsiveResize(tableSelector, storageKey) {
    // Add event listener for window resize to adjust column widths
    window.addEventListener(
        'resize',
        debounce(function () {
            // Only auto-adjust if no saved preferences
            if (!localStorage.getItem(storageKey)) {
                adjustTableColumnWidths(tableSelector);
            } else {
                // For responsive tables, check if we've crossed a breakpoint
                const width = window.innerWidth;
                if (
                    !window.lastWidth ||
                    (width < 480 && window.lastWidth >= 480) ||
                    (width >= 480 &&
                        width < 768 &&
                        (window.lastWidth < 480 || window.lastWidth >= 768)) ||
                    (width >= 768 && window.lastWidth < 768)
                ) {
                    // We've crossed a responsive breakpoint, adjust columns
                    adjustTableColumnWidths(tableSelector);
                    // Re-add resize handles after adjustment
                    setTimeout(() => {
                        addTableColumnResizeHandles(tableSelector, storageKey);
                    }, 100);
                }
                window.lastWidth = width;
            }
        }, 250)
    );
}

// Make table utilities available globally
window.tableUtils = {
    setupTableSorting,
    handleTableSort,
    updateTableSortIndicators,
    sortTableData,
    initializeTableFormatting,
    adjustTableColumnWidths,
    addTableColumnResizeHandles,
    autoSizeTableColumn,
    saveTableColumnWidthPreferences,
    loadTableColumnWidthPreferences,
    setupTableResponsiveResize,
    getDefaultColumnType,
    debounce,
    announceForScreenReader,
};

// Also expose individual functions for backward compatibility
window.setupTableSorting = setupTableSorting;
window.handleTableSort = handleTableSort;
window.updateTableSortIndicators = updateTableSortIndicators;
window.sortTableData = sortTableData;
window.initializeTableFormatting = initializeTableFormatting;
window.adjustTableColumnWidths = adjustTableColumnWidths;
window.addTableColumnResizeHandles = addTableColumnResizeHandles;
window.autoSizeTableColumn = autoSizeTableColumn;
window.saveTableColumnWidthPreferences = saveTableColumnWidthPreferences;
window.loadTableColumnWidthPreferences = loadTableColumnWidthPreferences;
window.setupTableResponsiveResize = setupTableResponsiveResize;
