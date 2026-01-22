'use client';

import { useState, useRef } from 'react';
import { Smartphone, HelpCircle, ArrowLeft, ArrowRight, Check, ChevronRight, Download, ShieldOff, CheckCircle, Settings, Lock, Key } from 'lucide-react';

const androidVersions = [
    { id: 'android14', name: 'Android 14', version: '14.0', icon: '14', colors: ['#10b981', '#059669'] },
    { id: 'android13', name: 'Android 13', version: '13.0', icon: '13', colors: ['#3b82f6', '#2563eb'] },
    { id: 'android12', name: 'Android 12', version: '12.0', icon: '12', colors: ['#8b5cf6', '#7c3aed'] },
    { id: 'android11', name: 'Android 11', version: '11.0', icon: '11', colors: ['#ec4899', '#db2777'] },
    { id: 'android10', name: 'Android 10', version: '10.0', icon: '10', colors: ['#f59e0b', '#d97706'] },
    { id: 'android9', name: 'Android 9', version: '9.0 (Pie)', icon: '9', colors: ['#ef4444', '#dc2626'] },
];

const deviceManufacturers = [
    { id: 'samsung', name: 'Samsung', colors: ['#1e40af', '#1e3a8a'] },
    { id: 'xiaomi', name: 'Xiaomi', colors: ['#ea580c', '#c2410c'] },
    { id: 'oppo', name: 'Oppo', colors: ['#059669', '#047857'] },
    { id: 'vivo', name: 'Vivo', colors: ['#0891b2', '#0e7490'] },
    { id: 'realme', name: 'Realme', colors: ['#eab308', '#ca8a04'] },
    { id: 'oneplus', name: 'OnePlus', colors: ['#dc2626', '#b91c1c'] },
    { id: 'motorola', name: 'Motorola', colors: ['#7c3aed', '#6d28d9'] },
    { id: 'nokia', name: 'Nokia', colors: ['#0284c7', '#0369a1'] },
    { id: 'other', name: 'Other', colors: ['#6b7280', '#4b5563'] },
];

const walkthroughSteps = [
    { title: "Step 1: Download the Child Application", description: "Go to our official site on the child's device and download the child monitoring app.", icon: Download },
    { title: "Step 2: Allow without scanning", description: "On the child's device, allow the app to be installed without scanning", icon: ShieldOff },
    { title: "Step 3: Allow Permissions", description: "Grant the necessary permissions like location and app usage access.", icon: CheckCircle },
    { title: "Step 4: Allow other Permissions", description: "Grant the necessary permissions like location and app usage access.", icon: Settings },
    { title: "Step 5: Allow Admin Permissions", description: "Grant the admin access to the application.", icon: Lock },
    { title: "Step 6: Enter Child Id", description: "Ensure that the child Id entered is correct, otherwise the application has to be deleted and restarted.", icon: Key },
    { title: "Setup Complete!", description: "You have successfully set up the parental control app. Close the app and ensure it runs in the background.", icon: Check },
];

export default function TutorialPage() {
    const [selectedOS, setSelectedOS] = useState<typeof androidVersions[0] | null>(null);
    const [selectedDevice, setSelectedDevice] = useState<typeof deviceManufacturers[0] | null>(null);
    const [activeStep, setActiveStep] = useState(0);

    const resetSelection = () => {
        setSelectedOS(null);
        setSelectedDevice(null);
        setActiveStep(0);
    };

    // OS Selection Screen
    if (!selectedOS) {
        return (
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6">
                        <Smartphone className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-3">Select Android Version</h1>
                    <p className="text-gray-400">Choose your device&apos;s Android version to see the setup guide</p>
                </div>

                {/* OS Version Cards */}
                <div className="space-y-4 mb-8">
                    {androidVersions.map((os) => (
                        <button
                            key={os.id}
                            onClick={() => setSelectedOS(os)}
                            className="w-full p-1 rounded-2xl transition-all hover:scale-[1.01]"
                            style={{ background: `linear-gradient(135deg, ${os.colors[0]}, ${os.colors[1]})` }}
                        >
                            <div className="bg-[#1a0b2e] rounded-xl p-5 flex items-center gap-5">
                                <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center">
                                    <span className="text-white text-xl font-bold">{os.icon}</span>
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="text-lg font-semibold text-white">{os.name}</h3>
                                    <p className="text-white/60 text-sm">{os.version}</p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                    <ChevronRight className="w-5 h-5 text-white" />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Help Section */}
                <div className="ms-card p-5 flex gap-4">
                    <HelpCircle className="w-6 h-6 text-purple-400 flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold text-white mb-1">Don&apos;t know your Android version?</h4>
                        <p className="text-gray-400 text-sm">Go to Settings → About Phone → Android Version</p>
                    </div>
                </div>
            </div>
        );
    }

    // Device Manufacturer Selection Screen
    if (!selectedDevice) {
        return (
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <button
                        onClick={() => setSelectedOS(null)}
                        className="absolute left-4 lg:left-8 top-4 lg:top-8 p-2 rounded-full ms-card"
                    >
                        <ArrowLeft className="w-5 h-5 text-purple-400" />
                    </button>

                    <div
                        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                        style={{ background: `linear-gradient(135deg, ${selectedOS.colors[0]}, ${selectedOS.colors[1]})` }}
                    >
                        <Smartphone className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-3">Select Device Brand</h1>
                    <p className="text-gray-400">Choose your device manufacturer for specific instructions</p>
                </div>

                {/* Device Manufacturer Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {deviceManufacturers.map((device) => (
                        <button
                            key={device.id}
                            onClick={() => setSelectedDevice(device)}
                            className="p-0.5 rounded-2xl transition-all hover:scale-[1.02]"
                            style={{ background: `linear-gradient(135deg, ${device.colors[0]}, ${device.colors[1]})` }}
                        >
                            <div className="bg-[#1a0b2e] rounded-[0.875rem] p-6 flex flex-col items-center min-h-[120px] justify-center">
                                <Smartphone className="w-7 h-7 text-white mb-3" />
                                <span className="text-white font-semibold">{device.name}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Tutorial Steps Screen
    const currentStep = walkthroughSteps[activeStep];
    const StepIcon = currentStep.icon;
    const progress = ((activeStep + 1) / walkthroughSteps.length) * 100;

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
                <button
                    onClick={resetSelection}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl ms-card"
                >
                    <ArrowLeft className="w-4 h-4 text-purple-400" />
                    <span className="text-purple-300 font-semibold text-sm">Start Over</span>
                </button>

                <div className="flex gap-2">
                    <div
                        className="px-4 py-2 rounded-xl text-white text-sm font-semibold"
                        style={{ background: `linear-gradient(135deg, ${selectedOS.colors[0]}, ${selectedOS.colors[1]})` }}
                    >
                        {selectedOS.name}
                    </div>
                    <div
                        className="px-4 py-2 rounded-xl text-white text-sm font-semibold"
                        style={{ background: `linear-gradient(135deg, ${selectedDevice.colors[0]}, ${selectedDevice.colors[1]})` }}
                    >
                        {selectedDevice.name}
                    </div>
                </div>
            </div>

            {/* Progress */}
            <div className="mb-8">
                <p className="text-gray-400 text-sm mb-2 font-medium">
                    Step {activeStep + 1} of {walkthroughSteps.length}
                </p>
                <div className="h-1.5 bg-purple-500/20 rounded-full overflow-hidden">
                    <div
                        className="h-full gradient-primary rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Step Content */}
            <div className="text-center mb-8">
                {/* Step Icon */}
                <div className="w-16 h-16 rounded-full gradient-primary p-0.5 mx-auto mb-6">
                    <div className="w-full h-full rounded-full bg-[#1a0b2e] flex items-center justify-center">
                        <StepIcon className="w-7 h-7 text-purple-400" />
                    </div>
                </div>

                {/* Screenshot Placeholder */}
                <div className="max-w-sm mx-auto aspect-[9/16] rounded-2xl ms-card flex items-center justify-center mb-6">
                    <div className="text-center p-8">
                        <div className="text-6xl mb-4">📱</div>
                        <p className="text-gray-400 text-sm">Screenshot would appear here</p>
                    </div>
                </div>

                {/* Step Info */}
                <h2 className="text-xl font-bold text-white mb-3">{currentStep.title}</h2>
                <p className="text-gray-400 max-w-md mx-auto">{currentStep.description}</p>
            </div>

            {/* Step Dots */}
            <div className="flex justify-center gap-2 mb-6">
                {walkthroughSteps.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setActiveStep(index)}
                        className={`h-2 rounded-full transition-all ${index === activeStep
                                ? 'w-6 gradient-primary'
                                : 'w-2 bg-purple-500/30'
                            }`}
                    />
                ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-4 justify-center">
                {activeStep > 0 && (
                    <button
                        onClick={() => setActiveStep(activeStep - 1)}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl ms-card"
                    >
                        <ArrowLeft className="w-4 h-4 text-purple-400" />
                        <span className="text-purple-300 font-semibold">Previous</span>
                    </button>
                )}
                {activeStep < walkthroughSteps.length - 1 && (
                    <button
                        onClick={() => setActiveStep(activeStep + 1)}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-white font-semibold"
                    >
                        <span>Next</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
