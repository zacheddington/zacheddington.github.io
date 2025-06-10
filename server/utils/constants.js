// Application Constants
// Centralized constants used throughout the application

const USER_ROLES = {
    ADMIN: 1,
    USER: 2,
    VIEWER: 3
};

const ROLE_NAMES = {
    1: 'Administrator',
    2: 'User', 
    3: 'Viewer'
};

const PASSWORD_REQUIREMENTS = {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true
};

const FIELD_LIMITS = {
    FIRST_NAME: 50,
    MIDDLE_NAME: 50,
    LAST_NAME: 50,
    EMAIL: 50,
    USERNAME: 50,
    ADDRESS: 100,
    CITY: 50,
    STATE: 2,
    ZIP_CODE: 10,
    PHONE: 20
};

const JWT_CONFIG = {
    EXPIRES_IN: '8h',
    ALGORITHM: 'HS256'
};

const DATABASE_ERRORS = {
    UNIQUE_VIOLATION: '23505',
    FOREIGN_KEY_VIOLATION: '23503',
    CHECK_VIOLATION: '23514',
    CONNECTION_LOST: '08003',
    CONNECTION_FAILURE: '08006'
};

const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/api/login',
        LOGOUT: '/api/logout',
        CHANGE_PASSWORD: '/api/change-password',
        FORCE_CHANGE_PASSWORD: '/api/force-change-password'
    },
    USERS: {
        LIST: '/api/users',
        CREATE: '/api/create-user',
        CHECK_USERNAME: '/api/check-username',
        UPDATE_ROLE: '/api/users/:userId/role',
        DELETE: '/api/users/:userId'
    },
    PATIENTS: {
        LIST: '/api/patients',
        GET: '/api/patients/:patientKey',
        DELETE: '/api/patients/:patientKey'
    },
    PROFILE: {
        UPDATE: '/api/profile'
    },
    HEALTH: {
        AUTHENTICATED: '/api/health',
        PUBLIC: '/api/health/public'
    },
    TWO_FA: {
        SETUP: '/api/2fa/setup',
        VERIFY: '/api/2fa/verify',
        DISABLE: '/api/2fa/disable',
        STATUS: '/api/2fa/status'
    },
    ROLES: {
        LIST: '/api/roles'
    },
    EEG: {
        CREATE: '/api/eeg'
    }
};

module.exports = {
    USER_ROLES,
    ROLE_NAMES,
    PASSWORD_REQUIREMENTS,
    FIELD_LIMITS,
    JWT_CONFIG,
    DATABASE_ERRORS,
    API_ENDPOINTS
};
