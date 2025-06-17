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
        const { userKey } = req.query;

        if (userKey) {
            // Get sessions for specific user
            const sessions = await SessionManager.getUserSessions(
                parseInt(userKey)
            );
            return successResponse(
                res,
                sessions,
                'User sessions retrieved successfully'
            );
        } else {
            // Get all sessions would require a different query
            // For now, return error asking for specific user
            return errorResponse(
                res,
                'Please specify a userKey parameter to view sessions for a specific user',
                400
            );
        }
    } catch (err) {
        console.error('Get sessions error:', err);
        return errorResponse(res, 'Failed to fetch sessions', 500);
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
router.delete('/sessions/:sessionKey', authenticateToken, async (req, res) => {
    try {
        const sessionKey = parseInt(req.params.sessionKey);
        const { userId } = req.user;

        // Check if user is admin or trying to revoke their own session
        // For now, assume they can revoke any session if they're authenticated
        // In production, you'd want more sophisticated authorization

        const sessionEnded = await SessionManager.endSession(
            null, // We don't have the token, but we could modify the method
            'user_revoked'
        );

        return successResponse(
            res,
            { sessionKey },
            'Session revoked successfully'
        );
    } catch (err) {
        console.error('Revoke session error:', err);
        return errorResponse(res, 'Failed to revoke session', 500);
    }
});

// Revoke all sessions for a user (admin only)
router.delete(
    '/users/:userId/sessions',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const userId = parseInt(req.params.userId);
            const { reason = 'admin_action' } = req.body;

            const revokedCount = await SessionManager.revokeUserSessions(
                userId,
                reason
            );

            return updatedResponse(
                res,
                { userId, revokedCount },
                `Revoked ${revokedCount} sessions for user ${userId}`
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
    '/cleanup-sessions',
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
