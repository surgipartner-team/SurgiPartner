import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary";

// GET - Fetch documents for a lead
async function handleGet(request, context, user) {
    const { id: leadId } = await context.params;

    const documents = await query(
        `SELECT d.*, u.username as uploaded_by_name 
         FROM lead_documents d
         LEFT JOIN users u ON d.uploaded_by_user_id = u.id
         WHERE d.lead_id = ?
         ORDER BY d.uploaded_at DESC`,
        [leadId]
    );

    return NextResponse.json({ documents });
}

// POST - Upload document (actual file)
async function handlePost(request, context, user) {
    const { id: leadId } = await context.params;

    try {
        const formData = await request.formData();
        const file = formData.get("file");
        const documentName = formData.get("document_name");
        const documentType = formData.get("document_type");
        const fileSize = formData.get("file_size");

        if (!file || !documentName) {
            return NextResponse.json({ message: "File and document name are required" }, { status: 400 });
        }

        // Upload to Cloudinary (leads/docs folder)
        const result = await uploadToCloudinary(file, 'leads/docs');

        // Save to DB
        const resultParams = [
            leadId,
            documentName,
            documentType,
            result.url, // Cloudinary URL
            fileSize,
            user.id
        ];

        const dbResult = await query(
            `INSERT INTO lead_documents 
             (lead_id, document_name, document_type, file_path, file_size, uploaded_by_user_id) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            resultParams
        );

        const newDocument = await query(
            `SELECT d.*, u.username as uploaded_by_name 
             FROM lead_documents d
             LEFT JOIN users u ON d.uploaded_by_user_id = u.id
             WHERE d.id = ?`,
            [dbResult.insertId]
        );

        return NextResponse.json({ message: "Document uploaded successfully", document: newDocument[0] }, { status: 201 });

    } catch (error) {
        console.error("Error uploading file:", error);
        return NextResponse.json({ message: "Error uploading file: " + error.message }, { status: 500 });
    }
}

// DELETE - Delete document
async function handleDelete(request, context, user) {
    const { searchParams } = new URL(request.url);
    const docId = searchParams.get("docId");

    if (!docId) {
        return NextResponse.json({ message: "Document ID is required" }, { status: 400 });
    }

    try {
        // Fetch file path to delete from Cloudinary
        const doc = await query("SELECT file_path, document_type FROM lead_documents WHERE id = ?", [docId]);

        if (doc.length > 0 && doc[0].file_path && doc[0].file_path.includes('cloudinary')) {
            const url = doc[0].file_path;
            const parts = url.split('/upload/');
            if (parts.length === 2) {
                let publicIdWithExt = parts[1];
                if (publicIdWithExt.startsWith('v')) {
                    publicIdWithExt = publicIdWithExt.split('/').slice(1).join('/');
                }
                const publicId = publicIdWithExt.split('.')[0];

                const isImage = doc[0].document_type?.startsWith('image/');
                const resourceType = isImage ? 'image' : 'raw';

                await deleteFromCloudinary(publicId, resourceType);
            }
        }

        await query("DELETE FROM lead_documents WHERE id = ?", [docId]);

        return NextResponse.json({ message: "Document deleted successfully" });
    } catch (error) {
        console.error("Error deleting document:", error);
        return NextResponse.json({ message: "Error deleting document: " + error.message }, { status: 500 });
    }
}

const handler = withPermission(MODULES.LEADS, {
    GET: handleGet,
    POST: handlePost,
    DELETE: handleDelete
});

export { handler as GET, handler as POST, handler as DELETE };
