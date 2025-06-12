// Database Migration Management
// Handles schema updates and database initialization

const { pool } = require("../config/database");
const config = require("../config/environment");

// Database migration function
const runDatabaseMigrations = async () => {
  try {
    // Skip migration if no valid database URL is configured
    if (!config.DATABASE_URL || config.DATABASE_URL.includes("username")) {
      console.log("No valid database configuration found, skipping migrations");
      return;
    }

    const client = await pool.connect();

    try {
      console.log("Starting database migrations...");

      // Check if password_change_required column exists, if not add it
      await addPasswordChangeRequiredColumn(client);

      // Add 2FA columns
      await add2FAColumns(client);

      console.log("Database migration completed successfully");
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Database migration error:", err.message);
    // Don't fail server startup for migration errors
    console.log("Continuing server startup without database migrations");
  }
};

// Add password_change_required column
const addPasswordChangeRequiredColumn = async (client) => {
  const passwordColumnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'tbl_user' 
        AND column_name = 'password_change_required'
    `);

  if (passwordColumnCheck.rows.length === 0) {
    console.log("Adding password_change_required column to tbl_user table...");

    await client.query(`
            ALTER TABLE tbl_user ADD COLUMN password_change_required BOOLEAN DEFAULT FALSE
        `);

    // Set existing users to not require password change
    await client.query(`
            UPDATE tbl_user SET password_change_required = FALSE WHERE password_change_required IS NULL
        `);

    // Make the column NOT NULL
    await client.query(`
            ALTER TABLE tbl_user ALTER COLUMN password_change_required SET NOT NULL
        `);

    console.log("Successfully added password_change_required column");
  } else {
    console.log("password_change_required column already exists");
  }
};

// Add 2FA columns
const add2FAColumns = async (client) => {
  const twofaColumns = [
    {
      name: "twofa_secret",
      type: "VARCHAR(32)",
      description: "2FA secret key",
    },
    {
      name: "twofa_enabled",
      type: "BOOLEAN DEFAULT FALSE",
      description: "2FA enabled flag",
    },
    {
      name: "backup_codes",
      type: "TEXT",
      description: "2FA backup codes (JSON)",
    },
    {
      name: "twofa_setup_date",
      type: "TIMESTAMP",
      description: "2FA setup timestamp",
    },
  ];

  for (const column of twofaColumns) {
    const columnCheck = await client.query(
      `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'tbl_user' 
            AND column_name = $1
        `,
      [column.name]
    );

    if (columnCheck.rows.length === 0) {
      console.log(
        `Adding ${column.name} column to tbl_user table (${column.description})...`
      );

      await client.query(`
                ALTER TABLE tbl_user ADD COLUMN ${column.name} ${column.type}
            `);

      console.log(`Successfully added ${column.name} column`);
    } else {
      console.log(`${column.name} column already exists`);
    }
  }

  // Ensure twofa_enabled has default value for existing users
  await client.query(`
        UPDATE tbl_user SET twofa_enabled = FALSE WHERE twofa_enabled IS NULL
    `);
};

// Future migration placeholder
const runFutureMigrations = async () => {
  // Add new migrations here as needed
  console.log("No additional migrations to run");
};

module.exports = {
  runDatabaseMigrations,
  addPasswordChangeRequiredColumn,
  add2FAColumns,
  runFutureMigrations,
};
