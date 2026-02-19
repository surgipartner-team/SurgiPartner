import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";

// GET - Fetch activities for a patient
async function handleGet(request, context, user) {
    const { id: patientId } = await context.params;

    const activities = await query(
        `SELECT a.*, u.username as created_by_name 
         FROM patient_activities a
         LEFT JOIN users u ON a.created_by_user_id = u.id
         WHERE a.patient_id = ?
         ORDER BY a.created_at DESC`,
        [patientId]
    );

    return NextResponse.json({ activities });
}

// POST - Create activity
async function handlePost(request, context, user) {
    const { id: patientId } = await context.params;
    const body = await request.json();
    const { activity_type, description, duration_minutes, outcome, additional_notes } = body;

    if (!activity_type || !description) {
        return NextResponse.json(
            { message: "Activity type and description are required" },
            { status: 400 }
        );
    }

    const result = await query(
        `INSERT INTO patient_activities 
         (patient_id, activity_type, description, duration_minutes, outcome, additional_notes, created_by_user_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [patientId, activity_type, description, duration_minutes || null, outcome || null, additional_notes || null, user.id]
    );

    const newActivity = await query(
        `SELECT a.*, u.username as created_by_name 
         FROM patient_activities a
         LEFT JOIN users u ON a.created_by_user_id = u.id
         WHERE a.id = ?`,
        [result.insertId]
    );

    return NextResponse.json(
        { message: "Activity logged successfully", activity: newActivity[0] },
        { status: 201 }
    );
}

const handler = withPermission(MODULES.PATIENTS, {
    GET: handleGet,
    POST: handlePost
});

export { handler as GET, handler as POST };
