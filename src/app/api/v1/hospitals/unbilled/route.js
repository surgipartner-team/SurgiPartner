import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET - Fetch unbilled items (consumables & machines) for a hospital
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const hospital_id = searchParams.get("hospital_id");

    if (!hospital_id) {
        return NextResponse.json({ success: false, error: 'Hospital ID is required' }, { status: 400 });
    }

    try {
        // 1. Fetch Unbilled Consumables
        const consumables = await query(`
            SELECT hc.id, hc.consumable_id, hc.quantity, hc.selling_price, hc.total_amount, 
                   c.item_name, c.sku, c.unit, c.batch_number, c.expiry_date
            FROM hospital_consumables hc
            JOIN consumables c ON hc.consumable_id = c.id
            WHERE hc.hospital_id = ? AND hc.status = 'Unbilled'
        `, [hospital_id]);

        const machines = await query(`
            SELECT id, machine_name, serial_number, status, type, sale_price, rental_price, purchase_price
            FROM machines
            WHERE assigned_hospitals_id = ? AND billing_status = 'Unbilled' AND status IN ('Sold', 'Rented')
        `, [hospital_id]);

        return NextResponse.json({
            success: true,
            consumables,
            machines
        });
    } catch (error) {
        console.error('Error fetching unbilled items:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch unbilled items' }, { status: 500 });
    }
}
