// Health Check Routes
// Server and database health monitoring endpoints

const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { checkDatabaseConnection } = require("../config/database");
const {
  successResponse,
  serverErrorResponse,
} = require("../utils/responseHelpers");
const config = require("../config/environment");

// Authenticated health check endpoint for internal monitoring
router.get("/health", authenticateToken, async (req, res) => {
  try {
    const dbStatus = await checkDatabaseConnection();

    if (dbStatus.connected) {
      return successResponse(
        res,
        {
          status: "healthy",
          database: "connected",
        },
        "System is healthy"
      );
    } else {
      return res.status(503).json({
        status: "unhealthy",
        database: "disconnected",
        error: "Database connection failed",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    return serverErrorResponse(res, "Health check failed");
  }
});

// Public health check endpoint for basic connectivity testing (no auth required)
router.get("/health/public", async (req, res) => {
  try {
    const dbStatus = await checkDatabaseConnection();

    if (dbStatus.connected) {
      return successResponse(
        res,
        {
          status: "healthy",
          database: "connected",
        },
        "System is healthy"
      );
    } else {
      return res.status(503).json({
        status: "unhealthy",
        database: "disconnected",
        error: "Database connection failed",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    return res.status(503).json({
      status: "unhealthy",
      database: "disconnected",
      error: "Database connection failed",
      timestamp: new Date().toISOString(),
    });
  }
});

// Database diagnostic endpoint (authenticated)
router.get("/health/database", authenticateToken, async (req, res) => {
  try {
    const { pool } = require("../config/database");
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

      const existingTables = tablesCheck.rows.map((row) => row.table_name);

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
            count: "error",
            error: err.message,
          };
        }
      }

      // Mark missing tables
      const allTables = ["tbl_user", "tbl_user_session", "tbl_patient"];
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
          status: "database_diagnostic",
          tables: tableStats,
          existing_tables: existingTables,
          total_tables_found: existingTables.length,
        },
        "Database diagnostic completed"
      );
    } finally {
      client.release();
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Database diagnostic failed",
      details: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
