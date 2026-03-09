'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useNotification } from '@/context/NotificationProvider';
import Link from 'next/link';
import {
    Camera, Mic, Phone, Users, MessageSquare, MapPin, Folder,
    Smartphone, Crown, Lock, ArrowLeft, ChevronRight
} from 'lucide-react';

const features = [
    { id: 'camera', title: 'Camera', description: 'Capture photos remotely', icon: Camera, premium: true },
    { id: 'microphone', title: 'Microphone', description: 'Record audio', icon: Mic, premium: true },
    { id: 'calls', title: 'Call Logs', description: 'View call history', icon: Phone, premium: true },
    { id: 'contacts', title: 'Contacts', description: 'Access contact list', icon: Users, premium: true },
    { id: 'sms', title: 'SMS', description: 'Read messages', icon: MessageSquare, premium: true },
    { id: 'location', title: 'Location', description: 'Track device location', icon: MapPin, premium: false },
    { id: 'files', title: 'File Manager', description: 'Browse and download files', icon: Folder, premium: true },
];

export default function DeviceOptionsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { showInfo } = useNotification();

    const deviceName = searchParams.get('name') || 'Unknown Device';
    const deviceId = searchParams.get('deviceId') || '';
    const isPremiumParam = searchParams.get('isPremium');
    const isPremium = isPremiumParam === 'true' || isPremiumParam === 'True' || isPremiumParam === '1';

    const handleFeatureClick = async (feature: typeof features[0]) => {
        const isLocked = feature.premium && !isPremium;

        if (isLocked) {
            showInfo('Trial Mode', `${feature.title} trial is counted when you perform an action in that tool.`);
        }

        router.push(`/device/${feature.id}?name=${encodeURIComponent(deviceName)}&deviceId=${deviceId}`);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <button
                    onClick={() => router.push('/home')}
                    className="flex items-center gap-2 p-2 rounded-xl bg-orange-500/15 border border-orange-500/30 mb-4"
                >
                    <ArrowLeft className="w-5 h-5 text-orange-400" />
                </button>

                <div className="ms-card p-5 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center">
                        <Smartphone className="w-7 h-7 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-gray-400 text-xs mb-1">Monitoring</p>
                        <h1 className="text-xl font-bold text-white truncate">{deviceName}</h1>
                        <div className="flex items-center gap-1.5 mt-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span className="text-emerald-400 text-xs font-semibold">Connected</span>
                        </div>
                    </div>

                    {isPremium && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/15 border border-yellow-500/30">
                            <Crown className="w-4 h-4 text-yellow-400" />
                            <span className="text-yellow-400 text-xs font-semibold">Premium</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="mb-4">
                <h2 className="text-2xl font-bold text-white">Monitoring Tools</h2>
                <p className="text-gray-400 mt-1">Select a feature to start monitoring</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {features.map((feature) => {
                    const isLocked = feature.premium && !isPremium;
                    const Icon = feature.icon;

                    return (
                        <button
                            key={feature.id}
                            onClick={() => handleFeatureClick(feature)}
                            className={`ms-card p-5 text-left transition-all ${isLocked
                                ? 'bg-gray-800/40 border-gray-700/30'
                                : 'ms-card-hover'
                                }`}
                        >
                            <div className="flex flex-col items-center text-center">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isLocked
                                    ? 'bg-gray-700/30 border border-gray-600/30'
                                    : 'bg-orange-500/15 border border-orange-500/30'
                                    }`}>
                                    {isLocked ? (
                                        <Lock className="w-8 h-8 text-gray-500" />
                                    ) : (
                                        <Icon className="w-8 h-8 text-orange-400" />
                                    )}
                                </div>

                                <h3 className={`text-base font-bold mb-1 ${isLocked ? 'text-gray-400' : 'text-white'}`}>
                                    {feature.title}
                                </h3>

                                <p className={`text-xs mb-3 ${isLocked ? 'text-gray-600' : 'text-gray-300'}`}>
                                    {feature.description}
                                </p>

                                {isLocked && (
                                    <div className="px-3 py-1 rounded-full bg-gray-700/30 border border-gray-600/30">
                                        <span className="text-gray-400 text-xs font-semibold">Premium</span>
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {!isPremium && (
                <Link
                    href="/premium"
                    className="block ms-card p-5 gradient-premium hover:opacity-90 transition-opacity"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                            <Crown className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-white mb-1">Unlock All Features</h3>
                            <p className="text-white/90 text-sm">Get unlimited access to all monitoring tools</p>
                        </div>
                        <ChevronRight className="w-6 h-6 text-white" />
                    </div>
                </Link>
            )}
        </div>
    );
}
