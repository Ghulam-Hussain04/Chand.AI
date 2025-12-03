"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import LoginModal from "../components/LoginModal";
import ChatSidebar from "../components/ChatSidebar";
import ChatHeader from "../components/ChatHeader";
import ChatDisplay, { type Message } from "../components/ChatDisplay";
import ChatBox from "../components/ChatBox";
import ChatImagesBar from "../components/ChatImagesBar";

interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  messages: Message[];
}

export default function ChatPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  //dummy chat sessions
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: "1",
      title: "Crater Analysis - Mare Imbrium",
      timestamp: new Date(),
      messages: [],
    },
    {
      id: "2",
      title: "Terrain Mapping - South Pole",
      timestamp: new Date(Date.now() - 86400000),
      messages: [],
    },
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>("1");
  const [isLoading, setIsLoading] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
    }
  }, [isAuthenticated]);

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
  };

  const handleCloseModal = () => {
    // If not authenticated and trying to close modal, redirect to home
    if (!isAuthenticated) {
      router.push("/");
    }
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: "New Analysis",
      timestamp: new Date(),
      messages: [],
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
  };

  const handleDeleteSession = (id: string) => {
    setSessions(sessions.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(sessions[0]?.id || null);
    }
  };

  const handleSendMessage = async (content: string, image?: File) => {
    if (!activeSessionId) return;

    // Create user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      image: image ? URL.createObjectURL(image) : undefined,
      timestamp: new Date(),
    };

    // Update session with user message
    setSessions((prev) =>
      prev.map((session) =>
        session.id === activeSessionId
          ? {
              ...session,
              messages: [...session.messages, userMessage],
              title:
                session.messages.length === 0
                  ? content.slice(0, 30) + (content.length > 30 ? "..." : "")
                  : session.title,
            }
          : session
      )
    );

    // Simulate AI response
    setIsLoading(true);
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Analysis of your lunar scene:\n\nI've detected several notable features in this image:\n\n• **Crater formations**: Multiple impact craters visible with varying diameters\n• **Surface texture**: Regolith patterns consistent with lunar mare regions\n• **Shadow analysis**: Based on shadow lengths, the sun angle suggests this was captured during lunar morning\n\nWould you like me to provide more detailed measurements or focus on a specific feature?`,
        timestamp: new Date(),
      };

      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeSessionId
            ? { ...session, messages: [...session.messages, assistantMessage] }
            : session
        )
      );
      setIsLoading(false);
    }, 2000);
  };

  // Show login modal if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <LoginModal
          isOpen={showLoginModal}
          onClose={handleCloseModal}
          onSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background relative">
      {/* Sidebar */}
      <ChatSidebar
        sessions={sessions.map((s) => ({
          id: s.id,
          title: s.title,
          timestamp: s.timestamp,
        }))}
        activeSession={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <ChatHeader sessionTitle={activeSession?.title || "New Analysis"} />
        <ChatDisplay
          messages={activeSession?.messages || []}
          isLoading={isLoading}
        />
        <ChatBox onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>

      <ChatImagesBar images={[]} />
    </div>
  );
}
