import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";

// GET - Fetch patients (mirrors /api/sales/patients)
async function handleGet(request, context, user) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const gender = searchParams.get("gender");
    const bloodGroup = searchParams.get("blood_group");

    let sql = `
        SELECT 
            p.*,
            u.username as doctor_name,
            h.name as hospital_name,
            referrer.username as referred_by_name
        FROM patients p
        LEFT JOIN doctors d ON p.primary_doctor_id = d.id
        LEFT JOIN users u ON d.user_id = u.id
        LEFT JOIN hospitals h ON p.primary_hospital_id = h.id
        LEFT JOIN users referrer ON p.referred_by_id = referrer.id
        WHERE 1=1
    `;
    // Note: SELECT * (line 17) will automatically pick up uhid and ip_number if they exist in the DB.
    // However, to be explicit or if we were selecting specific columns, we would add them.
    // For now, trusting 'p.*' is sufficient for retrieval, assuming columns exist.
    // If not, we might need to alter table, but here we assume DB schema is/will be updated.

    const params = [];

    // Single patient by ID
    if (id) {
        sql += " AND p.id = ?";
        params.push(id);
    }

    // Role-based data filtering
    if (user.role === "carebuddy") {
        // CareBuddy only sees assigned patients
        sql += ` AND p.id IN (SELECT patient_id FROM patient_surgeries WHERE care_buddy_id = ?)`;
        params.push(user.id);
    } else if (user.role === "sales") {
        // Sales only sees patients referred by them
        sql += ` AND p.referred_by_id = ?`;
        params.push(user.id);
    }

    // Apply filters
    if (status && status !== "all") {
        if (status === "active") {
            sql += " AND p.is_active = 1";
        } else if (status === "inactive") {
            sql += " AND p.is_active = 0";
        }
    }

    if (gender && gender !== "all") {
        sql += " AND p.gender = ?";
        params.push(gender);
    }

    if (bloodGroup && bloodGroup !== "all") {
        sql += " AND p.blood_group = ?";
        params.push(bloodGroup);
    }

    if (search) {
        sql += ` AND (
            p.first_name LIKE ? OR 
            p.last_name LIKE ? OR 
            p.patient_id LIKE ? OR 
            p.medical_record_number LIKE ? OR
            p.phone LIKE ? OR
            p.email LIKE ? OR
            p.uhid LIKE ? OR
            p.ip_number LIKE ?
        )`;
        const pattern = `%${search}%`;
        params.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern);
    }

    sql += " ORDER BY p.created_at DESC";
    const patients = await query(sql, params);

    // Get statistics (also role-filtered for carebuddy)
    let statsQuery = `
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count,
            SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_count,
            SUM(CASE WHEN MONTH(created_at) = MONTH(CURRENT_DATE()) 
                AND YEAR(created_at) = YEAR(CURRENT_DATE()) THEN 1 ELSE 0 END) as new_this_month
        FROM patients
    `;
    const statsParams = [];

    if (user.role === "carebuddy") {
        statsQuery += ` WHERE id IN (SELECT patient_id FROM patient_surgeries WHERE care_buddy_id = ?)`;
        statsParams.push(user.id);
    } else if (user.role === "sales") {
        statsQuery += ` WHERE referred_by_id = ?`;
        statsParams.push(user.id);
    }

    const stats = await query(statsQuery, statsParams);

    // Helper to format date safely
    const formatDate = (dateInput) => {
        if (!dateInput) return null;
        const d = new Date(dateInput);
        const z = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
        return z.toISOString().split('T')[0];
    };

    // For each patient, fetch related data
    const patientsWithDetails = await Promise.all(
        patients.map(async (patient) => {
            const [allergies, medicalHistory, medications, insurance, surgeries] = await Promise.all([
                query("SELECT * FROM patient_allergies WHERE patient_id = ? ORDER BY created_at DESC", [patient.id]),
                query("SELECT * FROM patient_medical_history WHERE patient_id = ? ORDER BY created_at DESC", [patient.id]),
                query("SELECT * FROM patient_medications WHERE patient_id = ? ORDER BY created_at DESC", [patient.id]),
                query("SELECT * FROM patient_insurance WHERE patient_id = ? AND is_active = 1 ORDER BY created_at DESC", [patient.id]),
                query(`SELECT s.*, 
                              COALESCE(hs.name, u.username) as surgeon_name, 
                              h.name as surgery_hospital_name, 
                              cb.username as care_buddy_name 
                       FROM patient_surgeries s
                       LEFT JOIN doctors d ON s.surgeon_id = d.id
                       LEFT JOIN users u ON d.user_id = u.id
                       LEFT JOIN hospital_surgeons hs ON s.hospital_surgeon_id = hs.id
                       LEFT JOIN hospitals h ON s.hospital_id = h.id
                       LEFT JOIN users cb ON s.care_buddy_id = cb.id
                       WHERE s.patient_id = ? 
                       ORDER BY s.surgery_date DESC`, [patient.id])
            ]);

            const formattedSurgeries = surgeries.map(s => ({
                ...s,
                surgery_date: formatDate(s.surgery_date),
                ot_scheduled_date: formatDate(s.ot_scheduled_date), // Assuming exists or is valid
                consultation_date: formatDate(s.consultation_date) // As seen in calendar logic
            }));

            return {
                ...patient,
                date_of_birth: formatDate(patient.date_of_birth),
                allergies,
                medical_history: medicalHistory,
                medications,
                insurance,
                surgeries: formattedSurgeries
            };
        })
    );

    return NextResponse.json({
        patients: patientsWithDetails,
        stats: stats[0],
        userRole: user.role
    });
}

// POST - Create patient
async function handlePost(request, context, user) {
    const body = await request.json();
    const {
        first_name, last_name, date_of_birth, age, gender, blood_group,
        email, phone, alternate_phone, address, city, state, postal_code, country,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
        primary_doctor_id, primary_hospital_id, medical_record_number, notes,
        payment_type, surgeon_name_text, referred_by_role, referred_by_id,
        uhid, ip_number
    } = body;

    if (!first_name || !last_name || !phone) {
        return NextResponse.json(
            { message: "Missing required fields: first_name, last_name, phone" },
            { status: 400 }
        );
    }

    // Generate patient ID
    const patientIdResult = await query("SELECT MAX(id) as max_id FROM patients");
    const nextId = (patientIdResult[0]?.max_id || 0) + 1;
    const patientId = `SP-${String(nextId).padStart(6, '0')}`;

    const sql = `
        INSERT INTO patients (
            patient_id, first_name, last_name, date_of_birth, age, gender, blood_group,
            email, phone, alternate_phone, address, city, state, postal_code, country,
            emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
            primary_doctor_id, primary_hospital_id, medical_record_number,
            referred_by_role, referred_by_id, uhid, ip_number,
            is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
    `;

    // Append payment preference and non-system surgeon to notes
    let finalNotes = notes || '';
    if (payment_type) finalNotes += `\nPreferred Payment: ${payment_type}`;
    if (surgeon_name_text) finalNotes += `\nHospital Surgeon: ${surgeon_name_text}`;

    const result = await query(sql, [
        patientId, first_name, last_name, date_of_birth || null, age || null, gender || 'Male', blood_group || null,
        email || null, phone, alternate_phone || null, address || null, city || null, state || null, postal_code || null, country || 'India',
        emergency_contact_name || null, emergency_contact_phone || null, emergency_contact_relation || null,
        primary_doctor_id || null, primary_hospital_id || null, medical_record_number || null,
        referred_by_role || null, referred_by_id || null, uhid || null, ip_number || null
    ]);

    const patientIdInt = result.insertId;

    // Handle surgery details if provided
    const {
        surgery_type, surgery_date, surgeon_id, hospital_surgeon_id, surgery_hospital_id,
        surgery_status, surgery_notes, estimated_cost, payment_method, care_buddy_id
    } = body;

    if (surgery_type) {
        // Ensure IDs are parsed as integers to prevent storage issues
        const safeSurgeonId = surgeon_id ? parseInt(surgeon_id) : null;
        const safeHospitalSurgeonId = hospital_surgeon_id ? parseInt(hospital_surgeon_id) : null;

        console.log("Creating Surgery Details:", {
            surgeon_id: safeSurgeonId,
            hospital_surgeon_id: safeHospitalSurgeonId
        });

        await query(
            `INSERT INTO patient_surgeries (
                patient_id, surgery_type, surgery_date, surgeon_id, hospital_id, hospital_surgeon_id,
                status, estimated_cost, care_buddy_id, payment_method, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                patientIdInt,
                surgery_type,
                surgery_date || null,
                safeSurgeonId,
                surgery_hospital_id || null,
                safeHospitalSurgeonId,
                surgery_status || 'consultation_scheduled',
                estimated_cost || null,
                care_buddy_id || null,
                payment_method || null,
                surgery_notes || null
            ]
        );
    }

    const created = await query("SELECT * FROM patients WHERE id = ?", [patientIdInt]);

    return NextResponse.json({
        message: "Patient created successfully",
        patient: created[0]
    }, { status: 201 });
}

// PUT - Update patient
async function handlePut(request, context, user) {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
        return NextResponse.json({ message: "Patient ID is required" }, { status: 400 });
    }

    const existing = await query("SELECT * FROM patients WHERE id = ?", [id]);
    if (!existing.length) {
        return NextResponse.json({ message: "Patient not found" }, { status: 404 });
    }

    // Separate patient fields from surgery fields
    const surgeryFields = ['surgery_type', 'surgery_date', 'surgeon_id', 'hospital_surgeon_id', 'surgery_hospital_id',
        'surgery_status', 'surgery_notes', 'estimated_cost', 'payment_method', 'care_buddy_id', 'surgery_id'];
    const patientUpdates = {};
    const surgeryUpdates = {};

    const ALLOWED_PATIENT_FIELDS = [
        'first_name', 'last_name', 'date_of_birth', 'age', 'gender', 'blood_group',
        'email', 'phone', 'alternate_phone', 'address', 'city', 'state', 'postal_code', 'country',
        'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
        'primary_doctor_id', 'primary_hospital_id', 'medical_record_number',
        'referred_by_role', 'referred_by_id', 'uhid', 'ip_number', 'notes', 'is_active'
    ];

    // Whitelist update fields to prevent SQL injection
    for (const [key, value] of Object.entries(updates)) {
        if (surgeryFields.includes(key)) {
            surgeryUpdates[key] = value;
        } else if (ALLOWED_PATIENT_FIELDS.includes(key)) {
            patientUpdates[key] = value;
        }
    }

    // Update patient table
    const patientFields = Object.keys(patientUpdates);
    if (patientFields.length > 0) {
        const setClause = patientFields.map(f => `${f} = ?`).join(", ");
        // Convert empty strings to null for integer and unique fields
        const integerFields = ['primary_doctor_id', 'primary_hospital_id', 'age', 'referred_by_id'];
        const uniqueStringFields = ['medical_record_number', 'uhid', 'ip_number', 'email'];
        const values = patientFields.map(f => {
            const val = patientUpdates[f];
            if (integerFields.includes(f) && (val === '' || val === undefined)) {
                return null;
            }
            // Convert empty strings to null for unique fields to avoid duplicate empty string errors
            if (uniqueStringFields.includes(f) && val === '') {
                return null;
            }
            return val;
        });
        values.push(id);
        await query(`UPDATE patients SET ${setClause}, updated_at = NOW() WHERE id = ?`, values);

        // Sync changes to Linked User Account if exists
        const patientRecord = existing[0];
        if (patientRecord.user_id) {
            const userUpdates = [];
            const userValues = [];

            // Sync Name -> Username
            if (patientUpdates.first_name || patientUpdates.last_name) {
                const fName = patientUpdates.first_name || patientRecord.first_name;
                const lName = patientUpdates.last_name || patientRecord.last_name;
                const newUsername = `${fName} ${lName}`.trim();
                userUpdates.push("username = ?");
                userValues.push(newUsername);
            }

            // Sync Email
            if (patientUpdates.email !== undefined) { // Check undefined/null explicitly
                userUpdates.push("email = ?");
                userValues.push(patientUpdates.email);
            }

            // Sync Mobile
            if (patientUpdates.phone !== undefined) {
                userUpdates.push("mobile = ?");
                userValues.push(patientUpdates.phone);
            }

            if (userUpdates.length > 0) {
                userValues.push(patientRecord.user_id);
                // We use try-catch here to avoid failing patient update if user update fails (e.g. email duplicate)
                try {
                    await query(`UPDATE users SET ${userUpdates.join(", ")} WHERE id = ?`, userValues);
                } catch (err) {
                    console.error("Failed to sync patient data to user account:", err);
                    // Decide if we want to throw or just log. Logging is safer to not break the main flow.
                }
            }
        }
    }

    if (Object.keys(surgeryUpdates).length > 0) {
        const surgeryId = surgeryUpdates.surgery_id;

        // Ensure IDs are parsed as integers if present
        const safeSurgeonId = surgeryUpdates.surgeon_id ? parseInt(surgeryUpdates.surgeon_id) : null;
        const safeHospitalSurgeonId = surgeryUpdates.hospital_surgeon_id ? parseInt(surgeryUpdates.hospital_surgeon_id) : null;

        console.log("Updating Surgery Details:", {
            id: surgeryId,
            surgeon_id: safeSurgeonId,
            hospital_surgeon_id: safeHospitalSurgeonId,
            raw_surgeon: surgeryUpdates.surgeon_id,
            raw_hospital_surgeon: surgeryUpdates.hospital_surgeon_id
        });

        if (surgeryId) {
            // Update existing surgery
            await query(`
                UPDATE patient_surgeries SET 
                    surgery_type = ?, surgery_date = ?, surgeon_id = ?, hospital_id = ?,
                    hospital_surgeon_id = ?, status = ?, notes = ?, estimated_cost = ?, care_buddy_id = ?,
                    payment_method = ?, updated_at = NOW()
                WHERE id = ?
            `, [
                surgeryUpdates.surgery_type || null,
                surgeryUpdates.surgery_date || null,
                safeSurgeonId,
                surgeryUpdates.surgery_hospital_id || null,
                safeHospitalSurgeonId,
                surgeryUpdates.surgery_status || 'consultation_scheduled',
                surgeryUpdates.surgery_notes || null,
                surgeryUpdates.estimated_cost || null,
                surgeryUpdates.care_buddy_id || null,
                surgeryUpdates.payment_method || null,
                surgeryId
            ]);
        } else {
            await query(`
                INSERT INTO patient_surgeries 
                    (patient_id, surgery_type, surgery_date, surgeon_id, hospital_id, hospital_surgeon_id,
                     status, notes, estimated_cost, care_buddy_id, payment_method)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                id,
                surgeryUpdates.surgery_type || null,
                surgeryUpdates.surgery_date || null,
                safeSurgeonId,
                surgeryUpdates.surgery_hospital_id || null,
                safeHospitalSurgeonId,
                surgeryUpdates.surgery_status || 'consultation_scheduled',
                surgeryUpdates.surgery_notes || null,
                surgeryUpdates.estimated_cost || null,
                surgeryUpdates.care_buddy_id || null,
                surgeryUpdates.payment_method || null
            ]);
        }
    }

    const updated = await query("SELECT * FROM patients WHERE id = ?", [id]);

    return NextResponse.json({
        message: "Patient updated successfully",
        patient: updated[0]
    });
}

// DELETE - Delete patient (permanent delete with cascade)
async function handleDelete(request, context, user) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ message: "Patient ID is required" }, { status: 400 });
    }

    const existing = await query("SELECT * FROM patients WHERE id = ?", [id]);
    if (!existing.length) {
        return NextResponse.json({ message: "Patient not found" }, { status: 404 });
    }

    // Delete all related records first (cascade delete)
    await Promise.all([
        query("DELETE FROM patient_surgeries WHERE patient_id = ?", [id]),
        query("DELETE FROM patient_activities WHERE patient_id = ?", [id]),
        query("DELETE FROM patient_payments WHERE patient_id = ?", [id]),
        query("DELETE FROM patient_notes WHERE patient_id = ?", [id]),
        query("DELETE FROM patient_documents WHERE patient_id = ?", [id]),
        query("DELETE FROM patient_allergies WHERE patient_id = ?", [id]),
        query("DELETE FROM patient_medical_history WHERE patient_id = ?", [id]),
        query("DELETE FROM patient_medications WHERE patient_id = ?", [id]),
        query("DELETE FROM patient_insurance WHERE patient_id = ?", [id])
    ]);

    // Delete the patient record
    await query("DELETE FROM patients WHERE id = ?", [id]);

    return NextResponse.json({ 
        message: "Patient and all related records deleted permanently"
    });
}

const handler = withPermission(MODULES.PATIENTS, {
    GET: handleGet,
    POST: handlePost,
    PUT: handlePut,
    DELETE: handleDelete
});

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
