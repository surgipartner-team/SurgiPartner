import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES, ACTIONS } from "@/lib/permissions";
import { SECURITY } from "@/lib/constants";

// POST - Reset user password (admin only)
async function handlePost(request, context, user) {
    const { id: targetUserId } = await context.params;
    const { password } = await request.json();

    if (!password) {
        return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    if (password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Check if target user exists
    const users = await query("SELECT id, username, email FROM users WHERE id = ?", [targetUserId]);
    if (users.length === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, SECURITY.BCRYPT_ROUNDS || 12);

    // Update password
    await query(
        `UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?`,
        [hashedPassword, targetUserId]
    );

    return NextResponse.json({ message: "Password reset successfully" });
}

const handler = withPermission(MODULES.USERS, {
    POST: handlePost
}, ACTIONS.EDIT);

export { handler as POST };
