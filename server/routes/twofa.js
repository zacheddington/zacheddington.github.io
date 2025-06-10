// Two-Factor Authentication Routes
// 2FA setup, verification, and management endpoints

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const { authenticateToken } = require('../middleware/auth');
const { validateRequiredFields, sanitizeInput } = require('../middleware/validation');
const { pool } = require('../config/database');
const { successResponse, errorResponse, updatedResponse, notFoundResponse } = require('../utils/responseHelpers');
const config = require('../config/environment');

// Setup 2FA - Generate secret and QR code
router.post('/2fa/setup', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const username = req.user.username;
        
        if (config.isLocalTest) {
            // For local testing, return mock 2FA setup data
            return successResponse(res, {
                secret: 'JBSWY3DPEHPK3PXP',
                qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
                manualEntryKey: 'JBSWY3DPEHPK3PXP',
                issuer: 'IntegrisNeuro Medical Records'
            }, '2FA setup initiated successfully');
        }
        
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
        
        return successResponse(res, {
            secret: secret.base32,
            qrCode: qrCodeUrl,
            manualEntryKey: secret.base32,
            issuer: 'IntegrisNeuro Medical Records'
        }, '2FA setup initiated successfully');
        
    } catch (err) {
        console.error('2FA setup error:', err);
        return errorResponse(res, 'Failed to setup 2FA', 500);
    }
});

// Verify 2FA setup
router.post('/2fa/verify', 
    authenticateToken,
    sanitizeInput,
    validateRequiredFields(['token']),
    async (req, res) => {
        try {
            const { token } = req.body;
            const userId = req.user.id;
            
            if (config.isLocalTest) {
                // For local testing, accept token '123456'
                if (token === '123456') {
                    return successResponse(res, {
                        enabled: true,
                        backupCodes: ['backup1', 'backup2', 'backup3']
                    }, '2FA verified and enabled successfully');
                } else {
                    return errorResponse(res, 'Invalid 2FA token', 400);
                }
            }
            
            const client = await pool.connect();
            try {
                // Get user's 2FA secret
                const userResult = await client.query(
                    'SELECT twofa_secret FROM tbl_user WHERE user_key = $1',
                    [userId]
                );
                
                if (userResult.rows.length === 0) {
                    return notFoundResponse(res, 'User');
                }
                
                const user = userResult.rows[0];
                
                if (!user.twofa_secret) {
                    return errorResponse(res, '2FA not set up. Please run setup first.', 400);
                }
                
                // Verify the token
                const verified = speakeasy.totp.verify({
                    secret: user.twofa_secret,
                    encoding: 'base32',
                    token: token,
                    window: 2
                });
                
                if (!verified) {
                    return errorResponse(res, 'Invalid 2FA token', 400);
                }
                
                // Generate backup codes
                const backupCodes = [];
                for (let i = 0; i < 8; i++) {
                    backupCodes.push(Math.random().toString(36).substring(2, 8).toUpperCase());
                }
                
                // Enable 2FA and save backup codes
                await client.query(
                    'UPDATE tbl_user SET twofa_enabled = true, backup_codes = $1, twofa_setup_date = NOW() WHERE user_key = $2',
                    [JSON.stringify(backupCodes), userId]
                );
                
                return successResponse(res, {
                    enabled: true,
                    backupCodes: backupCodes
                }, '2FA verified and enabled successfully');
                
            } finally {
                client.release();
            }
            
        } catch (err) {
            console.error('2FA verification error:', err);
            return errorResponse(res, 'Failed to verify 2FA', 500);
        }
    }
);

// Disable 2FA
router.post('/2fa/disable', 
    authenticateToken,
    sanitizeInput,
    validateRequiredFields(['password']),
    async (req, res) => {
        try {
            const { password } = req.body;
            const userId = req.user.id;
            
            if (config.isLocalTest) {
                // For local testing, accept password 'admin'
                if (password === 'admin') {
                    return successResponse(res, { enabled: false }, '2FA disabled successfully');
                } else {
                    return errorResponse(res, 'Invalid password', 400);
                }
            }
            
            const client = await pool.connect();
            try {
                // Verify password before disabling 2FA
                const userResult = await client.query(
                    'SELECT password_hash FROM tbl_user WHERE user_key = $1',
                    [userId]
                );
                
                if (userResult.rows.length === 0) {
                    return notFoundResponse(res, 'User');
                }
                
                const user = userResult.rows[0];
                const validPassword = await bcrypt.compare(password, user.password_hash);
                
                if (!validPassword) {
                    return errorResponse(res, 'Invalid password', 400);
                }
                
                // Disable 2FA and clear related data
                await client.query(
                    'UPDATE tbl_user SET twofa_enabled = false, twofa_secret = NULL, backup_codes = NULL WHERE user_key = $1',
                    [userId]
                );
                
                return successResponse(res, { enabled: false }, '2FA disabled successfully');
                
            } finally {
                client.release();
            }
            
        } catch (err) {
            console.error('2FA disable error:', err);
            return errorResponse(res, 'Failed to disable 2FA', 500);
        }
    }
);

// Get 2FA status
router.get('/2fa/status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        if (config.isLocalTest) {
            // For local testing, return status
            return successResponse(res, {
                enabled: false,
                setupDate: null
            }, '2FA status retrieved successfully');
        }
        
        const client = await pool.connect();
        try {
            const result = await client.query(
                'SELECT twofa_enabled, twofa_setup_date FROM tbl_user WHERE user_key = $1',
                [userId]
            );
            
            if (result.rows.length === 0) {
                return notFoundResponse(res, 'User');
            }
            
            const user = result.rows[0];
            return successResponse(res, {
                enabled: user.twofa_enabled || false,
                setupDate: user.twofa_setup_date
            }, '2FA status retrieved successfully');
            
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error('2FA status check error:', err);
        return errorResponse(res, 'Failed to check 2FA status', 500);
    }
});

module.exports = router;
