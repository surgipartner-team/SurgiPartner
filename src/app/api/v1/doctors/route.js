import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";

// GET - Fetch doctors
async function handleGet(request, context, user) {
    try {
        const doctors = await query(`
            SELECT 
                d.id,
                d.user_id,
                d.specialization,
                d.license_number,
                d.primary_hospital_id,
                u.username as name,
                u.email,
                h.name as hospital_name
            FROM doctors d
            LEFT JOIN users u ON d.user_id = u.id
            LEFT JOIN hospitals h ON d.primary_hospital_id = h.id
            WHERE d.is_active = 1
            ORDER BY u.username ASC
        `);

        return NextResponse.json({
            doctors: doctors
        }, { status: 200 });
    } catch (error) {
        console.error("Error fetching doctors:", error);
        return NextResponse.json(
            { message: "Internal server error", error: error.message },
            { status: 500 }
        );
    }
}

// Apply permission middleware - requires patients view permission
const handler = withPermission(MODULES.PATIENTS, {
    GET: handleGet
});

export const GET = handler;
