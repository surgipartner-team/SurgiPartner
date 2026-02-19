'use client';

import { usePathname } from "next/navigation";
import SideNavbar from "@/components/layouts/LeftNavbar";
import Footer from "@/components/layouts/Footer";
import { ToastContainer } from "react-toastify";

export default function ConditionalLayout({ children }) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/login';

    return (
        <>
            {isLoginPage ? (
                <>
                    <ToastContainer />
                    {children}
                </>
            ) : (
                <div className="md:flex min-h-screen bg-gray-50">
                    <ToastContainer />
                    <SideNavbar />
                    <div className="flex-1">
                        <main className="flex-1">{children}</main>
                        <Footer />
                    </div>
                </div>
            )}
        </>
    );
}
