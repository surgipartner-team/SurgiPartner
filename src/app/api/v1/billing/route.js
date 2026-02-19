import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";

// GET - Fetch billing/invoices
async function handleGet(request, context, user) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    if (id) {
        const invoices = await query(`
            SELECT i.*, 
                   JSON_OBJECT(
                        'bank_name', h.bank_name,
                        'branch_name', h.branch_name,
                        'ifsc_code', h.ifsc_code,
                        'account_number', h.account_number
                   ) as hospital_bank_details, 
                   h.gst_number as hospital_gst_number, 
                   h.name as hospital_name, 
                   h.address as hospital_address,
                   p.gender as patient_gender,
                   (
                       SELECT COALESCE(hs.name, u.username)
                       FROM patient_surgeries ps
                       LEFT JOIN doctors d ON ps.surgeon_id = d.id
                       LEFT JOIN users u ON d.user_id = u.id
                       LEFT JOIN hospital_surgeons hs ON ps.hospital_surgeon_id = hs.id
                       WHERE ps.patient_id = p.id
                       ORDER BY ps.surgery_date DESC, ps.created_at DESC
                       LIMIT 1
                   ) as surgery_surgeon_db,
                   (
                        SELECT u.username 
                        FROM doctors d
                        JOIN users u ON d.user_id = u.id
                        WHERE d.id = p.primary_doctor_id
                   ) as primary_doctor_db
            FROM invoices i 
            LEFT JOIN hospitals h ON i.hospital_id = h.id 
            LEFT JOIN patients p ON (
                (i.uhid IS NOT NULL AND i.uhid != '' AND i.uhid = p.uhid) 
                OR 
                (i.customer_phone IS NOT NULL AND i.customer_phone != '' AND i.customer_phone = p.phone)
            )
            WHERE i.id = ?`, [id]);

        if (invoices.length > 0) {
            // Priority: Surgery Surgeon > Primary Doctor
            invoices[0].doctor_name_from_db = invoices[0].surgery_surgeon_db || invoices[0].primary_doctor_db;
        }

        if (!invoices.length) {
            return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
        }
        return NextResponse.json({ invoice: invoices[0] });
    }

    let sql = `
        SELECT i.*, 
               JSON_OBJECT(
                    'bank_name', h.bank_name,
                    'branch_name', h.branch_name,
                    'ifsc_code', h.ifsc_code,
                    'account_number', h.account_number
               ) as hospital_bank_details, 
               h.gst_number as hospital_gst_number, 
               h.name as hospital_name, 
               h.address as hospital_address,
               p.gender as patient_gender,
               (
                   SELECT COALESCE(hs.name, u.username)
                   FROM patient_surgeries ps
                   LEFT JOIN doctors d ON ps.surgeon_id = d.id
                   LEFT JOIN users u ON d.user_id = u.id
                   LEFT JOIN hospital_surgeons hs ON ps.hospital_surgeon_id = hs.id
                   WHERE ps.patient_id = p.id
                   ORDER BY ps.surgery_date DESC, ps.created_at DESC
                   LIMIT 1
               ) as surgery_surgeon_db,
               (
                    SELECT u.username 
                    FROM doctors d
                    JOIN users u ON d.user_id = u.id
                    WHERE d.id = p.primary_doctor_id
               ) as primary_doctor_db
        FROM invoices i
        LEFT JOIN hospitals h ON i.hospital_id = h.id
        LEFT JOIN patients p ON (
            (i.uhid IS NOT NULL AND i.uhid != '' AND i.uhid = p.uhid) 
            OR 
            (i.customer_phone IS NOT NULL AND i.customer_phone != '' AND i.customer_phone = p.phone)
        )
        WHERE 1=1
    `;
    const params = [];

    if (category && category !== "all") {
        sql += " AND category = ?";
        params.push(category);
    }

    if (status && status !== "all") {
        sql += " AND payment_status = ?";
        params.push(status);
    }

    if (search) {
        sql += " AND (i.invoice_number LIKE ? OR i.customer_name LIKE ?)";
        const pattern = `%${search}%`;
        params.push(pattern, pattern);
    }

    sql += " ORDER BY created_at DESC";
    const invoices = await query(sql, params);

    // Populate doctor_name_from_db for list items
    invoices.forEach(inv => {
        inv.doctor_name_from_db = inv.surgery_surgeon_db || inv.primary_doctor_db;
    });

    // Get summary stats
    const statsResult = await query(`
        SELECT 
            COUNT(*) as total_bills,
            COALESCE(SUM(total_amount), 0) as total_revenue,
            COALESCE(SUM(paid_amount), 0) as paid_amount,
            COALESCE(SUM(total_amount - paid_amount), 0) as pending_amount,
            SUM(CASE WHEN payment_status = 'overdue' THEN 1 ELSE 0 END) as overdue_count
        FROM invoices
    `);

    const stats = statsResult[0] || {
        total_bills: 0,
        total_revenue: 0,
        paid_amount: 0,
        pending_amount: 0,
        overdue_count: 0
    };

    return NextResponse.json({ invoices, stats });
}

// POST - Create invoice
async function handlePost(request, context, user) {
    const body = await request.json();
    const {
        category,
        customer_type,
        customer_name,
        customer_email,
        customer_phone,
        customer_address,
        due_date,
        line_items,
        tax_percentage,
        discount_percentage,
        tds_percentage,
        notes,
        terms_conditions = "Payment due within 15 days. Late payment charges applicable after due date.",
        uhid,
        ip_number,
        hospital_id, // New field
        dispatch_doc_no,
        dispatch_through,
        destination,
        company_bank_name,
        company_branch_name,
        company_ifsc_code,
        company_account_number
    } = body;

    if (!category || !customer_name || !due_date) {
        return NextResponse.json(
            { message: "Missing required fields: category, customer_name, due_date" },
            { status: 400 }
        );
    }

    const year = new Date().getFullYear();
    const lastInvoiceResult = await query(
        `SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1`,
        [`INV-${year}-%`]
    );

    let nextCount = 1;
    if (lastInvoiceResult.length > 0) {
        const lastInvoiceNumber = lastInvoiceResult[0].invoice_number;
        const parts = lastInvoiceNumber.split('-');
        if (parts.length === 3) {
            const lastCount = parseInt(parts[2], 10);
            if (!isNaN(lastCount)) {
                nextCount = lastCount + 1;
            }
        }
    }

    const invoice_number = `INV-${year}-${String(nextCount).padStart(3, '0')}`;

    // Helper to safely parse float
    const safeFloat = (val, defaultVal = 0) => {
        if (val === '' || val === null || val === undefined) return defaultVal;
        return Number(val);
    };

    const finalTaxPercentage = safeFloat(tax_percentage, 18);
    const finalDiscountPercentage = safeFloat(discount_percentage, 0);
    const finalTdsPercentage = safeFloat(tds_percentage, 0);

    // Calculate totals
    const items = Array.isArray(line_items) ? line_items : [];
    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0);

    // Recalculate based on Requested Logic: TDS Deducted First
    // 1. Discount
    const discount_amt = (subtotal * finalDiscountPercentage) / 100;
    const amount_after_disc = subtotal - discount_amt;
    // 2. TDS
    const tds_amt = (amount_after_disc * finalTdsPercentage) / 100;
    const net_taxable = amount_after_disc - tds_amt;
    // 3. GST
    const tax_amt = (net_taxable * finalTaxPercentage) / 100;
    // 4. Total
    const final_total = net_taxable + tax_amt;

    // Overwrite standard calc variables with new logic values for DB
    // We keep variable names consistent with DB columns
    const db_discount_amount = discount_amt;
    const db_tax_amount = tax_amt;
    const db_tds_amount = tds_amt;
    const db_total_amount = final_total;

    const sql = `
        INSERT INTO invoices (
            invoice_number, category, customer_type, customer_name, customer_email,
            customer_phone, customer_address, bill_date, due_date, line_items,
            subtotal, tax_percentage, tax_amount, discount_percentage, discount_amount,
            tds_percentage, tds_amount, uhid, ip_number, hospital_id,
            total_amount, paid_amount, payment_status, notes, terms_conditions, 
            dispatch_doc_no, dispatch_through, destination, 
            company_bank_name, company_branch_name, company_ifsc_code, company_account_number,
            created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) `;

    const result = await query(sql, [
        invoice_number,
        category,
        customer_type || 'patient',
        customer_name,
        customer_email || null,
        customer_phone || null,
        customer_address || null,
        due_date,
        JSON.stringify(items),
        subtotal,
        finalTaxPercentage,
        db_tax_amount,
        finalDiscountPercentage,
        db_discount_amount,
        finalTdsPercentage,
        db_tds_amount,
        uhid || null,
        ip_number || null,
        hospital_id || null,
        db_total_amount,
        notes || null,
        terms_conditions,
        dispatch_doc_no || null,
        dispatch_through || null,
        destination || null,
        company_bank_name || null,
        company_branch_name || null,
        company_ifsc_code || null,
        company_account_number || null,
        user.id
    ]);

    // Update statuses if IDs provided
    const { consumable_ids, machine_ids } = body;

    if (consumable_ids && Array.isArray(consumable_ids) && consumable_ids.length > 0) {
        // status = 'Billed' for hospital_consumables
        const placeholders = consumable_ids.map(() => '?').join(',');
        await query(`UPDATE hospital_consumables SET status = 'Billed' WHERE id IN (${placeholders})`, consumable_ids);
    }

    if (machine_ids && Array.isArray(machine_ids) && machine_ids.length > 0) {
        // billing_status = 'Billed' for machines
        const placeholders = machine_ids.map(() => '?').join(',');
        await query(`UPDATE machines SET billing_status = 'Billed' WHERE id IN (${placeholders})`, machine_ids);
    }

    return NextResponse.json({
        message: "Invoice created successfully",
        invoice_id: result.insertId,
        invoice_number
    }, { status: 201 });
}

// PUT - Update invoice
async function handlePut(request, context, user) {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
        return NextResponse.json({ message: "Invoice ID is required" }, { status: 400 });
    }

    const existing = await query("SELECT * FROM invoices WHERE id = ?", [id]);
    if (!existing.length) {
        return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
    }

    const fields = Object.keys(updates);
    if (fields.length === 0) {
        return NextResponse.json({ message: "No fields to update" }, { status: 400 });
    }

    // RECALCULATION LOGIC FOR UPDATE
    // If any calculation-affecting field is updated, we must recalculate totals
    const calcFields = ['line_items', 'tax_percentage', 'discount_percentage', 'tds_percentage'];
    const needsRecalc = fields.some(f => calcFields.includes(f));

    if (needsRecalc) {
        // Merge current updates with existing values to calculate new totals
        const merged = { ...existing[0], ...updates };

        let subtotal = Number(merged.subtotal);
        if (updates.line_items) {
            const items = typeof updates.line_items === 'string' ? JSON.parse(updates.line_items) : updates.line_items;
            if (Array.isArray(items)) {
                subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0);
            }
        }

        const finalTaxPercentage = Number(merged.tax_percentage || 0);
        const finalDiscountPercentage = Number(merged.discount_percentage || 0);
        const finalTdsPercentage = Number(merged.tds_percentage || 0);

        // 1. Discount
        const discount_amt = (subtotal * finalDiscountPercentage) / 100;
        const amount_after_disc = subtotal - discount_amt;
        // 2. TDS
        const tds_amt = (amount_after_disc * finalTdsPercentage) / 100;
        const net_taxable = amount_after_disc - tds_amt;
        // 3. GST
        const tax_amt = (net_taxable * finalTaxPercentage) / 100;
        // 4. Total
        const final_total = net_taxable + tax_amt;

        // Add calculated fields to updates
        updates.subtotal = subtotal;
        updates.tax_amount = tax_amt;
        updates.discount_amount = discount_amt;
        updates.tds_amount = tds_amt;
        updates.total_amount = final_total;
    }

    // Generate SET clause for ALL fields (user updates + calculated updates)
    const finalFields = Object.keys(updates);
    const setClause = finalFields.map(f => `${f} = ?`).join(", ");

    // Sanitize values
    const values = [...finalFields.map(f => {
        const val = updates[f];
        const numericFields = ['tax_percentage', 'discount_percentage', 'subtotal', 'tax_amount', 'discount_amount', 'total_amount', 'paid_amount', 'tds_percentage', 'tds_amount'];
        if (numericFields.includes(f)) {
            if (val === '' || val === null || val === undefined) return 0;
        }
        return val;
    }), id];

    await query(`UPDATE invoices SET ${setClause}, updated_at = NOW() WHERE id = ?`, values);

    const updated = await query("SELECT * FROM invoices WHERE id = ?", [id]);

    return NextResponse.json({ message: "Invoice updated successfully", invoice: updated[0] });
}

// DELETE - Delete invoice
async function handleDelete(request, context, user) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ message: "Invoice ID is required" }, { status: 400 });
    }

    try {
        // 1. Get the invoice to find linked items
        const invoiceResult = await query("SELECT line_items FROM invoices WHERE id = ?", [id]);

        if (invoiceResult.length > 0) {
            const invoice = invoiceResult[0];
            let lineItems = [];

            // Parse line_items safely
            try {
                lineItems = typeof invoice.line_items === 'string'
                    ? JSON.parse(invoice.line_items)
                    : invoice.line_items || [];
            } catch (e) {
                console.error("Error parsing line_items for restoration:", e);
            }

            // 2. Extract IDs
            const hospitalConsumableIds = lineItems
                .filter(item => item.hospital_consumable_id)
                .map(item => item.hospital_consumable_id);

            const machineIds = lineItems
                .filter(item => item.machine_id)
                .map(item => item.machine_id);

            // 3. Restore Statuses to 'Unbilled'
            if (hospitalConsumableIds.length > 0) {
                const placeholders = hospitalConsumableIds.map(() => '?').join(',');
                await query(
                    `UPDATE hospital_consumables SET status = 'Unbilled' WHERE id IN (${placeholders})`,
                    hospitalConsumableIds
                );
            }

            if (machineIds.length > 0) {
                const placeholders = machineIds.map(() => '?').join(',');
                await query(
                    `UPDATE machines SET billing_status = 'Unbilled' WHERE id IN (${placeholders})`,
                    machineIds
                );
            }
        }

        // 4. Delete the invoice
        await query("DELETE FROM invoices WHERE id = ?", [id]);

        return NextResponse.json({ message: "Invoice deleted and items restored successfully" });
    } catch (error) {
        console.error("Delete error:", error);
        return NextResponse.json({ message: "Error deleting invoice", error: error.message }, { status: 500 });
    }
}

const handler = withPermission(MODULES.BILLING, {
    GET: handleGet,
    POST: handlePost,
    PUT: handlePut,
    DELETE: handleDelete
});

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
