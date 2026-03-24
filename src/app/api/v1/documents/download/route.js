import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { readFile } from "fs/promises";
import path from "path";
import fs from "fs";

export async function GET(request) {
    // 1. Validate Session using custom helper
    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const docId = searchParams.get("docId");
    const type = searchParams.get("type");
    const preview = searchParams.get("preview"); // Check for preview param

    if (!docId || !type) {
        return NextResponse.json({ message: "Missing document ID or type" }, { status: 400 });
    }

    let tableName = "";
    if (type === "lead") tableName = "lead_documents";
    else if (type === "patient") tableName = "patient_documents";
    else return NextResponse.json({ message: "Invalid document type" }, { status: 400 });

    try {
        const docs = await query(`SELECT * FROM ${tableName} WHERE id = ?`, [docId]);
        if (docs.length === 0) {
            return NextResponse.json({ message: "Document not found" }, { status: 404 });
        }

        const doc = docs[0];

        // Check if the file path is a cloud URL (like Cloudinary)
        let filePath = doc.file_path;
        
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
            try {
                const response = await fetch(filePath);
                if (!response.ok) {
                    return NextResponse.json({ message: "File not found in cloud storage" }, { status: 404 });
                }
                const fileBuffer = await response.arrayBuffer();
                const disposition = preview === 'true' ? 'inline' : `attachment; filename="${doc.document_name.replace(/"/g, '')}"`;
                
                return new NextResponse(fileBuffer, {
                    headers: {
                        "Content-Type": doc.document_type || "application/octet-stream",
                        "Content-Disposition": disposition,
                    },
                });
            } catch (fetchError) {
                console.error("Error fetching cloud file:", fetchError);
                return NextResponse.json({ message: "Error fetching loud file", error: fetchError.message }, { status: 500 });
            }
        }

        // Construct absolute path for local files
        let absolutePath = path.join(process.cwd(), filePath);

        // Security Check: prevent directory traversal
        const relative = path.relative(process.cwd(), absolutePath);
        if (relative.startsWith('..') && !relative.startsWith('..\\')) {
            return NextResponse.json({ message: "Invalid file path" }, { status: 403 });
        }

        if (!fs.existsSync(absolutePath)) {
            // Fallback: Check public if not found in storage
            const publicPath = path.join(process.cwd(), 'public', filePath);
            if (fs.existsSync(publicPath)) {
                absolutePath = publicPath;
            } else {
                return NextResponse.json({ message: "File not found on server" }, { status: 404 });
            }
        }

        // Check if it is a directory
        const stats = await fs.promises.stat(absolutePath);
        if (!stats.isFile()) {
            console.error("Path is not a file:", absolutePath);
            return NextResponse.json({ message: "Invalid file type (directory)" }, { status: 400 });
        }

        // Read file
        const fileBuffer = await readFile(absolutePath);

        // Determine disposition
        // For inline preview, we just need 'inline'. Browsers will handle the type.
        // We do NOT add filename parameter for inline to avoid any character encoding issues.
        const disposition = preview === 'true' ? 'inline' : `attachment; filename="${doc.document_name.replace(/"/g, '')}"`;

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": doc.document_type || "application/octet-stream",
                "Content-Disposition": disposition,
            },
        });

    } catch (error) {
        console.error("Download fatal error:", error);
        // Log detailed stack trace
        console.error(error.stack);
        return NextResponse.json({ message: "Internal Server Error", error: error.message }, { status: 500 });
    }
}
