// Profile Management Routes
// User profile updates and password management

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const { authenticateToken } = require('../middleware/auth');
const { validateRequiredFields, validateFieldLengths, validateEmail, sanitizeInput } = require('../middleware/validation');
const { pool } = require('../config/database');
const { validatePasswordSecurity } = require('../utils/passwordValidator');
const { successResponse, errorResponse, updatedResponse, notFoundResponse } = require('../utils/responseHelpers');
const { FIELD_LIMITS } = require('../utils/constants');
const config = require('../config/environment');

// Update user profile endpoint
router.put('/profile', 
    authenticateToken,
    sanitizeInput,
    validateRequiredFields(['firstName', 'lastName', 'email']),
    validateFieldLengths({
        firstName: FIELD_LIMITS.FIRST_NAME,
        middleName: FIELD_LIMITS.MIDDLE_NAME,
        lastName: FIELD_LIMITS.LAST_NAME,
        email: FIELD_LIMITS.EMAIL
    }),
    validateEmail,
    async (req, res) => {
        try {
            const { firstName, middleName, lastName, email } = req.body;
            const userId = req.user.id;
            
            if (config.isLocalTest) {
                // For local testing, just return success
                return updatedResponse(res, {
                    firstName,
                    middleName,
                    lastName,
                    email
                }, 'Profile updated successfully');
            }
            
            // Production database logic
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                
                // Get username for the 'who' field
                const userResult = await client.query(
                    'SELECT username FROM tbl_user WHERE user_key = $1',
                    [userId]
                );
                
                if (userResult.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return notFoundResponse(res, 'User');
                }
                
                const username = userResult.rows[0].username;
                
                // Always insert a new record into tbl_name_data
                const newNameResult = await client.query(
                    'INSERT INTO tbl_name_data (first_name, middle_name, last_name, who, date_when) VALUES ($1, $2, $3, $4, NOW()) RETURNING name_key',
                    [firstName, middleName || null, lastName, username]
                );
                
                if (newNameResult.rows.length === 0) {
                    throw new Error('Failed to create name record');
                }
                
                const newNameKey = newNameResult.rows[0].name_key;
                
                // Update user table with new name_key and email
                const userUpdateResult = await client.query(
                    'UPDATE tbl_user SET email = $1, name_key = $2 WHERE user_key = $3',
                    [email, newNameKey, userId]
                );
                
                // Verify the user update actually occurred
                if (userUpdateResult.rowCount === 0) {
                    throw new Error('Failed to update user profile - user not found');
                }
                
                await client.query('COMMIT');
                
                return updatedResponse(res, {
                    firstName,
                    middleName,
                    lastName,
                    email,
                    nameKey: newNameKey
                }, 'Profile updated successfully');
                
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
            
        } catch (err) {
            console.error('Profile update error:', err);
            return errorResponse(res, err.message || 'Failed to update profile. Please try again later.', 500);
        }
    }
);

// Change password endpoint
router.put('/change-password',
    authenticateToken,
    sanitizeInput,
    validateRequiredFields(['currentPassword', 'newPassword']),
    async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = req.user.id;
            
            // Validate password security
            const passwordValidation = validatePasswordSecurity(newPassword);
            if (!passwordValidation.isValid) {
                return errorResponse(res, 'New password does not meet security requirements', 400, passwordValidation.errors);
            }
            
            if (config.isLocalTest) {
                // For local testing, just return success if current password is 'admin'
                if (currentPassword === 'admin') {
                    return successResponse(res, null, 'Password changed successfully');
                } else {
                    return errorResponse(res, 'Current password is incorrect', 400);
                }
            }
            
            // Production database logic
            const client = await pool.connect();
            try {
                // Get current user data
                const userResult = await client.query(
                    'SELECT password_hash FROM tbl_user WHERE user_key = $1',
                    [userId]
                );
                
                if (userResult.rows.length === 0) {
                    return notFoundResponse(res, 'User');
                }
                
                const user = userResult.rows[0];
                
                // Verify current password
                const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
                if (!validPassword) {
                    return errorResponse(res, 'Current password is incorrect', 400);
                }
                
                // Hash new password
                const saltRounds = 10;
                const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
                
                // Update password in database
                const updateResult = await client.query(
                    'UPDATE tbl_user SET password_hash = $1 WHERE user_key = $2',
                    [newPasswordHash, userId]
                );
                
                // Verify the update actually occurred
                if (updateResult.rowCount === 0) {
                    throw new Error('Password update failed - user not found');
                }
                
                return successResponse(res, null, 'Password changed successfully');
                
            } finally {
                client.release();
            }
            
        } catch (err) {
            console.error('Password change error:', err);
            return errorResponse(res, err.message || 'Failed to change password. Please try again later.', 500);
        }
    }
);

// Forced password change endpoint for first-time users
router.put('/force-change-password',
    authenticateToken,
    sanitizeInput,
    validateRequiredFields(['currentPassword', 'newPassword']),
    async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = req.user.id;
            
            // Validate password security
            const passwordValidation = validatePasswordSecurity(newPassword);
            if (!passwordValidation.isValid) {
                return errorResponse(res, 'New password does not meet security requirements', 400, passwordValidation.errors);
            }
            
            if (config.isLocalTest) {
                // For local testing, just return success
                return successResponse(res, {
                    passwordChangeRequired: false
                }, 'Password changed successfully');
            }
            
            // Production database logic
            const client = await pool.connect();
            try {
                // Get current user data
                const userResult = await client.query(
                    'SELECT password_hash FROM tbl_user WHERE user_key = $1',
                    [userId]
                );
                
                if (userResult.rows.length === 0) {
                    return notFoundResponse(res, 'User');
                }
                
                const user = userResult.rows[0];
                
                // Verify current password
                const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
                if (!validPassword) {
                    return errorResponse(res, 'Current password is incorrect', 400);
                }
                
                // Hash new password
                const saltRounds = 10;
                const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

                // Update password and clear the password change requirement flag
                const updateResult = await client.query(
                    'UPDATE tbl_user SET password_hash = $1, password_change_required = false WHERE user_key = $2',
                    [newPasswordHash, userId]
                );
                
                // Verify the update actually occurred
                if (updateResult.rowCount === 0) {
                    throw new Error('Password update failed - user not found');
                }
                
                return successResponse(res, {
                    passwordChangeRequired: false
                }, 'Password changed successfully');
                
            } finally {
                client.release();
            }
            
        } catch (err) {
            console.error('Forced password change error:', err);
            return errorResponse(res, err.message || 'Failed to change password. Please try again later.', 500);
        }
    }
);

module.exports = router;
