// Patient Management Routes
// CRUD operations for patient data

const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../middleware/auth');
const {
    validateRequiredFields,
    sanitizeInput,
} = require('../middleware/validation');
const { pool } = require('../config/database');
const {
    successResponse,
    errorResponse,
    deletedResponse,
    notFoundResponse,
} = require('../utils/responseHelpers');
const config = require('../config/environment');

// Get all patients endpoint
router.get('/patients', authenticateToken, async (req, res) => {
    try {
        if (config.isLocalTest) {
            // Return test patients for local development
            return successResponse(
                res,
                [
                    {
                        patient_key: 1,
                        first_name: 'John',
                        middle_name: 'A',
                        last_name: 'Doe',
                        street_1: '123 Main St',
                        street_2: 'Apt 4B',
                        city: 'Anytown',
                        state: 'CA',
                        zip: '12345',
                        phone: '5551234567',
                        accepts_texts: true,
                        date_of_birth: '1990-01-15',
                        created_at: '2024-01-01T00:00:00.000Z',
                    },
                    {
                        patient_key: 2,
                        first_name: 'Jane',
                        middle_name: null,
                        last_name: 'Smith',
                        street_1: '456 Oak Ave',
                        street_2: null,
                        city: 'Springfield',
                        state: 'IL',
                        zip: '62701',
                        phone: '5559876543',
                        accepts_texts: false,
                        date_of_birth: '1985-05-20',
                        created_at: '2024-01-02T00:00:00.000Z',
                    },
                ],
                'Patients retrieved successfully'
            );
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
                    a.street_1,
                    a.street_2,
                    a.city,
                    a.state,
                    a.zip,
                    p.phone,
                    p.accepts_texts,
                    p.date_of_birth,
                    p.date_when as created_at
                FROM tbl_patient p
                LEFT JOIN tbl_name_data n ON p.name_key = n.name_key
                LEFT JOIN tbl_address_data a ON p.address_key = a.address_key
                ORDER BY n.last_name, n.first_name
            `);

            // Format the data for frontend consumption
            const formattedPatients = result.rows.map((patient) => {
                // Construct full address
                let address = patient.street_1 || '';
                if (patient.street_2) {
                    address += `, ${patient.street_2}`;
                }
                if (patient.city) {
                    address += `, ${patient.city}`;
                }
                if (patient.state) {
                    address += `, ${patient.state}`;
                }
                if (patient.zip) {
                    address += ` ${patient.zip}`;
                }

                return {
                    ...patient,
                    address: address.trim() || 'No address on file',
                };
            });

            return successResponse(
                res,
                formattedPatients,
                'Patients retrieved successfully'
            );
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
                1: {
                    patient_key: 1,
                    first_name: 'John',
                    middle_name: 'A',
                    last_name: 'Doe',
                    street_1: '123 Main St',
                    street_2: 'Apt 4B',
                    city: 'Anytown',
                    state: 'CA',
                    zip: '12345',
                    phone: '5551234567',
                    accepts_texts: true,
                    date_of_birth: '1990-01-15',
                    date_when: '2024-01-01T00:00:00.000Z',
                },
                2: {
                    patient_key: 2,
                    first_name: 'Jane',
                    middle_name: null,
                    last_name: 'Smith',
                    street_1: '456 Oak Ave',
                    street_2: null,
                    city: 'Somewhere',
                    state: 'NY',
                    zip: '67890',
                    phone: '5555678901',
                    accepts_texts: false,
                    date_of_birth: '1985-07-22',
                    date_when: '2024-01-02T00:00:00.000Z',
                },
            };

            const patient = testPatients[patientKey];
            if (patient) {
                return successResponse(
                    res,
                    patient,
                    'Patient retrieved successfully'
                );
            } else {
                return notFoundResponse(res, 'Patient');
            }
        }

        // Production database logic
        const client = await pool.connect();
        try {
            const result = await client.query(
                `
                SELECT 
                    p.patient_key,
                    n.first_name,
                    n.middle_name,
                    n.last_name,
                    a.street_1,
                    a.street_2,
                    a.city,
                    a.state,
                    a.zip,
                    p.phone,
                    p.accepts_texts,
                    p.date_of_birth,
                    p.date_when
                FROM tbl_patient p
                LEFT JOIN tbl_name_data n ON p.name_key = n.name_key
                LEFT JOIN tbl_address_data a ON p.address_key = a.address_key
                WHERE p.patient_key = $1
            `,
                [patientKey]
            );

            if (result.rows.length === 0) {
                return notFoundResponse(res, 'Patient');
            }

            return successResponse(
                res,
                result.rows[0],
                'Patient retrieved successfully'
            );
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Get patient error:', err);
        return errorResponse(res, 'Failed to fetch patient', 500);
    }
});

// Get single patient by ID for editing
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const patientId = parseInt(req.params.id);

        if (isNaN(patientId)) {
            return errorResponse(res, 'Invalid patient ID', 400);
        }
        if (config.isLocalTest) {
            // Local test mode - return mock data
            const mockPatient = {
                patient_key: patientId,
                first_name: 'John',
                middle_name: 'A',
                last_name: 'Doe',
                street_1: '123 Main Street',
                street_2: 'Apt 4B',
                city: 'Anytown',
                state: 'CA',
                zip: '12345',
                phone: '(555) 123-4567',
                accepts_texts: true,
                date_of_birth: '1990-01-15',
                created_at: new Date().toISOString(),
            };

            return successResponse(
                res,
                mockPatient,
                'Patient retrieved successfully'
            );
        }

        const client = await pool.connect();
        try {
            const result = await client.query(
                `
                SELECT 
                    p.patient_key,
                    n.first_name,
                    n.middle_name,
                    n.last_name,
                    a.street_1,
                    a.street_2,
                    a.city,
                    a.state,
                    a.zip,
                    p.phone,
                    p.accepts_texts,
                    p.date_of_birth,
                    p.date_when as created_at
                FROM tbl_patient p
                LEFT JOIN tbl_name_data n ON p.name_key = n.name_key
                LEFT JOIN tbl_address_data a ON p.address_key = a.address_key
                WHERE p.patient_key = $1
            `,
                [patientId]
            );

            if (result.rows.length === 0) {
                return notFoundResponse(res, 'Patient');
            }

            return successResponse(
                res,
                result.rows[0],
                'Patient retrieved successfully'
            );
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Get patient error:', err);
        return errorResponse(res, 'Failed to fetch patient', 500);
    }
});

// Create patient endpoint
router.post(
    '/patients',
    authenticateToken,
    sanitizeInput,
    validateRequiredFields([
        'firstName',
        'lastName',
        'dateOfBirth',
        'address1',
        'city',
        'state',
        'zip',
        'phone',
        'acceptsTexts',
    ]),
    async (req, res) => {
        try {
            const {
                firstName,
                middleName,
                lastName,
                dateOfBirth,
                address1,
                address2,
                city,
                state,
                zip,
                phone,
                acceptsTexts,
            } = req.body;

            if (config.isLocalTest) {
                // For local testing, just return success
                return successResponse(
                    res,
                    {
                        patient_key: Math.floor(Math.random() * 1000),
                        firstName,
                        middleName,
                        lastName,
                        dateOfBirth,
                        address1,
                        address2,
                        city,
                        state,
                        zip,
                        phone,
                        acceptsTexts: acceptsTexts === 'yes',
                    },
                    'Patient created successfully'
                );
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

                // Insert into tbl_address_data
                const addressResult = await client.query(
                    'INSERT INTO tbl_address_data (street_1, street_2, city, state, zip, who, date_when) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING address_key',
                    [
                        address1,
                        address2 || null,
                        city,
                        state,
                        zip,
                        creatorUsername,
                    ]
                );

                if (addressResult.rows.length === 0) {
                    throw new Error('Failed to create address record');
                }

                const addressKey = addressResult.rows[0].address_key;

                // Insert into tbl_patient
                const patientResult = await client.query(
                    'INSERT INTO tbl_patient (name_key, address_key, phone, accepts_texts, date_of_birth, who, date_when) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING patient_key',
                    [
                        nameKey,
                        addressKey,
                        phone,
                        acceptsTexts === 'yes',
                        dateOfBirth,
                        creatorUsername,
                    ]
                );

                if (patientResult.rows.length === 0) {
                    throw new Error('Failed to create patient record');
                }

                const patientKey = patientResult.rows[0].patient_key;

                await client.query('COMMIT');

                return successResponse(
                    res,
                    {
                        patient_key: patientKey,
                        firstName,
                        middleName,
                        lastName,
                        dateOfBirth,
                        address1,
                        address2,
                        city,
                        state,
                        zip,
                        phone,
                        acceptsTexts: acceptsTexts === 'yes',
                        nameKey,
                        addressKey,
                    },
                    'Patient created successfully'
                );
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        } catch (err) {
            console.error('Patient creation error:', err);
            return errorResponse(
                res,
                err.message ||
                    'Failed to create patient. Please try again later.',
                500
            );
        }
    }
);

// Update patient endpoint
router.put(
    '/patients/:patientKey',
    authenticateToken,
    sanitizeInput,
    validateRequiredFields([
        'firstName',
        'lastName',
        'dateOfBirth',
        'address1',
        'city',
        'state',
        'zip',
        'phone',
        'acceptsTexts',
    ]),
    async (req, res) => {
        try {
            const patientKey = req.params.patientKey;
            const {
                firstName,
                middleName,
                lastName,
                dateOfBirth,
                address1,
                address2,
                city,
                state,
                zip,
                phone,
                acceptsTexts,
            } = req.body;

            if (config.isLocalTest) {
                // For local testing, just return success
                return successResponse(
                    res,
                    {
                        patient_key: parseInt(patientKey),
                        firstName,
                        middleName,
                        lastName,
                        dateOfBirth,
                        address1,
                        address2,
                        city,
                        state,
                        zip,
                        phone,
                        acceptsTexts: acceptsTexts === 'yes',
                    },
                    'Patient updated successfully'
                );
            }

            // Production database logic
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // Get the creator's username for the 'who' field
                const updaterUsername = req.user.username;

                // Get existing patient with associated keys
                const existingPatient = await client.query(
                    'SELECT name_key, address_key FROM tbl_patient WHERE patient_key = $1',
                    [patientKey]
                );

                if (existingPatient.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return notFoundResponse(res, 'Patient');
                }

                const { name_key, address_key } = existingPatient.rows[0];

                // Update name data
                await client.query(
                    'UPDATE tbl_name_data SET first_name = $1, middle_name = $2, last_name = $3, who = $4, date_when = NOW() WHERE name_key = $5',
                    [
                        firstName,
                        middleName || null,
                        lastName,
                        updaterUsername,
                        name_key,
                    ]
                );

                // Update address data
                await client.query(
                    'UPDATE tbl_address_data SET street_1 = $1, street_2 = $2, city = $3, state = $4, zip = $5, who = $6, date_when = NOW() WHERE address_key = $7',
                    [
                        address1,
                        address2 || null,
                        city,
                        state,
                        zip,
                        updaterUsername,
                        address_key,
                    ]
                );

                // Update patient record
                await client.query(
                    'UPDATE tbl_patient SET phone = $1, accepts_texts = $2, date_of_birth = $3, who = $4, date_when = NOW() WHERE patient_key = $5',
                    [
                        phone,
                        acceptsTexts === 'yes',
                        dateOfBirth,
                        updaterUsername,
                        patientKey,
                    ]
                );

                await client.query('COMMIT');

                return successResponse(
                    res,
                    {
                        patient_key: parseInt(patientKey),
                        firstName,
                        middleName,
                        lastName,
                        dateOfBirth,
                        address1,
                        address2,
                        city,
                        state,
                        zip,
                        phone,
                        acceptsTexts: acceptsTexts === 'yes',
                    },
                    'Patient updated successfully'
                );
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        } catch (err) {
            console.error('Patient update error:', err);
            return errorResponse(
                res,
                err.message ||
                    'Failed to update patient. Please try again later.',
                500
            );
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

            // Get the name_key and address_key before deleting the patient
            const patientResult = await client.query(
                'SELECT name_key, address_key FROM tbl_patient WHERE patient_key = $1',
                [patientKey]
            );

            if (patientResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return notFoundResponse(res, 'Patient');
            }

            const { name_key, address_key } = patientResult.rows[0];

            // Delete patient record first (due to foreign key constraints)
            await client.query(
                'DELETE FROM tbl_patient WHERE patient_key = $1',
                [patientKey]
            );

            // Delete associated name data if it exists
            if (name_key) {
                await client.query(
                    'DELETE FROM tbl_name_data WHERE name_key = $1',
                    [name_key]
                );
            }

            // Delete associated address data if it exists
            if (address_key) {
                await client.query(
                    'DELETE FROM tbl_address_data WHERE address_key = $1',
                    [address_key]
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
