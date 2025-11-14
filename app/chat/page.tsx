"use client";

import React, { useState, useRef, useLayoutEffect, ChangeEvent } from "react";
import ChatBox from "../components/ChatBox";
import ChatDisplay, { ChatMessage } from "../components/ChatDisplay";

type Mode = "soil" | "lunar";

const initialMessage: ChatMessage = {
  id: Date.now(),
  sender: "system",
  content: "Select an analysis mode, then click 'Upload' and 'Send' to begin.",
};

export default function ChatPage() {
  const [selectedMode, setSelectedMode] = useState<Mode>("soil");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messageHistory, setMessageHistory] = useState<ChatMessage[]>([
    initialMessage,
  ]);
  const [hasUploaded, setHasUploaded] = useState<boolean>(false);

  // For preview & upload tracking
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null);

  // chat bar height to give ChatDisplay bottom padding so content is not hidden
  const chatBarRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [chatBarHeight, setChatBarHeight] = useState<number>(100);

  const addMessage = (sender: "user" | "bot" | "system", content: any) => {
    setMessageHistory((prev) => [...prev, { id: Date.now(), sender, content }]);
  };

  // Trigger file input
  const uploadButtonClick = () => {
    if (isLoading) return;
    fileInputRef.current?.click();
  };

  // Handle file selection -> upload to server and show preview in the bottom chat box
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // show temporary preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setHasUploaded(false);
    setUploadedImageId(null);
    addMessage("system", "Preparing image for upload...");

    // upload to server
    try {
      const formData = new FormData();
      formData.append("file", file);

      setIsLoading(true);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
      }

      // Expect response { id: string, url: string }
      const json = await res.json();
      const serverUrl = json.url || objectUrl;
      const imageId = json.id || null;

      // add the uploaded image into the chat history (user message)
      addMessage("user", { type: "image", url: serverUrl, id: imageId });

      // update states so Send (analysis) is enabled
      setPreviewUrl(serverUrl);
      setUploadedImageId(imageId);
      setHasUploaded(true);
      addMessage("system", "Image uploaded. Click Send to analyze.");
    } catch (err: any) {
      addMessage("bot", `Image upload failed: ${err?.message || err}`);
      // keep preview so user can retry uploading if needed
      setHasUploaded(false);
    } finally {
      setIsLoading(false);
      // revoke object URL after a small delay to ensure preview loaded from server if returned
      setTimeout(() => {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}
      }, 3000);
    }

    // clear the input so same file can be reselected if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalysisRequest = async () => {
    if (!hasUploaded || !uploadedImageId) {
      addMessage("system", "Please upload an image first.");
      return;
    }

    setIsLoading(true);

    const apiEndpoint = selectedMode === "soil" ? "/api/analyze" : "/api/lunar";

    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: uploadedImageId }),
      });

      if (!res.ok) {
        throw new Error(`Error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      addMessage("bot", data);
      // clear preview after successful analysis
      setPreviewUrl(null);
      setUploadedImageId(null);
      setHasUploaded(false);
    } catch (error: any) {
      const errorContent = error.message || "An unknown error occurred";
      addMessage("bot", `An error occurred: ${errorContent}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ----- STYLES -----

  const tagStyle = (mode: Mode) => ({
    padding: "12px 20px",
    margin: "0 5px",
    cursor: "pointer",
    borderRadius: "20px",
    background: selectedMode === mode ? "#007bff" : "#eee",
    color: selectedMode === mode ? "white" : "black",
    border: "none",
    fontWeight: "bold" as const,
    transition: "background 0.3s, color 0.3s",
  });

  // update chat bar height for ChatDisplay padding
  useLayoutEffect(() => {
    const measure = () => {
      const h = chatBarRef.current?.getBoundingClientRect().height || 100;
      setChatBarHeight(h);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [previewUrl, isLoading, hasUploaded]);

  // ----- RENDER -----

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
      }}
    >
      <div style={{ flex: 1, overflow: "auto", paddingBottom: chatBarHeight }}>
        <ChatDisplay messages={messageHistory} isLoading={isLoading} />
      </div>

      <ChatBox
        chatBarRef={chatBarRef}
        previewUrl={previewUrl}
        isLoading={isLoading}
        hasUploaded={hasUploaded}
        fileInputRef={fileInputRef}
        uploadButtonClick={uploadButtonClick}
        handleFileChange={handleFileChange}
        handleAnalysisRequest={handleAnalysisRequest}
      />

      <div
        style={{
          borderTop: "1px solid #eee",
          padding: "20px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* Mode Toggles */}
          <button
            onClick={() => setSelectedMode("soil")}
            style={tagStyle("soil")}
            disabled={isLoading}
          >
            Soil Analysis
          </button>
          <button
            onClick={() => setSelectedMode("lunar")}
            style={tagStyle("lunar")}
            disabled={isLoading}
          >
            Lunar Surface Wander
          </button>
        </div>
      </div>
    </div>
  );
}