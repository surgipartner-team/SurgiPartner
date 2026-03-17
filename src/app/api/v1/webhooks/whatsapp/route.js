import { NextResponse } from "next/server";
import { query } from "@/lib/db";

const VERIFY_TOKEN = "surgipartner_wa_token";

// GET - Verification
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        return new NextResponse(challenge, { status: 200 });
    }
    return new NextResponse("Forbidden", { status: 403 });
}

// POST - Messages
export async function POST(request) {
    try {
        const body = await request.json();

        // Basic handling for WhatsApp Cloud API payload
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const messages = value?.messages;

        if (messages && messages.length > 0) {
            const msg = messages[0];
            const from = msg.from; // Phone number
            const text = msg.text?.body;
            const name = value?.contacts?.[0]?.profile?.name || "WhatsApp User";

            console.log(`WhatsApp message from ${from}: ${text}`);

            await createLeadInDb({
                name,
                phone: from,
                email: null,
                city: "Unknown",
                source: "WhatsApp",
                category: "surgery/patient",
                notes: `Message: ${text}`
            });

            // Update stats
            await query(
                `UPDATE lead_integrations 
                 SET last_lead_received_at = NOW(), total_leads_received = total_leads_received + 1 
                 WHERE provider = 'whatsapp'`
            );
        }

        return NextResponse.json({ status: "received" });
    } catch (error) {
        console.error("Error processing WA webhook:", error);
        return NextResponse.json({ message: "Error" }, { status: 500 });
    }
}

async function createLeadInDb(leadData) {
    const { name, phone, email, source, city, category, notes } = leadData;

    const config = await query("SELECT * FROM lead_integrations WHERE provider = 'whatsapp' LIMIT 1");
    let ownerId = null;

    if (config.length && config[0].auto_assign && config[0].default_assignee_id) {
        ownerId = config[0].default_assignee_id;
    } else {
        const admin = await query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (admin.length) ownerId = admin[0].id;
    }

    // Check if lead exists by phone to append note instead?
    // For simplicity, create new for now, or ignore if duplicate check logic exists in main API
    // We'll just insert. Logic for dupes usually handles 
    try {
        const sql = `
            INSERT INTO leads(
                name, phone, email, city, source, status, category,
                owner_id, notes, created_at, updated_at
            ) VALUES(?, ?, ?, ?, ?, 'new', ?, ?, ?, NOW(), NOW())
        `;

        await query(sql, [
            name, phone, email, city, source, category, ownerId, notes
        ]);
    } catch (e) {
        console.error("Insert error (likely duplicate)", e);
    }
}
