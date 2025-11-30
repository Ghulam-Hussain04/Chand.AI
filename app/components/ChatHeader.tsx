"use client"

import { Moon, Info, Download, Maximize2 } from "lucide-react"

interface ChatHeaderProps {
  sessionTitle: string
}

export default function ChatHeader({ sessionTitle }: ChatHeaderProps) {
  return (
    <header className="h-16 px-6 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-500/20 rounded-lg">
          <Moon className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="font-semibold text-foreground">{sessionTitle || "New Analysis"}</h1>
          <p className="text-xs text-muted-foreground">Lunar Scene Analysis Session</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground">
          <Download className="w-5 h-5" />
        </button>
        <button className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground">
          <Maximize2 className="w-5 h-5" />
        </button>
        <button className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground">
          <Info className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
