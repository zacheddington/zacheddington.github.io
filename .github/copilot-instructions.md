# INTEGRIS NEURO - COPILOT INSTRUCTIONS

## Project Overview

IntegrisNeuro is an internal web application for managing patient records, studies, and user administration.
This is a **private company application** - not a public-facing website. SEO is not a concern.

## Technology Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES2020+)
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL (hosted on Heroku)
- **Hosting**: GitHub Pages (frontend) + Heroku (API server)
- **Authentication**: JWT tokens with session management

## Project File Structure

```
zacheddington.github.io/
├── index.html                    # Login page (root)
├── package.json                  # Node.js dependencies
├── Procfile                      # Heroku deployment config
├── CNAME                         # Custom domain config
│
├── css/                          # Stylesheets (modular architecture)
│   ├── main.css                  # Entry point (imports all modules)
│   ├── base/                     # Foundation styles
│   │   ├── variables.css         # CSS custom properties (design tokens)
│   │   ├── reset.css             # CSS reset and base styles
│   │   └── typography.css        # Font definitions and text styles
│   ├── layout/                   # Layout components
│   │   ├── containers.css        # Container and grid systems
│   │   ├── header.css            # App header styles
│   │   └── navigation.css        # Navigation menu styles
│   ├── components/               # Reusable UI components
│   │   ├── buttons.css           # Button styles and variants
│   │   ├── cards.css             # Card components
│   │   ├── forms.css             # Form elements and validation
│   │   ├── modals.css            # Modal dialogs
│   │   └── tables.css            # Data table styles
│   ├── pages/                    # Page-specific styles
│   │   └── [login, admin, patients, studies, profile, etc.].css
│   └── utils/                    # Utility classes
│       ├── responsive.css        # Responsive breakpoints and utilities
│       └── animations.css        # CSS animations and transitions
│
├── js/                           # JavaScript (modular architecture)
│   ├── main.js                   # Main controller and page routing
│   ├── shared/                   # Shared utility modules
│   │   ├── api-client.js         # API communication utilities
│   │   ├── auth-utils.js         # Authentication and session management
│   │   ├── modal-manager.js      # Modal dialog management
│   │   ├── navigation.js         # Navigation menu logic
│   │   ├── field-validation.js   # Form field validation
│   │   ├── date-utils.js         # Date formatting utilities
│   │   ├── password-utils.js     # Password validation and strength
│   │   ├── table-utils.js        # Data table utilities
│   │   └── address-validation.js # Address validation
│   └── pages/                    # Page-specific modules
│       └── [login, admin, patients, studies, profile, etc.].js
│
├── server/                       # Express.js backend
│   ├── index.js                  # Server entry point
│   ├── config/                   # Server configuration
│   │   ├── database.js           # PostgreSQL connection
│   │   ├── environment.js        # Environment variables
│   │   └── middleware.js         # Express middleware setup
│   ├── middleware/               # Custom middleware
│   │   ├── auth.js               # JWT authentication
│   │   ├── validation.js         # Request validation
│   │   └── errorHandler.js       # Error handling
│   ├── routes/                   # API route handlers
│   │   └── [auth, users, patients, studies, etc.].js
│   ├── utils/                    # Server utilities
│   │   ├── sessionManager.js     # Session management
│   │   ├── passwordValidator.js  # Server-side password validation
│   │   ├── responseHelpers.js    # Standardized API responses
│   │   └── constants.js          # Application constants
│   └── database/
│       └── migrations.js         # Database migrations
│
├── html/                         # Shared HTML fragments
│   ├── shared-head.html          # Common <head> content
│   └── tab-access-modal.html     # Tab visibility modal
│
├── docs/                         # Documentation
│   └── database-schema.md        # Database schema documentation
│
└── [page-folders]/               # Each page in its own folder
    ├── welcome/, admin/, patients/, studies/, profile/
    ├── 2fa-setup/, force-password-change/
    └── admin/[create-user, manage-users, manage-sessions]/
```

---

## COPILOT EDIT GUIDELINES

### Prime Directive

- Avoid working on more than one file at a time
- Multiple simultaneous edits to a file will cause corruption
- Explain changes while coding for educational purposes
-Every edit resulting in a commit and push to GitHub requires the update of App_Version in js/shared/navigation.js

### Large File Protocol (>300 lines)

1. Create a detailed plan BEFORE making edits
2. Include: functions to modify, order of changes, dependencies, estimated edits
3. Format as numbered edit sequence with purposes
4. Wait for user confirmation before proceeding
5. After each edit: "✅ Completed edit [#] of [total]. Ready for next?"

### Refactoring Guidance

- Break work into logical, independently functional chunks
- Ensure each intermediate state maintains functionality
- Consider temporary duplication as a valid interim step

---

## CODING STANDARDS

### General Requirements

Use modern technologies as described below. Prioritize clean, maintainable code with appropriate comments.

### Accessibility Requirements

- Ensure compliance with **WCAG 2.1** AA level minimum
- Always include:
  - Labels for all form fields
  - Proper **ARIA** roles and attributes where semantic HTML isn't sufficient
  - Adequate color contrast (4.5:1 minimum for normal text)
  - Focus indicators for keyboard navigation
  - Semantic HTML for clear structure

### Browser Compatibility

- **Supported Browsers**: Chrome, Edge, Safari (macOS/iOS), Firefox, Opera
- Support latest two stable releases of each browser
- **Target Devices**:
  - Desktop/Laptop (primary)
  - Tablets (portrait and landscape)
  - Smartphones (~6" screens, portrait and landscape)
  - Minimum supported width: 320px
- Use feature detection where appropriate (`if ('fetch' in window)`)

### HTML Requirements

- Use HTML5 semantic elements (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`, etc.)
- Include appropriate ARIA attributes for accessibility
- Ensure valid markup that passes W3C validation
- Use responsive design practices
- Include `loading="lazy"` on images where applicable
- **Note**: SEO tags (meta description, Open Graph) are NOT needed - internal app only

### CSS Requirements

- Use modern CSS features:
  - CSS Grid and Flexbox for layouts
  - CSS Custom Properties (variables) for theming
  - CSS animations and transitions
  - Media queries for responsive design
  - Logical properties (`margin-inline`, `padding-block`) where appropriate
  - Modern selectors (`:is()`, `:where()`, `:has()`)
- **Dark mode support** with `prefers-color-scheme` media query
- Use modern units (`rem`, `vh`, `vw`, `dvh`) over pixels for responsiveness
- Font size minimum 16px on inputs to prevent iOS zoom
- Touch-friendly targets (minimum 44px × 44px)

### JavaScript Requirements

- **Minimum Compatibility**: ECMAScript 2020 (ES11) or higher
- **Features to Use**:
  - Arrow functions and template literals
  - Destructuring assignment and spread/rest operators
  - Async/await for asynchronous code
  - Optional chaining (`?.`) and nullish coalescing (`??`)
  - Array methods (`map`, `filter`, `reduce`, `flatMap`, etc.)
  - Classes with proper inheritance when OOP is needed
- **Avoid**:
  - `var` keyword (use `const` and `let`)
  - jQuery or external libraries (vanilla JS only)
  - Callback-based patterns when promises can be used
  - `eval()` due to security risks

### Error Handling

- Use `try-catch` consistently for async/API calls
- Handle promise rejections explicitly
- Differentiate error types:
  - **Network errors**: timeouts, server errors, rate-limiting
  - **Business logic errors**: validation failures, invalid input
  - **Runtime exceptions**: unexpected errors
- Show user-friendly messages; log technical details to console

### Form Submission Protection

- **CRITICAL**: Prevent duplicate submissions on all forms
- Disable submit buttons during API calls
- Show loading states during processing
- Re-enable buttons only after response (success or failure)
- Use request flags to prevent concurrent identical requests

---

## BACKEND STANDARDS

### Node.js/Express Requirements

- Use async/await throughout
- Implement proper error handling middleware
- Use parameterized queries for all database operations (SQL injection prevention)
- Validate and sanitize all user inputs
- Use environment variables for sensitive configuration

### Database Requirements (PostgreSQL)

- Use parameterized queries exclusively (never string concatenation)
- Implement proper transaction handling for multi-step operations
- Use connection pooling efficiently
- Include proper indexes for frequently queried columns

---

## SECURITY REQUIREMENTS

### Mandatory Security Measures

- **HTTPS Enforcement**: Redirect all HTTP to HTTPS in production
- **Authentication**: JWT tokens with secure session management
- **Headers**: Implement security headers:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Content-Security-Policy` (appropriate for app)
- **CORS**: Restrict to allowed origins only
- **Rate Limiting**: Implement on sensitive endpoints (login, password change)
- **Input Validation**: Sanitize all user inputs server-side
- **Cookies**: Use HttpOnly, Secure, SameSite=Strict flags

### Session Management

- Single session per user enforcement
- Automatic session cleanup for expired sessions
- Session timeout handling with user notification
- Secure session token generation

---

## DOCUMENTATION REQUIREMENTS

- Include JSDoc comments for JavaScript functions
- Document complex functions with clear examples
- Minimum docblock info: `@param`, `@returns`, `@throws`
