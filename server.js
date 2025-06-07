const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the current directory
app.use(express.static('.'));

// Detect if running locally or in production
const isProduction = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('herokuapp');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? {
        rejectUnauthorized: false
    } : false
});

// Middleware to authenticate JWT
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

// Login endpoint
app.post('/api/login', async (req, res) => {
    // Check if we're in local development mode without proper database
    const isLocalTest = process.env.NODE_ENV === 'development' && 
                       process.env.DATABASE_URL?.includes('localhost');
    
    if (isLocalTest) {
        // Simple test credentials for local development
        const { username, password } = req.body;
        
        if (username === 'admin' && password === 'admin') {            const token = jwt.sign(
                { 
                    id: 1,
                    username: 'admin',
                    firstName: 'Test',
                    middleName: 'Local',
                    lastName: 'Admin',
                    email: 'admin@test.com'
                },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );
            
            return res.json({
                token,
                user: {
                    username: 'admin',
                    firstName: 'Test',
                    middleName: 'Local',
                    lastName: 'Admin',
                    email: 'admin@test.com',
                    roles: ['admin'],
                    roleKeys: [1],
                    isAdmin: true,
                    authVersion: '2.0'
                }
            });
        } else {
            return res.status(401).json({ error: 'Invalid username or password (use admin/admin for local testing)' });
        }
    }    // Production database logic
    try {
        const { username, password } = req.body;

        // Query user data including name information and roles
        const userResult = await pool.query(
            `SELECT u.*, n.first_name, n.middle_name, n.last_name 
             FROM tbl_user u 
             LEFT JOIN tbl_name_data n ON u.name_key = n.name_key 
             WHERE u.username = $1`,
            [username]
        );        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const user = userResult.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }// Query user roles from junction table
        const rolesResult = await pool.query(
            `SELECT r.role_key, r.role_name 
             FROM tbl_role r
             JOIN tbl_user_role ur ON r.role_key = ur.role_key
             WHERE ur.user_key = $1`,
            [user.user_key]
        );        const roles = rolesResult.rows.map(row => row.role_name);
        const roleKeys = rolesResult.rows.map(row => row.role_key);
        
        // Check if user has admin role - flexible detection
        // This checks for common admin role patterns
        const isAdmin = roleKeys.includes(1) || roleKeys.includes('1') || 
                       roles.some(role => {
                           const roleLower = role.toLowerCase();
                           return roleLower.includes('admin') || 
                                  roleLower.includes('administrator') ||
                                  roleLower === 'admin';
                       });// Create token
        const token = jwt.sign(
            { 
                id: user.user_key,
                username: user.username,
                firstName: user.first_name,
                middleName: user.middle_name,
                lastName: user.last_name,
                email: user.email,
                nameKey: user.name_key,
                roles: roles,
                roleKeys: roleKeys
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );        // Update last login time
        await pool.query(
            'UPDATE tbl_user SET date_when = CURRENT_TIMESTAMP WHERE user_key = $1',
            [user.user_key]
        );

        res.json({
            token,
            user: {
                username: user.username,
                firstName: user.first_name,
                middleName: user.middle_name,
                lastName: user.last_name,
                email: user.email,
                roles: roles,
                roleKeys: roleKeys,
                isAdmin: isAdmin,
                // Add timestamp to help track when role data was added
                authVersion: '2.0'
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Server-side logout endpoint for token invalidation
app.post('/api/logout', authenticateToken, async (req, res) => {
    try {
        // In a production environment, you would typically:
        // 1. Add the token to a blacklist stored in Redis or database
        // 2. Log the logout event for security auditing
        // For now, we'll just confirm the logout
        
        console.log(`User ${req.user.username} logged out at ${new Date().toISOString()}`);
        
        res.json({ 
            message: 'Successfully logged out',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ error: 'Logout failed' });
    }
});

// Health check endpoint for connectivity testing
app.get('/api/health', authenticateToken, async (req, res) => {
    try {
        // Simple database connectivity test
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        
        res.json({ 
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Health check failed:', err);
        res.status(503).json({ 
            status: 'unhealthy',
            database: 'disconnected',
            error: 'Database connection failed',
            timestamp: new Date().toISOString()
        });
    }
});

// Public health check endpoint for basic connectivity testing (no auth required)
app.get('/api/health/public', async (req, res) => {
    // Check if we're in local development mode without proper database
    const isLocalTest = process.env.NODE_ENV === 'development' && 
                       process.env.DATABASE_URL?.includes('localhost');
    
    if (isLocalTest) {
        // For local testing, just return success
        return res.json({ 
            status: 'healthy',
            database: 'local_test_mode',
            timestamp: new Date().toISOString()
        });
    }
    
    try {
        // Simple database connectivity test
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        
        res.json({ 
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Public health check failed:', err);
        res.status(503).json({ 
            status: 'unhealthy',
            database: 'disconnected',
            error: 'Database connection failed',
            timestamp: new Date().toISOString()
        });
    }
});

// Debug endpoint removed for production security

// Protected endpoint example
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
        client.release();    }
});

// Profile management endpoints
app.put('/api/profile', authenticateToken, async (req, res) => {
    try {
        const { firstName, middleName, lastName, email } = req.body;
        const userId = req.user.id;
          // Validate required fields
        if (!firstName || !lastName || !email) {
            return res.status(400).json({ error: 'First name, last name, and email are required' });
        }
        
        // Validate field lengths for database constraints
        if (firstName.length > 50) {
            return res.status(400).json({ error: 'First name must be 50 characters or less' });
        }
        if (middleName && middleName.length > 50) {
            return res.status(400).json({ error: 'Middle name must be 50 characters or less' });
        }
        if (lastName.length > 50) {
            return res.status(400).json({ error: 'Last name must be 50 characters or less' });
        }
        if (email.length > 50) {
            return res.status(400).json({ error: 'Email must be 50 characters or less' });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }
        
        // Check if we're in local test mode
        const isLocalTest = process.env.NODE_ENV === 'development' && 
                           process.env.DATABASE_URL?.includes('localhost');
        
        if (isLocalTest) {
            // For local testing, just return success
            return res.json({ 
                message: 'Profile updated successfully',
                user: {
                    firstName,
                    middleName,
                    lastName,
                    email
                }
            });
        }
          // Production database logic
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Get username for the 'who' field
            const userResult = await client.query(
                'SELECT username FROM tbl_user WHERE user_key = $1',
                [userId]
            );
            
            if (userResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'User not found' });
            }
            
            const username = userResult.rows[0].username;
              // Always insert a new record into tbl_name_data
            const newNameResult = await client.query(
                'INSERT INTO tbl_name_data (first_name, middle_name, last_name, who, date_when) VALUES ($1, $2, $3, $4, NOW()) RETURNING name_key',
                [firstName, middleName || null, lastName, username]
            );
            
            if (newNameResult.rows.length === 0) {
                throw new Error('Failed to create name record');
            }
            
            const newNameKey = newNameResult.rows[0].name_key;
            
            // Update user table with new name_key and email
            const userUpdateResult = await client.query(
                'UPDATE tbl_user SET email = $1, name_key = $2 WHERE user_key = $3',
                [email, newNameKey, userId]
            );
            
            // Verify the user update actually occurred
            if (userUpdateResult.rowCount === 0) {
                throw new Error('Failed to update user profile - user not found');
            }
            
            await client.query('COMMIT');
            
            res.json({ 
                message: 'Profile updated successfully',
                user: {
                    firstName,
                    middleName,
                    lastName,
                    email
                },
                nameKey: newNameKey,
                timestamp: new Date().toISOString()
            });
              } catch (err) {
            await client.query('ROLLBACK');
            console.error('Database transaction error:', err);
            
            // Provide more specific error messages
            if (err.code === '23505') { // Unique constraint violation
                throw new Error('Email address is already in use by another account');
            } else if (err.code === '23503') { // Foreign key constraint violation
                throw new Error('Database reference error. Please contact support');
            } else if (err.code === '23514') { // Check constraint violation
                throw new Error('Invalid data format. Please check your input');
            } else if (err.code === '08003' || err.code === '08006') { // Connection errors
                throw new Error('Database connection lost. Please try again');
            } else {
                throw new Error('Database operation failed. Please try again');
            }
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error('Profile update error:', err);
        
        // Return specific error message or generic fallback
        const errorMessage = err.message && err.message.includes('Database') 
            ? err.message 
            : 'Failed to update profile. Please try again later';
            
        res.status(500).json({ 
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

app.put('/api/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        
        // Validate required fields
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        
        // Validate new password length
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long' });
        }
        
        // Check if we're in local test mode
        const isLocalTest = process.env.NODE_ENV === 'development' && 
                           process.env.DATABASE_URL?.includes('localhost');
        
        if (isLocalTest) {
            // For local testing, just return success if current password is 'admin'
            if (currentPassword === 'admin') {
                return res.json({ message: 'Password changed successfully' });
            } else {
                return res.status(400).json({ error: 'Current password is incorrect' });
            }
        }
        
        // Production database logic
        const client = await pool.connect();
        try {
            // Get current user data
            const userResult = await client.query(
                'SELECT password_hash FROM tbl_user WHERE user_key = $1',
                [userId]
            );
            
            if (userResult.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const user = userResult.rows[0];
            
            // Verify current password
            const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
            if (!validPassword) {
                return res.status(400).json({ error: 'Current password is incorrect' });
            }
            
            // Hash new password
            const saltRounds = 10;
            const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
              // Update password in database
            const updateResult = await client.query(
                'UPDATE tbl_user SET password_hash = $1 WHERE user_key = $2',
                [newPasswordHash, userId]
            );
            
            // Verify the update actually occurred
            if (updateResult.rowCount === 0) {
                throw new Error('Password update failed - user not found');
            }
            
            res.json({ 
                message: 'Password changed successfully',
                timestamp: new Date().toISOString()
            });
            
        } catch (err) {
            console.error('Password update database error:', err);
            
            // Provide specific error messages
            if (err.code === '08003' || err.code === '08006') { // Connection errors
                throw new Error('Database connection lost. Please try again');
            } else if (err.message && err.message.includes('user not found')) {
                throw new Error('User account not found. Please re-login and try again');
            } else {
                throw new Error('Password update failed. Please try again');
            }
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error('Password change error:', err);
        
        // Return specific error message or generic fallback
        const errorMessage = err.message && err.message.includes('Database') 
            ? err.message 
            : err.message || 'Failed to change password. Please try again later';
              res.status(500).json({ 
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// Admin endpoints for user management
app.get('/api/roles', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        const isAdmin = req.user.roleKeys?.includes(1) || 
                       req.user.roles?.some(role => {
                           const roleLower = role.toLowerCase();
                           return roleLower.includes('admin') || 
                                  roleLower.includes('administrator') ||
                                  roleLower === 'admin';
                       });
        
        if (!isAdmin) {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }
        
        // Check if we're in local test mode
        const isLocalTest = process.env.NODE_ENV === 'development' && 
                           process.env.DATABASE_URL?.includes('localhost');
        
        if (isLocalTest) {
            // Return test roles for local development
            return res.json([
                { role_key: 1, role_name: 'Administrator' },
                { role_key: 2, role_name: 'User' },
                { role_key: 3, role_name: 'Viewer' }
            ]);
        }
        
        // Production database logic
        const rolesResult = await pool.query(
            'SELECT role_key, role_name FROM tbl_role ORDER BY role_name'
        );
        
        res.json(rolesResult.rows);
        
    } catch (err) {
        console.error('Get roles error:', err);
        res.status(500).json({ 
            error: 'Failed to fetch roles',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

app.post('/api/create-user', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        const isAdmin = req.user.roleKeys?.includes(1) || 
                       req.user.roles?.some(role => {
                           const roleLower = role.toLowerCase();
                           return roleLower.includes('admin') || 
                                  roleLower.includes('administrator') ||
                                  roleLower === 'admin';
                       });
        
        if (!isAdmin) {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }
        
        const { firstName, middleName, lastName, email, username, password, roleKey } = req.body;
        
        // Validate required fields
        if (!firstName || !lastName || !email || !username || !password || !roleKey) {
            return res.status(400).json({ error: 'All fields except middle name are required' });
        }
        
        // Validate field lengths
        if (firstName.length > 50) {
            return res.status(400).json({ error: 'First name must be 50 characters or less' });
        }
        if (middleName && middleName.length > 50) {
            return res.status(400).json({ error: 'Middle name must be 50 characters or less' });
        }
        if (lastName.length > 50) {
            return res.status(400).json({ error: 'Last name must be 50 characters or less' });
        }
        if (email.length > 50) {
            return res.status(400).json({ error: 'Email must be 50 characters or less' });
        }
        if (username.length > 50) {
            return res.status(400).json({ error: 'Username must be 50 characters or less' });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }
        
        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        
        // Check if we're in local test mode
        const isLocalTest = process.env.NODE_ENV === 'development' && 
                           process.env.DATABASE_URL?.includes('localhost');
        
        if (isLocalTest) {
            // For local testing, just return success
            return res.json({ 
                message: 'User created successfully',
                user: {
                    username,
                    firstName,
                    middleName,
                    lastName,
                    email,
                    roleKey
                }
            });
        }
        
        // Production database logic
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Check if username already exists
            const existingUserResult = await client.query(
                'SELECT username FROM tbl_user WHERE username = $1',
                [username]
            );
            
            if (existingUserResult.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Username already exists. Please choose a different username.' });
            }
            
            // Check if email already exists
            const existingEmailResult = await client.query(
                'SELECT email FROM tbl_user WHERE email = $1',
                [email]
            );
            
            if (existingEmailResult.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Email address is already registered. Please use a different email.' });
            }
            
            // Get the creator's username for the 'who' field
            const creatorUsername = req.user.username;
            
            // Insert into tbl_name_data
            const nameResult = await client.query(
                'INSERT INTO tbl_name_data (first_name, middle_name, last_name, who, date_when) VALUES ($1, $2, $3, $4, NOW()) RETURNING name_key',
                [firstName, middleName || null, lastName, creatorUsername]
            );
            
            if (nameResult.rows.length === 0) {
                throw new Error('Failed to create name record');
            }
            
            const nameKey = nameResult.rows[0].name_key;
            
            // Hash password
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);
            
            // Insert into tbl_user
            const userResult = await client.query(
                'INSERT INTO tbl_user (username, password_hash, email, name_key, who, date_created, date_when) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING user_key',
                [username, passwordHash, email, nameKey, creatorUsername]
            );
            
            if (userResult.rows.length === 0) {
                throw new Error('Failed to create user account');
            }
            
            const userKey = userResult.rows[0].user_key;
            
            // Insert into tbl_user_role
            const userRoleResult = await client.query(
                'INSERT INTO tbl_user_role (user_key, role_key, date_created, date_when) VALUES ($1, $2, NOW(), NOW())',
                [userKey, roleKey]
            );
            
            if (userRoleResult.rowCount === 0) {
                throw new Error('Failed to assign user role');
            }
            
            await client.query('COMMIT');
            
            res.json({ 
                message: 'User created successfully',
                user: {
                    username,
                    firstName,
                    middleName,
                    lastName,
                    email,
                    roleKey,
                    userKey,
                    nameKey
                },
                timestamp: new Date().toISOString()
            });
            
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('User creation database error:', err);
            
            // Provide specific error messages
            if (err.code === '23505') { // Unique constraint violation
                if (err.constraint?.includes('username')) {
                    throw new Error('Username already exists. Please choose a different username.');
                } else if (err.constraint?.includes('email')) {
                    throw new Error('Email address is already registered. Please use a different email.');
                } else {
                    throw new Error('A user with this information already exists.');
                }
            } else if (err.code === '23503') { // Foreign key constraint violation
                throw new Error('Invalid role selected. Please refresh the page and try again.');
            } else if (err.code === '23514') { // Check constraint violation
                throw new Error('Invalid data format. Please check your input.');
            } else if (err.code === '08003' || err.code === '08006') { // Connection errors
                throw new Error('Database connection lost. Please try again.');
            } else {
                throw new Error('User creation failed. Please try again.');
            }
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error('User creation error:', err);
        
        // Return specific error message or generic fallback
        const errorMessage = err.message && err.message.includes('Database') 
            ? err.message 
            : err.message || 'Failed to create user. Please try again later';
            
        res.status(500).json({ 
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});