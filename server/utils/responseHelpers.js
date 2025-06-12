// Standardized API Response Helpers
// Provides consistent response formatting across all endpoints

const successResponse = (res, data, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

const errorResponse = (
  res,
  message = "An error occurred",
  statusCode = 500,
  details = null
) => {
  return res.status(statusCode).json({
    success: false,
    error: message,
    details,
    timestamp: new Date().toISOString(),
  });
};

const validationErrorResponse = (res, errors) => {
  return errorResponse(res, "Validation failed", 400, errors);
};

const unauthorizedResponse = (res, message = "Unauthorized access") => {
  return errorResponse(res, message, 401);
};

const forbiddenResponse = (res, message = "Access denied") => {
  return errorResponse(res, message, 403);
};

const notFoundResponse = (res, resource = "Resource") => {
  return errorResponse(res, `${resource} not found`, 404);
};

const conflictResponse = (res, message = "Resource already exists") => {
  return errorResponse(res, message, 409);
};

const serverErrorResponse = (res, message = "Internal server error") => {
  return errorResponse(res, message, 500);
};

// Response for successful creation
const createdResponse = (res, data, message = "Created successfully") => {
  return successResponse(res, data, message, 201);
};

// Response for successful deletion
const deletedResponse = (res, message = "Deleted successfully") => {
  return successResponse(res, null, message, 200);
};

// Response for successful update
const updatedResponse = (res, data, message = "Updated successfully") => {
  return successResponse(res, data, message, 200);
};

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
  serverErrorResponse,
  createdResponse,
  deletedResponse,
  updatedResponse,
};
