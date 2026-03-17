import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";
import bcrypt from "bcryptjs";

// POST - Create login for a patient
async function handlePost(request, context, user) {
    const body = await request.json();
    const { patient_id, username, password } = body;

    if (!patient_id || !username || !password) {
        return NextResponse.json({ message: "Patient ID, username, and password are required" }, { status: 400 });
    }

    // Check if patient exists
    const patientCheck = await query("SELECT id, user_id, email, phone FROM patients WHERE id = ?", [patient_id]);
    if (!patientCheck.length) {
        return NextResponse.json({ message: "Patient not found" }, { status: 404 });
    }
    const patient = patientCheck[0];

    // Check if patient already has a login
    if (patient.user_id) {
        return NextResponse.json({ message: "This patient already has a login" }, { status: 400 });
    }

    // Check if username/email already exists in users table
    const userCheck = await query("SELECT id FROM users WHERE username = ?", [username]);
    if (userCheck.length) {
        return NextResponse.json({ message: "Username already exists" }, { status: 400 });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create User
        // Use patient email/phone if available, else null
        const result = await query(
            `INSERT INTO users (username, password_hash, email, mobile, role, is_active, created_at, updated_at) 
             VALUES (?, ?, ?, ?, 'patient', 1, NOW(), NOW())`,
            [username, hashedPassword, patient.email || null, patient.phone || null]
        );

        const newUserId = result.insertId;

        // Link User to Patient
        await query("UPDATE patients SET user_id = ? WHERE id = ?", [newUserId, patient_id]);

        return NextResponse.json({ message: "Patient login created successfully" });
    } catch (error) {
        console.error("Create Patient Login Error:", error);
        return NextResponse.json({ message: "Error creating login", error: error.message }, { status: 500 });
    }
}

// Protected by USERS module permission (Admin usually)
const handler = withPermission(MODULES.USERS, {
    POST: handlePost
});

export { handler as POST };
