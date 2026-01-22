'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getCurrentUser, updateUserIsInitial, User } from '@/lib/appwrite';

interface GlobalContextType {
    isLogged: boolean;
    setIsLogged: (value: boolean) => void;
    user: User | null;
    setUser: (user: User | null) => void;
    loading: boolean;
    showOnboarding: boolean;
    setShowOnboarding: (value: boolean) => void;
    handleOnboardingComplete: () => Promise<void>;
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
            }}
        >
            {children}
        </GlobalContext.Provider>
    );
}
