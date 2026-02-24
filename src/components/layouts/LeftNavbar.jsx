'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from '../auth/LogoutButton';
import { Menu, X, Users, FileText, LayoutDashboard, Calendar, ClipboardList, UserCircle, UsersIcon, CircleUser, Hospital, Package, Boxes, Receipt, Wallet, Star, ChevronDown, ChevronRight } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

export default function SideNavbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState({});
    const pathname = usePathname();
    const { hasModuleAccess, loading } = usePermissions();

    const getCurrentRole = () => {
        if (pathname.startsWith('/admin')) return 'admin';
        if (pathname.startsWith('/sales')) return 'sales';
        if (pathname.startsWith('/ops')) return 'ops';
        if (pathname.startsWith('/carebuddy')) return 'carebuddy';
        if (pathname.startsWith('/accountant')) return 'accountant';
        if (pathname.startsWith('/outsourcing')) return 'outsourcing';
        return null;
    };

    const currentRole = getCurrentRole();

    if (!currentRole) return null;

    const toggleMenu = (label) => {
        setExpandedMenus(prev => ({
            ...prev,
            [label]: !prev[label]
        }));
    };

    const roleNavItems = {
        admin: [
            { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: null },
            { href: '/admin/users', label: 'Users', icon: Users, module: 'users' },
            { href: '/admin/leads', label: 'Leads', icon: FileText, module: 'leads' },
            //{ href: '/admin/lead-integrations', label: 'Lead Integrations', icon: FileText },
            { href: '/admin/patients', label: 'Patients', icon: Users, module: 'patients' },
            { href: '/admin/pipeline', label: 'Pipeline', icon: FileText, module: 'pipeline' },
            { href: '/admin/calendar', label: 'Calendar', icon: Calendar, module: 'calendar' },
            { href: '/admin/hospitals', label: 'Hospitals', icon: Hospital, module: 'hospitals' },
            {
                label: 'Machines',
                icon: Package,
                module: 'machines',
                children: [
                    { href: '/admin/machines', label: 'Inventory' },
                    { href: '/admin/machines/showcase', label: 'Machine Showcase' }
                ]
            },
            { href: '/admin/consumables', label: 'Consumables', icon: Boxes, module: 'consumables' },
            { href: '/admin/finance', label: 'Finance', icon: Wallet, module: 'finance' },
            { href: '/admin/billing', label: 'Billing', icon: Receipt, module: 'billing' },
            { href: '/admin/reviews', label: 'Reviews', icon: Star, module: 'reviews' },
        ],
        sales: [
            { href: '/sales/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: null },
            { href: '/sales/leads', label: 'Leads', icon: UsersIcon, module: 'leads' },
            { href: '/sales/patients', label: 'Patients', icon: CircleUser, module: 'patients' },
            { href: '/sales/pipeline', label: 'Pipeline', icon: FileText, module: 'pipeline' },
            { href: '/sales/calendar', label: 'Calendar', icon: Calendar, module: 'calendar' },
            { href: '/sales/hospitals', label: 'Hospitals', icon: Hospital, module: 'hospitals' },
            {
                label: 'Machines',
                icon: Package,
                module: 'machines',
                children: [
                    { href: '/sales/machines/showcase', label: 'Machine Showcase' }
                ]
            },
            { href: '/sales/consumables', label: 'Consumables', icon: Boxes, module: 'consumables' },
            { href: '/sales/billing', label: 'Billing', icon: Receipt, module: 'billing' },
        ],
        ops: [
            { href: '/ops/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: null },
            { href: '/ops/leads', label: 'Leads', icon: UsersIcon, module: 'leads' },
            { href: '/ops/patients', label: 'Patients', icon: CircleUser, module: 'patients' },
            { href: '/ops/pipeline', label: 'Pipeline', icon: FileText, module: 'pipeline' },
            { href: '/ops/calendar', label: 'Calendar', icon: Calendar, module: 'calendar' },
            { href: '/ops/hospitals', label: 'Hospitals', icon: Hospital, module: 'hospitals' },
            {
                label: 'Machines',
                icon: Package,
                module: 'machines',
                children: [
                    { href: '/ops/machines', label: 'Inventory' },
                    { href: '/ops/machines/showcase', label: 'Machine Showcase' }
                ]
            },
            { href: '/ops/consumables', label: 'Consumables', icon: Boxes, module: 'consumables' },
            { href: '/ops/finance', label: 'Finance', icon: Wallet, module: 'finance' },
            { href: '/ops/billing', label: 'Billing', icon: Receipt, module: 'billing' },
        ],
        carebuddy: [
            { href: '/carebuddy/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: null },
            { href: '/carebuddy/patients', label: 'Patients', icon: CircleUser, module: 'patients' },
            { href: '/carebuddy/pipeline', label: 'Pipeline', icon: FileText, module: 'pipeline' },
            { href: '/carebuddy/calendar', label: 'Calendar', icon: Calendar, module: 'calendar' },
            {
                label: 'Machines',
                icon: Package,
                module: 'machines',
                children: [
                    { href: '/carebuddy/machines/showcase', label: 'Machine Showcase' }
                ]
            },
            { href: '/carebuddy/consumables', label: 'Consumables', icon: Boxes, module: 'consumables' },
        ],
        accountant: [
            { href: '/accountant/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: null },
            { href: '/accountant/finance', label: 'Finance', icon: Wallet, module: 'finance' },
            { href: '/accountant/billing', label: 'Billing', icon: Receipt, module: 'billing' },
        ],
        outsourcing: [
            { href: '/outsourcing/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: null },
            { href: '/outsourcing/leads', label: 'Leads', icon: UsersIcon, module: 'leads' },
        ],
    };

    const roleColors = {
        admin: { bg: '#004071', hover: '#17ccd9ff', active: '#19ADB8' },
        sales: { bg: '#004071', hover: '#17ccd9ff', active: '#19ADB8' },
        ops: { bg: '#004071', hover: '#17ccd9ff', active: '#19ADB8' },
        carebuddy: { bg: '#004071', hover: '#17ccd9ff', active: '#19ADB8' },
        accountant: { bg: '#004071', hover: '#17ccd9ff', active: '#19ADB8' },
        outsourcing: { bg: '#004071', hover: '#17ccd9ff', active: '#19ADB8' },
    };

    const roleLabels = {
        admin: 'Admin Panel',
        sales: 'Sales Portal',
        ops: 'Ops Portal',
        carebuddy: 'Carebuddy Portal',
        accountant: 'Accountant Portal',
        outsourcing: 'Outsourcing Portal'
    };

    const navItems = roleNavItems[currentRole] || [];
    
    // Filter nav items based on permissions
    const filteredNavItems = navItems.filter(item => {
        // Always show dashboard
        if (!item.module) return true;
        // Check if user has access to this module
        return hasModuleAccess(item.module);
    });
    
    const colors = roleColors[currentRole];
    const panelLabel = roleLabels[currentRole];

    const isActive = (path) => pathname === path;
    const isChildActive = (children) => children.some(child => pathname === child.href);

    // Show loading state while permissions are being fetched
    if (loading) {
        return (
            <>
                <div className="hidden md:block md:w-64" />
                <div className="md:hidden h-16" />
            </>
        );
    }

    return (
        <>
            <div
                className="md:hidden fixed top-0 left-0 right-0 text-white shadow-md z-50 px-4 py-3 flex justify-between items-center"
                style={{ backgroundColor: colors.bg }}
            >
                <Link href={`/${currentRole}/dashboard`} className="text-lg font-semibold">
                    {panelLabel}
                </Link>
                <button
                    className="p-2 focus:outline-none"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 bg-opacity-50 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside
                className={`
                    fixed top-0 left-0 h-screen text-white z-50 transition-transform duration-300
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                    md:translate-x-0 md:w-64 w-64
                `}
                style={{ backgroundColor: colors.bg }}
            >
                <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-opacity-50 rounded-b-xl shadow-xl " style={{ borderColor: colors.hover }}>
                        <Link href={`/${currentRole}/dashboard`} className="text-xl font-bold">
                            {panelLabel}
                        </Link>
                    </div>

                    <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
                        {filteredNavItems.map((item) => {
                            const Icon = item.icon;
                            const hasChildren = item.children && item.children.length > 0;
                            const isExpanded = expandedMenus[item.label] || isChildActive(item.children || []);

                            if (hasChildren) {
                                return (
                                    <div key={item.label}>
                                        <button
                                            onClick={() => toggleMenu(item.label)}
                                            className={`
                                                w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors
                                                ${isChildActive(item.children) ? 'text-white' : 'text-gray-200'}
                                            `}
                                            style={{
                                                backgroundColor: isChildActive(item.children) ? 'rgba(255,255,255,0.1)' : 'transparent',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isChildActive(item.children)) {
                                                    e.currentTarget.style.backgroundColor = colors.hover;
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isChildActive(item.children)) {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Icon size={20} />
                                                <span className="font-medium">{item.label}</span>
                                            </div>
                                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </button>

                                        {/* Submenu */}
                                        <div className={`
                                            overflow-hidden transition-all duration-300 ease-in-out
                                            ${isExpanded ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'}
                                        `}>
                                            {item.children.map((child) => (
                                                <Link
                                                    key={child.href}
                                                    href={child.href}
                                                    onClick={() => setIsOpen(false)}
                                                    className={`
                                                        flex items-center gap-2 pl-12 pr-4 py-2 rounded-lg transition-colors text-sm
                                                        ${isActive(child.href) ? 'text-white font-medium' : 'text-gray-300 hover:text-white'}
                                                    `}
                                                    style={{
                                                        backgroundColor: isActive(child.href) ? colors.active : 'transparent',
                                                    }}
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                                                    {child.label}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={`
                                        flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                                        ${isActive(item.href)
                                            ? 'text-white'
                                            : 'text-gray-200'
                                        }
                                    `}
                                    style={{
                                        backgroundColor: isActive(item.href) ? colors.active : 'transparent',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isActive(item.href)) {
                                            e.currentTarget.style.backgroundColor = colors.hover;
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isActive(item.href)) {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }
                                    }}
                                >
                                    <Icon size={20} />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                        <div className="flex justify-start p-4">
                            <LogoutButton />
                        </div>
                    </nav>
                </div>
            </aside>

            <div className="hidden md:block md:w-64" />
            <div className="md:hidden h-16" />
        </>
    );
}
