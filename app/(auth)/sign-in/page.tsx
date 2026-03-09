'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { signIn, getCurrentUser } from '@/lib/appwrite';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useNotification } from '@/context/NotificationProvider';

export default function SignInPage() {
    const router = useRouter();
    const { setUser, setIsLogged } = useGlobalContext();
    const { showSuccess, showError } = useNotification();

    const [form, setForm] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setSubmitting] = useState(false);

    const adminEmail = process.env.NEXT_PUBLIC_COUPON_ADMIN_EMAIL || '';
    const adminPassword = process.env.NEXT_PUBLIC_COUPON_ADMIN_PASSWORD || '';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.email || !form.password) {
            showError('Missing Information', 'Please fill in all fields');
            return;
        }

        setSubmitting(true);

        try {
            await signIn(form.email, form.password);
            const result = await getCurrentUser();
            setUser(result);
            setIsLogged(true);

            const isCouponAdmin = form.email === adminEmail && form.password === adminPassword;
            if (isCouponAdmin) {
                localStorage.setItem('ms_coupon_admin', '1');
            } else {
                localStorage.removeItem('ms_coupon_admin');
            }
            showSuccess('Welcome Back!', 'You have been signed in successfully');
            router.replace('/home');
        } catch (error) {
            console.error(error);
            showError('Sign In Failed', error instanceof Error ? error.message : 'Please check your credentials');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Sign in with <span className="text-orange-400">Mind Safe</span>
                    </h1>
                    <div className="w-32 h-1 gradient-primary mx-auto rounded-full" />
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Email Field */}
                    <div>
                        <label className="block text-gray-300 text-sm font-medium mb-2">
                            Email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="ms-input pl-12"
                                placeholder="Enter your email"
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    {/* Password Field */}
                    <div>
                        <label className="block text-gray-300 text-sm font-medium mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className="ms-input pl-12 pr-12"
                                placeholder="Enter your password"
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="ms-btn ms-btn-primary w-full text-lg"
                    >
                        {isSubmitting ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Signing in...
                            </div>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                {/* Sign Up Link */}
                <div className="flex items-center justify-center gap-2 mt-8">
                    <span className="text-gray-400">Don&apos;t have an account?</span>
                    <Link href="/sign-up" className="text-orange-400 font-semibold hover:underline">
                        Signup
                    </Link>
                </div>
            </div>

            {/* Background decorations */}
            <div className="fixed top-20 right-20 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="fixed bottom-20 left-20 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>
    );
}


