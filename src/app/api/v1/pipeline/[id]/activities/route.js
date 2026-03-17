import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";

// GET - Fetch activities for a pipeline case
async function handleGet(request, context, user) {
    const { id } = await context.params;

    const activities = await query(
        `SELECT pa.*, u.username as created_by_name
         FROM patient_activities pa
         LEFT JOIN users u ON pa.created_by_user_id = u.id
         WHERE pa.patient_id = (SELECT patient_id FROM patient_surgeries WHERE id = ?)
         ORDER BY pa.created_at DESC`,
        [id]
    );

    return NextResponse.json({ activities });
}

// POST - Create activity for a pipeline case
async function handlePost(request, context, user) {
    const { id } = await context.params;
    const body = await request.json();
    const { activity_type, description, duration_minutes, outcome, additional_notes } = body;

    if (!activity_type || !description) {
        return NextResponse.json({ message: "Missing required fields: activity_type, description" }, { status: 400 });
    }

    // Get patient_id from surgery case
    const caseData = await query("SELECT patient_id FROM patient_surgeries WHERE id = ?", [id]);
    if (caseData.length === 0) {
        return NextResponse.json({ message: "Case not found" }, { status: 404 });
    }

    const patient_id = caseData[0].patient_id;

    const result = await query(
        `INSERT INTO patient_activities 
         (patient_id, activity_type, description, duration_minutes, outcome, additional_notes, created_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [patient_id, activity_type, description, duration_minutes || null, outcome || null, additional_notes || null, user.id]
    );

    const newActivity = await query(
        `SELECT pa.*, u.username as created_by_name
         FROM patient_activities pa
         LEFT JOIN users u ON pa.created_by_user_id = u.id
         WHERE pa.id = ?`,
        [result.insertId]
    );

    return NextResponse.json({ message: "Activity logged successfully", activity: newActivity[0] }, { status: 201 });
}

// DELETE - Delete activity
async function handleDelete(request, context, user) {
    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get("activityId");

    if (!activityId) {
        return NextResponse.json({ message: "Activity ID is required" }, { status: 400 });
    }

    await query("DELETE FROM patient_activities WHERE id = ?", [activityId]);

    return NextResponse.json({ message: "Activity deleted successfully" });
}

const handler = withPermission(MODULES.PIPELINE, {
    GET: handleGet,
    POST: handlePost,
    DELETE: handleDelete
});

export { handler as GET, handler as POST, handler as DELETE };
