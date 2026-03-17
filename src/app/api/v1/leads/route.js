import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";

function normalizeStatus(status) {
    const statusMap = {
        new: "new",
        "follow-up": "follow-up",
        converted: "converted",
        "not-converted": "not-converted",
        "not converted": "not-converted",
        dummy: "dummy",
    };
    return statusMap[status] || status;
}

// GET - Fetch leads
async function handleGet(request, context, user) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const source = searchParams.get("source");
    const surgery = searchParams.get("surgery");
    const city = searchParams.get("city");
    const owner = searchParams.get("owner");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");

    const history = searchParams.get("history");

    if (history) {
        let sql = `
            SELECT 
                lh.*,
                u.username as changed_by_name
            FROM lead_history lh
            LEFT JOIN users u ON lh.changed_by_user_id = u.id
            WHERE lh.lead_id = ?
            ORDER BY lh.created_at DESC
        `;
        const historyData = await query(sql, [history]);
        return NextResponse.json({ history: historyData });
    }


    // Base conditions and params
    let conditions = " WHERE 1=1";
    const params = [];

    // Role-based data filtering
    if (user.role === "sales") {
        conditions += " AND l.owner_id = ?";
        params.push(user.id);
    } else if (user.role === "outsourcing") {
        conditions += " AND l.owner_id = ?";
        params.push(user.id);
    }

    // Apply filters
    if (status && status !== "all") {
        conditions += " AND l.status = ?";
        params.push(normalizeStatus(status));
    }

    if (category && category !== "all") {
        conditions += " AND l.category = ?";
        params.push(category);
    }

    if (source && source !== "all") {
        conditions += " AND l.source = ?";
        params.push(source);
    }

    if (surgery && surgery !== "all") {
        conditions += " AND l.surgery_name = ?";
        params.push(surgery);
    }

    if (city && city !== "all") {
        conditions += " AND l.city = ?";
        params.push(city);
    }

    if (owner && owner !== "all") {
        if (owner === "unassigned") {
            conditions += " AND l.owner_id IS NULL";
        } else {
            conditions += " AND u.username = ?";
            params.push(owner);
        }
    }

    if (dateFrom) {
        conditions += " AND DATE(l.created_at) >= ?";
        params.push(dateFrom);
    }

    if (dateTo) {
        conditions += " AND DATE(l.created_at) <= ?";
        params.push(dateTo);
    }

    if (search) {
        conditions += ` AND (
        l.name LIKE ? OR 
            l.phone LIKE ? OR 
            l.email LIKE ? OR 
            l.city LIKE ? OR 
            l.surgery_name LIKE ?
        )`;
        const searchPattern = `% ${search}% `;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // LIST QUERY
    let sql = `
    SELECT
    l.*,
        u.username as owner_name,
        u.email as owner_email
        FROM leads l
        LEFT JOIN users u ON l.owner_id = u.id
        ${conditions}
        ORDER BY l.created_at DESC
        `;

    const leads = await query(sql, params);

    // STATS QUERY
    // Use the same conditions but we need to handle the JOIN if 'u.username' is used in filters
    // Since 'conditions' contains 'u.username' (if owner filter is active), we must include the JOIN in stats query too.
    let statsQuery = `
    SELECT
    COUNT(*) as total,
        SUM(CASE WHEN l.status = 'new' THEN 1 ELSE 0 END) as new_count,
        SUM(CASE WHEN l.status = 'follow-up' THEN 1 ELSE 0 END) as followup_count,
        SUM(CASE WHEN l.status = 'converted' THEN 1 ELSE 0 END) as converted_count
        FROM leads l
        LEFT JOIN users u ON l.owner_id = u.id
        ${conditions}
    `;

    // params are identical because conditions are identical
    const stats = await query(statsQuery, params);

    return NextResponse.json({
        leads,
        stats: stats[0] || { total: 0, new_count: 0, followup_count: 0, converted_count: 0 },
        userRole: user.role,
    });
}

// POST - Create a new lead
async function handlePost(request, context, user) {
    const body = await request.json();
    const { name, phone, email, city, source, category, surgery_name, notes } = body;

    if (!name || !phone || !city || !source || !category) {
        return NextResponse.json(
            { message: "Missing required fields: name, phone, city, source, category" },
            { status: 400 }
        );
    }

    if (!["surgery/patient", "machines", "consumables"].includes(category)) {
        return NextResponse.json(
            { message: "Invalid category. Must be: surgery/patient, machines, or consumables" },
            { status: 400 }
        );
    }

    const sql = `
        INSERT INTO leads(
        name, phone, email, city, source, status, category,
        surgery_name, owner_id, notes, created_at, updated_at
    ) VALUES(?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, NOW(), NOW())
    `;

    const result = await query(sql, [
        name,
        phone,
        email || `${phone.replace(/\s+/g, "")} @temp.com`,
        city,
        source,
        category,
        surgery_name || null,
        user.id,
        notes || null,
    ]);

    await query(
        `INSERT INTO lead_activities(lead_id, user_id, activity_type, description, created_at)
    VALUES(?, ?, 'note', 'Lead created', NOW())`,
        [result.insertId, user.id]
    );

    const createdLead = await query(
        `SELECT l.*, u.username as owner_name
         FROM leads l
         LEFT JOIN users u ON l.owner_id = u.id
         WHERE l.id = ? `,
        [result.insertId]
    );

    return NextResponse.json({
        message: "Lead created successfully",
        lead: createdLead[0],
    }, { status: 201 });
}

// PUT - Update a lead
async function handlePut(request, context, user) {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
        return NextResponse.json({ message: "Lead ID is required" }, { status: 400 });
    }

    // Check if lead exists
    const existing = await query("SELECT * FROM leads WHERE id = ?", [id]);
    if (!existing.length) {
        return NextResponse.json({ message: "Lead not found" }, { status: 404 });
    }

    // Role-based edit restriction
    if (user.role === "sales" && existing[0].owner_id !== user.id) {
        return NextResponse.json({ message: "You can only edit your own leads" }, { status: 403 });
    }

    // Normalize status if present
    if (updates.status) {
        updates.status = normalizeStatus(updates.status);
    }

    // Build update query
    const ALLOWED_LEAD_FIELDS = [
        'name', 'phone', 'email', 'city', 'source', 'status', 'category',
        'surgery_name', 'owner_id', 'notes', 'next_followup_at',
        'estimated_amount', 'consulted_date', 'not_converted_reason'
    ];

    const fields = Object.keys(updates).filter(key => ALLOWED_LEAD_FIELDS.includes(key));
    if (fields.length === 0) {
        return NextResponse.json({ message: "No fields to update" }, { status: 400 });
    }

    // Prepare update query
    const setClause = fields.map(f => `${f} = ?`).join(", ");
    const values = fields.map(f => updates[f]);
    values.push(id);

    await query(`UPDATE leads SET ${setClause}, updated_at = NOW() WHERE id = ? `, values);

    // Log to history
    try {
        const oldVals = {};
        const newVals = {};
        let hasChanges = false;

        fields.forEach(field => {
            let oldValue = existing[0][field];
            let newValue = updates[field];

            // Handle date comparison/normalization if needed, or simple stringify
            // Convert dates to iso strings for comparison if they are objects
            if (oldValue instanceof Date) oldValue = oldValue.toISOString();
            // newValue might be string from JSON body

            if (oldValue != newValue) { // Loose equality for '1' vs 1
                // Stricter check using JSON stringify to catch deep/type diffs if loosely equal
                if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                    oldVals[field] = existing[0][field]; // Check DB value again
                    newVals[field] = updates[field];
                    hasChanges = true;
                }
            }
        });

        if (hasChanges) {
            let action = 'update';
            if (newVals.status) action = 'status_change';

            await query(
                `INSERT INTO lead_history(lead_id, changed_by_user_id, action_type, old_values, new_values, description)
    VALUES(?, ?, ?, ?, ?, ?)`,
                [
                    id,
                    user.id,
                    action,
                    JSON.stringify(oldVals),
                    JSON.stringify(newVals),
                    `Updated: ${Object.keys(newVals).join(', ')} `
                ]
            );
        }
    } catch (err) {
        console.error("Failed to log lead history:", err);
        // Don't fail the request, just log error
    }

    const updatedLead = await query(
        `SELECT l.*, u.username as owner_name
         FROM leads l
         LEFT JOIN users u ON l.owner_id = u.id
         WHERE l.id = ? `,
        [id]
    );

    return NextResponse.json({
        message: "Lead updated successfully",
        lead: updatedLead[0],
    });
}

// DELETE - Delete a lead
async function handleDelete(request, context, user) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ message: "Lead ID is required" }, { status: 400 });
    }

    const existing = await query("SELECT * FROM leads WHERE id = ?", [id]);
    if (!existing.length) {
        return NextResponse.json({ message: "Lead not found" }, { status: 404 });
    }

    // Delete related data first
    await query("DELETE FROM lead_activities WHERE lead_id = ?", [id]);
    await query("DELETE FROM leads WHERE id = ?", [id]);

    return NextResponse.json({ message: "Lead deleted successfully" });
}

// Export wrapped handlers
const handler = withPermission(MODULES.LEADS, {
    GET: handleGet,
    POST: handlePost,
    PUT: handlePut,
    DELETE: handleDelete
});

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
