import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";

// GET - Fetch notes for a pipeline case
async function handleGet(request, context, user) {
    const { id } = await context.params;

    const notes = await query(
        `SELECT pn.*, u.username as created_by_name
         FROM patient_notes pn
         LEFT JOIN users u ON pn.created_by_user_id = u.id
         WHERE pn.patient_id = (SELECT patient_id FROM patient_surgeries WHERE id = ?)
         ORDER BY pn.created_at DESC`,
        [id]
    );

    return NextResponse.json({ notes });
}

// POST - Create note for a pipeline case
async function handlePost(request, context, user) {
    const { id } = await context.params;
    const body = await request.json();
    const { note_text } = body;

    if (!note_text) {
        return NextResponse.json({ message: "Note text is required" }, { status: 400 });
    }

    // Get patient_id from surgery case
    const caseData = await query("SELECT patient_id FROM patient_surgeries WHERE id = ?", [id]);
    if (caseData.length === 0) {
        return NextResponse.json({ message: "Case not found" }, { status: 404 });
    }

    const patient_id = caseData[0].patient_id;

    const result = await query(
        `INSERT INTO patient_notes (patient_id, note_text, created_by_user_id) VALUES (?, ?, ?)`,
        [patient_id, note_text, user.id]
    );

    const newNote = await query(
        `SELECT pn.*, u.username as created_by_name
         FROM patient_notes pn
         LEFT JOIN users u ON pn.created_by_user_id = u.id
         WHERE pn.id = ?`,
        [result.insertId]
    );

    return NextResponse.json({ message: "Note added successfully", note: newNote[0] }, { status: 201 });
}

// DELETE - Delete note
async function handleDelete(request, context, user) {
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get("noteId");

    if (!noteId) {
        return NextResponse.json({ message: "Note ID is required" }, { status: 400 });
    }

    await query("DELETE FROM patient_notes WHERE id = ?", [noteId]);

    return NextResponse.json({ message: "Note deleted successfully" });
}

const handler = withPermission(MODULES.PIPELINE, {
    GET: handleGet,
    POST: handlePost,
    DELETE: handleDelete
});

export { handler as GET, handler as POST, handler as DELETE };
