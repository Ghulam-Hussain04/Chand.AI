"use client";

import { useRef, useEffect } from "react";
import { Moon, User, Bot } from "lucide-react";
import Image from "next/image";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string;
  timestamp: Date;
}

interface ChatDisplayProps {
  messages: Message[];
  isLoading?: boolean;
}

export default function ChatDisplay({ messages, isLoading }: ChatDisplayProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mb-6 animate-float">
          <Moon className="w-10 h-10 text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Lunar Scene Analysis
        </h2>
        <p className="text-muted-foreground max-w-md mb-8">
          Upload lunar surface images for AI-powered terrain analysis, crater
          detection, and geological feature identification.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
          {[
            {
              icon: "🌑",
              title: "Crater Detection",
              desc: "Identify and measure lunar craters",
            },
            {
              icon: "🗺️",
              title: "Terrain Mapping",
              desc: "Analyze surface topology",
            },
            {
              icon: "🔬",
              title: "Composition Analysis",
              desc: "Detect geological features",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="p-4 bg-card border border-border rounded-xl hover:border-amber-500/50 transition-colors"
            >
              <div className="text-2xl mb-2">{item.icon}</div>
              <h3 className="font-medium text-foreground text-sm">
                {item.title}
              </h3>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex gap-4 ${
            message.role === "user" ? "flex-row-reverse" : ""
          }`}
        >
          {/* Avatar */}
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              message.role === "user"
                ? "bg-amber-500/20 text-amber-400"
                : "bg-secondary text-foreground"
            }`}
          >
            {message.role === "user" ? (
              <User className="w-5 h-5" />
            ) : (
              <Bot className="w-5 h-5" />
            )}
          </div>

          {/* Message Content */}
          <div
            className={`max-w-[70%] ${
              message.role === "user" ? "text-right" : ""
            }`}
          >
            <div
              className={`inline-block p-4 rounded-2xl ${
                message.role === "user"
                  ? "bg-amber-500 text-black"
                  : "bg-card border border-border text-foreground"
              }`}
            >
              {message.image && (
                <div className="mb-3 rounded-lg overflow-hidden">
                  <Image
                    src={message.image || "/placeholder.svg"}
                    alt="Uploaded lunar image"
                    width={300}
                    height={200}
                    className="object-cover"
                  />
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1 px-2">
              {/* {message.timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })} */}
            </p>
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <Bot className="w-5 h-5 text-foreground" />
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex gap-1">
              <span
                className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
