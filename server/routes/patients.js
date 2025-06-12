// Patient Management Routes
// CRUD operations for patient data

const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../middleware/auth');
const { validateRequiredFields, sanitizeInput } = require('../middleware/validation');
const { pool } = require('../config/database');
const { successResponse, errorResponse, deletedResponse, notFoundResponse } = require('../utils/responseHelpers');
const config = require('../config/environment');

// Get all patients endpoint
router.get('/patients', authenticateToken, async (req, res) => {
    try {
        if (config.isLocalTest) {
            // Return test patients for local development
            return successResponse(res, [
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
            ], 'Patients retrieved successfully');
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
            
            return successResponse(res, result.rows, 'Patients retrieved successfully');
            
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error('Get patients error:', err);
        return errorResponse(res, 'Failed to fetch patients', 500);
    }
});

// Get single patient endpoint
router.get('/patients/:patientKey', authenticateToken, async (req, res) => {
    try {
        const patientKey = req.params.patientKey;
        
        if (config.isLocalTest) {
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
                return successResponse(res, patient, 'Patient retrieved successfully');
            } else {
                return notFoundResponse(res, 'Patient');
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
                return notFoundResponse(res, 'Patient');
            }
            
            return successResponse(res, result.rows[0], 'Patient retrieved successfully');
            
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error('Get patient error:', err);
        return errorResponse(res, 'Failed to fetch patient', 500);
    }
});

// Create patient endpoint
router.post('/patients', 
    authenticateToken,
    sanitizeInput,
    validateRequiredFields(['firstName', 'lastName', 'address', 'phone', 'acceptsTexts']),
    async (req, res) => {
        try {
            const { firstName, middleName, lastName, address, phone, acceptsTexts } = req.body;
            
            if (config.isLocalTest) {
                // For local testing, just return success
                return successResponse(res, {
                    patient_key: Math.floor(Math.random() * 1000),
                    firstName,
                    middleName,
                    lastName,
                    address,
                    phone,
                    acceptsTexts: acceptsTexts === 'yes'
                }, 'Patient created successfully');
            }
            
            // Production database logic
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                
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
                
                // Insert into tbl_patient
                const patientResult = await client.query(
                    'INSERT INTO tbl_patient (name_key, address, phone, accepts_texts, who, date_when) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING patient_key',
                    [nameKey, address, phone, acceptsTexts === 'yes', creatorUsername]
                );
                
                if (patientResult.rows.length === 0) {
                    throw new Error('Failed to create patient record');
                }
                
                const patientKey = patientResult.rows[0].patient_key;
                
                await client.query('COMMIT');
                
                return successResponse(res, {
                    patient_key: patientKey,
                    firstName,
                    middleName,
                    lastName,
                    address,
                    phone,
                    acceptsTexts: acceptsTexts === 'yes',
                    nameKey
                }, 'Patient created successfully');
                
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
            
        } catch (err) {
            console.error('Patient creation error:', err);
            return errorResponse(res, err.message || 'Failed to create patient. Please try again later.', 500);
        }
    }
);

// Delete patient endpoint
router.delete('/patients/:patientKey', authenticateToken, async (req, res) => {
    try {
        const patientKey = req.params.patientKey;
        
        if (config.isLocalTest) {
            // For local testing, just return success
            return deletedResponse(res, 'Patient deleted successfully');
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
                return notFoundResponse(res, 'Patient');
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
            
            return deletedResponse(res, 'Patient deleted successfully');
            
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error('Delete patient error:', err);
        return errorResponse(res, 'Failed to delete patient', 500);
    }
});

module.exports = router;
