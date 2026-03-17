import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";

// POST - Check for duplicate leads by phone number
async function handlePost(request, context, user) {
    const body = await request.json();
    const { phoneNumbers } = body;

    if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
        return NextResponse.json({ error: "Phone numbers array is required" }, { status: 400 });
    }

    if (phoneNumbers.length === 0) {
        return NextResponse.json({ existingPhones: [] });
    }

    // Query database for existing leads with these phone numbers
    const placeholders = phoneNumbers.map(() => "?").join(",");
    const sql = `SELECT phone FROM leads WHERE phone IN (${placeholders})`;
    const existingLeads = await query(sql, phoneNumbers);

    // Extract just the phone numbers
    const existingPhones = existingLeads.map((lead) => lead.phone);

    return NextResponse.json({ existingPhones });
}

const handler = withPermission(MODULES.LEADS, {
    POST: handlePost
});

export { handler as POST };
