'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { getCurrentUser, updateUserIsInitial, User, client, appwriteConfig } from '@/lib/appwrite';
import { getDevUxMode } from '@/lib/runtimeConfig';

interface GlobalContextType {
    isLogged: boolean;
    setIsLogged: (value: boolean) => void;
    user: User | null;
    setUser: (user: User | null) => void;
    loading: boolean;
    showOnboarding: boolean;
    setShowOnboarding: (value: boolean) => void;
    handleOnboardingComplete: () => Promise<void>;
    devUxMode: boolean;
    loadingDevUxMode: boolean;
    refreshDevUxMode: (options?: { forceRefresh?: boolean }) => Promise<boolean>;
    userRole: 'parent' | 'child';
    childId: string;
    setUserRole: (role: 'parent' | 'child') => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const useGlobalContext = () => {
    const context = useContext(GlobalContext);
    if (!context) {
        throw new Error('useGlobalContext must be used within a GlobalProvider');
    }
    return context;
};

interface GlobalProviderProps {
    children: ReactNode;
}

export default function GlobalProvider({ children }: GlobalProviderProps) {
    const [isLogged, setIsLogged] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [devUxMode, setDevUxMode] = useState(false);
    const [loadingDevUxMode, setLoadingDevUxMode] = useState(true);

    const refreshDevUxMode = useCallback(async ({ forceRefresh = true } = {}) => {
        try {
            const isDevUx = await getDevUxMode({ forceRefresh });
            setDevUxMode(Boolean(isDevUx));
            return Boolean(isDevUx);
        } catch (err) {
            console.log('Failed to refresh Dev UX mode in web GlobalProvider:', err);
            return false;
        } finally {
            setLoadingDevUxMode(false);
        }
    }, []);

    // Live effect: realtime Appwrite subscription + initial check + interval polling + window focus & visibilitychange
    useEffect(() => {
        refreshDevUxMode({ forceRefresh: true });

        // Realtime Appwrite listener for instant switch when Admin changes toggle
        let unsubscribeRealtime: (() => void) | null = null;
        try {
            unsubscribeRealtime = client.subscribe(
                `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.adminSettingsCollectionId}.documents`,
                (response) => {
                    const payload: any = response?.payload;
                    const relevantKeys = ['dev_ux_mode', 'dev_ux_versions', 'primary_app_versions'];
                    if (!payload?.key || relevantKeys.includes(payload.key)) {
                        console.log('Admin Dev UX setting changed in realtime, updating web UI immediately...');
                        refreshDevUxMode({ forceRefresh: true });
                    }
                }
            );
        } catch (subErr) {
            console.warn('Realtime subscription to admin settings unavailable:', subErr);
        }

        const interval = setInterval(() => {
            refreshDevUxMode({ forceRefresh: true });
        }, 5000);

        const handleFocus = () => {
            refreshDevUxMode({ forceRefresh: true });
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                refreshDevUxMode({ forceRefresh: true });
            }
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (unsubscribeRealtime) {
                try {
                    unsubscribeRealtime();
                } catch {}
            }
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [refreshDevUxMode]);

    useEffect(() => {
        getCurrentUser()
            .then((res) => {
                if (res) {
                    setIsLogged(true);
                    setUser(res);

                    // Check if user needs onboarding
                    if (res.isInitial === false || res.isInitial === undefined) {
                        setShowOnboarding(true);
                    }
                } else {
                    setIsLogged(false);
                    setUser(null);
                }
            })
            .catch((error) => {
                console.log('Auth check error:', error);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const handleOnboardingComplete = async () => {
        try {
            if (user) {
                await updateUserIsInitial(user.$id, true);
                setUser({ ...user, isInitial: true });
                setShowOnboarding(false);
            }
        } catch (error) {
            console.error('Error completing onboarding:', error);
        }
    };

    const userRole: 'parent' | 'child' = user?.role || 'parent';
    const childId: string = user?.childId || '';

    const setUserRole = (role: 'parent' | 'child') => {
        if (user) {
            setUser({ ...user, role });
        }
    };

    return (
        <GlobalContext.Provider
            value={{
                isLogged,
                setIsLogged,
                user,
                setUser,
                loading,
                showOnboarding,
                setShowOnboarding,
                handleOnboardingComplete,
                devUxMode,
                loadingDevUxMode,
                refreshDevUxMode,
                userRole,
                childId,
                setUserRole,
            }}
        >
            {children}
        </GlobalContext.Provider>
    );
}
