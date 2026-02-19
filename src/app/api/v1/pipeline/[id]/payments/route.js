import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";

// Helper to generate invoice number
const generateInvoiceNumber = async () => {
    const result = await query("SELECT invoice_number FROM invoices ORDER BY id DESC LIMIT 1");
    if (result.length === 0) return "INV-2024-001";
    const lastNumber = result[0].invoice_number;
    const match = lastNumber.match(/INV-(\d{4})-(\d{3})/);
    if (match) {
        const year = new Date().getFullYear();
        const nextNum = parseInt(match[2]) + 1;
        return `INV-${year}-${String(nextNum).padStart(3, '0')}`;
    }
    return `INV-${new Date().getFullYear()}-001`;
};

// GET - Fetch payments for a pipeline case
async function handleGet(request, context, user) {
    const { id } = await context.params;

    // Get surgery case and invoice
    const surgeryCase = await query(`SELECT * FROM patient_surgeries WHERE id = ?`, [id]);
    if (surgeryCase.length === 0) {
        return NextResponse.json({ message: "Case not found" }, { status: 404 });
    }

    // Try to find invoice by surgery_case_id first
    let invoice = await query(`SELECT * FROM invoices WHERE surgery_case_id = ?`, [id]);
    
    // If not found, try to find by patient identifiers from the surgery case
    if (invoice.length === 0) {
        const caseInfo = await query(
            `SELECT ps.*, p.phone, p.email, p.patient_id 
             FROM patient_surgeries ps 
             JOIN patients p ON ps.patient_id = p.id 
             WHERE ps.id = ?`, 
            [id]
        );
        
        if (caseInfo.length > 0) {
            invoice = await query(
                `SELECT * FROM invoices 
                 WHERE category = 'Surgery' 
                 AND (customer_phone = ? OR customer_email = ? OR uhid = ?)
                 ORDER BY created_at DESC LIMIT 1`,
                [caseInfo[0].phone, caseInfo[0].email, caseInfo[0].patient_id]
            );
        }
    }

    let payments = [];
    let total_paid = 0;
    let total_amount = 0;

    if (invoice.length > 0) {
        // Use invoice total_amount instead of estimated_cost to match billing page
        total_amount = parseFloat(invoice[0].total_amount) || 0;
        total_paid = parseFloat(invoice[0].paid_amount) || 0;

        const paymentHistory = invoice[0].payment_history;
        if (paymentHistory) {
            try {
                const parsed = typeof paymentHistory === 'string' ? JSON.parse(paymentHistory) : paymentHistory;
                payments = parsed.map((p, index) => ({
                    id: index + 1,
                    amount: p.amount,
                    payment_date: p.date,
                    payment_method: p.method,
                    transaction_id: p.reference,
                    notes: p.notes || '',
                    payment_status: 'completed'
                }));
            } catch (e) { payments = []; }
        }
    } else {
        // If no invoice exists yet, fall back to estimated_cost
        total_amount = parseFloat(surgeryCase[0].estimated_cost) || 0;
    }

    return NextResponse.json({
        payments,
        summary: { total_amount, total_paid, balance: total_amount - total_paid }
    });
}

// POST - Record payment for a pipeline case
async function handlePost(request, context, user) {
    const { id } = await context.params;
    const body = await request.json();
    const { amount, payment_date, payment_method, transaction_id, notes } = body;

    if (!amount || !payment_date || !payment_method) {
        return NextResponse.json({ message: "Amount, payment date, and payment method are required" }, { status: 400 });
    }

    const surgeryCase = await query(`SELECT ps.*, p.first_name, p.last_name, p.phone, p.email 
        FROM patient_surgeries ps 
        JOIN patients p ON ps.patient_id = p.id 
        WHERE ps.id = ?`, [id]);

    if (surgeryCase.length === 0) {
        return NextResponse.json({ message: "Case not found" }, { status: 404 });
    }

    const caseInfo = surgeryCase[0];
    const customerName = `${caseInfo.first_name} ${caseInfo.last_name}`.trim();
    const estimated_cost = parseFloat(caseInfo.estimated_cost) || 0;

    // Try to find invoice by surgery_case_id first
    let invoice = await query(`SELECT * FROM invoices WHERE surgery_case_id = ?`, [id]);
    
    // If not found, try to find by patient identifiers
    if (invoice.length === 0) {
        invoice = await query(
            `SELECT * FROM invoices 
             WHERE category = 'Surgery' 
             AND (customer_phone = ? OR customer_email = ? OR uhid = ?)
             ORDER BY created_at DESC LIMIT 1`,
            [caseInfo.phone, caseInfo.email, caseInfo.patient_id]
        );
    }

    const newPayment = {
        date: payment_date,
        amount: parseFloat(amount),
        method: payment_method,
        reference: transaction_id || null,
        notes: notes || null
    };

    if (invoice.length === 0) {
        const invoiceNumber = await generateInvoiceNumber();
        const paidAmount = parseFloat(amount);
        
        // Use estimated_cost as total_amount for new invoices
        // This will be the base amount before any tax/discount calculations
        const status = paidAmount >= estimated_cost ? 'paid' : (paidAmount > 0 ? 'partial' : 'pending');

        await query(
            `INSERT INTO invoices 
             (invoice_number, category, customer_type, customer_name, customer_phone, customer_email,
              bill_date, due_date, subtotal, total_amount, paid_amount, payment_status, payment_history, 
              surgery_case_id, created_by)
             VALUES (?, 'Surgery', 'Patient', ?, ?, ?, ?, DATE_ADD(?, INTERVAL 30 DAY), ?, ?, ?, ?, ?, ?, ?)`,
            [invoiceNumber, customerName, caseInfo.phone, caseInfo.email, payment_date, payment_date,
                estimated_cost, estimated_cost, paidAmount, status, JSON.stringify([newPayment]), id, user.id]
        );
    } else {
        const existingInvoice = invoice[0];
        let paymentHistory = [];
        try {
            paymentHistory = existingInvoice.payment_history
                ? (typeof existingInvoice.payment_history === 'string'
                    ? JSON.parse(existingInvoice.payment_history) : existingInvoice.payment_history)
                : [];
        } catch (e) { paymentHistory = []; }

        paymentHistory.push(newPayment);
        const newPaidAmount = parseFloat(existingInvoice.paid_amount || 0) + parseFloat(amount);
        const totalAmount = parseFloat(existingInvoice.total_amount) || 0;
        const status = newPaidAmount >= totalAmount ? 'paid' : (newPaidAmount > 0 ? 'partial' : 'pending');

        await query(
            `UPDATE invoices SET paid_amount = ?, payment_status = ?, payment_history = ? WHERE id = ?`,
            [newPaidAmount, status, JSON.stringify(paymentHistory), existingInvoice.id]
        );
    }

    return NextResponse.json({
        message: "Payment recorded successfully",
        payment: { ...newPayment, id: Date.now(), created_by_name: user.username }
    }, { status: 201 });
}

const handler = withPermission(MODULES.PIPELINE, {
    GET: handleGet,
    POST: handlePost
});

export { handler as GET, handler as POST };
