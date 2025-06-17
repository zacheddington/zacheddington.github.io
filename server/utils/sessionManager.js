// Session Management Utilities
// Handles session creation, validation, cleanup, and tracking

const { pool } = require('../config/database');
const jwt = require('jsonwebtoken');
const config = require('../config/environment');

class SessionManager {
    // Create a new session
    static async createSession(
        userKey,
        ipAddress,
        userAgent,
        loginMethod = 'password'
    ) {
        if (config.isLocalTest) {
            // For local testing, return mock session
            return {
                session_key: 1,
                session_token: 'test-session-token',
                expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
                is_active: true,
            };
        }

        const client = await pool.connect();
        try {
            // Generate unique session token
            const sessionToken = jwt.sign(
                {
                    userKey,
                    timestamp: Date.now(),
                    loginMethod,
                },
                config.JWT_SECRET,
                { expiresIn: '8h' }
            );

            // Create session record
            const result = await client.query(
                `
                INSERT INTO tbl_user_session 
                (user_key, session_token, ip_address, user_agent, login_method) 
                VALUES ($1, $2, $3, $4, $5) 
                RETURNING session_key, session_token, expires_at, is_active
            `,
                [userKey, sessionToken, ipAddress, userAgent, loginMethod]
            );

            return result.rows[0];
        } finally {
            client.release();
        }
    }

    // Update session activity
    static async updateActivity(sessionToken) {
        if (config.isLocalTest) {
            return true;
        }

        const client = await pool.connect();
        try {
            const result = await client.query(
                `
                UPDATE tbl_user_session 
                SET last_activity = CURRENT_TIMESTAMP
                WHERE session_token = $1 AND is_active = true AND NOT revoked
                AND expires_at > CURRENT_TIMESTAMP
            `,
                [sessionToken]
            );

            return result.rowCount > 0;
        } finally {
            client.release();
        }
    }

    // Validate session
    static async validateSession(sessionToken) {
        if (config.isLocalTest) {
            // Return mock user for local testing
            return {
                user_key: 1,
                username: 'admin',
                session_key: 1,
                is_active: true,
                expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000),
            };
        }

        const client = await pool.connect();
        try {
            const result = await client.query(
                `
                SELECT 
                    s.session_key,
                    s.user_key,
                    s.expires_at,
                    s.is_active,
                    s.revoked,
                    u.username,
                    u.email,
                    u.password_change_required,
                    u.twofa_enabled
                FROM tbl_user_session s
                JOIN tbl_user u ON s.user_key = u.user_key
                WHERE s.session_token = $1 
                AND s.is_active = true 
                AND NOT s.revoked
                AND s.expires_at > CURRENT_TIMESTAMP
            `,
                [sessionToken]
            );

            if (result.rows.length === 0) {
                return null;
            }

            // Update last activity
            await this.updateActivity(sessionToken);

            return result.rows[0];
        } finally {
            client.release();
        }
    }

    // End session (logout)
    static async endSession(sessionToken, reason = 'user_logout') {
        if (config.isLocalTest) {
            return true;
        }

        const client = await pool.connect();
        try {
            const result = await client.query(
                `
                UPDATE tbl_user_session 
                SET logout_time = CURRENT_TIMESTAMP, 
                    is_active = false, 
                    revoked_reason = $2
                WHERE session_token = $1
            `,
                [sessionToken, reason]
            );

            return result.rowCount > 0;
        } finally {
            client.release();
        }
    }

    // Revoke all sessions for a user
    static async revokeUserSessions(
        userKey,
        reason = 'admin_action',
        excludeSessionToken = null
    ) {
        if (config.isLocalTest) {
            return true;
        }

        const client = await pool.connect();
        try {
            let query = `
                UPDATE tbl_user_session 
                SET revoked = true, 
                    is_active = false, 
                    logout_time = CURRENT_TIMESTAMP,
                    revoked_reason = $2
                WHERE user_key = $1 AND is_active = true
            `;

            const params = [userKey, reason];

            if (excludeSessionToken) {
                query += ` AND session_token != $3`;
                params.push(excludeSessionToken);
            }

            const result = await client.query(query, params);
            return result.rowCount;
        } finally {
            client.release();
        }
    }

    // Clean up expired sessions
    static async cleanupExpiredSessions() {
        if (config.isLocalTest) {
            console.log('Session cleanup skipped in local test mode');
            return 0;
        }

        const client = await pool.connect();
        try {
            const result = await client.query(`
                UPDATE tbl_user_session 
                SET is_active = false, 
                    logout_time = CURRENT_TIMESTAMP,
                    revoked_reason = 'expired'
                WHERE is_active = true 
                AND expires_at <= CURRENT_TIMESTAMP
            `);

            console.log(`Cleaned up ${result.rowCount} expired sessions`);
            return result.rowCount;
        } finally {
            client.release();
        }
    }

    // Get active sessions for a user
    static async getUserSessions(userKey) {
        if (config.isLocalTest) {
            return [
                {
                    session_key: 1,
                    login_time: new Date(),
                    last_activity: new Date(),
                    ip_address: '127.0.0.1',
                    user_agent: 'Test Browser',
                    login_method: 'password',
                },
            ];
        }

        const client = await pool.connect();
        try {
            const result = await client.query(
                `
                SELECT 
                    session_key,
                    login_time,
                    last_activity,
                    ip_address,
                    user_agent,
                    login_method,
                    expires_at
                FROM tbl_user_session 
                WHERE user_key = $1 
                AND is_active = true 
                AND NOT revoked
                ORDER BY last_activity DESC
            `,
                [userKey]
            );

            return result.rows;
        } finally {
            client.release();
        }
    }

    // Extract session token from request
    static extractSessionToken(req) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        return null;
    }

    // Get client info from request
    static getClientInfo(req) {
        const ipAddress =
            req.ip ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            (req.connection.socket
                ? req.connection.socket.remoteAddress
                : null) ||
            '127.0.0.1';

        const userAgent = req.headers['user-agent'] || 'Unknown';

        return { ipAddress, userAgent };
    }
}

module.exports = SessionManager;
