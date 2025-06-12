// Request Validation Middleware
// Centralizes input validation and sanitization

const validateRequiredFields = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = [];

    for (const field of requiredFields) {
      if (!req.body[field] || req.body[field].toString().trim() === "") {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    next();
  };
};

const validateFieldLengths = (fieldLimits) => {
  return (req, res, next) => {
    const errors = [];

    for (const [field, maxLength] of Object.entries(fieldLimits)) {
      if (req.body[field] && req.body[field].length > maxLength) {
        errors.push(`${field} must be ${maxLength} characters or less`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: errors.join(", "),
      });
    }

    next();
  };
};

const validateEmail = (req, res, next) => {
  const { email } = req.body;

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Please enter a valid email address",
      });
    }
  }

  next();
};

const sanitizeInput = (req, res, next) => {
  // Trim whitespace from string fields
  for (const [key, value] of Object.entries(req.body)) {
    if (typeof value === "string") {
      req.body[key] = value.trim();
    }
  }

  next();
};

module.exports = {
  validateRequiredFields,
  validateFieldLengths,
  validateEmail,
  sanitizeInput,
};
