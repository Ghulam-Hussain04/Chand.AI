'use client';

import { useState, useEffect, useRef } from 'react';
import { apiService } from '@/app/services/apiService';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Upload, FileText, Eye, CheckCircle2, Loader2, X } from 'lucide-react';

interface RagDoc {
  id: number;
  filename: string;
  storage_path: string;
  file_size: number;
  chunks_count: number;
  uploaded_by: number;
  created_at: string;
}

type StepStatus = 'idle' | 'loading' | 'done';

interface ProcessingStep {
  label: string;
  status: StepStatus;
}

const INITIAL_STEPS: ProcessingStep[] = [
  { label: 'Document upload', status: 'idle' },
  { label: 'Document processing', status: 'idle' },
  { label: 'Document chunking', status: 'idle' },
  { label: 'Document ingestion', status: 'idle' },
];

const ALL_DONE_STEPS: ProcessingStep[] = INITIAL_STEPS.map(s => ({ ...s, status: 'done' }));

export default function ReferenceLibraryTab() {
  const [docs, setDocs] = useState<RagDoc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [steps, setSteps] = useState<ProcessingStep[]>(INITIAL_STEPS);
  const [showSteps, setShowSteps] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    loadDocs();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const loadDocs = async () => {
    setLoadingDocs(true);
    try {
      const data = await apiService.getRagDocs();
      setDocs(data);
    } catch {
      toast.error('Failed to load reference documents');
    } finally {
      setLoadingDocs(false);
    }
  };

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const setStepAt = (index: number, status: StepStatus) => {
    setSteps(prev => prev.map((s, i) => (i === index ? { ...s, status } : s)));
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      e.target.value = '';
      return;
    }

    e.target.value = '';
    clearTimers();
    setUploading(true);
    setShowSteps(true);
    setSteps(INITIAL_STEPS.map((s, i) => ({ ...s, status: i === 0 ? 'loading' : 'idle' })));

    const uploadPromise = apiService.uploadRagDoc(file);

    const t1 = setTimeout(() => {
      setStepAt(0, 'done');
      setStepAt(1, 'loading');
    }, 1500);

    const t2 = setTimeout(() => {
      setStepAt(1, 'done');
      setStepAt(2, 'loading');
    }, 3000);

    const t3 = setTimeout(() => {
      setStepAt(2, 'done');
      setStepAt(3, 'loading');
    }, 4500);

    timersRef.current = [t1, t2, t3];

    try {
      await uploadPromise;
      clearTimers();
      setSteps(ALL_DONE_STEPS);
      toast.success('Reference document uploaded successfully');
      loadDocs();
    } catch (err: any) {
      clearTimers();
      setSteps(INITIAL_STEPS);
      setShowSteps(false);
      toast.error(err?.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async (doc: RagDoc) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewDocId(doc.id);
    setPreviewLoading(true);
    setPreviewUrl(null);
    try {
      const blob = await apiService.getRagDocPreview(doc.id);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch {
      toast.error('Failed to load document preview');
      setPreviewDocId(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewDocId(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  return (
    <div className="flex gap-6" style={{ minHeight: '520px' }}>
      {/* Main content */}
      <div className={`space-y-6 transition-all duration-300 ${previewDocId ? 'w-[55%]' : 'flex-1'}`}>
        {/* Upload section */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              Reference Library
            </CardTitle>
            <p className="text-slate-400 text-sm">
              Upload lunar reference documents to enhance the RAG knowledge base
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleUploadClick}
                disabled={uploading}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-medium flex items-center gap-2"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Upload Lunar Reference Doc
              </Button>
              <span className="text-slate-500 text-sm">PDF files only</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Processing steps */}
            {showSteps && (
              <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-slate-300">
                  {uploading ? 'Processing document…' : 'Document ready'}
                </p>
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {step.status === 'idle' && (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-600 flex-shrink-0" />
                    )}
                    {step.status === 'loading' && (
                      <Loader2 className="w-5 h-5 text-amber-400 animate-spin flex-shrink-0" />
                    )}
                    {step.status === 'done' && (
                      <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                    )}
                    <span
                      className={`text-sm ${
                        step.status === 'done'
                          ? 'text-green-400'
                          : step.status === 'loading'
                          ? 'text-amber-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Docs list */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">Uploaded Reference Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingDocs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              </div>
            ) : docs.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">
                No reference documents uploaded yet
              </p>
            ) : (
              <div className="space-y-3">
                {docs.map(doc => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-slate-700/40 border border-slate-600 rounded-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">
                          {doc.filename}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatFileSize(doc.file_size)} · {doc.chunks_count} chunks ·{' '}
                          {formatDate(doc.created_at)}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePreview(doc)}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700 flex items-center gap-1.5 flex-shrink-0 ml-3"
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview side panel */}
      {previewDocId && (
        <div className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-slate-700 bg-slate-800 flex-shrink-0">
            <span className="text-sm font-medium text-slate-200 truncate mr-3">
              {docs.find(d => d.id === previewDocId)?.filename ?? 'Document Preview'}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={closePreview}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 flex items-center gap-1.5 flex-shrink-0"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
          <div className="flex-1 overflow-hidden" style={{ minHeight: '400px' }}>
            {previewLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              </div>
            ) : previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full h-full border-0"
                title="Document Preview"
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
