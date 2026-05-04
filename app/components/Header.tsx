"use client";

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from "@/app/stores/authStore";
import { useAppStore } from "@/app/stores/appStore";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Search, Upload, Plus } from "lucide-react";
import CreateFolderModal from "@/app/components/CreateFolderModal";
import { hasPermission } from "@/app/lib/rbac";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { searchQuery, setSearchQuery, setFolderHierarchy } = useAppStore();
  const [createFolderOpen, setCreateFolderOpen] = useState(false);

  const canUpload = user && hasPermission(user.role, 'upload_file');
  const canCreateFolder = user && hasPermission(user.role, 'create_folder');

  const handleUploadClick = () => {
    if (pathname !== '/documents') {
      router.push('/documents');
    }
  };

  const handleFolderCreated = async () => {
    setCreateFolderOpen(false);
    const { apiService } = await import('@/app/services/apiService');
    const trees = await apiService.getFolderHierarchy().catch(() => []);
    setFolderHierarchy(trees);
  };

  return (
    <>
      <header className="h-16 border-b border-slate-700 bg-slate-900/70 backdrop-blur px-6 flex items-center justify-between gap-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-700/50 border-slate-600 text-slate-100 placeholder:text-slate-400 focus:border-amber-500/50"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {canUpload && (
            <Button
              size="sm"
              onClick={handleUploadClick}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-medium"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          )}

          {canCreateFolder && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCreateFolderOpen(true)}
              className="border-slate-600 text-slate-200 hover:bg-amber-500/10 hover:border-amber-500/50 hover:text-amber-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          )}

          {user && (
            <div className="pl-3 border-l border-slate-700">
              <div className="text-sm text-right">
                <p className="font-medium text-slate-200">{user.username}</p>
                <p className="text-xs text-amber-400/80 capitalize">{user.role}</p>
              </div>
            </div>
          )}
        </div>
      </header>

      <CreateFolderModal
        isOpen={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
        onSuccess={handleFolderCreated}
      />
    </>
  );
}
