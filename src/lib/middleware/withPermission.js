import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SESSION_CONFIG } from "@/lib/constants";
import { checkPermission, getActionFromMethod } from "@/lib/permissions";

/**
 * Higher-order function that wraps API handlers with permission checking
 * @param {string} module - The module name (leads, patients, etc.)
 * @param {Object} handlers - Object with handler functions keyed by HTTP method
 * @param {Object} options - Additional options
 * @returns {Function} - Next.js API handler
 */
export function withPermission(module, handlers, options = {}) {
    const {
        customActionMap = {},
        skipAuthForMethods = [],
        allowedRoles = null // null means all authenticated users
    } = options;

    return async function handler(request, context) {
        try {
            // 1. Get session
            const cookieStore = await cookies();
            const session = await getIronSession(cookieStore, SESSION_CONFIG);

            // 2. Check authentication
            if (!session.user) {
                return NextResponse.json(
                    { error: "Unauthorized", message: "Please login to continue" },
                    { status: 401 }
                );
            }

            const { id: userId, role: userRole } = session.user;
            const method = request.method;

            // 3. Check if method is allowed to skip auth
            if (skipAuthForMethods.includes(method)) {
                const handlerFn = handlers[method];
                if (handlerFn) {
                    return await handlerFn(request, context, session.user);
                }
            }

            // 4. Check role whitelist if specified
            if (allowedRoles && !allowedRoles.includes(userRole)) {
                return NextResponse.json(
                    { error: "Forbidden", message: `Access denied for ${userRole} role` },
                    { status: 403 }
                );
            }

            // 5. Determine required action
            const action = customActionMap[method] || getActionFromMethod(method);

            // 6. Check permission
            const { allowed, reason } = await checkPermission(userId, userRole, module, action);

            if (!allowed) {
                return NextResponse.json(
                    {
                        error: "Forbidden",
                        message: `You don't have permission to ${action} ${module}`,
                        reason
                    },
                    { status: 403 }
                );
            }

            // 7. Get the handler for this method
            const handlerFn = handlers[method];
            if (!handlerFn) {
                return NextResponse.json(
                    { error: "Method not allowed" },
                    { status: 405 }
                );
            }

            // 8. Execute handler with user context
            return await handlerFn(request, context, session.user);

        } catch (error) {
            console.error(`API Error [${module}]:`, error);
            return NextResponse.json(
                { error: "Internal Server Error", message: error.message },
                { status: 500 }
            );
        }
    };
}

/**
 * Create a simple permission-checked handler for a single method
 */
export function createHandler(module, method, handlerFn, options = {}) {
    return withPermission(module, { [method]: handlerFn }, options);
}
