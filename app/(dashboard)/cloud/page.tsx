'use client';

import { useState } from 'react';
import { useNotification } from '@/context/NotificationProvider';
import { Cloud, Shield, Share2, Monitor, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';

const features = [
    { id: 1, title: 'Secure Storage', description: 'Your data is protected with top-notch encryption.', icon: Shield },
    { id: 2, title: 'Easy Sharing', description: 'Share files effortlessly with your friends and family.', icon: Share2 },
    { id: 3, title: 'Cross-Platform', description: 'Access your files from any device, anywhere.', icon: Monitor },
    { id: 4, title: 'Affordable Plans', description: 'Choose a plan that suits your needs and budget.', icon: DollarSign },
];

export default function CloudPage() {
    const { showSuccess } = useNotification();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const handleNotify = () => {
        setIsLoading(true);
        setTimeout(() => {
            showSuccess('Notification Set', "You'll be notified when we launch!");
            setIsLoading(false);
        }, 1000);
    };

    const scrollToIndex = (direction: 'next' | 'prev') => {
        if (direction === 'next' && currentIndex < features.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else if (direction === 'prev' && currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="relative rounded-3xl overflow-hidden mb-8" style={{ height: '40vh', minHeight: '300px' }}>
                {/* Background Image */}
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: 'url(https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRRzvB427U-5yu1NXMb84iU_LVbxQVKYq5SI0daZhxl3fcPG_ON_wplOQ85Sku-shzdgm8&usqp=CAU)',
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a0b2e] via-[#1a0b2e]/50 to-transparent" />

                {/* Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                    <Cloud className="w-16 h-16 text-purple-400 mb-4" />
                    <h1 className="text-4xl md:text-5xl font-bold text-purple-900 mb-6">
                        Coming Soon
                    </h1>
                    <button
                        onClick={handleNotify}
                        disabled={isLoading}
                        className="ms-btn ms-btn-primary"
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing...
                            </div>
                        ) : (
                            'Notify Me'
                        )}
                    </button>
                </div>
            </div>

            {/* Features Section */}
            <div className="mb-8">
                {/* Header with Navigation */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => scrollToIndex('prev')}
                        disabled={currentIndex === 0}
                        className={`p-3 rounded-full ms-card transition-all ${currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-500/20'
                            }`}
                    >
                        <ChevronLeft className={`w-5 h-5 ${currentIndex === 0 ? 'text-gray-500' : 'text-purple-400'}`} />
                    </button>

                    <h2 className="text-xl font-semibold text-white">What to Expect</h2>

                    <button
                        onClick={() => scrollToIndex('next')}
                        disabled={currentIndex === features.length - 1}
                        className={`p-3 rounded-full ms-card transition-all ${currentIndex === features.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-500/20'
                            }`}
                    >
                        <ChevronRight className={`w-5 h-5 ${currentIndex === features.length - 1 ? 'text-gray-500' : 'text-purple-400'}`} />
                    </button>
                </div>

                {/* Feature Cards */}
                <div className="overflow-hidden">
                    <div
                        className="flex transition-transform duration-300 ease-out"
                        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                    >
                        {features.map((feature) => {
                            const Icon = feature.icon;
                            return (
                                <div
                                    key={feature.id}
                                    className="w-full flex-shrink-0 px-2"
                                >
                                    <div className="ms-card p-8 text-center">
                                        <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
                                            <Icon className="w-8 h-8 text-white" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                                        <p className="text-gray-400">{feature.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Dots */}
                <div className="flex justify-center gap-2 mt-6">
                    {features.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`h-2 rounded-full transition-all ${index === currentIndex
                                    ? 'w-6 gradient-primary'
                                    : 'w-2 bg-purple-500/30'
                                }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
