'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAppStore, type ChatMessage } from '@/app/stores/appStore';
import { apiService } from '@/app/services/apiService';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent } from '@/app/components/ui/card';
import {
  Send, Loader2, AlertCircle, RotateCcw,
  FolderOpen, ChevronDown, Image as ImageIcon,
  Zap, Clock, Database, FileDown,
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { card, inputBase, btn, badge } from '@/app/lib/theme';
import FileThumbnail from '@/app/components/FileThumbnail';

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
  const router = useRouter();
  const fileIdParam = searchParams?.get('fileId');
  const sessionIdParam = searchParams?.get('sessionId');

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
  const [knownCachedFiles, setKnownCachedFiles] = useState<Set<number>>(new Set());
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Tracks a session we just created so we don't reload it when the URL updates
  const justCreatedSessionRef = useRef<number | null>(null);

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
      setAvailableFiles(files.filter((f: any) => f.file_type === 'image'));
    } catch {
      toast.error('Failed to load files');
    }
  };

  // Load a historical session by ID
  const loadSession = async (id: number) => {
    setIsLoadingSession(true);
    try {
      const session = await apiService.getChatSession(id);
      const messages: ChatMessage[] = [];
      for (const msg of session.messages) {
        messages.push({
          id: `${msg.id}-q`,
          role: 'user',
          content: msg.question,
          timestamp: msg.time,
        });
        messages.push({
          id: `${msg.id}-a`,
          role: 'assistant',
          content: msg.response,
          timestamp: msg.time,
        });
      }
      setChatMessages(messages);
      setSessionId(id);
    } catch {
      toast.error('Failed to load chat session');
    } finally {
      setIsLoadingSession(false);
    }
  };

  useEffect(() => {
    loadFilesForFolder(null);
  }, []);

  useEffect(() => {
    const id = fileIdParam ? parseInt(fileIdParam) : null;
    if (!id || Number.isNaN(id)) return;

    setSelectedFileId(id);
    setActiveFolderId(null);

    const alreadyLoaded = availableFiles.some((file) => file.id === id);
    if (alreadyLoaded) return;

    apiService.getFile(id)
      .then((file) => {
        if (file?.file_type === 'image') {
          setAvailableFiles((prev) => (
            prev.some((existing) => existing.id === file.id) ? prev : [file, ...prev]
          ));
        }
      })
      .catch(() => toast.error('Selected image is no longer available'));
  }, [fileIdParam]);

  // When sessionIdParam changes, load that session
  useEffect(() => {
    if (sessionIdParam) {
      const id = parseInt(sessionIdParam);
      if (!isNaN(id)) {
        // If we just created this session from a live chat, skip reloading
        if (justCreatedSessionRef.current === id) {
          justCreatedSessionRef.current = null;
          return;
        }
        loadSession(id);
      }
    } else {
      setChatMessages([]);
      setSessionId(undefined);
    }
  }, [sessionIdParam]);

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
      attachment: selectedFile
        ? {
            file_id: selectedFile.id,
            filename: selectedFile.original_filename,
            file_type: selectedFile.file_type,
          }
        : undefined,
    };
    addChatMessage(userMessage);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await apiService.queryRAG(currentInput, [selectedFileId], sessionId);

      const isCached: boolean | undefined =
        typeof response.inference_cached === 'boolean' ? response.inference_cached : undefined;

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

      if (response.session_id && !sessionId) {
        const newSessionId = response.session_id;
        justCreatedSessionRef.current = newSessionId;
        setSessionId(newSessionId);
        // Update URL so the page is bookmarkable and sidebar can highlight it
        router.replace(`/chat?sessionId=${newSessionId}`, { scroll: false });
      }
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
    router.push('/chat');
  };

  const handleGenerateReport = async () => {
    if (!sessionId) return;
    setIsGeneratingReport(true);
    try {
      const blob = await apiService.generateReport(sessionId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dr-terra-report-${sessionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Flatten folder hierarchy for dropdown
  const flattenFolders = (folders: any[], depth = 0): { id: number; name: string; depth: number }[] =>
    folders.flatMap((f) => [
      { id: f.id, name: f.name, depth },
      ...(f.children ? flattenFolders(f.children, depth + 1) : []),
    ]);

  const allFolders = folderHierarchy ? flattenFolders(folderHierarchy) : [];
  const activeFolderName = allFolders.find((f) => f.id === activeFolderId)?.name;
  const selectedFile = availableFiles.find((file) => file.id === selectedFileId);

  const isFirstAnalysis = selectedFileId !== null && !knownCachedFiles.has(selectedFileId);
  const loadingLabel = isFirstAnalysis ? 'Running terrain analysis…' : 'Thinking…';

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
                    <div className="w-12 h-12 rounded-md overflow-hidden bg-slate-800 border border-slate-700 flex-shrink-0">
                      <FileThumbnail
                        fileId={file.id}
                        alt={file.original_filename}
                        className="rounded-md"
                        iconClassName="w-4 h-4"
                      />
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

        {/* Action buttons */}
        {chatMessages.length > 0 && (
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-slate-600 text-slate-300 hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-300"
              onClick={handleNewChat}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              New Chat
            </Button>

            {sessionId && (
              <Button
                variant="outline"
                size="sm"
                className="w-full border-slate-600 text-slate-300 hover:bg-blue-500/10 hover:border-blue-500/40 hover:text-blue-300"
                onClick={handleGenerateReport}
                disabled={isGeneratingReport}
              >
                {isGeneratingReport ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <FileDown className="w-4 h-4 mr-2" />
                )}
                Generate Report
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── Chat area ── */}
      <div className="flex-1 flex flex-col min-h-0">
        <Card className={`${card} flex-1 flex flex-col`}>
          {/* Messages */}
          <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
            {isLoadingSession ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              </div>
            ) : chatMessages.length === 0 ? (
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
                        <>
                          {message.attachment?.file_type === 'image' && (
                            <div className="mb-2 w-48 h-32 overflow-hidden rounded-lg border border-amber-500/20 bg-slate-800">
                              <FileThumbnail
                                fileId={message.attachment.file_id}
                                alt={message.attachment.filename}
                                className="rounded-lg"
                              />
                            </div>
                          )}
                          <p className="text-sm leading-relaxed">{message.content}</p>
                        </>
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
            {selectedFile && (
              <div className="mb-3 flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-2">
                <div className="w-16 h-12 overflow-hidden rounded-md bg-slate-900 border border-slate-700 flex-shrink-0">
                  <FileThumbnail
                    fileId={selectedFile.id}
                    alt={selectedFile.original_filename}
                    className="rounded-md"
                    iconClassName="w-4 h-4"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">
                    {selectedFile.original_filename}
                  </p>
                  <p className="text-[11px] text-slate-500">Selected image</p>
                </div>
              </div>
            )}
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
