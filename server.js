const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
        sslmode: 'require'
    }
});

// Add detailed connection logging
pool.on('error', (err) => {
    console.error('Database error:', {
        message: err.message,
        code: err.code,
        detail: err.detail
    });
});

// Test database connection on startup
const testConnection = async () => {
    try {
        console.log('Attempting database connection...');
        const client = await pool.connect();
        
        // Test if we can connect
        const result = await client.query('SELECT NOW()');
        console.log('Connected to database at:', result.rows[0].now);
        
        // Verify database name
        const dbResult = await client.query('SELECT current_database()');
        console.log('Connected to database:', dbResult.rows[0].current_database);
        
        // List all tables
        const tableResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Available tables:', tableResult.rows.map(row => row.table_name));
        
        client.release();
        return true;
    } catch (err) {
        console.error('Database connection error:', {
            message: err.message,
            code: err.code,
            database: new URL(process.env.DATABASE_URL).pathname.slice(1)
        });
        return false;
    }
};

// Ensure database is connected before starting server
testConnection().then(connected => {
    if (!connected) {
        console.error('Failed to connect to database. Exiting.');
        process.exit(1);
    }
});

app.use(cors());
app.use(bodyParser.json());

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ status: 'ok' });
});

app.post('/api/eeg', async (req, res) => {
    const { firstName, middleName, lastName, who, datewhen } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const name_key = await client.query(
            'INSERT INTO tbl_name_data (first_name, middle_name, last_name, who, date_when) VALUES ($1, $2, $3, $4, $5) RETURNING name_key',
            [firstName, middleName, lastName, who, datewhen]
        );
        const nameKey = name_key.rows[0].name_key;
        await client.query(
            'INSERT INTO tbl_patient (name_key, who, date_when) VALUES ($1, $2, $3)',
            [nameKey, who, datewhen]
        );
        await client.query('COMMIT');
        res.status(200).json({ message: 'Patient and name data saved successfully', nameKey });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error', details: err.message });
    } finally {
        client.release();
    }
});

app.get('/api/test-db', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        res.json({ success: true, timestamp: result.rows[0].now });
    } catch (err) {
        console.error('Database connection error:', err);
        res.status(500).json({ error: 'Database connection failed', details: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});