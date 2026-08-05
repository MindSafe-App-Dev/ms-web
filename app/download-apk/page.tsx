'use client';

import { useEffect, useState } from 'react';
import { getActiveApkVersion, getFileDownloadUrl, ApkVersion } from '@/lib/appwrite';
import { Smartphone, Download, Loader2, AlertTriangle, ShieldCheck, CheckCircle2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function DownloadApkPage() {
    const [activeVersion, setActiveVersion] = useState<ApkVersion | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloadUrl, setDownloadUrl] = useState('');

    useEffect(() => {
        const fetchActiveVersion = async () => {
            try {
                const ver = await getActiveApkVersion();
                if (ver) {
                    setActiveVersion(ver);
                    const url = getFileDownloadUrl(ver.fileId);
                    setDownloadUrl(url);
                }
            } catch (err) {
                console.error('Error fetching active APK:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchActiveVersion();
    }, []);

    return (
        <div className="min-h-screen bg-[#0e051a] text-white flex flex-col justify-between selection:bg-purple-500 selection:text-white font-sans antialiased">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />

            {/* Header */}
            <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
                <Link href="/home" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                        <span className="text-white font-bold">MS</span>
                    </div>
                    <span className="text-xl font-bold tracking-wide bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">MindSafe</span>
                </Link>
                <Link href="/home" className="text-sm font-semibold text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
                    Dashboard <ChevronRight className="w-4 h-4" />
                </Link>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
                <div className="w-full max-w-xl">
                    <div className="gradient-border">
                        <div className="bg-[#1a0b2e]/90 backdrop-blur-xl rounded-[2rem] p-8 md:p-10 shadow-2xl border border-purple-500/10 relative overflow-hidden">
                            {/* Glass overlay */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

                            <div className="relative z-10 flex flex-col items-center text-center">
                                {/* Logo / Icon */}
                                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 to-orange-500 p-0.5 shadow-xl shadow-purple-500/10 mb-6 flex items-center justify-center">
                                    <div className="w-full h-full rounded-[1.375rem] bg-[#1a0b2e] flex items-center justify-center">
                                        <Smartphone className="w-10 h-10 text-orange-400 animate-pulse" />
                                    </div>
                                </div>

                                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
                                    Download <span className="bg-gradient-to-r from-orange-400 to-purple-400 bg-clip-text text-transparent">MindSafe App</span>
                                </h1>
                                <p className="text-gray-400 text-sm md:text-base max-w-sm mb-8 leading-relaxed">
                                    Install the client application on the child's device to begin secure cloud synchronization.
                                </p>

                                {loading ? (
                                    <div className="py-12 flex flex-col items-center justify-center gap-3">
                                        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                                        <span className="text-gray-400 text-sm font-medium">Verifying latest release...</span>
                                    </div>
                                ) : activeVersion ? (
                                    <div className="w-full space-y-6">
                                        {/* Download Action */}
                                        <a 
                                            href={downloadUrl}
                                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-purple-600 text-white font-bold text-lg hover:opacity-95 shadow-xl shadow-orange-500/15 active:scale-[0.99] transition-all flex items-center justify-center gap-3"
                                        >
                                            <Download className="w-6 h-6" />
                                            Download APK (v{activeVersion.version})
                                        </a>

                                        {/* Release notes */}
                                        {activeVersion.notes && (
                                            <div className="text-left bg-black/30 border border-purple-500/10 rounded-2xl p-5">
                                                <h3 className="text-sm font-bold text-gray-300 mb-2 flex items-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                    Release Notes
                                                </h3>
                                                <p className="text-xs text-gray-400 whitespace-pre-line leading-relaxed max-h-32 overflow-y-auto">
                                                    {activeVersion.notes}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-full p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center">
                                        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
                                        <h3 className="text-base font-bold text-rose-300">No active version found</h3>
                                        <p className="text-xs text-gray-400 mt-1">
                                            The administrator has not published an active client APK yet. Please contact support or check back later.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Steps / Guidelines */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-5 rounded-2xl bg-[#1a0b2e]/40 border border-purple-500/5 text-center flex flex-col items-center">
                            <span className="w-7 h-7 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-300 text-xs font-bold mb-3">1</span>
                            <h4 className="text-sm font-semibold text-white mb-1">Download APK</h4>
                            <p className="text-[11px] text-gray-400">Download the package directly to the target device.</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-[#1a0b2e]/40 border border-purple-500/5 text-center flex flex-col items-center">
                            <span className="w-7 h-7 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-300 text-xs font-bold mb-3">2</span>
                            <h4 className="text-sm font-semibold text-white mb-1">Allow Installs</h4>
                            <p className="text-[11px] text-gray-400">Enable "Install Unknown Apps" in device settings.</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-[#1a0b2e]/40 border border-purple-500/5 text-center flex flex-col items-center">
                            <span className="w-7 h-7 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-300 text-xs font-bold mb-3">3</span>
                            <h4 className="text-sm font-semibold text-white mb-1">Link Device</h4>
                            <p className="text-[11px] text-gray-400">Open the app and scan the QR code from the dashboard.</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full text-center py-6 text-xs text-gray-500 relative z-10 border-t border-purple-500/5 mt-12 bg-black/10">
                <p>&copy; {new Date().getFullYear()} MindSafe. All rights reserved.</p>
            </footer>
        </div>
    );
}
