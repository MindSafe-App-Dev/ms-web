'use client';

import { useState, useEffect } from 'react';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useNotification } from '@/context/NotificationProvider';
import { getAllChild, createChild, Child } from '@/lib/appwrite';
import { getInitials, getRandomColor, getGreeting } from '@/lib/utils';
import {
    Sun, Moon, Sunset, Smartphone, Star, TrendingUp, RefreshCw,
    PlusCircle, ChevronRight, Crown, X, Zap
} from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
    const { user } = useGlobalContext();
    const { showSuccess, showError, showInfo } = useNotification();

    const [devices, setDevices] = useState<Child[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ victim_name: '', victim_id: '' });
    const [isAdding, setIsAdding] = useState(false);

    // Generate unique device ID
    const generateDeviceId = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = 'MS-';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const openAddModal = () => {
        setAddForm({ victim_name: '', victim_id: generateDeviceId() });
        setShowAddModal(true);
    };

    const fetchDevices = async () => {
        if (!user?.$id) return;

        try {
            const data = await getAllChild(user.$id);
            setDevices(data);
        } catch (error) {
            console.error('Error fetching devices:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDevices();
    }, [user?.$id]);

    const handleRefresh = async () => {
        setRefreshing(true);
        showInfo('Refreshing...', 'Updating your device list');
        await fetchDevices();
        setRefreshing(false);
        showSuccess('Updated', 'Device list has been refreshed');
    };

    const handleAddDevice = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!addForm.victim_name) {
            showError('Missing Information', 'Please enter a device name');
            return;
        }

        setIsAdding(true);

        try {
            await createChild({
                client_id: user!.$id,
                victim_name: addForm.victim_name,
                victim_id: addForm.victim_id,
            });

            showSuccess('Device Added', 'New device has been added successfully');
            setShowAddModal(false);
            setAddForm({ victim_name: '', victim_id: '' });
            await fetchDevices();
        } catch (error) {
            showError('Failed', error instanceof Error ? error.message : 'Could not add device');
        } finally {
            setIsAdding(false);
        }
    };

    const freeUsers = devices.filter(d => !d.is_Premium).length;
    const premiumUsers = devices.filter(d => d.is_Premium).length;

    const GreetingIcon = () => {
        const hour = new Date().getHours();
        if (hour < 12) return <Sun className="w-4 h-4 text-yellow-400" />;
        if (hour < 18) return <Sunset className="w-4 h-4 text-orange-400" />;
        return <Moon className="w-4 h-4 text-purple-400" />;
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header Card */}
            <div className="gradient-border mb-6">
                <div className="bg-[#1a0b2e] rounded-[1.15rem] p-6">
                    {/* Welcome Row */}
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <GreetingIcon />
                                <span className="text-gray-400 text-sm font-medium">{getGreeting()}</span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                                {user?.username}
                            </h1>
                            <div className="flex items-center gap-2">
                                <div className="status-dot" />
                                <span className="text-emerald-400 text-sm font-semibold">Online & Monitoring</span>
                            </div>
                        </div>

                        {/* Avatar */}
                        <div className="w-16 h-16 rounded-full gradient-primary p-0.5">
                            <div className="w-full h-full rounded-full bg-[#1a0b2e] flex items-center justify-center">
                                <span className="text-2xl font-bold text-white">
                                    {user?.username?.[0]?.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent mb-6" />

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        {/* Total Devices */}
                        <div className="p-4 rounded-2xl border-2 border-orange-500/30 bg-[#1a0b2e]">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2 rounded-xl bg-orange-500/20">
                                    <Smartphone className="w-5 h-5 text-orange-400" />
                                </div>
                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                            </div>
                            <p className="text-3xl font-bold text-white mb-1">{devices.length}</p>
                            <p className="text-gray-400 text-sm">Total Devices</p>
                        </div>

                        {/* Premium Devices */}
                        <div className="p-4 rounded-2xl border-2 border-yellow-500/30 bg-[#1a0b2e]">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2 rounded-xl bg-yellow-500/20">
                                    <Star className="w-5 h-5 text-yellow-400" />
                                </div>
                                <Zap className="w-4 h-4 text-yellow-400" />
                            </div>
                            <p className="text-3xl font-bold text-white mb-1">{premiumUsers}</p>
                            <p className="text-gray-400 text-sm">Premium</p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-300 font-semibold hover:bg-orange-500/20 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <button
                            onClick={openAddModal}
                            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity"
                        >
                            <PlusCircle className="w-4 h-4" />
                            Add Device
                        </button>
                    </div>
                </div>
            </div>

            {/* Devices Section Header */}
            <div className="flex items-center justify-between px-2 mb-4">
                <div>
                    <h2 className="text-xl font-semibold text-white">Your Devices</h2>
                    <p className="text-gray-400 text-sm mt-1">
                        {devices.length} device{devices.length !== 1 ? 's' : ''} connected
                    </p>
                </div>
                <div className="px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30">
                    <span className="text-purple-300 text-sm font-semibold">
                        {devices.length}/{devices.length} Active
                    </span>
                </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-purple-500/20 mb-4" />

            {/* Device List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                </div>
            ) : devices.length === 0 ? (
                <div className="text-center py-20">
                    <Smartphone className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No devices connected</h3>
                    <p className="text-gray-400">Add your first device to start monitoring</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {devices.map((device) => (
                        <Link
                            key={device.$id}
                            href={`/device/${device.$id}?name=${encodeURIComponent(device.victime_name)}&deviceId=${device.victim_id}&isPremium=${device.is_Premium === true ? 'true' : 'false'}`}
                            className="block ms-card ms-card-hover p-4"
                        >
                            <div className="flex items-center gap-4">
                                {/* Avatar */}
                                <div
                                    className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                                    style={{ backgroundColor: getRandomColor(device.victime_name) }}
                                >
                                    <span className="text-white text-xl font-bold">
                                        {getInitials(device.victime_name)}
                                    </span>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-white truncate">
                                            {device.victime_name}
                                        </span>
                                        {device.is_Premium && (
                                            <div className="px-2 py-0.5 rounded-full bg-yellow-500/20">
                                                <Crown className="w-3.5 h-3.5 text-yellow-400" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                                        <Smartphone className="w-3 h-3" />
                                        <span className="truncate">{device.victim_id}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                        <span className="text-emerald-400 text-xs font-medium">Connected</span>
                                    </div>
                                </div>

                                {/* Arrow */}
                                <div className="p-2 rounded-xl bg-orange-500/20">
                                    <ChevronRight className="w-5 h-5 text-orange-400" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Add Device Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="w-full max-w-md ms-card p-6 animate-slide-up">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">Add New Device</h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleAddDevice} className="space-y-4">
                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">
                                    Device Name
                                </label>
                                <input
                                    type="text"
                                    value={addForm.victim_name}
                                    onChange={(e) => setAddForm({ ...addForm, victim_name: e.target.value })}
                                    className="ms-input"
                                    placeholder="Enter device name"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">
                                    Device ID <span className="text-orange-400">(Auto-generated)</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={addForm.victim_id}
                                        readOnly
                                        className="ms-input bg-orange-500/10 cursor-not-allowed"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setAddForm({ ...addForm, victim_id: generateDeviceId() })}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-orange-500/20 text-orange-300 text-sm hover:bg-orange-500/30 transition-colors"
                                    >
                                        Regenerate
                                    </button>
                                </div>
                                <p className="text-gray-500 text-xs mt-2">Use this ID in the child app to connect</p>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-3 rounded-xl bg-gray-700 text-white font-semibold hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isAdding}
                                    className="flex-1 py-3 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {isAdding ? 'Adding...' : 'Add Device'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
