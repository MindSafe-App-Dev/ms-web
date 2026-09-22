'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import io, { Socket } from 'socket.io-client';
import { Shield, Smartphone, Navigation, HeartHandshake, LogOut, Check, Copy } from 'lucide-react';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useNotification } from '@/context/NotificationProvider';
import { signOut } from '@/lib/appwrite';
import { getActiveServerUrl, reportUserAppSession } from '@/lib/runtimeConfig';

export default function ChildSafetyView() {
    const router = useRouter();
    const { user, childId } = useGlobalContext();
    const { showSuccess } = useNotification();

    const [copied, setCopied] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [lastPingTime, setLastPingTime] = useState<string | null>(null);
    const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number }>({
        latitude: 37.7749,
        longitude: -122.4194,
    });

    const socketRef = useRef<Socket | null>(null);
    const effectiveChildId = user?.childId || childId || `CHILD-${user?.$id?.slice(-6) || 'SAFE'}`;

    const updateLocationFromBrowser = useCallback(() => {
        if (typeof window !== 'undefined' && 'geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setCurrentCoords({ latitude, longitude });
                    setLastPingTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

                    reportUserAppSession({
                        email: user?.email,
                        username: user?.username,
                        userId: user?.$id,
                        role: 'child',
                        childId: effectiveChildId,
                        location: { latitude, longitude },
                    }).catch(() => null);
                },
                () => {
                    setLastPingTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
            );
        } else {
            setLastPingTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
    }, [user?.email, user?.username, user?.$id, effectiveChildId]);

    // Socket client connection & command listener
    useEffect(() => {
        let isMounted = true;

        const initChildSocket = async () => {
            try {
                const activeUrl = await getActiveServerUrl();
                if (!activeUrl) return;

                if (socketRef.current) {
                    socketRef.current.disconnect();
                    socketRef.current = null;
                }

                const sock = io(activeUrl, {
                    query: {
                        id: effectiveChildId,
                        type: 'client',
                    },
                    reconnection: true,
                    reconnectionAttempts: 10,
                    reconnectionDelay: 2000,
                });

                socketRef.current = sock;

                sock.on('connect', () => {
                    if (!isMounted) return;
                    setIsConnected(true);
                    updateLocationFromBrowser();
                });

                sock.on('disconnect', () => {
                    if (!isMounted) return;
                    setIsConnected(false);
                });

                // Listen for location request from parent: { order: "x0000lm" }
                sock.on('command', (data: any) => {
                    if (!isMounted) return;
                    console.log('Web Child received parent command:', data);

                    if (data?.order === 'x0000lm' || data?.command?.order === 'x0000lm') {
                        updateLocationFromBrowser();
                        const payload = {
                            enable: true,
                            success: true,
                            latitude: currentCoords.latitude,
                            longitude: currentCoords.longitude,
                            lat: currentCoords.latitude,
                            lng: currentCoords.longitude,
                            timestamp: Date.now(),
                        };
                        sock.emit('result', payload);
                        console.log('Web Child emitted live GPS to parent:', payload);
                    }
                });
            } catch (err) {
                console.error('Child socket error:', err);
            }
        };

        initChildSocket();
        updateLocationFromBrowser();

        const locInterval = setInterval(updateLocationFromBrowser, 30000);

        return () => {
            isMounted = false;
            clearInterval(locInterval);
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [effectiveChildId, currentCoords.latitude, currentCoords.longitude, updateLocationFromBrowser]);

    const copyCode = () => {
        if (typeof window !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(effectiveChildId);
            setCopied(true);
            showSuccess('Copied!', `Child Code ${effectiveChildId} copied to clipboard`);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut();
            router.replace('/sign-in');
        } catch (err) {
            console.error('Sign out error:', err);
        }
    };

    return (
        <div className="min-h-screen bg-[#0e031a] flex flex-col items-center justify-center p-4 lg:p-8">
            <div className="w-full max-w-xl space-y-6">
                {/* Header status bar */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#1a0b2e]/80 border border-purple-500/20 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                            <span className="text-white font-bold text-sm">MS</span>
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-sm">MindSafe Child Mode</h2>
                            <p className="text-xs text-gray-400">Device Protected & Active</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                        <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                        <span className="text-xs font-semibold text-emerald-400">
                            {isConnected ? 'Online & Secured' : 'Connecting...'}
                        </span>
                    </div>
                </div>

                {/* Hero Graphic Card */}
                <div className="p-8 rounded-3xl bg-gradient-to-b from-purple-950/40 to-[#140522] border border-purple-500/20 text-center flex flex-col items-center shadow-2xl shadow-purple-950/50">
                    <div className="relative mb-6">
                        <div className="w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-pulse">
                            <Shield className="w-12 h-12 text-emerald-400" />
                        </div>
                    </div>

                    <h1 className="text-2xl lg:text-3xl font-extrabold text-white mb-2">
                        MindSafe Protection Active
                    </h1>
                    <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
                        This web session is securely registered as a child profile. Live GPS location is transmitted in real time to your parent account.
                    </p>
                </div>

                {/* Child Device ID & Pairing Card */}
                <div className="p-6 rounded-2xl bg-[#180a2b] border border-purple-500/20">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                            <Smartphone className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm">Child Device ID</h3>
                            <p className="text-xs text-gray-400">Provide this code to your parent to pair devices</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/30 border border-purple-500/30">
                        <span className="font-mono text-lg font-bold text-orange-400 tracking-wider">
                            {effectiveChildId}
                        </span>
                        <button
                            type="button"
                            onClick={copyCode}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white transition-all ${
                                copied ? 'bg-emerald-600' : 'gradient-primary hover:opacity-90'
                            }`}
                        >
                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? 'Copied' : 'Copy Code'}
                        </button>
                    </div>
                </div>

                {/* Live Telemetry Card */}
                <div className="p-6 rounded-2xl bg-[#180a2b] border border-purple-500/20">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <Navigation className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm">GPS Telemetry</h3>
                            <p className="text-xs text-gray-400">Responds dynamically to parental location pings</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-left">
                        <div className="p-3 rounded-xl bg-black/20 border border-purple-500/10">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Status</span>
                            <span className="text-sm font-semibold text-emerald-400">
                                {isConnected ? 'Transmitting GPS' : 'Standby'}
                            </span>
                        </div>
                        <div className="p-3 rounded-xl bg-black/20 border border-purple-500/10">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Last Update</span>
                            <span className="text-sm font-semibold text-white">
                                {lastPingTime || 'Just now'}
                            </span>
                        </div>
                        <div className="col-span-2 p-3 rounded-xl bg-black/20 border border-purple-500/10">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Coordinates</span>
                            <span className="text-sm font-mono text-purple-300">
                                {currentCoords.latitude.toFixed(4)}, {currentCoords.longitude.toFixed(4)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Zero-action notice */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-purple-900/10 border border-purple-500/20 text-purple-300 text-xs">
                    <HeartHandshake className="w-5 h-5 text-purple-400 shrink-0" />
                    <span>
                        There are no configuration settings or actions needed. You can safely keep this browser tab running in the background.
                    </span>
                </div>

                {/* Sign Out Button */}
                <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 font-semibold text-sm transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out Child Device
                </button>
            </div>
        </div>
    );
}
