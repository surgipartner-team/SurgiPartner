import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import axios from "axios";

const VERIFY_TOKEN = "surgipartner_fb_verification_token"; // Same as in guide
const GRAPH_API_VERSION = "v18.0";

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

                    console.log(`Received lead ${leadgenId} from page ${pageId}`);

                    // Fetch lead details from Facebook Graph API
                    await processLead(leadgenId, pageId);
                }
            }
        }

        // Update integration stats
        await query(
            `UPDATE lead_integrations 
             SET last_lead_received_at = NOW(), total_leads_received = total_leads_received + ? 
             WHERE provider = 'facebook'`,
            [entries.length]
        );

        return new NextResponse("Event Received", { status: 200 });

    } catch (error) {
        console.error("Error processing webhook:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

async function processLead(leadId, pageId) {
    // 1. Get Page Access Token (We need to store this securely, for now assume env or config)
    // For simplicity in this demo, let's assume we have a valid token
    // In production, you'd fetch the System User token or Page Token from DB

    // NOTE: Requires a valid PAGE_ACCESS_TOKEN. 
    // Since we don't have one yet, this part usually fails in dev without real setup.
    // We will simulate lead creation if we can't fetch real data, or just log.

    // For now, let's just log that we would fetch:
    // https://graph.facebook.com/v18.0/{leadId}?access_token={PAGE_ACCESS_TOKEN}

    try {
        // DUMMY IMPLEMENTATION FOR MOCKING:
        // Create a dummy lead in our DB to show it works

        await createLeadInDb({
            name: "Facebook User",
            phone: "0000000000",
            email: "fb_lead@example.com",
            source: "Facebook Lead Ads",
            city: "Unknown",
            category: "surgery/patient",
            notes: `Imported from Facebook Lead ID: ${leadId}`
        });

    } catch (err) {
        console.error("Failed to process lead:", err);
    }
}

async function createLeadInDb(leadData) {
    const { name, phone, email, source, city, category, notes } = leadData;

    // Check configuration for auto-assign
    const config = await query("SELECT * FROM lead_integrations WHERE provider = 'facebook' LIMIT 1");
    let ownerId = null;

    if (config.length && config[0].auto_assign && config[0].default_assignee_id) {
        ownerId = config[0].default_assignee_id;
    } else {
        // Fallback to first admin or leave null
        const admin = await query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (admin.length) ownerId = admin[0].id;
    }

    // Insert Lead
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
