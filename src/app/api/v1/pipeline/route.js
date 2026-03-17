import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES, checkPermission } from "@/lib/permissions";

// GET - Fetch pipeline cases (mirrors /api/admin/pipeline)
async function handleGet(request, context, user) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const stage = searchParams.get("stage");
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");

    let sql = `
        SELECT 
            ps.*,
            p.patient_id,
            p.first_name,
            p.last_name,
            p.age,
            p.gender,
            p.phone,
            p.email,
            u.username as surgeon_name,
            h.name as hospital_name,
            cb.username as care_buddy_name
        FROM patient_surgeries ps
        INNER JOIN patients p ON ps.patient_id = p.id
        LEFT JOIN doctors d ON ps.surgeon_id = d.id
        LEFT JOIN users u ON d.user_id = u.id
        LEFT JOIN hospitals h ON ps.hospital_id = h.id
        LEFT JOIN users cb ON ps.care_buddy_id = cb.id
        WHERE 1=1
    `;
    const params = [];

    // Single case by ID
    if (id) {
        sql += " AND ps.id = ?";
        params.push(id);
    }

    // Role-based data filtering
    if (user.role === "carebuddy") {
        sql += " AND ps.care_buddy_id = ?";
        params.push(user.id);
    }

    // Stage filter
    if (stage && stage !== "all") {
        sql += " AND ps.status = ?";
        params.push(stage);
    }

    // Date filters
    if (dateFrom) {
        sql += " AND ps.surgery_date >= ?";
        params.push(dateFrom);
    }
    if (dateTo) {
        sql += " AND ps.surgery_date <= ?";
        params.push(dateTo);
    }

    // Search
    if (search) {
        sql += ` AND (
            p.first_name LIKE ? OR 
            p.last_name LIKE ? OR 
            p.patient_id LIKE ? OR
            ps.surgery_type LIKE ? OR
            u.username LIKE ?
        )`;
        const pattern = `%${search}%`;
        params.push(pattern, pattern, pattern, pattern, pattern);
    }

    sql += " ORDER BY ps.surgery_date ASC, ps.created_at DESC";
    const cases = await query(sql, params);

    // Get statistics by stage
    let statsSql = `
        SELECT 
            status,
            COUNT(*) as count
        FROM patient_surgeries
    `;
    const statsParams = [];
    if (user.role === "carebuddy") {
        statsSql += " WHERE care_buddy_id = ?";
        statsParams.push(user.id);
    }
    statsSql += " GROUP BY status";
    const statsRows = await query(statsSql, statsParams);

    // Transform stats into object
    const stats = {
        total: 0,
        consultation_scheduled: 0,
        consulted: 0,
        preop_cleared: 0,
        ot_scheduled: 0,
        surgery_done: 0,
        discharge: 0,
        followup: 0
    };

    statsRows.forEach(stat => {
        stats[stat.status] = stat.count;
        stats.total += stat.count;
    });

    // For each case, process progress checklist
    const casesWithDetails = cases.map(caseItem => {
        let tasks = [];
        if (caseItem.progress_checklist) {
            if (typeof caseItem.progress_checklist === 'string') {
                try {
                    tasks = JSON.parse(caseItem.progress_checklist);
                } catch (e) {
                    tasks = [];
                }
            } else if (Array.isArray(caseItem.progress_checklist)) {
                tasks = caseItem.progress_checklist;
            }
        }
        const completedTasks = Array.isArray(tasks) ? tasks.filter(t => t.completed).length : 0;
        const totalTasks = Array.isArray(tasks) ? tasks.length : 0;

        return {
            ...caseItem,
            progress_checklist: tasks,
            completed_tasks: completedTasks,
            total_tasks: totalTasks,
            progress_percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        };
    });

    return NextResponse.json({
        cases: casesWithDetails,
        stats,
        userRole: user.role
    });
}

// POST - Create case
async function handlePost(request, context, user) {
    const body = await request.json();
    const {
        patient_id, surgery_type, surgeon_id, hospital_id, care_buddy_id,
        consultation_date, surgery_date, estimated_cost, notes, status
    } = body;

    if (!patient_id || !surgery_type) {
        return NextResponse.json(
            { message: "Missing required fields: patient_id, surgery_type" },
            { status: 400 }
        );
    }

    const sql = `
        INSERT INTO patient_surgeries (
            patient_id, surgery_type, surgeon_id, hospital_id, care_buddy_id,
            consultation_date, surgery_date, estimated_cost, notes, status,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const result = await query(sql, [
        patient_id, surgery_type, surgeon_id || null, hospital_id || null, care_buddy_id || null,
        consultation_date || null, surgery_date || null, estimated_cost || null, notes || null,
        status || 'consultation_scheduled'
    ]);

    const created = await query("SELECT * FROM patient_surgeries WHERE id = ?", [result.insertId]);

    return NextResponse.json({
        message: "Case created successfully",
        case: created[0]
    }, { status: 201 });
}

// PUT - Update case (stage change, etc.)
async function handlePut(request, context, user) {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
        return NextResponse.json({ message: "Case ID is required" }, { status: 400 });
    }

    const existing = await query("SELECT * FROM patient_surgeries WHERE id = ?", [id]);
    if (!existing.length) {
        return NextResponse.json({ message: "Case not found" }, { status: 404 });
    }

    // CareBuddy can only update certain fields (not status/stage)
    if (user.role === "carebuddy") {
        if (updates.status) {
            const { allowed } = await checkPermission(user.id, user.role, MODULES.PIPELINE, 'manage');
            if (!allowed) {
                return NextResponse.json({ message: "CareBuddy cannot change case stages" }, { status: 403 });
            }
        }
    }

    const fields = Object.keys(updates);
    if (fields.length === 0) {
        return NextResponse.json({ message: "No fields to update" }, { status: 400 });
    }

    const setClause = fields.map(f => `${f} = ?`).join(", ");
    const values = fields.map(f => {
        if (f === 'progress_checklist' && typeof updates[f] === 'object') {
            return JSON.stringify(updates[f]);
        }
        return updates[f];
    });
    values.push(id);

    await query(`UPDATE patient_surgeries SET ${setClause} WHERE id = ?`, values);

    const updated = await query("SELECT * FROM patient_surgeries WHERE id = ?", [id]);

    return NextResponse.json({
        message: "Case updated successfully",
        case: updated[0]
    });
}

// DELETE - Delete case
async function handleDelete(request, context, user) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ message: "Case ID is required" }, { status: 400 });
    }

    const existing = await query("SELECT * FROM patient_surgeries WHERE id = ?", [id]);
    if (!existing.length) {
        return NextResponse.json({ message: "Case not found" }, { status: 404 });
    }

    await query("DELETE FROM patient_surgeries WHERE id = ?", [id]);

    return NextResponse.json({ message: "Case deleted successfully" });
}

const handler = withPermission(MODULES.PIPELINE, {
    GET: handleGet,
    POST: handlePost,
    PUT: handlePut,
    DELETE: handleDelete
}, {
    customActionMap: { PUT: 'manage' }
});

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
