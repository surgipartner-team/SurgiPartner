import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";

// GET - Fetch machines (mirrors /api/sales/machines)
async function handleGet(request, context, user) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const type = searchParams.get("type");
    const location = searchParams.get("location");
    const manufacturer = searchParams.get("manufacturer");
    const search = searchParams.get("search");

    let sql = `
        SELECT 
            m.*,
            c.name as clinic_name
        FROM machines m
        LEFT JOIN hospitals c ON m.assigned_hospitals_id = c.id
        WHERE 1=1
    `;
    const params = [];

    if (status && status !== "all") {
        sql += " AND m.status = ?";
        params.push(status);
    }

    if (category && category !== "all") {
        sql += " AND m.category = ?";
        params.push(category);
    }

    if (type && type !== "all") {
        sql += " AND m.type = ?";
        params.push(type);
    }

    if (location && location !== "all") {
        sql += " AND m.location = ?";
        params.push(location);
    }

    if (manufacturer && manufacturer !== "all") {
        sql += " AND m.manufacturer = ?";
        params.push(manufacturer);
    }

    if (search) {
        sql += ` AND (
            m.machine_name LIKE ? OR 
            m.machine_id LIKE ? OR 
            m.serial_number LIKE ? OR 
            m.manufacturer LIKE ? OR
            m.model_number LIKE ?
        )`;
        const pattern = `%${search}%`;
        params.push(pattern, pattern, pattern, pattern, pattern);
    }

    sql += " ORDER BY m.created_at DESC";
    const machinesRaw = await query(sql, params);

    // Helper to format date safely
    const formatDate = (dateInput) => {
        if (!dateInput) return null;
        const d = new Date(dateInput);
        const z = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
        return z.toISOString().split('T')[0];
    };

    const machines = machinesRaw.map(m => ({
        ...m,
        purchase_date: formatDate(m.purchase_date),
        rental_start_date: formatDate(m.rental_start_date),
        rental_end_date: formatDate(m.rental_end_date),
        warranty_start_date: formatDate(m.warranty_start_date),
        warranty_expiry: formatDate(m.warranty_expiry),
        last_Maintenance_date: formatDate(m.last_Maintenance_date),
        next_Maintenance_date: formatDate(m.next_Maintenance_date)
    }));

    // Get statistics
    const stats = await query(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) as available_count,
            SUM(CASE WHEN status = 'Rented' THEN 1 ELSE 0 END) as rented_count,
            SUM(CASE WHEN status = 'Sold' THEN 1 ELSE 0 END) as sold_count,
            SUM(CASE WHEN status = 'Maintenance' THEN 1 ELSE 0 END) as maintenance_count
        FROM machines
    `);

    return NextResponse.json({
        machines,
        stats: stats[0],
        userRole: user.role
    });
}

// POST - Create machine
async function handlePost(request, context, user) {
    const body = await request.json();
    const {
        machine_name, machine_id, serial_number, model_number, manufacturer,
        category, type, status, purchase_date, purchase_price, rental_price, rental_start_date, rental_end_date,
        location, assigned_hospitals_id, notes, specifications, Manufacturing_year, warranty_start_date, warranty_expiry,
        last_Maintenance_date, next_Maintenance_date
    } = body;

    if (!machine_name) {
        return NextResponse.json(
            { message: "Machine name is required" },
            { status: 400 }
        );
    }

    // Auto-generate machine_id if not provided
    let finalMachineId = machine_id;
    if (!finalMachineId) {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        finalMachineId = `MCH-${timestamp}${random}`;
    }

    const result = await query(
        `INSERT INTO machines (
            machine_name, machine_id, serial_number, model_number, manufacturer,
            category, type, status, purchase_date, purchase_price, rental_price, rental_start_date, rental_end_date,
            location, assigned_hospitals_id, notes, image_url, specifications, Manufacturing_year, warranty_start_date, warranty_expiry,
            last_Maintenance_date, next_Maintenance_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
            machine_name, finalMachineId, serial_number || null, model_number || null, manufacturer || null,
            category || null, type || null, status || 'Available', purchase_date || null, purchase_price || null,
            rental_price || null, rental_start_date || null, rental_end_date || null, location || null, assigned_hospitals_id || null, notes || null,
            body.image_url || null, specifications || null, Manufacturing_year || null, warranty_start_date || null, warranty_expiry || null,
            last_Maintenance_date || null, next_Maintenance_date || null
        ]
    );

    const created = await query("SELECT * FROM machines WHERE id = ?", [result.insertId]);

    return NextResponse.json({
        message: "Machine created successfully",
        machine: created[0]
    }, { status: 201 });
}

// PUT - Update machine
async function handlePut(request, context, user) {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
        return NextResponse.json({ message: "Machine ID is required" }, { status: 400 });
    }

    const existing = await query("SELECT * FROM machines WHERE id = ?", [id]);
    if (!existing.length) {
        return NextResponse.json({ message: "Machine not found" }, { status: 404 });
    }

    // Sanitize updates
    const numericFields = ['purchase_price', 'sale_price', 'rental_price', 'Manufacturing_year'];
    const dateFields = ['purchase_date', 'rental_start_date', 'rental_end_date', 'warranty_start_date', 'warranty_expiry', 'last_Maintenance_date', 'next_Maintenance_date'];

    const sanitizedUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
        if (numericFields.includes(key)) {
            // Convert empty string to null, or keep valid number
            sanitizedUpdates[key] = (value === '' || value === null) ? null : value;
        } else if (dateFields.includes(key)) {
            // Convert empty string to null
            sanitizedUpdates[key] = (value === '' || value === null) ? null : value;
        } else {
            sanitizedUpdates[key] = value;
        }
    }

    const fields = Object.keys(sanitizedUpdates);
    if (fields.length === 0) {
        return NextResponse.json({ message: "No fields to update" }, { status: 400 });
    }

    const setClause = fields.map(f => `${f} = ?`).join(", ");
    const values = [...fields.map(f => sanitizedUpdates[f]), id];

    await query(`UPDATE machines SET ${setClause} WHERE id = ?`, values);

    const updated = await query("SELECT * FROM machines WHERE id = ?", [id]);

    return NextResponse.json({
        message: "Machine updated successfully",
        machine: updated[0]
    });
}

// DELETE - Delete machine
async function handleDelete(request, context, user) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ message: "Machine ID is required" }, { status: 400 });
    }

    await query("DELETE FROM machines WHERE id = ?", [id]);

    return NextResponse.json({ message: "Machine deleted successfully" });
}

const handler = withPermission(MODULES.MACHINES, {
    GET: handleGet,
    POST: handlePost,
    PUT: handlePut,
    DELETE: handleDelete
});

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
