'use client';

import { useState } from 'react';
import { apiService } from '@/app/services/apiService';
import { useAppStore } from '@/app/stores/appStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentId?: number | null;
}

export function CreateFolderModal({ isOpen, onClose, parentId = null }: CreateFolderModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setFolderHierarchy } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Folder name is required');
      return;
    }

    setIsLoading(true);
    try {
      await apiService.createFolder(name, description || null, parentId);
      
      // Reload folder hierarchy
      const hierarchy = await apiService.getFolderHierarchy();
      setFolderHierarchy(hierarchy);

      toast.success('Folder created successfully');
      setName('');
      setDescription('');
      onClose();
    } catch (error) {
      toast.error('Failed to create folder');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800/50 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Create New Folder</DialogTitle>
          <DialogDescription className="text-slate-400">
            Create a new folder to organize your documents
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-slate-200">
              Folder Name *
            </Label>
            <Input
              id="name"
              placeholder="My Documents"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-slate-200">
              Description
            </Label>
            <Input
              id="description"
              placeholder="Optional folder description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="border-slate-600 text-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Folder'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
