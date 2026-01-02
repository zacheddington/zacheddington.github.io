/**
 * String Utilities Module
 * Common string manipulation and formatting functions
 * Centralizes duplicate utilities from page-specific modules
 */
console.log("[DEBUG] string-utils.js: Script starting to load");

/**
 * Escape HTML special characters to prevent XSS attacks
 * Uses DOM-based escaping for reliable encoding
 * @param {string} text - Text to escape
 * @returns {string} - HTML-escaped text
 */
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
console.log(
  "[DEBUG] string-utils.js: escapeHtml function defined, typeof escapeHtml =",
  typeof escapeHtml
);

/**
 * Escape JavaScript string special characters
 * Useful for building dynamic scripts safely
 * @param {string} text - Text to escape
 * @returns {string} - JavaScript-safe string
 */
function escapeJavaScript(text) {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

/**
 * Format phone number for display
 * Converts 10-digit number to (XXX) XXX-XXXX format
 * @param {string} phone - Phone number (can contain non-digits)
 * @returns {string} - Formatted phone number
 */
function formatPhoneNumber(phone) {
  if (!phone) return "";

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // Format as (XXX) XXX-XXXX for 10 digit numbers
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // For other lengths, return original
  return phone;
}

/**
 * Truncate text to specified length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} - Truncated text with ellipsis if needed
 */
function truncateText(text, maxLength = 50) {
  if (!text || text.length <= maxLength) return text || "";
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Capitalize first letter of a string
 * @param {string} text - Text to capitalize
 * @returns {string} - Text with first letter capitalized
 */
function capitalizeFirst(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Convert string to title case
 * @param {string} text - Text to convert
 * @returns {string} - Title case text
 */
function toTitleCase(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Strip all HTML tags from string
 * @param {string} html - HTML string
 * @returns {string} - Plain text
 */
function stripHtml(html) {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

/**
 * Generate a simple slug from text
 * @param {string} text - Text to convert
 * @returns {string} - URL-safe slug
 */
function slugify(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Export for use in other modules
window.stringUtils = {
  escapeHtml,
  escapeJavaScript,
  formatPhoneNumber,
  truncateText,
  capitalizeFirst,
  toTitleCase,
  stripHtml,
  slugify,
};
console.log(
  "[DEBUG] string-utils.js: Finished loading. window.stringUtils =",
  window.stringUtils
);
