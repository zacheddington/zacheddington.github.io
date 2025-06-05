const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// PostgreSQL connection config using environment variables for Heroku compatibility
const pool = new Pool({
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'IntegrisNeuro',
    password: process.env.PGPASSWORD || 'Ilovemywifeandbabies!',
    port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
    ssl: process.env.PGSSLMODE === 'require' || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

app.use(cors());
app.use(bodyParser.json());

app.post('/api/eeg', async (req, res) => {
    const { firstName, middleName, lastName, who, datewhen } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('Transaction started');
        const name_key = await client.query(
            'INSERT INTO tbl_name_data (first_name, middle_name, last_name, who, date_when) VALUES ($1, $2, $3, $4, $5) RETURNING name_key',
            [firstName, middleName, lastName, who, datewhen]
        );
        console.log('Name data inserted:', name_key.rows[0]);
        const nameKey = name_key.rows[0].name_key;
        await client.query(
            'INSERT INTO tbl_patient (name_key, who, date_when) VALUES ($1, $2, $3)',
            [nameKey, who, datewhen]
        );
        console.log('Patient data inserted with name_key:', nameKey);
        await client.query('COMMIT');
        res.status(200).json({ message: 'Patient and name data saved successfully', nameKey: nameKey });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    } finally {
        client.release();
    }
});
console.log('API endpoint /api/eeg is set up');

// Use the port assigned by Heroku or default to 3001
const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});