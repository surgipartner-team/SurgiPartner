import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";

// Manual Assignment: Assign all leads to a specific user
async function assignManually(leadIds, assigneeId, adminId) {
    const results = [];

    // Verify assignee exists and is a sales or outsourcing user
    const assignee = await query(
        "SELECT id, username, email FROM users WHERE id = ? AND role = 'sales'",
        [assigneeId]
    );

    if (assignee.length === 0) {
        throw new Error("Invalid assignee or user is not a sales/outsourcing team member");
    }

    for (const leadId of leadIds) {
        await query("UPDATE leads SET owner_id = ?, updated_at = NOW() WHERE id = ?", [assigneeId, leadId]);

        await query(
            `INSERT INTO lead_activities (lead_id, user_id, activity_type, description, created_at) 
             VALUES (?, ?, 'call', ?, NOW())`,
            [leadId, adminId, `Lead assigned to ${assignee[0].username}`]
        );

        results.push({ leadId, assignedTo: assignee[0].username, assigneeId });
    }

    return results;
}

// Round Robin: Distribute leads evenly across all sales team members
async function assignRoundRobin(leadIds, adminId) {
    const results = [];

    const salesTeam = await query(
        "SELECT id, username FROM users WHERE role = 'sales' AND is_active = 1 ORDER BY id"
    );

    if (salesTeam.length === 0) {
        throw new Error("No active sales/outsourcing team members found");
    }

    const leadCounts = await query(
        `SELECT owner_id, COUNT(*) as count FROM leads 
         WHERE owner_id IN (${salesTeam.map(() => "?").join(",")}) 
         AND status NOT IN ('converted', 'not converted', 'dummy') GROUP BY owner_id`,
        salesTeam.map((m) => m.id)
    );

    const countMap = {};
    salesTeam.forEach((member) => { countMap[member.id] = 0; });
    leadCounts.forEach((row) => { countMap[row.owner_id] = row.count; });

    const sortedTeam = salesTeam.sort((a, b) => countMap[a.id] - countMap[b.id]);

    let currentIndex = 0;
    for (const leadId of leadIds) {
        const assignee = sortedTeam[currentIndex];

        await query("UPDATE leads SET owner_id = ?, updated_at = NOW() WHERE id = ?", [assignee.id, leadId]);

        await query(
            `INSERT INTO lead_activities (lead_id, user_id, activity_type, description, created_at) 
             VALUES (?, ?, 'call', ?, NOW())`,
            [leadId, adminId, `Lead assigned to ${assignee.username} (Round Robin)`]
        );

        results.push({ leadId, assignedTo: assignee.username, assigneeId: assignee.id });
        currentIndex = (currentIndex + 1) % sortedTeam.length;
        countMap[assignee.id]++;
    }

    return results;
}

// Least Loaded: Assign leads to balance workload
async function assignLeastLoaded(leadIds, adminId) {
    const results = [];

    const salesTeam = await query(
        `SELECT u.id, u.username, COUNT(l.id) as active_leads
         FROM users u
         LEFT JOIN leads l ON u.id = l.owner_id AND l.status NOT IN ('converted', 'not converted', 'dummy')
         WHERE u.role = 'sales' AND u.is_active = 1
         GROUP BY u.id, u.username ORDER BY active_leads ASC, u.id ASC`
    );

    if (salesTeam.length === 0) {
        throw new Error("No active sales/outsourcing team members found");
    }

    for (const leadId of leadIds) {
        // Re-sort to get current least loaded
        salesTeam.sort((a, b) => a.active_leads - b.active_leads);
        const assignee = salesTeam[0];

        await query("UPDATE leads SET owner_id = ?, updated_at = NOW() WHERE id = ?", [assignee.id, leadId]);

        await query(
            `INSERT INTO lead_activities (lead_id, user_id, activity_type, description, created_at) 
             VALUES (?, ?, 'call', ?, NOW())`,
            [leadId, adminId, `Lead assigned to ${assignee.username} (Least Loaded)`]
        );

        results.push({ leadId, assignedTo: assignee.username, assigneeId: assignee.id });
        assignee.active_leads++;
    }

    return results;
}

// POST - Assign leads
async function handlePost(request, context, user) {
    // Only admins can assign leads
    if (user.role !== "admin") {
        return NextResponse.json({ message: "Access denied. Admin role required." }, { status: 403 });
    }

    const body = await request.json();
    const { leadIds, assigneeId, assignmentMode } = body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
        return NextResponse.json({ message: "No leads selected for assignment" }, { status: 400 });
    }

    if (!assignmentMode || !["manual", "round-robin", "least-loaded"].includes(assignmentMode)) {
        return NextResponse.json({ message: "Invalid assignment mode" }, { status: 400 });
    }

    let assignmentResults = [];

    switch (assignmentMode) {
        case "manual":
            if (!assigneeId) {
                return NextResponse.json({ message: "Assignee ID required for manual assignment" }, { status: 400 });
            }
            assignmentResults = await assignManually(leadIds, assigneeId, user.id);
            break;
        case "round-robin":
            assignmentResults = await assignRoundRobin(leadIds, user.id);
            break;
        case "least-loaded":
            assignmentResults = await assignLeastLoaded(leadIds, user.id);
            break;
    }

    return NextResponse.json({
        message: `Successfully assigned ${leadIds.length} lead(s)`,
        results: assignmentResults
    });
}

const handler = withPermission(MODULES.LEADS, {
    POST: handlePost
}, { customActionMap: { POST: 'assign' } });

export { handler as POST };
