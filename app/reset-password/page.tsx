'use client';

import { FormEvent, Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, KeyRound, Loader2, ShieldAlert } from 'lucide-react';

import { completePasswordRecovery } from '@/lib/appwrite';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId') || '';
  const secret = searchParams.get('secret') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isLinkValid = useMemo(() => Boolean(userId && secret), [secret, userId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!isLinkValid) {
      setError('This recovery link is incomplete. Please request a new password reset email.');
      return;
    }

    if (!password || password.length < 8) {
      setError('Choose a password with at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await completePasswordRecovery(userId, secret, password);
      setSuccess('Your password has been updated. You can now return to MindSafe and sign in.');
      setPassword('');
      setConfirmPassword('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to reset your password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(236,72,153,0.22),_transparent_30%),linear-gradient(180deg,_#140720_0%,_#09040f_100%)] px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="gradient-border">
          <div className="rounded-[1.75rem] bg-[#14081f]/95 p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/18 text-emerald-300">
                {success ? <CheckCircle2 className="h-6 w-6" /> : <KeyRound className="h-6 w-6" />}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Reset your password</h1>
                <p className="text-sm text-slate-300">Finish your MindSafe account recovery securely.</p>
              </div>
            </div>

            {!isLinkValid ? (
              <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <ShieldAlert className="h-4 w-4" />
                  Recovery link invalid
                </div>
                <p>Please request a new recovery email from the MindSafe app or dashboard.</p>
              </div>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">New password</label>
                <input
                  className="ms-input w-full"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter a new password"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">Confirm password</label>
                <input
                  className="ms-input w-full"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter the new password"
                  autoComplete="new-password"
                />
              </div>

              {error ? <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
              {success ? <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{success}</p> : null}

              <button
                type="submit"
                disabled={submitting || !isLinkValid}
                className="gradient-primary flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Update password
              </button>
            </form>

            <div className="mt-6 text-sm text-slate-400">
              <Link href="/" className="text-orange-300 hover:text-orange-200">
                Return to MindSafe
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-orange-400" /></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
