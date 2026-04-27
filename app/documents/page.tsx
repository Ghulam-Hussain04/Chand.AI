'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore, File as FileType } from '@/app/stores/appStore';
import { useAuthStore } from '@/app/stores/authStore';
import { apiService } from '@/app/services/apiService';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import {
  FileText,
  Image,
  Download,
  Trash2,
  Upload,
  Loader2,
  MessageCircle,
  Search,
  FolderOpen,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { hasPermission } from '@/app/lib/rbac';
import { card, inputBase, btn, badge, fileTypeBadge, text, bg, border } from '@/app/lib/theme';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function DocumentsPage() {
  const { user } = useAuthStore();
  const { files, setFiles, selectedFileIds, toggleFileSelection, uploadProgress, setUploadProgress } =
    useAppStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [folderDropdownOpen, setFolderDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const canUpload = user && hasPermission(user.role, 'upload_file');
  const canDelete = user && hasPermission(user.role, 'delete_file');

  // Close folder dropdown on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFolderDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const [fetchedFiles, fetchedFolders] = await Promise.all([
          apiService.getFiles(),
          apiService.getFolders(),
        ]);
        setFiles(fetchedFiles);
        setFolders(fetchedFolders);
        if (fetchedFolders.length > 0 && selectedFolderId === null) {
          setSelectedFolderId(fetchedFolders[0].id);
        }
      } catch {
        toast.error('Failed to load files');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const reloadFiles = async () => {
    const fetchedFiles = await apiService.getFiles();
    setFiles(fetchedFiles);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    if (!selectedFolderId) {
      toast.error('Please select a project folder before uploading');
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
        const msg = err?.response?.data?.detail || `Failed to upload ${fileList[i].name}`;
        toast.error(msg);
      }
    }

    setUploadProgress(0);
    setIsUploading(false);
    if (fileList) (event.target as HTMLInputElement).value = '';

    if (successCount > 0) {
      toast.success(`${successCount} file(s) uploaded`);
      await reloadFiles();
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

  const handleChat = (fileId: number) => {
    window.location.href = `/chat?fileId=${fileId}`;
  };

  const handleChatWithSelected = () => {
    if (selectedFileIds.length === 0) return;
    window.location.href = `/chat?fileId=${selectedFileIds[0]}`;
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedFileIds.length} file(s)?`)) return;
    let deleted = 0;
    for (const id of selectedFileIds) {
      try {
        await apiService.deleteFile(id);
        deleted++;
      } catch {}
    }
    if (deleted > 0) {
      toast.success(`${deleted} file(s) deleted`);
      await reloadFiles();
    }
  };

  // Filter displayed files
  const filteredFiles = files.filter((f) => {
    const matchSearch =
      !searchQuery ||
      f.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (f.tags && f.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchSearch;
  });

  const selectedFolder = folders.find((f) => f.id === selectedFolderId);

  const FileIcon = ({ type }: { type: string }) =>
    type === 'image' ? (
      <Image className="w-5 h-5 text-blue-400" />
    ) : (
      <FileText className="w-5 h-5 text-green-400" />
    );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Files</h1>
          <p className="text-slate-400 text-sm mt-1">Manage and organise your files</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Folder selector */}
          {canUpload && (
            <div className="relative" ref={dropdownRef}>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-200 hover:bg-slate-700 gap-2 min-w-[150px] justify-between"
                onClick={() => setFolderDropdownOpen((o) => !o)}
              >
                <span className="flex items-center gap-2 truncate">
                  <FolderOpen className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">
                    {selectedFolder ? selectedFolder.name : 'Select folder'}
                  </span>
                </span>
                <ChevronDown className="w-3 h-3 flex-shrink-0" />
              </Button>

              {folderDropdownOpen && (
                <div className="absolute right-0 mt-1 w-52 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {folders.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-slate-400">No folders yet</p>
                  ) : (
                    folders.map((folder) => (
                      <button
                        key={folder.id}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-700 transition ${
                          selectedFolderId === folder.id ? 'text-blue-400' : 'text-slate-200'
                        }`}
                        onClick={() => {
                          setSelectedFolderId(folder.id);
                          setFolderDropdownOpen(false);
                        }}
                      >
                        {folder.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Upload button */}
          {canUpload && (
            <label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                disabled={isUploading || !selectedFolderId}
                className="hidden"
                accept=".jpg,.jpeg,.png,.csv"
              />
              <Button
                asChild
                size="sm"
                disabled={isUploading || !selectedFolderId}
                className={`${btn.primary} cursor-pointer`}
                title={!selectedFolderId ? 'Select a project folder first' : undefined}
              >
                <span>
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
                </span>
              </Button>
            </label>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search files…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`pl-10 ${inputBase}`}
        />
      </div>

      {/* File grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Loading files…</p>
          </div>
        </div>
      ) : filteredFiles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.map((file) => (
            <Card
              key={file.id}
              className={`${card} hover:border-slate-600 transition cursor-pointer group ${
                selectedFileIds.includes(file.id) ? 'ring-2 ring-blue-500 border-blue-500/50' : ''
              }`}
              onClick={() => toggleFileSelection(file.id)}
            >
              <CardContent className="p-4">
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <input
                    type="checkbox"
                    checked={selectedFileIds.includes(file.id)}
                    onChange={() => {}}
                    className="w-4 h-4 rounded accent-blue-500"
                  />
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); handleChat(file.id); }}
                      className="h-7 w-7 p-0 hover:bg-blue-600/20 hover:text-blue-400"
                      title="Chat"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                      className="h-7 w-7 p-0 hover:bg-cyan-600/20 hover:text-cyan-400"
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

                {/* File icon + name */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center flex-shrink-0">
                    <FileIcon type={file.file_type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-slate-200 font-medium truncate text-sm">
                      {file.original_filename}
                    </h3>
                    <p className="text-xs text-slate-400">{formatBytes(file.file_size)}</p>
                  </div>
                </div>

                {/* File type badge */}
                <span
                  className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                    fileTypeBadge[file.file_type] ?? badge.slate
                  }`}
                >
                  {file.file_type.toUpperCase()}
                </span>

                {/* Description */}
                {file.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 mt-2">{file.description}</p>
                )}

                {/* Tags */}
                {file.tags && file.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {file.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className={`text-xs px-2 py-0.5 rounded-full ${badge.slate}`}>
                        {tag}
                      </span>
                    ))}
                    {file.tags.length > 3 && (
                      <span className="text-xs text-slate-400">+{file.tags.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Date */}
                <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-700">
                  {new Date(file.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className={`${card} border-dashed`}>
          <CardContent className="p-12 text-center">
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-medium text-slate-200 mb-2">
              {searchQuery ? 'No matching files' : 'No files yet'}
            </h3>
            <p className="text-slate-400 mb-6 text-sm">
              {searchQuery
                ? 'Try a different search term'
                : 'Select a project folder and upload your first file'}
            </p>
            {!searchQuery && canUpload && (
              <label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  disabled={isUploading || !selectedFolderId}
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.csv"
                />
                <Button
                  asChild
                  size="sm"
                  disabled={!selectedFolderId}
                  className={`${btn.primary} cursor-pointer`}
                >
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Files
                  </span>
                </Button>
              </label>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bulk action bar */}
      {selectedFileIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-5 py-3 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl z-50">
          <span className="text-sm text-slate-300">
            {selectedFileIds.length} selected
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-200 hover:bg-blue-600/20 hover:text-blue-400"
              onClick={handleChatWithSelected}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat
            </Button>
            {canDelete && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
