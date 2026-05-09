'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppStore, type ChatMessage } from '@/app/stores/appStore';
import { apiService } from '@/app/services/apiService';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent } from '@/app/components/ui/card';
import {
  Send, FileText, Loader2, AlertCircle, RotateCcw,
  FolderOpen, ChevronDown, Image as ImageIcon,
  Zap, Clock, Database,
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { card, inputBase, btn, badge, fileTypeBadge } from '@/app/lib/theme';

// ── Helpers ──────────────────────────────────────────────────────────────────

function InferenceBadge({
  cached,
  responseTime,
}: {
  cached?: boolean;
  responseTime?: number;
}) {
  if (cached === undefined) return null;
  return (
    <div className="flex items-center gap-1.5 mt-2">
      {cached ? (
        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-600/15 text-green-400 border border-green-600/25 font-medium">
          <Database className="w-2.5 h-2.5" />
          Cached analysis
        </span>
      ) : (
        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-600/15 text-amber-400 border border-amber-600/25 font-medium">
          <Zap className="w-2.5 h-2.5" />
          Fresh analysis
        </span>
      )}
      {responseTime !== undefined && (
        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-400 font-mono">
          <Clock className="w-2.5 h-2.5" />
          {responseTime}s
        </span>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const searchParams = useSearchParams();
  const fileIdParam = searchParams?.get('fileId');

  const { chatMessages, addChatMessage, setChatMessages, setIsLoading, isLoading, folderHierarchy } =
    useAppStore();

  const [inputMessage, setInputMessage] = useState('');
  const [selectedFileId, setSelectedFileId] = useState<number | null>(
    fileIdParam ? parseInt(fileIdParam) : null,
  );
  const [availableFiles, setAvailableFiles] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<number | undefined>();
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
  const [folderDropdownOpen, setFolderDropdownOpen] = useState(false);
  // Track whether the selected file has previously been analysed (from a prior
  // session). We use this only for the loading label; the badge comes from the response.
  const [knownCachedFiles, setKnownCachedFiles] = useState<Set<number>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFolderDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadFilesForFolder = async (folderId: number | null) => {
    try {
      const files = folderId
        ? await apiService.getFolderFiles(folderId)
        : await apiService.getFiles();
      // Only show image files — CSV files do not support terrain analysis
      setAvailableFiles(files.filter((f: any) => f.file_type === 'image'));
    } catch {
      toast.error('Failed to load files');
    }
  };

  useEffect(() => {
    loadFilesForFolder(null);
  }, []);

  const handleFolderSelect = (folderId: number | null) => {
    setActiveFolderId(folderId);
    setSelectedFileId(null);
    setFolderDropdownOpen(false);
    loadFilesForFolder(folderId);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    if (!selectedFileId) {
      toast.error('Select an image to analyse before chatting');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };
    addChatMessage(userMessage);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await apiService.queryRAG(currentInput, [selectedFileId], sessionId);

      const isCached: boolean | undefined =
        typeof response.inference_cached === 'boolean' ? response.inference_cached : undefined;

      // Remember this file has been analysed so we can improve the loading label
      if (isCached === false) {
        setKnownCachedFiles((prev) => new Set([...prev, selectedFileId]));
      }

      addChatMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response || response.answer || 'No response received',
        timestamp: new Date().toISOString(),
        inference_cached: isCached,
        response_time_sec: response.response_time_sec,
      });

      if (response.session_id && !sessionId) setSessionId(response.session_id);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to get a response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setChatMessages([]);
    setSessionId(undefined);
    setSelectedFileId(null);
  };

  // Flatten folder hierarchy for dropdown
  const flattenFolders = (folders: any[], depth = 0): { id: number; name: string; depth: number }[] =>
    folders.flatMap((f) => [
      { id: f.id, name: f.name, depth },
      ...(f.children ? flattenFolders(f.children, depth + 1) : []),
    ]);

  const allFolders = folderHierarchy ? flattenFolders(folderHierarchy) : [];
  const activeFolderName = allFolders.find((f) => f.id === activeFolderId)?.name;

  // Determine loading label based on whether we expect cached results
  const isFirstAnalysis = selectedFileId !== null && !knownCachedFiles.has(selectedFileId);
  const loadingLabel = isFirstAnalysis
    ? 'Running terrain analysis…'
    : 'Thinking…';

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 p-6">
      {/* ── File selector sidebar ── */}
      <div className="lg:w-64 flex-shrink-0 flex flex-col gap-3">
        <Card className={`${card} flex flex-col`} style={{ maxHeight: '70vh' }}>
          {/* Folder filter */}
          <div className="p-3 border-b border-slate-700">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Filter by Project
            </p>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setFolderDropdownOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-sm text-slate-200 hover:border-amber-500/50 transition"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <FolderOpen className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span className="truncate">{activeFolderName ?? 'All files'}</span>
                </span>
                <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
              </button>

              {folderDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-52 overflow-y-auto">
                  <button
                    onClick={() => handleFolderSelect(null)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700/50 transition ${
                      activeFolderId === null ? 'text-amber-300' : 'text-slate-300'
                    }`}
                  >
                    All files
                  </button>
                  {allFolders.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => handleFolderSelect(f.id)}
                      style={{ paddingLeft: `${12 + f.depth * 12}px` }}
                      className={`w-full text-left pr-3 py-2 text-sm hover:bg-slate-700/50 transition ${
                        activeFolderId === f.id ? 'text-amber-300' : 'text-slate-300'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* File list — images only */}
          <div className="p-2 border-b border-slate-700 flex items-center justify-between px-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Select Image
            </h3>
            {selectedFileId && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${badge.amber}`}>1</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {availableFiles.length > 0 ? (
              availableFiles.map((file) => {
                const isSelected = selectedFileId === file.id;
                const wasCached = knownCachedFiles.has(file.id);
                return (
                  <label
                    key={file.id}
                    className={`flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-700/50 cursor-pointer transition ${
                      isSelected ? 'bg-amber-600/10 border border-amber-600/30' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="selectedFile"
                      checked={isSelected}
                      onChange={() => setSelectedFileId(file.id)}
                      className="w-4 h-4 accent-amber-500 mt-0.5"
                    />
                    <div className="w-4 h-4 rounded bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ImageIcon className="w-2.5 h-2.5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{file.original_filename}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-xs text-slate-500">Image</p>
                        {wasCached && (
                          <span className="text-[9px] px-1.5 py-px rounded-full bg-green-600/15 text-green-400 border border-green-600/20">
                            analysed
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })
            ) : (
              <div className="text-center py-8">
                <ImageIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No images in this project</p>
                <p className="text-xs text-slate-500 mt-1">Upload lunar images to begin analysis</p>
              </div>
            )}
          </div>
        </Card>

        {chatMessages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full border-slate-600 text-slate-300 hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-300"
            onClick={handleNewChat}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        )}
      </div>

      {/* ── Chat area ── */}
      <div className="flex-1 flex flex-col min-h-0">
        <Card className={`${card} flex-1 flex flex-col`}>
          {/* Messages */}
          <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-600/20 to-orange-600/20 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                    <ImageIcon className="w-7 h-7 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-200 mb-2">
                    Lunar Terrain Analysis
                  </h3>
                  <p className="text-sm text-slate-400 max-w-xs">
                    Select a project and an image from the left panel. The AI will
                    detect craters, rocks, boulders and other surface features, then
                    answer your questions about the terrain.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0 text-black text-xs font-bold">
                        AI
                      </div>
                    )}
                    <div
                      className={`max-w-md lg:max-w-2xl px-4 py-3 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-amber-600/15 border border-amber-600/30 text-slate-100 rounded-tr-sm'
                          : 'bg-slate-700/50 border border-slate-600/40 text-slate-100 rounded-tl-sm'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      )}

                      <div className="flex items-center justify-between flex-wrap gap-2 mt-1.5">
                        {message.timestamp && (
                          <p className="text-xs text-slate-500">
                            {new Date(message.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        )}
                        {message.role === 'assistant' && (
                          <InferenceBadge
                            cached={message.inference_cached}
                            responseTime={message.response_time_sec}
                          />
                        )}
                      </div>
                    </div>

                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-300 text-xs font-semibold">
                        You
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                      <Loader2 className="w-4 h-4 text-black animate-spin" />
                    </div>
                    <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-slate-700/50 border border-slate-600/40 flex items-center gap-2">
                      <span className="text-sm text-slate-300">{loadingLabel}</span>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Input bar */}
          <div className="border-t border-slate-700 p-4">
            {!selectedFileId && (
              <div className="mb-3 flex items-center gap-2 p-3 rounded-lg bg-amber-900/10 border border-amber-700/30">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="text-xs text-amber-400">
                  Select a lunar image from the left panel to begin terrain analysis
                </span>
              </div>
            )}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                placeholder={
                  selectedFileId ? 'Ask about the terrain…' : 'Select an image first…'
                }
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isLoading || !selectedFileId}
                className={`${inputBase} focus:border-amber-500/50`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e as any);
                  }
                }}
              />
              <Button
                type="submit"
                disabled={isLoading || !selectedFileId || !inputMessage.trim()}
                className={btn.primary}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
