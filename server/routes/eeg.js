// EEG Data Management Routes
// Endpoints for EEG data entry and management

const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/auth");
const {
  validateRequiredFields,
  sanitizeInput,
} = require("../middleware/validation");
const { pool } = require("../config/database");
const {
  successResponse,
  errorResponse,
  createdResponse,
} = require("../utils/responseHelpers");
const config = require("../config/environment");

// EEG data entry endpoint
router.post(
  "/eeg",
  authenticateToken,
  sanitizeInput,
  validateRequiredFields(["firstName", "lastName", "who", "datewhen"]),
  async (req, res) => {
    try {
      const { firstName, middleName, lastName, who, datewhen } = req.body;

      if (config.isLocalTest) {
        // For local testing, just return success
        return createdResponse(
          res,
          {
            firstName,
            middleName,
            lastName,
            who,
            datewhen,
            nameKey: "test-name-key",
          },
          "EEG data and patient information saved successfully"
        );
      }

      // Production database logic
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Insert into tbl_name_data
        const nameResult = await client.query(
          "INSERT INTO tbl_name_data (first_name, middle_name, last_name, who, date_when) VALUES ($1, $2, $3, $4, $5) RETURNING name_key",
          [firstName, middleName, lastName, who, datewhen]
        );

        if (nameResult.rows.length === 0) {
          throw new Error("Failed to create name record");
        }

        const nameKey = nameResult.rows[0].name_key;        // Insert into tbl_patient
        await client.query(
          "INSERT INTO tbl_patient (name_key, address, phone, accepts_texts, who, date_when) VALUES ($1, $2, $3, $4, $5, $6)",
          [nameKey, null, null, false, who, datewhen]
        );

        await client.query("COMMIT");

        return createdResponse(
          res,
          {
            firstName,
            middleName,
            lastName,
            who,
            datewhen,
            nameKey,
          },
          "EEG data and patient information saved successfully"
        );
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error("EEG data entry error:", err);
      return errorResponse(res, err.message || "Failed to save EEG data", 500);
    }
  }
);

module.exports = router;
