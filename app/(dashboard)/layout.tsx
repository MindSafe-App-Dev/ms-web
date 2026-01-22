'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useGlobalContext } from '@/context/GlobalProvider';
import { signOut } from '@/lib/appwrite';
import { Home, BookOpen, Cloud, User, LogOut, Loader2, Menu, X } from 'lucide-react';
import { useState } from 'react';

const navItems = [
    { href: '/home', label: 'Home', icon: Home },
    { href: '/tutorial', label: 'Tutorial', icon: BookOpen },
    { href: '/cloud', label: 'Cloud', icon: Cloud },
    { href: '/profile', label: 'Profile', icon: User },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { loading, isLogged, setUser, setIsLogged, user } = useGlobalContext();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!loading && !isLogged) {
            router.replace('/sign-in');
        }
    }, [loading, isLogged, router]);

    const handleLogout = async () => {
        try {
            await signOut();
            setUser(null);
            setIsLogged(false);
            router.replace('/sign-in');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
            </div>
        );
    }

    if (!isLogged) {
        return null;
    }

    return (
        <div className="min-h-screen flex">
            {/* Mobile Menu Button */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl ms-card"
            >
                {sidebarOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
            </button>

            {/* Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    }`}
            >
                <div className="h-full flex flex-col bg-[#1a0b2e] border-r border-purple-500/20 p-4">
                    {/* Logo */}
                    <div className="flex items-center gap-3 px-2 py-4 mb-6">
                        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                            <span className="text-white font-bold">MS</span>
                        </div>
                        <span className="text-xl font-bold text-white">MindSafe</span>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-2">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                        ? 'gradient-primary text-white shadow-lg shadow-orange-500/20'
                                        : 'text-gray-400 hover:text-white hover:bg-orange-500/10'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Section */}
                    <div className="pt-4 border-t border-purple-500/20">
                        <div className="flex items-center gap-3 px-2 py-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                                <span className="text-white font-bold">
                                    {user?.username?.[0]?.toUpperCase() || 'U'}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">{user?.username}</p>
                                <p className="text-gray-500 text-sm truncate">{user?.email}</p>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="font-medium">Logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-h-screen lg:ml-0 overflow-x-hidden">
                <div className="p-4 lg:p-8 pt-16 lg:pt-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
