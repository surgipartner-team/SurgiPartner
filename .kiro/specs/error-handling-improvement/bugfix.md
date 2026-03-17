# Bugfix Requirements Document

## Introduction

The system currently shows generic "Database operation failed" error messages to users when database operations fail, regardless of the specific error type (duplicate keys, foreign key constraints, connection issues, etc.). This prevents users from understanding what went wrong and how to fix it. The issue originates in `src/lib/db.js` which catches all database errors and throws a generic error message, losing the specific error context. Additionally, API routes throughout the project don't properly catch and translate database errors into user-friendly messages, and there's inconsistent use of toast notifications for user feedback.

This affects all database operations across the entire application including patients, users, hospitals, doctors, billing, consumables, and all other modules.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a database operation fails with a duplicate key constraint (e.g., duplicate medical_record_number, email, username) THEN the system throws "Database operation failed" without indicating which field is duplicated

1.2 WHEN a database operation fails with a foreign key constraint violation (e.g., referencing non-existent doctor_id or hospital_id) THEN the system throws "Database operation failed" without indicating the invalid reference

1.3 WHEN a database connection fails or times out THEN the system throws "Database operation failed" without indicating a connectivity issue

1.4 WHEN API routes receive database errors THEN they return generic error messages or crash without proper error handling

1.5 WHEN users perform operations that fail THEN they often see no toast notification or inconsistent error feedback

### Expected Behavior (Correct)

2.1 WHEN a database operation fails with a duplicate key constraint THEN the system SHALL identify the specific field causing the duplicate and return a user-friendly message like "This [field name] is already in use"

2.2 WHEN a database operation fails with a foreign key constraint violation THEN the system SHALL identify the invalid reference and return a message like "Invalid [entity name] selected" or "The selected [entity] does not exist"

2.3 WHEN a database connection fails or times out THEN the system SHALL return a message indicating "Unable to connect to database. Please try again later"

2.4 WHEN API routes receive database errors THEN they SHALL catch and translate them into appropriate HTTP status codes (400 for validation, 409 for conflicts, 500 for server errors) with user-friendly messages

2.5 WHEN users perform operations that fail THEN they SHALL see consistent toast error notifications with specific, actionable error messages

2.6 WHEN users perform operations that succeed THEN they SHALL see consistent toast success notifications confirming the action

### Unchanged Behavior (Regression Prevention)

3.1 WHEN database operations succeed THEN the system SHALL CONTINUE TO return successful results without modification

3.2 WHEN API routes handle successful requests THEN they SHALL CONTINUE TO return the same response structure and status codes

3.3 WHEN existing error logging occurs THEN the system SHALL CONTINUE TO log detailed error information to the console for debugging

3.4 WHEN the auth.js registerUser function handles duplicate entries THEN it SHALL CONTINUE TO provide specific duplicate field messages as it currently does
