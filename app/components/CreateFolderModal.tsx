'use client';

import { useState } from 'react';
import { apiService } from '@/app/services/apiService';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  parentId?: number | null;
}

export default function CreateFolderModal({
  isOpen, onClose, onSuccess, parentId = null,
}: CreateFolderModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Folder name is required'); return; }
    setIsLoading(true);
    try {
      await apiService.createFolder(name, description || null, parentId);
      toast.success(parentId ? 'Subfolder created' : 'Project created');
      setName('');
      setDescription('');
      onSuccess?.();
      onClose();
    } catch {
      toast.error('Failed to create folder');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">
            {parentId ? 'Create Subfolder' : 'Create New Project'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {parentId ? 'Add a subfolder inside the current project' : 'Create a new project to organise your files'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-slate-200">Name *</Label>
            <Input
              id="name"
              placeholder={parentId ? 'Subfolder name' : 'My Project'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              className="mt-1 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 focus:border-amber-500/60"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-slate-200">Description</Label>
            <Input
              id="description"
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
              className="mt-1 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 focus:border-amber-500/60"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-medium"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</>
              ) : (
                parentId ? 'Create Subfolder' : 'Create Project'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
