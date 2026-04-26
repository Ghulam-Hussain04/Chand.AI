'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/app/stores/authStore';
import Sidebar from '@/app/components/Sidebar';
import Header from '@/app/components/Header';
import { Toaster } from 'sonner';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, token } = useAuthStore();

  useEffect(() => {
    if (!token || !user) {
      router.push('/auth/login');
    }
  }, [token, user, router]);

  if (!token || !user) {
    return null;
  }

  return (
    <ProtectedRoute>
      <div className="h-screen flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-foreground">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto">
            <div className="h-full">
              {children}
            </div>
          </main>
        </div>
        <Toaster />
      </div>
    </ProtectedRoute>
  );
}
