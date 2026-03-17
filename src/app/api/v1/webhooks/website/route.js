import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// POST - Generic Website Form
export async function POST(request) {
    try {
        const body = await request.json();
        const { name, phone, email, city, message, form_name } = body;

        if (!name || !phone) {
            return NextResponse.json({ message: "Name and Phone required" }, { status: 400 });
        }

        await createLeadInDb({
            name,
            phone,
            email,
            city: city || "Unknown",
            source: "Website",
            category: "surgery/patient",
            notes: `Form: ${form_name || 'Contact Us'}. Message: ${message || ''}`
        });

        // Update stats
        await query(
            `UPDATE lead_integrations 
             SET last_lead_received_at = NOW(), total_leads_received = total_leads_received + 1 
             WHERE provider = 'website'`
        );

        return NextResponse.json({ status: "success", message: "Lead captured" });

    } catch (error) {
        console.error("Error processing Website webhook:", error);
        return NextResponse.json({ message: "Internal Error" }, { status: 500 });
    }
}

async function createLeadInDb(leadData) {
    const { name, phone, email, source, city, category, notes } = leadData;

    const config = await query("SELECT * FROM lead_integrations WHERE provider = 'website' LIMIT 1");
    let ownerId = null;

    if (config.length && config[0].auto_assign && config[0].default_assignee_id) {
        ownerId = config[0].default_assignee_id;
    } else {
        const admin = await query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (admin.length) ownerId = admin[0].id;
    }

    const sql = `
        INSERT INTO leads(
            name, phone, email, city, source, status, category,
            owner_id, notes, created_at, updated_at
        ) VALUES(?, ?, ?, ?, ?, 'new', ?, ?, ?, NOW(), NOW())
    `;

    await query(sql, [
        name, phone, email, city, source, category, ownerId, notes
    ]);
}
