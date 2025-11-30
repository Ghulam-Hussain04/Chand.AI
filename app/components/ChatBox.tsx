"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Send, ImagePlus, X, Loader2 } from "lucide-react"
import Image from "next/image"

interface ChatBoxProps {
  onSendMessage: (message: string, image?: File) => void
  isLoading?: boolean
}

export default function ChatBox({ onSendMessage, isLoading }: ChatBoxProps) {
  const [message, setMessage] = useState("")
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() || selectedImage) {
      onSendMessage(message, selectedImage || undefined)
      setMessage("")
      removeImage()
    }
  }

  return (
    <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-3 relative inline-block">
          <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border">
            <Image src={imagePreview || "/placeholder.svg"} alt="Selected image" fill className="object-cover" />
          </div>
          <button
            onClick={removeImage}
            className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        {/* Image Upload */}
        <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-3 bg-secondary hover:bg-secondary/80 rounded-xl transition-colors text-muted-foreground hover:text-foreground"
        >
          <ImagePlus className="w-5 h-5" />
        </button>

        {/* Message Input */}
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            placeholder="Describe the lunar scene or ask a question..."
            rows={1}
            className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 resize-none transition-all"
            style={{ minHeight: "48px", maxHeight: "150px" }}
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={isLoading || (!message.trim() && !selectedImage)}
          className="p-3 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 disabled:cursor-not-allowed rounded-xl transition-colors text-black"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </form>

      <p className="text-xs text-muted-foreground text-center mt-3">
        Upload lunar surface images for AI-powered analysis
      </p>
    </div>
  )
}
