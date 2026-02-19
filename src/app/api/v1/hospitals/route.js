import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";

// GET - Fetch hospitals
async function handleGet(request, context, user) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const search = searchParams.get("search");
    const city = searchParams.get("city");
    const status = searchParams.get("status");

    if (id) {
        const hospitals = await query("SELECT * FROM hospitals WHERE id = ?", [id]);
        if (!hospitals.length) {
            return NextResponse.json({ message: "Hospital not found" }, { status: 404 });
        }

        // Fetch Surgeons
        const surgeons = await query("SELECT * FROM hospital_surgeons WHERE hospital_id = ?", [id]);

        // Fetch Associated Patients (Done in this hospital)
        const patients = await query(`
            SELECT 
                ps.id, ps.surgery_type, ps.surgery_date, ps.status,
                p.patient_id, p.first_name, p.last_name, p.phone,
                COALESCE(u.username, hs.name) as surgeon_name
            FROM patient_surgeries ps
            JOIN patients p ON ps.patient_id = p.id
            LEFT JOIN doctors d ON ps.surgeon_id = d.id
            LEFT JOIN users u ON d.user_id = u.id
            LEFT JOIN hospital_surgeons hs ON ps.hospital_surgeon_id = hs.id
            WHERE ps.hospital_id = ?
            ORDER BY ps.surgery_date DESC
        `, [id]);

        // Fetch Associated Machines (Sold or Rented to this hospital)
        const machines = await query("SELECT * FROM machines WHERE assigned_hospitals_id = ? ORDER BY created_at DESC", [id]);

        // Fetch Assigned Consumables
        const consumables = await query(`
            SELECT hc.id, hc.consumable_id, hc.assigned_date, hc.quantity, hc.selling_price, hc.total_amount, hc.status,
                   c.item_name, c.sku, c.unit
            FROM hospital_consumables hc
            JOIN consumables c ON hc.consumable_id = c.id
            WHERE hc.hospital_id = ?
            ORDER BY hc.assigned_date DESC
        `, [id]);

        return NextResponse.json({
            hospital: {
                ...hospitals[0],
                surgeons,
                assigned_patients: patients,
                assigned_machines: machines,
                consumables: consumables
            }
        });
    }

    let sql = `
        SELECT h.*, 
        (SELECT COUNT(*) FROM patient_surgeries ps 
         WHERE ps.hospital_id = h.id 
         AND ps.status IN ('discharge', 'completed', 'surgery_done')) as cases_completed 
        FROM hospitals h WHERE 1=1
    `;
    const params = [];

    if (status && status !== "all") {
        if (status === 'active') {
            sql += " AND partnership_status = 'Active'";
        } else if (status === 'inactive') {
            sql += " AND partnership_status != 'Active'";
        }
    }

    if (city && city !== "all") {
        sql += " AND city = ?";
        params.push(city);
    }

    if (search) {
        sql += " AND (name LIKE ? OR city LIKE ? OR address LIKE ?)";
        const pattern = `%${search}%`;
        params.push(pattern, pattern, pattern);
    }

    sql += " ORDER BY name ASC";
    const hospitals = await query(sql, params);

    // Calculate stats
    const statsQuery = `
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN partnership_status = 'Active' THEN 1 ELSE 0 END) as active_count,
            SUM(CASE WHEN partnership_status = 'Pending' THEN 1 ELSE 0 END) as pending_count,
            AVG(commission_rate) as avg_commission,
            (SELECT COUNT(*) FROM patient_surgeries WHERE status IN ('discharge', 'completed', 'surgery_done')) as total_cases
        FROM hospitals
    `;
    const statsResult = await query(statsQuery);
    const stats = statsResult[0] || { total: 0, active_count: 0, pending_count: 0, avg_commission: 0, total_cases: 0 };

    // Fetch surgeons for each hospital (or single) if needed, but for list view usually we might not need all. 
    // However, the request is to "view it shows like dropdown so we can see how many doctors and which doctors there".
    // Efficient way: Fetch all surgeons for these hospitals.
    const hospitalIds = hospitals.map(h => h.id);
    let surgeonsMap = {};
    if (hospitalIds.length > 0) {
        const surgeons = await query(`SELECT * FROM hospital_surgeons WHERE hospital_id IN (${hospitalIds.join(',')})`);
        surgeons.forEach(s => {
            if (!surgeonsMap[s.hospital_id]) surgeonsMap[s.hospital_id] = [];
            surgeonsMap[s.hospital_id].push(s);
        });
    }

    const hospitalsWithSurgeons = hospitals.map(h => ({
        ...h,
        surgeons: surgeonsMap[h.id] || []
    }));

    return NextResponse.json({ hospitals: hospitalsWithSurgeons, stats });
}

// POST - Create hospital
async function handlePost(request, context, user) {
    const body = await request.json();
    const {
        name, address, city, state, phone, email, contact_person, notes,
        gst_number, bank_name, branch_name, ifsc_code, account_number,
        hospital_type, pin_code, country, contact_person_phone,
        operation_theatres, total_beds, icu_beds, commission_rate, accreditations
    } = body;

    if (!name || !city) {
        return NextResponse.json({ message: "Name and city are required" }, { status: 400 });
    }

    const result = await query(
        `INSERT INTO hospitals (
            name, address, city, state, phone, email, contact_person, notes, 
            gst_number, bank_name, branch_name, ifsc_code, account_number, 
            hospital_type, pin_code, country, contact_person_phone,
            operation_theatres, total_beds, icu_beds, commission_rate, accreditations,
            partnership_status, created_at, updated_at
        )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', NOW(), NOW())`,
        [
            name, address || null, city, state || null, phone || null, email || null, contact_person || null, notes || null,
            gst_number || null, bank_name || null, branch_name || null, ifsc_code || null, account_number || null,
            hospital_type || null, pin_code || null, country || 'India', contact_person_phone || null,
            operation_theatres || null, total_beds || null, icu_beds || null, commission_rate || null, accreditations || null
        ]
    );

    const hospitalId = result.insertId;

    // Handle Surgeons
    if (body.surgeons && Array.isArray(body.surgeons) && body.surgeons.length > 0) {
        // Bulk insert
        for (const s of body.surgeons) {
            await query(`INSERT INTO hospital_surgeons (hospital_id, name, phone, designation, department, image, experience, available_timings) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [hospitalId, s.name, s.phone || null, s.designation || null, s.department || null, s.image || null, s.experience || null, s.available_timings || null]);
        }
    }

    const created = await query("SELECT * FROM hospitals WHERE id = ?", [hospitalId]);
    return NextResponse.json({ message: "Hospital created successfully", hospital: created[0] }, { status: 201 });
}

// PUT - Update hospital
async function handlePut(request, context, user) {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
        return NextResponse.json({ message: "Hospital ID is required" }, { status: 400 });
    }

    const existing = await query("SELECT * FROM hospitals WHERE id = ?", [id]);
    if (!existing.length) {
        return NextResponse.json({ message: "Hospital not found" }, { status: 404 });
    }

    // Exclude surgeons and metadata fields from direct table update
    const { surgeons, created_at, updated_at, ...hospitalUpdates } = updates;
    const fields = Object.keys(hospitalUpdates);

    // If there are fields to update in the hospitals table
    if (fields.length > 0) {
        const setClause = fields.map(f => `${f} = ?`).join(", ");
        const values = [...fields.map(f => {
            const val = hospitalUpdates[f];
            // Handle Bank Details / JSON fields if necessary, assuming string for now as per requirement 'can be text'
            // If bank_details is object, JSON.stringify it before saving if column is TEXT/JSON
            if (f === 'bank_details' && typeof val === 'object' && val !== null) return JSON.stringify(val);
            return val;
        }), id];
        await query(`UPDATE hospitals SET ${setClause}, updated_at = NOW() WHERE id = ?`, values);
    }

    // Update Surgeons: Replace strategy (Delete all for this hospital and re-insert)
    // This is simplest to handle additions/deletions/edits for a sub-list.
    if (body.surgeons && Array.isArray(body.surgeons)) {
        await query("DELETE FROM hospital_surgeons WHERE hospital_id = ?", [id]);
        for (const s of body.surgeons) {
            await query(`INSERT INTO hospital_surgeons (hospital_id, name, phone, designation, department, image, experience, available_timings) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, s.name, s.phone || null, s.designation || null, s.department || null, s.image || null, s.experience || null, s.available_timings || null]);
        }
    }

    const updated = await query("SELECT * FROM hospitals WHERE id = ?", [id]);
    const updatedSurgeons = await query("SELECT * FROM hospital_surgeons WHERE hospital_id = ?", [id]);

    return NextResponse.json({
        message: "Hospital updated successfully",
        hospital: { ...updated[0], surgeons: updatedSurgeons }
    });
}

// DELETE - Delete hospital
async function handleDelete(request, context, user) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ message: "Hospital ID is required" }, { status: 400 });
    }

    await query("UPDATE hospitals SET partnership_status = 'Inactive', updated_at = NOW() WHERE id = ?", [id]);

    return NextResponse.json({ message: "Hospital deleted successfully" });
}

const handler = withPermission(MODULES.HOSPITALS, {
    GET: handleGet,
    POST: handlePost,
    PUT: handlePut,
    DELETE: handleDelete
});

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
