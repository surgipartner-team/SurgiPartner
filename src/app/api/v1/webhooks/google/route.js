import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// POST - Incoming Google Lead
export async function POST(request) {
    try {
        const body = await request.json();
        const { google_key, lead_id, user_column_data } = body;

        // Verify google_key if we set one in the integration config (omitted for now)

        console.log(`Received Google Lead: ${lead_id}`);

        // Extract user data
        // Google sends data like: [{ "column_id": "FULL_NAME", "string_value": "John Doe" }, ...]
        const userData = {};
        if (Array.isArray(user_column_data)) {
            user_column_data.forEach(col => {
                userData[col.column_id] = col.string_value;
            });
        }

        const name = userData["FULL_NAME"] || "Google Lead";
        const email = userData["EMAIL"] || userData["user_email"] || null;
        const phone = userData["PHONE_NUMBER"] || userData["user_phone"] || "Unknown";
        const city = userData["CITY"] || userData["POSTAL_CODE"] || "Unknown";
        const note = `Google Lead ID: ${lead_id}. Campaign: ${userData["CAMPAIGN_ID"] || 'N/A'}`;

        await createLeadInDb({
            name,
            phone,
            email,
            city,
            source: "Google Ads",
            category: "surgery/patient",
            notes: note
        });

        // Update stats
        await query(
            `UPDATE lead_integrations 
             SET last_lead_received_at = NOW(), total_leads_received = total_leads_received + 1 
             WHERE provider = 'google'`
        );

        return NextResponse.json({ status: "success" });

    } catch (error) {
        console.error("Error processing text webhook:", error);
        return NextResponse.json({ message: "Internal Error" }, { status: 500 });
    }
}

async function createLeadInDb(leadData) {
    const { name, phone, email, source, city, category, notes } = leadData;

    // Check configuration
    const config = await query("SELECT * FROM lead_integrations WHERE provider = 'google' LIMIT 1");
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
