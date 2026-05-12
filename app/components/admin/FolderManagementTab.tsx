'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/app/services/apiService';
import { toast } from 'sonner';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { Loader2, Trash2, FolderOpen, UserPlus, X, ShieldCheck, Eye } from 'lucide-react';
import { inputBase, badge } from '@/app/lib/theme';

interface AccessEntry {
  user_id: number;
  username: string;
  email: string;
  permission_level: 'read' | 'write';
  granted_at: string;
}

interface AdminFolder {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  owner_username: string;
  file_count: number;
  created_at: string;
  access_entries: AccessEntry[];
}

interface UserOption {
  id: number;
  username: string;
  email: string;
  role: string;
}

export default function FolderManagementTab() {
  const [folders, setFolders] = useState<AdminFolder[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Grant access modal state
  const [grantModal, setGrantModal] = useState<{ open: boolean; folder: AdminFolder | null }>({
    open: false,
    folder: null,
  });
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [selectedPermission, setSelectedPermission] = useState<'read' | 'write'>('read');
  const [isGranting, setIsGranting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [foldersData, usersData] = await Promise.all([
        apiService.getAdminFolders(),
        apiService.getUsers(),
      ]);
      setFolders(foldersData);
      setUsers(usersData.filter((u: UserOption) => u.role !== 'admin'));
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFolder = async (folderId: number) => {
    if (!confirm('Delete this project and all its files?')) return;
    try {
      await apiService.deleteFolder(folderId);
      toast.success('Project deleted');
      loadData();
    } catch {
      toast.error('Failed to delete project');
    }
  };

  const openGrantModal = (folder: AdminFolder) => {
    setGrantModal({ open: true, folder });
    setSelectedUserId('');
    setSelectedPermission('read');
  };

  const handleGrantAccess = async () => {
    if (!grantModal.folder || selectedUserId === '') return;
    setIsGranting(true);
    try {
      await apiService.grantFolderAccess(grantModal.folder.id, Number(selectedUserId), selectedPermission);
      toast.success('Access granted');
      setGrantModal({ open: false, folder: null });
      loadData();
    } catch {
      toast.error('Failed to grant access');
    } finally {
      setIsGranting(false);
    }
  };

  const handleRevokeAccess = async (folderId: number, userId: number, username: string) => {
    if (!confirm(`Revoke ${username}'s access?`)) return;
    try {
      await apiService.revokeFolderAccess(folderId, userId);
      toast.success('Access revoked');
      loadData();
    } catch {
      toast.error('Failed to revoke access');
    }
  };

  const filtered = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.owner_username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Users not already granted access to the selected folder
  const availableUsers = grantModal.folder
    ? users.filter((u) => !grantModal.folder!.access_entries.some((e) => e.user_id === u.id))
    : users;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">Project Access Management</h3>
        <p className="text-sm text-slate-400">
          View all projects, assign access to users and researchers
        </p>
      </div>

      <Input
        placeholder="Search by project name or owner…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={inputBase}
      />

      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-slate-400 text-sm">No projects found</p>
          ) : (
            <div className="space-y-4">
              {filtered.map((folder) => (
                <div
                  key={folder.id}
                  className="border border-slate-700 rounded-lg p-4 space-y-3"
                >
                  {/* Project header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FolderOpen className="w-5 h-5 text-amber-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">{folder.name}</p>
                        <p className="text-xs text-slate-400">
                          Owner: <span className="text-slate-300">{folder.owner_username}</span>
                          {' · '}
                          <span className={`px-1.5 py-0.5 rounded text-xs ${badge.blue}`}>
                            {folder.file_count} files
                          </span>
                          {' · '}
                          {new Date(folder.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openGrantModal(folder)}
                        className="h-8 px-2 text-xs hover:bg-green-600/20 text-green-400"
                        title="Grant access to a user"
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-1" />
                        Assign
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteFolder(folder.id)}
                        className="h-8 w-8 p-0 hover:bg-red-600/20 text-red-400"
                        title="Delete project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Access entries */}
                  {folder.access_entries.length > 0 && (
                    <div className="border-t border-slate-700/50 pt-2 space-y-1">
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Assigned users</p>
                      {folder.access_entries.map((entry) => (
                        <div
                          key={entry.user_id}
                          className="flex items-center justify-between gap-2 py-1 px-2 rounded bg-slate-700/30"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {entry.permission_level === 'write' ? (
                              <ShieldCheck className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                            ) : (
                              <Eye className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                            )}
                            <span className="text-slate-200 text-sm truncate">{entry.username}</span>
                            <span className="text-slate-400 text-xs truncate hidden sm:block">
                              {entry.email}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                entry.permission_level === 'write'
                                  ? 'bg-green-500/20 text-green-300'
                                  : 'bg-blue-500/20 text-blue-300'
                              }`}
                            >
                              {entry.permission_level}
                            </span>
                            <button
                              onClick={() => handleRevokeAccess(folder.id, entry.user_id, entry.username)}
                              className="text-slate-500 hover:text-red-400 transition"
                              title="Revoke access"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {folder.access_entries.length === 0 && (
                    <p className="text-xs text-slate-600 italic">No users assigned yet</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grant Access Modal */}
      <Dialog open={grantModal.open} onOpenChange={(open) => setGrantModal({ open, folder: grantModal.folder })}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Access</DialogTitle>
            <p className="text-sm text-slate-400">
              Grant a user access to <span className="text-white font-medium">{grantModal.folder?.name}</span>
            </p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm text-slate-300">User</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">Select a user…</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.role}) — {u.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-slate-300">Permission level</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedPermission('read')}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition ${
                    selectedPermission === 'read'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                      : 'border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  <div className="text-left">
                    <p className="font-medium">Read</p>
                    <p className="text-xs opacity-70">View files + chat</p>
                  </div>
                </button>
                <button
                  onClick={() => setSelectedPermission('write')}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition ${
                    selectedPermission === 'write'
                      ? 'border-green-500 bg-green-500/10 text-green-300'
                      : 'border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <div className="text-left">
                    <p className="font-medium">Write</p>
                    <p className="text-xs opacity-70">Upload + delete files</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setGrantModal({ open: false, folder: null })}
              className="text-slate-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGrantAccess}
              disabled={selectedUserId === '' || isGranting}
              className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
            >
              {isGranting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Grant Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
