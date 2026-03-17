import { query } from "@/lib/db";

// Module names for permissions
export const MODULES = {
    LEADS: 'leads',
    PATIENTS: 'patients',
    PIPELINE: 'pipeline',
    HOSPITALS: 'hospitals',
    MACHINES: 'machines',
    CONSUMABLES: 'consumables',
    BILLING: 'billing',
    FINANCE: 'finance',
    USERS: 'users',
    ANALYTICS: 'analytics',
    REVIEWS: 'reviews',
    CALENDAR: 'calendar'
};

// Action types
export const ACTIONS = {
    VIEW: 'view',
    CREATE: 'create',
    EDIT: 'edit',
    DELETE: 'delete',
    ASSIGN: 'assign',
    MANAGE: 'manage',
    PAYMENTS: 'payments',
    EXPORT: 'export'
};

// Default permissions by role
export const DEFAULT_PERMISSIONS = {
    admin: {
        leads: ['view', 'create', 'edit', 'delete', 'assign'],
        patients: ['view', 'create', 'edit', 'delete'],
        pipeline: ['view', 'create', 'manage'],
        hospitals: ['view', 'create', 'edit', 'delete'],
        machines: ['view', 'create', 'edit', 'delete'],
        consumables: ['view', 'create', 'edit', 'delete'],
        billing: ['view', 'create', 'edit', 'delete', 'payments'],
        finance: ['view', 'export'],
        analytics: ['view', 'export'],
        users: ['view', 'create', 'edit', 'delete'],
        calendar: ['view', 'manage'],
        reviews: ['view', 'delete']
    },
    sales: {
        leads: ['view', 'create', 'edit', 'assign'],
        patients: ['view', 'create', 'edit', 'delete'],
        pipeline: ['view', 'create', 'manage'],
        hospitals: ['view'],
        machines: ['view'],
        consumables: ['view'],
        billing: ['view'],
        analytics: ['view'],
        calendar: ['view'],
        users: ['view']
    },
    ops: {
        leads: ['view'],
        patients: ['view', 'create', 'edit'],
        pipeline: ['view', 'create', 'manage'],
        hospitals: ['view', 'create', 'edit'],
        machines: ['view', 'create', 'edit'],
        consumables: ['view', 'create', 'edit'],
        billing: ['view'],
        finance: ['view'],
        analytics: ['view'],
        calendar: ['view', 'manage']
    },
    carebuddy: {
        patients: ['view', 'edit'],
        pipeline: ['view', 'create', 'manage'],
        hospitals: ['view'],
        machines: ['view'],
        consumables: ['view'],
        calendar: ['view']
    },
    accountant: {
        billing: ['view', 'create', 'edit', 'payments'],
        finance: ['view', 'export'],
        analytics: ['view', 'export']
    },
    outsourcing: {
        leads: ['view', 'create', 'edit'],
    },
    patient: {
        reviews: ['create', 'view'],
        patients: ['view'] // View own data
    }
};

/**
 * Check if a user has permission to perform an action on a module
 * @param {number} userId - The user's ID
 * @param {string} userRole - The user's role
 * @param {string} module - The module name (from MODULES)
 * @param {string} action - The action (from ACTIONS)
 * @returns {Promise<{allowed: boolean, reason: string}>}
 */
export async function checkPermission(userId, userRole, module, action) {
    try {
        // 1. Get default permissions for role
        const roleDefaults = DEFAULT_PERMISSIONS[userRole] || {};
        const defaultActions = roleDefaults[module] || [];
        const hasDefaultPermission = defaultActions.includes(action);

        // 2. Check for custom override in user_permissions table
        const permissionKey = `${module}_${action}`;
        const customPerms = await query(
            "SELECT is_enabled FROM user_permissions WHERE user_id = ? AND permission_key = ?",
            [userId, permissionKey]
        );

        // 3. Determine final permission
        if (customPerms.length > 0) {
            // Custom override exists
            const isEnabled = !!customPerms[0].is_enabled;
            return {
                allowed: isEnabled,
                reason: isEnabled
                    ? `Custom permission granted for ${module}.${action}`
                    : `Custom permission denied for ${module}.${action}`
            };
        }

        // 4. Fall back to default
        return {
            allowed: hasDefaultPermission,
            reason: hasDefaultPermission
                ? `Default permission for ${userRole} role`
                : `No ${action} permission for ${module} in ${userRole} role`
        };
    } catch (error) {
        console.error('Permission check error:', error);
        return { allowed: false, reason: 'Permission check failed' };
    }
}

/**
 * Get all permissions for a user (for frontend)
 * @param {number} userId - The user's ID
 * @param {string} userRole - The user's role
 * @returns {Promise<Object>} - Permissions object
 */
export async function getUserPermissions(userId, userRole) {
    try {
        // Get custom permissions
        const customPerms = await query(
            "SELECT permission_key, is_enabled FROM user_permissions WHERE user_id = ?",
            [userId]
        );

        // Build custom map
        const customMap = {};
        for (const cp of customPerms) {
            customMap[cp.permission_key] = !!cp.is_enabled;
        }

        // Build full permissions object
        const roleDefaults = DEFAULT_PERMISSIONS[userRole] || {};
        const permissions = {};

        // For each module in defaults
        for (const [module, actions] of Object.entries(roleDefaults)) {
            permissions[module] = {};
            for (const action of actions) {
                const key = `${module}_${action}`;
                // Check custom override first, then default
                if (key in customMap) {
                    permissions[module][action] = customMap[key];
                } else {
                    permissions[module][action] = true; // Default is allowed
                }
            }
        }

        // Check for custom additions (permissions not in role defaults)
        for (const cp of customPerms) {
            const [module, action] = cp.permission_key.split('_');
            if (!permissions[module]) permissions[module] = {};
            if (!(action in (permissions[module] || {}))) {
                permissions[module][action] = !!cp.is_enabled;
            }
        }

        return permissions;
    } catch (error) {
        console.error('Error getting user permissions:', error);
        return DEFAULT_PERMISSIONS[userRole] || {};
    }
}

/**
 * Map HTTP method to action
 */
export function getActionFromMethod(method) {
    const methodMap = {
        GET: 'view',
        POST: 'create',
        PUT: 'edit',
        PATCH: 'edit',
        DELETE: 'delete'
    };
    return methodMap[method] || 'view';
}
