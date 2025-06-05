const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Database configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(403).json({ error: 'Invalid token.' });
    }
};

// Admin middleware
const requireAdmin = async (req, res, next) => {
    try {
        const userQuery = `
            SELECT COALESCE(r.role_name = 'admin', false) as is_admin
            FROM tbl_user u
            LEFT JOIN tbl_user_role ur ON u.user_key = ur.user_key
            LEFT JOIN tbl_role r ON ur.role_key = r.role_key
            WHERE u.user_key = $1`;

        const result = await pool.query(userQuery, [req.user.user_key]);
        const isAdmin = result.rows[0]?.is_admin;

        if (!isAdmin) {
            return res.status(403).json({ error: 'Access denied. Admin rights required.' });
        }

        next();
    } catch (err) {
        console.error('Admin check error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Get user with admin status from user_role
        const userQuery = `
            SELECT u.user_key, u.username, u.password_hash, 
                   n.first_name, n.last_name,
                   COALESCE(r.role_name = 'admin', false) as is_admin
            FROM tbl_user u
            LEFT JOIN tbl_name_data n ON u.name_key = n.name_key
            LEFT JOIN tbl_user_role ur ON u.user_key = ur.user_key
            LEFT JOIN tbl_role r ON ur.role_key = r.role_key
            WHERE u.username = $1`;

        const result = await pool.query(userQuery, [username]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Create token
        const token = jwt.sign(
            { 
                user_key: user.user_key,
                username: user.username,
                is_admin: user.is_admin
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Send response with full user data
        res.json({
            token,
            user: {
                user_key: user.user_key,
                username: user.username,
                firstName: user.first_name,
                lastName: user.last_name,
                isAdmin: user.is_admin  // Changed from is_admin to isAdmin
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Protected EEG endpoint
app.post('/api/eeg', authenticateToken, async (req, res) => {
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

// Example protected admin route
app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
    // Only admins can access this route
    res.json({ message: 'Welcome, admin!' });
});

// Use Heroku's dynamic port or fallback to 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});