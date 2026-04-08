'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useNotification } from '@/context/NotificationProvider';
import {
    clearPendingPayPalOrder,
    finalizePremiumCheckout,
    hasCompletedPayPalOrder,
    markPayPalOrderCompleted,
    PREMIUM_COPY,
    readPendingPayPalOrder,
} from '@/lib/premium';

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'AWW4B0m2iwsdPu5R2Thbdhm6pq0e6NB73Z5FLEBjbJn-pWGgwj8rRoqi7yTDJuEVmNOdmkAZZDtMZdat';
const PAYPAL_SECRET = process.env.NEXT_PUBLIC_PAYPAL_SECRET || 'EJUXp2Ipo4zkORbKC2uac24CZKy_SGh1xKHtk6S6ZCvIHYG99vDohRCqqW15Jm0b5apB8zeD-PiItxPi';
const PAYPAL_API = 'https://api-m.sandbox.paypal.com';

export default function PaymentSuccessPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showError, showSuccess } = useNotification();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [message, setMessage] = useState('Processing your payment...');

    useEffect(() => {
        const capturePayment = async () => {
            const token = searchParams.get('token');
            const pendingOrder = readPendingPayPalOrder();

            if (!token) {
                setStatus('error');
                setMessage('Payment token not found.');
                return;
            }

            if (hasCompletedPayPalOrder(token)) {
                clearPendingPayPalOrder();
                setStatus('success');
                setMessage('This payment was already completed.');
                setTimeout(() => router.push('/home'), 1500);
                return;
            }

            try {
                const authResponse = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Authorization: `Basic ${btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`)}`,
                    },
                    body: 'grant_type=client_credentials',
                });

                if (!authResponse.ok) {
                    throw new Error('Failed to get PayPal access token.');
                }

                const authData = await authResponse.json();
                const accessToken = authData.access_token;
                const orderResponse = await fetch(`${PAYPAL_API}/v2/checkout/orders/${token}`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                });

                const orderData = await orderResponse.json();
                const isApproved = orderData.status === 'APPROVED';
                const isCompleted = orderData.status === 'COMPLETED';

                if (!isApproved && !isCompleted) {
                    throw new Error(`Order status: ${orderData.status}. Expected APPROVED or COMPLETED.`);
                }

                if (isApproved) {
                    setMessage('Capturing payment...');
                    const captureResponse = await fetch(`${PAYPAL_API}/v2/checkout/orders/${token}/capture`, {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    });
                    const captureData = await captureResponse.json();

                    if (captureData.status !== 'COMPLETED') {
                        throw new Error(`Payment capture returned status: ${captureData.status}`);
                    }
                }

                if (window.opener) {
                    window.opener.postMessage({
                        type: 'PAYPAL_SUCCESS',
                        order: pendingOrder ? { ...pendingOrder, orderId: token } : undefined,
                    }, '*');
                    clearPendingPayPalOrder();
                    setStatus('success');
                    setMessage('Payment approved. Returning to checkout...');
                    setTimeout(() => window.close(), 1500);
                    return;
                }

                if (!pendingOrder) {
                    throw new Error('Payment was approved, but the pending checkout details were not found.');
                }

                const finalOrder = { ...pendingOrder, orderId: token };
                await finalizePremiumCheckout(finalOrder);
                markPayPalOrderCompleted(token);
                clearPendingPayPalOrder();
                setStatus('success');
                setMessage(PREMIUM_COPY.paymentSuccessMessage.replace('{plan}', finalOrder.planName).replace('{device}', finalOrder.deviceName));
                showSuccess(PREMIUM_COPY.paymentSuccessTitle, PREMIUM_COPY.paypal.successMessage);
                setTimeout(() => router.push('/home'), 2000);
            } catch (error) {
                console.error('Payment capture error:', error);
                setStatus('error');
                setMessage(error instanceof Error ? error.message : PREMIUM_COPY.paypal.paymentErrorMessage);
                showError(PREMIUM_COPY.paypal.paymentErrorTitle, PREMIUM_COPY.paypal.paymentErrorMessage);
            }
        };

        capturePayment();
    }, [router, searchParams, showError, showSuccess]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="ms-card p-8 text-center max-w-md">
                {status === 'processing' && (
                    <>
                        <Loader2 className="w-16 h-16 text-purple-500 animate-spin mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">Processing Payment</h2>
                        <p className="text-gray-400">{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">Payment Successful!</h2>
                        <p className="text-gray-400 mb-4">{message}</p>
                        <p className="text-gray-500 text-sm">Redirecting you back...</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">Payment Issue</h2>
                        <p className="text-gray-400 mb-4">{message}</p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => router.push('/premium')}
                                className="px-6 py-3 rounded-xl gradient-primary text-white font-semibold"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => router.push('/home')}
                                className="px-6 py-3 rounded-xl bg-gray-700 text-white font-semibold"
                            >
                                Go Home
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
