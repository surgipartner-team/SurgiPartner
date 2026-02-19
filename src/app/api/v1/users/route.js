import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";
import bcrypt from "bcryptjs";

// GET - Fetch users (mirrors /api/admin/users)
async function handleGet(request, context, user) {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let sql = `
        SELECT 
            u.id, u.username, u.email, u.mobile, u.role, u.profile_picture,
            u.created_at, u.last_login, u.is_active,
            COALESCE(u.status, CASE WHEN u.is_active = 1 THEN 'active' ELSE 'inactive' END) as status,
            (SELECT COUNT(*) FROM leads WHERE owner_id = u.id AND status NOT IN ('converted', 'not converted', 'not-converted', 'dummy')) as active_leads,
            (SELECT COUNT(*) FROM user_permissions WHERE user_id = u.id AND is_custom = 1) as custom_permissions_count,
            (SELECT COUNT(*) FROM user_permissions WHERE user_id = u.id AND is_enabled = 1) as permissions_count
        FROM users u
        WHERE 1=1
    `;
    const params = [];

    if (role && role !== 'all') {
        sql += " AND u.role = ?";
        params.push(role);
    }

    if (status && status !== 'all') {
        if (status === 'active') {
            sql += " AND u.is_active = 1";
        } else if (status === 'inactive') {
            sql += " AND u.is_active = 0";
        }
    }

    if (search) {
        sql += " AND (u.username LIKE ? OR u.email LIKE ? OR u.mobile LIKE ?)";
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += " ORDER BY u.created_at DESC";
    const users = await query(sql, params);

    // Calculate stats
    const allUsers = await query(`SELECT id, role, is_active FROM users`);
    const stats = {
        total: allUsers.length,
        active: allUsers.filter(u => u.is_active).length,
        inactive: allUsers.filter(u => !u.is_active).length,
        sales: allUsers.filter(u => u.role === 'sales').length,
        ops: allUsers.filter(u => u.role === 'ops').length,
        carebuddy: allUsers.filter(u => u.role === 'carebuddy').length,
        accountant: allUsers.filter(u => u.role === 'accountant').length,
        admin: allUsers.filter(u => u.role === 'admin').length,
        patient: allUsers.filter(u => u.role === 'patient').length
    };

    return NextResponse.json({ users, stats });
}

// POST - Create user
async function handlePost(request, context, user) {
    const body = await request.json();
    const { username, email, password, role, mobile } = body;

    if (!username || !email || !password || !role) {
        return NextResponse.json(
            { message: "Username, email, password, and role are required" },
            { status: 400 }
        );
    }

    // Check if email exists
    const existing = await query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length) {
        return NextResponse.json({ message: "Email already exists" }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
        `INSERT INTO users (username, email, password_hash, role, mobile, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [username, email, hashedPassword, role, mobile || null]
    );

    const userId = result.insertId;

    // If role is patient, sync with patients table
    if (role === 'patient') {
        // Check if patient exists with this email or mobile
        let patient = await query("SELECT id FROM patients WHERE email = ? OR phone = ?", [email, mobile]);

        if (patient.length > 0) {
            // Link existing patient
            await query("UPDATE patients SET user_id = ? WHERE id = ?", [userId, patient[0].id]);
        } else {
            // Create new patient record
            // Split username into first/last name approximately
            const nameParts = username.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Patient'; // Default last name

            // Generate basic patient ID
            const pid = 'P' + Date.now().toString().slice(-6);

            await query(`
                INSERT INTO patients (
                    patient_id, first_name, last_name, email, phone, 
                    date_of_birth, age, gender, user_id, 
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, CURDATE(), 0, 'Other', ?, NOW(), NOW())
            `, [pid, firstName, lastName, email, mobile || '', userId]);
        }
    }

    return NextResponse.json({
        message: "User created successfully",
        user: { id: userId, username, email, role }
    }, { status: 201 });
}

// PUT - Update user
async function handlePut(request, context, user) {
    const body = await request.json();
    const { id, action, password, ...updates } = body;

    if (!id) {
        return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Handle status toggle actions (matching legacy API)
    if (action === 'toggle_status') {
        const currentUser = await query("SELECT is_active FROM users WHERE id = ?", [id]);
        if (!currentUser.length) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        const newStatus = !currentUser[0].is_active;
        await query("UPDATE users SET is_active = ? WHERE id = ?", [newStatus ? 1 : 0, id]);
        return NextResponse.json({ message: `User ${newStatus ? 'activated' : 'deactivated'} successfully` });
    }

    if (action === 'deactivate') {
        await query("UPDATE users SET is_active = 0 WHERE id = ?", [id]);
        return NextResponse.json({ message: "User deactivated successfully" });
    }

    if (action === 'activate') {
        await query("UPDATE users SET is_active = 1 WHERE id = ?", [id]);
        return NextResponse.json({ message: "User activated successfully" });
    }

    if (action === 'suspend') {
        await query("UPDATE users SET is_active = 0, locked_until = DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE id = ?", [id]);
        return NextResponse.json({ message: "User suspended successfully" });
    }

    // If password is being updated, hash it
    if (password) {
        updates.password = await bcrypt.hash(password, 10);
    }

    // General update
    const allowedFields = ['username', 'email', 'mobile', 'role', 'password'];
    const updateFields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
            updateFields.push(`${key} = ?`);
            values.push(value);
        }
    }

    if (updateFields.length > 0) {
        values.push(id);
        await query(`UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`, values);

        // Sync with patients table if this is a patient user (or if role changed to patient)
        const userRole = updates.role || (await query("SELECT role FROM users WHERE id = ?", [id]))[0]?.role;

        if (userRole === 'patient') {
            // Update linked patient's contact info
            // Note: We don't update name because Users has 'username' (single field) and Patients has First/Last
            // But we can sync email and mobile
            const patientUpdates = [];
            const patientValues = [];

            if (updates.email) {
                patientUpdates.push("email = ?");
                patientValues.push(updates.email);
            }
            if (updates.mobile) {
                patientUpdates.push("phone = ?");
                patientValues.push(updates.mobile);
            }

            if (patientUpdates.length > 0) {
                patientValues.push(id); // for WHERE user_id = ?
                await query(
                    `UPDATE patients SET ${patientUpdates.join(", ")} WHERE user_id = ?`,
                    patientValues
                );
            }
        }
    }

    return NextResponse.json({ message: "User updated successfully" });
}

// DELETE - Delete/deactivate user
async function handleDelete(request, context, user) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Don't allow deleting self
    if (parseInt(id) === user.id) {
        return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }

    await query("UPDATE users SET is_active = 0, updated_at = NOW() WHERE id = ?", [id]);

    return NextResponse.json({ message: "User deactivated successfully" });
}

const handler = withPermission(MODULES.USERS, {
    GET: handleGet,
    POST: handlePost,
    PUT: handlePut,
    DELETE: handleDelete
});

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
