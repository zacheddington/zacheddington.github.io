// Address Validation and Autocomplete Utilities
// Provides address validation and autocomplete functionality using various APIs

// Configuration for different address validation providers
const ADDRESS_PROVIDERS = {
    google: {
        name: 'Google Places API',
        requiresApiKey: true,
        requiresScript: true,
        scriptUrl:
            'https://maps.googleapis.com/maps/api/js?key={API_KEY}&libraries=places&loading=async',
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

        // Use the proper callback method for Google Maps API loading
        const callbackName = 'initGoogleMapsCallback_' + Date.now();
        window[callbackName] = function () {
            console.log('📍 Google Places API loaded successfully');
            delete window[callbackName]; // Clean up
            resolve(true);
        };

        // Create and load the script with callback
        const script = document.createElement('script');
        const scriptUrl =
            ADDRESS_PROVIDERS.google.scriptUrl.replace('{API_KEY}', apiKey) +
            '&callback=' +
            callbackName;
        script.src = scriptUrl;
        script.async = true;
        script.defer = true;

        script.onerror = () => {
            console.error('❌ Failed to load Google Places API script');
            delete window[callbackName]; // Clean up
            reject(new Error('Failed to load Google Places API script'));
        };

        // Timeout fallback
        setTimeout(() => {
            if (window[callbackName]) {
                console.error('❌ Google Places API failed to load (timeout)');
                delete window[callbackName];
                reject(new Error('Google Places API load timeout'));
            }
        }, 10000);

        document.head.appendChild(script);
    });
}

// Setup address autocomplete for a specific input field
function setupAddressAutocomplete(inputId, options = {}) {
    console.log('🔧 Setting up address autocomplete for:', inputId);
    console.log('🔧 Current provider:', currentProvider);
    console.log('🔧 API key available:', !!apiKey);

    const input = document.getElementById(inputId);
    if (!input) {
        console.error(
            `❌ Address autocomplete: Input field ${inputId} not found`
        );
        return;
    }

    console.log('✅ Input field found:', input);

    // Demo mode or API key is required
    if (!apiKey && currentProvider !== 'demo') {
        console.warn(
            '⚠️ Address autocomplete: No API key available and not in demo mode, skipping setup'
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
    console.log('🔧 Autocomplete config:', config);

    // Create autocomplete container
    console.log('🔧 Creating autocomplete container...');
    const container = createAutocompleteContainer(input);

    // Setup event listeners
    console.log('🔧 Setting up autocomplete events...');
    setupAutocompleteEvents(input, container, config);

    console.log(`✅ Address autocomplete setup complete for ${inputId}`);
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
    let isSelectingAddress = false; // Flag to prevent autocomplete after selection    // Input event handler with debouncing
    input.addEventListener('input', function (e) {
        console.log('🔧 Input event triggered, value:', e.target.value);

        // Skip if we're in the middle of selecting an address
        if (isSelectingAddress) {
            console.log('🔧 Skipping - address selection in progress');
            isSelectingAddress = false;
            return;
        }

        const query = e.target.value.trim();
        console.log(
            '🔧 Query after trim:',
            query,
            'Length:',
            query.length,
            'Min length:',
            config.minLength
        );

        clearTimeout(debounceTimer);

        if (query.length < config.minLength) {
            console.log('🔧 Query too short, hiding autocomplete');
            hideAutocomplete(container);
            return;
        }

        console.log('🔧 Setting debounce timer for', config.debounceMs, 'ms');
        debounceTimer = setTimeout(() => {
            console.log('🔧 Debounce timer fired, searching for:', query);
            searchAddresses(query, config)
                .then((results) => {
                    console.log('✅ Search results:', results);
                    showAutocompleteResults(container, results, config, input);
                })
                .catch((error) => {
                    console.error('❌ Address search error:', error);
                    if (config.onError) {
                        config.onError(error);
                    }
                });
        }, config.debounceMs);
    });

    // Store the flag setter on the container so selectAddress can access it
    container._setSelectingFlag = function () {
        isSelectingAddress = true;
    };

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
    console.log(
        '🔧 searchAddresses called with:',
        query,
        'Provider:',
        currentProvider
    );

    if (currentProvider === 'google') {
        console.log('🔧 Using Google Places API');
        return searchGooglePlaces(query, config);
    } else if (currentProvider === 'demo') {
        console.log('🔧 Using demo mode');
        return searchDemoAddresses(query, config);
    }
    // Add other providers here
    console.error('❌ Unsupported address provider:', currentProvider);
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

        // Try to use the new AutocompleteSuggestion API first
        if (
            window.google.maps.places.AutocompleteSuggestion &&
            window.google.maps.places.AutocompleteSuggestion
                .fetchAutocompleteSuggestions
        ) {
            // New API implementation
            const request = {
                input: query,
                // Use proper field for location restriction
                locationRestriction: config.componentRestrictions?.country
                    ? {
                          country:
                              config.componentRestrictions.country.toUpperCase(),
                      }
                    : undefined,
                // Include types - use the newer format
                includedPrimaryTypes:
                    config.types && config.types.includes('address')
                        ? ['street_address', 'route', 'premise']
                        : config.types,
                // Set language if needed
                languageCode: 'en',
            };

            // Remove undefined properties
            Object.keys(request).forEach((key) => {
                if (request[key] === undefined) {
                    delete request[key];
                }
            });

            window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(
                request
            )
                .then((response) => {
                    if (
                        response.suggestions &&
                        response.suggestions.length > 0
                    ) {
                        // Convert to our expected format
                        const results = response.suggestions
                            .slice(0, config.maxResults)
                            .map((suggestion) => {
                                const placePrediction =
                                    suggestion.placePrediction;
                                if (placePrediction) {
                                    return {
                                        description:
                                            placePrediction.text?.text ||
                                            placePrediction.text,
                                        place_id: placePrediction.placeId,
                                        structured_formatting: {
                                            main_text:
                                                placePrediction.structuredFormat
                                                    ?.mainText?.text ||
                                                placePrediction.text?.text,
                                            secondary_text:
                                                placePrediction.structuredFormat
                                                    ?.secondaryText?.text || '',
                                        },
                                    };
                                } else {
                                    // Handle other suggestion types
                                    return {
                                        description: suggestion.text || query,
                                        place_id: `generated_${Math.random()
                                            .toString(36)
                                            .substr(2, 9)}`,
                                        structured_formatting: {
                                            main_text: suggestion.text || query,
                                            secondary_text: '',
                                        },
                                    };
                                }
                            });
                        resolve(results);
                    } else {
                        resolve([]);
                    }
                })
                .catch((error) => {
                    console.warn(
                        'New AutocompleteSuggestion API failed, falling back to legacy API:',
                        error
                    );
                    fallbackToLegacyAPI();
                });
        } else {
            // Fallback to legacy API
            fallbackToLegacyAPI();
        }

        function fallbackToLegacyAPI() {
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
                    status ===
                        window.google.maps.places.PlacesServiceStatus.OK &&
                    predictions
                ) {
                    // Convert to our expected format
                    const results = predictions
                        .slice(0, config.maxResults)
                        .map((prediction) => ({
                            description: prediction.description,
                            place_id: prediction.place_id,
                            structured_formatting:
                                prediction.structured_formatting,
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
        }
    });
}

// Demo/Mock address search for testing and development
function searchDemoAddresses(query, config) {
    console.log('🔧 searchDemoAddresses called with query:', query);

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

            console.log(
                '✅ Demo search returning',
                filteredResults.length,
                'results for:',
                query
            );
            resolve(filteredResults);
        }, 200); // Simulate 200ms API delay
    });
}

// Display autocomplete results
function showAutocompleteResults(container, results, config, input) {
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
            background-color: white;
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
        `; // Add hover effect
        item.addEventListener('mouseenter', function () {
            // Remove any existing selection styling first
            const allItems = container.querySelectorAll('.autocomplete-item');
            allItems.forEach((i) => {
                if (i !== item) {
                    i.style.backgroundColor = 'white';
                }
            });
            item.style.backgroundColor = '#f5f5f5';
        });
        item.addEventListener('mouseleave', function () {
            item.style.backgroundColor = 'white';
        }); // Handle click selection
        item.addEventListener('click', function () {
            selectAddress(item, input, container, config, result);
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

    // Set flag to prevent autocomplete from triggering
    if (container._setSelectingFlag) {
        container._setSelectingFlag();
    }

    input.value = description;

    hideAutocomplete(container);

    // Trigger input event to update any validation (but autocomplete won't trigger due to flag)
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

// Diagnostic function to test address autocomplete setup
function diagnoseAddressAutocomplete() {
    console.log('🔍 DIAGNOSTIC: Address Autocomplete Status');
    console.log('=====================================');

    // Check modules
    const hasAddressValidation =
        typeof window.addressValidation !== 'undefined';
    const hasStructuredAddress =
        typeof window.structuredAddress !== 'undefined';
    console.log(
        '✅ addressValidation module:',
        hasAddressValidation ? '✅ Available' : '❌ Missing'
    );
    console.log(
        '✅ structuredAddress module:',
        hasStructuredAddress ? '✅ Available' : '❌ Missing'
    );

    // Check Google Places API
    const hasGoogle = typeof window.google !== 'undefined';
    const hasMaps = hasGoogle && typeof window.google.maps !== 'undefined';
    const hasPlaces =
        hasMaps && typeof window.google.maps.places !== 'undefined';
    console.log('✅ Google API:', hasGoogle ? '✅ Available' : '❌ Missing');
    console.log('✅ Google Maps:', hasMaps ? '✅ Available' : '❌ Missing');
    console.log('✅ Google Places:', hasPlaces ? '✅ Available' : '❌ Missing');

    // Check current provider and API key
    console.log('✅ Current provider:', currentProvider);
    console.log('✅ API key set:', !!apiKey);

    // Check form fields
    const address1Field = document.getElementById('patientAddress1');
    const cityField = document.getElementById('patientCity');
    const stateField = document.getElementById('patientState');
    const zipField = document.getElementById('patientZip');

    console.log(
        '✅ Address1 field:',
        address1Field ? '✅ Found' : '❌ Missing'
    );
    console.log('✅ City field:', cityField ? '✅ Found' : '❌ Missing');
    console.log('✅ State field:', stateField ? '✅ Found' : '❌ Missing');
    console.log('✅ ZIP field:', zipField ? '✅ Found' : '❌ Missing');

    // Check autocomplete container
    const autocompleteContainer = document.querySelector(
        '.address-autocomplete-container'
    );
    console.log(
        '✅ Autocomplete container:',
        autocompleteContainer ? '✅ Found' : '❌ Missing'
    );

    // Test search function if available
    if (hasAddressValidation && typeof searchAddresses === 'function') {
        console.log('🔧 Testing search function...');
        try {
            searchAddresses('123 Main', { maxResults: 3 })
                .then((results) => {
                    console.log(
                        '✅ Search test successful:',
                        results.length,
                        'results'
                    );
                })
                .catch((error) => {
                    console.log('❌ Search test failed:', error.message);
                });
        } catch (error) {
            console.log('❌ Search test error:', error.message);
        }
    }

    console.log('=====================================');
    console.log(
        '💡 To manually test, type in the address field: "123 Main Street"'
    );

    return {
        hasAddressValidation,
        hasStructuredAddress,
        hasGoogle,
        hasMaps,
        hasPlaces,
        currentProvider,
        hasApiKey: !!apiKey,
        fieldsFound: {
            address1: !!address1Field,
            city: !!cityField,
            state: !!stateField,
            zip: !!zipField,
        },
    };
}

// Make diagnostic function available globally
if (typeof window !== 'undefined') {
    window.diagnoseAddressAutocomplete = diagnoseAddressAutocomplete;
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
