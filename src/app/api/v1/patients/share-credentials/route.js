import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SESSION_SECRET = process.env.SESSION_SECRET || "complex_password_at_least_32_characters_long";

// POST - Generate Secure Link (Auto-register or Reset)
async function handlePost(request, context, user) {
    // Permission check: 'create' on 'patients' or 'users' is required ideally, 
    // but we reused PATIENTS module permissions for this specific action logic in middleware wrapper usually.
    // The wrapper ensures the user has access to the module.

    const body = await request.json();
    const { patientId } = body;

    if (!patientId) {
        return NextResponse.json({ message: "Patient ID required" }, { status: 400 });
    }

    try {
        // 1. Fetch Patient
        const patients = await query("SELECT * FROM patients WHERE id = ?", [patientId]);
        if (!patients.length) {
            return NextResponse.json({ message: "Patient not found" }, { status: 404 });
        }
        const patient = patients[0];

        // 2. Determine User ID (Create or Get)
        let userId = patient.user_id;
        let username = "";
        let email = "";

        // Generate a random 8-character password
        // Generate a secure password that meets validation requirements
        // Requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char (@$!%*?&)
        const length = 10;
        const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const lower = "abcdefghijklmnopqrstuvwxyz";
        const numbers = "0123456789";
        const special = "@$!%*?&";

        const allChars = upper + lower + numbers + special;
        let plainPassword = "";

        // Ensure one of each
        plainPassword += upper.charAt(Math.floor(Math.random() * upper.length));
        plainPassword += lower.charAt(Math.floor(Math.random() * lower.length));
        plainPassword += numbers.charAt(Math.floor(Math.random() * numbers.length));
        plainPassword += special.charAt(Math.floor(Math.random() * special.length));

        // Fill remaining
        for (let i = plainPassword.length; i < length; i++) {
            plainPassword += allChars.charAt(Math.floor(Math.random() * allChars.length));
        }

        // Shuffle password
        plainPassword = plainPassword.split('').sort(() => 0.5 - Math.random()).join('');
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        if (!userId) {
            // CREATE NEW USER
            username = `${patient.first_name}${patient.last_name || ''}`.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000);
            email = patient.email || `${username}@surgi.com`; // Fallback dummy email if none

            // Check if email taken
            const emailCheck = await query("SELECT id FROM users WHERE email = ?", [email]);
            if (emailCheck.length) {
                userId = emailCheck[0].id;
                await query("UPDATE users SET password_hash = ?, is_active = 1 WHERE id = ?", [hashedPassword, userId]);
            } else {
                const userRes = await query(
                    `INSERT INTO users (username, email, password_hash, role, mobile, is_active, created_at, updated_at)
                     VALUES (?, ?, ?, 'patient', ?, 1, NOW(), NOW())`,
                    [username, email, hashedPassword, patient.phone || null]
                );
                userId = userRes.insertId;
            }

            // Link to Patient
            await query("UPDATE patients SET user_id = ? WHERE id = ?", [userId, patientId]);

        } else {
            // EXISTING USER - RESET PASSWORD
            const existingUser = await query("SELECT username, email FROM users WHERE id = ?", [userId]);
            if (existingUser.length) {
                username = existingUser[0].username;
                email = existingUser[0].email;
                await query("UPDATE users SET password_hash = ?, is_active = 1 WHERE id = ?", [hashedPassword, userId]);
            } else {
                // Orphaned ID? Handle as create logic essentially or error.
                return NextResponse.json({ message: "Linked user not found" }, { status: 404 });
            }
        }
        const payload = {
            username,
            password: plainPassword,
            email,
            patientName: `${patient.first_name} ${patient.last_name}`,
            exp: Math.floor(Date.now() / 1000) + (2 * 60) // 2 minutes expiry
        };

        const token = jwt.sign(payload, SESSION_SECRET);

        // Get Base URL (from request headers or env)
        const host = request.headers.get("host"); // e.g. localhost:3000
        const protocol = host.includes("localhost") ? "http" : "https";
        const link = `${protocol}://${host}/secure-view?token=${token}`;

        return NextResponse.json({
            success: true,
            link,
            username,
            patientName: payload.patientName,
            mobile: patient.phone,
            email: patient.email
        });

    } catch (error) {
        console.error("Share Credentials Error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

const handler = withPermission(MODULES.PATIENTS, {
    POST: handlePost
});

export { handler as POST };
