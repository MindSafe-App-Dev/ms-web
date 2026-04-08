'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';
import { buildPremiumRoute, clearPendingPayPalOrder, readPendingPayPalOrder } from '@/lib/premium';

export default function PaymentCancelPage() {
    const router = useRouter();
    const pendingOrder = readPendingPayPalOrder();
    const returnRoute = buildPremiumRoute(pendingOrder?.deviceExternalId);

    useEffect(() => {
        // Clear stored order
        clearPendingPayPalOrder();

        // Notify parent window if opened as popup
        if (window.opener) {
            window.opener.postMessage({ type: 'PAYPAL_CANCEL' }, '*');
            setTimeout(() => window.close(), 1500);
        }
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="ms-card p-8 text-center max-w-md">
                <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Payment Cancelled</h2>
                <p className="text-gray-400 mb-6">
                    You cancelled the payment. No charges were made.
                </p>
                <button
                    onClick={() => {
                        if (window.opener) {
                            window.close();
                        } else {
                            router.push(returnRoute);
                        }
                    }}
                    className="px-6 py-3 rounded-xl gradient-primary text-white font-semibold"
                >
                    Go Back
                </button>
            </div>
        </div>
    );
}
