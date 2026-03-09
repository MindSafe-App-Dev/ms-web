'use client';

import { useEffect, useState } from 'react';
import { useNotification } from '@/context/NotificationProvider';
import { useGlobalContext } from '@/context/GlobalProvider';
import { createCoupon, deleteCoupon, getCoupons, updateCoupon, Coupon } from '@/lib/appwrite';
import { BadgePercent, Loader2, Trash2, Save } from 'lucide-react';

export default function CouponManagementPage() {
    const { showSuccess, showError, showInfo } = useNotification();
    const { user } = useGlobalContext();

    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        code: '',
        description: '',
        discount_type: 'percent' as 'percent' | 'fixed',
        discount_value: 10,
        max_redemptions: 0,
        expires_at: '',
    });

    const adminEmail = process.env.NEXT_PUBLIC_COUPON_ADMIN_EMAIL || '';
    const isCouponAdmin = typeof window !== 'undefined' && localStorage.getItem('ms_coupon_admin') === '1' && user?.email === adminEmail;

    const refreshCoupons = async () => {
        setLoading(true);
        const data = await getCoupons();
        setCoupons(data);
        setLoading(false);
    };

    useEffect(() => {
        if (!isCouponAdmin) return;
        refreshCoupons();
    }, [isCouponAdmin]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.code.trim()) {
            showError('Missing Code', 'Coupon code is required.');
            return;
        }

        setSaving(true);
        try {
            await createCoupon({
                code: form.code,
                description: form.description,
                discount_type: form.discount_type,
                discount_value: Number(form.discount_value),
                max_redemptions: Number(form.max_redemptions || 0),
                expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : undefined,
            });
            showSuccess('Coupon Created', 'New coupon has been saved.');
            setForm({ code: '', description: '', discount_type: 'percent', discount_value: 10, max_redemptions: 0, expires_at: '' });
            await refreshCoupons();
        } catch {
            showError('Create Failed', 'Could not create coupon. Check Appwrite collection schema.');
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (coupon: Coupon) => {
        try {
            await updateCoupon(coupon.$id, { is_active: !coupon.is_active });
            showInfo('Coupon Updated', `${coupon.code} is now ${coupon.is_active ? 'inactive' : 'active'}.`);
            await refreshCoupons();
        } catch {
            showError('Update Failed', 'Could not update coupon status.');
        }
    };

    const handleDelete = async (coupon: Coupon) => {
        try {
            await deleteCoupon(coupon.$id);
            showSuccess('Coupon Deleted', `${coupon.code} was removed.`);
            await refreshCoupons();
        } catch {
            showError('Delete Failed', 'Could not delete coupon.');
        }
    };

    if (!isCouponAdmin) {
        return (
            <div className="max-w-3xl mx-auto ms-card p-8 text-center">
                <h1 className="text-2xl font-bold text-white mb-2">Restricted Area</h1>
                <p className="text-gray-400">Coupon management is available only for admin login credentials.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="gradient-border mb-6">
                <div className="bg-[#1a0b2e] rounded-[1.15rem] p-6 flex items-center gap-3">
                    <BadgePercent className="w-7 h-7 text-orange-400" />
                    <div>
                        <h1 className="text-2xl font-bold text-white">Coupon Management</h1>
                        <p className="text-gray-400">Create and manage promo/discount codes with Appwrite</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleCreate} className="ms-card p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <input className="ms-input" placeholder="Code (e.g. NEWUSER25)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
                <input className="ms-input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <select className="ms-input" value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as 'percent' | 'fixed' })}>
                    <option value="percent">Percent</option>
                    <option value="fixed">Fixed</option>
                </select>
                <input className="ms-input" type="number" min="0" placeholder="Discount value" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} />
                <input className="ms-input" type="number" min="0" placeholder="Max redemptions (0 = unlimited)" value={form.max_redemptions} onChange={(e) => setForm({ ...form, max_redemptions: Number(e.target.value) })} />
                <input className="ms-input" type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
                <button type="submit" disabled={saving} className="md:col-span-2 py-3 rounded-xl gradient-primary text-white font-semibold flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Create Coupon
                </button>
            </form>

            <div className="ms-card p-6">
                <h2 className="text-lg font-bold text-white mb-4">Existing Coupons</h2>
                {loading ? (
                    <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>
                ) : coupons.length === 0 ? (
                    <p className="text-gray-400">No coupons found. Create one above.</p>
                ) : (
                    <div className="space-y-3">
                        {coupons.map((coupon) => (
                            <div key={coupon.$id} className="p-4 rounded-xl bg-[#2d1b4e] border border-purple-500/30 flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-white font-semibold">{coupon.code}</p>
                                    <p className="text-gray-400 text-sm">{coupon.description || 'No description'}</p>
                                    <p className="text-gray-400 text-xs mt-1">
                                        {coupon.discount_type === 'percent' ? `${coupon.discount_value}% off` : `$${coupon.discount_value} off`} | Used {coupon.redemption_count || 0}{coupon.max_redemptions ? `/${coupon.max_redemptions}` : ''}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => toggleActive(coupon)} className={`px-3 py-1 rounded-lg text-sm font-semibold ${coupon.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-300'}`}>
                                        {coupon.is_active ? 'Active' : 'Inactive'}
                                    </button>
                                    <button onClick={() => handleDelete(coupon)} className="p-2 rounded-lg bg-rose-500/20 text-rose-300">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
