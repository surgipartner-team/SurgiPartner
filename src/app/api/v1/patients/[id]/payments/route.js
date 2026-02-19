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

// GET - Fetch payment history and summary from invoices
async function handleGet(request, context, user) {
    const { id: patientId } = await context.params;

    const patientData = await query(
        `SELECT id, first_name, last_name, phone, email, patient_id FROM patients WHERE id = ?`,
        [patientId]
    );

    if (patientData.length === 0) {
        return NextResponse.json({ message: "Patient not found" }, { status: 404 });
    }

    const surgeryCase = await query(
        `SELECT id, estimated_cost FROM patient_surgeries WHERE patient_id = ? ORDER BY id DESC LIMIT 1`,
        [patientId]
    );

    let payments = [];
    let total_paid = 0;
    let total_amount = 0;

    if (surgeryCase.length > 0) {
        // Try to find invoice by surgery_case_id first
        let invoice = await query(`SELECT * FROM invoices WHERE surgery_case_id = ?`, [surgeryCase[0].id]);
        
        // If not found, try to find by patient identifiers (phone, email, or UHID)
        if (invoice.length === 0) {
            const patient = patientData[0];
            invoice = await query(
                `SELECT * FROM invoices 
                 WHERE category = 'Surgery' 
                 AND (customer_phone = ? OR customer_email = ? OR uhid = ?)
                 ORDER BY created_at DESC LIMIT 1`,
                [patient.phone, patient.email, patient.patient_id]
            );
        }

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
                        payment_status: 'completed',
                        created_by_name: null
                    }));
                } catch (e) {
                    payments = [];
                }
            }
        } else {
            // If no invoice exists yet, fall back to estimated_cost
            total_amount = parseFloat(surgeryCase[0].estimated_cost) || 0;
        }
    }

    return NextResponse.json({
        payments,
        summary: { total_amount, total_paid, balance: total_amount - total_paid }
    });
}

// POST - Record new payment
async function handlePost(request, context, user) {
    const { id: patientId } = await context.params;
    const body = await request.json();
    const { amount, payment_date, payment_method, transaction_id, notes } = body;

    if (!amount || !payment_date || !payment_method) {
        return NextResponse.json({ message: "Amount, payment date, and payment method are required" }, { status: 400 });
    }

    const patientData = await query(`SELECT * FROM patients WHERE id = ?`, [patientId]);
    if (patientData.length === 0) {
        return NextResponse.json({ message: "Patient not found" }, { status: 404 });
    }

    const patient = patientData[0];
    const customerName = `${patient.first_name} ${patient.last_name}`.trim();

    const surgeryCase = await query(
        `SELECT id, estimated_cost FROM patient_surgeries WHERE patient_id = ? ORDER BY id DESC LIMIT 1`,
        [patientId]
    );

    if (surgeryCase.length === 0) {
        return NextResponse.json({ message: "No surgery case found for this patient" }, { status: 404 });
    }

    const surgeryCaseId = surgeryCase[0].id;
    const estimated_cost = parseFloat(surgeryCase[0].estimated_cost) || 0;

    // Try to find invoice by surgery_case_id first
    let invoice = await query(`SELECT * FROM invoices WHERE surgery_case_id = ?`, [surgeryCaseId]);
    
    // If not found, try to find by patient identifiers (phone, email, or UHID)
    if (invoice.length === 0) {
        invoice = await query(
            `SELECT * FROM invoices 
             WHERE category = 'Surgery' 
             AND (customer_phone = ? OR customer_email = ? OR uhid = ?)
             ORDER BY created_at DESC LIMIT 1`,
            [patient.phone, patient.email, patient.patient_id]
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
        const paymentHistory = JSON.stringify([newPayment]);
        const paidAmount = parseFloat(amount);
        
        // Use estimated_cost as total_amount for new invoices
        // This will be the base amount before any tax/discount calculations
        const invoicePaymentStatus = paidAmount >= estimated_cost ? 'paid' : (paidAmount > 0 ? 'partial' : 'pending');

        await query(
            `INSERT INTO invoices 
             (invoice_number, category, customer_type, customer_name, customer_phone, customer_email,
              bill_date, due_date, subtotal, total_amount, paid_amount, payment_status, payment_history, 
              surgery_case_id, created_by)
             VALUES (?, 'Surgery', 'Patient', ?, ?, ?, ?, DATE_ADD(?, INTERVAL 30 DAY), ?, ?, ?, ?, ?, ?, ?)`,
            [invoiceNumber, customerName, patient.phone, patient.email, payment_date, payment_date,
                estimated_cost, estimated_cost, paidAmount, invoicePaymentStatus, paymentHistory, surgeryCaseId, user.id]
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
        const invoicePaymentStatus = newPaidAmount >= totalAmount ? 'paid' : (newPaidAmount > 0 ? 'partial' : 'pending');

        await query(
            `UPDATE invoices SET paid_amount = ?, payment_status = ?, payment_history = ? WHERE id = ?`,
            [newPaidAmount, invoicePaymentStatus, JSON.stringify(paymentHistory), existingInvoice.id]
        );
    }

    return NextResponse.json({
        message: "Payment recorded successfully",
        payment: { id: Date.now(), amount: parseFloat(amount), payment_date, payment_method, transaction_id, notes, payment_status: 'completed', created_by_name: user.username }
    }, { status: 201 });
}

const handler = withPermission(MODULES.PATIENTS, {
    GET: handleGet,
    POST: handlePost
});

export { handler as GET, handler as POST };
