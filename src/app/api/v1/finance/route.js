import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";

// GET - Fetch finance overview data from invoices (matches /api/admin/finance)
async function handleGet(request, context, user) {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "this_month";
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Calculate date range based on period
    let dateFilter = "";
    const now = new Date();

    if (period === "today") {
        dateFilter = `AND DATE(created_at) = CURDATE()`;
    } else if (period === "this_week") {
        dateFilter = `AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;
    } else if (period === "this_month") {
        dateFilter = `AND MONTH(created_at) = ${now.getMonth() + 1} AND YEAR(created_at) = ${now.getFullYear()}`;
    } else if (period === "this_year") {
        dateFilter = `AND YEAR(created_at) = ${now.getFullYear()}`;
    }

    // Get invoices with financial data
    let sql = `
        SELECT 
            id as case_id,
            invoice_number as case_number,
            customer_name as patient_name,
            customer_phone as patient_phone,
            category as surgery_type,
            total_amount,
            paid_amount,
            (total_amount - paid_amount) as outstanding,
            payment_status,
            bill_date,
            due_date,
            created_at
        FROM invoices
        WHERE 1=1
        ${dateFilter}
    `;

    const params = [];

    if (status && status !== 'all') {
        sql += ` AND payment_status = ?`;
        params.push(status);
    }

    if (search) {
        sql += ` AND (customer_name LIKE ? OR invoice_number LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY created_at DESC`;

    const cases = await query(sql, params);

    // Calculate overall stats (with date filter)
    const statsResult = await query(`
        SELECT 
            COUNT(*) as total_bills,
            COALESCE(SUM(total_amount), 0) as total_revenue,
            COALESCE(SUM(paid_amount), 0) as total_collected,
            COALESCE(SUM(total_amount - paid_amount), 0) as total_pending,
            SUM(CASE WHEN payment_status = 'overdue' THEN (total_amount - paid_amount) ELSE 0 END) as overdue,
            SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_count,
            SUM(CASE WHEN payment_status = 'partial' THEN 1 ELSE 0 END) as partial_count,
            SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending_count
        FROM invoices
        WHERE 1=1
        ${dateFilter}
    `);

    const statsRow = statsResult[0] || {
        total_bills: 0,
        total_revenue: 0,
        total_collected: 0,
        total_pending: 0,
        overdue: 0,
        paid_count: 0,
        partial_count: 0,
        pending_count: 0
    };

    const collectionRate = parseFloat(statsRow.total_revenue) > 0
        ? ((parseFloat(statsRow.total_collected) / parseFloat(statsRow.total_revenue)) * 100).toFixed(1)
        : 0;

    // Monthly trend (last 6 months) - from invoices
    const monthlyTrend = await query(`
        SELECT 
            DATE_FORMAT(created_at, '%Y-%m') as month,
            DATE_FORMAT(created_at, '%b') as month_name,
            SUM(total_amount) as revenue,
            SUM(paid_amount) as collected
        FROM invoices
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b')
        ORDER BY month ASC
    `);

    // Payment modes distribution - from invoices.payment_history JSON
    let paymentModes = [];
    try {
        paymentModes = await query(`
            SELECT 
                JSON_UNQUOTE(JSON_EXTRACT(payment, '$.method')) as payment_method,
                COUNT(*) as count,
                COALESCE(SUM(CAST(JSON_EXTRACT(payment, '$.amount') AS DECIMAL(12,2))), 0) as total
            FROM invoices,
            JSON_TABLE(payment_history, '$[*]' COLUMNS (payment JSON PATH '$')) as jt
            WHERE payment_history IS NOT NULL AND payment_history != '[]'
            GROUP BY JSON_UNQUOTE(JSON_EXTRACT(payment, '$.method'))
            ORDER BY count DESC
        `);
    } catch (e) {
        // JSON_TABLE might not be supported, return empty array
        paymentModes = [];
    }

    // Outstanding by Hospital removed as per user request

    return NextResponse.json({
        cases,
        stats: {
            total_revenue: parseFloat(statsRow.total_revenue) || 0,
            total_collected: parseFloat(statsRow.total_collected) || 0,
            total_pending: parseFloat(statsRow.total_pending) || 0,
            overdue: parseFloat(statsRow.overdue) || 0,
            collection_rate: collectionRate,
            case_count: parseInt(statsRow.total_bills) || 0
        },
        statusBreakdown: {
            paid: parseInt(statsRow.paid_count) || 0,
            partial: parseInt(statsRow.partial_count) || 0,
            pending: parseInt(statsRow.pending_count) || 0
        },
        paymentModes,
        monthlyTrend
    });
}

const handler = withPermission(MODULES.FINANCE, {
    GET: handleGet
});

export { handler as GET };
