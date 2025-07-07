// Studies Management Routes
// CRUD operations for study data and patient-study associations

const express = require('express');
const router = express.Router();

const { authenticateToken, requireAdmin } = require('../middleware/auth');
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

// Get all studies with patient information
router.get('/studies', authenticateToken, async (req, res) => {
    try {
        const { search, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT 
                s.study_key,
                s.referring_physician,
                s.interpreting_physician,
                s.start_date,
                s.study_length,
                s.date_created,
                s.date_updated,
                ps.patient_key,
                CONCAT(nd.first_name, ' ', COALESCE(nd.middle_name || ' ', ''), nd.last_name) as patient_name,
                nd.first_name,
                nd.middle_name,
                nd.last_name,
                p.date_of_birth,
                p.phone
            FROM tbl_study s
            INNER JOIN tbl_patient_study ps ON s.study_key = ps.study_key
            INNER JOIN tbl_patient p ON ps.patient_key = p.patient_key
            INNER JOIN tbl_name_data nd ON p.name_key = nd.name_key
        `;

        let queryParams = [];
        let paramIndex = 1;

        if (search) {
            query += ` WHERE (
                nd.first_name ILIKE $${paramIndex} OR 
                nd.last_name ILIKE $${paramIndex} OR 
                s.referring_physician ILIKE $${paramIndex} OR
                s.interpreting_physician ILIKE $${paramIndex}
            )`;
            queryParams.push(`%${search}%`);
            paramIndex++;
        }

        query += ` ORDER BY s.date_created DESC LIMIT $${paramIndex} OFFSET $${
            paramIndex + 1
        }`;
        queryParams.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, queryParams);

        return successResponse(res, {
            studies: result.rows,
            total: result.rows.length,
            limit: parseInt(limit),
            offset: parseInt(offset),
        });
    } catch (err) {
        console.error('Studies fetch error:', err);
        return errorResponse(
            res,
            'Failed to fetch studies. Please try again later.',
            500
        );
    }
});

// Get single study by ID
router.get('/studies/:studyKey', authenticateToken, async (req, res) => {
    try {
        const studyKey = req.params.studyKey;

        const result = await pool.query(
            `
            SELECT 
                s.study_key,
                s.referring_physician,
                s.interpreting_physician,
                s.start_date,
                s.study_length,
                s.date_created,
                s.date_updated,
                ps.patient_key,
                CONCAT(nd.first_name, ' ', COALESCE(nd.middle_name || ' ', ''), nd.last_name) as patient_name,
                nd.first_name,
                nd.middle_name,
                nd.last_name,
                p.date_of_birth,
                p.phone,
                ad.street_1,
                ad.street_2,
                ad.city,
                ad.state,
                ad.zip
            FROM tbl_study s
            INNER JOIN tbl_patient_study ps ON s.study_key = ps.study_key
            INNER JOIN tbl_patient p ON ps.patient_key = p.patient_key
            INNER JOIN tbl_name_data nd ON p.name_key = nd.name_key
            INNER JOIN tbl_address_data ad ON p.address_key = ad.address_key
            WHERE s.study_key = $1
            `,
            [studyKey]
        );

        if (result.rows.length === 0) {
            return notFoundResponse(res, 'Study not found');
        }

        return successResponse(res, result.rows[0]);
    } catch (err) {
        console.error('Study fetch error:', err);
        return errorResponse(
            res,
            'Failed to fetch study. Please try again later.',
            500
        );
    }
});

// Create new study
router.post(
    '/studies',
    authenticateToken,
    sanitizeInput,
    validateRequiredFields([
        'patientId',
        'referringPhysician',
        'interpretingPhysician',
        'startDate',
        'studyLength',
    ]),
    async (req, res) => {
        try {
            const {
                patientId,
                referringPhysician,
                interpretingPhysician,
                startDate,
                studyLength,
            } = req.body;

            // Validate study length (must be 1-4 days as per schema)
            const studyLengthNum = parseInt(studyLength);
            if (
                isNaN(studyLengthNum) ||
                studyLengthNum < 1 ||
                studyLengthNum > 4
            ) {
                return errorResponse(
                    res,
                    'Study length must be between 1 and 4 days',
                    400
                );
            }

            // Handle both new and legacy date formats for backward compatibility
            let isoTimestamp;

            // Try new timestamp format first (YYYY-MM-DDTHH:MM:SS)
            const datetimeRegex =
                /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;
            if (datetimeRegex.test(startDate)) {
                // New format - parse components to ensure proper timezone handling
                const match = startDate.match(datetimeRegex);
                const [, year, month, day, hour, minute, second] = match;

                // Create a timestamp that preserves the entered time (no timezone conversion)
                // We'll treat this as the local timezone of the facility
                const startDateTime = new Date(
                    year,
                    month - 1,
                    day,
                    hour,
                    minute,
                    second
                );
                if (isNaN(startDateTime.getTime())) {
                    return errorResponse(
                        res,
                        'Invalid start date and time',
                        400
                    );
                }
                isoTimestamp = startDateTime.toISOString();
            } else {
                // Legacy format (MM/DD/YYYY) - check if startDateLegacy exists
                const { startDateLegacy } = req.body;
                const legacyDateRegex =
                    /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
                if (startDateLegacy && legacyDateRegex.test(startDateLegacy)) {
                    // Convert MM/DD/YYYY to ISO date format for database
                    const [month, day, year] = startDateLegacy.split('/');
                    const isoDate = `${year}-${month.padStart(
                        2,
                        '0'
                    )}-${day.padStart(2, '0')}`;
                    isoTimestamp = new Date(isoDate).toISOString();
                } else {
                    return errorResponse(
                        res,
                        'Start date must be in valid format',
                        400
                    );
                }
            }

            // Production database logic
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // Get the creator's username for the 'who' field
                const creatorUsername = req.user.username;

                // Verify patient exists
                const patientCheck = await client.query(
                    'SELECT patient_key FROM tbl_patient WHERE patient_key = $1',
                    [patientId]
                );

                if (patientCheck.rows.length === 0) {
                    throw new Error('Patient not found');
                }

                // Insert into tbl_study
                const studyResult = await client.query(
                    'INSERT INTO tbl_study (referring_physician, interpreting_physician, start_date, study_length, who, date_when, date_created) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING study_key',
                    [
                        referringPhysician,
                        interpretingPhysician,
                        isoTimestamp,
                        studyLengthNum,
                        creatorUsername,
                    ]
                );

                if (studyResult.rows.length === 0) {
                    throw new Error('Failed to create study record');
                }

                const studyKey = studyResult.rows[0].study_key;

                // Insert into tbl_patient_study to associate patient with study
                await client.query(
                    'INSERT INTO tbl_patient_study (patient_key, study_key, who, date_when, date_created) VALUES ($1, $2, $3, NOW(), NOW())',
                    [patientId, studyKey, creatorUsername]
                );

                await client.query('COMMIT');

                return successResponse(
                    res,
                    {
                        study_key: studyKey,
                        patient_key: parseInt(patientId),
                        referring_physician: referringPhysician,
                        interpreting_physician: interpretingPhysician,
                        start_date: isoTimestamp,
                        study_length: studyLengthNum,
                    },
                    'Study created successfully'
                );
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        } catch (err) {
            console.error('Study creation error:', err);
            return errorResponse(
                res,
                err.message ||
                    'Failed to create study. Please try again later.',
                500
            );
        }
    }
);

// Update study endpoint
router.put(
    '/studies/:studyKey',
    authenticateToken,
    requireAdmin,
    sanitizeInput,
    validateRequiredFields([
        'referringPhysician',
        'interpretingPhysician',
        'startDate',
        'studyLength',
    ]),
    async (req, res) => {
        try {
            const studyKey = req.params.studyKey;
            const {
                referringPhysician,
                interpretingPhysician,
                startDate,
                studyLength,
            } = req.body;

            // Validate study length
            const studyLengthNum = parseInt(studyLength);
            if (
                isNaN(studyLengthNum) ||
                studyLengthNum < 1 ||
                studyLengthNum > 365
            ) {
                return errorResponse(
                    res,
                    'Study length must be a number between 1 and 365 days',
                    400
                );
            }

            // Validate date format (MM/DD/YYYY)
            const dateRegex =
                /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
            if (!dateRegex.test(startDate)) {
                return errorResponse(
                    res,
                    'Start date must be in MM/DD/YYYY format',
                    400
                );
            }

            // Convert MM/DD/YYYY to ISO date format for database
            const [month, day, year] = startDate.split('/');
            const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(
                2,
                '0'
            )}`;

            // Production database logic
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // Get the updater's username for the 'who' field
                const updaterUsername = req.user.username;

                // Update study record
                const updateResult = await client.query(
                    'UPDATE tbl_study SET referring_physician = $1, interpreting_physician = $2, start_date = $3, study_length = $4, who = $5, date_when = NOW(), date_updated = NOW() WHERE study_key = $6 RETURNING study_key',
                    [
                        referringPhysician,
                        interpretingPhysician,
                        isoDate,
                        studyLengthNum,
                        updaterUsername,
                        studyKey,
                    ]
                );

                if (updateResult.rows.length === 0) {
                    return notFoundResponse(res, 'Study not found');
                }

                await client.query('COMMIT');

                return successResponse(
                    res,
                    {
                        study_key: parseInt(studyKey),
                        referring_physician: referringPhysician,
                        interpreting_physician: interpretingPhysician,
                        start_date: isoDate,
                        study_length: studyLengthNum,
                    },
                    'Study updated successfully'
                );
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        } catch (err) {
            console.error('Study update error:', err);
            return errorResponse(
                res,
                err.message ||
                    'Failed to update study. Please try again later.',
                500
            );
        }
    }
);

// Delete study endpoint
router.delete(
    '/studies/:studyKey',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const studyKey = req.params.studyKey;

            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // Check if study exists
                const studyCheck = await client.query(
                    'SELECT study_key FROM tbl_study WHERE study_key = $1',
                    [studyKey]
                );

                if (studyCheck.rows.length === 0) {
                    return notFoundResponse(res, 'Study not found');
                }

                // Delete from tbl_patient_study first (foreign key constraint)
                await client.query(
                    'DELETE FROM tbl_patient_study WHERE study_key = $1',
                    [studyKey]
                );

                // Delete from tbl_study
                await client.query(
                    'DELETE FROM tbl_study WHERE study_key = $1',
                    [studyKey]
                );

                await client.query('COMMIT');

                return deletedResponse(res, 'Study deleted successfully');
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        } catch (err) {
            console.error('Study deletion error:', err);
            return errorResponse(
                res,
                'Failed to delete study. Please try again later.',
                500
            );
        }
    }
);

module.exports = router;
