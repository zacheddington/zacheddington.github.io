// Session Management Routes
// Admin endpoints for viewing and managing user sessions

const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const SessionManager = require('../utils/sessionManager');
const {
    successResponse,
    errorResponse,
    updatedResponse,
} = require('../utils/responseHelpers');

// Get all active sessions (admin only)
router.get('/sessions', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Get all sessions across all users for admin view
        const sessions = await SessionManager.getAllSessions();

        return successResponse(
            res,
            sessions,
            'All sessions retrieved successfully'
        );
    } catch (err) {
        console.error('❌ SESSIONS ENDPOINT ERROR - Full details:', {
            message: err.message,
            stack: err.stack,
            code: err.code,
            detail: err.detail,
            name: err.name,
        });
        console.error(
            '❌ SESSIONS ENDPOINT ERROR - Stringified:',
            JSON.stringify(err, Object.getOwnPropertyNames(err), 2)
        );

        return errorResponse(
            res,
            `Failed to fetch sessions: ${err.message}`,
            500
        );
    }
});

// Get current user's sessions
router.get('/my-sessions', authenticateToken, async (req, res) => {
    try {
        const sessions = await SessionManager.getUserSessions(req.user.userId);
        return successResponse(
            res,
            sessions,
            'Your sessions retrieved successfully'
        );
    } catch (err) {
        console.error('Get user sessions error:', err);
        return errorResponse(res, 'Failed to fetch your sessions', 500);
    }
});

// Revoke a specific session (admin or self)
router.post(
    '/sessions/:sessionId/revoke',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const sessionId = req.params.sessionId;
            const { reason = 'admin_revocation' } = req.body;

            console.log('Session revoke request:', {
                sessionId: sessionId,
                sessionIdLength: sessionId.length,
                reason: reason,
                adminUser: req.user.username,
            });

            const result = await SessionManager.revokeSessionById(
                sessionId,
                reason
            );

            if (result) {
                console.log('Session revoked successfully:', sessionId);
                return successResponse(
                    res,
                    { sessionId },
                    'Session revoked successfully'
                );
            } else {
                console.log('Session not found or already revoked:', sessionId);
                return errorResponse(
                    res,
                    'Session not found or already revoked',
                    404
                );
            }
        } catch (err) {
            console.error('Revoke session error:', {
                error: err.message,
                stack: err.stack,
                sessionId: req.params.sessionId,
            });
            return errorResponse(res, 'Failed to revoke session', 500);
        }
    }
);

// Alternative revoke session endpoint that accepts sessionId in request body
// This is more reliable for complex JWT tokens that might have URL encoding issues
router.post(
    '/sessions/revoke',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const { sessionId, reason = 'admin_revocation' } = req.body;

            if (!sessionId) {
                return errorResponse(
                    res,
                    'Session ID is required in request body',
                    400
                );
            }

            console.log('Session revoke request (body method):', {
                sessionId: sessionId,
                sessionIdLength: sessionId.length,
                reason: reason,
                adminUser: req.user.username,
            });

            const result = await SessionManager.revokeSessionById(
                sessionId,
                reason
            );

            if (result) {
                console.log(
                    'Session revoked successfully (body method):',
                    sessionId
                );
                return successResponse(
                    res,
                    { sessionId },
                    'Session revoked successfully'
                );
            } else {
                console.log(
                    'Session not found or already revoked (body method):',
                    sessionId
                );
                return errorResponse(
                    res,
                    'Session not found or already revoked',
                    404
                );
            }
        } catch (err) {
            console.error('Revoke session error (body method):', {
                error: err.message,
                stack: err.stack,
                sessionId: req.body.sessionId,
            });
            return errorResponse(res, 'Failed to revoke session', 500);
        }
    }
);

// Revoke all sessions for a user by username (admin only)
router.post(
    '/sessions/revoke-user/:username',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const username = req.params.username;
            const { reason = 'admin_bulk_revocation' } = req.body;

            const revokedCount =
                await SessionManager.revokeUserSessionsByUsername(
                    username,
                    reason
                );

            return updatedResponse(
                res,
                { username, revokedCount },
                `Revoked ${revokedCount} sessions for user ${username}`
            );
        } catch (err) {
            console.error('Revoke user sessions error:', err);
            return errorResponse(res, 'Failed to revoke user sessions', 500);
        }
    }
);

// Force logout all sessions except current (useful for password changes)
router.post('/revoke-other-sessions', authenticateToken, async (req, res) => {
    try {
        const currentSessionToken = SessionManager.extractSessionToken(req);
        const revokedCount = await SessionManager.revokeUserSessions(
            req.user.userId,
            'security_action',
            currentSessionToken
        );

        return successResponse(
            res,
            { revokedCount },
            `Revoked ${revokedCount} other sessions`
        );
    } catch (err) {
        console.error('Revoke other sessions error:', err);
        return errorResponse(res, 'Failed to revoke other sessions', 500);
    }
});

// Manual session cleanup (admin only)
router.post(
    '/sessions/cleanup',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const cleanedCount = await SessionManager.cleanupExpiredSessions();

            return successResponse(
                res,
                { cleanedCount },
                `Cleaned up ${cleanedCount} expired sessions`
            );
        } catch (err) {
            console.error('Session cleanup error:', err);
            return errorResponse(res, 'Failed to cleanup sessions', 500);
        }
    }
);

module.exports = router;
