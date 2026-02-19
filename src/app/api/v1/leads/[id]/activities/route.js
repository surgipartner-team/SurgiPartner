import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";

// GET - Fetch activities for a lead
async function handleGet(request, context, user) {
    const { id: leadId } = await context.params;

    // Check if lead exists and user has permission
    let leadCheck;
    if (user.role === "sales") {
        leadCheck = await query("SELECT id FROM leads WHERE id = ? AND owner_id = ?", [leadId, user.id]);
    } else {
        leadCheck = await query("SELECT id FROM leads WHERE id = ?", [leadId]);
    }

    if (leadCheck.length === 0) {
        return NextResponse.json({ message: "Lead not found or access denied" }, { status: 404 });
    }

    const activities = await query(
        `SELECT la.*, u.username as user_name, u.email as user_email
         FROM lead_activities la
         LEFT JOIN users u ON la.user_id = u.id
         WHERE la.lead_id = ?
         ORDER BY la.created_at DESC`,
        [leadId]
    );

    return NextResponse.json({ activities });
}

// POST - Create activity for a lead
async function handlePost(request, context, user) {
    const { id: leadId } = await context.params;
    const body = await request.json();
    const { activity_type, description, old_status, new_status } = body;

    // Validate activity_type
    const validTypes = ["call", "email", "meeting", "note", "status_change"];
    if (!activity_type || !validTypes.includes(activity_type)) {
        return NextResponse.json(
            { message: `Invalid activity_type. Must be one of: ${validTypes.join(", ")}` },
            { status: 400 }
        );
    }

    // Check if lead exists and user has permission
    let leadCheck;
    if (user.role === "sales") {
        leadCheck = await query("SELECT id FROM leads WHERE id = ? AND owner_id = ?", [leadId, user.id]);
    } else {
        leadCheck = await query("SELECT id FROM leads WHERE id = ?", [leadId]);
    }

    if (leadCheck.length === 0) {
        return NextResponse.json({ message: "Lead not found or access denied" }, { status: 404 });
    }

    const result = await query(
        `INSERT INTO lead_activities (lead_id, user_id, activity_type, description, old_status, new_status, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [leadId, user.id, activity_type, description || null, old_status || null, new_status || null]
    );

    const createdActivity = await query(
        `SELECT la.*, u.username as user_name, u.email as user_email
         FROM lead_activities la
         LEFT JOIN users u ON la.user_id = u.id
         WHERE la.id = ?`,
        [result.insertId]
    );

    return NextResponse.json(
        { message: "Activity logged successfully", activity: createdActivity[0] },
        { status: 201 }
    );
}

const handler = withPermission(MODULES.LEADS, {
    GET: handleGet,
    POST: handlePost
});

export { handler as GET, handler as POST };
