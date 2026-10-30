# Firestore Security Specification for MyFit Journey

## 1. Data Invariants
1. **User Data Isolation**: Only the authenticated user matching `{userId}` where `request.auth.uid == userId` may read, list, create, update, or delete documents within `/users/{userId}` or any subcollection.
2. **Subcollection Foreign-Key Invariant**: Every record in subcollections (e.g. `nutrition_logs`, `exercise_logs`, `activity_logs`, `body_measurements`, `habit_logs`, `sleep_logs`, `health_records`, `ai_coach_notes`) must have `userId == request.auth.uid`.
3. **No Cross-User Access**: Unauthenticated users or authenticated users cannot access another user's profile, health records, habits, or exercise data.
4. **ID Sanitization**: All document IDs must be valid alphanumeric strings (`^[a-zA-Z0-9_\-]+$`) up to 128 characters.
5. **No Blanket Reads**: No global query scraping. All list/read permissions strictly evaluate document ownership.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Payload 1 (Identity Spoofing - Profile Write for Other User)**: User A writes directly to `/users/userB` -> Rejected (UID mismatch).
2. **Payload 2 (Ghost Field Attack - Inject Privilege)**: User creates profile with `role: "admin"` -> Rejected (field not allowed).
3. **Payload 3 (Unauthenticated Read)**: Guest queries `/users/userA/health_records` -> Rejected (`request.auth == null`).
4. **Payload 4 (Cross-User Subcollection Read)**: User B attempts `getDoc(/users/userA/body_measurements/meas_1)` -> Rejected.
5. **Payload 5 (Cross-User Subcollection Write)**: User B attempts to write a meal log into `/users/userA/nutrition_logs/meal_1` -> Rejected.
6. **Payload 6 (Mismatched Foreign Key)**: User A writes to `/users/userA/nutrition_logs/meal_1` with payload `{ userId: 'userB' }` -> Rejected.
7. **Payload 7 (Denial of Wallet Huge String Attack)**: User attempts to write 2MB string in notes -> Rejected by length constraints (`notes.size() <= 500`).
8. **Payload 8 (Negative or Out-of-Bounds Numbers)**: Waist circumference set to -50 or 9999 -> Rejected by bounds validation (`waistCm > 30 && waistCm < 300`).
9. **Payload 9 (ID Poisoning Attack)**: Attacker passes path `../..` or junk 2KB path -> Rejected by `isValidId`.
10. **Payload 10 (Direct Update to Immutable Field)**: Attempting to modify `userId` or `createdAt` on an existing document -> Rejected.
11. **Payload 11 (Unverified Email Write)**: Attacker with unverified email tries to create clinical health record if unverified -> Rejected.
12. **Payload 12 (Blanket Collection Scraping)**: Malicious client attempts collectionGroup query across all users -> Rejected by root deny.

## 3. Test Runner Concept
The tests ensure all 12 payloads trigger `PERMISSION_DENIED` and valid authenticated operations succeed.
