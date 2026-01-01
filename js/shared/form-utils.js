// Form Submission Utility
// Prevents duplicate submissions and provides consistent loading states

/**
 * FormSubmissionGuard - Prevents duplicate form submissions
 * Use this to wrap any form submission handler
 */
class FormSubmissionGuard {
  constructor() {
    this.activeSubmissions = new Map();
  }

  /**
   * Check if a form is currently being submitted
   * @param {string} formId - Unique identifier for the form
   * @returns {boolean} - True if form is being submitted
   */
  isSubmitting(formId) {
    return this.activeSubmissions.get(formId) === true;
  }

  /**
   * Mark a form as being submitted
   * @param {string} formId - Unique identifier for the form
   */
  startSubmission(formId) {
    this.activeSubmissions.set(formId, true);
  }

  /**
   * Mark a form submission as complete
   * @param {string} formId - Unique identifier for the form
   */
  endSubmission(formId) {
    this.activeSubmissions.set(formId, false);
  }

  /**
   * Execute a form submission with duplicate prevention
   * @param {string} formId - Unique identifier for the form
   * @param {HTMLButtonElement} submitButton - The submit button element
   * @param {string} loadingText - Text to show while loading
   * @param {Function} submitHandler - Async function to execute
   * @returns {Promise<any>} - Result of the submission
   */
  async execute(formId, submitButton, loadingText, submitHandler) {
    // Prevent duplicate submissions
    if (this.isSubmitting(formId)) {
      console.warn(`Form ${formId} is already being submitted`);
      return null;
    }

    this.startSubmission(formId);

    const originalText = submitButton?.textContent || "Submit";
    const originalDisabled = submitButton?.disabled || false;

    try {
      // Set loading state
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = loadingText;
        submitButton.setAttribute("aria-busy", "true");
      }

      // Execute the submission handler
      const result = await submitHandler();
      return result;
    } finally {
      // Always restore button state and end submission
      this.endSubmission(formId);

      if (submitButton) {
        submitButton.disabled = originalDisabled;
        submitButton.textContent = originalText;
        submitButton.removeAttribute("aria-busy");
      }
    }
  }
}

/**
 * Set button loading state
 * @param {HTMLButtonElement} button - Button element
 * @param {boolean} isLoading - Whether to show loading state
 * @param {string} loadingText - Text to show when loading
 */
function setButtonLoading(button, isLoading, loadingText = "Loading...") {
  if (!button) return;

  if (isLoading) {
    // Store original text if not already stored
    if (!button.dataset.originalText) {
      button.dataset.originalText = button.textContent;
    }
    button.disabled = true;
    button.textContent = loadingText;
    button.setAttribute("aria-busy", "true");
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalText || "Submit";
    button.removeAttribute("aria-busy");
    delete button.dataset.originalText;
  }
}

/**
 * Disable all form inputs during submission
 * @param {HTMLFormElement} form - Form element
 * @param {boolean} disable - Whether to disable inputs
 */
function setFormDisabled(form, disable) {
  if (!form) return;

  const inputs = form.querySelectorAll("input, select, textarea, button");
  inputs.forEach((input) => {
    if (disable) {
      input.dataset.wasDisabled = input.disabled ? "true" : "false";
      input.disabled = true;
    } else {
      // Only re-enable if it wasn't originally disabled
      if (input.dataset.wasDisabled !== "true") {
        input.disabled = false;
      }
      delete input.dataset.wasDisabled;
    }
  });
}

/**
 * Debounce function to prevent rapid repeated calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait = 300) {
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
 * Throttle function to limit call frequency
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum time between calls in milliseconds
 * @returns {Function} - Throttled function
 */
function throttle(func, limit = 300) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Create global instance
const formGuard = new FormSubmissionGuard();

// Export for use in other modules
window.formUtils = {
  FormSubmissionGuard,
  formGuard,
  setButtonLoading,
  setFormDisabled,
  debounce,
  throttle,
};
