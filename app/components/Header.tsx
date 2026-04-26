"use client";

import { useAuthStore } from "@/app/stores/authStore";
import { useAppStore } from "@/app/stores/appStore";
import ThemeToggle from "@/app/components/ThemeToggle";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Search, Upload, Plus } from "lucide-react";

export default function Header() {
  const { user } = useAuthStore();
  const { searchQuery, setSearchQuery, setSidebarOpen } = useAppStore();

  return (
    <header className="h-16 border-b border-slate-700 bg-slate-800/50 backdrop-blur px-6 flex items-center justify-between gap-4">
      {/* Left section - Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-700/50 border-slate-600 text-slate-100 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Right section - Actions & User */}
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="border-slate-600 text-slate-200 hover:bg-slate-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New
        </Button>

        <ThemeToggle />

        {user && (
          <div className="pl-3 border-l border-slate-600">
            <div className="text-sm">
              <p className="font-medium text-slate-200">{user.username}</p>
              <p className="text-xs text-slate-400 capitalize">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
