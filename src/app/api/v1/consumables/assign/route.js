import { NextResponse } from "next/server";
import { query, getConnection } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";

// POST - Assign consumable to hospital
async function handlePost(request, context, user) {
    const body = await request.json();
    const { hospital_id, consumable_id, quantity, selling_price, assigned_date } = body;

    if (!hospital_id || !consumable_id || !quantity || !selling_price) {
        return NextResponse.json({
            success: false,
            error: 'Missing required fields: hospital_id, consumable_id, quantity, selling_price'
        }, { status: 400 });
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
        return NextResponse.json({ success: false, error: 'Invalid quantity' }, { status: 400 });
    }

    const price = parseFloat(selling_price);

    const pool = await getConnection();
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Check stock
        const [rows] = await connection.execute('SELECT stock_quantity, item_name FROM consumables WHERE id = ? FOR UPDATE', [consumable_id]);
        if (rows.length === 0) {
            throw new Error('Consumable not found');
        }

        const currentStock = rows[0].stock_quantity;
        if (currentStock < qty) {
            throw new Error(`Insufficient stock for ${rows[0].item_name}. Available: ${currentStock}, Requested: ${qty}`);
        }

        // 2. Deduct stock
        await connection.execute('UPDATE consumables SET stock_quantity = stock_quantity - ? WHERE id = ?', [qty, consumable_id]);

        // 3. Create assignment record
        await connection.execute(
            `INSERT INTO hospital_consumables (hospital_id, consumable_id, quantity, selling_price, assigned_date, assigned_by, status) 
             VALUES (?, ?, ?, ?, ?, ?, 'Unbilled')`,
            [hospital_id, consumable_id, qty, price, assigned_date || new Date(), user.id]
        );

        await connection.commit();

        return NextResponse.json({
            success: true,
            message: 'Consumable assigned successfully'
        });

    } catch (error) {
        await connection.rollback();
        return NextResponse.json({
            success: false,
            error: error.message || 'Transaction failed'
        }, { status: 500 });
    } finally {
        connection.release();
    }
}

const handler = withPermission(MODULES.CONSUMABLES, {
    POST: handlePost
});

export { handler as POST };
