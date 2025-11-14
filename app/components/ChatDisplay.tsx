"use client";

import React, { useEffect, useRef } from "react";

// Define the structure of a message
export interface ChatMessage {
  id: number;
  sender: "user" | "bot" | "system";
  content: any; // Can be a string or our JSON object
}

// Define the props for our component
interface ChatDisplayProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

// Styles
const chatContainerStyle: React.CSSProperties = {
  padding: "20px",
  fontFamily: "sans-serif",
  height: "90%",
  overflowY: "auto",
  background: "#f9f9f9",
  display: "flex",
  flexDirection: "column",
};

const preStyle: React.CSSProperties = {
  background: "#282c34",
  color: "#61dafb",
  padding: "15px",
  borderRadius: "8px",
  overflowX: "auto",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0",
};

const msgBaseStyle: React.CSSProperties = {
  padding: "12px 18px",
  borderRadius: "18px",
  maxWidth: "70%",
  marginBottom: "10px",
  lineHeight: "1.4",
  wordWrap: "break-word",
};

const userMsgStyle: React.CSSProperties = {
  ...msgBaseStyle,
  background: "#007bff",
  color: "white",
  alignSelf: "flex-end",
};

const botMsgStyle: React.CSSProperties = {
  ...msgBaseStyle,
  background: "#e9e9eb",
  color: "#333",
  alignSelf: "flex-start",
};

const systemMsgStyle: React.CSSProperties = {
  ...msgBaseStyle,
  background: "transparent",
  color: "#888",
  alignSelf: "center",
  textAlign: "center",
  fontSize: "18px",
  padding: "5px",
};

const loadingStyle: React.CSSProperties = {
  ...botMsgStyle,
  fontStyle: "italic",
};

const ChatDisplay = ({ messages, isLoading }: ChatDisplayProps) => {
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom whenever messages change
  useEffect(scrollToBottom, [messages]);

  return (
    <div style={chatContainerStyle}>
      {messages.map((msg) => {
        let style = botMsgStyle;
        if (msg.sender === "user") style = userMsgStyle;
        if (msg.sender === "system") style = systemMsgStyle;

        // if content is our JSON object
        const isJsonResult =
          msg.sender === "bot" && typeof msg.content === "object";

        return (
          <div key={msg.id} style={style}>
            {isJsonResult ? (
              <pre style={preStyle}>{JSON.stringify(msg.content, null, 2)}</pre>
            ) : (
              msg.content
            )}
          </div>
        );
      })}

      {isLoading && <div style={loadingStyle}>Dr. Terra is analyzing...</div>}

      {/* Auto Scroll Logic, Scroll fn run whenever new message enters */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatDisplay;
