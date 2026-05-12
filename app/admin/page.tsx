'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/app/stores/authStore';
import { useRouter } from 'next/navigation';
import { apiService } from '@/app/services/apiService';
import { isAdmin } from '@/app/lib/rbac';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Users, FileText, Folder, Settings, BookOpen } from 'lucide-react';
import UserManagementTab from '@/app/components/admin/UserManagementTab';
import FileManagementTab from '@/app/components/admin/FileManagementTab';
import FolderManagementTab from '@/app/components/admin/FolderManagementTab';
import ReferenceLibraryTab from '@/app/components/admin/ReferenceLibraryTab';

interface Stats {
  userCount: number;
  fileCount: number;
  folderCount: number;
}

export default function AdminPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!user || !isAdmin(user.role)) {
      toast.error('Access denied. Admin only.');
      router.push('/dashboard');
      return;
    }
    loadStats();
  }, [user, router]);

  const loadStats = async () => {
    try {
      const [users, fileStats, rootFolders] = await Promise.allSettled([
        apiService.getUsers(),
        apiService.getUserFileStats(),
        apiService.getFolders(),
      ]);

      const userCount = users.status === 'fulfilled'
        ? (Array.isArray(users.value) ? users.value.length : users.value.users?.length ?? 0)
        : 0;

      const fileCount = fileStats.status === 'fulfilled'
        ? (fileStats.value?.total_files ?? 0)
        : 0;

      const folderCount = rootFolders.status === 'fulfilled'
        ? (Array.isArray(rootFolders.value) ? rootFolders.value.length : 0)
        : 0;

      setStats({ userCount, fileCount, folderCount });
    } catch {
      // stats remain null — cards show fallback
    }
  };

  if (!user || !isAdmin(user.role)) {
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-slate-400 mt-2">Manage users, files, folders, and system settings</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          icon={<Users className="w-6 h-6" />}
          label="Total Users"
          value={stats ? String(stats.userCount) : '—'}
          color="blue"
        />
        <StatsCard
          icon={<FileText className="w-6 h-6" />}
          label="Total Files"
          value={stats ? String(stats.fileCount) : '—'}
          color="green"
        />
        <StatsCard
          icon={<Folder className="w-6 h-6" />}
          label="Total Projects"
          value={stats ? String(stats.folderCount) : '—'}
          color="purple"
        />
        <StatsCard
          icon={<Settings className="w-6 h-6" />}
          label="System Status"
          value="Healthy"
          color="orange"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <TabsList className="bg-slate-700/50 border border-slate-600">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Files
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <Folder className="w-4 h-4" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="reference" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Reference Library
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <UserManagementTab />
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <FileManagementTab />
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <FolderManagementTab />
        </TabsContent>

        <TabsContent value="reference" className="mt-6">
          <ReferenceLibraryTab />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function StatsCard({ icon, label, value, color }: StatsCardProps) {
  const colorClasses = {
    blue: 'bg-blue-600/20 text-blue-400',
    green: 'bg-green-600/20 text-green-400',
    purple: 'bg-purple-600/20 text-purple-400',
    orange: 'bg-orange-600/20 text-orange-400',
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-200">{label}</CardTitle>
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
      </CardContent>
    </Card>
  );
}

function SettingsTab() {
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">System Settings</CardTitle>
        <CardDescription className="text-slate-400">
          Configure system-wide settings and preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200">API Base URL</label>
          <input
            type="text"
            value={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
            readOnly
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200">Frontend Version</label>
          <input
            type="text"
            value="1.0.0"
            readOnly
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300"
          />
        </div>

        <div className="pt-4">
          <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black">Save Settings</Button>
        </div>
      </CardContent>
    </Card>
  );
}
