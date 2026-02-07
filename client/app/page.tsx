'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const parsedUser = JSON.parse(user);
      if (parsedUser.role === 'recruiter' || parsedUser.role === 'admin') {
        router.push('/dashboard');
      } else {
        router.push('/jobs');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-[#4a9eff]" />
        <span className="text-sm text-[#a3a3a3]">Loading...</span>
      </div>
    </div>
  );
}
