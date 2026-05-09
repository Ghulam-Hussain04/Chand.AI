'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/app/services/apiService';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Loader2, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { type ProjectSpecificationInput, DEFAULT_SPECIFICATION } from '@/app/stores/appStore';

interface SpecificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderId: number;
  folderName: string;
}

const inputCls =
  'mt-1 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 focus:border-amber-500/60 text-sm';

const SpecRow = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div>
    <Label className="text-slate-300 text-xs font-medium">{label}</Label>
    {hint && <p className="text-xs text-slate-500 mb-0.5">{hint}</p>}
    {children}
  </div>
);

export default function SpecificationsModal({
  isOpen, onClose, folderId, folderName,
}: SpecificationsModalProps) {
  const [specs, setSpecs] = useState<ProjectSpecificationInput>(DEFAULT_SPECIFICATION);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadSpecs = useCallback(async () => {
    setIsFetching(true);
    try {
      const data = await apiService.getFolderSpecifications(folderId);
      setSpecs({
        mission_name: data.mission_name,
        meters_per_pixel: data.meters_per_pixel,
        camera_angle_deg: data.camera_angle_deg,
        camera_resolution_w: data.camera_resolution_w,
        camera_resolution_h: data.camera_resolution_h,
        camera_fov_deg: data.camera_fov_deg,
        rover_height_m: data.rover_height_m,
        notes: data.notes,
      });
    } catch {
      toast.error('Failed to load specifications');
    } finally {
      setIsFetching(false);
    }
  }, [folderId]);

  useEffect(() => {
    if (isOpen) loadSpecs();
  }, [isOpen, loadSpecs]);

  const updateSpec = <K extends keyof ProjectSpecificationInput>(
    key: K,
    value: ProjectSpecificationInput[K],
  ) => setSpecs((prev) => ({ ...prev, [key]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await apiService.setFolderSpecifications(folderId, specs);
      toast.success('Specifications saved');
      onClose();
    } catch {
      toast.error('Failed to save specifications');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSpecs(DEFAULT_SPECIFICATION);
    toast.info('Restored Chang\'e 3 defaults — click Save to apply');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            Mission Specifications
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Camera &amp; mission calibration for&nbsp;
            <span className="text-amber-300 font-medium">{folderName}</span>.
            These parameters convert pixel detections to real-world measurements.
          </DialogDescription>
        </DialogHeader>

        {isFetching ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-7 h-7 animate-spin text-amber-500/60" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {/* Mission Name */}
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <SpecRow label="Mission Name" hint="Human-readable identifier for this mission">
                <Input
                  value={specs.mission_name}
                  onChange={(e) => updateSpec('mission_name', e.target.value)}
                  disabled={isSaving}
                  placeholder="Chang3"
                  className={inputCls}
                />
              </SpecRow>
            </div>

            {/* Grid of numeric params */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <SpecRow label="Metres / Pixel" hint="Scale: m per px">
                <Input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={specs.meters_per_pixel}
                  onChange={(e) => updateSpec('meters_per_pixel', parseFloat(e.target.value))}
                  disabled={isSaving}
                  className={inputCls}
                />
              </SpecRow>

              <SpecRow label="Camera Angle (°)" hint="Depression angle 0–90°">
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="90"
                  value={specs.camera_angle_deg}
                  onChange={(e) => updateSpec('camera_angle_deg', parseFloat(e.target.value))}
                  disabled={isSaving}
                  className={inputCls}
                />
              </SpecRow>

              <SpecRow label="Resolution W (px)">
                <Input
                  type="number"
                  step="1"
                  min="1"
                  value={specs.camera_resolution_w}
                  onChange={(e) => updateSpec('camera_resolution_w', parseInt(e.target.value))}
                  disabled={isSaving}
                  className={inputCls}
                />
              </SpecRow>

              <SpecRow label="Resolution H (px)">
                <Input
                  type="number"
                  step="1"
                  min="1"
                  value={specs.camera_resolution_h}
                  onChange={(e) => updateSpec('camera_resolution_h', parseInt(e.target.value))}
                  disabled={isSaving}
                  className={inputCls}
                />
              </SpecRow>

              <SpecRow label="Field of View (°)" hint="Camera FOV 0–360°">
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="360"
                  value={specs.camera_fov_deg}
                  onChange={(e) => updateSpec('camera_fov_deg', parseFloat(e.target.value))}
                  disabled={isSaving}
                  className={inputCls}
                />
              </SpecRow>

              <SpecRow label="Rover Height (m)">
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={specs.rover_height_m}
                  onChange={(e) => updateSpec('rover_height_m', parseFloat(e.target.value))}
                  disabled={isSaving}
                  className={inputCls}
                />
              </SpecRow>
            </div>

            {/* Notes */}
            <SpecRow label="Notes">
              <Input
                value={specs.notes ?? ''}
                onChange={(e) => updateSpec('notes', e.target.value || null)}
                disabled={isSaving}
                placeholder="Optional mission notes"
                className={inputCls}
              />
            </SpecRow>

            {/* Calibration preview pill */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { label: 'mpp', value: specs.meters_per_pixel },
                { label: 'fov', value: `${specs.camera_fov_deg}°` },
                { label: `${specs.camera_resolution_w}×${specs.camera_resolution_h}`, value: 'px' },
                { label: 'h', value: `${specs.rover_height_m}m` },
              ].map(({ label, value }) => (
                <span
                  key={label}
                  className="text-xs px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300 font-mono"
                >
                  {label}: {value}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-700">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={isSaving}
                className="text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Reset to Chang&apos;e 3
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSaving}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-medium"
                >
                  {isSaving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" />Save</>
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
