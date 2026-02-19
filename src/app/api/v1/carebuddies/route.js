import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";

// GET - Fetch carebuddies (for dropdown selection in patient forms)
async function handleGet(request, context, user) {
    try {
        const carebuddies = await query(`
            SELECT 
                id,
                username,
                email
            FROM users
            WHERE role = 'carebuddy' AND is_active = 1
            ORDER BY username ASC
        `);

        return NextResponse.json({
            carebuddies: carebuddies
        }, { status: 200 });
    } catch (error) {
        console.error("Error fetching carebuddies:", error);
        return NextResponse.json(
            { message: "Internal server error", error: error.message },
            { status: 500 }
        );
    }
}

// Apply permission middleware - requires patients view permission (not users)
const handler = withPermission(MODULES.PATIENTS, {
    GET: handleGet
});

export const GET = handler;
