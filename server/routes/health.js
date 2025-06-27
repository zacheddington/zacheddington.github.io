// Health Check Routes
// Server and database health monitoring endpoints

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkDatabaseConnection } = require('../config/database');
const {
    successResponse,
    serverErrorResponse,
} = require('../utils/responseHelpers');
const config = require('../config/environment');

// Authenticated health check endpoint for internal monitoring
router.get('/health', authenticateToken, async (req, res) => {
    try {
        const dbStatus = await checkDatabaseConnection();

        if (dbStatus.connected) {
            return successResponse(
                res,
                {
                    status: 'healthy',
                    database: 'connected',
                },
                'System is healthy'
            );
        } else {
            return res.status(503).json({
                status: 'unhealthy',
                database: 'disconnected',
                error: 'Database connection failed',
                timestamp: new Date().toISOString(),
            });
        }
    } catch (err) {
        console.error('Health check failed:', err);
        return serverErrorResponse(res, 'Health check failed');
    }
});

// Public health check endpoint for basic connectivity testing (no auth required)
router.get('/health/public', async (req, res) => {
    try {
        const dbStatus = await checkDatabaseConnection();

        if (dbStatus.connected) {
            return successResponse(
                res,
                {
                    status: 'healthy',
                    database: 'connected',
                },
                'System is healthy'
            );
        } else {
            return res.status(503).json({
                status: 'unhealthy',
                database: 'disconnected',
                error: 'Database connection failed',
                timestamp: new Date().toISOString(),
            });
        }
    } catch (err) {
        console.error('Public health check failed:', err);
        return res.status(503).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: 'Database connection failed',
            timestamp: new Date().toISOString(),
        });
    }
});

// Database diagnostic endpoint (authenticated)
router.get('/health/database', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../config/database');
        const client = await pool.connect();

        try {
            // Check if main tables exist
            const tablesCheck = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('tbl_user', 'tbl_user_session', 'tbl_patient')
        ORDER BY table_name
      `);

            const existingTables = tablesCheck.rows.map(
                (row) => row.table_name
            );

            // Check record counts for existing tables
            const tableStats = {};
            for (const tableName of existingTables) {
                try {
                    const countResult = await client.query(
                        `SELECT COUNT(*) as count FROM ${tableName}`
                    );
                    tableStats[tableName] = {
                        exists: true,
                        count: parseInt(countResult.rows[0].count),
                    };
                } catch (err) {
                    tableStats[tableName] = {
                        exists: true,
                        count: 'error',
                        error: err.message,
                    };
                }
            }

            // Mark missing tables
            const allTables = ['tbl_user', 'tbl_user_session', 'tbl_patient'];
            for (const tableName of allTables) {
                if (!existingTables.includes(tableName)) {
                    tableStats[tableName] = {
                        exists: false,
                        count: 0,
                    };
                }
            }

            return successResponse(
                res,
                {
                    status: 'database_diagnostic',
                    tables: tableStats,
                    existing_tables: existingTables,
                    total_tables_found: existingTables.length,
                },
                'Database diagnostic completed'
            );
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Database diagnostic failed:', err);
        return res.status(500).json({
            success: false,
            error: 'Database diagnostic failed',
            details: err.message,
            timestamp: new Date().toISOString(),
        });
    }
});

// Temporary public diagnostic endpoint (remove after debugging)
router.get('/health/database/public', async (req, res) => {
    try {
        const { pool } = require('../config/database');
        const client = await pool.connect();

        try {
            // Check if main tables exist
            const tablesCheck = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('tbl_user', 'tbl_user_session', 'tbl_patient')
        ORDER BY table_name
      `);

            const existingTables = tablesCheck.rows.map(
                (row) => row.table_name
            );

            return res.json({
                success: true,
                status: 'public_database_diagnostic',
                existing_tables: existingTables,
                total_tables_found: existingTables.length,
                timestamp: new Date().toISOString(),
            });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Public database diagnostic failed:', err);
        return res.status(500).json({
            success: false,
            error: 'Public database diagnostic failed',
            details: err.message,
            timestamp: new Date().toISOString(),
        });
    }
});

// Session debugging endpoint - tests each step individually
router.get('/health/sessions/debug', async (req, res) => {
    const results = {
        steps: [],
        success: false,
        error: null,
    };

    try {
        const { pool } = require('../config/database');

        // Step 1: Check config
        results.steps.push({
            step: 1,
            name: 'config_check',
            success: true,
            data: { status: 'production' },
        });

        // Step 2: Database connection
        let client;
        try {
            client = await pool.connect();
            results.steps.push({
                step: 2,
                name: 'database_connection',
                success: true,
                data: 'Connected successfully',
            });
        } catch (err) {
            results.steps.push({
                step: 2,
                name: 'database_connection',
                success: false,
                error: err.message,
            });
            throw err;
        }

        try {
            // Step 3: Check session table structure
            const sessionTableInfo = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'tbl_user_session' 
        ORDER BY ordinal_position
      `);

            results.steps.push({
                step: 3,
                name: 'session_table_structure',
                success: true,
                data: sessionTableInfo.rows,
            });

            // Step 4: Check user table structure
            const userTableInfo = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'tbl_user' 
        ORDER BY ordinal_position
      `);

            results.steps.push({
                step: 4,
                name: 'user_table_structure',
                success: true,
                data: userTableInfo.rows,
            });

            // Step 5: Count records in each table
            const sessionCount = await client.query(
                `SELECT COUNT(*) as count FROM tbl_user_session`
            );
            const userCount = await client.query(
                `SELECT COUNT(*) as count FROM tbl_user`
            );

            results.steps.push({
                step: 5,
                name: 'record_counts',
                success: true,
                data: {
                    sessions: parseInt(sessionCount.rows[0].count),
                    users: parseInt(userCount.rows[0].count),
                },
            });

            // Step 6: Test simple session query (no JOIN)
            const simpleSessions = await client.query(`
        SELECT session_key, user_key, session_token, is_active 
        FROM tbl_user_session 
        LIMIT 5
      `);

            results.steps.push({
                step: 6,
                name: 'simple_session_query',
                success: true,
                data: {
                    rowCount: simpleSessions.rows.length,
                    sample: simpleSessions.rows,
                },
            });

            // Step 7: Test simple user query
            const simpleUsers = await client.query(`
        SELECT user_key, username 
        FROM tbl_user 
        LIMIT 5
      `);

            results.steps.push({
                step: 7,
                name: 'simple_user_query',
                success: true,
                data: {
                    rowCount: simpleUsers.rows.length,
                    sample: simpleUsers.rows,
                },
            });

            // Step 8: Test the JOIN query
            try {
                const joinQuery = await client.query(`
          SELECT 
              s.session_token as session_id,
              u.username,
              s.is_active,
              s.login_time,
              s.last_activity,
              s.logout_time,
              s.ip_address,
              s.browser_info,
              s.login_method
          FROM tbl_user_session s
          JOIN tbl_user u ON s.user_key = u.user_key
          ORDER BY s.login_time DESC
          LIMIT 5
        `);

                results.steps.push({
                    step: 8,
                    name: 'join_query',
                    success: true,
                    data: {
                        rowCount: joinQuery.rows.length,
                        sample: joinQuery.rows,
                    },
                });

                results.success = true;
            } catch (joinErr) {
                results.steps.push({
                    step: 8,
                    name: 'join_query',
                    success: false,
                    error: {
                        message: joinErr.message,
                        code: joinErr.code,
                        detail: joinErr.detail,
                    },
                });
                throw joinErr;
            }
        } finally {
            client.release();
        }

        return res.json({
            success: true,
            message: 'Session debugging completed successfully',
            results: results,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        results.error = {
            message: err.message,
            code: err.code,
            detail: err.detail,
        };

        return res.status(500).json({
            success: false,
            error: 'Session debugging failed',
            results: results,
            timestamp: new Date().toISOString(),
        });
    }
});

module.exports = router;
