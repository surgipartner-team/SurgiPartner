import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";

// GET - Fetch outstanding amounts grouped by customer (hospital/patient name)
async function handleGet(request, context) {
    try {
        // Get outstanding amounts grouped by customer_name from invoices
        // This shows who (hospital/patient) owes the most money
        const hospitals = await query(`
            SELECT 
                customer_name as hospital_name,
                SUM(total_amount - paid_amount) as outstanding,
                COUNT(*) as case_count
            FROM invoices
            WHERE payment_status IN ('pending', 'partial', 'overdue')
            AND (total_amount - paid_amount) > 0
            GROUP BY customer_name
            ORDER BY outstanding DESC
            LIMIT 10
        `);

        return NextResponse.json({
            hospitals: hospitals.map(h => ({
                hospital_name: h.hospital_name || 'Unknown',
                outstanding: parseFloat(h.outstanding) || 0,
                case_count: parseInt(h.case_count) || 0
            }))
        }, { status: 200 });

    } catch (error) {
        console.error("Error fetching hospital outstanding:", error);
        return NextResponse.json(
            { message: "Internal server error", error: error.message },
            { status: 500 }
        );
    }
}

// Apply permission middleware - requires finance view permission
const handler = withPermission(MODULES.FINANCE, {
    GET: handleGet
});

export const GET = handler;
