'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAppStore } from '@/app/stores/appStore';
import { apiService } from '@/app/services/apiService';
import { Folder, LogOut, Menu, X, Plus, ChevronDown } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useAuthStore } from '@/app/stores/authStore';
import { Folder as FolderType } from '@/app/stores/appStore';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuthStore();
  const { sidebarOpen, setSidebarOpen, folderHierarchy, setFolderHierarchy } = useAppStore();
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFolders = async () => {
      try {
        const hierarchy = await apiService.getFolderHierarchy();
        setFolderHierarchy(hierarchy);
      } catch (error) {
        console.error('Failed to load folders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFolders();
  }, [setFolderHierarchy]);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const toggleFolder = (folderId: number) => {
    const newSet = new Set(expandedFolders);
    if (newSet.has(folderId)) {
      newSet.delete(folderId);
    } else {
      newSet.add(folderId);
    }
    setExpandedFolders(newSet);
  };

  const FolderTreeItem = ({ folder, level = 0 }: { folder: FolderType; level?: number }) => {
    const isExpanded = expandedFolders.has(folder.id);
    const hasChildren = (folder.children && folder.children.length > 0) || (folder.files && folder.files.length > 0);

    return (
      <div key={folder.id}>
        <button
          onClick={() => hasChildren && toggleFolder(folder.id)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-700/50 text-slate-200 hover:text-white text-sm"
          style={{ paddingLeft: `${12 + level * 12}px` }}
        >
          {hasChildren && (
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
            />
          )}
          {!hasChildren && <div className="w-4" />}
          <Folder className="w-4 h-4" />
          <span className="truncate flex-1 text-left">{folder.name}</span>
        </button>

        {isExpanded && hasChildren && folder.children && folder.children.length > 0 && (
          <div>
            {folder.children.map((subfolder) => (
              <FolderTreeItem key={subfolder.id} folder={subfolder} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-800 text-white"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:relative w-64 h-screen bg-slate-800/50 border-r border-slate-700 backdrop-blur transition-transform duration-200 z-40 flex flex-col overflow-hidden`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700 pt-16 md:pt-4">
          <h1 className="text-xl font-bold text-white">Chand.AI</h1>
          <p className="text-xs text-slate-400 mt-1">Document Intelligence</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
              pathname === '/dashboard'
                ? 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-500'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            📊 Dashboard
          </Link>

          <Link
            href="/documents"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
              pathname === '/documents'
                ? 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-500'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            📁 Files
          </Link>

          <Link
            href="/chat"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
              pathname === '/chat'
                ? 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-500'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            💬 Chat
          </Link>

          <div className="pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between px-3 py-2 mb-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Folders</h3>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-slate-700"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>

            {isLoading ? (
              <div className="px-3 py-2 text-xs text-slate-400">Loading folders...</div>
            ) : folderHierarchy ? (
              <FolderTreeItem folder={folderHierarchy} />
            ) : (
              <div className="px-3 py-2 text-xs text-slate-400">No folders yet</div>
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 space-y-2">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full justify-start border-slate-600 text-slate-200 hover:bg-red-600/20 hover:text-red-400"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}
