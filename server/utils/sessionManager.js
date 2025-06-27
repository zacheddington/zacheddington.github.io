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
            ); // Create session record
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
        const client = await pool.connect();
        try {
            const result = await client.query(
                `
                SELECT 
                    session_key,
                    login_time,                    last_activity,
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
    } // Get client info from request
    static getClientInfo(req) {
        let ipAddress =
            req.ip ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            (req.connection.socket
                ? req.connection.socket.remoteAddress
                : null) ||
            '127.0.0.1';

        // Clean up IPv6-mapped IPv4 addresses
        if (ipAddress.startsWith('::ffff:')) {
            ipAddress = ipAddress.substring(7);
        }

        const rawUserAgent = req.headers['user-agent'] || 'Unknown';
        const browserInfo = this.parseUserAgent(rawUserAgent);

        return { ipAddress, userAgent: browserInfo };
    }

    // Parse user agent into human-readable format
    static parseUserAgent(userAgentString) {
        if (!userAgentString || userAgentString === 'Unknown') {
            return 'Unknown Browser';
        }

        let browser = 'Unknown';
        let os = 'Unknown';

        // Detect browser
        if (
            userAgentString.includes('Chrome') &&
            !userAgentString.includes('Edg')
        ) {
            browser = 'Chrome';
        } else if (userAgentString.includes('Edg')) {
            browser = 'Edge';
        } else if (userAgentString.includes('Firefox')) {
            browser = 'Firefox';
        } else if (
            userAgentString.includes('Safari') &&
            !userAgentString.includes('Chrome')
        ) {
            browser = 'Safari';
        } else if (
            userAgentString.includes('Opera') ||
            userAgentString.includes('OPR')
        ) {
            browser = 'Opera';
        }

        // Detect operating system
        if (userAgentString.includes('Windows NT 10.0')) {
            os = 'Windows 10/11';
        } else if (userAgentString.includes('Windows NT 6.3')) {
            os = 'Windows 8.1';
        } else if (userAgentString.includes('Windows NT 6.1')) {
            os = 'Windows 7';
        } else if (userAgentString.includes('Windows')) {
            os = 'Windows';
        } else if (
            userAgentString.includes('Mac OS X') ||
            userAgentString.includes('macOS')
        ) {
            os = 'macOS';
        } else if (userAgentString.includes('Linux')) {
            os = 'Linux';
        } else if (userAgentString.includes('Android')) {
            os = 'Android';
        } else if (
            userAgentString.includes('iPhone') ||
            userAgentString.includes('iPad')
        ) {
            os = 'iOS';
        }
        return `${browser} on ${os}`;
    } // Get all sessions for admin view (includes user information)
    static async getAllSessions() {
        try {
            console.log('🗄️ Connecting to production database for sessions...');
            let client;
            try {
                client = await pool.connect();
            } catch (err) {
                console.error('❌ Failed to connect to database:', err.message);
                throw new Error(`Database connection failed: ${err.message}`);
            }

            try {
                // First, check if the tables exist
                const sessionTableCheck = await client.query(`
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'tbl_user_session'
            `);

                if (sessionTableCheck.rows.length === 0) {
                    throw new Error(
                        'tbl_user_session table does not exist. Migration may not have run properly.'
                    );
                }

                const userTableCheck = await client.query(`
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'tbl_user'
            `);

                if (userTableCheck.rows.length === 0) {
                    throw new Error(
                        'tbl_user table does not exist. Database setup incomplete.'
                    );
                } // Check session table data
                const sessionCount = await client.query(
                    `SELECT COUNT(*) as count FROM tbl_user_session`
                );
                console.log(
                    'Session table record count:',
                    sessionCount.rows[0].count
                );

                // If no sessions exist, return empty array
                if (parseInt(sessionCount.rows[0].count) === 0) {
                    console.log('📊 No sessions found, returning empty array');
                    return [];
                }
                console.log('📊 Executing sessions query...');
                // Use LEFT JOIN to handle cases where user might not exist
                const result = await client.query(`
                SELECT 
                    s.session_token as session_id,
                    COALESCE(u.username, 'Unknown User') as username,
                    s.is_active,
                    s.login_time,
                    s.last_activity,
                    s.logout_time,
                    s.ip_address,
                    s.user_agent as browser_info,
                    s.login_method
                FROM tbl_user_session s
                LEFT JOIN tbl_user u ON s.user_key = u.user_key
                ORDER BY s.login_time DESC
            `);
                return result.rows;
            } catch (err) {
                console.error('SESSION MANAGER ERROR in getAllSessions:', err.message);

                // Re-throw with more context
                const enhancedError = new Error(
                    `SessionManager.getAllSessions failed: ${err.message}`
                );
                enhancedError.originalError = err;
                enhancedError.context = 'getAllSessions database operation';
                throw enhancedError;
            } finally {
                client.release();
            }
        } catch (outerErr) {
            console.error(
                '❌ SESSION MANAGER OUTER ERROR - Catastrophic failure in getAllSessions:',
                {
                    message: outerErr.message,
                    stack: outerErr.stack,
                    name: outerErr.name,
                }
            );
            console.error(
                '❌ SESSION MANAGER OUTER ERROR - Full object:',
                JSON.stringify(
                    outerErr,
                    Object.getOwnPropertyNames(outerErr),
                    2
                )
            );

            // Create a user-friendly error
            throw new Error(
                `Critical error in session management: ${outerErr.message}`
            );
        }
    }

    // Revoke a session by session ID
    static async revokeSessionById(sessionId, reason = 'admin_revocation') {
        const client = await pool.connect();
        try {
            const result = await client.query(
                `
                UPDATE tbl_user_session 
                SET is_active = false, 
                    logout_time = CURRENT_TIMESTAMP,
                    logout_reason = $2
                WHERE session_token = $1 AND is_active = true
                RETURNING session_key
            `,
                [sessionId, reason]
            );

            return result.rowCount > 0;
        } finally {
            client.release();
        }
    }

    // Revoke all sessions for a user by username
    static async revokeUserSessionsByUsername(
        username,
        reason = 'admin_action'
    ) {
        const client = await pool.connect();
        try {
            // First get the user_key from username
            const userResult = await client.query(
                'SELECT user_key FROM tbl_user WHERE username = $1',
                [username]
            );

            if (userResult.rowCount === 0) {
                return 0;
            }

            const userKey = userResult.rows[0].user_key;

            // Revoke all active sessions for this user
            const result = await client.query(
                `
                UPDATE tbl_user_session 
                SET is_active = false, 
                    logout_time = CURRENT_TIMESTAMP,
                    logout_reason = $2
                WHERE user_key = $1 AND is_active = true
                RETURNING session_key
            `,
                [userKey, reason]
            );

            return result.rowCount;
        } finally {
            client.release();
        }
    }
}

module.exports = SessionManager;
