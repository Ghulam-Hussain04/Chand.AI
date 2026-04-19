'use client';

import { useState, useEffect } from 'react';
import { useAppStore, File as FileType } from '@/app/stores/appStore';
import { apiService } from '@/app/services/apiService';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import {
  FileText,
  Download,
  Trash2,
  Plus,
  Upload,
  Loader2,
  MessageCircle,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';

export default function DocumentsPage() {
  const {
    files,
    setFiles,
    selectedFileIds,
    toggleFileSelection,
    uploadProgress,
    setUploadProgress,
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const loadFiles = async () => {
      try {
        const fetchedFiles = await apiService.getFiles();
        setFiles(fetchedFiles);
      } catch (error) {
        toast.error('Failed to load files');
      } finally {
        setIsLoading(false);
      }
    };

    loadFiles();
  }, [setFiles]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList) return;

    setIsUploading(true);
    let successCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      try {
        const file = fileList[i];
        const progress = Math.round(((i + 1) / fileList.length) * 100);
        setUploadProgress(progress);

        await apiService.uploadFile(file);
        successCount++;
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }

    setUploadProgress(0);
    setIsUploading(false);

    if (successCount > 0) {
      toast.success(`${successCount} file(s) uploaded successfully`);
      // Reload files
      const fetchedFiles = await apiService.getFiles();
      setFiles(fetchedFiles);
    } else {
      toast.error('Failed to upload files');
    }
  };

  const handleDelete = async (fileId: number) => {
    try {
      await apiService.deleteFile(fileId);
      setFiles(files.filter((f) => f.id !== fileId));
      toast.success('File deleted successfully');
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  const handleChat = (fileId: number) => {
    // Navigate to chat with file ID
    window.location.href = `/chat?fileId=${fileId}`;
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">My Documents</h1>
          <p className="text-slate-400 mt-2">Manage and organize your files</p>
        </div>

        <div className="flex gap-2">
          <label>
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.md,.jpg,.jpeg,.png"
            />
            <Button asChild className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 cursor-pointer">
              <span>
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Files
                  </>
                )}
              </span>
            </Button>
          </label>
        </div>
      </div>

      {/* Files Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
            <p className="text-slate-400">Loading files...</p>
          </div>
        </div>
      ) : files.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <Card
              key={file.id}
              className={`bg-slate-800/50 border-slate-700 hover:border-slate-600 transition cursor-pointer group ${
                selectedFileIds.includes(file.id) ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => toggleFileSelection(file.id)}
            >
              <CardContent className="p-4">
                {/* Checkbox */}
                <div className="flex items-start justify-between mb-3">
                  <input
                    type="checkbox"
                    checked={selectedFileIds.includes(file.id)}
                    onChange={() => {}}
                    className="w-4 h-4 rounded"
                  />
                  <div className="opacity-0 group-hover:opacity-100 transition flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChat(file.id);
                      }}
                      className="h-8 w-8 p-0 hover:bg-blue-600/20 hover:text-blue-400"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(file.id);
                      }}
                      className="h-8 w-8 p-0 hover:bg-red-600/20 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* File Icon */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-slate-200 font-medium truncate">{file.filename}</h3>
                    <p className="text-xs text-slate-400">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>

                {/* Description */}
                {file.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">{file.description}</p>
                )}

                {/* Tags */}
                {file.tags && file.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {file.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-1 rounded-full bg-slate-700/50 text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                    {file.tags.length > 2 && (
                      <span className="text-xs px-2 py-1 text-slate-400">
                        +{file.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}

                {/* Date */}
                <div className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-700">
                  {new Date(file.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-slate-800/50 border-slate-700 border-dashed">
          <CardContent className="p-12 text-center">
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-slate-200 mb-2">No documents yet</h3>
            <p className="text-slate-400 mb-6">Upload your first document to get started</p>
            <label>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.md,.jpg,.jpeg,.png"
              />
              <Button asChild className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 cursor-pointer">
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Files
                </span>
              </Button>
            </label>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {selectedFileIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 p-4 rounded-lg bg-slate-800 border border-slate-700 shadow-lg">
          <span className="text-sm text-slate-300">
            {selectedFileIds.length} file(s) selected
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat with Selected
            </Button>
            <Button size="sm" variant="destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
