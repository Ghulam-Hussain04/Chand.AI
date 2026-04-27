'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/app/services/apiService';
import { toast } from 'sonner';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Loader2, Trash2, FolderOpen } from 'lucide-react';
import { Folder as FolderType } from '@/app/stores/appStore';
import { inputBase, badge } from '@/app/lib/theme';

interface FlatFolder {
  id: number;
  name: string;
  description: string | null;
  parent_id: number | null;
  file_count: number;
  created_at: string;
  depth: number;
}

function flattenTree(folder: FolderType, depth = 0): FlatFolder[] {
  const result: FlatFolder[] = [
    {
      id: folder.id,
      name: folder.name,
      description: folder.description,
      parent_id: folder.parent_id,
      file_count: folder.file_count ?? folder.files?.length ?? 0,
      created_at: folder.created_at,
      depth,
    },
  ];
  if (folder.children) {
    for (const child of folder.children) {
      result.push(...flattenTree(child, depth + 1));
    }
  }
  return result;
}

export default function FolderManagementTab() {
  const [flatFolders, setFlatFolders] = useState<FlatFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { loadFolders(); }, []);

  const loadFolders = async () => {
    try {
      setIsLoading(true);
      const trees: FolderType[] = await apiService.getFolderHierarchy();
      const flat: FlatFolder[] = [];
      for (const tree of trees) {
        flat.push(...flattenTree(tree));
      }
      setFlatFolders(flat);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (folderId: number) => {
    if (!confirm('Delete this project and all its files?')) return;
    try {
      await apiService.deleteFolder(folderId);
      toast.success('Project deleted');
      loadFolders();
    } catch {
      toast.error('Failed to delete project');
    }
  };

  const filtered = flatFolders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">Project Management</h3>
        <p className="text-sm text-slate-400">View and manage all projects (folders)</p>
      </div>

      <Input
        placeholder="Search projects…"
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-700">
                  <tr className="text-xs text-slate-400 uppercase tracking-wider">
                    <th className="text-left py-3 px-4 font-medium">Project</th>
                    <th className="text-left py-3 px-4 font-medium">Description</th>
                    <th className="text-left py-3 px-4 font-medium">Files</th>
                    <th className="text-left py-3 px-4 font-medium">Created</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((folder) => (
                    <tr
                      key={folder.id}
                      className="border-b border-slate-700/50 hover:bg-slate-700/20 transition"
                    >
                      <td className="py-3 px-4">
                        <div
                          className="flex items-center gap-2"
                          style={{ paddingLeft: `${folder.depth * 16}px` }}
                        >
                          <FolderOpen className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-white text-sm font-medium">{folder.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-sm">
                        {folder.description || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${badge.blue}`}>
                          {folder.file_count} files
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-sm">
                        {new Date(folder.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(folder.id)}
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
