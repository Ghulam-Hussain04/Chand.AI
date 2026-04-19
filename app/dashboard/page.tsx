'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/app/stores/appStore';
import { useAuthStore } from '@/app/stores/authStore';
import { apiService } from '@/app/services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { FileText, FolderOpen, MessageCircle, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalFolders: 0,
    recentFiles: [] as any[],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [files, folders] = await Promise.all([
          apiService.getFiles(),
          apiService.getFolders(),
        ]);

        setStats({
          totalFiles: files.length || 0,
          totalFolders: folders.length || 0,
          recentFiles: files.slice(0, 5) || [],
        });
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, []);

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Welcome back, {user?.username}! 👋</h1>
        <p className="text-slate-400 mt-2">Here&apos;s what&apos;s happening with your documents today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Total Files</CardTitle>
            <FileText className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalFiles}</div>
            <p className="text-xs text-slate-400 mt-1">Across all folders</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Total Folders</CardTitle>
            <FolderOpen className="w-4 h-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalFolders}</div>
            <p className="text-xs text-slate-400 mt-1">Organized storage</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Ready to Chat</CardTitle>
            <MessageCircle className="w-4 h-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalFiles}</div>
            <p className="text-xs text-slate-400 mt-1">Files to analyze</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Files */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Recent Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-slate-400 text-sm">Loading recent files...</div>
          ) : stats.recentFiles.length > 0 ? (
            <div className="space-y-3">
              {stats.recentFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition"
                >
                  <div>
                    <p className="text-slate-200 font-medium">{file.filename}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(file.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-xs text-slate-400">
                    {(file.size / 1024).toFixed(2)} KB
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-400 text-sm">No files yet. Upload one to get started!</div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border-blue-700/50 hover:border-blue-600/50 transition cursor-pointer">
          <CardHeader>
            <CardTitle className="text-lg text-white">📤 Upload Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300 text-sm">
              Start by uploading your documents to organize and analyze them with AI.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-700/50 hover:border-purple-600/50 transition cursor-pointer">
          <CardHeader>
            <CardTitle className="text-lg text-white">💬 Chat with AI</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300 text-sm">
              Ask questions about your documents and get instant AI-powered answers.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
