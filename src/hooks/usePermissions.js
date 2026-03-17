'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '@/lib/constants';

const PermissionsContext = createContext(null);

/**
 * Permission Provider component
 * Wrap your app with this to provide permissions context
 */
export function PermissionsProvider({ children }) {
    const [user, setUser] = useState(null);
    const [permissions, setPermissions] = useState({});
    const [loading, setLoading] = useState(true);

    const fetchPermissions = useCallback(async () => {
        try {
            // Get session which now includes permissions
            const response = await axios.get('/api/auth/session');
            if (response.data.user) {
                setUser(response.data.user);
                setPermissions(response.data.permissions || {});
            }
        } catch (error) {
            console.error('Error fetching permissions:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPermissions();
    }, [fetchPermissions]);

    const can = useCallback((module, action) => {
        if (!permissions || !permissions[module]) return false;
        return !!permissions[module][action];
    }, [permissions]);

    const canAny = useCallback((module, actions) => {
        if (!permissions || !permissions[module]) return false;
        return actions.some(action => !!permissions[module][action]);
    }, [permissions]);

    const canAll = useCallback((module, actions) => {
        if (!permissions || !permissions[module]) return false;
        return actions.every(action => !!permissions[module][action]);
    }, [permissions]);

    const hasModuleAccess = useCallback((module) => {
        if (!permissions || !permissions[module]) return false;
        return Object.values(permissions[module]).some(v => v === true);
    }, [permissions]);

    const value = {
        user,
        permissions,
        loading,
        can,
        canAny,
        canAll,
        hasModuleAccess,
        refetch: fetchPermissions
    };

    return (
        <PermissionsContext.Provider value={value}>
            {children}
        </PermissionsContext.Provider>
    );
}

/**
 * Hook to access permissions
 * @returns {Object} Permission utilities
 */
export function usePermissions() {
    const context = useContext(PermissionsContext);

    if (!context) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return useStandalonePermissions();
    }

    return context;
}

function useStandalonePermissions() {
    const [user, setUser] = useState(null);
    const [permissions, setPermissions] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPermissions = async () => {
            try {
                const response = await axios.get('/api/auth/session');
                if (response.data.user) {
                    setUser(response.data.user);
                    setPermissions(response.data.permissions || {});
                }
            } catch (error) {
                console.error('Error fetching permissions:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPermissions();
    }, []);

    const can = useCallback((module, action) => {
        if (!permissions || !permissions[module]) return false;
        return !!permissions[module][action];
    }, [permissions]);

    const canAny = useCallback((module, actions) => {
        if (!permissions || !permissions[module]) return false;
        return actions.some(action => !!permissions[module][action]);
    }, [permissions]);

    const canAll = useCallback((module, actions) => {
        if (!permissions || !permissions[module]) return false;
        return actions.every(action => !!permissions[module][action]);
    }, [permissions]);

    const hasModuleAccess = useCallback((module) => {
        if (!permissions || !permissions[module]) return false;
        return Object.values(permissions[module]).some(v => v === true);
    }, [permissions]);

    return {
        user,
        permissions,
        loading,
        can,
        canAny,
        canAll,
        hasModuleAccess,
        refetch: () => { }
    };
}

/**
 * Permission gate component
 * Renders children only if user has permission
 */
export function PermissionGate({ module, action, children, fallback = null }) {
    const { can, loading } = usePermissions();

    if (loading) return null;
    if (!can(module, action)) return fallback;

    return children;
}

/**
 * Module access gate component
 * Renders children only if user has any access to the module
 */
export function ModuleGate({ module, children, fallback = null }) {
    const { hasModuleAccess, loading } = usePermissions();

    if (loading) return null;
    if (!hasModuleAccess(module)) return fallback;

    return children;
}
