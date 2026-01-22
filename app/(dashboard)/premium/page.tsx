'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useNotification } from '@/context/NotificationProvider';
import { createPayment, updateChild, getAllChild, Child } from '@/lib/appwrite';
import { ArrowLeft, Crown, Check, Zap, Shield, Clock, Cloud, Smartphone, ChevronDown, Loader2, CreditCard, ExternalLink } from 'lucide-react';

// PayPal Sandbox Credentials (replace with production for live)
const PAYPAL_CLIENT_ID = "AWW4B0m2iwsdPu5R2Thbdhm6pq0e6NB73Z5FLEBjbJn-pWGgwj8rRoqi7yTDJuEVmNOdmkAZZDtMZdat";
const PAYPAL_SECRET = "EJUXp2Ipo4zkORbKC2uac24CZKy_SGh1xKHtk6S6ZCvIHYG99vDohRCqqW15Jm0b5apB8zeD-PiItxPi";
const PAYPAL_API = "https://api-m.sandbox.paypal.com";

interface Plan {
    id: string;
    name: string;
    price: number;
    period: string;
    description: string;
    discountLabel?: string;
    features: string[];
    popular?: boolean;
}

const plans: Plan[] = [
    {
        id: 'monthly',
        name: 'Test Us!',
        price: 49,
        period: '/month',
        description: 'Perfect to try out all features',
        features: [
            '24/7 Support',
            'All Features Access',
            'Download to Local Device',
            'Real-time Monitoring',
        ],
    },
    {
        id: 'yearly',
        name: 'Be Mind Safe',
        price: 499,
        period: '/year',
        description: 'Best value for families',
        discountLabel: '2 months free',
        features: [
            '24/7 Priority Support',
            'All Features Access',
            'Download to Local Device',
            'Real-time Monitoring',
            'Cloud Storage (Coming Soon)',
            'Multi-device Dashboard',
        ],
        popular: true,
    },
];

export default function PremiumPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useGlobalContext();
    const { showSuccess, showError, showWarning, showInfo } = useNotification();

    const [devices, setDevices] = useState<Child[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<Child | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [showDeviceDropdown, setShowDeviceDropdown] = useState(false);
    const [paymentWindow, setPaymentWindow] = useState<Window | null>(null);

    // Get device from URL params if available
    const deviceIdFromUrl = searchParams.get('deviceId');

    useEffect(() => {
        const fetchDevices = async () => {
            if (!user?.$id) return;

            try {
                const data = await getAllChild(user.$id);
                const nonPremiumDevices = data.filter(d => !d.is_Premium);
                setDevices(nonPremiumDevices);

                if (deviceIdFromUrl) {
                    const device = data.find(d => d.victim_id === deviceIdFromUrl);
                    if (device) setSelectedDevice(device);
                } else if (nonPremiumDevices.length === 1) {
                    setSelectedDevice(nonPremiumDevices[0]);
                }
            } catch (error) {
                console.error('Error fetching devices:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDevices();
    }, [user?.$id, deviceIdFromUrl]);

    // Listen for payment completion message from popup
    useEffect(() => {
        const handleMessage = async (event: MessageEvent) => {
            if (event.data?.type === 'PAYPAL_SUCCESS' && event.data?.orderId) {
                paymentWindow?.close();
                await handlePaymentSuccess(event.data.orderId);
            } else if (event.data?.type === 'PAYPAL_CANCEL') {
                paymentWindow?.close();
                setProcessing(false);
                showWarning('Payment Cancelled', 'You cancelled the payment.');
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [paymentWindow, selectedDevice, selectedPlan]);

    const handlePaymentSuccess = async (orderId: string) => {
        if (!selectedDevice || !selectedPlan || !user) return;

        setProcessing(true);

        try {
            const paymentData = {
                client_id: user.$id,
                device_name: selectedDevice.victime_name,
                device_id: selectedDevice.victim_id,
                date: new Date().toISOString(),
                amount: selectedPlan.price,
                status: true,
            };

            const paymentCreated = await createPayment(paymentData);

            if (paymentCreated) {
                await updateChild(selectedDevice.$id);
                showSuccess('Payment Successful!', `${selectedDevice.victime_name} is now premium!`);
                router.push('/home');
            } else {
                showError('Payment Error', 'Failed to record payment. Please contact support.');
            }
        } catch (error) {
            console.error('Payment processing error:', error);
            showError('Processing Error', 'An error occurred. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const initiatePayPalPayment = async () => {
        if (!selectedDevice || !selectedPlan) {
            showWarning('Incomplete Selection', 'Please select a device and plan first.');
            return;
        }

        setProcessing(true);
        showInfo('Connecting to PayPal...', 'Please wait while we set up your payment.');

        try {
            // 1. Get PayPal Access Token
            const authResponse = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`)}`,
                },
                body: 'grant_type=client_credentials',
            });

            if (!authResponse.ok) {
                throw new Error('Failed to authenticate with PayPal');
            }

            const authData = await authResponse.json();
            const accessToken = authData.access_token;

            // 2. Create PayPal Order
            const orderResponse = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    intent: 'CAPTURE',
                    purchase_units: [
                        {
                            amount: {
                                currency_code: 'USD',
                                value: selectedPlan.price.toString(),
                            },
                            description: `MindSafe ${selectedPlan.name} - ${selectedDevice.victime_name}`,
                        },
                    ],
                    application_context: {
                        return_url: `${window.location.origin}/premium/success`,
                        cancel_url: `${window.location.origin}/premium/cancel`,
                        brand_name: 'MindSafe',
                        user_action: 'PAY_NOW',
                    },
                }),
            });

            if (!orderResponse.ok) {
                throw new Error('Failed to create PayPal order');
            }

            const orderData = await orderResponse.json();
            const approvalLink = orderData.links.find((link: { rel: string }) => link.rel === 'approve')?.href;

            if (!approvalLink) {
                throw new Error('No approval URL found');
            }

            // Store order info for later
            localStorage.setItem('paypal_order', JSON.stringify({
                orderId: orderData.id,
                deviceId: selectedDevice.$id,
                planId: selectedPlan.id,
                price: selectedPlan.price,
            }));

            // 3. Open PayPal in a new window
            const popup = window.open(approvalLink, 'PayPal', 'width=450,height=600,left=100,top=100');
            setPaymentWindow(popup);

            // Check if popup was blocked
            if (!popup) {
                // Fallback: redirect to PayPal
                window.location.href = approvalLink;
                return;
            }

            // Monitor popup
            const checkPopup = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkPopup);
                    // Check if payment was successful via URL
                    const storedOrder = localStorage.getItem('paypal_order');
                    if (storedOrder) {
                        // Payment might still be processing
                        setTimeout(() => {
                            setProcessing(false);
                        }, 2000);
                    }
                }
            }, 500);

        } catch (error) {
            console.error('PayPal error:', error);
            showError('Payment Failed', 'Could not connect to PayPal. Please try again.');
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="gradient-border mb-8">
                <div className="bg-[#1a0b2e] rounded-[1.15rem] p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.back()} className="p-2 rounded-xl bg-purple-500/15">
                                <ArrowLeft className="w-5 h-5 text-purple-400" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Upgrade to Premium</h1>
                                <p className="text-gray-400">Unlock all monitoring features</p>
                            </div>
                        </div>
                        <div className="w-14 h-14 rounded-full gradient-premium flex items-center justify-center">
                            <Crown className="w-7 h-7 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {devices.length === 0 ? (
                <div className="ms-card p-8 text-center mb-8">
                    <Crown className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">All Devices Premium!</h2>
                    <p className="text-gray-400 mb-4">All your devices already have premium access.</p>
                    <button onClick={() => router.push('/home')} className="px-6 py-3 rounded-xl gradient-primary text-white font-semibold">
                        Go to Dashboard
                    </button>
                </div>
            ) : (
                <>
                    {/* Device Selection */}
                    <div className="ms-card p-5 mb-6">
                        <label className="text-white font-semibold mb-3 block">Select Device to Upgrade</label>
                        <div className="relative">
                            <button
                                onClick={() => setShowDeviceDropdown(!showDeviceDropdown)}
                                className="w-full flex items-center justify-between p-4 rounded-xl bg-[#2d1b4e] border border-purple-500/30"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                                        <Smartphone className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-white font-medium">
                                            {selectedDevice ? selectedDevice.victime_name : 'Choose a device'}
                                        </p>
                                        {selectedDevice && <p className="text-gray-400 text-sm">{selectedDevice.victim_id}</p>}
                                    </div>
                                </div>
                                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showDeviceDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {showDeviceDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#2d1b4e] border border-purple-500/30 rounded-xl overflow-hidden z-10">
                                    {devices.map((device) => (
                                        <button
                                            key={device.$id}
                                            onClick={() => { setSelectedDevice(device); setShowDeviceDropdown(false); }}
                                            className={`w-full flex items-center gap-3 p-4 hover:bg-purple-500/10 ${selectedDevice?.$id === device.$id ? 'bg-purple-500/20' : ''}`}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                                                <Smartphone className="w-5 h-5 text-purple-400" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-white font-medium">{device.victime_name}</p>
                                                <p className="text-gray-400 text-sm">{device.victim_id}</p>
                                            </div>
                                            {selectedDevice?.$id === device.$id && <Check className="w-5 h-5 text-emerald-400 ml-auto" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Plan Selection */}
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-white mb-4">Choose Your Plan</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {plans.map((plan) => (
                                <button
                                    key={plan.id}
                                    onClick={() => setSelectedPlan(plan)}
                                    className={`relative p-0.5 rounded-2xl transition-all ${selectedPlan?.id === plan.id ? 'bg-gradient-to-br from-yellow-400 via-orange-500 to-amber-600' : 'bg-gradient-to-br from-orange-500/30 to-yellow-500/30'}`}
                                >
                                    {plan.popular && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-orange-500 text-white text-xs font-bold z-10">
                                            MOST POPULAR
                                        </div>
                                    )}
                                    {plan.discountLabel && (
                                        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold">
                                            {plan.discountLabel}
                                        </div>
                                    )}

                                    <div className={`bg-[#1a0b2e] rounded-[0.875rem] p-6 h-full ${plan.popular ? 'pt-8' : ''}`}>
                                        <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                                        <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                                        <div className="flex items-baseline gap-1 mb-6">
                                            <span className="text-4xl font-bold text-orange-400">${plan.price}</span>
                                            <span className="text-gray-400">{plan.period}</span>
                                        </div>
                                        <div className="space-y-3">
                                            {plan.features.map((feature, idx) => (
                                                <div key={idx} className="flex items-center gap-3">
                                                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                        <Check className="w-3 h-3 text-emerald-400" />
                                                    </div>
                                                    <span className="text-gray-300 text-sm">{feature}</span>
                                                </div>
                                            ))}
                                        </div>
                                        {selectedPlan?.id === plan.id && (
                                            <div className="mt-4 flex items-center justify-center gap-2 py-2 rounded-xl bg-yellow-500/20">
                                                <Check className="w-5 h-5 text-yellow-400" />
                                                <span className="text-yellow-400 font-semibold">Selected</span>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Pay Button */}
                    <button
                        onClick={initiatePayPalPayment}
                        disabled={!selectedDevice || !selectedPlan || processing}
                        className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 mb-6 transition-all ${selectedDevice && selectedPlan && !processing
                            ? 'bg-[#0070ba] hover:bg-[#003087] text-white'
                            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        {processing ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <CreditCard className="w-6 h-6" />
                                {selectedPlan ? `Pay $${selectedPlan.price} with PayPal` : 'Select a Plan'}
                                <ExternalLink className="w-4 h-4 ml-1" />
                            </>
                        )}
                    </button>

                    {/* Features */}
                    <div className="ms-card p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Premium Features</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { icon: Shield, label: 'Complete Access', color: 'text-purple-400' },
                                { icon: Zap, label: 'Real-time Data', color: 'text-yellow-400' },
                                { icon: Clock, label: '24/7 Support', color: 'text-emerald-400' },
                                { icon: Cloud, label: 'Cloud Backup', color: 'text-blue-400' },
                            ].map((item, idx) => {
                                const Icon = item.icon;
                                return (
                                    <div key={idx} className="text-center p-4 rounded-xl bg-purple-500/10">
                                        <Icon className={`w-8 h-8 ${item.color} mx-auto mb-2`} />
                                        <p className="text-white text-sm font-medium">{item.label}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
