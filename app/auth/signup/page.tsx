'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4">
      {/* Starfield background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Card className="border-slate-700 bg-slate-900/50 backdrop-blur">
          <CardHeader className="space-y-2 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">Account Registration</CardTitle>
            <CardDescription>Access is managed by administrators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-slate-300 text-sm leading-relaxed">
              Chand.AI accounts are created by system administrators. To request access, please contact your administrator — they can create an account for you from the Admin panel.
            </p>
            <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-700/40 text-left">
              <p className="text-xs text-blue-300 font-medium mb-1">Demo credentials</p>
              <p className="text-sm text-slate-300">
                Username: <span className="font-mono text-white">admin</span>
              </p>
              <p className="text-sm text-slate-300">
                Password: <span className="font-mono text-white">admin123</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-slate-400 text-sm mt-4">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
