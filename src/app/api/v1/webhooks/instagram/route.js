import { NextResponse } from "next/server";
import { query } from "@/lib/db";

const VERIFY_TOKEN = "surgipartner_fb_verification_token"; // Same token typical for Meta Apps

// GET - Verification Challenge
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode && token) {
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            console.log("WEBHOOK_VERIFIED");
            return new NextResponse(challenge, { status: 200 });
        } else {
            return new NextResponse("Forbidden", { status: 403 });
        }
    }

    return new NextResponse("Bad Request", { status: 400 });
}

// POST - Incoming Lead Data
export async function POST(request) {
    try {
        const body = await request.json();
        const entries = body.entry || [];

        for (const entry of entries) {
            const changes = entry.changes || [];
            for (const change of changes) {
                if (change.field === "leadgen") {
                    const leadgenId = change.value.leadgen_id;
                    const pageId = change.value.page_id;
                    const formId = change.value.form_id;

                    console.log(`Received Instagram lead ${leadgenId} from page ${pageId}`);

                    // Fetch lead details from Graph API (Mocked here)
                    await processLead(leadgenId, pageId);
                }
            }
        }

        // Update integration stats
        await query(
            `UPDATE lead_integrations 
             SET last_lead_received_at = NOW(), total_leads_received = total_leads_received + ? 
             WHERE provider = 'instagram'`,
            [entries.length]
        );

        return new NextResponse("Event Received", { status: 200 });

    } catch (error) {
        console.error("Error processing webhook:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

async function processLead(leadId, pageId) {
    try {
        // DUMMY IMPLEMENTATION FOR MOCKING:
        await createLeadInDb({
            name: "Instagram User",
            phone: "0000000000",
            email: "insta_lead@example.com",
            source: "Instagram Lead Ads",
            city: "Unknown",
            category: "surgery/patient",
            notes: `Imported from Instagram Lead ID: ${leadId}`
        });

    } catch (err) {
        console.error("Failed to process lead:", err);
    }
}

async function createLeadInDb(leadData) {
    const { name, phone, email, source, city, category, notes } = leadData;

    // Check configuration for auto-assign
    const config = await query("SELECT * FROM lead_integrations WHERE provider = 'instagram' LIMIT 1");
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
