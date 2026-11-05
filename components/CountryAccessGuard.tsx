'use client';

import React, { useEffect, useState, ReactNode } from 'react';
import { ShieldAlert, Globe, RefreshCw, AlertCircle } from 'lucide-react';
import { BLOCKED_MESSAGE } from '@/lib/countryAccess';

interface CountryAccessState {
  isChecking: boolean;
  allowed: boolean;
  country: string | null;
  countryName: string | null;
  message?: string;
}

interface Props {
  children: ReactNode;
}

export default function CountryAccessGuard({ children }: Props) {
  const [access, setAccess] = useState<CountryAccessState>({
    isChecking: true,
    allowed: true,
    country: null,
    countryName: null,
  });

  const checkAccess = async () => {
    setAccess((prev) => ({ ...prev, isChecking: true }));
    try {
      // 1. Try local route first
      let res = await fetch('/api/country-access');
      if (!res.ok) {
        // Fallback: client-side geo-ip
        const geoRes = await fetch('https://ipwho.is/');
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          const code = geoData?.country_code;
          if (code) {
            res = await fetch(`/api/country-access?country=${encodeURIComponent(code)}`);
          }
        }
      }

      if (res.ok) {
        const data = await res.json();
        setAccess({
          isChecking: false,
          allowed: data.allowed !== false,
          country: data.country || null,
          countryName: data.countryName || null,
          message: data.message || BLOCKED_MESSAGE,
        });
        return;
      }
    } catch (err) {
      console.warn('Country access check error:', err);
    }

    // Default to allowed if network fails to avoid locking out legitimate users on transient error
    setAccess((prev) => ({ ...prev, isChecking: false, allowed: true }));
  };

  useEffect(() => {
    checkAccess();
  }, []);

  if (access.isChecking) {
    return <>{children}</>;
  }

  if (!access.allowed) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4 text-white">
        <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900/90 border border-red-500/30 shadow-2xl shadow-red-500/10 text-center space-y-6">
          <div className="relative mx-auto w-20 h-20 flex items-center justify-center rounded-2xl bg-gradient-to-tr from-red-500/20 to-orange-500/20 border border-red-500/30 text-red-400 shadow-inner">
            <ShieldAlert className="w-10 h-10 animate-pulse text-red-400" />
            <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-slate-900 border border-red-500/40 text-orange-400">
              <Globe className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase font-bold tracking-widest px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
              Access Restricted
            </span>
            <h1 className="text-2xl font-bold text-white pt-2">
              Region Restricted
            </h1>
            <p className="text-gray-300 text-base font-medium">
              {access.message || BLOCKED_MESSAGE}
            </p>
          </div>

          {access.country && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300">
              <span className="text-gray-400">Detected Location:</span>
              <span className="font-semibold text-white">
                {access.countryName || access.country} ({access.country})
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-white/10 space-y-3">
            <p className="text-xs text-gray-400">
              The administrator has restricted access to MindSafe in this territory. If you believe this is an error, please try reconnecting or contact support.
            </p>
            <button
              type="button"
              onClick={checkAccess}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-all hover:scale-[1.01]"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
