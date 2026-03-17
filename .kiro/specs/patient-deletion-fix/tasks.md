  # Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Active Patients Filter for 'all' and 'active' Status
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases: status='all', status='active', and status=null (not provided)
  - Test that GET /api/v1/patients with status='all' returns only patients with is_active=1
  - Test that GET /api/v1/patients with status='active' returns only patients with is_active=1
  - Test that GET /api/v1/patients with no status parameter returns only patients with is_active=1
  - Create test patients with is_active=0 (soft-deleted) and verify they do NOT appear in results
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "soft-deleted patients appear in results when status='all'")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [-] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Buggy Behavior Preservation
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Test that status='inactive' returns only patients with is_active=0 (should pass on unfixed code)
  - Test that fetching patient by ID returns patient regardless of is_active status (should pass on unfixed code)
  - Test that role-based filtering (carebuddy, sales) works correctly (should pass on unfixed code)
  - Test that search, gender, and blood_group filters work correctly (should pass on unfixed code)
  - Test that statistics calculation correctly counts active and inactive patients separately (should pass on unfixed code)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6, 3.7_

- [ ] 3. Fix for soft-deleted patients appearing in 'all' and 'active' status filters

  - [ ] 3.1 Implement the fix in src/app/api/v1/patients/route.js
    - Modify the handleGet function to apply is_active=1 filter by default
    - Restructure status filter logic (lines 51-57) to handle 'all' explicitly
    - Apply is_active=1 filter when status is 'all', 'active', or null (not provided)
    - Keep existing logic for status='inactive' unchanged (is_active=0)
    - Ensure is_active filter is NOT applied when fetching by ID (preserve single patient lookup)
    - _Bug_Condition: isBugCondition(input) where (status == "all" OR status == null) AND queryIncludesSoftDeletedPatients(input)_
    - _Expected_Behavior: For status='all' or 'active', return only patients with is_active=1_
    - _Preservation: Status='inactive' returns is_active=0, ID lookup ignores is_active, role-based filtering works, search/filters work, statistics calculation unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.4, 3.5, 3.6, 3.7_

  - [ ] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Active Patients Filter for 'all' and 'active' Status
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Buggy Behavior Preservation
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6, 3.7_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
