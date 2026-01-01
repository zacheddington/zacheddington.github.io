// Modal Manager
// Handles all modal dialogs and feedback messages

const modalManager = {
  isShowingModal: false,
  showModal: function (type, message, forceShow = false, options = {}) {
    if (this.isShowingModal && !forceShow) {
      return false;
    }

    this.isShowingModal = true;

    // Remove any existing modal
    const existingModal = document.getElementById("feedbackModal");
    if (existingModal) {
      existingModal.remove();
    }

    // Determine if this is a redirecting modal (no close button needed)
    const isRedirectModal = options.redirect || type === "success-redirect";

    // Determine modal title for accessibility
    const modalTitle =
      type === "success" || type === "success-redirect"
        ? "Success"
        : type === "error"
        ? "Error"
        : "Information";

    // Create modal element with ARIA attributes for accessibility
    const modal = document.createElement("div");
    modal.id = "feedbackModal";
    modal.className = `modal ${type}`;
    modal.tabIndex = "-1"; // Make modal focusable
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "modal-title");
    modal.setAttribute("aria-describedby", "modal-message");

    // Build footer content based on whether this redirects
    const footerContent = isRedirectModal
      ? '<div class="modal-hint" role="status" aria-live="polite">Redirecting...</div>'
      : `<button class="modal-btn" onclick="window.modalManager.closeModal()" aria-label="Close dialog">OK</button>
               <div class="modal-hint">Press Enter or Escape to close</div>`;

    modal.innerHTML = `
            <div class="modal-content" role="document">
                <div class="modal-header">
                    <h3 id="modal-title">${
                      type === "success" || type === "success-redirect"
                        ? "✅ Success"
                        : type === "error"
                        ? "❌ Error"
                        : "ℹ️ Information"
                    }</h3>
                </div>
                <div class="modal-body">
                    <p id="modal-message">${message.replace(/\n/g, "<br>")}</p>
                </div>                
                <div class="modal-footer">
                    ${footerContent}
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // Prevent body scrolling
    document.body.classList.add("modal-open");

    // Style the modal based on type
    setTimeout(() => {
      const modalElement = document.getElementById("feedbackModal");
      if (modalElement) {
        // Force modal to center in viewport - higher z-index than sidebar
        modalElement.style.display = "flex";
        modalElement.style.position = "fixed";
        modalElement.style.top = "0";
        modalElement.style.left = "0";
        modalElement.style.width = "100vw";
        modalElement.style.height = "100vh";
        modalElement.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        modalElement.style.justifyContent = "center";
        modalElement.style.alignItems = "center";
        modalElement.style.zIndex = "99999";
        modalElement.style.margin = "0";
        modalElement.style.padding = "0";

        // Ensure it's above everything else with higher z-index
        modalElement.style.setProperty("position", "fixed", "important");
        modalElement.style.setProperty("z-index", "99999", "important");
        modalElement.style.setProperty("display", "flex", "important");
        modalElement.style.setProperty("width", "100vw", "important");
        modalElement.style.setProperty("height", "100vh", "important");

        const modalContent = modalElement.querySelector(".modal-content");
        if (modalContent) {
          // Use theme-aware colors for dark mode support
          const isDarkMode =
            window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches;
          modalContent.style.backgroundColor = isDarkMode ? "#1a1a1a" : "white";
          modalContent.style.color = isDarkMode ? "#e0e0e0" : "#333333";
          modalContent.style.padding = "2rem";
          modalContent.style.borderRadius = "8px";
          modalContent.style.maxWidth = "500px";
          modalContent.style.width = "90%";
          modalContent.style.maxHeight = "80vh";
          modalContent.style.overflowY = "auto";
          modalContent.style.boxShadow = isDarkMode
            ? "0 4px 20px rgba(0, 0, 0, 0.6)"
            : "0 4px 20px rgba(0, 0, 0, 0.3)";
          modalContent.style.border = isDarkMode ? "1px solid #424242" : "none";
        }

        // Type-specific styling
        const header = modalElement.querySelector(".modal-header h3");
        const isDarkModeHeader =
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (header) {
          if (type === "success") {
            header.style.color = isDarkModeHeader ? "#81c784" : "#155724";
          } else if (type === "error") {
            header.style.color = isDarkModeHeader ? "#ef9a9a" : "#721c24";
          } else {
            header.style.color = isDarkModeHeader ? "#64b5f6" : "#0c5460";
          }
        }

        // Button styling
        const button = modalElement.querySelector(".modal-btn");
        if (button) {
          button.style.padding = "0.75rem 1.5rem";
          button.style.border = "none";
          button.style.borderRadius = "4px";
          button.style.cursor = "pointer";
          button.style.fontSize = "1rem";
          button.style.fontWeight = "500";

          if (type === "success") {
            button.style.backgroundColor = "#28a745";
            button.style.color = "white";
          } else if (type === "error") {
            button.style.backgroundColor = "#dc3545";
            button.style.color = "white";
          } else {
            button.style.backgroundColor = "#17a2b8";
            button.style.color = "white";
          }
        }

        // Auto-apply proper background click handling to all modals
        setTimeout(() => {
          addModalBackgroundClickHandler(modal, () => {
            this.closeModal();
          });
        }, 0);

        // Focus the modal for accessibility
        modalElement.focus(); // Add keyboard event listener after modal is set up (only if not a redirect modal)
        if (!isRedirectModal) {
          modalElement.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === "Escape") {
              this.closeModal();
            }
          });
        }
      }
    }, 10);
    if (type === "success" || type === "success-redirect") {
      // Only redirect to welcome page if we're not on admin or patient management pages
      const isAdminPage = window.location.pathname.includes("/admin/");
      const isPatientManagePage = window.location.pathname.includes(
        "/patients/manage-patients/"
      );
      const isPatientCreatePage = window.location.pathname.includes(
        "/patients/create-patient/"
      );
      if (!isAdminPage && !isPatientManagePage && !isPatientCreatePage) {
        // This is a redirecting modal, so make sure it doesn't have close button
        const modalFooter = modal.querySelector(".modal-footer");
        if (modalFooter) {
          modalFooter.innerHTML =
            '<div class="modal-hint" style="font-size: 0.9rem; color: #666; margin-top: 1rem; text-align: center;">Redirecting to Welcome page...</div>';
        }

        setTimeout(() => {
          document.body.classList.add("fade-out");
          setTimeout(() => {
            window.location.href = "../welcome/";
          }, 450); // FADE_DURATION
        }, 2000);
      } else {
        // On admin or patient management pages, require manual close
        // No auto-close - user must click OK or press Enter/Escape
      }
    }

    return true;
  },
  closeModal: function () {
    const modalElement = document.getElementById("feedbackModal");
    if (modalElement) {
      modalElement.remove();
      this.isShowingModal = false;

      // Reset all input modal states
      const inputs = [
        "patientNumber",
        "firstName",
        "middleName",
        "lastName",
        "address",
      ];
      inputs.forEach((id) => {
        const input = document.getElementById(id);
        if (input) input.dataset.showingModal = "false";
      });
    } else {
      this.isShowingModal = false;
    }

    // Remove body scroll prevention
    document.body.classList.remove("modal-open");
  },
  /**
   * Show logout confirmation modal with dark mode support
   * @param {Function} onConfirm - Callback when user confirms logout
   * @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled
   */
  showLogoutConfirmation: function (onConfirm) {
    return this.showLogoutModal(onConfirm);
  },
  showConfirmModal: function (title, message, onConfirm, onCancel) {
    if (this.isShowingModal) {
      return false;
    }

    this.isShowingModal = true;

    // Remove any existing modal
    const existingModal = document.getElementById("feedbackModal");
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal element
    const modal = document.createElement("div");
    modal.id = "feedbackModal";
    modal.className = "modal confirm-modal";
    modal.tabIndex = "-1";
    modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title || "⚠️ Confirm Action"}</h3>
                </div>
                <div class="modal-body">
                    <p>${message.replace(/\n/g, "<br>")}</p>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn cancel" id="modalCancel">Cancel</button>
                    <button class="modal-btn confirm" id="modalConfirm">Confirm</button>
                    <div class="modal-hint" style="font-size: 0.8rem; color: #666; margin-top: 0.5rem; text-align: center;">Press Enter to confirm, Escape to cancel</div>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // Prevent body scrolling
    document.body.classList.add("modal-open");

    // Style the modal
    setTimeout(() => {
      const modalElement = document.getElementById("feedbackModal");
      if (modalElement) {
        // Force modal to center in viewport
        modalElement.style.display = "flex";
        modalElement.style.position = "fixed";
        modalElement.style.top = "0";
        modalElement.style.left = "0";
        modalElement.style.width = "100vw";
        modalElement.style.height = "100vh";
        modalElement.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        modalElement.style.justifyContent = "center";
        modalElement.style.alignItems = "center";
        modalElement.style.zIndex = "10000";
        modalElement.style.margin = "0";
        modalElement.style.padding = "0";

        // Ensure it's above everything else with !important
        modalElement.style.setProperty("position", "fixed", "important");
        modalElement.style.setProperty("z-index", "10000", "important");
        modalElement.style.setProperty("display", "flex", "important");
        modalElement.style.setProperty("width", "100vw", "important");
        modalElement.style.setProperty("height", "100vh", "important");

        const modalContent = modalElement.querySelector(".modal-content");
        // Use theme-aware colors for dark mode support
        const isDarkMode =
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (modalContent) {
          modalContent.style.backgroundColor = isDarkMode ? "#1a1a1a" : "white";
          modalContent.style.color = isDarkMode ? "#e0e0e0" : "#333333";
          modalContent.style.padding = "2rem";
          modalContent.style.borderRadius = "8px";
          modalContent.style.maxWidth = "500px";
          modalContent.style.width = "90%";
          modalContent.style.maxHeight = "80vh";
          modalContent.style.overflowY = "auto";
          modalContent.style.boxShadow = isDarkMode
            ? "0 4px 20px rgba(0, 0, 0, 0.6)"
            : "0 4px 20px rgba(0, 0, 0, 0.3)";
          modalContent.style.border = isDarkMode ? "1px solid #424242" : "none";
        }

        // Update hint text color for dark mode
        const hintText = modalElement.querySelector(".modal-hint");
        if (hintText) {
          hintText.style.color = isDarkMode ? "#9e9e9e" : "#666";
        }

        // Style buttons
        const cancelBtn = modalElement.querySelector("#modalCancel");
        const confirmBtn = modalElement.querySelector("#modalConfirm");

        if (cancelBtn) {
          cancelBtn.style.padding = "0.75rem 1.5rem";
          cancelBtn.style.border = "1px solid #6c757d";
          cancelBtn.style.borderRadius = "4px";
          cancelBtn.style.cursor = "pointer";
          cancelBtn.style.fontSize = "1rem";
          cancelBtn.style.fontWeight = "500";
          cancelBtn.style.backgroundColor = "#6c757d";
          cancelBtn.style.color = "white";
          cancelBtn.style.marginRight = "1rem";
        }

        if (confirmBtn) {
          confirmBtn.style.padding = "0.75rem 1.5rem";
          confirmBtn.style.border = "none";
          confirmBtn.style.borderRadius = "4px";
          confirmBtn.style.cursor = "pointer";
          confirmBtn.style.fontSize = "1rem";
          confirmBtn.style.fontWeight = "500";
          confirmBtn.style.backgroundColor = "#dc3545";
          confirmBtn.style.color = "white";
        }
      }

      // Add event handlers
      const confirmHandler = () => {
        this.closeModal();
        if (onConfirm) onConfirm();
      };

      const cancelHandler = () => {
        this.closeModal();
        if (onCancel) onCancel();
      };

      document
        .getElementById("modalConfirm")
        .addEventListener("click", confirmHandler);
      document
        .getElementById("modalCancel")
        .addEventListener("click", cancelHandler);

      // Keyboard support
      modalElement.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          confirmHandler();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancelHandler();
        }
      });

      // Add background click handler
      addModalBackgroundClickHandler(modalElement, cancelHandler);

      // Focus the modal for keyboard navigation
      modalElement.focus();
    }, 10);

    return true;
  },

  /**
   * Show logout confirmation modal with dark mode support
   * Unified function - showLogoutConfirmation is an alias to this
   * @param {Function} confirmCallback - Callback when user confirms logout
   * @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled
   */
  showLogoutModal: function (confirmCallback) {
    return new Promise((resolve) => {
      // Prevent duplicate modals
      const existingModal = document.querySelector(
        ".modal-overlay, .logout-modal"
      );
      if (existingModal) {
        return resolve(false);
      }

      // Detect dark mode
      const isDarkMode =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;

      const logoutModal = document.createElement("div");
      logoutModal.className = "modal-overlay";
      logoutModal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3>🚪 Confirm Logout</h3>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to log out?</p>
            <p class="modal-hint">You will be redirected to the login page and will need to sign in again to access the system.</p>
          </div>
          <div class="modal-footer">
            <button class="modal-btn cancel" id="cancelLogout">Cancel</button>
            <button class="modal-btn confirm" id="confirmLogout">Logout</button>
          </div>
        </div>
      `;
      document.body.appendChild(logoutModal);

      // Prevent body scrolling
      document.body.classList.add("modal-open");

      // Force modal to center in viewport with inline styles
      logoutModal.style.display = "flex";
      logoutModal.style.position = "fixed";
      logoutModal.style.top = "0";
      logoutModal.style.left = "0";
      logoutModal.style.width = "100vw";
      logoutModal.style.height = "100vh";
      logoutModal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
      logoutModal.style.justifyContent = "center";
      logoutModal.style.alignItems = "center";
      logoutModal.style.zIndex = "99999";
      logoutModal.style.margin = "0";
      logoutModal.style.padding = "0";

      // Ensure it's above everything else
      logoutModal.style.setProperty("position", "fixed", "important");
      logoutModal.style.setProperty("z-index", "99999", "important");
      logoutModal.style.setProperty("display", "flex", "important");

      // Style modal content with dark mode support
      const modalContent = logoutModal.querySelector(".modal-content");
      if (modalContent) {
        modalContent.style.backgroundColor = isDarkMode ? "#1a1a1a" : "white";
        modalContent.style.color = isDarkMode ? "#e0e0e0" : "#333333";
        modalContent.style.padding = "2rem";
        modalContent.style.borderRadius = "8px";
        modalContent.style.maxWidth = "450px";
        modalContent.style.width = "90%";
        modalContent.style.boxShadow = isDarkMode
          ? "0 4px 20px rgba(0, 0, 0, 0.6)"
          : "0 4px 20px rgba(0, 0, 0, 0.3)";
        modalContent.style.border = isDarkMode ? "1px solid #424242" : "none";
      }

      // Style hint text
      const hintText = logoutModal.querySelector(".modal-hint");
      if (hintText) {
        hintText.style.color = isDarkMode ? "#9e9e9e" : "#666";
        hintText.style.fontSize = "0.9rem";
        hintText.style.marginTop = "1rem";
      }

      // Focus on the modal for accessibility
      logoutModal.focus();

      // Set up event handlers
      const cancelHandler = () => {
        document.body.removeChild(logoutModal);
        document.body.classList.remove("modal-open");
        resolve(false);
      };

      const confirmHandler = () => {
        document.body.removeChild(logoutModal);
        document.body.classList.remove("modal-open");
        if (confirmCallback) confirmCallback();
        resolve(true);
      };

      document
        .getElementById("cancelLogout")
        .addEventListener("click", cancelHandler);
      document
        .getElementById("confirmLogout")
        .addEventListener("click", confirmHandler);

      // Keyboard support
      logoutModal.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          cancelHandler();
        } else if (e.key === "Enter") {
          confirmHandler();
        }
      });

      // Close on background click
      addModalBackgroundClickHandler(logoutModal, cancelHandler);
    });
  },
};

/**
 * Add proper modal background click handling that only closes when both
 * mousedown and click happen on the modal background (prevents drag-to-close)
 */
function addModalBackgroundClickHandler(modal, closeHandler) {
  let mouseDownTarget = null;

  modal.addEventListener("mousedown", function (e) {
    mouseDownTarget = e.target;
  });

  modal.addEventListener("click", function (e) {
    // Only close if both mousedown and click happened on the modal background
    if (e.target === modal && mouseDownTarget === modal) {
      closeHandler();
    }
    mouseDownTarget = null; // Reset after handling
  });
}

/**
 * Automatically initialize background click handlers for all existing modals on the page
 * This ensures that static HTML modals also get the proper background click behavior
 */
function initializeExistingModals() {
  // Find all elements with class 'modal' that don't already have handlers
  const modals = document.querySelectorAll(".modal");

  modals.forEach((modal) => {
    // Skip if already has background click handler
    if (modal.hasAttribute("data-background-click-initialized")) {
      return;
    }

    // Look for a close function based on modal ID
    const modalId = modal.id;
    let closeHandler = null;

    if (modalId) {
      // Try to find a corresponding close function
      const closeFunction =
        window[`close${modalId.charAt(0).toUpperCase() + modalId.slice(1)}`];
      if (typeof closeFunction === "function") {
        closeHandler = closeFunction;
      }

      // Common patterns for close function names
      if (!closeHandler) {
        const patterns = [
          `close${modalId}`,
          `hide${modalId}`,
          `dismiss${modalId}`,
        ];

        for (const pattern of patterns) {
          if (window[pattern] && typeof window[pattern] === "function") {
            closeHandler = window[pattern];
            break;
          }
        }
      }
    }

    // If we found a close handler, add background click behavior
    if (closeHandler) {
      addModalBackgroundClickHandler(modal, closeHandler);
      modal.setAttribute("data-background-click-initialized", "true");
    }
  });
}

// Make the initialization function globally available
window.initializeExistingModals = initializeExistingModals;

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeExistingModals);
} else {
  // DOM is already ready
  initializeExistingModals();
}

// Make modal functions globally available
window.showModal = modalManager.showModal.bind(modalManager);
window.closeModal = modalManager.closeModal.bind(modalManager);
window.modalManager = modalManager;

// Make modal utility function globally available
window.addModalBackgroundClickHandler = addModalBackgroundClickHandler;
window.showLogoutModal = modalManager.showLogoutModal.bind(modalManager);
