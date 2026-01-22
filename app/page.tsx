'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useGlobalContext } from '@/context/GlobalProvider';
import { Loader2 } from 'lucide-react';

export default function WelcomePage() {
  const { loading, isLogged } = useGlobalContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isLogged) {
      router.replace('/home');
    }
  }, [loading, isLogged, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-8">
        <div className="w-32 h-32 rounded-full overflow-hidden shadow-2xl">
          <Image
            src="/logo1.png"
            alt="MindSafe Logo"
            width={128}
            height={128}
            className="w-full h-full object-contain"
            priority
          />
        </div>
      </div>

      {/* Hero Image */}
      <div className="w-full max-w-md mb-8">
        <Image
          src="/cards.png"
          alt="Family Protection"
          width={400}
          height={300}
          className="w-full h-auto rounded-2xl"
          priority
        />
      </div>

      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Be Mindful..
        </h1>
        <h2 className="text-3xl md:text-4xl font-bold">
          Be <span className="text-orange-400">Safe</span>
        </h2>
      </div>

      {/* Subtitle */}
      <p className="text-gray-400 text-center max-w-md mb-8">
        Keep your family around your ears with MindSafe
      </p>

      {/* CTA Button */}
      <button
        onClick={() => router.push('/sign-in')}
        className="ms-btn ms-btn-primary w-full max-w-md text-lg"
      >
        Continue with Email
      </button>

      {/* Background decorations */}
      <div className="fixed top-20 left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 right-10 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}
