'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/app/stores/authStore';
import { apiService } from '@/app/services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { FileText, FolderOpen, MessageCircle, TrendingUp, Upload, ArrowRight, Image } from 'lucide-react';
import { card, badge, fileTypeBadge } from '@/app/lib/theme';

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({ totalFiles: 0, totalImages: 0, totalCsvs: 0, totalFolders: 0, totalSizeMb: 0 });
  const [recentFiles, setRecentFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [fileStats, folders, recent] = await Promise.allSettled([
          apiService.getUserFileStats(),
          apiService.getFolders(),
          apiService.getRecentFiles(5),
        ]);
        if (fileStats.status === 'fulfilled') {
          const s = fileStats.value;
          setStats({
            totalFiles: s.total_files ?? 0,
            totalImages: s.total_images ?? 0,
            totalCsvs: s.total_csvs ?? 0,
            totalFolders: folders.status === 'fulfilled' ? (folders.value?.length ?? 0) : 0,
            totalSizeMb: s.total_size_mb ?? 0,
          });
        }
        if (recent.status === 'fulfilled') setRecentFiles(recent.value ?? []);
      } catch {}
      finally { setIsLoading(false); }
    };
    load();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Welcome back, {user?.username}!</h1>
        <p className="text-slate-400 text-sm mt-1">Here&apos;s an overview of your workspace.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<FileText className="w-5 h-5" />} label="Total Files" value={isLoading ? '—' : String(stats.totalFiles)} sub={isLoading ? '' : `${stats.totalSizeMb.toFixed(1)} MB`} color="amber" />
        <StatCard icon={<Image className="w-5 h-5" />} label="Images" value={isLoading ? '—' : String(stats.totalImages)} color="orange" />
        <StatCard icon={<FolderOpen className="w-5 h-5" />} label="Projects" value={isLoading ? '—' : String(stats.totalFolders)} color="purple" />
        <StatCard icon={<MessageCircle className="w-5 h-5" />} label="CSV Files" value={isLoading ? '—' : String(stats.totalCsvs)} color="green" />
      </div>

      {/* Recent files */}
      <Card className={card}>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            Recent Files
          </CardTitle>
          <Link href="/documents">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-amber-300 gap-1 text-xs">
              View all <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-slate-400 text-sm">Loading…</p>
          ) : recentFiles.length > 0 ? (
            <div className="space-y-2">
              {recentFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                      {file.file_type === 'image'
                        ? <Image className="w-4 h-4 text-amber-400" />
                        : <FileText className="w-4 h-4 text-green-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-slate-200 font-medium truncate text-sm">{file.original_filename}</p>
                      <p className="text-xs text-slate-400">{new Date(file.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${fileTypeBadge[file.file_type] ?? badge.slate}`}>
                      {file.file_type?.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-400">{formatBytes(file.file_size)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No files yet. Upload one to get started!</p>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/documents">
          <Card className="bg-gradient-to-br from-amber-900/25 to-orange-900/25 border-amber-700/30 hover:border-amber-600/50 transition cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-400" />
                Upload Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 text-sm">Organise your images and CSV files into projects for AI analysis.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/chat">
          <Card className="bg-gradient-to-br from-purple-900/25 to-pink-900/25 border-purple-700/30 hover:border-purple-600/50 transition cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-base text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-purple-400" />
                Chat with AI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 text-sm">Ask questions about your documents and get AI-powered answers.</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: 'amber' | 'orange' | 'purple' | 'green';
}

function StatCard({ icon, label, value, sub, color }: StatCardProps) {
  const colorMap: Record<string, string> = {
    amber: 'bg-amber-600/20 text-amber-400',
    orange: 'bg-orange-600/20 text-orange-400',
    purple: 'bg-purple-600/20 text-purple-400',
    green: 'bg-green-600/20 text-green-400',
  };
  return (
    <Card className={card}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium text-slate-300">{label}</CardTitle>
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}
