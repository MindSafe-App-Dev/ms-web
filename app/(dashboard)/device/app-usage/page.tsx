'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useNotification } from '@/context/NotificationProvider';
import { initSocket, sendCommand, onResult, COMMANDS, disconnectSocket, SocketResult } from '@/lib/socket';
import {
    ArrowLeft, RefreshCw, Search, Download, AlertTriangle,
    PieChart, Clock, Smartphone, Activity, CheckCircle2,
    Calendar, X, ShieldAlert, Sparkles, Filter, Layers
} from 'lucide-react';

interface AppUsageItem {
    appName?: string;
    packageName?: string;
    totalTimeInForegroundMs?: number;
    totalTimeFormatted?: string;
    lastTimeUsedTimestamp?: number;
    lastTimeUsedFormatted?: string;
}

const formatDurationMs = (ms?: number): string => {
    if (!ms || ms <= 0) return '0s';
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));

    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(' ');
};

const formatTimestamp = (timestamp?: number): string => {
    if (!timestamp) return 'Never';
    try {
        const d = new Date(timestamp);
        if (isNaN(d.getTime())) return 'Never';
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return 'Never';
    }
};

const getAppDisplayName = (appName?: string, packageName?: string): string => {
    if (appName && appName.trim()) return appName.trim();
    if (!packageName) return 'Unknown App';
    const parts = packageName.split('.');
    const last = parts[parts.length - 1] || packageName;
    return last.charAt(0).toUpperCase() + last.slice(1);
};

const getAvatarGradients = (name: string): string => {
    const gradients = [
        'from-orange-500 to-amber-600',
        'from-purple-500 to-indigo-600',
        'from-blue-500 to-cyan-600',
        'from-emerald-500 to-teal-600',
        'from-pink-500 to-rose-600',
        'from-violet-500 to-purple-600',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
};

export default function AppUsagePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { showSuccess, showError, showWarning, showInfo, showConnection } = useNotification();

    const deviceName = searchParams.get('name') || 'Target Device';
    const deviceId = searchParams.get('deviceId') || '';
    const serverUrl = searchParams.get('serverUrl') || undefined;

    const [isLoading, setIsLoading] = useState(true);
    const [requestFailed, setRequestFailed] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [hasPermission, setHasPermission] = useState(true);
    const [totalAppsCount, setTotalAppsCount] = useState(0);
    const [beginTime, setBeginTime] = useState<number | null>(null);
    const [endTime, setEndTime] = useState<number | null>(null);
    const [usageList, setUsageList] = useState<AppUsageItem[]>([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'time' | 'recent' | 'name'>('time');

    const triggerCommand = useCallback(() => {
        if (!deviceId) return;
        setIsLoading(true);
        setRequestFailed(false);
        setErrorMessage(null);

        const sent = sendCommand(COMMANDS.APP_USAGE(deviceId));
        if (!sent) {
            setIsLoading(false);
            setRequestFailed(true);
            setErrorMessage('Unable to send command. Socket not connected.');
        }
    }, [deviceId]);

    useEffect(() => {
        if (!deviceId) return;

        initSocket(deviceId, serverUrl);
        showConnection(true, 'Connected to device socket');

        // Automatically trigger command on connect
        const timer = setTimeout(() => {
            triggerCommand();
        }, 500);

        onResult((data: SocketResult) => {
            console.log('Received socket result in AppUsage:', data);
            setIsLoading(false);

            if (data.hasPermission !== undefined) {
                setHasPermission(data.hasPermission);
                if (!data.hasPermission) {
                    showWarning(
                        'Usage Access Required',
                        'Special App Access "Usage Access" is not granted on the monitored Android device.'
                    );
                }
            }

            if (data.usageList) {
                const list = Array.isArray(data.usageList) ? data.usageList : [];
                setUsageList(list);
                setTotalAppsCount(data.totalAppsCount ?? list.length);
                if (data.beginTime) setBeginTime(data.beginTime);
                if (data.endTime) setEndTime(data.endTime);
                showSuccess('App Usage Synced', `Received statistics for ${list.length} apps`);
            }
        });

        return () => {
            clearTimeout(timer);
            disconnectSocket();
        };
    }, [deviceId, serverUrl, showConnection, showSuccess, showWarning, triggerCommand]);

    const handleRefresh = () => {
        triggerCommand();
    };

    // Calculate aggregated statistics
    const totalForegroundMs = useMemo(() => {
        return usageList.reduce((acc, item) => acc + (item.totalTimeInForegroundMs || 0), 0);
    }, [usageList]);

    const maxAppUsageMs = useMemo(() => {
        if (!usageList.length) return 1;
        return Math.max(...usageList.map((item) => item.totalTimeInForegroundMs || 0), 1);
    }, [usageList]);

    const topApp = useMemo(() => {
        if (!usageList.length) return null;
        return [...usageList].sort((a, b) => (b.totalTimeInForegroundMs || 0) - (a.totalTimeInForegroundMs || 0))[0];
    }, [usageList]);

    // Filter and sort items
    const filteredApps = useMemo(() => {
        let list = [...usageList];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(
                (item) =>
                    (item.appName && item.appName.toLowerCase().includes(q)) ||
                    (item.packageName && item.packageName.toLowerCase().includes(q))
            );
        }

        if (sortBy === 'time') {
            list.sort((a, b) => (b.totalTimeInForegroundMs || 0) - (a.totalTimeInForegroundMs || 0));
        } else if (sortBy === 'recent') {
            list.sort((a, b) => (b.lastTimeUsedTimestamp || 0) - (a.lastTimeUsedTimestamp || 0));
        } else if (sortBy === 'name') {
            list.sort((a, b) => {
                const nameA = getAppDisplayName(a.appName, a.packageName);
                const nameB = getAppDisplayName(b.appName, b.packageName);
                return nameA.localeCompare(nameB);
            });
        }

        return list;
    }, [usageList, searchQuery, sortBy]);

    const handleExportCSV = () => {
        if (!usageList.length) {
            showInfo('Nothing to Export', 'No app usage data available.');
            return;
        }

        const headers = ['App Name', 'Package Name', 'Foreground Time (Formatted)', 'Foreground Time (ms)', 'Last Used'];
        const rows = usageList.map((app) => [
            `"${(app.appName || '').replace(/"/g, '""')}"`,
            `"${(app.packageName || '').replace(/"/g, '""')}"`,
            `"${app.totalTimeFormatted || formatDurationMs(app.totalTimeInForegroundMs)}"`,
            app.totalTimeInForegroundMs || 0,
            `"${app.lastTimeUsedFormatted || formatTimestamp(app.lastTimeUsedTimestamp)}"`,
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `app_usage_${deviceId}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showSuccess('Export Complete', 'App usage CSV downloaded.');
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12">
            {/* Top Navigation Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-colors"
                        title="Back to device tools"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-300" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-white tracking-tight">App Usage Activity</h1>
                            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                                Free Tool
                            </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-0.5">
                            Monitoring <span className="text-white font-medium">{deviceName}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={handleExportCSV}
                        disabled={usageList.length === 0}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white text-sm font-medium transition-all disabled:opacity-40 disabled:pointer-events-none"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export CSV</span>
                    </button>

                    <button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold text-sm shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>{isLoading ? 'Syncing...' : 'Refresh Activity'}</span>
                    </button>
                </div>
            </div>

            {/* Permission Warning if hasPermission is false */}
            {!hasPermission && (
                <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-red-500/15 via-rose-500/10 to-transparent border border-red-500/30 flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400 shrink-0">
                        <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-base font-semibold text-red-200">Usage Access Permission Required</h3>
                        <p className="text-sm text-red-300/80 leading-relaxed">
                            The monitored device requires Android <strong>Usage Access</strong> to allow MindSafe to track foreground app activity.
                            On the child device, go to <strong>Settings &gt; Special App Access &gt; Usage Access</strong> and enable <strong>MindSafe</strong>.
                        </p>
                    </div>
                </div>
            )}

            {/* Metrics Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Screen Time</span>
                        <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-bold text-white tracking-tight">
                            {formatDurationMs(totalForegroundMs)}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Total active foreground duration</p>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Apps Monitored</span>
                        <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                            <Layers className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-bold text-white tracking-tight">
                            {totalAppsCount || usageList.length}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Installed applications recorded</p>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Top Application</span>
                        <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
                            <Activity className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-lg font-bold text-white tracking-tight truncate">
                            {topApp ? getAppDisplayName(topApp.appName, topApp.packageName) : '—'}
                        </div>
                        <p className="text-xs text-blue-400 font-medium mt-1">
                            {topApp ? (topApp.totalTimeFormatted || formatDurationMs(topApp.totalTimeInForegroundMs)) : 'No stats recorded'}
                        </p>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Time Window</span>
                        <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                            <Calendar className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-sm font-semibold text-white tracking-tight truncate">
                            {beginTime && endTime ? `${formatTimestamp(beginTime).slice(0, 12)} – Now` : 'Last 24 Hours'}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Activity reporting window</p>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div className="relative w-full sm:w-96">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search by app name or package..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-9 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-xs text-gray-400 mr-1 hidden sm:inline">Sort:</span>
                    <button
                        onClick={() => setSortBy('time')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            sortBy === 'time'
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'
                        }`}
                    >
                        Most Used
                    </button>
                    <button
                        onClick={() => setSortBy('recent')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            sortBy === 'recent'
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'
                        }`}
                    >
                        Recent
                    </button>
                    <button
                        onClick={() => setSortBy('name')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            sortBy === 'name'
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'
                        }`}
                    >
                        A–Z
                    </button>
                </div>
            </div>

            {/* Apps Usage List */}
            <div className="space-y-3">
                {isLoading && usageList.length === 0 ? (
                    <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center space-y-4">
                        <RefreshCw className="w-8 h-8 text-orange-400 animate-spin mx-auto" />
                        <div className="space-y-1">
                            <h3 className="text-base font-semibold text-white">Fetching App Usage...</h3>
                            <p className="text-sm text-gray-400 max-w-sm mx-auto">
                                Requesting latest app foreground usage statistics from the connected device.
                            </p>
                        </div>
                    </div>
                ) : requestFailed && usageList.length === 0 ? (
                    <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center space-y-4">
                        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
                        <div className="space-y-1">
                            <h3 className="text-base font-semibold text-white">Unable to retrieve App Usage</h3>
                            <p className="text-sm text-gray-400 max-w-sm mx-auto">
                                {errorMessage || 'The device took too long to respond. Please check if the device is online and try again.'}
                            </p>
                        </div>
                        <button
                            onClick={handleRefresh}
                            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors"
                        >
                            Retry Request
                        </button>
                    </div>
                ) : filteredApps.length === 0 ? (
                    <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center space-y-3">
                        <Smartphone className="w-10 h-10 text-gray-500 mx-auto" />
                        <h3 className="text-base font-semibold text-white">
                            {searchQuery ? 'No matching apps found' : 'No App Usage Recorded'}
                        </h3>
                        <p className="text-sm text-gray-400 max-w-sm mx-auto">
                            {searchQuery
                                ? 'Try refining your search keyword.'
                                : 'No foreground application activity was returned by the device for this timeframe.'}
                        </p>
                    </div>
                ) : (
                    filteredApps.map((app, idx) => {
                        const displayName = getAppDisplayName(app.appName, app.packageName);
                        const duration = app.totalTimeFormatted || formatDurationMs(app.totalTimeInForegroundMs);
                        const lastUsed = app.lastTimeUsedFormatted || formatTimestamp(app.lastTimeUsedTimestamp);
                        const gradient = getAvatarGradients(displayName);
                        const usageMs = app.totalTimeInForegroundMs || 0;
                        const percentage = Math.min(Math.max((usageMs / maxAppUsageMs) * 100, 3), 100);

                        return (
                            <div
                                key={`${app.packageName || app.appName}_${idx}`}
                                className="group p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div
                                            className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-base shadow-md shrink-0`}
                                        >
                                            {displayName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-semibold text-white truncate">
                                                    {displayName}
                                                </h4>
                                            </div>
                                            <p className="text-xs text-gray-400 truncate mt-0.5">
                                                {app.packageName || 'System App'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                                        <div className="text-left sm:text-right">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                                                <span>Last used: {lastUsed}</span>
                                            </div>
                                        </div>

                                        <div className="text-right min-w-[90px]">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-bold">
                                                <Clock className="w-3 h-3" />
                                                {duration}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Relative Usage Bar */}
                                <div className="mt-3.5 pt-2 border-t border-white/[0.03]">
                                    <div className="w-full bg-white/[0.05] h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
