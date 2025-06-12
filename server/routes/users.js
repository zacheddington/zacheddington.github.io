// User Management Routes
// Admin endpoints for user creation, management, and role assignment

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

const {
  authenticateToken,
  requireAdmin,
  preventSelfModification,
} = require("../middleware/auth");
const {
  validateRequiredFields,
  validateFieldLengths,
  validateEmail,
  sanitizeInput,
} = require("../middleware/validation");
const { pool } = require("../config/database");
const { validatePasswordSecurity } = require("../utils/passwordValidator");
const {
  successResponse,
  errorResponse,
  createdResponse,
  updatedResponse,
  deletedResponse,
  conflictResponse,
  notFoundResponse,
} = require("../utils/responseHelpers");
const { FIELD_LIMITS } = require("../utils/constants");
const config = require("../config/environment");

// Get all roles endpoint for admin management
router.get("/roles", authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (config.isLocalTest) {
      // Return test roles for local development
      return successResponse(
        res,
        [
          { role_key: 1, role_name: "Administrator" },
          { role_key: 2, role_name: "User" },
          { role_key: 3, role_name: "Viewer" },
        ],
        "Roles retrieved successfully"
      );
    }

    // Production database logic
    const rolesResult = await pool.query(
      "SELECT role_key, role_name FROM tbl_role ORDER BY role_name"
    );

    return successResponse(
      res,
      rolesResult.rows,
      "Roles retrieved successfully"
    );
  } catch (err) {
    console.error("Get roles error:", err);
    return errorResponse(res, "Failed to fetch roles", 500);
  }
});

// Create user endpoint
router.post(
  "/create-user",
  authenticateToken,
  requireAdmin,
  sanitizeInput,
  validateRequiredFields([
    "firstName",
    "lastName",
    "email",
    "username",
    "password",
    "roleKey",
  ]),
  validateFieldLengths({
    firstName: FIELD_LIMITS.FIRST_NAME,
    middleName: FIELD_LIMITS.MIDDLE_NAME,
    lastName: FIELD_LIMITS.LAST_NAME,
    email: FIELD_LIMITS.EMAIL,
    username: FIELD_LIMITS.USERNAME,
  }),
  validateEmail,
  async (req, res) => {
    try {
      const {
        firstName,
        middleName,
        lastName,
        email,
        username,
        password,
        roleKey,
      } = req.body;

      // Validate password security
      const passwordValidation = validatePasswordSecurity(password);
      if (!passwordValidation.isValid) {
        return errorResponse(
          res,
          "Password does not meet security requirements",
          400,
          passwordValidation.errors
        );
      }

      if (config.isLocalTest) {
        // For local testing, just return success
        return createdResponse(
          res,
          {
            username,
            firstName,
            middleName,
            lastName,
            email,
            roleKey,
          },
          "User created successfully"
        );
      }

      // Production database logic
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Check if username already exists (case-insensitive)
        const existingUserResult = await client.query(
          "SELECT username FROM tbl_user WHERE LOWER(username) = LOWER($1)",
          [username]
        );

        if (existingUserResult.rows.length > 0) {
          await client.query("ROLLBACK");
          return conflictResponse(
            res,
            "Username already exists. Please choose a different username."
          );
        }

        // Check if email already exists
        const existingEmailResult = await client.query(
          "SELECT email FROM tbl_user WHERE email = $1",
          [email]
        );

        if (existingEmailResult.rows.length > 0) {
          await client.query("ROLLBACK");
          return conflictResponse(
            res,
            "Email address is already registered. Please use a different email."
          );
        }

        // Get the creator's username for the 'who' field
        const creatorUsername = req.user.username;

        // Insert into tbl_name_data
        const nameResult = await client.query(
          "INSERT INTO tbl_name_data (first_name, middle_name, last_name, who, date_when) VALUES ($1, $2, $3, $4, NOW()) RETURNING name_key",
          [firstName, middleName || null, lastName, creatorUsername]
        );

        if (nameResult.rows.length === 0) {
          throw new Error("Failed to create name record");
        }

        const nameKey = nameResult.rows[0].name_key;

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insert into tbl_user
        const userResult = await client.query(
          "INSERT INTO tbl_user (username, password_hash, email, name_key, who, date_created, date_when, password_change_required) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6) RETURNING user_key",
          [username, passwordHash, email, nameKey, creatorUsername, true]
        );

        if (userResult.rows.length === 0) {
          throw new Error("Failed to create user account");
        }

        const userKey = userResult.rows[0].user_key;

        // Insert into tbl_user_role
        const userRoleResult = await client.query(
          "INSERT INTO tbl_user_role (user_key, role_key, date_created, date_when) VALUES ($1, $2, NOW(), NOW())",
          [userKey, roleKey]
        );

        if (userRoleResult.rowCount === 0) {
          throw new Error("Failed to assign user role");
        }

        await client.query("COMMIT");

        return createdResponse(
          res,
          {
            username,
            firstName,
            middleName,
            lastName,
            email,
            roleKey,
            userKey,
            nameKey,
          },
          "User created successfully"
        );
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error("User creation error:", err);
      return errorResponse(
        res,
        err.message || "Failed to create user. Please try again later.",
        500
      );
    }
  }
);

// Check username availability endpoint
router.post(
  "/check-username",
  authenticateToken,
  requireAdmin,
  validateRequiredFields(["username"]),
  async (req, res) => {
    try {
      const { username } = req.body;

      if (config.isLocalTest) {
        // For local testing, simulate availability check
        const unavailableUsernames = ["admin", "test", "user", "guest"];
        const available = !unavailableUsernames.includes(
          username.toLowerCase()
        );
        return successResponse(
          res,
          {
            available,
            message: available
              ? "Username is available"
              : "Username is already taken",
          },
          "Username availability checked"
        );
      }

      // Production database logic
      const result = await pool.query(
        "SELECT username FROM tbl_user WHERE LOWER(username) = LOWER($1)",
        [username]
      );

      const available = result.rows.length === 0;

      return successResponse(
        res,
        {
          available,
          message: available
            ? "Username is available"
            : "Username is already taken",
        },
        "Username availability checked"
      );
    } catch (err) {
      console.error("Username check error:", err);
      return errorResponse(res, "Unable to check username availability", 500);
    }
  }
);

// Get all users endpoint for admin management
router.get("/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (config.isLocalTest) {
      // Return test users for local development
      return successResponse(
        res,
        [
          {
            user_key: 1,
            username: "admin",
            first_name: "Test",
            middle_name: "Local",
            last_name: "Admin",
            email: "admin@test.com",
            date_created: "2024-01-01T00:00:00.000Z",
            roles: ["Administrator"],
            role_keys: [1],
          },
          {
            user_key: 2,
            username: "testuser",
            first_name: "Test",
            middle_name: null,
            last_name: "User",
            email: "user@test.com",
            date_created: "2024-01-02T00:00:00.000Z",
            roles: ["User"],
            role_keys: [2],
          },
        ],
        "Users retrieved successfully"
      );
    }

    // Production database logic
    const usersResult = await pool.query(`
            SELECT 
                u.user_key,
                u.username,
                u.email,
                u.date_created,
                n.first_name,
                n.middle_name,
                n.last_name,
                array_agg(r.role_name ORDER BY r.role_name) as roles,
                array_agg(r.role_key ORDER BY r.role_name) as role_keys
            FROM tbl_user u
            LEFT JOIN tbl_name_data n ON u.name_key = n.name_key
            LEFT JOIN tbl_user_role ur ON u.user_key = ur.user_key
            LEFT JOIN tbl_role r ON ur.role_key = r.role_key
            GROUP BY u.user_key, u.username, u.email, u.date_created, n.first_name, n.middle_name, n.last_name
            ORDER BY u.username
        `);

    return successResponse(
      res,
      usersResult.rows,
      "Users retrieved successfully"
    );
  } catch (err) {
    console.error("Get users error:", err);
    return errorResponse(res, "Failed to fetch users", 500);
  }
});

// Update user role endpoint
router.put(
  "/users/:userId/role",
  authenticateToken,
  requireAdmin,
  preventSelfModification,
  sanitizeInput,
  validateRequiredFields(["roleKey"]),
  async (req, res) => {
    try {
      const userId = req.params.userId;
      const { roleKey } = req.body;

      if (config.isLocalTest) {
        // For local testing, just return success
        return updatedResponse(
          res,
          {
            userId: userId,
            roleKey: roleKey,
          },
          "User role updated successfully"
        );
      }

      // Production database logic
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Verify user exists
        const userCheck = await client.query(
          "SELECT user_key FROM tbl_user WHERE user_key = $1",
          [userId]
        );

        if (userCheck.rows.length === 0) {
          await client.query("ROLLBACK");
          return notFoundResponse(res, "User");
        }

        // Verify role exists
        const roleCheck = await client.query(
          "SELECT role_key FROM tbl_role WHERE role_key = $1",
          [roleKey]
        );

        if (roleCheck.rows.length === 0) {
          await client.query("ROLLBACK");
          return errorResponse(res, "Invalid role selected", 400);
        }

        // Remove existing role assignments for this user
        await client.query("DELETE FROM tbl_user_role WHERE user_key = $1", [
          userId,
        ]);

        // Add new role assignment
        await client.query(
          "INSERT INTO tbl_user_role (user_key, role_key, date_created, date_when) VALUES ($1, $2, NOW(), NOW())",
          [userId, roleKey]
        );

        await client.query("COMMIT");

        return updatedResponse(
          res,
          {
            userId: userId,
            roleKey: roleKey,
          },
          "User role updated successfully"
        );
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error("Update user role error:", err);
      return errorResponse(res, "Failed to update user role", 500);
    }
  }
);

module.exports = router;
