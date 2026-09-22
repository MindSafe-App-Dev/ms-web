'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { createUser } from '@/lib/appwrite';
import { reportUserAppSession } from '@/lib/runtimeConfig';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useNotification } from '@/context/NotificationProvider';

function SignUpForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setUser, setIsLogged, devUxMode } = useGlobalContext();
    const { showSuccess, showError, showWarning } = useNotification();

    const [selectedRole, setSelectedRole] = useState<'parent' | 'child'>('parent');
    const [form, setForm] = useState({ username: '', email: '', password: '', parentId: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setSubmitting] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [isAgreed, setIsAgreed] = useState(false);

    useEffect(() => {
        const ref = searchParams.get('ref') || searchParams.get('referral');
        if (ref) {
            localStorage.setItem('ms_referral_code', ref);
            console.log('Saved referral code:', ref);
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.username || !form.email || !form.password) {
            showError('Missing Information', 'Please fill in all fields');
            return;
        }

        setShowTermsModal(true);
    };

    const handleConfirm = async () => {
        if (!isAgreed) {
            showWarning('Terms Required', 'You must agree to the terms and conditions');
            return;
        }

        setSubmitting(true);

        try {
            const roleToUse = devUxMode ? selectedRole : 'parent';
            const result = await createUser(form.email, form.password, form.username, roleToUse, {
                parentId: form.parentId.trim(),
            });
            setUser(result);
            setIsLogged(true);

            reportUserAppSession({
                email: result?.email || form.email,
                username: result?.username || form.username,
                userId: result?.$id,
                role: roleToUse,
                childId: result?.childId || '',
            }).catch(() => null);

            showSuccess(
                'Account Created!',
                roleToUse === 'child'
                    ? 'Child device registered successfully. Safety monitoring active.'
                    : 'Welcome to Mind Safe'
            );
            router.replace('/home');
        } catch (error) {
            console.error(error);
            showError('Registration Failed', error instanceof Error ? error.message : 'Please try again');
        } finally {
            setSubmitting(false);
            setShowTermsModal(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {devUxMode
                            ? selectedRole === 'child'
                                ? 'Register Child Device'
                                : 'Register Parent Account'
                            : (
                                <>
                                    Sign up with <span className="text-orange-400">Mind Safe</span>
                                </>
                            )}
                    </h1>
                    <div className="w-32 h-1 gradient-primary mx-auto rounded-full" />
                </div>

                {/* Dev Mode Role Selector */}
                {devUxMode && (
                    <div className="mb-6">
                        <label className="block text-orange-400 text-xs font-semibold uppercase tracking-wider mb-2">
                            Select User Category (Safety Mode)
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setSelectedRole('parent')}
                                className={`p-4 rounded-2xl border text-left transition-all ${
                                    selectedRole === 'parent'
                                        ? 'bg-purple-950/80 border-orange-400 shadow-lg shadow-orange-500/10'
                                        : 'bg-purple-950/30 border-purple-500/20 hover:border-purple-500/40'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-lg">👨‍👩‍👧</span>
                                    <span className={`font-bold text-sm ${selectedRole === 'parent' ? 'text-orange-400' : 'text-gray-300'}`}>
                                        Parent
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 leading-tight">
                                    Monitors and tracks child live GPS
                                </p>
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedRole('child')}
                                className={`p-4 rounded-2xl border text-left transition-all ${
                                    selectedRole === 'child'
                                        ? 'bg-purple-950/80 border-orange-400 shadow-lg shadow-orange-500/10'
                                        : 'bg-purple-950/30 border-purple-500/20 hover:border-purple-500/40'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-lg">📱</span>
                                    <span className={`font-bold text-sm ${selectedRole === 'child' ? 'text-orange-400' : 'text-gray-300'}`}>
                                        Child
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 leading-tight">
                                    Protected mode, live GPS transmitter
                                </p>
                            </button>
                        </div>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Username Field */}
                    <div>
                        <label className="block text-gray-300 text-sm font-medium mb-2">
                            {devUxMode
                                ? selectedRole === 'child'
                                    ? 'Child / Device Name'
                                    : 'Parent Name'
                                : 'Username'}
                        </label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="text"
                                value={form.username}
                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                                className="ms-input pl-12"
                                placeholder={
                                    devUxMode && selectedRole === 'child'
                                        ? "e.g. Emma's Laptop / Phone"
                                        : 'Enter your name'
                                }
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    {/* Email Field */}
                    <div>
                        <label className="block text-gray-300 text-sm font-medium mb-2">
                            {devUxMode
                                ? selectedRole === 'child'
                                    ? 'Child Email'
                                    : 'Parent Email'
                                : 'Email'}
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
                                autoComplete="new-password"
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

                    {/* Optional Parent Code Field for Child */}
                    {devUxMode && selectedRole === 'child' && (
                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                Parent Account ID / Code (Optional)
                            </label>
                            <input
                                type="text"
                                value={form.parentId}
                                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                                className="ms-input"
                                placeholder="Leave blank to pair with Parent later"
                            />
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="ms-btn ms-btn-primary w-full text-lg mt-6"
                    >
                        {devUxMode
                            ? selectedRole === 'child'
                                ? 'Register Child Device'
                                : 'Register Parent Account'
                            : 'Sign Up'}
                    </button>
                </form>

                {/* Sign In Link */}
                <div className="flex items-center justify-center gap-2 mt-8">
                    <span className="text-gray-400">Have an account already?</span>
                    <Link href="/sign-in" className="text-orange-400 font-semibold hover:underline">
                        Login
                    </Link>
                </div>
            </div>

            {/* Terms Modal */}
            {showTermsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="w-full max-w-md ms-card p-6 animate-slide-up">
                        <h2 className="text-2xl font-bold text-white mb-4">Terms and Conditions</h2>
                        <p className="text-gray-400 mb-6">
                            Please read and agree to our terms and conditions before proceeding.
                        </p>

                        {/* Checkbox */}
                        <button
                            onClick={() => setIsAgreed(!isAgreed)}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${isAgreed
                                    ? 'border-emerald-500 bg-emerald-500/10'
                                    : 'border-red-500 bg-red-500/10'
                                }`}
                        >
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${isAgreed ? 'bg-emerald-500' : 'bg-red-500'
                                }`}>
                                {isAgreed ? '✓' : '✕'}
                            </div>
                            <span className={isAgreed ? 'text-emerald-400' : 'text-red-400'}>
                                {isAgreed ? 'I agree to the terms' : 'I do not agree'}
                            </span>
                        </button>

                        {/* Actions */}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowTermsModal(false);
                                    setIsAgreed(false);
                                }}
                                className="flex-1 py-3 px-4 rounded-xl bg-gray-700 text-white font-semibold hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isSubmitting}
                                className="flex-1 py-3 px-4 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {isSubmitting ? 'Creating...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Background decorations */}
            <div className="fixed top-20 right-20 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="fixed bottom-20 left-20 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>
    );
}

export default function SignUpPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="text-white text-lg">Loading...</div>
            </div>
        }>
            <SignUpForm />
        </Suspense>
    );
}
