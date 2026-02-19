import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";

async function handleGet(request) {
    try {
        const integrations = await query(
            `SELECT id, provider, name, is_active, last_lead_received_at, total_leads_received, auto_assign 
             FROM lead_integrations`
        );

        // Enhance with constructed Webhook URLs based on env
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://api.surgipartner.com";

        const enhancedIntegrations = integrations.map(integ => ({
            ...integ,
            webhook_url: `${baseUrl}/api/v1/webhooks/${integ.provider}`
        }));

        return NextResponse.json({ integrations: enhancedIntegrations });
    } catch (error) {
        console.error("Error fetching integrations:", error);
        return NextResponse.json({ message: "Failed to fetch integrations" }, { status: 500 });
    }
}

async function handlePut(request) {
    try {
        const body = await request.json();
        const { id, is_active, auto_assign } = body;

        const updates = [];
        const values = [];

        if (typeof is_active !== 'undefined') {
            updates.push('is_active = ?');
            values.push(is_active);
        }

        if (typeof auto_assign !== 'undefined') {
            updates.push('auto_assign = ?');
            values.push(auto_assign);
        }

        if (updates.length > 0) {
            values.push(id);
            await query(`UPDATE lead_integrations SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        return NextResponse.json({ message: "Integration updated successfully" });

    } catch (error) {
        console.error("Error updating integration:", error);
        return NextResponse.json({ message: "Failed to update integration" }, { status: 500 });
    }
}

// Protect with admin or leads permissions
// For now, assume generic access or add specific permission check if needed
export const GET = handleGet;
export const PUT = handlePut;
