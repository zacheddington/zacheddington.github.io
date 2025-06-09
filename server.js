const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
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
        const { username, password, twofaToken } = req.body;

        // Query user data including name information and roles
        // Use case-insensitive username comparison
        const userResult = await pool.query(
            `SELECT u.*, n.first_name, n.middle_name, n.last_name 
             FROM tbl_user u 
             LEFT JOIN tbl_name_data n ON u.name_key = n.name_key 
             WHERE LOWER(u.username) = LOWER($1)`,
            [username]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const user = userResult.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Check if user has 2FA enabled
        if (user.twofa_enabled && user.twofa_secret) {
            if (!twofaToken) {
                return res.status(200).json({ 
                    requires2FA: true,
                    message: '2FA verification required'
                });
            }

            // Verify 2FA token
            const verified = speakeasy.totp.verify({
                secret: user.twofa_secret,
                encoding: 'base32',
                token: twofaToken,
                window: 2
            });

            // Check backup codes if TOTP fails
            let backupCodeUsed = false;
            if (!verified && user.backup_codes) {
                const backupCodes = JSON.parse(user.backup_codes);
                const codeIndex = backupCodes.indexOf(twofaToken.toUpperCase());
                
                if (codeIndex !== -1) {
                    // Remove used backup code
                    backupCodes.splice(codeIndex, 1);
                    await pool.query(
                        'UPDATE tbl_user SET backup_codes = $1 WHERE user_key = $2',
                        [JSON.stringify(backupCodes), user.user_key]
                    );
                    backupCodeUsed = true;
                }
            }

            if (!verified && !backupCodeUsed) {
                return res.status(401).json({ error: 'Invalid 2FA code' });
            }
        }

        // Query user roles from junction table
        const rolesResult = await pool.query(
            `SELECT r.role_key, r.role_name 
             FROM tbl_role r
             JOIN tbl_user_role ur ON r.role_key = ur.role_key
             WHERE ur.user_key = $1`,
            [user.user_key]
        );

        const roles = rolesResult.rows.map(row => row.role_name);
        const roleKeys = rolesResult.rows.map(row => row.role_key);
        
        // Check if user has admin role - flexible detection
        // This checks for common admin role patterns
        const isAdmin = roleKeys.includes(1) || roleKeys.includes('1') || 
                       roles.some(role => {
                           const roleLower = role.toLowerCase();
                           return roleLower.includes('admin') || 
                                  roleLower.includes('administrator') ||
                                  roleLower === 'admin';
                       });

        // Create token
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
        );

        // Update last login time
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
                // Add 2FA status
                twofa_enabled: user.twofa_enabled || false,
                // Add password change requirement flag
                passwordChangeRequired: user.password_change_required || false,
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

// Patient management endpoints
app.get('/api/patients', authenticateToken, async (req, res) => {
    try {
        // Check if we're in local test mode
        const isLocalTest = process.env.NODE_ENV === 'development' && 
                           process.env.DATABASE_URL?.includes('localhost');
        
        if (isLocalTest) {
            // Return test patients for local development
            return res.json([
                {
                    patient_key: 1,
                    first_name: 'John',
                    middle_name: 'A',
                    last_name: 'Doe',
                    address: '123 Main St',
                    city: 'Anytown',
                    state: 'ST',
                    zip_code: '12345',
                    phone: '555-1234',
                    accepts_texts: true,
                    date_when: '2024-01-01T00:00:00.000Z'
                },
                {
                    patient_key: 2,
                    first_name: 'Jane',
                    middle_name: null,
                    last_name: 'Smith',
                    address: '456 Oak Ave',
                    city: 'Somewhere',
                    state: 'ST',
                    zip_code: '67890',
                    phone: '555-5678',
                    accepts_texts: false,
                    date_when: '2024-01-02T00:00:00.000Z'
                }
            ]);
        }
        
        // Production database logic
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    p.patient_key,
                    n.first_name,
                    n.middle_name,
                    n.last_name,
                    p.address,
                    p.city,
                    p.state,
                    p.zip_code,
                    p.phone,
                    p.accepts_texts,
                    p.date_when
                FROM tbl_patient p
                LEFT JOIN tbl_name_data n ON p.name_key = n.name_key
                ORDER BY n.last_name, n.first_name
            `);
            
            res.json(result.rows);
            
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error('Get patients error:', err);
        res.status(500).json({ 
            error: 'Failed to fetch patients',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

app.get('/api/patients/:patientKey', authenticateToken, async (req, res) => {
    try {
        const patientKey = req.params.patientKey;
        
        // Check if we're in local test mode
        const isLocalTest = process.env.NODE_ENV === 'development' && 
                           process.env.DATABASE_URL?.includes('localhost');
        
        if (isLocalTest) {
            // Return test patient data
            const testPatients = {
                '1': {
                    patient_key: 1,
                    first_name: 'John',
                    middle_name: 'A',
                    last_name: 'Doe',
                    address: '123 Main St',
                    city: 'Anytown',
                    state: 'ST',
                    zip_code: '12345',
                    phone: '555-1234',
                    accepts_texts: true,
                    date_when: '2024-01-01T00:00:00.000Z'
                },
                '2': {
                    patient_key: 2,
                    first_name: 'Jane',
                    middle_name: null,
                    last_name: 'Smith',
                    address: '456 Oak Ave',
                    city: 'Somewhere',
                    state: 'ST',
                    zip_code: '67890',
                    phone: '555-5678',
                    accepts_texts: false,
                    date_when: '2024-01-02T00:00:00.000Z'
                }
            };
            
            const patient = testPatients[patientKey];
            if (patient) {
                return res.json(patient);
            } else {
                return res.status(404).json({ error: 'Patient not found' });
            }
        }
        
        // Production database logic
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    p.patient_key,
                    n.first_name,
                    n.middle_name,
                    n.last_name,
                    p.address,
                    p.city,
                    p.state,
                    p.zip_code,
                    p.phone,
                    p.accepts_texts,
                    p.date_when
                FROM tbl_patient p
                LEFT JOIN tbl_name_data n ON p.name_key = n.name_key
                WHERE p.patient_key = $1
            `, [patientKey]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Patient not found' });
            }
            
            res.json(result.rows[0]);
            
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error('Get patient error:', err);
        res.status(500).json({ 
            error: 'Failed to fetch patient',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

app.delete('/api/patients/:patientKey', authenticateToken, async (req, res) => {
    try {
        const patientKey = req.params.patientKey;
        
        // Check if we're in local test mode
        const isLocalTest = process.env.NODE_ENV === 'development' && 
                           process.env.DATABASE_URL?.includes('localhost');
        
        if (isLocalTest) {
            // For local testing, just return success
            return res.json({ 
                message: 'Patient deleted successfully',
                patientKey: patientKey
            });
        }
        
        // Production database logic
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Get the name_key before deleting the patient
            const patientResult = await client.query(
                'SELECT name_key FROM tbl_patient WHERE patient_key = $1',
                [patientKey]
            );
            
            if (patientResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Patient not found' });
            }
            
            const nameKey = patientResult.rows[0].name_key;
            
            // Delete patient record
            await client.query(
                'DELETE FROM tbl_patient WHERE patient_key = $1',
                [patientKey]
            );
            
            // Delete associated name data if it exists
            if (nameKey) {
                await client.query(
                    'DELETE FROM tbl_name_data WHERE name_key = $1',
                    [nameKey]
                );
            }
            
            await client.query('COMMIT');
            
            res.json({ 
                message: 'Patient deleted successfully',
                patientKey: patientKey
            });
            
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error('Delete patient error:', err);
        res.status(500).json({ 
            error: 'Failed to delete patient',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
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
          // Validate new password strength for healthcare security (HIPAA-compliant)
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters long' });
        }
        
        if (!/[A-Z]/.test(newPassword)) {
            return res.status(400).json({ error: 'New password must contain at least one uppercase letter' });
        }
        
        if (!/[a-z]/.test(newPassword)) {
            return res.status(400).json({ error: 'New password must contain at least one lowercase letter' });
        }
        
        if (!/[0-9]/.test(newPassword)) {
            return res.status(400).json({ error: 'New password must contain at least one number' });
        }
        
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
            return res.status(400).json({ error: 'New password must contain at least one special character (!@#$%^&*...)' });
        }
        
        if (/\s/.test(newPassword)) {
            return res.status(400).json({ error: 'New password cannot contain spaces' });
        }
          // Check for common passwords
        const commonPasswords = [
            'password', 'password123', '123456', '123456789', 'qwerty', 'abc123',
            'Password1', 'password1', 'admin', 'administrator', 'welcome', 'login'
        ];
        
        if (commonPasswords.some(common => newPassword.toLowerCase() === common.toLowerCase())) {
            return res.status(400).json({ error: 'New password is too common - please choose a stronger password' });
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

// Forced password change endpoint for first-time users
app.put('/api/force-change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        
        // Validate required fields
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }

        // Validate new password strength for healthcare security (HIPAA-compliant)
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters long' });
        }
        
        if (!/[A-Z]/.test(newPassword)) {
            return res.status(400).json({ error: 'New password must contain at least one uppercase letter' });
        }
        
        if (!/[a-z]/.test(newPassword)) {
            return res.status(400).json({ error: 'New password must contain at least one lowercase letter' });
        }
        
        if (!/[0-9]/.test(newPassword)) {
            return res.status(400).json({ error: 'New password must contain at least one number' });
        }
        
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
            return res.status(400).json({ error: 'New password must contain at least one special character (!@#$%^&*...)' });
        }
        
        if (/\s/.test(newPassword)) {
            return res.status(400).json({ error: 'New password cannot contain spaces' });
        }

        // Check for common passwords
        const commonPasswords = [
            'password', 'password123', '123456', '123456789', 'qwerty', 'abc123',
            'Password1', 'password1', 'admin', 'administrator', 'welcome', 'login'
        ];
        
        if (commonPasswords.some(common => newPassword.toLowerCase() === common.toLowerCase())) {
            return res.status(400).json({ error: 'New password is too common - please choose a stronger password' });
        }
        
        // Check if we're in local test mode
        const isLocalTest = process.env.NODE_ENV === 'development' && 
                           process.env.DATABASE_URL?.includes('localhost');
        
        if (isLocalTest) {
            // For local testing, just return success if current password is 'admin'
            if (currentPassword === 'admin') {
                return res.json({ 
                    message: 'Password changed successfully',
                    passwordChangeRequired: false
                });
            } else {
                return res.status(400).json({ error: 'Current password is incorrect' });
            }
        }
        
        // Production database logic
        const client = await pool.connect();
        try {
            // Get current user data including password change requirement flag
            const userResult = await client.query(
                'SELECT password_hash, password_change_required FROM tbl_user WHERE user_key = $1',
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

            // Update password and clear the password change requirement flag
            const updateResult = await client.query(
                'UPDATE tbl_user SET password_hash = $1, password_change_required = false WHERE user_key = $2',
                [newPasswordHash, userId]
            );
            
            // Verify the update actually occurred
            if (updateResult.rowCount === 0) {
                throw new Error('Password update failed - user not found');
            }
            
            res.json({ 
                message: 'Password changed successfully',
                passwordChangeRequired: false,
                timestamp: new Date().toISOString()
            });
            
        } catch (err) {
            console.error('Forced password update database error:', err);
            
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
        console.error('Forced password change error:', err);
        
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

// === 2FA ENDPOINTS ===

// Setup 2FA - Generate secret and QR code
app.post('/api/2fa/setup', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const username = req.user.username;
        
        // Generate a secret for the user
        const secret = speakeasy.generateSecret({
            name: `IntegrisNeuro:${username}`,
            issuer: 'IntegrisNeuro Medical Records',
            length: 32
        });
        
        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
        
        // Store the secret temporarily (not activated until verified)
        const client = await pool.connect();
        try {
            await client.query(
                'UPDATE tbl_user SET twofa_secret = $1 WHERE user_key = $2',
                [secret.base32, userId]
            );
        } finally {
            client.release();
        }
        
        res.json({
            secret: secret.base32,
            qrCode: qrCodeUrl,
            manualEntryKey: secret.base32,
            issuer: 'IntegrisNeuro Medical Records',
            accountName: username
        });
        
    } catch (err) {
        console.error('2FA setup error:', err);
        res.status(500).json({ error: 'Failed to setup 2FA' });
    }
});

// Verify and enable 2FA
app.post('/api/2fa/verify', authenticateToken, async (req, res) => {
    try {
        const { token } = req.body;
        const userId = req.user.id;
        
        if (!token) {
            return res.status(400).json({ error: 'Verification token is required' });
        }
        
        // Get user's secret
        const client = await pool.connect();
        try {
            const userResult = await client.query(
                'SELECT twofa_secret FROM tbl_user WHERE user_key = $1',
                [userId]
            );
            
            if (userResult.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const secret = userResult.rows[0].twofa_secret;
            if (!secret) {
                return res.status(400).json({ error: '2FA setup not initiated' });
            }
            
            // Verify the token
            const verified = speakeasy.totp.verify({
                secret: secret,
                encoding: 'base32',
                token: token,
                window: 2 // Allow some time drift
            });
            
            if (!verified) {
                return res.status(400).json({ error: 'Invalid verification code' });
            }
            
            // Generate backup codes
            const backupCodes = [];
            for (let i = 0; i < 10; i++) {
                backupCodes.push(Math.random().toString(36).substr(2, 8).toUpperCase());
            }
            
            // Enable 2FA and store backup codes
            await client.query(
                'UPDATE tbl_user SET twofa_enabled = true, backup_codes = $1, twofa_setup_date = CURRENT_TIMESTAMP WHERE user_key = $2',
                [JSON.stringify(backupCodes), userId]
            );
            
            res.json({
                message: '2FA successfully enabled',
                backupCodes: backupCodes
            });
            
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error('2FA verification error:', err);
        res.status(500).json({ error: 'Failed to verify 2FA' });
    }
});

// Disable 2FA
app.post('/api/2fa/disable', authenticateToken, async (req, res) => {
    try {
        const { currentPassword } = req.body;
        const userId = req.user.id;
        
        if (!currentPassword) {
            return res.status(400).json({ error: 'Current password is required to disable 2FA' });
        }
        
        const client = await pool.connect();
        try {
            // Verify current password
            const userResult = await client.query(
                'SELECT password_hash FROM tbl_user WHERE user_key = $1',
                [userId]
            );
            
            if (userResult.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const validPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
            if (!validPassword) {
                return res.status(400).json({ error: 'Incorrect password' });
            }
              // Disable 2FA
            await client.query(
                'UPDATE tbl_user SET twofa_enabled = false, twofa_secret = NULL, backup_codes = NULL WHERE user_key = $1',
                [userId]
            );
            
            res.json({ message: '2FA successfully disabled' });
            
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error('2FA disable error:', err);
        res.status(500).json({ error: 'Failed to disable 2FA' });
    }
});

// Check 2FA status
app.get('/api/2fa/status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const client = await pool.connect();
        try {
            const result = await client.query(
                'SELECT twofa_enabled, twofa_setup_date FROM tbl_user WHERE user_key = $1',
                [userId]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const user = result.rows[0];
            res.json({
                enabled: user.twofa_enabled || false,
                setupDate: user.twofa_setup_date
            });
            
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error('2FA status check error:', err);
        res.status(500).json({ error: 'Failed to check 2FA status' });
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
          // Validate password strength for healthcare security (HIPAA-compliant)
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }
        
        if (!/[A-Z]/.test(password)) {
            return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
        }
        
        if (!/[a-z]/.test(password)) {
            return res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
        }
        
        if (!/[0-9]/.test(password)) {
            return res.status(400).json({ error: 'Password must contain at least one number' });
        }
        
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            return res.status(400).json({ error: 'Password must contain at least one special character (!@#$%^&*...)' });
        }
        
        if (/\s/.test(password)) {
            return res.status(400).json({ error: 'Password cannot contain spaces' });
        }
          // Check for common passwords
        const commonPasswords = [
            'password', 'password123', '123456', '123456789', 'qwerty', 'abc123',
            'Password1', 'password1', 'admin', 'administrator', 'welcome', 'login'
        ];
        
        if (commonPasswords.some(common => password.toLowerCase() === common.toLowerCase())) {
            return res.status(400).json({ error: 'Password is too common - please choose a stronger password' });
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
              // Check if username already exists (case-insensitive)
            const existingUserResult = await client.query(
                'SELECT username FROM tbl_user WHERE LOWER(username) = LOWER($1)',
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
                'INSERT INTO tbl_user (username, password_hash, email, name_key, who, date_created, date_when, password_change_required) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6) RETURNING user_key',
                [username, passwordHash, email, nameKey, creatorUsername, true]
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

// Check username availability endpoint
app.post('/api/check-username', authenticateToken, async (req, res) => {
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
        
        const { username } = req.body;
        
        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }
        
        // Check if we're in local test mode
        const isLocalTest = process.env.NODE_ENV === 'development' && 
                           process.env.DATABASE_URL?.includes('localhost');
        
        if (isLocalTest) {
            // For local testing, simulate availability check
            const unavailableUsernames = ['admin', 'test', 'user', 'guest'];
            const available = !unavailableUsernames.includes(username.toLowerCase());
            return res.json({ 
                available,
                message: available ? 'Username is available' : 'Username is already taken'
            });
        }
        
        // Production database logic
        const result = await pool.query(
            'SELECT username FROM tbl_user WHERE LOWER(username) = LOWER($1)',
            [username]
        );
        
        const available = result.rows.length === 0;
        
        res.json({
            available,
            message: available ? 'Username is available' : 'Username is already taken'
        });
        
    } catch (err) {
        console.error('Username check error:', err);
        res.status(500).json({ 
            error: 'Unable to check username availability',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Get all users endpoint for admin management
app.get('/api/users', authenticateToken, async (req, res) => {
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
            // Return test users for local development
            return res.json([
                {
                    user_key: 1,
                    username: 'admin',
                    first_name: 'Test',
                    middle_name: 'Local',
                    last_name: 'Admin',
                    email: 'admin@test.com',
                    date_created: '2024-01-01T00:00:00.000Z',
                    roles: ['Administrator'],
                    role_keys: [1]
                },
                {
                    user_key: 2,
                    username: 'testuser',
                    first_name: 'Test',
                    middle_name: null,
                    last_name: 'User',
                    email: 'user@test.com',
                    date_created: '2024-01-02T00:00:00.000Z',
                    roles: ['User'],
                    role_keys: [2]
                }
            ]);
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
        
        res.json(usersResult.rows);
        
    } catch (err) {
        console.error('Get users error:', err);
        res.status(500).json({ 
            error: 'Failed to fetch users',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Update user role endpoint
app.put('/api/users/:userId/role', authenticateToken, async (req, res) => {
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
        
        const userId = req.params.userId;
        const { roleKey } = req.body;
        
        if (!roleKey) {
            return res.status(400).json({ error: 'Role key is required' });
        }
        
        // Check if we're in local test mode
        const isLocalTest = process.env.NODE_ENV === 'development' && 
                           process.env.DATABASE_URL?.includes('localhost');
        
        if (isLocalTest) {
            // For local testing, just return success
            return res.json({ 
                message: 'User role updated successfully',
                userId: userId,
                roleKey: roleKey
            });
        }
        
        // Prevent admin from removing their own admin role
        if (parseInt(userId) === req.user.id && parseInt(roleKey) !== 1) {
            return res.status(400).json({ error: 'Cannot remove admin privileges from your own account' });
        }
        
        // Production database logic
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Verify user exists
            const userCheck = await client.query(
                'SELECT user_key FROM tbl_user WHERE user_key = $1',
                [userId]
            );
            
            if (userCheck.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            // Verify role exists
            const roleCheck = await client.query(
                'SELECT role_key FROM tbl_role WHERE role_key = $1',
                [roleKey]
            );
            
            if (roleCheck.rows.length === 0) {
                return res.status(400).json({ error: 'Invalid role selected' });
            }
            
            // Remove existing role assignments for this user
            await client.query(
                'DELETE FROM tbl_user_role WHERE user_key = $1',
                [userId]
            );
            
            // Add new role assignment
            await client.query(
                'INSERT INTO tbl_user_role (user_key, role_key, date_created, date_when) VALUES ($1, $2, NOW(), NOW())',
                [userId, roleKey]
            );
            
            await client.query('COMMIT');
            
            res.json({ 
                message: 'User role updated successfully',
                userId: userId,
                roleKey: roleKey
            });
            
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error('Update user role error:', err);
        res.status(500).json({ 
            error: 'Failed to update user role',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Delete user endpoint
app.delete('/api/users/:userId', authenticateToken, async (req, res) => {
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
        
        const userId = req.params.userId;
        
        // Prevent admin from deleting their own account
        if (parseInt(userId) === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        
        // Check if we're in local test mode
        const isLocalTest = process.env.NODE_ENV === 'development' && 
                           process.env.DATABASE_URL?.includes('localhost');
        
        if (isLocalTest) {
            // For local testing, just return success
            return res.json({ 
                message: 'User deleted successfully',
                userId: userId
            });
        }
        
        // Production database logic
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Verify user exists and get their name_key
            const userCheck = await client.query(
                'SELECT user_key, name_key FROM tbl_user WHERE user_key = $1',
                [userId]
            );
            
            if (userCheck.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const nameKey = userCheck.rows[0].name_key;
            
            // Delete user role assignments
            await client.query(
                'DELETE FROM tbl_user_role WHERE user_key = $1',
                [userId]
            );
            
            // Delete user account
            await client.query(
                'DELETE FROM tbl_user WHERE user_key = $1',
                [userId]
            );
            
            // Delete associated name data if it exists
            if (nameKey) {
                await client.query(
                    'DELETE FROM tbl_name_data WHERE name_key = $1',
                    [nameKey]
                );
            }
            
            await client.query('COMMIT');
            
            res.json({ 
                message: 'User deleted successfully',
                userId: userId
            });
            
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ 
            error: 'Failed to delete user',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Database migration function
async function runDatabaseMigrations() {
    try {
        // Skip migration if no valid database URL is configured
        if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('username')) {
            console.log('No valid database configuration found, skipping migrations');
            return;
        }
        
        const client = await pool.connect();
        
        // Check if password_change_required column exists, if not add it
        const passwordColumnCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'tbl_user' 
            AND column_name = 'password_change_required'
        `);
        
        if (passwordColumnCheck.rows.length === 0) {
            console.log('Adding password_change_required column to tbl_user table...');
            
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
        
        // Check and add 2FA columns
        const twofaColumns = [
            { name: 'twofa_secret', type: 'VARCHAR(32)', description: '2FA secret key' },
            { name: 'twofa_enabled', type: 'BOOLEAN DEFAULT FALSE', description: '2FA enabled flag' },
            { name: 'backup_codes', type: 'TEXT', description: '2FA backup codes (JSON)' },
            { name: 'twofa_setup_date', type: 'TIMESTAMP', description: '2FA setup timestamp' }
        ];
        
        for (const column of twofaColumns) {
            const columnCheck = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'tbl_user' 
                AND column_name = $1
            `, [column.name]);
            
            if (columnCheck.rows.length === 0) {
                console.log(`Adding ${column.name} column to tbl_user table (${column.description})...`);
                
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
        
        console.log('Database migration completed successfully');
        client.release();
        
    } catch (err) {
        console.error('Database migration error:', err.message);
        // Don't fail server startup for migration errors
        console.log('Continuing server startup without database migrations');
    }
}

// Initialize database migrations before starting server
async function startServer() {
    try {
        await runDatabaseMigrations();
        
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err.message);
        // Try to start server anyway for local development
        console.log('Attempting to start server without database migrations...');
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT} (database migrations skipped)`);
        });
    }
}

// Start the server
startServer();