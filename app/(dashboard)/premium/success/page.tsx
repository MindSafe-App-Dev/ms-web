'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useNotification } from '@/context/NotificationProvider';
import { createPayment, updateChild } from '@/lib/appwrite';
import { CheckCircle, Loader2 } from 'lucide-react';

const PAYPAL_CLIENT_ID = "AWW4B0m2iwsdPu5R2Thbdhm6pq0e6NB73Z5FLEBjbJn-pWGgwj8rRoqi7yTDJuEVmNOdmkAZZDtMZdat";
const PAYPAL_SECRET = "EJUXp2Ipo4zkORbKC2uac24CZKy_SGh1xKHtk6S6ZCvIHYG99vDohRCqqW15Jm0b5apB8zeD-PiItxPi";
const PAYPAL_API = "https://api-m.sandbox.paypal.com";

export default function PaymentSuccessPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useGlobalContext();
    const { showSuccess, showError } = useNotification();

    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [message, setMessage] = useState('Processing your payment...');

    useEffect(() => {
        const capturePayment = async () => {
            const token = searchParams.get('token'); // PayPal order ID
            const payerId = searchParams.get('PayerID');
            const storedOrder = localStorage.getItem('paypal_order');

            console.log('PayPal return params:', { token, payerId });
            console.log('Stored order:', storedOrder);

            if (!token) {
                setStatus('error');
                setMessage('Payment token not found.');
                return;
            }

            // Parse stored order info
            let orderInfo: { deviceId: string; price: number } | null = null;
            if (storedOrder) {
                try {
                    orderInfo = JSON.parse(storedOrder);
                } catch (e) {
                    console.error('Error parsing stored order:', e);
                }
            }

            try {
                // Get access token
                const authResponse = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Basic ${btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`)}`,
                    },
                    body: 'grant_type=client_credentials',
                });

                if (!authResponse.ok) {
                    throw new Error('Failed to get PayPal access token');
                }

                const authData = await authResponse.json();
                const accessToken = authData.access_token;

                // First, check the order status
                const orderResponse = await fetch(`${PAYPAL_API}/v2/checkout/orders/${token}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                });

                const orderData = await orderResponse.json();
                console.log('Order status:', orderData);

                let isCompleted = false;

                // If order is already captured, we're done
                if (orderData.status === 'COMPLETED') {
                    isCompleted = true;
                }
                // If order is approved, capture it
                else if (orderData.status === 'APPROVED') {
                    setMessage('Capturing payment...');

                    const captureResponse = await fetch(`${PAYPAL_API}/v2/checkout/orders/${token}/capture`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    });

                    const captureData = await captureResponse.json();
                    console.log('Capture response:', captureData);

                    if (captureData.status === 'COMPLETED') {
                        isCompleted = true;
                    } else {
                        console.error('Unexpected capture status:', captureData.status);
                        throw new Error(`Payment capture returned status: ${captureData.status}`);
                    }
                } else {
                    console.error('Unexpected order status:', orderData.status);
                    throw new Error(`Order status: ${orderData.status}. Expected APPROVED or COMPLETED.`);
                }

                if (isCompleted) {
                    // Record payment in database
                    if (user && orderInfo) {
                        try {
                            const paymentData = {
                                client_id: user.$id,
                                device_name: 'Device',
                                device_id: orderInfo.deviceId,
                                date: new Date().toISOString(),
                                amount: orderInfo.price,
                                status: true,
                            };

                            await createPayment(paymentData);
                            await updateChild(orderInfo.deviceId);
                        } catch (dbError) {
                            console.error('Database update error:', dbError);
                            // Payment was successful even if DB update fails
                        }
                    }

                    localStorage.removeItem('paypal_order');
                    setStatus('success');
                    setMessage('Payment successful! Your device is now premium.');
                    showSuccess('Payment Complete', 'Your premium subscription is now active!');

                    // Close popup and notify parent
                    if (window.opener) {
                        window.opener.postMessage({ type: 'PAYPAL_SUCCESS', orderId: token }, '*');
                        setTimeout(() => window.close(), 2000);
                    } else {
                        setTimeout(() => router.push('/home'), 3000);
                    }
                }
            } catch (error) {
                console.error('Payment capture error:', error);
                setStatus('error');
                setMessage(error instanceof Error ? error.message : 'Failed to process payment.');
                showError('Payment Error', 'Could not complete the payment.');
            }
        };

        capturePayment();
    }, [searchParams, user, router, showSuccess, showError]);

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
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">❌</span>
                        </div>
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
