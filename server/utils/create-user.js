const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    host: 'integris-neuro.crmygomu4p1f.us-west-2.rds.amazonaws.com',
    database: 'integris-neuro',
    user: 'postgres',
    password: 'Ilovemywifeandbabies!',
    port: 5432,
    ssl: {
        rejectUnauthorized: false
    }
});

async function createAdminUser() {
    const client = await pool.connect();
    
    try {
        // Start transaction
        await client.query('BEGIN');

        // Generate password hash
        const password = 'admin123';
        const hash = await bcrypt.hash(password, 10);
        
        // Delete existing admin user and name data
        await client.query('DELETE FROM tbl_user WHERE username = $1', ['admin']);
        await client.query('DELETE FROM tbl_name_data WHERE first_name = $1 AND last_name = $2', ['Admin', 'User']);
        
        // Create name data entry with who and date_when
        const nameResult = await client.query(
            `INSERT INTO tbl_name_data (first_name, last_name, middle_name, who, date_when)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
             RETURNING name_key`,
            ['Admin', 'User', null, 'System']
        );
        
        const nameKey = nameResult.rows[0].name_key;
        
        // Create admin user with name_key reference
        const userResult = await client.query(
            `INSERT INTO tbl_user (username, password_hash, email, name_key, date_created, date_when)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             RETURNING username, email, date_created`,
            ['admin', hash, 'admin@example.com', nameKey]
        );

        // Commit transaction
        await client.query('COMMIT');

        console.log('Created user:', {
            ...userResult.rows[0],
            name_key: nameKey
        });
        console.log('Test credentials:');
        console.log('Username: admin');
        console.log('Password: admin123');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating user:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

createAdminUser();