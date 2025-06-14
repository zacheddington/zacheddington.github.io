// Address Validation and Autocomplete Utilities
// Provides address validation and autocomplete functionality using various APIs

// Configuration for different address validation providers
const ADDRESS_PROVIDERS = {
    google: {
        name: 'Google Places API',
        requiresApiKey: true,
        requiresScript: true,
        scriptUrl:
            'https://maps.googleapis.com/maps/api/js?key={API_KEY}&libraries=places',
    },
    mapbox: {
        name: 'MapBox Geocoding API',
        autocompleteUrl: 'https://api.mapbox.com/geocoding/v5/mapbox.places',
        requiresApiKey: true,
    },
    demo: {
        name: 'Demo Mode (Mock Data)',
        requiresApiKey: false,
    },
    // Add more providers as needed
};

// Current configuration - can be set via environment or configuration
let currentProvider = 'google';
let apiKey = null;

// Initialize address validation with API key
function initializeAddressValidation(provider = 'google', key = null) {
    currentProvider = provider;
    apiKey = key;

    // Demo mode doesn't require an API key
    if (currentProvider === 'demo') {
        console.log(
            `📍 Address validation initialized with ${ADDRESS_PROVIDERS[provider].name}`
        );
        return true;
    }

    if (!apiKey) {
        console.warn(
            '⚠️ Address validation: No API key provided. Falling back to demo mode.'
        );
        currentProvider = 'demo';
        console.log(
            `📍 Address validation initialized with ${ADDRESS_PROVIDERS.demo.name}`
        );
        return true;
    }

    // For Google Places, we need to load the JavaScript API
    if (currentProvider === 'google') {
        return loadGooglePlacesAPI();
    }

    console.log(
        `📍 Address validation initialized with ${ADDRESS_PROVIDERS[provider].name}`
    );
    return true;
}

// Load Google Places JavaScript API
function loadGooglePlacesAPI() {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (window.google && window.google.maps && window.google.maps.places) {
            console.log('📍 Google Places API already loaded');
            resolve(true);
            return;
        }

        // Check if script is already being loaded
        if (document.querySelector('script[src*="maps.googleapis.com"]')) {
            // Wait for it to load
            const checkLoaded = setInterval(() => {
                if (
                    window.google &&
                    window.google.maps &&
                    window.google.maps.places
                ) {
                    clearInterval(checkLoaded);
                    console.log('📍 Google Places API loaded successfully');
                    resolve(true);
                }
            }, 100);

            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkLoaded);
                console.error('❌ Google Places API failed to load (timeout)');
                reject(new Error('Google Places API load timeout'));
            }, 10000);
            return;
        }

        // Create and load the script
        const script = document.createElement('script');
        const scriptUrl = ADDRESS_PROVIDERS.google.scriptUrl.replace(
            '{API_KEY}',
            apiKey
        );
        script.src = scriptUrl;
        script.async = true;
        script.defer = true;

        script.onload = () => {
            // Wait a moment for the API to fully initialize
            setTimeout(() => {
                if (
                    window.google &&
                    window.google.maps &&
                    window.google.maps.places
                ) {
                    console.log('📍 Google Places API loaded successfully');
                    resolve(true);
                } else {
                    console.error(
                        '❌ Google Places API not available after script load'
                    );
                    reject(new Error('Google Places API not available'));
                }
            }, 100);
        };

        script.onerror = () => {
            console.error('❌ Failed to load Google Places API script');
            reject(new Error('Failed to load Google Places API script'));
        };

        document.head.appendChild(script);
    });
}

// Setup address autocomplete for a specific input field
function setupAddressAutocomplete(inputId, options = {}) {
    const input = document.getElementById(inputId);
    if (!input) {
        console.error(`Address autocomplete: Input field ${inputId} not found`);
        return;
    }

    // Demo mode or API key is required
    if (!apiKey && currentProvider !== 'demo') {
        console.warn(
            'Address autocomplete: No API key available and not in demo mode, skipping setup'
        );
        return;
    }

    // Default options
    const defaultOptions = {
        minLength: 3, // Minimum characters before triggering autocomplete
        debounceMs: 300, // Debounce delay in milliseconds
        maxResults: 5, // Maximum number of autocomplete suggestions
        types: ['address'], // Types of places to return
        componentRestrictions: { country: 'us' }, // Restrict to specific country
        onSelect: null, // Callback when address is selected
        onError: null, // Callback for errors
    };

    const config = { ...defaultOptions, ...options };

    // Create autocomplete container
    const container = createAutocompleteContainer(input);

    // Setup event listeners
    setupAutocompleteEvents(input, container, config);

    console.log(`📍 Address autocomplete setup complete for ${inputId}`);
}

// Create the autocomplete dropdown container
function createAutocompleteContainer(input) {
    const container = document.createElement('div');
    container.className = 'address-autocomplete-container';
    container.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #ddd;
        border-top: none;
        border-radius: 0 0 4px 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        max-height: 200px;
        overflow-y: auto;
        z-index: 1000;
        display: none;
    `;

    // Make the parent container relative if it isn't already
    const parent = input.parentElement;
    if (getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
    }

    parent.appendChild(container);
    return container;
}

// Setup event listeners for autocomplete functionality
function setupAutocompleteEvents(input, container, config) {
    let debounceTimer = null;
    let currentRequest = null;
    let selectedIndex = -1;

    // Input event handler with debouncing
    input.addEventListener('input', function (e) {
        const query = e.target.value.trim();

        clearTimeout(debounceTimer);

        if (query.length < config.minLength) {
            hideAutocomplete(container);
            return;
        }

        debounceTimer = setTimeout(() => {
            searchAddresses(query, config)
                .then((results) => {
                    showAutocompleteResults(container, results, config);
                })
                .catch((error) => {
                    console.error('Address search error:', error);
                    if (config.onError) {
                        config.onError(error);
                    }
                });
        }, config.debounceMs);
    });

    // Handle keyboard navigation
    input.addEventListener('keydown', function (e) {
        const items = container.querySelectorAll('.autocomplete-item');

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                updateSelection(items, selectedIndex);
                break;
            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                updateSelection(items, selectedIndex);
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && items[selectedIndex]) {
                    selectAddress(
                        items[selectedIndex],
                        input,
                        container,
                        config
                    );
                }
                break;
            case 'Escape':
                hideAutocomplete(container);
                selectedIndex = -1;
                break;
        }
    });

    // Hide autocomplete when clicking outside
    document.addEventListener('click', function (e) {
        if (!input.contains(e.target) && !container.contains(e.target)) {
            hideAutocomplete(container);
            selectedIndex = -1;
        }
    });

    // Reset selection when input changes
    input.addEventListener('focus', function () {
        selectedIndex = -1;
    });
}

// Search for addresses using the configured provider
async function searchAddresses(query, config) {
    if (currentProvider === 'google') {
        return searchGooglePlaces(query, config);
    } else if (currentProvider === 'demo') {
        return searchDemoAddresses(query, config);
    }
    // Add other providers here
    throw new Error(`Unsupported address provider: ${currentProvider}`);
}

// Google Places API search implementation using JavaScript API
async function searchGooglePlaces(query, config) {
    return new Promise((resolve, reject) => {
        // Check if Google Places API is available
        if (
            !window.google ||
            !window.google.maps ||
            !window.google.maps.places
        ) {
            reject(new Error('Google Places API not loaded'));
            return;
        }

        // Create AutocompleteService
        const service = new window.google.maps.places.AutocompleteService();

        // Prepare request options
        const request = {
            input: query,
            types: config.types || ['address'],
        };

        // Add component restrictions if specified
        if (config.componentRestrictions) {
            request.componentRestrictions = config.componentRestrictions;
        }

        // Make the request
        service.getPlacePredictions(request, (predictions, status) => {
            if (
                status === window.google.maps.places.PlacesServiceStatus.OK &&
                predictions
            ) {
                // Convert to our expected format
                const results = predictions
                    .slice(0, config.maxResults)
                    .map((prediction) => ({
                        description: prediction.description,
                        place_id: prediction.place_id,
                        structured_formatting: prediction.structured_formatting,
                    }));
                resolve(results);
            } else if (
                status ===
                window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS
            ) {
                resolve([]);
            } else {
                reject(new Error(`Google Places API error: ${status}`));
            }
        });
    });
}

// Demo/Mock address search for testing and development
function searchDemoAddresses(query, config) {
    return new Promise((resolve) => {
        // Simulate API delay
        setTimeout(() => {
            const demoAddresses = [
                {
                    description: `${query} Main Street, Springfield, IL, USA`,
                    place_id: 'demo_1',
                    structured_formatting: {
                        main_text: `${query} Main Street`,
                        secondary_text: 'Springfield, IL, USA',
                    },
                },
                {
                    description: `${query} Oak Avenue, Madison, WI, USA`,
                    place_id: 'demo_2',
                    structured_formatting: {
                        main_text: `${query} Oak Avenue`,
                        secondary_text: 'Madison, WI, USA',
                    },
                },
                {
                    description: `${query} First Street, Chicago, IL, USA`,
                    place_id: 'demo_3',
                    structured_formatting: {
                        main_text: `${query} First Street`,
                        secondary_text: 'Chicago, IL, USA',
                    },
                },
                {
                    description: `${query} Broadway, New York, NY, USA`,
                    place_id: 'demo_4',
                    structured_formatting: {
                        main_text: `${query} Broadway`,
                        secondary_text: 'New York, NY, USA',
                    },
                },
                {
                    description: `${query} Park Road, Austin, TX, USA`,
                    place_id: 'demo_5',
                    structured_formatting: {
                        main_text: `${query} Park Road`,
                        secondary_text: 'Austin, TX, USA',
                    },
                },
            ];

            // Filter and limit results
            const filteredResults = demoAddresses
                .filter((addr) =>
                    addr.description.toLowerCase().includes(query.toLowerCase())
                )
                .slice(0, config.maxResults);

            resolve(filteredResults);
        }, 200); // Simulate 200ms API delay
    });
}

// Display autocomplete results
function showAutocompleteResults(container, results, config) {
    container.innerHTML = '';

    if (results.length === 0) {
        hideAutocomplete(container);
        return;
    }

    results.forEach((result, index) => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.style.cssText = `
            padding: 10px 12px;
            cursor: pointer;
            border-bottom: 1px solid #eee;
            font-size: 14px;
            line-height: 1.4;
        `;

        // Format the address display
        const mainText = result.structured_formatting
            ? result.structured_formatting.main_text
            : result.description;
        const secondaryText = result.structured_formatting
            ? result.structured_formatting.secondary_text
            : '';

        item.innerHTML = `
            <div style="font-weight: 500; color: #333;">${mainText}</div>
            ${
                secondaryText
                    ? `<div style="font-size: 12px; color: #666;">${secondaryText}</div>`
                    : ''
            }
        `;

        // Add hover effect
        item.addEventListener('mouseenter', function () {
            item.style.backgroundColor = '#f5f5f5';
        });
        item.addEventListener('mouseleave', function () {
            item.style.backgroundColor = 'white';
        });

        // Handle click selection
        item.addEventListener('click', function () {
            selectAddress(
                item,
                container.previousElementSibling,
                container,
                config,
                result
            );
        });

        // Store result data
        item.dataset.placeId = result.place_id;
        item.dataset.description = result.description;

        container.appendChild(item);
    });

    container.style.display = 'block';
}

// Handle address selection
function selectAddress(item, input, container, config, result = null) {
    const description = item.dataset.description || item.textContent.trim();
    input.value = description;

    hideAutocomplete(container);

    // Trigger input event to update any validation
    const event = new Event('input', { bubbles: true });
    input.dispatchEvent(event);

    // Call onSelect callback if provided
    if (config.onSelect) {
        const addressData = {
            description: description,
            placeId: item.dataset.placeId,
            result: result,
        };
        config.onSelect(addressData);
    }
}

// Update visual selection in autocomplete list
function updateSelection(items, selectedIndex) {
    items.forEach((item, index) => {
        if (index === selectedIndex) {
            item.style.backgroundColor = '#e3f2fd';
        } else {
            item.style.backgroundColor = 'white';
        }
    });
}

// Hide autocomplete dropdown
function hideAutocomplete(container) {
    container.style.display = 'none';
    container.innerHTML = '';
}

// Validate an address (can be expanded to call validation APIs)
async function validateAddress(address) {
    if (!address || address.trim().length === 0) {
        return { isValid: false, error: 'Address is required' };
    }

    if (address.length > 100) {
        return {
            isValid: false,
            error: 'Address must be 100 characters or less',
        };
    }

    // Basic validation - can be enhanced with API calls
    const hasNumber = /\d/.test(address);
    const hasStreet = address.trim().split(' ').length >= 2;

    if (!hasNumber || !hasStreet) {
        return {
            isValid: false,
            error: 'Please enter a complete address with street number and name',
            warning: true, // This is a warning, not a hard error
        };
    }

    return { isValid: true };
}

// Export functions for use in other modules
if (typeof window !== 'undefined') {
    window.addressValidation = {
        initializeAddressValidation,
        setupAddressAutocomplete,
        validateAddress,
    };
}

// Also expose individual functions
window.initializeAddressValidation = initializeAddressValidation;
window.setupAddressAutocomplete = setupAddressAutocomplete;
window.validateAddress = validateAddress;
