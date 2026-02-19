import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";

// GET - Fetch notes for a patient
async function handleGet(request, context, user) {
    const { id: patientId } = await context.params;

    const notes = await query(
        `SELECT n.*, u.username as created_by_name 
         FROM patient_notes n
         LEFT JOIN users u ON n.created_by_user_id = u.id
         WHERE n.patient_id = ?
         ORDER BY n.created_at DESC`,
        [patientId]
    );

    return NextResponse.json({ notes });
}

// POST - Create note
async function handlePost(request, context, user) {
    const { id: patientId } = await context.params;
    const body = await request.json();
    const { note_text } = body;

    if (!note_text || note_text.trim() === '') {
        return NextResponse.json({ message: "Note text is required" }, { status: 400 });
    }

    const result = await query(
        `INSERT INTO patient_notes (patient_id, note_text, created_by_user_id) VALUES (?, ?, ?)`,
        [patientId, note_text, user.id]
    );

    const newNote = await query(
        `SELECT n.*, u.username as created_by_name 
         FROM patient_notes n
         LEFT JOIN users u ON n.created_by_user_id = u.id
         WHERE n.id = ?`,
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

const handler = withPermission(MODULES.PATIENTS, {
    GET: handleGet,
    POST: handlePost,
    DELETE: handleDelete
});

export { handler as GET, handler as POST, handler as DELETE };
