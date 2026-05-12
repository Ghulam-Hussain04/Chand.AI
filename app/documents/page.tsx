'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore, File as FileType } from '@/app/stores/appStore';
import { useAuthStore } from '@/app/stores/authStore';
import { apiService } from '@/app/services/apiService';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import {
  FileText,
  Download,
  Trash2,
  Upload,
  Loader2,
  MessageCircle,
  Search,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Image as ImageIcon,
  FolderPlus,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import { hasPermission } from '@/app/lib/rbac';
import { card, inputBase, btn, badge, fileTypeBadge, text } from '@/app/lib/theme';
import NextImage from 'next/image';
import CreateFolderModal from '@/app/components/CreateFolderModal';
import SpecificationsModal from '@/app/components/SpecificationsModal';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function ThumbnailImage({ fileId }: { fileId: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    apiService.getThumbnail(fileId).then((url) => {
      objectUrl = url;
      setSrc(url);
    });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);

  if (!src) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-700/30 rounded-lg">
        <ImageIcon className="w-8 h-8 text-slate-600" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <NextImage src={src} alt="" fill className="object-cover rounded-lg" unoptimized />
    </div>
  );
}

export default function DocumentsPage() {
  const { user } = useAuthStore();
  const {
    files, setFiles,
    selectedFileIds, toggleFileSelection,
    uploadProgress, setUploadProgress,
    selectedFolderId, setSelectedFolderId,
    folderHierarchy,
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [rootFolders, setRootFolders] = useState<any[]>([]);
  const [subfolders, setSubfolders] = useState<any[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<{ id: number; name: string }[]>([]);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createSubfolderParentId, setCreateSubfolderParentId] = useState<number | null>(null);
  const [specsModalOpen, setSpecsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // Load root folders on mount
  useEffect(() => {
    apiService.getFolders().then((folders) => {
      setRootFolders(folders);
      if (folders.length > 0 && selectedFolderId === null) {
        setSelectedFolderId(folders[0].id);
        setBreadcrumb([{ id: folders[0].id, name: folders[0].name }]);
      }
    }).catch(() => toast.error('Failed to load projects'));
  }, []);

  // Load files + subfolders whenever selected folder changes
  const loadFolderContents = useCallback(async (folderId: number) => {
    setIsLoading(true);
    try {
      const [fetchedFiles, fetchedSubs] = await Promise.all([
        apiService.getFolderFiles(folderId),
        apiService.getSubfolders(folderId),
      ]);
      setFiles(fetchedFiles);
      setSubfolders(fetchedSubs);
    } catch {
      toast.error('Failed to load folder contents');
    } finally {
      setIsLoading(false);
    }
  }, [setFiles]);

  useEffect(() => {
    if (selectedFolderId !== null) {
      loadFolderContents(selectedFolderId);
    } else {
      setFiles([]);
      setSubfolders([]);
    }
  }, [selectedFolderId, loadFolderContents]);

  const handleRootFolderSelect = (folder: any) => {
    setSelectedFolderId(folder.id);
    setBreadcrumb([{ id: folder.id, name: folder.name }]);
  };

  const handleSubfolderClick = (folder: any) => {
    setSelectedFolderId(folder.id);
    setBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    const crumb = breadcrumb[index];
    setBreadcrumb(breadcrumb.slice(0, index + 1));
    setSelectedFolderId(crumb.id);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    if (!selectedFolderId) {
      toast.error('Select a project folder before uploading');
      return;
    }

    setIsUploading(true);
    let successCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      try {
        setUploadProgress(Math.round(((i + 1) / fileList.length) * 100));
        await apiService.uploadFile(fileList[i], selectedFolderId);
        successCount++;
      } catch (err: any) {
        toast.error(err?.response?.data?.detail || `Failed to upload ${fileList[i].name}`);
      }
    }

    setUploadProgress(0);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (successCount > 0) {
      toast.success(`${successCount} file(s) uploaded`);
      loadFolderContents(selectedFolderId);
    }
  };

  const handleDelete = async (fileId: number) => {
    if (!confirm('Delete this file?')) return;
    try {
      await apiService.deleteFile(fileId);
      setFiles(files.filter((f) => f.id !== fileId));
      toast.success('File deleted');
    } catch {
      toast.error('Failed to delete file');
    }
  };

  const handleDownload = async (file: FileType) => {
    try {
      const blob = await apiService.downloadFile(file.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedFileIds.length} file(s)?`)) return;
    let deleted = 0;
    for (const id of selectedFileIds) {
      try { await apiService.deleteFile(id); deleted++; } catch {}
    }
    if (deleted > 0) {
      toast.success(`${deleted} file(s) deleted`);
      if (selectedFolderId) loadFolderContents(selectedFolderId);
    }
  };

  const handleFolderCreated = async () => {
    setCreateFolderOpen(false);
    setCreateSubfolderParentId(null);
    if (selectedFolderId !== null) {
      const subs = await apiService.getSubfolders(selectedFolderId).catch(() => []);
      setSubfolders(subs);
    }
    const updated = await apiService.getFolders().catch(() => rootFolders);
    setRootFolders(updated);
    const trees = await apiService.getFolderHierarchy().catch(() => []);
    useAppStore.getState().setFolderHierarchy(trees);
  };

  const filteredFiles = files.filter((f) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.original_filename.toLowerCase().includes(q) ||
      (f.description && f.description.toLowerCase().includes(q)) ||
      (f.tags && f.tags.some((t) => t.toLowerCase().includes(q)))
    );
  });

  const selectedFolder = rootFolders.find((f) => f.id === breadcrumb[0]?.id);

  // access_level for the currently selected root project ('owner' | 'write' | 'read' | undefined)
  const currentRootAccessLevel = selectedFolder?.access_level as string | undefined;
  const hasWriteAccess =
    user?.role === 'admin' ||
    currentRootAccessLevel === 'owner' ||
    currentRootAccessLevel === 'write';
  const canUpload = !!(user && hasPermission(user.role, 'upload_file') && hasWriteAccess);
  const canDelete = !!(user && hasPermission(user.role, 'delete_file') && hasWriteAccess);
  const canCreateSubfolder = !!(user && hasPermission(user.role, 'create_folder') && hasWriteAccess);
  const canCreateFolder = !!(user && hasPermission(user.role, 'create_folder'));

  return (
    <div className="flex h-full">
      {/* ── Left panel: project list ───────────────────────────── */}
      <aside className="w-56 flex-shrink-0 border-r border-slate-700 bg-slate-900/40 overflow-y-auto flex flex-col">
        <div className="p-3 border-b border-slate-700 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Projects</span>
          {canCreateFolder && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 hover:bg-amber-500/10 hover:text-amber-400"
              onClick={() => { setCreateSubfolderParentId(null); setCreateFolderOpen(true); }}
              title="New root project"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        <div className="flex-1 p-2 space-y-0.5">
          {rootFolders.length === 0 ? (
            <p className="text-xs text-slate-500 px-2 py-4 text-center">No projects yet</p>
          ) : (
            rootFolders.map((folder) => {
              const isActive = breadcrumb[0]?.id === folder.id;
              return (
                <button
                  key={folder.id}
                  onClick={() => handleRootFolderSelect(folder)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <FolderOpen className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{folder.name}</span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5">

          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              {/* Breadcrumb */}
              <div className="flex items-center gap-1 text-sm">
                <span className="text-slate-400">Files</span>
                {breadcrumb.map((crumb, idx) => (
                  <span key={crumb.id} className="flex items-center gap-1">
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                    <button
                      onClick={() => handleBreadcrumbClick(idx)}
                      className={`hover:text-amber-400 transition ${
                        idx === breadcrumb.length - 1 ? 'text-amber-300 font-medium' : 'text-slate-300'
                      }`}
                    >
                      {crumb.name}
                    </button>
                  </span>
                ))}
              </div>
              <h1 className="text-xl font-bold text-white mt-0.5">
                {breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].name : 'Select a project'}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Mission config — only for root projects (no breadcrumb ancestor) */}
              {selectedFolderId !== null && breadcrumb.length === 1 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-amber-500/10 hover:border-amber-500/50 hover:text-amber-300"
                  onClick={() => setSpecsModalOpen(true)}
                  title="Mission calibration settings"
                >
                  <Settings2 className="w-4 h-4 mr-1.5" />
                  Mission Config
                </Button>
              )}

              {canCreateSubfolder && selectedFolderId !== null && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-amber-500/10 hover:border-amber-500/50 hover:text-amber-300"
                  onClick={() => { setCreateSubfolderParentId(selectedFolderId); setCreateFolderOpen(true); }}
                >
                  <FolderPlus className="w-4 h-4 mr-1.5" />
                  Subfolder
                </Button>
              )}

              {canUpload && selectedFolderId !== null && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.csv"
                  />
                  <Button
                    size="sm"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className={btn.primary}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {uploadProgress}%
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Search */}
          {selectedFolderId !== null && (
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search files…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-10 ${inputBase}`}
              />
            </div>
          )}

          {/* No project selected */}
          {selectedFolderId === null && (
            <Card className={`${card} border-dashed`}>
              <CardContent className="p-12 text-center">
                <FolderOpen className="w-12 h-12 text-amber-500/40 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-200 mb-2">Select a project</h3>
                <p className="text-slate-400 text-sm">Choose a project from the left panel to view its files.</p>
              </CardContent>
            </Card>
          )}

          {/* Loading */}
          {selectedFolderId !== null && isLoading && (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500/60" />
            </div>
          )}

          {/* Subfolders */}
          {!isLoading && subfolders.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Subfolders</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {subfolders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => handleSubfolderClick(folder)}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/60 border border-slate-700 hover:border-amber-500/40 hover:bg-amber-500/5 transition text-left group"
                  >
                    <FolderOpen className="w-5 h-5 text-amber-400/70 flex-shrink-0 group-hover:text-amber-400" />
                    <span className="text-sm text-slate-300 truncate group-hover:text-white">{folder.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Files grid */}
          {!isLoading && selectedFolderId !== null && (
            filteredFiles.length > 0 ? (
              <div>
                {subfolders.length > 0 && (
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Files</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredFiles.map((file) => (
                    <Card
                      key={file.id}
                      className={`${card} hover:border-amber-500/30 transition cursor-pointer group ${
                        selectedFileIds.includes(file.id) ? 'ring-2 ring-amber-500 border-amber-500/50' : ''
                      }`}
                      onClick={() => toggleFileSelection(file.id)}
                    >
                      <CardContent className="p-0">
                        {/* Image preview */}
                        {file.file_type === 'image' && (
                          <div className="h-36 w-full overflow-hidden rounded-t-lg">
                            <ThumbnailImage fileId={file.id} />
                          </div>
                        )}

                        <div className="p-4">
                          {/* Top row */}
                          <div className="flex items-start justify-between mb-2">
                            <input
                              type="checkbox"
                              checked={selectedFileIds.includes(file.id)}
                              onChange={() => {}}
                              className="w-4 h-4 rounded accent-amber-500"
                            />
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => { e.stopPropagation(); window.location.href = `/chat?fileId=${file.id}`; }}
                                className="h-7 w-7 p-0 hover:bg-amber-600/20 hover:text-amber-400"
                                title="Chat about this file"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                                className="h-7 w-7 p-0 hover:bg-slate-600/40 hover:text-slate-200"
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              {canDelete && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                                  className="h-7 w-7 p-0 hover:bg-red-600/20 hover:text-red-400"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* File icon + name (only show icon for non-images) */}
                          <div className="flex items-center gap-2 mb-2">
                            {file.file_type !== 'image' && (
                              <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-4 h-4 text-green-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-slate-200 font-medium truncate text-sm">
                                {file.original_filename}
                              </h3>
                              <p className="text-xs text-slate-400">{formatBytes(file.file_size)}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${fileTypeBadge[file.file_type] ?? badge.slate}`}>
                              {file.file_type.toUpperCase()}
                            </span>
                            <p className="text-xs text-slate-500">
                              {new Date(file.created_at).toLocaleDateString()}
                            </p>
                          </div>

                          {file.tags && file.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {file.tags.slice(0, 2).map((tag) => (
                                <span key={tag} className={`text-xs px-1.5 py-0.5 rounded-full ${badge.slate}`}>{tag}</span>
                              ))}
                              {file.tags.length > 2 && (
                                <span className="text-xs text-slate-500">+{file.tags.length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : !isLoading && subfolders.length === 0 ? (
              <Card className={`${card} border-dashed`}>
                <CardContent className="p-10 text-center">
                  <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3 opacity-40" />
                  <h3 className="text-base font-medium text-slate-200 mb-1">
                    {searchQuery ? 'No matching files' : 'No files yet'}
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    {searchQuery ? 'Try a different search term' : 'Upload files or create a subfolder to get started'}
                  </p>
                  {!searchQuery && canUpload && (
                    <Button size="sm" onClick={() => fileInputRef.current?.click()} className={btn.primary}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Files
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : null
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedFileIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-5 py-3 rounded-xl bg-slate-800 border border-amber-500/30 shadow-2xl z-50">
          <span className="text-sm text-slate-300">{selectedFileIds.length} selected</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
              onClick={() => { window.location.href = `/chat?fileId=${selectedFileIds[0]}`; }}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat
            </Button>
            {canDelete && (
              <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>
      )}

      <CreateFolderModal
        isOpen={createFolderOpen}
        onClose={() => { setCreateFolderOpen(false); setCreateSubfolderParentId(null); }}
        onSuccess={handleFolderCreated}
        parentId={createSubfolderParentId}
      />

      {specsModalOpen && selectedFolderId !== null && (
        <SpecificationsModal
          isOpen={specsModalOpen}
          onClose={() => setSpecsModalOpen(false)}
          folderId={selectedFolderId}
          folderName={breadcrumb[breadcrumb.length - 1]?.name ?? 'Project'}
        />
      )}
    </div>
  );
}
