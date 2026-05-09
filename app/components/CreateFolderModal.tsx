'use client';

import { useState } from 'react';
import { apiService } from '@/app/services/apiService';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { ChevronDown, ChevronUp, Loader2, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_SPECIFICATION, type ProjectSpecificationInput } from '@/app/stores/appStore';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  parentId?: number | null;
}

const inputCls =
  'mt-1 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 focus:border-amber-500/60';

export default function CreateFolderModal({
  isOpen, onClose, onSuccess, parentId = null,
}: CreateFolderModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Specifications — only meaningful for root projects (parentId === null)
  const [specsOpen, setSpecsOpen] = useState(false);
  const [specs, setSpecs] = useState<ProjectSpecificationInput>(DEFAULT_SPECIFICATION);

  const isRootProject = parentId === null;

  const updateSpec = <K extends keyof ProjectSpecificationInput>(
    key: K,
    value: ProjectSpecificationInput[K],
  ) => setSpecs((prev) => ({ ...prev, [key]: value }));

  const handleClose = () => {
    setName('');
    setDescription('');
    setSpecs(DEFAULT_SPECIFICATION);
    setSpecsOpen(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Folder name is required'); return; }
    setIsLoading(true);
    try {
      // Only pass specifications for root projects; subfolders inherit from parent
      await apiService.createFolder(
        name,
        description || null,
        parentId,
        isRootProject ? specs : undefined,
      );
      toast.success(isRootProject ? 'Project created' : 'Subfolder created');
      handleClose();
      onSuccess?.();
    } catch {
      toast.error('Failed to create folder');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isRootProject ? 'Create New Project' : 'Create Subfolder'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {isRootProject
              ? 'Create a new project and configure its mission calibration'
              : 'Add a subfolder inside the current project'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="name" className="text-slate-200">Name *</Label>
            <Input
              id="name"
              placeholder={isRootProject ? 'My Project' : 'Subfolder name'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              className={inputCls}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-slate-200">Description</Label>
            <Input
              id="description"
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
              className={inputCls}
            />
          </div>

          {/* Mission Specifications — root projects only */}
          {isRootProject && (
            <div className="rounded-lg border border-slate-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setSpecsOpen((o) => !o)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/60 hover:bg-slate-800 transition text-left"
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-slate-200">Mission Specifications</span>
                  {!specsOpen && (
                    <span className="text-xs text-slate-500 ml-1">
                      (Chang&apos;e 3 defaults)
                    </span>
                  )}
                </div>
                {specsOpen
                  ? <ChevronUp className="w-4 h-4 text-slate-400" />
                  : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {specsOpen && (
                <div className="px-4 pb-4 pt-3 bg-slate-800/30 space-y-3 border-t border-slate-700">
                  <p className="text-xs text-slate-400 mb-3">
                    Calibration parameters used to convert pixel measurements to real-world metres
                    during lunar terrain analysis.
                  </p>

                  {/* Mission name */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label className="text-slate-300 text-xs">Mission Name</Label>
                      <Input
                        value={specs.mission_name}
                        onChange={(e) => updateSpec('mission_name', e.target.value)}
                        disabled={isLoading}
                        className={`${inputCls} text-sm`}
                        placeholder="Chang3"
                      />
                    </div>

                    <div>
                      <Label className="text-slate-300 text-xs">Metres / Pixel</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.001"
                        value={specs.meters_per_pixel}
                        onChange={(e) => updateSpec('meters_per_pixel', parseFloat(e.target.value))}
                        disabled={isLoading}
                        className={`${inputCls} text-sm`}
                      />
                    </div>

                    <div>
                      <Label className="text-slate-300 text-xs">Camera Angle (°)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="90"
                        value={specs.camera_angle_deg}
                        onChange={(e) => updateSpec('camera_angle_deg', parseFloat(e.target.value))}
                        disabled={isLoading}
                        className={`${inputCls} text-sm`}
                      />
                    </div>

                    <div>
                      <Label className="text-slate-300 text-xs">Resolution W (px)</Label>
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        value={specs.camera_resolution_w}
                        onChange={(e) => updateSpec('camera_resolution_w', parseInt(e.target.value))}
                        disabled={isLoading}
                        className={`${inputCls} text-sm`}
                      />
                    </div>

                    <div>
                      <Label className="text-slate-300 text-xs">Resolution H (px)</Label>
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        value={specs.camera_resolution_h}
                        onChange={(e) => updateSpec('camera_resolution_h', parseInt(e.target.value))}
                        disabled={isLoading}
                        className={`${inputCls} text-sm`}
                      />
                    </div>

                    <div>
                      <Label className="text-slate-300 text-xs">Field of View (°)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="360"
                        value={specs.camera_fov_deg}
                        onChange={(e) => updateSpec('camera_fov_deg', parseFloat(e.target.value))}
                        disabled={isLoading}
                        className={`${inputCls} text-sm`}
                      />
                    </div>

                    <div>
                      <Label className="text-slate-300 text-xs">Rover Height (m)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={specs.rover_height_m}
                        onChange={(e) => updateSpec('rover_height_m', parseFloat(e.target.value))}
                        disabled={isLoading}
                        className={`${inputCls} text-sm`}
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-slate-300 text-xs">Notes</Label>
                      <Input
                        value={specs.notes ?? ''}
                        onChange={(e) => updateSpec('notes', e.target.value || null)}
                        disabled={isLoading}
                        placeholder="Optional mission notes"
                        className={`${inputCls} text-sm`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
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
                isRootProject ? 'Create Project' : 'Create Subfolder'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
