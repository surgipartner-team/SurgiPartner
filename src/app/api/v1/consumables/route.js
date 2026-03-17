import { NextResponse } from "next/server";
import { query, getConnection } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";

// GET - Fetch consumables (mirrors /api/admin/consumables)
async function handleGet(request, context, user) {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let sql = 'SELECT * FROM consumables WHERE 1=1';
    const params = [];

    if (category && category !== 'all') {
        sql += ' AND category = ?';
        params.push(category);
    }

    if (status && status !== 'all') {
        sql += ' AND status = ?';
        params.push(status);
    }

    if (search) {
        sql += ' AND (item_name LIKE ? OR sku LIKE ? OR manufacturer LIKE ?)';
        const pattern = `%${search}%`;
        params.push(pattern, pattern, pattern);
    }

    sql += ' ORDER BY created_at DESC';
    const consumables = await query(sql, params);

    // Calculate stats
    const statsResult = await query(`
        SELECT 
            COUNT(*) as total,
            SUM(stock_quantity * unit_price) as total_value,
            SUM(CASE WHEN status = 'Low Stock' THEN 1 ELSE 0 END) as low_stock_count,
            SUM(CASE WHEN status = 'Out of Stock' THEN 1 ELSE 0 END) as out_of_stock_count,
            SUM(CASE WHEN status = 'In Stock' THEN 1 ELSE 0 END) as in_stock_count
        FROM consumables
    `);

    return NextResponse.json({
        success: true,
        consumables,
        stats: statsResult[0] || {}
    });
}

// POST - Create consumable
async function handlePost(request, context, user) {
    const body = await request.json();
    const {
        item_name, category, manufacturer, sku, unit, unit_price,
        stock_quantity, reorder_level, monthly_usage, expiry_date,
        batch_number, storage_location, description, suppliers, image_url
    } = body;

    if (!item_name || !category || !sku || !unit) {
        return NextResponse.json({
            success: false,
            error: 'Missing required fields: item_name, category, sku, unit'
        }, { status: 400 });
    }

    const pool = await getConnection();
    const [result] = await pool.execute(
        `INSERT INTO consumables (
            item_name, category, manufacturer, sku, unit, unit_price,
            stock_quantity, reorder_level, monthly_usage, expiry_date,
            batch_number, storage_location, description, suppliers, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            item_name, category, manufacturer || null, sku, unit,
            unit_price || 0, stock_quantity || 0, reorder_level || 10,
            monthly_usage || 0, expiry_date || null, batch_number || null,
            storage_location || null, description || null, suppliers || null,
            image_url || null
        ]
    );

    const newConsumable = await query('SELECT * FROM consumables WHERE id = ?', [result.insertId]);

    return NextResponse.json({
        success: true,
        message: 'Consumable added successfully',
        consumable: newConsumable[0]
    }, { status: 201 });
}

// PUT - Update consumable
async function handlePut(request, context, user) {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
        return NextResponse.json({ success: false, error: 'Consumable ID is required' }, { status: 400 });
    }

    // Build dynamic update query
    // NOTE: 'status' is intentionally excluded — it's a GENERATED ALWAYS column
    // computed automatically by MySQL from stock_quantity vs reorder_level.
    const allowedFields = [
        'item_name', 'category', 'manufacturer', 'sku', 'unit', 'unit_price',
        'stock_quantity', 'reorder_level', 'monthly_usage', 'expiry_date',
        'batch_number', 'storage_location', 'description', 'suppliers', 'image_url'
    ];

    const updateFields = [];
    const updateValues = [];

    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            updateFields.push(`${field} = ?`);
            updateValues.push(updates[field] === '' ? null : updates[field]);
        }
    }

    if (updateFields.length === 0) {
        return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    updateValues.push(id);
    const pool = await getConnection();
    await pool.execute(
        `UPDATE consumables SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
    );

    const updatedConsumable = await query('SELECT * FROM consumables WHERE id = ?', [id]);

    return NextResponse.json({
        success: true,
        message: 'Consumable updated successfully',
        consumable: updatedConsumable[0]
    });
}

// DELETE - Delete consumable
async function handleDelete(request, context, user) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ success: false, error: 'Consumable ID is required' }, { status: 400 });
    }

    await query("DELETE FROM consumables WHERE id = ?", [id]);

    return NextResponse.json({
        success: true,
        message: 'Consumable deleted successfully'
    });
}

const handler = withPermission(MODULES.CONSUMABLES, {
    GET: handleGet,
    POST: handlePost,
    PUT: handlePut,
    DELETE: handleDelete
});

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
