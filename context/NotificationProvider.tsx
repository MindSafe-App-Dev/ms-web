'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info, Crown, Wifi, WifiOff, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationContextType {
    showSuccess: (title: string, message?: string, duration?: number) => void;
    showError: (title: string, message?: string, duration?: number) => void;
    showWarning: (title: string, message?: string, duration?: number) => void;
    showInfo: (title: string, message?: string, duration?: number) => void;
    showPremium: (title: string, message?: string, onUpgrade?: () => void) => void;
    showConnection: (isConnected: boolean, message?: string) => void;
    showTimeout: (title: string, message?: string, onRetry?: () => void) => void;
    showConfirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'premium' | 'connection' | 'timeout' | 'confirm';

interface NotificationData {
    id: string;
    type: NotificationType;
    title: string;
    message?: string;
    duration?: number;
    onConfirm?: () => void;
    onCancel?: () => void;
    onUpgrade?: () => void;
    onRetry?: () => void;
    isConnected?: boolean;
}

const getNotificationConfig = (type: NotificationType, isConnected?: boolean) => {
    const configs = {
        success: { icon: CheckCircle, colors: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-500' },
        error: { icon: XCircle, colors: 'from-red-500 to-red-600', bg: 'bg-red-500' },
        warning: { icon: AlertTriangle, colors: 'from-amber-500 to-amber-600', bg: 'bg-amber-500' },
        info: { icon: Info, colors: 'from-blue-500 to-blue-600', bg: 'bg-blue-500' },
        premium: { icon: Crown, colors: 'from-amber-500 to-orange-500', bg: 'bg-amber-500' },
        connection: isConnected
            ? { icon: Wifi, colors: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-500' }
            : { icon: WifiOff, colors: 'from-red-500 to-red-600', bg: 'bg-red-500' },
        timeout: { icon: Clock, colors: 'from-amber-500 to-amber-600', bg: 'bg-amber-500' },
        confirm: { icon: Info, colors: 'from-purple-500 to-pink-500', bg: 'bg-purple-500' },
    };
    return configs[type];
};

interface NotificationProviderProps {
    children: ReactNode;
}

export default function NotificationProvider({ children }: NotificationProviderProps) {
    const [notification, setNotification] = useState<NotificationData | null>(null);

    const hideNotification = useCallback(() => {
        setNotification(null);
    }, []);

    const showNotification = useCallback((data: Omit<NotificationData, 'id'>) => {
        const id = Date.now().toString();
        setNotification({ ...data, id });

        if (data.duration && !['confirm', 'premium', 'timeout'].includes(data.type)) {
            setTimeout(hideNotification, data.duration);
        }
    }, [hideNotification]);

    const showSuccess = useCallback((title: string, message?: string, duration = 3000) => {
        showNotification({ type: 'success', title, message, duration });
    }, [showNotification]);

    const showError = useCallback((title: string, message?: string, duration = 4000) => {
        showNotification({ type: 'error', title, message, duration });
    }, [showNotification]);

    const showWarning = useCallback((title: string, message?: string, duration = 3500) => {
        showNotification({ type: 'warning', title, message, duration });
    }, [showNotification]);

    const showInfo = useCallback((title: string, message?: string, duration = 3000) => {
        showNotification({ type: 'info', title, message, duration });
    }, [showNotification]);

    const showPremium = useCallback((title: string, message?: string, onUpgrade?: () => void) => {
        showNotification({ type: 'premium', title, message, onUpgrade });
    }, [showNotification]);

    const showConnection = useCallback((isConnected: boolean, message?: string) => {
        const title = isConnected ? 'Connected' : 'Connection Lost';
        const defaultMessage = isConnected ? 'Successfully connected to server' : 'Please check your connection';
        showNotification({ type: 'connection', title, message: message || defaultMessage, isConnected, duration: 3000 });
    }, [showNotification]);

    const showTimeout = useCallback((title: string, message?: string, onRetry?: () => void) => {
        showNotification({ type: 'timeout', title, message, onRetry });
    }, [showNotification]);

    const showConfirm = useCallback((title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
        showNotification({ type: 'confirm', title, message, onConfirm, onCancel });
    }, [showNotification]);

    const config = notification ? getNotificationConfig(notification.type, notification.isConnected) : null;
    const Icon = config?.icon;

    return (
        <NotificationContext.Provider
            value={{
                showSuccess,
                showError,
                showWarning,
                showInfo,
                showPremium,
                showConnection,
                showTimeout,
                showConfirm,
            }}
        >
            {children}

            <AnimatePresence>
                {notification && config && Icon && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                        onClick={(e) => {
                            if (e.target === e.currentTarget && !['confirm', 'premium', 'timeout'].includes(notification.type)) {
                                hideNotification();
                            }
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className={`w-full max-w-md rounded-2xl bg-gradient-to-br ${config.colors} p-0.5 shadow-2xl`}
                        >
                            <div className="rounded-2xl bg-[#1a0b2e] p-0">
                                {/* Content */}
                                <div className="flex items-start gap-4 p-5">
                                    <div className={`${config.bg} rounded-full p-3 shadow-lg`}>
                                        <Icon size={28} className="text-white" />
                                    </div>
                                    <div className="flex-1 pt-1">
                                        <h3 className="text-lg font-bold text-white">{notification.title}</h3>
                                        {notification.message && (
                                            <p className="mt-1 text-sm text-gray-300">{notification.message}</p>
                                        )}
                                    </div>
                                    {!['confirm', 'premium', 'timeout'].includes(notification.type) && (
                                        <button
                                            onClick={hideNotification}
                                            className="rounded-full p-2 hover:bg-white/10 transition-colors"
                                        >
                                            <X size={20} className="text-white" />
                                        </button>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                {['confirm', 'premium', 'timeout'].includes(notification.type) && (
                                    <div className="flex gap-3 px-5 pb-5">
                                        <button
                                            onClick={() => {
                                                notification.onCancel?.();
                                                hideNotification();
                                            }}
                                            className="flex-1 py-3 px-4 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors"
                                        >
                                            {notification.type === 'premium' ? 'Later' : 'Cancel'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (notification.type === 'confirm') notification.onConfirm?.();
                                                if (notification.type === 'premium') notification.onUpgrade?.();
                                                if (notification.type === 'timeout') notification.onRetry?.();
                                                hideNotification();
                                            }}
                                            className="flex-1 py-3 px-4 rounded-xl bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                                        >
                                            {notification.type === 'premium' && <Crown size={18} />}
                                            {notification.type === 'confirm' && 'Confirm'}
                                            {notification.type === 'premium' && 'Upgrade'}
                                            {notification.type === 'timeout' && 'Retry'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </NotificationContext.Provider>
    );
}
