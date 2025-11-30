"use client"

import { useState } from "react"
import { MessageSquare, Plus, Moon, History, Settings, LogOut, ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import { useAuth } from "../context/AuthContext"

interface ChatSession {
  id: string
  title: string
  timestamp: Date
}

interface ChatSidebarProps {
  sessions: ChatSession[]
  activeSession: string | null
  onSelectSession: (id: string) => void
  onNewChat: () => void
  onDeleteSession: (id: string) => void
}

export default function ChatSidebar({
  sessions,
  activeSession,
  onSelectSession,
  onNewChat,
  onDeleteSession,
}: ChatSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { user, logout } = useAuth()

  return (
    <aside
      className={`h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <Moon className="w-6 h-6 text-amber-400" />
              <span className="font-bold text-sidebar-foreground">LunarChat</span>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors text-sidebar-foreground"
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className={`w-full flex items-center gap-2 px-3 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-xl transition-colors ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <Plus className="w-5 h-5" />
          {!isCollapsed && <span>New Analysis</span>}
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {!isCollapsed && (
          <div className="flex items-center gap-2 px-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <History className="w-4 h-4" />
            Recent Sessions
          </div>
        )}
        <div className="space-y-1">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                activeSession === session.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
              }`}
              onClick={() => onSelectSession(session.id)}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="flex-1 truncate text-sm">{session.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteSession(session.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* User Section */}
      <div className="p-3 border-t border-sidebar-border">
        {!isCollapsed && user && (
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 font-medium">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.username}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
            </div>
          </div>
        )}
        <div className={`flex ${isCollapsed ? "flex-col" : ""} gap-2`}>
          <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 hover:bg-sidebar-accent rounded-lg transition-colors text-sidebar-foreground">
            <Settings className="w-4 h-4" />
            {!isCollapsed && <span className="text-sm">Settings</span>}
          </button>
          <button
            onClick={logout}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors text-sidebar-foreground"
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  )
}
