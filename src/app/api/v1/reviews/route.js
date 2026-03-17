import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";

// GET - Admin fetch reviews
async function handleGet(request, context, user) {
    try {
        const sql = `
            SELECT 
                r.*,
                p.first_name, p.last_name,
                h.name as hospital_name,
                COALESCE(u.username, hs.name) as surgeon_name,
                cb.username as carebuddy_name
            FROM reviews r
            JOIN patients p ON r.patient_id = p.id
            LEFT JOIN hospitals h ON r.hospital_id = h.id
            LEFT JOIN doctors d ON r.doctor_id = d.id
            LEFT JOIN users u ON d.user_id = u.id
            LEFT JOIN hospital_surgeons hs ON r.doctor_id = hs.id -- Note: doctor_id logic might need adjustment if it can be either
            LEFT JOIN users cb ON r.carebuddy_id = cb.id
            ORDER BY r.created_at DESC
        `;
        // Note: For doctor_id, we might have mixed IDs from doctors table or hospital_surgeons. 
        // For now assuming internal doctors linked via ID, typically reviews are post-surgery which has distinct IDs.
        // If we want to support both, we might need a type discriminator or try to join both.
        // Simpler for now: Match assumption used in surgery list.

        const reviews = await query(sql);
        return NextResponse.json({ reviews });
    } catch (error) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

// POST - Patient submit review
async function handlePost(request, context, user) {
    if (user.role !== 'patient') {
        return NextResponse.json({ message: "Only patients can submit reviews" }, { status: 403 });
    }

    const body = await request.json();
    const {
        carebuddy_rating, carebuddy_review,
        hospital_rating, hospital_review,
        doctor_rating, doctor_review,
        machine_rating, machine_review,
        company_rating, company_review,
        overall_rating, overall_review,
        hospital_id, doctor_id, carebuddy_id, machine_id
    } = body;

    try {
        // Get patient ID
        const pCheck = await query("SELECT id FROM patients WHERE user_id = ?", [user.id]);
        if (!pCheck.length) return NextResponse.json({ message: "Patient record not found" }, { status: 404 });
        const patient_id = pCheck[0].id;

        await query(`
            INSERT INTO reviews (
                patient_id, carebuddy_id, hospital_id, doctor_id, machine_id,
                carebuddy_rating, carebuddy_review,
                hospital_rating, hospital_review,
                doctor_rating, doctor_review,
                machine_rating, machine_review,
                company_rating, company_review,
                overall_rating, overall_review,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            patient_id, carebuddy_id || null, hospital_id || null, doctor_id || null, machine_id || null,
            carebuddy_rating || null, carebuddy_review || null,
            hospital_rating || null, hospital_review || null,
            doctor_rating || null, doctor_review || null,
            machine_rating || null, machine_review || null,
            company_rating || null, company_review || null,
            overall_rating || null, overall_review || null
        ]);

        return NextResponse.json({ message: "Review submitted successfully" }, { status: 201 });
    } catch (error) {
        console.error("Submit Review Error:", error);
        return NextResponse.json({ message: "Error submitting review" }, { status: 500 });
    }
}

const handler = withPermission(MODULES.REVIEWS, {
    GET: handleGet,
    POST: handlePost
});

export { handler as GET, handler as POST };
