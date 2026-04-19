'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppStore, ChatMessage } from '@/app/stores/appStore';
import { apiService } from '@/app/services/apiService';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent } from '@/app/components/ui/card';
import { Send, FileText, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export default function ChatPage() {
  const searchParams = useSearchParams();
  const fileIdParam = searchParams?.get('fileId');

  const { chatMessages, addChatMessage, setIsLoading, isLoading } = useAppStore();
  const [inputMessage, setInputMessage] = useState('');
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>(
    fileIdParam ? [parseInt(fileIdParam)] : []
  );
  const [availableFiles, setAvailableFiles] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Load available files
  useEffect(() => {
    const loadFiles = async () => {
      try {
        const files = await apiService.getFiles();
        setAvailableFiles(files);
      } catch (error) {
        toast.error('Failed to load files');
      }
    };

    loadFiles();
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputMessage.trim() || selectedFileIds.length === 0) {
      toast.error('Please select at least one file and enter a message');
      return;
    }

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };

    addChatMessage(userMessage);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Query RAG API
      const response = await apiService.queryRAG(
        inputMessage,
        selectedFileIds,
        sessionId
      );

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.response || response.answer || 'No response received',
        timestamp: new Date().toISOString(),
        citations: response.citations,
      };

      addChatMessage(assistantMessage);

      // Store session ID for future messages
      if (response.session_id && !sessionId) {
        setSessionId(response.session_id);
      }
    } catch (error) {
      toast.error('Failed to query documents. Please try again.');
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFileSelection = (fileId: number) => {
    setSelectedFileIds((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId]
    );
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 p-8">
      {/* Sidebar - File Selection */}
      <div className="lg:w-64 flex-shrink-0">
        <Card className="bg-slate-800/50 border-slate-700 h-full flex flex-col">
          <CardContent className="p-4 flex-1 overflow-y-auto">
            <h3 className="text-sm font-semibold text-slate-200 mb-3 uppercase tracking-wider">
              Select Documents
            </h3>

            {availableFiles.length > 0 ? (
              <div className="space-y-2">
                {availableFiles.map((file) => (
                  <label
                    key={file.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-700/50 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFileIds.includes(file.id)}
                      onChange={() => toggleFileSelection(file.id)}
                      className="w-4 h-4 rounded mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate group-hover:text-white">
                        {file.filename}
                      </p>
                      <p className="text-xs text-slate-400">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No files uploaded yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <Card className="bg-slate-800/50 border-slate-700 flex-1 flex flex-col">
          {/* Messages */}
          <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <div className="w-12 h-12 rounded-lg bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-6 h-6 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-200 mb-2">
                    Ready to chat with your documents
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Select documents on the left and ask questions about them
                  </p>
                </div>
              </div>
            ) : (
              <>
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold">
                        AI
                      </div>
                    )}
                    <div
                      className={`max-w-md lg:max-w-lg px-4 py-3 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-blue-600/20 border border-blue-600/50 text-slate-100'
                          : 'bg-slate-700/50 border border-slate-600/50 text-slate-100'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <div className="prose prose-invert text-sm max-w-none">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm">{message.content}</p>
                      )}

                      {message.citations && message.citations.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-600 text-xs text-slate-400">
                          <p className="font-semibold mb-1">Sources:</p>
                          <ul>
                            {message.citations.map((citation, idx) => (
                              <li key={idx}>
                                • File ID: {citation.file_id}
                                {citation.page && ` (Page ${citation.page})`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-300 text-sm font-semibold">
                        You
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold">
                      AI
                    </div>
                    <div className="px-4 py-3 rounded-lg bg-slate-700/50 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-slate-300">Thinking...</span>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Input Area */}
          <div className="border-t border-slate-700 p-4">
            {selectedFileIds.length === 0 && (
              <div className="mb-3 flex items-center gap-2 p-3 rounded-lg bg-yellow-900/20 border border-yellow-800/50">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-xs text-yellow-700">
                  Please select at least one document to start chatting
                </span>
              </div>
            )}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                placeholder="Ask a question about your documents..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isLoading || selectedFileIds.length === 0}
                className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder:text-slate-400"
              />
              <Button
                type="submit"
                disabled={isLoading || selectedFileIds.length === 0 || !inputMessage.trim()}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
