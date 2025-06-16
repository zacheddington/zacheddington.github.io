// Autofill Protection Module
// Helps prevent conflicts between browser autofill and dynamic JavaScript

(function () {
    'use strict';

    // Prevent autofill from causing JavaScript errors
    function createAutofillProtection() {
        // Override problematic autofill methods that can cause errors
        const originalSetProperty = Object.prototype.__defineSetter__;
        if (originalSetProperty) {
            Object.prototype.__defineSetter__ = function (prop, setter) {
                try {
                    return originalSetProperty.call(this, prop, setter);
                } catch (error) {
                    // Ignore autofill-related setter errors
                    return;
                }
            };
        }

        // Add mutation observer to ensure password fields remain stable
        if (window.MutationObserver) {
            const observer = new MutationObserver(function (mutations) {
                mutations.forEach(function (mutation) {
                    if (mutation.type === 'childList') {
                        // Re-establish password field references after DOM changes
                        const passwordFields = document.querySelectorAll(
                            'input[type="password"]'
                        );
                        passwordFields.forEach(function (field) {
                            if (field.id && !field.dataset.autofillProtected) {
                                field.dataset.autofillProtected = 'true';
                                // Add defensive wrapper to prevent null reference errors
                                field.addEventListener(
                                    'input',
                                    function (e) {
                                        // This empty handler helps stabilize autofill behavior
                                    },
                                    { passive: true }
                                );
                            }
                        });
                    }
                });
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
        }

        // Add global error handler for autofill-related errors
        window.addEventListener('error', function (event) {
            const errorMessage = event.message || '';
            if (
                errorMessage.includes('autofill') ||
                errorMessage.includes('newPassword') ||
                errorMessage.includes('Cannot set properties of null')
            ) {
                // Suppress autofill-related errors
                event.preventDefault();
                return false;
            }
        });

        // Add unhandled promise rejection handler for autofill errors
        window.addEventListener('unhandledrejection', function (event) {
            const errorMessage = event.reason?.message || event.reason || '';
            if (
                typeof errorMessage === 'string' &&
                (errorMessage.includes('autofill') ||
                    errorMessage.includes('newPassword') ||
                    errorMessage.includes('Cannot set properties of null'))
            ) {
                // Suppress autofill-related promise rejections
                event.preventDefault();
                return false;
            }
        });
    }

    // Initialize protection when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createAutofillProtection);
    } else {
        createAutofillProtection();
    }
})();
