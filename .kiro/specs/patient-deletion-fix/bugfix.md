# Bugfix Requirements Document

## Introduction

This document addresses a critical bug in the patient deletion functionality where deleted patients continue to appear in the patients list despite showing a success message. The issue stems from the API's GET endpoint not properly filtering out soft-deleted patients (those with `is_active = 0`) when no explicit status filter is applied or when the status filter is set to 'all'.

The bug creates a false positive user experience: users see a "Patient deleted successfully" toast message, but the patient remains visible in the list, leading to confusion about whether the deletion actually worked.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user deletes a patient AND the status filter is 'all' (default) THEN the system sets `is_active = 0` in the database BUT continues to display the deleted patient in the patients list

1.2 WHEN a user deletes a patient AND the status filter is 'active' THEN the system sets `is_active = 0` in the database BUT continues to display the deleted patient in the patients list

1.3 WHEN fetching patients with status filter 'all' THEN the system returns both active (`is_active = 1`) and inactive (`is_active = 0`) patients without distinction

1.4 WHEN fetching patients with status filter 'active' THEN the system returns both active and inactive patients because the API does not apply the `is_active = 1` filter

### Expected Behavior (Correct)

2.1 WHEN a user deletes a patient AND the status filter is 'all' THEN the system SHALL set `is_active = 0` AND remove the patient from the displayed list immediately

2.2 WHEN a user deletes a patient AND the status filter is 'active' THEN the system SHALL set `is_active = 0` AND remove the patient from the displayed list immediately

2.3 WHEN fetching patients with status filter 'all' THEN the system SHALL return only active patients (`is_active = 1`) by default

2.4 WHEN fetching patients with status filter 'active' THEN the system SHALL return only active patients (`is_active = 1`)

2.5 WHEN the deletion API call succeeds THEN the system SHALL display a success toast message AND refresh the patient list to reflect the deletion

### Unchanged Behavior (Regression Prevention)

3.1 WHEN fetching patients with status filter 'inactive' THEN the system SHALL CONTINUE TO return only inactive patients (`is_active = 0`)

3.2 WHEN fetching a single patient by ID THEN the system SHALL CONTINUE TO return the patient regardless of their `is_active` status

3.3 WHEN calculating patient statistics THEN the system SHALL CONTINUE TO correctly count active and inactive patients separately

3.4 WHEN a user with 'carebuddy' role fetches patients THEN the system SHALL CONTINUE TO return only patients assigned to them through `patient_surgeries`

3.5 WHEN a user with 'sales' role fetches patients THEN the system SHALL CONTINUE TO return only patients they referred (`referred_by_id` matches their user ID)

3.6 WHEN applying search filters THEN the system SHALL CONTINUE TO search across patient name, ID, phone, email, UHID, and IP number fields

3.7 WHEN applying gender or blood group filters THEN the system SHALL CONTINUE TO filter patients by those criteria
