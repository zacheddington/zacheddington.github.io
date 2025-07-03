// Authentication Middleware
// Session-based authentication with JWT tokens

const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const SessionManager = require('../utils/sessionManager');

// Middleware to authenticate tokens and validate sessions
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res
            .status(401)
            .json({ error: 'Access denied. No token provided.' });
    }

    try {
        // First verify JWT structure
        const decoded = jwt.verify(token, config.JWT_SECRET);

        // Then validate the session
        const sessionValidation = await SessionManager.validateSession(token);

        if (!sessionValidation.valid) {
            let errorMessage =
                'Session expired or invalid. Please log in again.';

            // Provide specific messages based on the reason
            if (sessionValidation.reason === 'session_revoked') {
                if (
                    sessionValidation.revoked_reason ===
                    'new_login_single_session_enforcement'
                ) {
                    errorMessage =
                        'You have been logged out because you logged in from another location. Only one session is allowed per user.';
                } else if (
                    sessionValidation.revoked_reason === 'admin_revocation'
                ) {
                    errorMessage =
                        'Your session has been revoked by an administrator.';
                } else {
                    errorMessage =
                        'Your session has been revoked. Please log in again.';
                }
            } else if (sessionValidation.reason === 'session_expired') {
                errorMessage = 'Your session has expired. Please log in again.';
            } else if (sessionValidation.reason === 'session_inactive') {
                errorMessage =
                    'Your session is no longer active. Please log in again.';
            }

            return res.status(403).json({
                error: errorMessage,
                reason: sessionValidation.reason,
                revoked_reason: sessionValidation.revoked_reason,
            });
        }

        const sessionData = sessionValidation.session;

        // Attach user and session info to request
        req.user = {
            userId: sessionData.user_key,
            username: sessionData.username,
            email: sessionData.email,
            passwordChangeRequired: sessionData.password_change_required,
            twofaEnabled: sessionData.twofa_enabled,
            sessionKey: sessionData.session_key,
        };

        req.session = {
            token: token,
            key: sessionData.session_key,
            expiresAt: sessionData.expires_at,
        };

        next();
    } catch (err) {
        console.error('AUTH: Token validation failed:', err.message);
        res.status(403).json({ error: 'Invalid token.' });
    }
};

// Middleware to check if user has admin privileges
const requireAdmin = async (req, res, next) => {
    // First ensure user is authenticated
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.' });
    }

    try {
        // Query user roles from database
        const { pool } = require('../config/database');
        const client = await pool.connect();

        try {
            const roleResult = await client.query(
                `
                SELECT r.role_key, r.role_name
                FROM tbl_user_role ur
                JOIN tbl_role r ON ur.role_key = r.role_key
                WHERE ur.user_key = $1
            `,
                [req.user.userId]
            );

            const isAdmin = roleResult.rows.some(
                (role) =>
                    role.role_key === 1 ||
                    role.role_name.toLowerCase().includes('admin')
            );

            if (!isAdmin) {
                return res.status(403).json({
                    error: 'Access denied. Admin privileges required.',
                });
            }

            next();
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('AUTH: Admin check error:', err);
        return res.status(500).json({ error: 'Authorization check failed.' });
    }
};

// Middleware to prevent self-modification (users can't modify their own admin status)
const preventSelfModification = (req, res, next) => {
    const targetUserId = parseInt(req.params.userId);
    const currentUserId = req.user.userId; // Updated to match new user structure

    if (targetUserId === currentUserId) {
        return res.status(400).json({
            error: 'Cannot modify your own account through this endpoint.',
        });
    }

    next();
};

module.exports = {
    authenticateToken,
    requireAdmin,
    preventSelfModification,
};
