// Database Migration Management
// Handles schema updates and database initialization

const { pool } = require('../config/database');
const config = require('../config/environment');

// Database migration function
const runDatabaseMigrations = async () => {
    try {
        // Skip migration if no valid database URL is configured
        if (!config.DATABASE_URL || config.DATABASE_URL.includes('username')) {
            console.log(
                'No valid database configuration found, skipping migrations'
            );
            return;
        }

        const client = await pool.connect();

        try {
            console.log('Starting database migrations...');

            // Check if password_change_required column exists, if not add it
            await addPasswordChangeRequiredColumn(client);

            // Add 2FA columns
            await add2FAColumns(client); // Add patient table columns
            await addPatientTableColumns(client);

            // Add user table columns
            await addUserTableColumns(client);

            // Add user session table
            await addUserSessionTable(client);

            // Add user session table
            await addUserSessionTable(client);

            console.log('Database migration completed successfully');
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Database migration error:', err.message);
        // Don't fail server startup for migration errors
        console.log('Continuing server startup without database migrations');
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
        console.log(
            'Adding password_change_required column to tbl_user table...'
        );

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

        console.log('Successfully added password_change_required column');
    } else {
        console.log('password_change_required column already exists');
    }
};

// Add 2FA columns
const add2FAColumns = async (client) => {
    const twofaColumns = [
        {
            name: 'twofa_secret',
            type: 'VARCHAR(32)',
            description: '2FA secret key',
        },
        {
            name: 'twofa_enabled',
            type: 'BOOLEAN DEFAULT FALSE',
            description: '2FA enabled flag',
        },
        {
            name: 'backup_codes',
            type: 'TEXT',
            description: '2FA backup codes (JSON)',
        },
        {
            name: 'twofa_setup_date',
            type: 'TIMESTAMP',
            description: '2FA setup timestamp',
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

// Add patient table columns
const addPatientTableColumns = async (client) => {
    const patientColumns = [
        {
            name: 'address',
            type: 'VARCHAR(100)',
            description: 'Patient address',
        },
        {
            name: 'phone',
            type: 'VARCHAR(20)',
            description: 'Patient phone number',
        },
        {
            name: 'accepts_texts',
            type: 'BOOLEAN DEFAULT FALSE',
            description: 'Patient accepts text messages',
        },
    ];

    for (const column of patientColumns) {
        const columnCheck = await client.query(
            `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'tbl_patient' 
            AND column_name = $1
        `,
            [column.name]
        );

        if (columnCheck.rows.length === 0) {
            console.log(
                `Adding ${column.name} column to tbl_patient table (${column.description})...`
            );

            await client.query(`
                ALTER TABLE tbl_patient ADD COLUMN ${column.name} ${column.type}
            `);

            console.log(`Successfully added ${column.name} column`);
        } else {
            console.log(`${column.name} column already exists`);
        }
    }

    // Ensure accepts_texts has default value for existing patients
    await client.query(`
        UPDATE tbl_patient SET accepts_texts = FALSE WHERE accepts_texts IS NULL
    `);
};

// Add user table columns and ensure data integrity
const addUserTableColumns = async (client) => {
    console.log('Checking user table columns...');

    // Check if date_created column exists
    const dateCreatedColumnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'tbl_user' 
        AND column_name = 'date_created'
    `);

    // If date_created doesn't exist, add it
    if (dateCreatedColumnCheck.rows.length === 0) {
        await client.query(`
            ALTER TABLE tbl_user ADD COLUMN date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        `);
        console.log('Successfully added date_created column to tbl_user');
    }

    // Ensure all users have a date_created value
    const usersWithoutDateCreated = await client.query(`
        SELECT COUNT(*) as count FROM tbl_user WHERE date_created IS NULL
    `);

    if (usersWithoutDateCreated.rows[0].count > 0) {
        // Update users without date_created to use their date_when or current time
        await client.query(`
            UPDATE tbl_user 
            SET date_created = COALESCE(date_when, NOW()) 
            WHERE date_created IS NULL
        `);
        console.log(
            `Updated ${usersWithoutDateCreated.rows[0].count} users with missing date_created`
        );
    }

    // Check if date_when column exists (it should, but let's be safe)
    const dateWhenColumnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'tbl_user' 
        AND column_name = 'date_when'
    `);

    if (dateWhenColumnCheck.rows.length === 0) {
        await client.query(`
            ALTER TABLE tbl_user ADD COLUMN date_when TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        `);
        console.log('Successfully added date_when column to tbl_user');
    }

    console.log('User table column check completed');
};

// Add user session table and indexes
const addUserSessionTable = async (client) => {
    console.log('Checking user session table...');

    // Check if table exists
    const tableExists = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tbl_user_session'
    `);

    if (tableExists.rows.length === 0) {
        console.log('Creating tbl_user_session table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.tbl_user_session
            (
                session_key integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
                user_key integer NOT NULL,
                session_token character varying(255) UNIQUE NOT NULL,
                login_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
                last_activity timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
                expires_at timestamp with time zone DEFAULT (CURRENT_TIMESTAMP + INTERVAL '8 hours'),
                logout_time timestamp with time zone NULL,
                ip_address character varying(50) COLLATE pg_catalog."default" NOT NULL,
                user_agent text,
                login_method character varying(20) DEFAULT 'password',
                is_active boolean DEFAULT true,
                revoked boolean DEFAULT false,
                revoked_reason character varying(100),
                CONSTRAINT tbl_user_session_pkey PRIMARY KEY (session_key),
                CONSTRAINT tbl_user_session_user_key_fkey FOREIGN KEY (user_key)
                    REFERENCES public.tbl_user (user_key) MATCH SIMPLE
                    ON UPDATE CASCADE
                    ON DELETE CASCADE
            )
        `);

        // Create indexes
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_user_session_user_key ON public.tbl_user_session(user_key)
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_user_session_token ON public.tbl_user_session(session_token)
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_user_session_active ON public.tbl_user_session(is_active) WHERE is_active = true
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_user_session_expires ON public.tbl_user_session(expires_at)
        `);

        console.log('Successfully created tbl_user_session table and indexes');
    } else {
        console.log('tbl_user_session table already exists');
    }
};

// Future migration placeholder
const runFutureMigrations = async () => {
    // Add new migrations here as needed
    console.log('No additional migrations to run');
};

module.exports = {
    runDatabaseMigrations,
    addPasswordChangeRequiredColumn,
    add2FAColumns,
    addPatientTableColumns,
    addUserTableColumns,
    addUserSessionTable,
    runFutureMigrations,
};
