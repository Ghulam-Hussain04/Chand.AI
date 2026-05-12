'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/app/stores/appStore';
import { useAuthStore } from '@/app/stores/authStore';
import { apiService } from '@/app/services/apiService';
import {
  Folder, LogOut, Menu, X, Plus, ChevronDown,
  MoreVertical, Trash2, Edit2, MessageSquare,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { hasPermission } from '@/app/lib/rbac';
import { toast } from 'sonner';
import { Folder as FolderType } from '@/app/stores/appStore';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import CreateFolderModal from '@/app/components/CreateFolderModal';
import EditFolderModal from '@/app/components/EditFolderModal';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { logout, user } = useAuthStore();
  const {
    sidebarOpen, setSidebarOpen,
    folderHierarchy, setFolderHierarchy,
    selectedFolderId, setSelectedFolderId,
  } = useAppStore();

  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [hoveredFolderId, setHoveredFolderId] = useState<number | null>(null);

  // Chat session state
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [chatsExpanded, setChatsExpanded] = useState(true);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [projectsExpanded, setProjectsExpanded] = useState(true);

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

  const loadChatSessions = async () => {
    setIsLoadingChats(true);
    try {
      const sessions = await apiService.getChatSessions();
      setChatSessions(sessions);
    } catch {
      // silently ignore — chats may not exist yet
    } finally {
      setIsLoadingChats(false);
    }
  };

  useEffect(() => {
    loadFolders();
    loadChatSessions();
  }, []);

  // Refresh chat sessions whenever the user navigates away from /chat
  useEffect(() => {
    if (pathname !== '/chat') loadChatSessions();
  }, [pathname]);

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

  const handleFolderClick = (folder: FolderType) => {
    setSelectedFolderId(folder.id);
    if (pathname !== '/documents') router.push('/documents');
  };

  const handleDeleteFolder = async (folderId: number) => {
    if (!confirm('Delete this project and all its contents?')) return;
    try {
      await apiService.deleteFolder(folderId);
      toast.success('Project deleted');
      await loadFolders();
    } catch {
      toast.error('Failed to delete project');
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (!confirm('Delete this chat session?')) return;
    try {
      await apiService.deleteChatSession(sessionId);
      setChatSessions((prev) => prev.filter((s) => s.id !== sessionId));
      // If we're currently viewing this session, go to fresh chat
      if (pathname === '/chat' && searchParams?.get('sessionId') === String(sessionId)) {
        router.push('/chat');
      }
    } catch {
      toast.error('Failed to delete session');
    }
  };

  const FolderTreeItem = ({ folder, level = 0 }: { folder: FolderType; level?: number }) => {
    const isExpanded = expandedFolders.has(folder.id);
    const hasChildren = !!(folder.children && folder.children.length > 0);
    const isSelected = selectedFolderId === folder.id;

    return (
      <div>
        <div
          className={`w-full flex items-center gap-2 py-1.5 rounded-lg text-sm group cursor-pointer transition ${
            isSelected
              ? 'bg-amber-500/15 text-amber-300'
              : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
          }`}
          style={{ paddingLeft: `${10 + level * 12}px`, paddingRight: '8px' }}
          onMouseEnter={() => setHoveredFolderId(folder.id)}
          onMouseLeave={() => setHoveredFolderId(null)}
          onClick={() => handleFolderClick(folder)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); hasChildren && toggleFolder(folder.id); }}
            className="flex-shrink-0 w-4"
          >
            {hasChildren ? (
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
            ) : null}
          </button>

          <Folder className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
          <span className="truncate flex-1 text-xs">{folder.name}</span>

          {hoveredFolderId === folder.id && (canDeleteFolder || canUpdateFolder) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 w-5 p-0 hover:bg-slate-600 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                {canUpdateFolder && (
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); setEditingFolder(folder); }}
                    className="flex items-center gap-2 cursor-pointer text-slate-200 hover:text-white focus:text-white"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </DropdownMenuItem>
                )}
                {canDeleteFolder && (
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                    className="flex items-center gap-2 cursor-pointer text-red-400 focus:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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

  const ChatSessionItem = ({ session }: { session: any }) => {
    const activeSessionId = searchParams?.get('sessionId');
    const isActive = pathname === '/chat' && activeSessionId === String(session.id);

    return (
      <div
        className={`w-full flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs group cursor-pointer transition ${
          isActive
            ? 'bg-amber-500/15 text-amber-300'
            : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
        }`}
        onClick={() => router.push(`/chat?sessionId=${session.id}`)}
      >
        <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
        <span className="truncate flex-1">{session.title}</span>
        {session.message_count > 0 && (
          <span className="text-[9px] px-1.5 py-px rounded-full bg-slate-700 text-slate-400 flex-shrink-0">
            {session.message_count}
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }}
          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition flex-shrink-0"
          title="Delete session"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    );
  };

  const navLink = (href: string, label: string) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
          isActive
            ? 'bg-amber-500/15 text-amber-300 border-l-2 border-amber-500 pl-2.5'
            : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
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
        } md:translate-x-0 fixed md:relative w-56 h-screen bg-slate-900/60 border-r border-slate-700/80 backdrop-blur transition-transform duration-200 z-40 flex flex-col overflow-hidden`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700 pt-14 md:pt-4">
          <h2 className="text-base font-bold text-white">Dr. Terra</h2>
          {user && (
            <p className="text-xs text-slate-400 mt-0.5">
              {user.username} ·{' '}
              <span className="text-amber-400/80 capitalize">{user.role}</span>
            </p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navLink('/dashboard', '📊 Dashboard')}
          {navLink('/documents', '📁 Files')}
          {navLink('/chat', '💬 Chat')}
          {user?.role === 'admin' && navLink('/admin', '⚙️ Admin')}

          {/* Projects */}
          <div className="pt-3 mt-1 border-t border-slate-700/60">
            <div
              className="flex items-center justify-between px-3 py-1.5 mb-1 cursor-pointer select-none"
              onClick={() => setProjectsExpanded((v) => !v)}
            >
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Projects</h3>
              <div className="flex items-center gap-1">
                {canCreateFolder && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0 hover:bg-amber-500/10 hover:text-amber-400"
                    onClick={(e) => { e.stopPropagation(); setCreateFolderOpen(true); }}
                    title="New project"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                )}
                <ChevronDown
                  className={`w-3 h-3 text-slate-500 transition-transform ${projectsExpanded ? '' : '-rotate-90'}`}
                />
              </div>
            </div>

            {projectsExpanded && (
              isLoading ? (
                <p className="px-3 py-2 text-xs text-slate-500">Loading…</p>
              ) : folderHierarchy && folderHierarchy.length > 0 ? (
                folderHierarchy.map((folder) => (
                  <FolderTreeItem key={folder.id} folder={folder} />
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-slate-500">No projects yet</p>
              )
            )}
          </div>

          {/* Chats */}
          <div className="pt-3 mt-1 border-t border-slate-700/60">
            <div
              className="flex items-center justify-between px-3 py-1.5 mb-1 cursor-pointer select-none"
              onClick={() => setChatsExpanded((v) => !v)}
            >
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chats</h3>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 w-5 p-0 hover:bg-amber-500/10 hover:text-amber-400"
                  onClick={(e) => { e.stopPropagation(); router.push('/chat'); }}
                  title="New chat"
                >
                  <Plus className="w-3 h-3" />
                </Button>
                <ChevronDown
                  className={`w-3 h-3 text-slate-500 transition-transform ${chatsExpanded ? '' : '-rotate-90'}`}
                />
              </div>
            </div>

            {chatsExpanded && (
              isLoadingChats ? (
                <p className="px-3 py-2 text-xs text-slate-500">Loading…</p>
              ) : chatSessions.length > 0 ? (
                chatSessions.slice(0, 30).map((session) => (
                  <ChatSessionItem key={session.id} session={session} />
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-slate-500">No chats yet</p>
              )
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-700">
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="w-full justify-start border-slate-700 text-slate-300 hover:bg-red-600/10 hover:text-red-400 hover:border-red-600/30"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)} />
      )}

      <CreateFolderModal
        isOpen={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
        onSuccess={async () => { setCreateFolderOpen(false); await loadFolders(); }}
      />

      {editingFolder && (
        <EditFolderModal
          folder={editingFolder}
          onClose={() => setEditingFolder(null)}
          onSuccess={async () => { setEditingFolder(null); await loadFolders(); }}
        />
      )}
    </>
  );
}
