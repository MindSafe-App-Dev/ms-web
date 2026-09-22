'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import {
    MapPin,
    Navigation,
    ExternalLink,
    Share2,
    Plus,
    ShieldCheck,
    Smartphone,
    Link as LinkIcon,
    RefreshCw,
    X,
    Check,
    Cpu,
    UserCheck,
} from 'lucide-react';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useNotification } from '@/context/NotificationProvider';
import { getAllChild, linkChildToParent, createChild, Child } from '@/lib/appwrite';
import { getActiveServerUrl } from '@/lib/runtimeConfig';

export default function ParentalLocationView() {
    const { user, refreshDevUxMode } = useGlobalContext();
    const { showSuccess, showError, showWarning, showInfo } = useNotification();

    const [childrenList, setChildrenList] = useState<Child[]>([]);
    const [selectedChild, setSelectedChild] = useState<Child | null>(null);
    const [loadingChildren, setLoadingChildren] = useState(true);

    // Socket & Location State
    const [isConnected, setIsConnected] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [lastUpdatedTime, setLastUpdatedTime] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Pair Child Modal State
    const [isPairModalOpen, setIsPairModalOpen] = useState(false);
    const [pairTab, setPairTab] = useState<'link' | 'create'>('link');
    const [pairChildCode, setPairChildCode] = useState('');
    const [pairChildName, setPairChildName] = useState('');
    const [isPairing, setIsPairing] = useState(false);

    const socketRef = useRef<Socket | null>(null);

    const loadChildren = useCallback(async () => {
        if (!user?.$id) return;
        try {
            const data = await getAllChild(user.$id);
            setChildrenList(data || []);
            if (data && data.length > 0) {
                setSelectedChild((prev) => {
                    if (!prev) return data[0];
                    const existing = data.find((c) => c.$id === prev.$id);
                    return existing || data[0];
                });
            } else {
                setSelectedChild(null);
            }
        } catch (err) {
            console.error('Failed to load children in web ParentalLocationView:', err);
        } finally {
            setLoadingChildren(false);
        }
    }, [user?.$id]);

    useEffect(() => {
        loadChildren();
    }, [loadChildren]);

    // Socket connection
    useEffect(() => {
        if (!selectedChild) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            setIsConnected(false);
            return;
        }

        let isMounted = true;

        const initSocket = async () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }

            const activeUrl = selectedChild.server_url || (await getActiveServerUrl());
            if (!activeUrl) {
                showError('Connection Failed', 'Location server URL is not configured.');
                return;
            }

            const sock = io(activeUrl, {
                query: {
                    id: user?.$id || user?.accountId || 'controller',
                    type: 'controller',
                },
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 2000,
            });

            socketRef.current = sock;

            sock.on('connect', () => {
                if (!isMounted) return;
                setIsConnected(true);
                // Auto request location upon connect
                requestLocation(sock, selectedChild.victim_id);
            });

            sock.on('disconnect', () => {
                if (!isMounted) return;
                setIsConnected(false);
            });

            sock.on('result', (data: any) => {
                if (!isMounted) return;
                setIsLocating(false);
                console.log('Web ParentalView received result:', data);

                if (data?.enable || data?.success) {
                    const lat = data.latitude ?? data.lat;
                    const lng = data.longitude ?? data.lng;

                    if ((lat === 0 && lng === 0) || lat === undefined || lng === undefined) {
                        setErrorMessage('Invalid location coordinates received.');
                        showWarning('Location Warning', 'Received invalid coordinates from device.');
                    } else {
                        const newLoc = { latitude: Number(lat), longitude: Number(lng) };
                        setLocation(newLoc);
                        setLastUpdatedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                        setErrorMessage(null);
                        showSuccess('Location Updated', `Child GPS: ${newLoc.latitude.toFixed(4)}, ${newLoc.longitude.toFixed(4)}`);
                    }
                } else {
                    setErrorMessage('Location service is unavailable on the child device.');
                }
            });

            sock.on('error', (err: any) => {
                if (!isMounted) return;
                setIsLocating(false);
                console.error('Socket error in web parental view:', err);
            });
        };

        initSocket();

        return () => {
            isMounted = false;
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [selectedChild?.$id, selectedChild?.victim_id, user?.$id]);

    const requestLocation = (activeSocket = socketRef.current, childVictimId = selectedChild?.victim_id) => {
        if (!activeSocket || !childVictimId) {
            showError('Unavailable', 'Child device is not connected.');
            return;
        }

        setIsLocating(true);
        setErrorMessage(null);
        activeSocket.emit('command', {
            userId: childVictimId,
            command: { order: 'x0000lm' },
        });
        showInfo('Requesting GPS', 'Pinging child device for real-time location...');
    };

    const handleLinkChild = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pairChildCode.trim()) {
            showError('Missing Information', 'Please enter a Child Device ID or Code.');
            return;
        }

        setIsPairing(true);
        try {
            if (pairTab === 'link') {
                await linkChildToParent(user?.$id || user?.accountId || '', pairChildCode.trim(), pairChildName.trim());
                showSuccess('Paired Successfully!', `Child device ${pairChildCode.trim()} linked to your account.`);
            } else {
                await createChild({
                    client_id: user?.$id || user?.accountId || '',
                    victim_name: pairChildName.trim() || 'New Child Device',
                    victim_id: pairChildCode.trim() || `CHILD-${Math.floor(100000 + Math.random() * 900000)}`,
                });
                showSuccess('Device Created!', 'New child device record created successfully.');
            }

            setPairChildCode('');
            setPairChildName('');
            setIsPairModalOpen(false);
            await loadChildren();
        } catch (err: any) {
            console.error('Pairing child error:', err);
            showError('Pairing Failed', err?.message || 'Could not link child device.');
        } finally {
            setIsPairing(false);
        }
    };

    const handleOpenExternalMaps = () => {
        if (!location) return;
        window.open(`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`, '_blank');
    };

    const handleShareLocation = async () => {
        if (!location || !selectedChild) return;
        const name = (selectedChild.victime_name || '').split('|')[0] || 'Child';
        const mapsUrl = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
        const text = `MindSafe Alert: ${name}'s live location is at ${mapsUrl} (${lastUpdatedTime || 'Just now'})`;

        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({ title: `${name}'s Live Location`, text, url: mapsUrl });
                return;
            } catch {}
        }

        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            await navigator.clipboard.writeText(mapsUrl);
            showSuccess('Link Copied!', 'Live Google Maps link copied to clipboard.');
        }
    };

    const mapHtmlUrl = location
        ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}&z=17&output=embed`
        : null;

    const childDisplayName = (selectedChild?.victime_name || '').split('|')[0] || 'Child Device';

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-[#160728] border border-purple-500/20 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-black text-white">Parental Safety Hub</h1>
                            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                                {isConnected ? 'Live Network Active' : 'Connecting...'}
                            </span>
                        </div>
                        <p className="text-xs text-gray-400">Real-time GPS Tracking & Child Safety Monitor</p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        setPairTab('link');
                        setPairChildCode('');
                        setPairChildName('');
                        setIsPairModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-white text-xs font-bold hover:opacity-90 transition-opacity self-start sm:self-auto shadow-md shadow-orange-500/20"
                >
                    <Plus className="w-4 h-4" />
                    Pair Child Device
                </button>
            </div>

            {/* Child Selector Strip */}
            <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Paired Children</h2>
                    <span className="text-xs text-purple-400">{childrenList.length} device{childrenList.length === 1 ? '' : 's'} linked</span>
                </div>

                {loadingChildren ? (
                    <div className="p-8 text-center text-sm text-gray-400">Loading child devices...</div>
                ) : childrenList.length === 0 ? (
                    <div className="p-8 rounded-3xl bg-[#160728] border border-purple-500/20 text-center space-y-3">
                        <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto text-orange-400">
                            <Smartphone className="w-7 h-7" />
                        </div>
                        <h3 className="text-white font-bold text-base">No Child Devices Paired</h3>
                        <p className="text-gray-400 text-xs max-w-sm mx-auto">
                            Pair your child&apos;s phone or registered account using their Child Device ID to start tracking their live GPS location.
                        </p>
                        <button
                            type="button"
                            onClick={() => setIsPairModalOpen(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-white text-xs font-bold hover:opacity-90 transition-opacity shadow-lg shadow-orange-500/20"
                        >
                            <Plus className="w-4 h-4" />
                            Pair Child Now
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                        {childrenList.map((child) => {
                            const isSelected = selectedChild?.$id === child.$id;
                            const name = (child.victime_name || '').split('|')[0] || 'Child';
                            const initials = name.slice(0, 2).toUpperCase();

                            return (
                                <button
                                    key={child.$id}
                                    type="button"
                                    onClick={() => setSelectedChild(child)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all shrink-0 min-w-[170px] ${
                                        isSelected
                                            ? 'bg-purple-950/80 border-orange-400 shadow-lg shadow-orange-500/10'
                                            : 'bg-[#160728] border-purple-500/20 hover:border-purple-500/40'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white ${
                                        isSelected ? 'gradient-primary' : 'bg-purple-900/40'
                                    }`}>
                                        {initials}
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`font-bold text-sm truncate ${isSelected ? 'text-orange-400' : 'text-white'}`}>
                                            {name}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className={`w-2 h-2 rounded-full ${isSelected && isConnected ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                                            <span className="text-[10px] text-gray-400">
                                                {isSelected ? (isConnected ? 'Online' : 'Connecting') : 'Paired'}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Map & Live Location Card */}
            {selectedChild && (
                <div className="p-6 rounded-3xl bg-[#160728] border border-purple-500/20 space-y-4">
                    {/* Top status bar in map card */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-500/20">
                        <div>
                            <h2 className="text-lg font-bold text-white">{childDisplayName}</h2>
                            <p className="text-xs text-gray-400">ID: {selectedChild.victim_id}</p>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                <MapPin className="w-3.5 h-3.5" />
                                {location ? 'GPS Active' : isLocating ? 'Pinging GPS...' : 'Standby'}
                            </span>
                        </div>
                    </div>

                    {/* Interactive Map Embed */}
                    <div className="relative w-full h-[380px] lg:h-[460px] rounded-2xl overflow-hidden bg-[#10031f] border border-purple-500/20">
                        {location && mapHtmlUrl ? (
                            <iframe
                                src={mapHtmlUrl}
                                title={`${childDisplayName} live location`}
                                className="w-full h-full border-0"
                                loading="lazy"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                                {isLocating ? (
                                    <div className="space-y-3">
                                        <div className="w-12 h-12 rounded-full border-3 border-orange-500 border-t-transparent animate-spin mx-auto" />
                                        <p className="text-sm font-semibold text-orange-400">
                                            Requesting live GPS location from child device...
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-w-sm">
                                        <div className="w-14 h-14 rounded-2xl bg-purple-900/30 flex items-center justify-center mx-auto text-purple-400">
                                            <Navigation className="w-7 h-7" />
                                        </div>
                                        <h3 className="text-white font-bold text-sm">GPS Location Standby</h3>
                                        <p className="text-xs text-gray-400">
                                            {errorMessage || 'Tap "Refresh Live Location" to ping your child&apos;s device for instant GPS coordinates.'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {isLocating && location && (
                            <div className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md text-white text-xs font-semibold">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-400" />
                                Refreshing GPS...
                            </div>
                        )}
                    </div>

                    {/* Coordinates & Timestamp Banner */}
                    {location && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-black/30 border border-purple-500/20 text-left">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">Coordinates</span>
                                <span className="text-xs font-mono font-bold text-white">
                                    {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">Last Updated</span>
                                <span className="text-xs font-bold text-emerald-400">
                                    {lastUpdatedTime || 'Just now'}
                                </span>
                            </div>
                            <div className="col-span-2 sm:col-span-1 flex items-center sm:justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={handleOpenExternalMaps}
                                    className="p-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition-colors"
                                    title="Open in Google Maps"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleShareLocation}
                                    className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-colors"
                                    title="Share Location"
                                >
                                    <Share2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => requestLocation()}
                            disabled={isLocating}
                            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl gradient-primary text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-orange-500/20"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                            {isLocating ? 'Pinging Child Device...' : 'Refresh Live Location'}
                        </button>
                    </div>
                </div>
            )}

            {/* Pair Child Modal */}
            {isPairModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="w-full max-w-md p-6 rounded-3xl bg-[#180a2b] border border-purple-500/30 shadow-2xl space-y-5 animate-slide-up">
                        {/* Modal Header & Tabs */}
                        <div className="flex items-center justify-between pb-3 border-b border-purple-500/20">
                            <h3 className="text-lg font-bold text-white">Pair Child Device</h3>
                            <button
                                type="button"
                                onClick={() => setIsPairModalOpen(false)}
                                className="p-1 rounded-lg text-gray-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Switcher */}
                        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-black/30 border border-purple-500/20">
                            <button
                                type="button"
                                onClick={() => setPairTab('link')}
                                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                                    pairTab === 'link' ? 'gradient-primary text-white' : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <LinkIcon className="w-3.5 h-3.5" />
                                Link Child Code
                            </button>
                            <button
                                type="button"
                                onClick={() => setPairTab('create')}
                                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                                    pairTab === 'create' ? 'gradient-primary text-white' : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <Cpu className="w-3.5 h-3.5" />
                                New Device
                            </button>
                        </div>

                        <form onSubmit={handleLinkChild} className="space-y-4">
                            <div>
                                <label className="block text-gray-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                                    {pairTab === 'link' ? 'Child Device ID / Code' : 'Device ID (Auto/Custom)'}
                                </label>
                                <input
                                    type="text"
                                    value={pairChildCode}
                                    onChange={(e) => setPairChildCode(e.target.value)}
                                    placeholder={pairTab === 'link' ? 'e.g. CHILD-738291' : 'Leave empty for auto-generated ID'}
                                    className="ms-input"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                                    Child / Device Name (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={pairChildName}
                                    onChange={(e) => setPairChildName(e.target.value)}
                                    placeholder="e.g. Emma's Phone"
                                    className="ms-input"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isPairing}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl gradient-primary text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 mt-4"
                            >
                                {isPairing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Linking...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        {pairTab === 'link' ? 'Link Child Account' : 'Create & Pair Device'}
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
