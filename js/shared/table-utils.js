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
        console.warn(`Table with ID "${tableId}" not found`);
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

// Make table utilities available globally
window.tableUtils = {
    setupTableSorting,
    handleTableSort,
    updateTableSortIndicators,
    sortTableData,
};

// Also expose individual functions for backward compatibility
window.setupTableSorting = setupTableSorting;
window.handleTableSort = handleTableSort;
window.updateTableSortIndicators = updateTableSortIndicators;
window.sortTableData = sortTableData;
