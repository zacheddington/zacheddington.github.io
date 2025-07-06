# Database Schema Documentation

This document outlines the expected database structure for the Integris Neuro application. All tables are managed externally and should be created/maintained outside of the application code.

## Core User Management Tables

### `tbl_user`

User accounts and authentication data.

```sql
CREATE TABLE tbl_user (
    user_key SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    middle_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(255),
    role VARCHAR(20) DEFAULT 'User' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    password_change_required BOOLEAN DEFAULT FALSE NOT NULL,
    last_login TIMESTAMP,
    password_changed_date TIMESTAMP,
    twofa_secret VARCHAR(32),
    twofa_enabled BOOLEAN DEFAULT FALSE,
    backup_codes TEXT,
    twofa_setup_date TIMESTAMP,
    who VARCHAR(50) NOT NULL,
    date_when TIMESTAMP DEFAULT NOW(),
    date_created TIMESTAMP DEFAULT NOW()
);
```

### `tbl_user_session`

Session management for logged-in users.

```sql
CREATE TABLE tbl_user_session (
    session_key SERIAL PRIMARY KEY,
    user_key INTEGER NOT NULL REFERENCES tbl_user(user_key) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '8 hours'),
    logout_time TIMESTAMP,
    ip_address VARCHAR(50) NOT NULL,
    browser_info VARCHAR(100),
    login_method VARCHAR(20) DEFAULT 'password',
    is_active BOOLEAN DEFAULT TRUE,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_reason VARCHAR(100)
);

-- Indexes for performance
CREATE INDEX idx_user_session_user_key ON tbl_user_session(user_key);
CREATE INDEX idx_user_session_token ON tbl_user_session(session_token);
CREATE INDEX idx_user_session_active ON tbl_user_session(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_user_session_expires ON tbl_user_session(expires_at);
```

## Patient Management Tables

### `tbl_name_data`

Patient name information.

```sql
CREATE TABLE tbl_name_data (
    name_key SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    last_name VARCHAR(50) NOT NULL,
    who VARCHAR(50) NOT NULL,
    date_when TIMESTAMP DEFAULT NOW()
);
```

### `tbl_address_data`

Patient address information.

```sql
CREATE TABLE tbl_address_data (
    address_key SERIAL PRIMARY KEY,
    street_1 VARCHAR(100),
    street_2 VARCHAR(100),
    city VARCHAR(50),
    state VARCHAR(2),
    zip VARCHAR(10),
    who VARCHAR(50) NOT NULL,
    date_when TIMESTAMP DEFAULT NOW()
);
```

### `tbl_patient`

Main patient records linking name and address data.

```sql
CREATE TABLE tbl_patient (
    patient_key SERIAL PRIMARY KEY,
    name_key INTEGER NOT NULL REFERENCES tbl_name_data(name_key),
    address_key INTEGER NOT NULL REFERENCES tbl_address_data(address_key),
    date_of_birth DATE NOT NULL,
    phone VARCHAR(20),
    accepts_texts VARCHAR(10) DEFAULT 'no' CHECK (accepts_texts IN ('yes', 'no', 'unknown')),
    notes TEXT,
    who VARCHAR(50) NOT NULL,
    date_when TIMESTAMP DEFAULT NOW(),
    date_created TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_patient_name_key ON tbl_patient(name_key);
CREATE INDEX idx_patient_address_key ON tbl_patient(address_key);
```

## Studies Management Tables

### `tbl_study`

Research study information.

```sql
CREATE TABLE tbl_study (
    study_key SERIAL PRIMARY KEY,
    referring_physician VARCHAR(100) NOT NULL,
    interpreting_physician VARCHAR(100) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    study_length INTEGER NOT NULL CHECK (study_length > 0 AND study_length <= 4),
    who VARCHAR(50) NOT NULL,
    date_when TIMESTAMP DEFAULT NOW(),
    date_created TIMESTAMP DEFAULT NOW(),
    date_updated TIMESTAMP DEFAULT NOW()
);
```

### `tbl_patient_study`

Association between patients and studies.

```sql
CREATE TABLE tbl_patient_study (
    patient_study_key SERIAL PRIMARY KEY,
    patient_key INTEGER NOT NULL REFERENCES tbl_patient(patient_key) ON DELETE CASCADE,
    study_key INTEGER NOT NULL REFERENCES tbl_study(study_key) ON DELETE CASCADE,
    who VARCHAR(50) NOT NULL,
    date_when TIMESTAMP DEFAULT NOW(),
    date_created TIMESTAMP DEFAULT NOW(),
    UNIQUE(patient_key, study_key)
);

-- Indexes for performance
CREATE INDEX idx_patient_study_patient_key ON tbl_patient_study(patient_key);
CREATE INDEX idx_patient_study_study_key ON tbl_patient_study(study_key);
```

## Notes

-   **Foreign Key Constraints**: All tables use proper foreign key relationships for data integrity
-   **Audit Fields**: Most tables include `who`, `date_when`, and `date_created` for tracking changes
-   **Indexes**: Performance indexes are created on frequently queried columns
-   **Constraints**: Data validation constraints ensure data quality (e.g., study length, text preferences)
-   **Cascading Deletes**: Related records are properly cleaned up when parent records are deleted

## Application Expectations

The application code assumes:

1. All tables exist with the exact structure defined above
2. Primary keys are auto-incrementing SERIAL columns
3. Foreign key constraints are properly configured
4. Indexes exist for optimal query performance
5. Check constraints enforce data validation rules

Any changes to this schema should be coordinated with application code updates.
