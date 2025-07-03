// Authentication Routes
// Login, logout, password management, and 2FA endpoints

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const { authenticateToken } = require('../middleware/auth');
const {
    validateRequiredFields,
    sanitizeInput,
} = require('../middleware/validation');
const { pool } = require('../config/database');
const { validatePasswordSecurity } = require('../utils/passwordValidator');
const SessionManager = require('../utils/sessionManager');
const {
    successResponse,
    errorResponse,
    unauthorizedResponse,
} = require('../utils/responseHelpers');
const { JWT_CONFIG } = require('../utils/constants');
const config = require('../config/environment');

// Login endpoint
router.post(
    '/login',
    sanitizeInput,
    validateRequiredFields(['username', 'password']),
    async (req, res) => {
        try {
            // Check if we're in local development mode without proper database
            if (config.isLocalTest) {
                const { username, password } = req.body;
                if (username === 'admin' && password === 'admin') {
                    // Create session for local test admin
                    const { ipAddress, userAgent } =
                        SessionManager.getClientInfo(req);
                    const session = await SessionManager.createSession(
                        1,
                        ipAddress,
                        userAgent,
                        'password'
                    );

                    return successResponse(
                        res,
                        {
                            token: session.session_token,
                            user: {
                                username: 'admin',
                                firstName: 'Test',
                                middleName: 'Local',
                                lastName: 'Admin',
                                email: 'admin@test.com',
                                roles: ['admin'],
                                roleKeys: [1],
                                isAdmin: true,
                                passwordChangeRequired: false,
                                authVersion: '2.0',
                            },
                            session: {
                                expiresAt: session.expires_at,
                                sessionKey: session.session_key,
                            },
                        },
                        'Login successful'
                    );
                } else if (username === 'newuser' && password === 'newuser') {
                    // Test user that requires password change
                    const { ipAddress, userAgent } =
                        SessionManager.getClientInfo(req);
                    const session = await SessionManager.createSession(
                        2,
                        ipAddress,
                        userAgent,
                        'password'
                    );

                    return successResponse(
                        res,
                        {
                            token: session.session_token,
                            user: {
                                username: 'newuser',
                                firstName: 'New',
                                middleName: '',
                                lastName: 'User',
                                email: 'newuser@test.com',
                                roles: ['user'],
                                roleKeys: [2],
                                isAdmin: false,
                                passwordChangeRequired: true,
                                authVersion: '2.0',
                            },
                            session: {
                                expiresAt: session.expires_at,
                                sessionKey: session.session_key,
                            },
                        },
                        'Login successful'
                    );
                } else {
                    return unauthorizedResponse(
                        res,
                        'Invalid username or password (use admin/admin for local testing)'
                    );
                }
            }

            // Production database logic
            const { username, password, twofaToken } = req.body;

            // Query user data including name information and roles
            const userResult = await pool.query(
                `SELECT u.*, n.first_name, n.middle_name, n.last_name 
             FROM tbl_user u 
             LEFT JOIN tbl_name_data n ON u.name_key = n.name_key 
             WHERE LOWER(u.username) = LOWER($1)`,
                [username]
            );

            if (userResult.rows.length === 0) {
                return unauthorizedResponse(
                    res,
                    'Invalid username or password'
                );
            }

            const user = userResult.rows[0];
            const validPassword = await bcrypt.compare(
                password,
                user.password_hash
            );

            if (!validPassword) {
                return unauthorizedResponse(
                    res,
                    'Invalid username or password'
                );
            }

            // Check if user has 2FA enabled
            if (user.twofa_enabled) {
                if (!twofaToken) {
                    return errorResponse(res, '2FA token required', 400);
                }

                // Verify 2FA token
                const verified = speakeasy.totp.verify({
                    secret: user.twofa_secret,
                    encoding: 'base32',
                    token: twofaToken,
                    window: 2,
                });

                // If TOTP fails, check backup codes
                let backupCodeUsed = false;
                if (!verified && user.backup_codes) {
                    const backupCodes = JSON.parse(user.backup_codes);
                    const codeIndex = backupCodes.indexOf(twofaToken);

                    if (codeIndex !== -1) {
                        // Remove used backup code
                        backupCodes.splice(codeIndex, 1);
                        await pool.query(
                            'UPDATE tbl_user SET backup_codes = $1, date_when = NOW() WHERE user_key = $2',
                            [JSON.stringify(backupCodes), user.user_key]
                        );
                        backupCodeUsed = true;
                    }
                }

                if (!verified && !backupCodeUsed) {
                    return unauthorizedResponse(res, 'Invalid 2FA code');
                }
            }

            // Query user roles
            const rolesResult = await pool.query(
                `SELECT r.role_key, r.role_name 
             FROM tbl_role r
             JOIN tbl_user_role ur ON r.role_key = ur.role_key
             WHERE ur.user_key = $1`,
                [user.user_key]
            );

            const roles = rolesResult.rows.map((row) => row.role_name);
            const roleKeys = rolesResult.rows.map((row) => row.role_key);

            // Check if user has admin role
            const isAdmin =
                roleKeys.includes(1) ||
                roleKeys.includes('1') ||
                roles.some((role) => {
                    const roleLower = role.toLowerCase();
                    return (
                        roleLower.includes('admin') ||
                        roleLower.includes('administrator') ||
                        roleLower === 'admin'
                    );
                }); // Determine login method based on authentication
            let loginMethod = 'password';
            if (user.twofa_enabled && twofaToken) {
                loginMethod = backupCodeUsed ? 'backup_code' : '2fa';
            }

            // Get client information
            const { ipAddress, userAgent } = SessionManager.getClientInfo(req);

            // Create session first to get the new session token
            const session = await SessionManager.createSession(
                user.user_key,
                ipAddress,
                userAgent,
                loginMethod
            );

            // SINGLE SESSION ENFORCEMENT: Revoke all other existing sessions for this user
            // This ensures only one active session per user at a time
            console.log(
                `🔐 SINGLE SESSION ENFORCEMENT: Revoking other sessions for user ${user.username}`
            );
            const revokedCount = await SessionManager.revokeUserSessions(
                user.user_key,
                'new_login_single_session_enforcement',
                session.session_token // Exclude the newly created session
            );

            if (revokedCount > 0) {
                console.log(
                    `🔐 Revoked ${revokedCount} existing sessions for user ${user.username}, keeping only the new session`
                );
            } else {
                console.log(
                    `🔐 No existing sessions found for user ${user.username}, new session is the only one`
                );
            }
            return successResponse(
                res,
                {
                    token: session.session_token,
                    user: {
                        username: user.username,
                        firstName: user.first_name,
                        middleName: user.middle_name,
                        lastName: user.last_name,
                        email: user.email,
                        roles: roles,
                        roleKeys: roleKeys,
                        isAdmin: isAdmin,
                        twofa_enabled: user.twofa_enabled || false,
                        passwordChangeRequired:
                            user.password_change_required || false,
                        authVersion: '2.0',
                    },
                    session: {
                        expiresAt: session.expires_at,
                        sessionKey: session.session_key,
                    },
                },
                'Login successful'
            );
        } catch (err) {
            console.error('Login error:', err);
            return errorResponse(res, 'Internal server error', 500);
        }
    }
);

// Server-side logout endpoint for session termination
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        const sessionToken = SessionManager.extractSessionToken(req);

        if (sessionToken) {
            // End the session
            const sessionEnded = await SessionManager.endSession(
                sessionToken,
                'user_logout'
            );

            if (sessionEnded) {
                console.log(
                    `User ${
                        req.user.username
                    } logged out at ${new Date().toISOString()}`
                );
                return successResponse(res, null, 'Successfully logged out');
            } else {
                console.warn(
                    `Failed to end session for user ${req.user.username}`
                );
                return successResponse(
                    res,
                    null,
                    'Logout completed (session may have already expired)'
                );
            }
        } else {
            return successResponse(res, null, 'No active session found');
        }
    } catch (err) {
        console.error('Logout error:', err);
        return errorResponse(res, 'Logout failed', 500);
    }
});

module.exports = router;
