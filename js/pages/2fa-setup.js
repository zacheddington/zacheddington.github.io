// 2FA Setup Page Module
// Handles Two-Factor Authentication setup functionality

let currentStep = 1;
let setupData = null;
let backupCodes = [];

// Initialize 2FA setup page
function initialize2FASetupPage() {
    // Reset page state first
    resetPageState(); // Setup event listeners for navigation buttons
    setupNavigationEventListeners();

    // Setup event listeners for verification input
    const verificationInput = document.getElementById('verificationCode');
    if (verificationInput) {
        verificationInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                verifyCode();
            }
        });

        // Auto-format as user types
        verificationInput.addEventListener('input', function (e) {
            // Only allow numbers
            e.target.value = e.target.value.replace(/[^0-9]/g, '');

            // Clear previous errors
            document
                .getElementById('verificationError')
                .classList.add('hidden');
        });
    }
}

// Reset page state to initial conditions
function resetPageState() {
    // Reset to step 1
    currentStep = 1;
    setupData = null;
    backupCodes = [];

    // Hide all steps except step 1
    for (let i = 1; i <= 4; i++) {
        const step = document.getElementById(`step${i}`);
        if (step) {
            if (i === 1) {
                step.classList.remove('hidden');
                step.classList.add('active');
            } else {
                step.classList.add('hidden');
                step.classList.remove('active');
            }
        }
    }

    // Reset verify button state
    const verifyBtn = document.getElementById('verifyBtn');
    if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify & Enable 2FA';
    }

    // Clear verification input and errors
    const verificationInput = document.getElementById('verificationCode');
    if (verificationInput) {
        verificationInput.value = '';
    }

    const errorDiv = document.getElementById('verificationError');
    if (errorDiv) {
        errorDiv.classList.add('hidden');
        errorDiv.textContent = '';
    }

    // Clear loading/error states
    const loadingDiv = document.getElementById('loadingMessage');
    if (loadingDiv) {
        loadingDiv.classList.add('hidden');
    }

    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.classList.add('hidden');
    }
}

// Setup event listeners for navigation buttons
function setupNavigationEventListeners() {
    // Step 1 to Step 2 button
    const authenticatorButton = document.querySelector('.authenticator-button');
    if (authenticatorButton) {
        authenticatorButton.addEventListener('click', () => nextStep(2));
    }

    // Step 2 to Step 3 button
    const step2NextButton = document.querySelector('#step2 .btn-primary');
    if (step2NextButton) {
        step2NextButton.addEventListener('click', () => nextStep(3));
    }

    // Step 3 verify button
    const verifyButton = document.getElementById('verifyBtn');
    if (verifyButton) {
        verifyButton.addEventListener('click', verifyCode);
    }

    // Step 3 back button
    const step3BackButton = document.querySelector('#step3 .btn-secondary');
    if (step3BackButton) {
        step3BackButton.addEventListener('click', () => previousStep(2));
    }

    // Step 4 download button
    const downloadButton = document.querySelector('#step4 .btn-secondary');
    if (downloadButton) {
        downloadButton.addEventListener('click', downloadBackupCodes);
    }

    // Step 4 complete button
    const completeButton = document.querySelector('#step4 .btn-primary');
    if (completeButton) {
        completeButton.addEventListener('click', completeSetup);
    }
}

// Navigate to next step
function nextStep(step) {
    if (step === 2) {
        initiate2FASetup();
    }

    // Hide current step
    document.getElementById(`step${currentStep}`).classList.add('hidden');
    document.getElementById(`step${currentStep}`).classList.remove('active');

    // Show next step
    document.getElementById(`step${step}`).classList.remove('hidden');
    document.getElementById(`step${step}`).classList.add('active');

    currentStep = step;
}

// Navigate to previous step
function previousStep(step) {
    // Hide current step
    document.getElementById(`step${currentStep}`).classList.add('hidden');
    document.getElementById(`step${currentStep}`).classList.remove('active');

    // Show previous step
    document.getElementById(`step${step}`).classList.remove('hidden');
    document.getElementById(`step${step}`).classList.add('active');

    currentStep = step;
}

// Initiate 2FA setup process
async function initiate2FASetup() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/';
            return;
        }

        const API_URL = window.apiClient.getAPIUrl();
        const response = await fetch(`${API_URL}/api/2fa/setup`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        if (response.ok) {
            setupData = data.data; // Access the nested data object

            // Display QR code
            document.getElementById(
                'qrCodeContainer'
            ).innerHTML = `<img src="${data.data.qrCode}" alt="2FA QR Code">`;

            // Display manual entry key
            document.getElementById('manualKey').textContent =
                data.data.manualEntryKey;
            document.getElementById('accountName').textContent =
                data.data.accountName || 'Your Account';
        } else {
            showError(data.error || 'Failed to setup 2FA');
        }
    } catch (error) {
        console.error('2FA setup error:', error);
        showError('Network error. Please try again.');
    }
}

// Verify the entered code
async function verifyCode() {
    const code = document.getElementById('verificationCode').value.trim();

    if (!code || code.length !== 6) {
        showVerificationError('Please enter a 6-digit code');
        return;
    }

    try {
        const verifyBtn = document.getElementById('verifyBtn');
        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Verifying...';

        // Pre-flight connectivity check
        const connectivity = await window.apiClient.checkConnectivity();
        if (!connectivity.connected) {
            throw new Error(`Connection failed: ${connectivity.error}`);
        }

        const token = localStorage.getItem('token');
        const API_URL = window.apiClient.getAPIUrl();
        const response = await fetch(`${API_URL}/api/2fa/verify`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: code }),
        });

        const data = await response.json();

        if (response.ok) {
            // Handle both old and new response formats
            const responseData = data.data || data;
            backupCodes = responseData.backupCodes || [];
            displayBackupCodes();
            nextStep(4);
        } else {
            throw new Error(data.error || 'Invalid verification code');
        }
    } catch (error) {
        console.error('2FA verification error:', error);

        // Use enhanced error categorization
        const errorInfo = window.apiClient.categorizeError(error, null);
        showVerificationError(errorInfo.message);
    } finally {
        const verifyBtn = document.getElementById('verifyBtn');
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify & Enable 2FA';
    }
}

// Display backup codes
function displayBackupCodes() {
    const container = document.getElementById('backupCodesContainer');
    container.innerHTML = '';

    backupCodes.forEach((code) => {
        const codeElement = document.createElement('div');
        codeElement.className = 'backup-code';
        codeElement.textContent = code;
        container.appendChild(codeElement);
    });
}

// Download backup codes
function downloadBackupCodes() {
    const codesText = backupCodes.join('\n');
    const blob = new Blob(
        [
            'IntegrisNeuro 2FA Backup Codes\n',
            'Generated: ' + new Date().toLocaleString() + '\n\n',
            'IMPORTANT: Store these codes safely. Each can only be used once.\n\n',
            codesText,
        ],
        { type: 'text/plain' }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'integrisneuro-2fa-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Complete setup and redirect
function completeSetup() {
    // Redirect back to profile or security settings
    window.location.href = '../profile/';
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

// Show verification error message
function showVerificationError(message) {
    const errorDiv = document.getElementById('verificationError');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

// Make functions available globally for HTML onclick handlers
window.tfaSetupPage = {
    initialize2FASetupPage,
    nextStep,
    previousStep,
    verifyCode,
    downloadBackupCodes,
    completeSetup,
};

// Also expose individual functions for backward compatibility
window.nextStep = nextStep;
window.previousStep = previousStep;
window.verifyCode = verifyCode;
window.downloadBackupCodes = downloadBackupCodes;
window.completeSetup = completeSetup;
