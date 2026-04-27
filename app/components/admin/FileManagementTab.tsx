'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/app/services/apiService';
import { toast } from 'sonner';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Loader2, Trash2, Image, FileText } from 'lucide-react';
import { inputBase, badge, fileTypeBadge } from '@/app/lib/theme';

interface FileRecord {
  id: number;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  folder_id: number;
  created_at: string;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function FileManagementTab() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { loadFiles(); }, []);

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getFiles();
      setFiles(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (fileId: number) => {
    if (!confirm('Delete this file?')) return;
    try {
      await apiService.deleteFile(fileId);
      toast.success('File deleted');
      loadFiles();
    } catch {
      toast.error('Failed to delete file');
    }
  };

  const filtered = files.filter((f) =>
    f.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">File Management</h3>
        <p className="text-sm text-slate-400">View and manage all uploaded files</p>
      </div>

      <Input
        placeholder="Search files…"
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
            <p className="text-center py-8 text-slate-400 text-sm">No files found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-700">
                  <tr className="text-xs text-slate-400 uppercase tracking-wider">
                    <th className="text-left py-3 px-4 font-medium">Filename</th>
                    <th className="text-left py-3 px-4 font-medium">Type</th>
                    <th className="text-left py-3 px-4 font-medium">Size</th>
                    <th className="text-left py-3 px-4 font-medium">Uploaded</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((file) => (
                    <tr
                      key={file.id}
                      className="border-b border-slate-700/50 hover:bg-slate-700/20 transition"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {file.file_type === 'image' ? (
                            <Image className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-green-400 flex-shrink-0" />
                          )}
                          <span className="text-white text-sm truncate max-w-[200px]">
                            {file.original_filename}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            fileTypeBadge[file.file_type] ?? badge.slate
                          }`}
                        >
                          {file.file_type?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-sm">
                        {formatBytes(file.file_size)}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-sm">
                        {new Date(file.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(file.id)}
                          className="h-8 w-8 p-0 hover:bg-red-600/20 text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
