import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission"; // Assuming middleware allows logged in users
import { MODULES } from "@/lib/permissions";

// GET - Patient Dashboard Data
async function handleGet(request, context, user) {
    // Determine the patient ID associated with the logged-in user
    // The user object comes from the token/session verification in withPermission/middleware

    if (user.role !== 'patient') {
        return NextResponse.json({ message: "Access denied: Not a patient" }, { status: 403 });
    }

    try {
        // Find patient record linked to this user
        const patients = await query("SELECT * FROM patients WHERE user_id = ?", [user.id]);

        if (!patients.length) {
            return NextResponse.json({ message: "Patient record not found for this user" }, { status: 404 });
        }

        const patient = patients[0];
        const patientId = patient.id;

        // Fetch Surgeries
        const surgeries = await query(`
            SELECT 
                ps.*, 
                h.name as hospital_name, 
                COALESCE(hs.name, u.username) as surgeon_name,
                d.specialization as surgeon_specialization
            FROM patient_surgeries ps
            LEFT JOIN hospitals h ON ps.hospital_id = h.id
            LEFT JOIN doctors d ON ps.surgeon_id = d.id
            LEFT JOIN users u ON d.user_id = u.id
            LEFT JOIN hospital_surgeons hs ON ps.hospital_surgeon_id = hs.id
            WHERE ps.patient_id = ?
            ORDER BY ps.surgery_date DESC
        `, [patientId]);

        // Fetch Carebuddy info (from latest surgery or assigned)
        // Assuming care_buddy_id is in patient_surgeries
        let carebuddy = null;
        if (surgeries.length > 0 && surgeries[0].care_buddy_id) {
            const cb = await query("SELECT username, email, mobile FROM users WHERE id = ?", [surgeries[0].care_buddy_id]);
            if (cb.length) carebuddy = cb[0];
        }

        // Check if patient has already submitted a review
        const reviewCheck = await query("SELECT id FROM reviews WHERE patient_id = ?", [patientId]);
        const has_reviewed = reviewCheck.length > 0;

        return NextResponse.json({
            patient,
            surgeries,
            carebuddy,
            has_reviewed
        });

    } catch (error) {
        console.error("Patient Dashboard Error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

// We can reuse PATIENTS module permission or just allow authenticated access
// Since 'patient' role has 'view' content on 'patients' module in our new permission config, this works.
const handler = withPermission(MODULES.PATIENTS, {
    GET: handleGet
});

export { handler as GET };
