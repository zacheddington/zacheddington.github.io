document.addEventListener('DOMContentLoaded', function() {
    const FADE_DURATION = 450;
    const API_URL = 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
    
    // Load the menu
    fetch('../html/menu.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('hamburger-menu').innerHTML = html;

            // Remove current page link from menu
            const path = window.location.pathname.split("/").filter(Boolean);
            let pageKey = '';
            if (path.includes('welcome')) pageKey = 'welcome';
            else if (path.includes('enter_eeg')) pageKey = 'enter_eeg';
            else if (path.includes('view_eeg')) pageKey = 'view_eeg';
            else if (path.includes('profile')) pageKey = 'profile';

            document.querySelectorAll('.side-menu a[data-page]').forEach(link => {
                if (link.getAttribute('data-page') === pageKey) {
                    link.parentElement.style.display = 'none';
                }
            });

            // Hamburger menu logic
            const hamburgerBtn = document.getElementById('hamburgerBtn');
            const sideMenu = document.getElementById('sideMenu');
            const logoutLink = document.getElementById('logoutLink');

            if (hamburgerBtn && sideMenu) {
                hamburgerBtn.onclick = function() {
                    sideMenu.classList.toggle('open');
                    hamburgerBtn.classList.toggle('open'); // Toggle the open class for color flip
                };
            }

            document.querySelectorAll('.side-menu a').forEach(link => {
                link.addEventListener('click', function(e) {
                    const href = link.getAttribute('href');
                    if (href && href !== '#') {
                        e.preventDefault();
                        sideMenu.classList.remove('open');
                        hamburgerBtn.classList.remove('open'); // Remove open class when closing
                        document.body.classList.add('fade-out');
                        setTimeout(() => {
                            window.location.href = href;
                        }, FADE_DURATION);
                    }
                });
            });

            if (logoutLink) {
                logoutLink.onclick = function(e) {
                    e.preventDefault();
                    document.body.classList.add('fade-out');
                    setTimeout(() => {
                        window.location.href = "/";
                    }, FADE_DURATION);
                };
            }

            // Close side menu when clicking outside
            document.addEventListener('click', function(event) {
                const sideMenu = document.getElementById('sideMenu');
                const hamburgerBtn = document.getElementById('hamburgerBtn');
                if (
                    sideMenu &&
                    hamburgerBtn &&
                    sideMenu.classList.contains('open') &&
                    !sideMenu.contains(event.target) &&
                    !hamburgerBtn.contains(event.target)
                ) {
                    sideMenu.classList.remove('open');
                    hamburgerBtn.classList.remove('open');
                }
            });
        });

    // Fade-out for Go links
    document.querySelectorAll('.fade-nav').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = link.getAttribute('href');
            if (href && href !== '#') {
                e.preventDefault();
                document.body.classList.add('fade-out');
                setTimeout(() => {
                    window.location.href = href;
                }, FADE_DURATION);
            }
        });
    });

    // Handle EEG form submission if present
    const eegForm = document.querySelector('.eeg-form');
    const showModal = (type, message) => {
        const modalHtml = `
            <div class="modal" id="feedbackModal">
                <div class="modal-content ${type}">
                    <h2>${type === 'success' ? '✓ Success!' : '⚠ Error'}</h2>
                    <p>${message}</p>
                    ${type === 'success' ? '' : '<button class="modal-btn" onclick="closeModal()">Close</button>'}
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        if (type === 'success') {
            setTimeout(() => {
                document.body.classList.add('fade-out');
                setTimeout(() => {
                    window.location.href = "../welcome/";
                }, FADE_DURATION);
            }, 2000);
        }
    };

    window.closeModal = () => {
        const modal = document.getElementById('feedbackModal');
        if (modal) modal.remove();
    };

    if (eegForm) {
        // Add a submitting flag to track form state
        let isSubmitting = false;

        // Update submit button styles when disabled
        const submitButton = eegForm.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.style.transition = 'opacity 0.3s ease';
        }

        // Add input validation listeners
        const patientNumber = document.getElementById('patientNumber');
        const firstName = document.getElementById('firstName');
        const middleName = document.getElementById('middleName');
        const lastName = document.getElementById('lastName');
        const address = document.getElementById('address');

        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = 'Only numbers and hyphens are allowed';
        patientNumber.parentElement.appendChild(tooltip);

        let tooltipTimeout;

        // Validate patient number (numbers and hyphens only, max 20 chars)
        patientNumber?.addEventListener('input', (e) => {
            const originalValue = e.target.value;
            const newValue = originalValue.replace(/[^0-9-]/g, '');
            
            // If characters were removed, show tooltip
            if (originalValue !== newValue) {
                e.target.value = newValue;
                tooltip.classList.add('show');
                
                // Remove any inline positioning
                tooltip.style.removeProperty('top');
                tooltip.style.removeProperty('left');

                // Clear existing timeout
                clearTimeout(tooltipTimeout);
                
                // Hide tooltip after 2 seconds
                tooltipTimeout = setTimeout(() => {
                    tooltip.classList.remove('show');
                }, 2000);
            }

            // Handle max length
            if (newValue.length > 20) {
                e.target.value = newValue.slice(0, 20);
                showModal('error', 'Patient Number must be 20 characters or less');
            }
        });

        // Clean up tooltip when leaving the input
        patientNumber?.addEventListener('blur', () => {
            tooltip.classList.remove('show');
            clearTimeout(tooltipTimeout);
        });

        // Validate name lengths (50 chars) without multiple modals
        [firstName, middleName, lastName].forEach(input => {
            input?.addEventListener('input', (e) => {
                if (e.target.value.length > 50) {
                    e.target.value = e.target.value.slice(0, 50);
                    // Show modal if one isn't currently showing
                    if (input.dataset.showingModal !== 'true') {
                        input.dataset.showingModal = 'true';
                        showModal('error', `${e.target.placeholder || e.target.name} must be 50 characters or less`);
                    }
                } else {
                    // Reset the flag when value is under limit
                    input.dataset.showingModal = 'false';
                }
            });
        });

        // Validate address length (100 chars) with similar logic
        address?.addEventListener('input', (e) => {
            if (e.target.value.length > 100) {
                e.target.value = e.target.value.slice(0, 100);
                if (address.dataset.showingModal !== 'true') {
                    address.dataset.showingModal = 'true';
                    showModal('error', 'Address must be 100 characters or less');
                }
            } else {
                // Reset the flag when value is under limit
                address.dataset.showingModal = 'false';
            }
        });

        eegForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Prevent multiple submissions
            if (isSubmitting) {
                console.log('Form submission already in progress');
                return;
            }

            try {
                isSubmitting = true;
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.style.opacity = '0.5';
                }

                const who = 'PlaceholderUser'; // Replace with actual logged-in user logic
                
                // Enhanced validation
                const validationErrors = [];
                
                if (!patientNumber?.value) validationErrors.push('Patient Number is required');
                if (!firstName?.value) validationErrors.push('First Name is required');
                if (!lastName?.value) validationErrors.push('Last Name is required');
                
                if (validationErrors.length > 0) {
                    showModal('error', validationErrors.join('<br>'));
                    return;
                }

                const data = {
                    patientNumber: patientNumber.value,
                    firstName: firstName.value,
                    middleName: middleName?.value || '',
                    lastName: lastName.value,
                    address: address?.value || '',
                    who: who,
                    datewhen: new Date().toISOString()
                };

                console.log('Submitting data:', data);

                const response = await fetch('https://integrisneuro-eec31e4aaab1.herokuapp.com/api/eeg', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const responseData = await response.json();

                if (response.ok) {
                    showModal('success', 'Patient information saved successfully!');
                    // Disable all form inputs
                    Array.from(eegForm.elements).forEach(input => {
                        input.disabled = true;
                    });
                } else {
                    showModal('error', `Server Error: ${responseData.error || 'Unknown error occurred'}`);
                    // Re-enable submission on error
                    isSubmitting = false;
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.style.opacity = '1';
                    }
                }
            } catch (err) {
                console.error('Submission error:', err);
                showModal('error', 'Network Error: Unable to connect to the server');
                // Re-enable submission on error
                isSubmitting = false;
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.style.opacity = '1';
                }
            }
        });
    }

    // Login form handler for 
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // Add authentication logic here
            // For now, just redirect to html/welcome.html
            document.body.classList.add('fade-out');
            setTimeout(() => {
                window.location.href = "welcome/";
            }, FADE_DURATION);
        });
    }
});