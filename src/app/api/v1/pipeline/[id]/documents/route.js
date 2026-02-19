import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary";

// GET - Fetch documents for a pipeline case
async function handleGet(request, context, user) {
    const { id } = await context.params;

    const documents = await query(
        `SELECT pd.*, u.username as uploaded_by_name
         FROM patient_documents pd
         LEFT JOIN users u ON pd.uploaded_by_user_id = u.id
         WHERE pd.patient_id = (SELECT patient_id FROM patient_surgeries WHERE id = ?)
         ORDER BY pd.uploaded_at DESC`,
        [id]
    );

    return NextResponse.json({ documents });
}

// POST - Upload document for a pipeline case (actual file)
async function handlePost(request, context, user) {
    const { id } = await context.params;

    try {
        const formData = await request.formData();
        const file = formData.get("file");
        const documentName = formData.get("document_name");
        const documentType = formData.get("document_type");
        const fileSize = formData.get("file_size");

        if (!file || !documentName) {
            return NextResponse.json({ message: "File and document name are required" }, { status: 400 });
        }

        // Get patient_id from surgery case
        const caseData = await query("SELECT patient_id FROM patient_surgeries WHERE id = ?", [id]);
        if (caseData.length === 0) {
            return NextResponse.json({ message: "Case not found" }, { status: 404 });
        }
        const patientId = caseData[0].patient_id;

        // Upload to Cloudinary (patients/docs folder)
        const result = await uploadToCloudinary(file, 'patients/docs');

        const resultParams = [
            patientId,
            documentName,
            documentType || 'application/octet-stream',
            fileSize || null,
            result.url, // Store the secure Cloudinary URL
            user.id
        ];

        const dbResult = await query(
            `INSERT INTO patient_documents 
             (patient_id, document_name, document_type, file_size, file_path, uploaded_by_user_id) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            resultParams
        );

        const newDocument = await query(
            `SELECT pd.*, u.username as uploaded_by_name
             FROM patient_documents pd
             LEFT JOIN users u ON pd.uploaded_by_user_id = u.id
             WHERE pd.id = ?`,
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
        const doc = await query("SELECT file_path, document_type FROM patient_documents WHERE id = ?", [docId]);

        if (doc.length > 0 && doc[0].file_path && doc[0].file_path.includes('cloudinary')) {
            // Extract Public ID from URL
            // Pattern: .../upload/v1234/surgipartner/folder/filename.ext
            // We want: surgipartner/folder/filename
            const url = doc[0].file_path;
            const parts = url.split('/upload/');
            if (parts.length === 2) {
                let publicIdWithExt = parts[1];
                // Remove version if present (v1234/)
                if (publicIdWithExt.startsWith('v')) {
                    publicIdWithExt = publicIdWithExt.split('/').slice(1).join('/');
                }
                const publicId = publicIdWithExt.split('.')[0]; // Remove extension

                // Determine resource type based on mime type or just try 'raw' then 'image'
                // Or simplified: generally docs are 'raw' in our helper logic unless image mime
                const isImage = doc[0].document_type?.startsWith('image/');
                const resourceType = isImage ? 'image' : 'raw';

                await deleteFromCloudinary(publicId, resourceType);
            }
        }

        await query("DELETE FROM patient_documents WHERE id = ?", [docId]);

        return NextResponse.json({ message: "Document deleted successfully" });
    } catch (error) {
        console.error("Error deleting document:", error);
        return NextResponse.json({ message: "Error deleting document: " + error.message }, { status: 500 });
    }
}

const handler = withPermission(MODULES.PIPELINE, {
    GET: handleGet,
    POST: handlePost,
    DELETE: handleDelete
});

export { handler as GET, handler as POST, handler as DELETE };
