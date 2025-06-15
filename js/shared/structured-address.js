// Enhanced Address Validation for Structured Addresses
// Extends the existing address-validation.js to support multi-field addresses

// Enhanced configuration for structured addresses
const STRUCTURED_ADDRESS_CONFIG = {
    enableAutoPopulation: true, // Auto-fill city/state/zip from Places API
    enablePOBoxDetection: true, // Detect and handle PO Boxes
    enableAddressValidation: true, // Validate complete addresses
    fields: {
        address1: 'patientAddress1', // Main street address (with autocomplete)
        address2: 'patientAddress2', // Apartment/unit (manual entry)
        city: 'patientCity',
        state: 'patientState',
        zip: 'patientZip',
    },
};

// Setup structured address autocomplete
function setupStructuredAddressAutocomplete(
    config = STRUCTURED_ADDRESS_CONFIG
) {
    console.log('🔧 Setting up structured address autocomplete...');
    console.log('🔧 Config:', config);

    const address1Input = document.getElementById(config.fields.address1);
    if (!address1Input) {
        console.error('❌ Address1 field not found:', config.fields.address1);
        return;
    }

    console.log('✅ Address1 input found:', address1Input);

    // Check if addressValidation module is available
    if (!window.addressValidation) {
        console.error('❌ Address validation module not available');
        return;
    }

    console.log('✅ Address validation module available');

    // Check if Google Places API is loaded
    if (window.google && window.google.maps && window.google.maps.places) {
        console.log('✅ Google Places API is loaded');
    } else {
        console.warn('⚠️ Google Places API not loaded - will use demo mode');
    }

    // Setup autocomplete on the main address field only
    console.log('🔧 Calling setupAddressAutocomplete...');
    window.addressValidation.setupAddressAutocomplete(config.fields.address1, {
        minLength: 3,
        debounceMs: 300,
        maxResults: 5,
        types: ['address', 'postal_box'], // Include PO boxes
        componentRestrictions: { country: 'us' },
        onSelect: function (addressData) {
            console.log('📍 Address selected:', addressData.description);

            // Auto-populate other fields if enabled
            if (config.enableAutoPopulation) {
                populateAddressFields(addressData, config);
            }
        },
        onError: function (error) {
            console.error('❌ Address autocomplete error:', error);
        },
    });

    console.log('✅ setupAddressAutocomplete called');

    // Add PO Box detection if enabled
    if (config.enablePOBoxDetection) {
        setupPOBoxDetection(config);
    }

    // Add address validation if enabled
    if (config.enableAddressValidation) {
        setupAddressValidation(config);
    }

    console.log('✅ Structured address autocomplete setup complete');
}

// Auto-populate city, state, zip from Google Places details
async function populateAddressFields(addressData, config) {
    if (!addressData.place_id || addressData.place_id.startsWith('demo_')) {
        console.log('📍 Demo address selected, skipping auto-population');
        return;
    }

    try {
        // Use Places Details API to get complete address components
        const placeDetails = await getPlaceDetails(addressData.place_id);

        if (placeDetails && placeDetails.address_components) {
            fillAddressComponents(placeDetails.address_components, config);
        }
    } catch (error) {
        console.warn('Failed to get place details for auto-population:', error);
    }
}

// Get detailed place information using Places Details API
function getPlaceDetails(placeId) {
    return new Promise((resolve, reject) => {
        if (
            !window.google ||
            !window.google.maps ||
            !window.google.maps.places
        ) {
            reject(new Error('Google Places API not available'));
            return;
        }

        const service = new window.google.maps.places.PlacesService(
            document.createElement('div')
        );

        service.getDetails(
            {
                placeId: placeId,
                fields: ['address_components', 'formatted_address', 'types'],
            },
            (place, status) => {
                if (
                    status === window.google.maps.places.PlacesServiceStatus.OK
                ) {
                    resolve(place);
                } else {
                    reject(new Error(`Places Details API error: ${status}`));
                }
            }
        );
    });
}

// Fill address component fields from Google Places data
function fillAddressComponents(addressComponents, config) {
    const components = {
        city: '',
        state: '',
        zip: '',
    };

    // Parse Google Places address components
    addressComponents.forEach((component) => {
        const types = component.types;

        if (types.includes('locality')) {
            components.city = component.long_name;
        } else if (types.includes('administrative_area_level_1')) {
            components.state = component.short_name; // Use abbreviation for state
        } else if (types.includes('postal_code')) {
            components.zip = component.long_name;
        }
    });

    // Fill the form fields
    const cityField = document.getElementById(config.fields.city);
    const stateField = document.getElementById(config.fields.state);
    const zipField = document.getElementById(config.fields.zip);

    if (cityField && components.city) {
        cityField.value = components.city;
        triggerChangeEvent(cityField);
    }

    if (stateField && components.state) {
        stateField.value = components.state;
        triggerChangeEvent(stateField);
    }

    if (zipField && components.zip) {
        zipField.value = components.zip;
        triggerChangeEvent(zipField);
    }

    console.log('📍 Auto-populated address fields:', components);
}

// Detect and handle PO Box addresses
function setupPOBoxDetection(config) {
    const address1Input = document.getElementById(config.fields.address1);
    if (!address1Input) return;

    address1Input.addEventListener('input', function (e) {
        const value = e.target.value.toLowerCase();
        const isPOBox = /^(po box|p\.o\.? box|post office box)/i.test(value);

        if (isPOBox) {
            // Add visual indicator for PO Box
            address1Input.classList.add('po-box-detected');

            // Show helpful message
            showPOBoxMessage(address1Input);
        } else {
            address1Input.classList.remove('po-box-detected');
            hidePOBoxMessage(address1Input);
        }
    });
}

// Show PO Box message
function showPOBoxMessage(inputElement) {
    // Remove existing message
    hidePOBoxMessage(inputElement);

    const message = document.createElement('div');
    message.className = 'po-box-message';
    message.innerHTML = `
        <div style="color: #2196f3; font-size: 12px; margin-top: 5px;">
            📮 PO Box detected - City, State, and ZIP will need to be entered manually
        </div>
    `;

    inputElement.parentElement.appendChild(message);
}

// Hide PO Box message
function hidePOBoxMessage(inputElement) {
    const existingMessage =
        inputElement.parentElement.querySelector('.po-box-message');
    if (existingMessage) {
        existingMessage.remove();
    }
}

// Setup validation for complete structured address
function setupAddressValidation(config) {
    const form = document.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
        const validationResult = validateStructuredAddress(config);
        if (!validationResult.isValid) {
            e.preventDefault();
            showAddressValidationErrors(validationResult.errors);
        }
    });
}

// Validate structured address fields
function validateStructuredAddress(config) {
    const errors = [];

    // Get all field values
    const address1 = document
        .getElementById(config.fields.address1)
        ?.value?.trim();
    const city = document.getElementById(config.fields.city)?.value?.trim();
    const state = document.getElementById(config.fields.state)?.value?.trim();
    const zip = document.getElementById(config.fields.zip)?.value?.trim();

    // Validate required fields
    if (!address1) {
        errors.push({
            field: 'address1',
            message: 'Street address is required',
        });
    }

    if (!city) {
        errors.push({ field: 'city', message: 'City is required' });
    }

    if (!state) {
        errors.push({ field: 'state', message: 'State is required' });
    }

    if (!zip) {
        errors.push({ field: 'zip', message: 'ZIP code is required' });
    } else if (!/^\d{5}(-\d{4})?$/.test(zip)) {
        errors.push({
            field: 'zip',
            message: 'ZIP code must be in format 12345 or 12345-6789',
        });
    }

    return {
        isValid: errors.length === 0,
        errors: errors,
    };
}

// Show address validation errors
function showAddressValidationErrors(errors) {
    errors.forEach((error) => {
        const field = document.getElementById(
            STRUCTURED_ADDRESS_CONFIG.fields[error.field]
        );
        if (field) {
            // Add error styling
            field.classList.add('error');

            // Show error message
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.textContent = error.message;
            errorMessage.style.cssText =
                'color: #dc3545; font-size: 12px; margin-top: 2px;';

            // Remove existing error message
            const existing =
                field.parentElement.querySelector('.error-message');
            if (existing) existing.remove();

            field.parentElement.appendChild(errorMessage);
        }
    });
}

// Utility function to trigger change events
function triggerChangeEvent(element) {
    const event = new Event('change', { bubbles: true });
    element.dispatchEvent(event);
}

// CSS for enhanced address styling
const addressStyling = `
    .po-box-detected {
        border-color: #2196f3 !important;
        background-color: #f8f9ff !important;
    }
    
    .error {
        border-color: #dc3545 !important;
        background-color: #fff5f5 !important;
    }
    
    .form-row.address-row {
        display: flex;
        gap: 15px;
    }
    
    .form-row.address-row .form-group {
        flex: 1;
    }
    
    .form-row.address-row .form-group:first-child {
        flex: 2; /* City takes more space */
    }
    
    @media (max-width: 768px) {
        .form-row.address-row {
            flex-direction: column;
            gap: 10px;
        }
    }
`;

// Inject CSS
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = addressStyling;
    document.head.appendChild(style);
}

// Export enhanced functions
if (typeof window !== 'undefined') {
    window.structuredAddress = {
        setupStructuredAddressAutocomplete,
        validateStructuredAddress,
        populateAddressFields,
    };
}
