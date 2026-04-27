'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAppStore } from '@/app/stores/appStore';
import { useAuthStore } from '@/app/stores/authStore';
import { apiService } from '@/app/services/apiService';
import {
  Folder,
  LogOut,
  Menu,
  X,
  Plus,
  ChevronDown,
  MoreVertical,
  Trash2,
  Edit2,
  Settings,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { hasPermission } from '@/app/lib/rbac';
import { toast } from 'sonner';
import { Folder as FolderType } from '@/app/stores/appStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import CreateFolderModal from '@/app/components/CreateFolderModal';
import EditFolderModal from '@/app/components/EditFolderModal';
import { bg, border, text, btn } from '@/app/lib/theme';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user } = useAuthStore();
  const { sidebarOpen, setSidebarOpen, folderHierarchy, setFolderHierarchy } = useAppStore();

  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [hoveredFolderId, setHoveredFolderId] = useState<number | null>(null);

  const canCreateFolder = user && hasPermission(user.role, 'create_folder');
  const canDeleteFolder = user && hasPermission(user.role, 'delete_folder');
  const canUpdateFolder = user && hasPermission(user.role, 'update_folder');

  const loadFolders = async () => {
    try {
      const trees = await apiService.getFolderHierarchy();
      setFolderHierarchy(Array.isArray(trees) ? trees : []);
    } catch {
      toast.error('Failed to load projects');
      setFolderHierarchy([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const toggleFolder = (folderId: number) => {
    const next = new Set(expandedFolders);
    if (next.has(folderId)) next.delete(folderId);
    else next.add(folderId);
    setExpandedFolders(next);
  };

  const handleDeleteFolder = async (folderId: number) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await apiService.deleteFolder(folderId);
      toast.success('Project deleted');
      await loadFolders();
    } catch {
      toast.error('Failed to delete project');
    }
  };

  const handleFolderCreated = async () => {
    setCreateFolderOpen(false);
    await loadFolders();
  };

  const handleFolderUpdated = async () => {
    setEditingFolder(null);
    await loadFolders();
  };

  const FolderTreeItem = ({ folder, level = 0 }: { folder: FolderType; level?: number }) => {
    const isExpanded = expandedFolders.has(folder.id);
    const hasChildren = !!(folder.children && folder.children.length > 0);

    return (
      <div>
        <div
          className="w-full flex items-center gap-2 py-2 rounded-lg hover:bg-slate-700/50 text-slate-200 hover:text-white text-sm group cursor-pointer"
          style={{ paddingLeft: `${12 + level * 12}px`, paddingRight: '12px' }}
          onMouseEnter={() => setHoveredFolderId(folder.id)}
          onMouseLeave={() => setHoveredFolderId(null)}
        >
          <button
            onClick={() => hasChildren && toggleFolder(folder.id)}
            className="flex-shrink-0"
            title={hasChildren ? (isExpanded ? 'Collapse' : 'Expand') : undefined}
          >
            {hasChildren ? (
              <ChevronDown
                className={`w-4 h-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
              />
            ) : (
              <div className="w-4" />
            )}
          </button>

          <Folder className="w-4 h-4 flex-shrink-0 text-slate-400" />
          <span className="truncate flex-1">{folder.name}</span>

          {hoveredFolderId === folder.id && (canDeleteFolder || canUpdateFolder) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-slate-600 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canUpdateFolder && (
                  <DropdownMenuItem
                    onClick={() => setEditingFolder(folder)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {canDeleteFolder && (
                  <DropdownMenuItem
                    onClick={() => handleDeleteFolder(folder.id)}
                    className="flex items-center gap-2 cursor-pointer text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {isExpanded && hasChildren && folder.children && (
          <div>
            {folder.children.map((sub) => (
              <FolderTreeItem key={sub.id} folder={sub} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const navLink = (href: string, label: string, activeColor = 'blue') => {
    const isActive = pathname === href;
    const activeClasses =
      activeColor === 'purple'
        ? 'bg-purple-600/20 text-purple-400 border-l-2 border-purple-500'
        : 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-500';
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
          isActive ? activeClasses : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
        }`}
      >
        {label}
      </Link>
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

      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:relative w-64 h-screen bg-slate-800/50 border-r border-slate-700 backdrop-blur transition-transform duration-200 z-40 flex flex-col overflow-hidden`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700 pt-16 md:pt-4">
          <h2 className="text-lg font-bold text-white">Dr. Terra</h2>
          {user && (
            <p className="text-xs text-slate-400 mt-1">
              {user.username} · {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navLink('/dashboard', '📊 Dashboard')}
          {navLink('/documents', '📁 Files')}
          {navLink('/chat', '💬 Chat')}
          {user?.role === 'admin' && (
            <Link
              href="/admin"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                pathname === '/admin'
                  ? 'bg-purple-600/20 text-purple-400 border-l-2 border-purple-500'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              Admin
            </Link>
          )}

          {/* Projects / Folders */}
          <div className="pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between px-3 py-2 mb-1">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Projects
              </h3>
              {canCreateFolder && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-slate-700"
                  onClick={() => setCreateFolderOpen(true)}
                  title="New project"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              )}
            </div>

            {isLoading ? (
              <p className="px-3 py-2 text-xs text-slate-400">Loading…</p>
            ) : folderHierarchy && folderHierarchy.length > 0 ? (
              folderHierarchy.map((folder) => (
                <FolderTreeItem key={folder.id} folder={folder} />
              ))
            ) : (
              <p className="px-3 py-2 text-xs text-slate-400">No projects yet</p>
            )}

            {!canCreateFolder && (
              <p className="px-3 py-2 text-xs text-slate-500 italic">
                Only admins and researchers can create projects
              </p>
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
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

      <CreateFolderModal
        isOpen={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
        onSuccess={handleFolderCreated}
      />

      {editingFolder && (
        <EditFolderModal
          folder={editingFolder}
          onClose={() => setEditingFolder(null)}
          onSuccess={handleFolderUpdated}
        />
      )}
    </>
  );
}
