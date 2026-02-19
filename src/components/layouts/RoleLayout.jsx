'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { API_ENDPOINTS } from '@/lib/constants';

export default function RoleLayout({ children, allowedRole }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const validateAccess = async () => {
            try {
                const response = await axios.get(API_ENDPOINTS.AUTH.SESSION);

                if (!response.data.valid) {
                    router.replace('/login');
                    return;
                }

                // Check if user has correct role
                if (response.data.user.role !== allowedRole) {
                    // Redirect to their correct dashboard
                    router.replace(`/${response.data.user.role}/dashboard`);
                    return;
                }

                setUser(response.data.user);
                setLoading(false);
            } catch (error) {
                router.replace('/login');
            }
        };

        validateAccess();
    }, [router, allowedRole]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return children;
}