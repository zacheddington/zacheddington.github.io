// Login Page Module
// Contains authentication functionality for user login

// Initialize login page functionality
function initializeLoginPage() {
  console.log("🔐 Initializing login page...");
  setupLoginForm();
  clearStoredCredentials();

  // Focus on username field if empty
  const usernameField = document.getElementById("username");
  if (usernameField && !usernameField.value) {
    setTimeout(() => usernameField.focus(), 100);
  }
  console.log("✅ Login page initialization complete");
}

// Clear any stored credentials on login page load
function clearStoredCredentials() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  sessionStorage.clear();
}

// Set up login form functionality
function setupLoginForm() {
  console.log("📝 Setting up login form...");
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) {
    console.error("❌ Login form not found!");
    return;
  }

  // Set up field validation
  setupLoginFieldValidation();

  // Handle form submission
  loginForm.addEventListener("submit", async function (e) {
    console.log("🚀 Form submitted, preventing default...");
    e.preventDefault();
    await performLogin();
  });

  // Enter key handling for password field
  const passwordField = document.getElementById("password");
  if (passwordField) {
    passwordField.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        console.log("⏎ Enter key pressed, preventing default...");
        e.preventDefault();
        performLogin();
      }
    });
  }
  console.log("✅ Login form setup complete");
}

// Set up login form field validation
function setupLoginFieldValidation() {
  const usernameField = document.getElementById("username");
  const passwordField = document.getElementById("password");

  if (usernameField) {
    usernameField.addEventListener("input", function () {
      // Simple clear errors on input for login page
      clearLoginErrors();
    });

    // No blur validation for login - just clear errors
    usernameField.addEventListener("blur", function () {
      clearLoginErrors();
    });
  }

  if (passwordField) {
    passwordField.addEventListener("input", function () {
      // Simple clear errors on input for login page
      clearLoginErrors();
    });
  }
}

// Validate username field format (only for actual validation during submit)
function validateUsernameField() {
  const usernameField = document.getElementById("username");
  if (!usernameField || !usernameField.value) return false;

  // Simple username validation for login - just check it's not empty and reasonable length
  const username = usernameField.value.trim();
  return username.length >= 1 && username.length <= 100; // More lenient for login
}

// Perform user login
async function performLogin() {
  // Prevent multiple simultaneous login attempts
  if (performLogin.isRunning) {
    console.log("🚫 Login already in progress, ignoring duplicate request");
    return;
  }
  
  performLogin.isRunning = true;
  
  const submitBtn = document.getElementById("loginBtn");
  const usernameField = document.getElementById("username");
  const passwordField = document.getElementById("password");
  const originalText = submitBtn.textContent;
  let response = null;
  let loginSuccessful = false;

  try {
    // Disable form controls during login
    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in...";
    usernameField.disabled = true;
    passwordField.disabled = true;

    // Pre-flight connectivity check
    const connectivity = await window.apiClient.checkConnectivity();
    if (!connectivity.connected) {
      throw new Error(`Connection failed: ${connectivity.error}`);
    }
    // Get form data
    const username = usernameField.value.trim();
    const password = passwordField.value;

    // Validate input
    if (!username || !password) {
      throw new Error("Username and password are required.");
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    if (!usernameRegex.test(username)) {
      throw new Error("Please enter a valid username.");
    }

    const API_URL = window.apiClient.getAPIUrl();

    response = await fetch(`${API_URL}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });
    const result = await response.json();

    if (response.ok) {
      // Handle both old and new response formats
      const responseData = result.data || result; // Support both formats
      const token = responseData.token;
      const user = responseData.user;

      // Store authentication data
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // Mark login as successful to prevent button re-enabling
      loginSuccessful = true;
      // Check if user needs to change password
      if (user && user.force_password_change) {
        // Redirect to force password change page
        window.location.href = "/force-password-change/";
        return;
      }

      // Clear any error messages
      clearLoginErrors();

      // Immediate redirect - no success message, no delays
      if (window.authUtils.isAdmin()) {
        window.location.href = "/admin/";
      } else {
        window.location.href = "/welcome/";
      }
    } else {
      throw new Error(result.error || "Login failed");
    }
  } catch (error) {
    console.error("Login error:", error);

    // For authentication errors (401) or validation errors, always show modal
    if (response && response.status === 401) {
      // Clear password field for security
      passwordField.value = "";
      window.modalManager.showModal(
        "error",
        "Invalid username or password. Please try again."
      );
    } else {
      // Use enhanced error categorization for other errors
      const errorInfo = window.apiClient.categorizeError(error, response);

      // For network/connectivity issues, show modal
      if (errorInfo.modal) {
        window.modalManager.showModal("error", errorInfo.message);
      } else {
        // For validation errors, show inline
        showLoginError(errorInfo.message);
      }
    }  } finally {
    // Reset the guard flag
    performLogin.isRunning = false;
    
    // Only re-enable form controls if login was not successful
    if (!loginSuccessful) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      usernameField.disabled = false;
      passwordField.disabled = false;
    }
    // If login was successful, keep form disabled until redirect
  }
}

// Show login error message
function showLoginError(message) {
  const loginSection = document.querySelector(".login-container");
  if (loginSection && window.showSectionMessage) {
    window.showSectionMessage(loginSection, message, "error");
  }
}

// Clear login errors and success messages
function clearLoginErrors() {
  const loginSection = document.querySelector(".login-container");
  if (!loginSection) return;

  // Clear section-level messages
  const messages = loginSection.querySelectorAll(".section-message");
  messages.forEach((message) => message.remove());

  // Clear field-level errors
  const errorGroups = loginSection.querySelectorAll(".form-group.error");
  errorGroups.forEach((group) => {
    group.classList.remove("error");
    const errorMsg = group.querySelector(".error-message");
    if (errorMsg) {
      errorMsg.remove();
    }
  });

  // Clear success states
  const successGroups = loginSection.querySelectorAll(".form-group.success");
  successGroups.forEach((group) => {
    group.classList.remove("success");
    const successMsg = group.querySelector(".success-message");
    if (successMsg) {
      successMsg.remove();
    }
  });
}

// Expose functions to global scope
window.loginPage = {
  initializeLoginPage,
  performLogin,
};
