"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Moon, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface ChatImagesBarProps {
  images: string[];
}

export default function ChatImagesBar({ images }: ChatImagesBarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [stylePos, setStylePos] = useState({ top: 0, height: 1000 });
  const barRef = useRef<HTMLDivElement | null>(null);

  //   useEffect(() => {
  //     function compute() {
  //       // parent container must have id="chat-display-box" and be position: relative
  //       const container = document.querySelector("#chat-display-box") as HTMLElement | null;
  //       if (!container) {
  //         // fallback: center in viewport
  //         const vh = window.innerHeight;
  //         setStylePos({ top: (vh * 0.5) - (vh / 6), height: Math.max(120, vh / 3) });
  //         return;
  //       }

  //       const header = container.querySelector("#chat-header") as HTMLElement | null;
  //       const chatBox = container.querySelector("#chat-box") as HTMLElement | null;

  //       const containerH = container.clientHeight;
  //       const headerH = header?.clientHeight ?? 0;
  //       const chatBoxH = chatBox?.clientHeight ?? 0;

  //       const available = Math.max(0, containerH - headerH - chatBoxH);

  //       // desired height: 1/3 of the available middle area, min 100px
  //       const height = Math.max(stylePos.height, Math.round(available));
  //       // top offset relative to container top: header height + centered within available area
  //       const top = headerH + Math.round((available - height) / 2);

  //       setStylePos({ top, height });
  //     }

  //     compute();
  //     window.addEventListener("resize", compute);
  //     // also observe container size changes
  //     const container = document.querySelector("#chat-display-box");
  //     let ro: ResizeObserver | null = null;
  //     if (container && (window as any).ResizeObserver) {
  //       ro = new (window as any).ResizeObserver(compute);
  //       ro.observe(container);
  //     }

  //     return () => {
  //       window.removeEventListener("resize", compute);
  //       if (ro && container) ro.unobserve(container);
  //     };
  //   }, []);

  return (
    <aside
      ref={barRef}
      aria-hidden={isCollapsed}
      className={`absolute right-0 top-16 h-auto bg-sidebar border-l border-b border-sidebar-border border-3 flex flex-col transition-all duration-300 shadow-lg overflow-hidden`}
      style={{
        justifyContent: isCollapsed ? "center" : "space-between",
        width: isCollapsed ? 54 : 284,
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <div className="p-3 border-b border-sidebar-border flex items-center justify-between bg-sidebar-accent/10">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <>
              <Moon className="w-5 h-5 text-sidebar-foreground" />
              <span className="font-bold text-sidebar-foreground">
                Image Store
              </span>
            </>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed((s) => !s)}
          className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors text-sidebar-foreground"
          aria-label={isCollapsed ? "Open images bar" : "Collapse images bar"}
        >
          {isCollapsed ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div className="flex-1 overflow-auto p-3 bg-sidebar">
          {images.length ? (
            <div className="flex flex-col gap-2">
              {images.map((src, i) => (
                <Image
                  key={i}
                  src={src}
                  alt={`chat image ${i + 1}`}
                  className="w-full rounded-md object-cover"
                  style={{ maxHeight: `${stylePos.height - 72}px` }}
                />
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-400">No images</div>
          )}
        </div>
      )}
    </aside>
  );
}
