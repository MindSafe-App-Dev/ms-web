'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useNotification } from '@/context/NotificationProvider';
import { getAllChild, getAllPayments, requestPasswordRecovery, Child, Payment } from '@/lib/appwrite';
import { maskEmail, formatDate } from '@/lib/utils';
import {
    Smartphone, TrendingUp, Activity, Crown, CreditCard, Mail, Key, Send,
    LogOut, RefreshCw
} from 'lucide-react';

const tabs = ['Users', 'Billing', 'Settings', 'Support'];

export default function ProfilePage() {
    const { user } = useGlobalContext();
    const { showSuccess, showError } = useNotification();

    const [activeTab, setActiveTab] = useState('Users');
    const [devices, setDevices] = useState<Child[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Settings state
    const [resetEmail, setResetEmail] = useState('');

    // Support state
    const [selectedReason, setSelectedReason] = useState('');
    const [supportMessage, setSupportMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = async () => {
        if (!user?.$id) return;

        try {
            const [devicesData, paymentsData] = await Promise.all([
                getAllChild(user.$id),
                getAllPayments(user.accountId),
            ]);
            setDevices(devicesData);
            setPayments(paymentsData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.$id]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const handlePasswordReset = async () => {
        if (!resetEmail) {
            showError('Validation Error', 'Please enter a valid email address.');
            return;
        }

        try {
            await requestPasswordRecovery(resetEmail);
            showSuccess('Recovery Email Sent', 'Check your inbox for instructions.');
            setResetEmail('');
        } catch (error) {
            showError('Recovery Failed', error instanceof Error ? error.message : 'An error occurred.');
        }
    };

    const handleSupportSubmit = async () => {
        if (!selectedReason || !supportMessage) {
            showError('Validation Error', 'Please select a reason and describe your issue.');
            return;
        }

        setIsSubmitting(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            showSuccess('Support Request Submitted', "We'll get back to you soon.");
            setSupportMessage('');
            setSelectedReason('');
        } catch (error) {
            showError('Submission Failed', error instanceof Error ? error.message : 'An error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const supportReasons = ['Technical Issue', 'Account Problem', 'Payment Issue', 'General Inquiry'];

    return (
        <div className="max-w-4xl mx-auto">
            {/* Profile Header */}
            <div className="gradient-border mb-6">
                <div className="bg-[#1a0b2e] rounded-[1.15rem] p-6">
                    <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-16 h-16 rounded-full gradient-primary p-0.5 flex-shrink-0">
                            <div className="w-full h-full rounded-full bg-[#1a0b2e] flex items-center justify-center overflow-hidden">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-2xl font-bold text-white">
                                        {user?.username?.[0]?.toUpperCase()}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl font-bold text-white truncate">{user?.username}</h1>
                            <p className="text-gray-400 text-sm truncate">{maskEmail(user?.email || '')}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span className="text-emerald-400 text-xs font-semibold">Active Account</span>
                            </div>
                        </div>

                        {/* Refresh */}
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="p-3 rounded-full bg-red-500/15 border border-red-500/30"
                        >
                            <RefreshCw className={`w-5 h-5 text-red-400 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Devices */}
                <div className="p-0.5 rounded-2xl" style={{ background: 'linear-gradient(135deg, #fb923c, #f97316)' }}>
                    <div className="bg-[#1a0b2e] rounded-[0.875rem] p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 rounded-xl bg-white/20">
                                <Smartphone className="w-5 h-5 text-white" />
                            </div>
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                        </div>
                        <p className="text-3xl font-bold text-white">{devices.length}</p>
                        <p className="text-white/80 text-sm">Connected Devices</p>
                    </div>
                </div>

                {/* Transactions */}
                <div className="p-0.5 rounded-2xl" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                    <div className="bg-[#1a0b2e] rounded-[0.875rem] p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 rounded-xl bg-white/20">
                                <CreditCard className="w-5 h-5 text-white" />
                            </div>
                            <Activity className="w-4 h-4 text-yellow-400" />
                        </div>
                        <p className="text-3xl font-bold text-white">{payments.length}</p>
                        <p className="text-white/80 text-sm">Transactions</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-2xl ms-card mb-6">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${activeTab === tab
                                ? 'gradient-primary text-white shadow-lg'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[300px]">
                {/* Users Tab */}
                {activeTab === 'Users' && (
                    <div>
                        <h2 className="text-xl font-bold text-white mb-4">Connected Devices</h2>
                        {devices.length === 0 ? (
                            <div className="text-center py-12">
                                <Smartphone className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-400">No devices connected</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {devices.map((device) => (
                                    <div key={device.$id} className="ms-card p-4 flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-full gradient-primary flex items-center justify-center">
                                            <Smartphone className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-white truncate">{device.victime_name}</p>
                                            <p className="text-gray-400 text-sm truncate">ID: {device.victim_id}</p>
                                        </div>
                                        {device.is_Premium && (
                                            <div className="p-2 rounded-full bg-yellow-500/15 border border-yellow-500/30">
                                                <Crown className="w-4 h-4 text-yellow-400" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Billing Tab */}
                {activeTab === 'Billing' && (
                    <div>
                        <h2 className="text-xl font-bold text-white mb-4">Transaction History</h2>
                        {payments.length === 0 ? (
                            <div className="text-center py-12">
                                <CreditCard className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-400">No transactions yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {payments.map((payment) => (
                                    <div key={payment.$id} className="ms-card p-4 flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-full bg-purple-500/15 flex items-center justify-center">
                                            <CreditCard className="w-5 h-5 text-purple-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-white truncate">{payment.device_name}</p>
                                            <p className="text-gray-400 text-sm">{formatDate(payment.date)}</p>
                                        </div>
                                        <div className={`px-3 py-1.5 rounded-xl ${payment.status ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                                            <span className="text-white font-semibold">${payment.amount}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'Settings' && (
                    <div className="ms-card p-6">
                        <h2 className="text-xl font-bold text-white mb-2">Reset Password</h2>
                        <p className="text-gray-400 text-sm mb-6">Enter your email to receive reset instructions</p>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#2d1b4e] border border-purple-500/30">
                                <Mail className="w-4 h-4 text-purple-400" />
                                <input
                                    type="email"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    className="flex-1 bg-transparent text-white outline-none"
                                />
                            </div>

                            <p className="text-gray-500 text-sm">Hint: {maskEmail(user?.email || '')}</p>

                            <button
                                onClick={handlePasswordReset}
                                className="w-full py-3 rounded-xl gradient-primary text-white font-semibold flex items-center justify-center gap-2"
                            >
                                <Key className="w-4 h-4" />
                                Reset Password
                            </button>
                        </div>
                    </div>
                )}

                {/* Support Tab */}
                {activeTab === 'Support' && (
                    <div className="ms-card p-6">
                        <h2 className="text-xl font-bold text-white mb-2">Contact Support</h2>
                        <p className="text-gray-400 text-sm mb-6">We&apos;re here to help you</p>

                        <div className="space-y-6">
                            {/* Reason Selection */}
                            <div>
                                <label className="text-purple-300 text-sm font-semibold mb-3 block">Select Reason</label>
                                <div className="flex flex-wrap gap-2">
                                    {supportReasons.map((reason) => (
                                        <button
                                            key={reason}
                                            onClick={() => setSelectedReason(reason)}
                                            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${selectedReason === reason
                                                    ? 'bg-purple-500/30 border-purple-500/50 text-white'
                                                    : 'bg-gray-500/15 border-gray-500/20 text-gray-400'
                                                } border`}
                                        >
                                            {reason}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Message */}
                            <div>
                                <label className="text-purple-300 text-sm font-semibold mb-3 block">Describe Your Issue</label>
                                <textarea
                                    value={supportMessage}
                                    onChange={(e) => setSupportMessage(e.target.value)}
                                    placeholder="Type your message here..."
                                    rows={5}
                                    className="w-full px-4 py-3 rounded-xl bg-[#2d1b4e] border border-purple-500/30 text-white resize-none outline-none focus:border-purple-500"
                                />
                            </div>

                            <button
                                onClick={handleSupportSubmit}
                                disabled={isSubmitting}
                                className="w-full py-3 rounded-xl gradient-primary text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Submit Request
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
