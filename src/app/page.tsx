'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Spinner from '@/components/ui/Spinner';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/user')
      .then((res) => {
        if (res.ok) {
          router.replace('/dashboard');
        } else {
          router.replace('/onboarding');
        }
      })
      .catch(() => router.replace('/onboarding'));
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner size="lg" />
    </div>
  );
}
