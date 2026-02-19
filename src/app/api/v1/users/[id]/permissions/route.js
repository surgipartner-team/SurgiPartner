import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES, DEFAULT_PERMISSIONS } from "@/lib/permissions";

// GET - Get user permissions
async function handleGet(request, context, user) {
    const { id: targetUserId } = await context.params;

    // Get target user info
    const users = await query("SELECT id, username, email, role FROM users WHERE id = ?", [targetUserId]);
    if (users.length === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const targetUser = users[0];
    const roleDefaults = DEFAULT_PERMISSIONS[targetUser.role] || {};

    // Get custom permissions
    const customPerms = await query(
        "SELECT permission_key, is_enabled FROM user_permissions WHERE user_id = ?",
        [targetUserId]
    );

    // Build permissions object
    const permissions = {};
    const customMap = {};

    for (const cp of customPerms) {
        customMap[cp.permission_key] = !!cp.is_enabled;
    }

    // Build from defaults and apply custom overrides
    for (const [module, actions] of Object.entries(roleDefaults)) {
        permissions[module] = {};
        for (const action of actions) {
            const key = `${module}_${action}`;
            permissions[module][action] = {
                enabled: key in customMap ? customMap[key] : true,
                isDefault: true,
                isCustom: key in customMap
            };
        }
    }

    // Add any custom permissions not in defaults
    for (const cp of customPerms) {
        const [module, action] = cp.permission_key.split('_');
        if (!permissions[module]) permissions[module] = {};
        if (!permissions[module][action]) {
            permissions[module][action] = {
                enabled: !!cp.is_enabled,
                isDefault: false,
                isCustom: true
            };
        }
    }

    // Calculate summary
    let totalEnabled = 0;
    let customAdded = 0;
    let restricted = 0;

    for (const [module, actions] of Object.entries(permissions)) {
        for (const [action, perm] of Object.entries(actions)) {
            if (perm.enabled) totalEnabled++;
            if (perm.isCustom && perm.enabled && !perm.isDefault) customAdded++;
            if (perm.isCustom && !perm.enabled && perm.isDefault) restricted++;
        }
    }

    return NextResponse.json({
        user: targetUser,
        permissions,
        defaultPermissions: roleDefaults,
        summary: { totalEnabled, customAdded, restricted }
    });
}

// PUT - Update user permissions
async function handlePut(request, context, user) {
    const { id: targetUserId } = await context.params;
    const { permissions } = await request.json();

    // Get target user to verify exists
    const users = await query("SELECT id, role FROM users WHERE id = ?", [targetUserId]);
    if (users.length === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const targetUser = users[0];
    const roleDefaults = DEFAULT_PERMISSIONS[targetUser.role] || {};

    // Clear existing custom permissions
    await query("DELETE FROM user_permissions WHERE user_id = ?", [targetUserId]);

    // Insert new custom permissions (only store non-default values)
    for (const [module, actions] of Object.entries(permissions)) {
        for (const [action, perm] of Object.entries(actions)) {
            if (perm?.isCustom) {
                const key = `${module}_${action}`;
                const isDefaultAction = roleDefaults[module]?.includes(action);

                // Only store if different from default
                if ((perm.enabled && !isDefaultAction) || (!perm.enabled && isDefaultAction)) {
                    await query(
                        "INSERT INTO user_permissions (user_id, permission_key, is_enabled) VALUES (?, ?, ?)",
                        [targetUserId, key, perm.enabled ? 1 : 0]
                    );
                }
            }
        }
    }

    return NextResponse.json({ message: "Permissions updated successfully" });
}

// POST - Reset to default permissions
async function handlePost(request, context, user) {
    const { id: targetUserId } = await context.params;

    // Clear all custom permissions, restoring defaults
    await query("DELETE FROM user_permissions WHERE user_id = ?", [targetUserId]);

    return NextResponse.json({ message: "Permissions reset to defaults" });
}

const handler = withPermission(MODULES.USERS, {
    GET: handleGet,
    PUT: handlePut,
    POST: handlePost
});

export { handler as GET, handler as PUT, handler as POST };
