'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/app/services/apiService';
import { toast } from 'sonner';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Loader2, Trash2, Edit2 } from 'lucide-react';
import { Folder as FolderType } from '@/app/stores/appStore';

interface FolderWithStats extends FolderType {
  file_count?: number;
}

export default function FolderManagementTab() {
  const [folders, setFolders] = useState<FolderWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      setIsLoading(true);
      const hierarchy = await apiService.getFolderHierarchy();
      const flattenedFolders = flattenFolderHierarchy(hierarchy);
      setFolders(flattenedFolders);
    } catch (error) {
      toast.error('Failed to load folders');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const flattenFolderHierarchy = (folder: FolderType): FolderWithStats[] => {
    const result: FolderWithStats[] = [
      {
        ...folder,
        file_count: folder.files?.length || 0,
      },
    ];

    if (folder.children) {
      folder.children.forEach((child) => {
        result.push(...flattenFolderHierarchy(child));
      });
    }

    return result;
  };

  const handleDeleteFolder = async (folderId: number) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await apiService.deleteFolder(folderId);
      toast.success('Project deleted successfully');
      loadFolders();
    } catch (error) {
      toast.error('Failed to delete project');
      console.error(error);
    }
  };

  const filteredFolders = folders.filter((folder) =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-white">Project Management</h3>
        <p className="text-sm text-slate-400">View and manage all projects (folders)</p>
      </div>

      {/* Search */}
      <Input
        placeholder="Search projects..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
      />

      {/* Folders Table */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            </div>
          ) : filteredFolders.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              No projects found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-700">
                  <tr className="text-sm text-slate-300">
                    <th className="text-left py-3 px-4 font-medium">Project Name</th>
                    <th className="text-left py-3 px-4 font-medium">Description</th>
                    <th className="text-left py-3 px-4 font-medium">Files</th>
                    <th className="text-left py-3 px-4 font-medium">Created</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFolders.map((folder) => (
                    <tr key={folder.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="py-3 px-4 text-white font-medium">{folder.name}</td>
                      <td className="py-3 px-4 text-slate-300 text-sm">
                        {folder.description || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <span className="inline-block px-2 py-1 bg-blue-600/20 text-blue-300 rounded text-sm">
                          {folder.file_count || 0} files
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(folder.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteFolder(folder.id)}
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
