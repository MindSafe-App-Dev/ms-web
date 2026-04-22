'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Cloud, Folder, Link2Off, CheckCircle2, Camera, Mic, MessageSquare, RefreshCw } from 'lucide-react';

import { useNotification } from '@/context/NotificationProvider';
import { disconnectDrive, getDriveStatus, startDriveConnection } from '@/lib/drive-client';

const FEATURES = [
    {
        id: 'audio',
        title: 'Audio uploads',
        description: 'Send captured microphone recordings into a device-specific Drive folder.',
        icon: Mic,
    },
    {
        id: 'camera',
        title: 'Camera uploads',
        description: 'Keep remote camera captures organized by device and feature automatically.',
        icon: Camera,
    },
    {
        id: 'sms',
        title: 'SMS exports',
        description: 'Upload CSV exports from the SMS screen directly into Google Drive.',
        icon: MessageSquare,
    },
];

export default function CloudPage() {
    const searchParams = useSearchParams();
    const { showConfirm, showError, showInfo, showSuccess } = useNotification();
    const [status, setStatus] = useState({
        connected: false,
        accountEmail: '',
        rootFolderName: 'MindSafe',
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);

    const driveMessage = useMemo(() => searchParams.get('message'), [searchParams]);
    const driveState = useMemo(() => searchParams.get('drive'), [searchParams]);

    useEffect(() => {
        if (driveState === 'connected') {
            showSuccess('Drive Connected', 'Google Drive is ready for audio, camera, and SMS uploads.');
        } else if (driveState === 'error') {
            showError('Drive Connection Failed', driveMessage || 'Unable to connect Google Drive.');
        }
    }, [driveMessage, driveState, showError, showSuccess]);

    useEffect(() => {
        const loadStatus = async () => {
            try {
                setIsLoading(true);
                const nextStatus = await getDriveStatus();
                setStatus(nextStatus);
            } catch (error) {
                showError('Drive Unavailable', error instanceof Error ? error.message : 'Unable to load Google Drive status.');
            } finally {
                setIsLoading(false);
            }
        };

        loadStatus();
    }, [showError]);

    const handleConnect = async () => {
        try {
            setIsConnecting(true);
            const { authUrl } = await startDriveConnection({ platform: 'web', redirectPath: '/cloud' });
            window.location.href = authUrl;
        } catch (error) {
            showError('Connect Failed', error instanceof Error ? error.message : 'Unable to connect Google Drive.');
            setIsConnecting(false);
        }
    };

    const handleDisconnect = () => {
        showConfirm(
            'Disconnect Drive',
            'This will stop new uploads to Google Drive until you reconnect the account.',
            async () => {
                try {
                    setIsDisconnecting(true);
                    const nextStatus = await disconnectDrive();
                    setStatus(nextStatus);
                    showSuccess('Drive Disconnected', 'Google Drive has been disconnected from this account.');
                } catch (error) {
                    showError('Disconnect Failed', error instanceof Error ? error.message : 'Unable to disconnect Google Drive.');
                } finally {
                    setIsDisconnecting(false);
                }
            }
        );
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(139,92,246,0.28),rgba(236,72,153,0.18),rgba(14,165,233,0.12))] p-[1px] mb-8">
                <div className="rounded-[calc(1.5rem-1px)] bg-[#1a0b2e]/95 p-8 md:p-10">
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border ${status.connected ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30' : 'bg-red-500/15 text-red-200 border-red-400/30'}`}>
                                {status.connected ? <CheckCircle2 className="w-4 h-4" /> : <Link2Off className="w-4 h-4" />}
                                {status.connected ? 'Connected' : 'Not connected'}
                            </div>
                            {(isLoading || isConnecting || isDisconnecting) && (
                                <div className="inline-flex items-center gap-2 text-sm text-gray-300">
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Working...
                                </div>
                            )}
                        </div>

                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 border border-white/10 mb-4">
                                <Cloud className="w-4 h-4 text-orange-300" />
                                MindSafe cloud
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Google Drive sync</h1>
                            <p className="text-base md:text-lg text-gray-300 leading-8">
                                Connect Drive once, then upload audio captures, remote camera photos, and SMS exports into
                                <span className="text-white font-semibold"> MindSafe / Device / Feature</span> folders.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="ms-card p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                                        <Folder className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-1">Root folder</p>
                                        <p className="text-white text-lg font-semibold">{status.rootFolderName || 'MindSafe'}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="ms-card p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                                        <Cloud className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-1">Connected account</p>
                                        <p className="text-white text-lg font-semibold">{status.accountEmail || 'No account linked yet'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleConnect}
                                disabled={isLoading || isConnecting || isDisconnecting}
                                className="px-5 py-3 rounded-2xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                            >
                                {status.connected ? 'Reconnect Drive' : 'Connect Google Drive'}
                            </button>
                            {status.connected && (
                                <button
                                    onClick={handleDisconnect}
                                    disabled={isDisconnecting}
                                    className="px-5 py-3 rounded-2xl bg-white/10 border border-white/10 text-white font-semibold hover:bg-white/15 transition-colors disabled:opacity-60"
                                >
                                    Disconnect
                                </button>
                            )}
                            {!status.connected && (
                                <button
                                    onClick={() => showInfo('How uploads work', 'Connect Drive here, then use Upload to Drive on the audio, camera, and SMS pages.')}
                                    className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-gray-200 font-semibold hover:bg-white/10 transition-colors"
                                >
                                    How it works
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
                {FEATURES.map((feature) => {
                    const Icon = feature.icon;
                    return (
                        <div key={feature.id} className="ms-card p-6">
                            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mb-4">
                                <Icon className="w-7 h-7 text-white" />
                            </div>
                            <h2 className="text-xl font-semibold text-white mb-3">{feature.title}</h2>
                            <p className="text-gray-400 leading-7">{feature.description}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
