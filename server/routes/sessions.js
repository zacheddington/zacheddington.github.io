// Session Management Routes
// Admin endpoints for viewing and managing user sessions

const express = require("express");
const router = express.Router();
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const SessionManager = require("../utils/sessionManager");
const {
  successResponse,
  errorResponse,
  updatedResponse,
} = require("../utils/responseHelpers");

// Get all active sessions (admin only)
router.get("/sessions", authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get all sessions across all users for admin view
    const sessions = await SessionManager.getAllSessions();

    return successResponse(
      res,
      sessions,
      "All sessions retrieved successfully"
    );
  } catch (err) {
    return errorResponse(res, `Failed to fetch sessions: ${err.message}`, 500);
  }
});

// Get current user's sessions
router.get("/my-sessions", authenticateToken, async (req, res) => {
  try {
    const sessions = await SessionManager.getUserSessions(req.user.userId);
    return successResponse(
      res,
      sessions,
      "Your sessions retrieved successfully"
    );
  } catch (err) {
    return errorResponse(res, "Failed to fetch your sessions", 500);
  }
});

// Revoke a specific session (admin or self)
router.post(
  "/sessions/:sessionId/revoke",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const { reason = "admin_revocation" } = req.body;

      const result = await SessionManager.revokeSessionById(sessionId, reason);

      if (result) {
        return successResponse(
          res,
          { sessionId },
          "Session revoked successfully"
        );
      } else {
        return errorResponse(res, "Session not found or already revoked", 404);
      }
    } catch (err) {
      return errorResponse(res, "Failed to revoke session", 500);
    }
  }
);

// Alternative revoke session endpoint that accepts sessionId in request body
// This is more reliable for complex JWT tokens that might have URL encoding issues
router.post(
  "/sessions/revoke",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { sessionId, reason = "admin_revocation" } = req.body;

      if (!sessionId) {
        return errorResponse(
          res,
          "Session ID is required in request body",
          400
        );
      }

      const result = await SessionManager.revokeSessionById(sessionId, reason);

      if (result) {
        return successResponse(
          res,
          { sessionId },
          "Session revoked successfully"
        );
      } else {
        return errorResponse(res, "Session not found or already revoked", 404);
      }
    } catch (err) {
      return errorResponse(res, "Failed to revoke session", 500);
    }
  }
);
// Revoke all sessions for a user by username (admin only)
router.post(
  "/sessions/revoke-user/:username",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const username = req.params.username;
      const { reason = "admin_bulk_revocation" } = req.body;

      const revokedCount = await SessionManager.revokeUserSessionsByUsername(
        username,
        reason
      );

      return updatedResponse(
        res,
        { username, revokedCount },
        `Revoked ${revokedCount} sessions for user ${username}`
      );
    } catch (err) {
      return errorResponse(res, "Failed to revoke user sessions", 500);
    }
  }
);

// Force logout all sessions except current (useful for password changes)
router.post("/revoke-other-sessions", authenticateToken, async (req, res) => {
  try {
    const currentSessionToken = SessionManager.extractSessionToken(req);
    const revokedCount = await SessionManager.revokeUserSessions(
      req.user.userId,
      "security_action",
      currentSessionToken
    );

    return successResponse(
      res,
      { revokedCount },
      `Revoked ${revokedCount} other sessions`
    );
  } catch (err) {
    return errorResponse(res, "Failed to revoke other sessions", 500);
  }
});

// Check if current session is valid
router.get("/sessions/check", authenticateToken, async (req, res) => {
  try {
    const sessionInfo = {
      message: "Session is valid and active",
      timestamp: new Date().toISOString(),
      user: {
        userId: req.user.userId,
        username: req.user.username,
        sessionKey: req.user.sessionKey,
      },
      session: {
        token: req.session.token.substring(0, 20) + "...",
        expiresAt: req.session.expiresAt,
      },
    };

    return successResponse(res, sessionInfo, "Session validation successful");
  } catch (err) {
    return errorResponse(res, "Failed to validate session", 500);
  }
});

// Manual session cleanup (admin only)
router.post(
  "/sessions/cleanup",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const result = await SessionManager.cleanupExpiredSessions();

      // Handle both old format (number) and new format (object)
      const expiredCount = result.expiredCount || 0;
      const deletedCount = result.deletedCount || 0;
      const totalCleaned = result.totalCleaned || result || 0;

      return successResponse(
        res,
        { expiredCount, deletedCount, totalCleaned },
        `Marked ${expiredCount} sessions as expired, deleted ${deletedCount} old sessions`
      );
    } catch (err) {
      console.error("Session cleanup error:", err);
      return errorResponse(res, "Failed to cleanup sessions", 500);
    }
  }
);

module.exports = router;
