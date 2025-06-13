// Modal Manager
// Handles all modal dialogs and feedback messages

const modalManager = {
    isShowingModal: false,
    showModal: function (type, message, forceShow = false) {
        if (this.isShowingModal && !forceShow) {
            console.log('Modal already showing, skipping new modal');
            return false;
        }

        this.isShowingModal = true;

        // Remove any existing modal
        const existingModal = document.getElementById('feedbackModal');
        if (existingModal) {
            existingModal.remove();
        } // Create modal element
        const modal = document.createElement('div');
        modal.id = 'feedbackModal';
        modal.className = `modal ${type}`;
        modal.tabIndex = '-1'; // Make modal focusable
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${
                        type === 'success'
                            ? '✅ Success'
                            : type === 'error'
                            ? '❌ Error'
                            : 'ℹ️ Information'
                    }</h3>
                </div>
                <div class="modal-body">
                    <p>${message.replace(/\n/g, '<br>')}</p>
                </div>                <div class="modal-footer">
                    <button class="modal-btn" onclick="window.modalManager.closeModal()">OK</button>
                    <div class="modal-hint" style="font-size: 0.8rem; color: #666; margin-top: 0.5rem; text-align: center;">Press Enter or Escape to close</div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Prevent body scrolling
        document.body.classList.add('modal-open');

        // Style the modal based on type
        setTimeout(() => {
            const modalElement = document.getElementById('feedbackModal');
            if (modalElement) {
                // Force modal to center in viewport
                modalElement.style.display = 'flex';
                modalElement.style.position = 'fixed';
                modalElement.style.top = '0';
                modalElement.style.left = '0';
                modalElement.style.width = '100%';
                modalElement.style.height = '100%';
                modalElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                modalElement.style.justifyContent = 'center';
                modalElement.style.alignItems = 'center';
                modalElement.style.zIndex = '10000';
                modalElement.style.margin = '0';
                modalElement.style.padding = '0';

                // Ensure it's above everything else
                modalElement.style.setProperty(
                    'position',
                    'fixed',
                    'important'
                );
                modalElement.style.setProperty('z-index', '10000', 'important');
                modalElement.style.setProperty('display', 'flex', 'important');

                const modalContent =
                    modalElement.querySelector('.modal-content');
                if (modalContent) {
                    modalContent.style.backgroundColor = 'white';
                    modalContent.style.padding = '2rem';
                    modalContent.style.borderRadius = '8px';
                    modalContent.style.maxWidth = '500px';
                    modalContent.style.width = '90%';
                    modalContent.style.maxHeight = '80vh';
                    modalContent.style.overflowY = 'auto';
                    modalContent.style.boxShadow =
                        '0 4px 20px rgba(0, 0, 0, 0.3)';
                }

                // Type-specific styling
                const header = modalElement.querySelector('.modal-header h3');
                if (header) {
                    if (type === 'success') {
                        header.style.color = '#155724';
                    } else if (type === 'error') {
                        header.style.color = '#721c24';
                    } else {
                        header.style.color = '#0c5460';
                    }
                }

                // Button styling
                const button = modalElement.querySelector('.modal-btn');
                if (button) {
                    button.style.padding = '0.75rem 1.5rem';
                    button.style.border = 'none';
                    button.style.borderRadius = '4px';
                    button.style.cursor = 'pointer';
                    button.style.fontSize = '1rem';
                    button.style.fontWeight = '500';

                    if (type === 'success') {
                        button.style.backgroundColor = '#28a745';
                        button.style.color = 'white';
                    } else if (type === 'error') {
                        button.style.backgroundColor = '#dc3545';
                        button.style.color = 'white';
                    } else {
                        button.style.backgroundColor = '#17a2b8';
                        button.style.color = 'white';
                    }
                } // Focus the modal for accessibility
                modalElement.focus();

                // Add keyboard event listener after modal is set up
                modalElement.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                        this.closeModal();
                    }
                });
            }
        }, 10);

        if (type === 'success') {
            // Only redirect to welcome page if we're not on the admin page
            const isAdminPage = window.location.pathname.includes('/admin/');
            if (!isAdminPage) {
                setTimeout(() => {
                    document.body.classList.add('fade-out');
                    setTimeout(() => {
                        window.location.href = '../welcome/';
                    }, 450); // FADE_DURATION
                }, 2000);
            } else {
                // On admin pages, auto-hide success modal after 4 seconds
                setTimeout(() => {
                    this.closeModal();
                }, 4000);
            }
        }

        return true;
    },
    closeModal: function () {
        const modalElement = document.getElementById('feedbackModal');
        if (modalElement) {
            modalElement.remove();
            this.isShowingModal = false;

            // Reset all input modal states for EEG form
            const inputs = [
                'patientNumber',
                'firstName',
                'middleName',
                'lastName',
                'address',
            ];
            inputs.forEach((id) => {
                const input = document.getElementById(id);
                if (input) input.dataset.showingModal = 'false';
            });
        } else {
            this.isShowingModal = false;
        }

        // Remove body scroll prevention
        document.body.classList.remove('modal-open');
    },
    showLogoutConfirmation: function (onConfirm) {
        return new Promise((resolve) => {
            // Prevent duplicate modals
            const existingModal = document.querySelector('.modal-overlay');
            if (existingModal) {
                return resolve(false);
            }

            const logoutModal = document.createElement('div');
            logoutModal.className = 'modal-overlay';
            logoutModal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>🚪 Confirm Logout</h3>
                    </div>
                    <div class="modal-body">
                        <p>Are you sure you want to log out?</p>
                        <p style="color: #666; font-size: 0.9rem; margin-top: 1rem;">You will be redirected to the login page and will need to sign in again to access the system.</p>
                    </div>
                    <div class="modal-footer">
                        <button class="modal-btn cancel" id="cancelLogout">Cancel</button>
                        <button class="modal-btn confirm" id="confirmLogout">Logout</button>
                    </div>
                </div>
            `;

            document.body.appendChild(logoutModal);

            // Prevent body scrolling
            document.body.classList.add('modal-open');

            // Force modal to center in viewport with inline styles
            logoutModal.style.display = 'flex';
            logoutModal.style.position = 'fixed';
            logoutModal.style.top = '0';
            logoutModal.style.left = '0';
            logoutModal.style.width = '100%';
            logoutModal.style.height = '100%';
            logoutModal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            logoutModal.style.justifyContent = 'center';
            logoutModal.style.alignItems = 'center';
            logoutModal.style.zIndex = '10000';
            logoutModal.style.margin = '0';
            logoutModal.style.padding = '0';

            // Ensure it's above everything else with !important
            logoutModal.style.setProperty('position', 'fixed', 'important');
            logoutModal.style.setProperty('z-index', '10000', 'important');
            logoutModal.style.setProperty('display', 'flex', 'important');
            logoutModal.style.setProperty('top', '0', 'important');
            logoutModal.style.setProperty('left', '0', 'important');
            logoutModal.style.setProperty('width', '100%', 'important');
            logoutModal.style.setProperty('height', '100%', 'important');

            // Focus on the modal for accessibility
            logoutModal.focus(); // Set up event handlers
            const cancelHandler = () => {
                document.body.removeChild(logoutModal);
                document.body.classList.remove('modal-open');
                resolve(false);
            };

            const confirmHandler = () => {
                document.body.removeChild(logoutModal);
                document.body.classList.remove('modal-open');
                if (onConfirm) {
                    onConfirm();
                }
                resolve(true);
            };

            document
                .getElementById('cancelLogout')
                .addEventListener('click', cancelHandler);
            document
                .getElementById('confirmLogout')
                .addEventListener('click', confirmHandler);

            // Keyboard support
            logoutModal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    cancelHandler();
                } else if (e.key === 'Enter') {
                    confirmHandler();
                }
            });

            // Close on background click
            logoutModal.addEventListener('click', (e) => {
                if (e.target === logoutModal) {
                    cancelHandler();
                }
            });
        });
    },
    showConfirmModal: function (title, message, onConfirm, onCancel) {
        if (this.isShowingModal) {
            console.log('Modal already showing, skipping new modal');
            return false;
        }

        this.isShowingModal = true;

        // Remove any existing modal
        const existingModal = document.getElementById('feedbackModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal element
        const modal = document.createElement('div');
        modal.id = 'feedbackModal';
        modal.className = 'modal confirm-modal';
        modal.tabIndex = '-1';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title || '⚠️ Confirm Action'}</h3>
                </div>
                <div class="modal-body">
                    <p>${message.replace(/\n/g, '<br>')}</p>
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
        document.body.classList.add('modal-open');

        // Style the modal
        setTimeout(() => {
            const modalElement = document.getElementById('feedbackModal');
            if (modalElement) {
                // Force modal to center in viewport
                modalElement.style.display = 'flex';
                modalElement.style.position = 'fixed';
                modalElement.style.top = '0';
                modalElement.style.left = '0';
                modalElement.style.width = '100%';
                modalElement.style.height = '100%';
                modalElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                modalElement.style.justifyContent = 'center';
                modalElement.style.alignItems = 'center';
                modalElement.style.zIndex = '10000';
                modalElement.style.margin = '0';
                modalElement.style.padding = '0';

                // Ensure it's above everything else
                modalElement.style.setProperty(
                    'position',
                    'fixed',
                    'important'
                );
                modalElement.style.setProperty('z-index', '10000', 'important');
                modalElement.style.setProperty('display', 'flex', 'important');
                modalElement.style.width = '100%';
                modalElement.style.height = '100%';
                modalElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                modalElement.style.justifyContent = 'center';
                modalElement.style.alignItems = 'center';
                modalElement.style.zIndex = '10000';

                const modalContent =
                    modalElement.querySelector('.modal-content');
                if (modalContent) {
                    modalContent.style.backgroundColor = 'white';
                    modalContent.style.padding = '2rem';
                    modalContent.style.borderRadius = '8px';
                    modalContent.style.maxWidth = '500px';
                    modalContent.style.width = '90%';
                    modalContent.style.maxHeight = '80vh';
                    modalContent.style.overflowY = 'auto';
                    modalContent.style.boxShadow =
                        '0 4px 20px rgba(0, 0, 0, 0.3)';
                }

                // Style buttons
                const cancelBtn = modalElement.querySelector('#modalCancel');
                const confirmBtn = modalElement.querySelector('#modalConfirm');

                if (cancelBtn) {
                    cancelBtn.style.padding = '0.75rem 1.5rem';
                    cancelBtn.style.border = '1px solid #6c757d';
                    cancelBtn.style.borderRadius = '4px';
                    cancelBtn.style.cursor = 'pointer';
                    cancelBtn.style.fontSize = '1rem';
                    cancelBtn.style.fontWeight = '500';
                    cancelBtn.style.backgroundColor = '#6c757d';
                    cancelBtn.style.color = 'white';
                    cancelBtn.style.marginRight = '1rem';
                }

                if (confirmBtn) {
                    confirmBtn.style.padding = '0.75rem 1.5rem';
                    confirmBtn.style.border = 'none';
                    confirmBtn.style.borderRadius = '4px';
                    confirmBtn.style.cursor = 'pointer';
                    confirmBtn.style.fontSize = '1rem';
                    confirmBtn.style.fontWeight = '500';
                    confirmBtn.style.backgroundColor = '#dc3545';
                    confirmBtn.style.color = 'white';
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
                .getElementById('modalConfirm')
                .addEventListener('click', confirmHandler);
            document
                .getElementById('modalCancel')
                .addEventListener('click', cancelHandler);

            // Keyboard support
            modalElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmHandler();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelHandler();
                }
            });

            // Focus the modal for keyboard navigation
            modalElement.focus();
        }, 10);

        return true;
    },

    // Enhanced logout confirmation modal - unified function
    showLogoutModal: function (confirmCallback) {
        return new Promise((resolve) => {
            // Prevent duplicate modals
            const existingModal = document.querySelector(
                '.modal-overlay, .logout-modal'
            );
            if (existingModal) {
                return resolve(false);
            }

            const logoutModal = document.createElement('div');
            logoutModal.className = 'modal-overlay';
            logoutModal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>🚪 Confirm Logout</h3>
                    </div>
                    <div class="modal-body">
                        <p>Are you sure you want to log out?</p>
                        <p style="color: #666; font-size: 0.9rem; margin-top: 1rem;">You will be redirected to the login page and will need to sign in again to access the system.</p>
                    </div>
                    <div class="modal-footer">
                        <button class="modal-btn cancel" id="cancelLogout">Cancel</button>
                        <button class="modal-btn confirm" id="confirmLogout">Logout</button>
                    </div>
                </div>
            `;
            document.body.appendChild(logoutModal);

            // Prevent body scrolling
            document.body.classList.add('modal-open');

            // Force modal to center in viewport with inline styles
            logoutModal.style.display = 'flex';
            logoutModal.style.position = 'fixed';
            logoutModal.style.top = '0';
            logoutModal.style.left = '0';
            logoutModal.style.width = '100%';
            logoutModal.style.height = '100%';
            logoutModal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            logoutModal.style.justifyContent = 'center';
            logoutModal.style.alignItems = 'center';
            logoutModal.style.zIndex = '10000';
            logoutModal.style.margin = '0';
            logoutModal.style.padding = '0';

            // Ensure it's above everything else with !important
            logoutModal.style.setProperty('position', 'fixed', 'important');
            logoutModal.style.setProperty('z-index', '10000', 'important');
            logoutModal.style.setProperty('display', 'flex', 'important');
            logoutModal.style.setProperty('top', '0', 'important');
            logoutModal.style.setProperty('left', '0', 'important');
            logoutModal.style.setProperty('width', '100%', 'important');
            logoutModal.style.setProperty('height', '100%', 'important');

            // Focus on the modal for accessibility
            logoutModal.focus(); // Set up event handlers
            const cancelHandler = () => {
                document.body.removeChild(logoutModal);
                document.body.classList.remove('modal-open');
                resolve(false);
            };

            const confirmHandler = () => {
                document.body.removeChild(logoutModal);
                document.body.classList.remove('modal-open');
                if (confirmCallback) confirmCallback();
                resolve(true);
            };

            document
                .getElementById('cancelLogout')
                .addEventListener('click', cancelHandler);
            document
                .getElementById('confirmLogout')
                .addEventListener('click', confirmHandler);

            // Keyboard support
            logoutModal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    cancelHandler();
                } else if (e.key === 'Enter') {
                    confirmHandler();
                }
            });

            // Close on background click
            logoutModal.addEventListener('click', (e) => {
                if (e.target === logoutModal) {
                    cancelHandler();
                }
            });
        });
    },
};

// Make modal functions globally available
window.showModal = modalManager.showModal.bind(modalManager);
window.closeModal = modalManager.closeModal.bind(modalManager);
window.modalManager = modalManager;
window.showLogoutModal = modalManager.showLogoutModal.bind(modalManager);
