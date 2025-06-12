// Page Transitions Manager
// Centralized page transition system for consistent fade in/out effects

class PageTransitions {
    constructor() {
        // Configuration - change these values to adjust all page transitions
        this.config = {
            duration: 450, // Transition duration in milliseconds
            easing: 'ease-in-out', // CSS easing function
            fadeOutClass: 'page-transition-out',
            fadeInClass: 'page-fade-in',
            legacyFadeOutClass: 'fade-out', // Keep for backward compatibility
        };

        this.isTransitioning = false;
        this.init();
    }

    init() {
        // Apply fade-in animation on page load
        this.fadeIn();

        // Setup automatic fade navigation for all links
        this.setupNavigationLinks();

        // Setup programmatic navigation listeners
        this.setupProgrammaticNavigation();

        // Handle browser back/forward navigation
        this.setupBrowserNavigation();
    }

    // Fade in the current page
    fadeIn() {
        // Remove any existing transition classes
        document.body.classList.remove(
            this.config.fadeOutClass,
            this.config.legacyFadeOutClass
        );

        // Force reflow to ensure class removal takes effect
        document.body.offsetHeight;

        // Apply fade-in class
        document.body.classList.add(this.config.fadeInClass);

        // Remove fade-in class after animation completes
        setTimeout(() => {
            document.body.classList.remove(this.config.fadeInClass);
        }, this.config.duration);
    }

    // Fade out and navigate to new page
    fadeOut(destination, delay = 0) {
        if (this.isTransitioning) return false;

        this.isTransitioning = true;

        setTimeout(() => {
            // Apply fade-out class
            document.body.classList.add(this.config.fadeOutClass);

            // Navigate after transition completes
            setTimeout(() => {
                window.location.href = destination;
            }, this.config.duration);
        }, delay);

        return true;
    }

    // Setup automatic fade transitions for navigation links
    setupNavigationLinks() {
        // Handle all internal navigation links
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;

            const href = link.getAttribute('href');

            // Skip if no href, external link, hash link, or special attributes
            if (
                !href ||
                href.startsWith('http') ||
                href.startsWith('mailto:') ||
                href.startsWith('tel:') ||
                href === '#' ||
                link.hasAttribute('download') ||
                link.hasAttribute('data-no-transition') ||
                link.target === '_blank'
            ) {
                return;
            }

            // Skip if link has fade-nav class (handled by existing navigation.js)
            if (link.classList.contains('fade-nav')) {
                // Actually, let's handle fade-nav links too for consistency
                e.preventDefault();
                this.fadeOut(href);
                return;
            }

            // Prevent default navigation
            e.preventDefault();

            // Perform transition
            this.fadeOut(href);
        });
    }

    // Setup programmatic navigation (for form submissions, redirects, etc.)
    setupProgrammaticNavigation() {
        // Intercept form submissions for transition effects
        document.addEventListener('submit', (e) => {
            const form = e.target;
            if (form.hasAttribute('data-no-transition')) return;

            // Add a small delay to allow form processing feedback
            const submitBtn = form.querySelector(
                'button[type="submit"], input[type="submit"]'
            );
            if (submitBtn && !submitBtn.disabled) {
                // Don't interfere with form submission, just add visual feedback
                setTimeout(() => {
                    if (!this.isTransitioning) {
                        document.body.classList.add(this.config.fadeOutClass);
                    }
                }, 100);
            }
        });
    }

    // Handle browser navigation (back/forward buttons)
    setupBrowserNavigation() {
        window.addEventListener('pageshow', (e) => {
            // Reset transition state on page show (handles back/forward navigation)
            this.isTransitioning = false;

            // If page was loaded from cache, re-apply fade-in
            if (e.persisted) {
                this.fadeIn();
            }
        });

        window.addEventListener('pagehide', () => {
            // Reset transition state
            this.isTransitioning = false;
        });
    }

    // Public API methods for manual control

    // Navigate with transition
    navigateTo(url, delay = 0) {
        return this.fadeOut(url, delay);
    }

    // Set custom configuration
    configure(options) {
        this.config = { ...this.config, ...options };

        // Update CSS custom properties
        document.documentElement.style.setProperty(
            '--page-transition-duration',
            `${this.config.duration}ms`
        );
        document.documentElement.style.setProperty(
            '--page-transition-easing',
            this.config.easing
        );
    }

    // Force fade-in (useful for dynamic content)
    refresh() {
        this.fadeIn();
    }

    // Check if currently transitioning
    isInTransition() {
        return this.isTransitioning;
    }
}

// Create global instance
const pageTransitions = new PageTransitions();

// Expose to global scope for external use
window.pageTransitions = pageTransitions;

// Legacy compatibility
window.setupFadeNavigation = () => {
    console.warn(
        'setupFadeNavigation() is deprecated. Page transitions are now automatic.'
    );
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PageTransitions;
}
