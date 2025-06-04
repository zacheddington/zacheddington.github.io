const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3001;

// PostgreSQL connection config
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'IntegrisNeuro',
    password: 'Ilovemywifeandbabies!',
    port: 5432,
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
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});