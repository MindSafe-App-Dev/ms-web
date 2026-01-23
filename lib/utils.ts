import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Tailwind class merge utility
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Generate initials from name
export function getInitials(name: string): string {
    if (!name) return '';
    const words = name.split(' ');
    const initials = words.slice(0, 2).map((word) => word.charAt(0)).join('');
    return initials.toUpperCase();
}

// Get random color based on string
export function getRandomColor(str: string): string {
    const colors = [
        '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'
    ];
    let index = 0;
    for (let i = 0; i < str.length; i++) {
        index += str.charCodeAt(i);
    }
    return colors[index % colors.length];
}

// Mask email for privacy
export function maskEmail(email: string): string {
    if (!email) return '';
    const [localPart, domain] = email.split('@');
    return `${localPart[0]}${'*'.repeat(localPart.length - 1)}@${domain}`;
}

// Format date
export function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

// Format duration in seconds to MM:SS
export function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Format file size
export function formatFileSize(bytes: number | string): string {
    const size = typeof bytes === 'string' ? parseInt(bytes) : bytes;
    if (isNaN(size) || size === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(size) / Math.log(1024));
    return `${(size / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

// Get greeting based on time of day
export function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
}

// Get file icon based on extension
export function getFileIcon(fileName: string, isDir: boolean): string {
    if (isDir) return '📁';

    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    const iconMap: Record<string, string> = {
        // Documents
        'pdf': '📄', 'doc': '📝', 'docx': '📝', 'txt': '📃',
        'xls': '📊', 'xlsx': '📊', 'ppt': '📊', 'pptx': '📊',
        // Images
        'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️',
        'bmp': '🖼️', 'svg': '🖼️', 'webp': '🖼️',
        // Audio
        'mp3': '🎵', 'wav': '🎵', 'ogg': '🎵', 'flac': '🎵', 'm4a': '🎵',
        // Video
        'mp4': '🎬', 'avi': '🎬', 'mkv': '🎬', 'mov': '🎬', 'wmv': '🎬',
        // Archives
        'zip': '📦', 'rar': '📦', '7z': '📦', 'tar': '📦', 'gz': '📦',
        // Code
        'js': '💻', 'jsx': '💻', 'ts': '💻', 'tsx': '💻',
        'py': '💻', 'java': '💻', 'html': '💻', 'css': '💻', 'json': '💻',
        // APK
        'apk': '📱',
    };

    return iconMap[ext] || '📄';
}

// Get call type info
export function getCallTypeInfo(type: number) {
    switch (type) {
        case 1:
            return { label: 'Incoming', icon: 'phone-incoming', colors: ['#10b981', '#059669'] };
        case 3:
            return { label: 'Missed', icon: 'phone-missed', colors: ['#ef4444', '#dc2626'] };
        default:
            return { label: 'Outgoing', icon: 'phone-outgoing', colors: ['#3b82f6', '#2563eb'] };
    }
}

// Download data as file
export function downloadFile(data: string, filename: string, mimeType: string = 'text/plain') {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Export contacts/calls to CSV
export function exportToCSV<T extends object>(
    data: T[],
    headers: string[],
    keys: (keyof T)[],
    filename: string
) {
    const csvRows = [headers.join(',')];

    for (const item of data) {
        const values = keys.map(key => {
            const val = item[key];
            const escaped = String(val ?? '').replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }

    downloadFile(csvRows.join('\n'), filename, 'text/csv');
}
