# Patient Deletion Fix Bugfix Design

## Overview

This design addresses a critical bug where soft-deleted patients (with `is_active = 0`) continue to appear in the patients list when the status filter is set to 'all' or 'active'. The bug occurs in the GET endpoint of `src/app/api/v1/patients/route.js`, which fails to apply the `is_active = 1` filter for these status values. The fix involves adding a default filter to exclude soft-deleted patients unless explicitly requesting inactive patients.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when fetching patients with status 'all' or 'active', soft-deleted patients are incorrectly included
- **Property (P)**: The desired behavior - only active patients (`is_active = 1`) should be returned for 'all' and 'active' status filters
- **Preservation**: Existing behaviors that must remain unchanged - role-based filtering, search functionality, statistics calculation, and the 'inactive' status filter
- **handleGet**: The GET request handler function in `src/app/api/v1/patients/route.js` that fetches patients from the database
- **is_active**: The database column that indicates whether a patient is active (1) or soft-deleted (0)
- **Soft Delete**: A deletion pattern where records are marked as inactive rather than physically removed from the database

## Bug Details

### Fault Condition

The bug manifests when the GET endpoint fetches patients with status filter set to 'all' (default) or 'active'. The `handleGet` function applies the `is_active` filter only when status is explicitly 'active' or 'inactive', but the conditional logic is flawed - it doesn't filter out soft-deleted patients when status is 'all' or when no status parameter is provided.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type HTTPRequest with searchParams
  OUTPUT: boolean
  
  status := input.searchParams.get("status")
  
  RETURN (status == "all" OR status == null)
         AND queryIncludesSoftDeletedPatients(input)
         AND userExpectsOnlyActivePatients()
END FUNCTION
```

### Examples

- User deletes a patient → sees "Patient deleted successfully" toast → patient remains in list (status filter = 'all')
- User sets status filter to 'active' → deleted patients still appear in the list
- User sets status filter to 'inactive' → correctly shows only soft-deleted patients (this works as expected)
- User fetches patients without any status parameter → deleted patients appear in the list

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Fetching patients with status filter 'inactive' must continue to return only soft-deleted patients (`is_active = 0`)
- Fetching a single patient by ID must continue to return the patient regardless of `is_active` status
- Patient statistics calculation must continue to correctly count active and inactive patients separately
- Role-based filtering (carebuddy, sales) must continue to work correctly
- Search functionality across patient fields must continue to work correctly
- Gender and blood group filters must continue to work correctly

**Scope:**
All inputs that do NOT involve status filters 'all' or 'active' should be completely unaffected by this fix. This includes:
- Single patient lookups by ID
- Status filter 'inactive' queries
- Statistics queries
- Role-based data access patterns

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Missing Default Filter**: The code only applies `is_active` filtering when status is explicitly 'active' or 'inactive', but doesn't apply a default filter when status is 'all' or null
   - Lines 51-57 show the conditional logic that only handles 'active' and 'inactive' cases
   - When status is 'all', the condition `status !== "all"` evaluates to false, so no filter is applied

2. **Incorrect Conditional Logic**: The outer condition `if (status && status !== "all")` prevents any filtering when status is 'all'
   - This means 'all' is treated as "show everything including soft-deleted"
   - The intended behavior should be 'all' means "all active patients"

3. **Semantic Ambiguity**: The term 'all' is ambiguous - it could mean "all patients including deleted" or "all active patients"
   - The requirements clarify that 'all' should mean "all active patients"
   - The current implementation treats it as "all patients including deleted"

## Correctness Properties

Property 1: Fault Condition - Active Patients Filter

_For any_ GET request where the status parameter is 'all' or null (not provided), the fixed handleGet function SHALL return only patients with `is_active = 1`, excluding all soft-deleted patients from the response.

**Validates: Requirements 2.1, 2.3**

Property 2: Fault Condition - Explicit Active Filter

_For any_ GET request where the status parameter is explicitly 'active', the fixed handleGet function SHALL return only patients with `is_active = 1`, excluding all soft-deleted patients from the response.

**Validates: Requirements 2.2, 2.4**

Property 3: Preservation - Inactive Status Filter

_For any_ GET request where the status parameter is 'inactive', the fixed function SHALL produce exactly the same result as the original function, returning only patients with `is_active = 0`.

**Validates: Requirements 3.1**

Property 4: Preservation - Single Patient Lookup

_For any_ GET request that includes an 'id' parameter for single patient lookup, the fixed function SHALL produce exactly the same result as the original function, returning the patient regardless of their `is_active` status.

**Validates: Requirements 3.2**

Property 5: Preservation - Role-Based Filtering

_For any_ GET request from users with 'carebuddy' or 'sales' roles, the fixed function SHALL continue to apply role-based filtering correctly, returning only patients assigned to them or referred by them respectively.

**Validates: Requirements 3.4, 3.5**

Property 6: Preservation - Search and Filter Functionality

_For any_ GET request that includes search, gender, or blood_group parameters, the fixed function SHALL continue to apply these filters correctly in combination with the active status filter.

**Validates: Requirements 3.6, 3.7**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/app/api/v1/patients/route.js`

**Function**: `handleGet`

**Specific Changes**:

1. **Add Default Active Filter**: Add a filter to exclude soft-deleted patients by default
   - Apply `is_active = 1` filter when status is 'all' or null
   - This ensures deleted patients don't appear in the default list view

2. **Restructure Status Filter Logic**: Modify the conditional logic at lines 51-57
   - Change from: `if (status && status !== "all")` to handle 'all' explicitly
   - Add explicit handling for status === 'all' to apply `is_active = 1` filter
   - Keep existing logic for status === 'inactive' unchanged

3. **Preserve Single Patient Lookup**: Ensure the `is_active` filter is NOT applied when fetching by ID
   - The existing `if (id)` block should bypass status filtering
   - This preserves the ability to fetch deleted patients by direct ID lookup

4. **Update Statistics Query**: Verify that statistics calculation remains unchanged
   - The stats query already correctly counts active and inactive separately
   - No changes needed to the statistics logic

5. **Recommended Implementation Approach**:
   ```javascript
   // Apply status filter with default to active
   if (status === "inactive") {
       sql += " AND p.is_active = 0";
   } else if (status === "active" || status === "all" || !status) {
       sql += " AND p.is_active = 1";
   }
   // Note: When fetching by ID, this filter should not be applied
   // The ID check happens earlier, so we need to ensure this logic
   // only runs when NOT fetching by ID
   ```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that create a patient, soft-delete it, then fetch patients with different status filters. Run these tests on the UNFIXED code to observe that deleted patients incorrectly appear in the results.

**Test Cases**:
1. **Default Status Test**: Fetch patients without status parameter, verify deleted patient appears (will fail on unfixed code - bug demonstration)
2. **Status 'All' Test**: Fetch patients with status='all', verify deleted patient appears (will fail on unfixed code - bug demonstration)
3. **Status 'Active' Test**: Fetch patients with status='active', verify deleted patient appears (will fail on unfixed code - bug demonstration)
4. **Status 'Inactive' Test**: Fetch patients with status='inactive', verify only deleted patients appear (should pass on unfixed code - preservation check)

**Expected Counterexamples**:
- Deleted patients (is_active = 0) appear in results when status is 'all' or null
- Deleted patients appear in results when status is 'active'
- Possible causes: missing default filter, incorrect conditional logic, semantic ambiguity of 'all'

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL request WHERE isBugCondition(request) DO
  result := handleGet_fixed(request)
  ASSERT all patients in result have is_active = 1
  ASSERT no patients in result have is_active = 0
END FOR
```

**Test Cases**:
1. Create active patient → verify appears in list
2. Create patient → soft delete → fetch with status='all' → verify does NOT appear
3. Create patient → soft delete → fetch with status='active' → verify does NOT appear
4. Create patient → soft delete → fetch with no status → verify does NOT appear
5. Create multiple patients → delete some → verify only active ones appear with status='all'

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL request WHERE NOT isBugCondition(request) DO
  ASSERT handleGet_original(request) = handleGet_fixed(request)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for non-affected queries, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Inactive Status Preservation**: Fetch with status='inactive' on unfixed code → verify returns only deleted patients → verify same behavior after fix
2. **Single Patient Lookup Preservation**: Fetch deleted patient by ID on unfixed code → verify returns patient → verify same behavior after fix
3. **Role-Based Filtering Preservation**: Test carebuddy and sales role filtering on unfixed code → verify correct filtering → verify same behavior after fix
4. **Search Filter Preservation**: Test search across patient fields on unfixed code → verify correct results → verify same behavior after fix
5. **Statistics Preservation**: Fetch statistics on unfixed code → verify correct counts → verify same behavior after fix

### Unit Tests

- Test fetching patients with status='all' excludes soft-deleted patients
- Test fetching patients with status='active' excludes soft-deleted patients
- Test fetching patients with no status parameter excludes soft-deleted patients
- Test fetching patients with status='inactive' returns only soft-deleted patients
- Test fetching single patient by ID returns patient regardless of is_active status
- Test role-based filtering continues to work with active filter applied
- Test search functionality works correctly with active filter applied

### Property-Based Tests

- Generate random patient datasets with mixed active/inactive status and verify 'all' filter returns only active patients
- Generate random search queries and verify results only include active patients (unless status='inactive')
- Generate random role-based scenarios and verify filtering works correctly with active status filter
- Test that statistics calculation remains consistent across many random patient datasets

### Integration Tests

- Test full patient deletion flow: create → delete → verify removed from list with status='all'
- Test full patient deletion flow: create → delete → verify removed from list with status='active'
- Test that deleted patients can still be fetched by direct ID lookup
- Test that statistics correctly reflect active vs inactive counts after deletions
- Test that role-based users see correct patient lists after deletions
