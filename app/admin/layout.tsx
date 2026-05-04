'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/app/stores/authStore';
import { isAdmin } from '@/app/lib/rbac';
import Sidebar from '@/app/components/Sidebar';
import Header from '@/app/components/Header';
import { Toaster } from 'sonner';
import { toast } from 'sonner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, token, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!token || !user) {
      router.push('/auth/login');
      return;
    }
    if (!isAdmin(user.role)) {
      toast.error('Access denied. Admin only.');
      router.push('/dashboard');
    }
  }, [token, user, router, _hasHydrated]);

  if (!_hasHydrated) {
    return <div className="h-screen bg-slate-950" />;
  }

  if (!token || !user || !isAdmin(user.role)) return null;

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="h-full">{children}</div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
