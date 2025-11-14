import Image from "next/image";

const ChatBox = ({
  chatBarRef,
  previewUrl,
  isLoading,
  hasUploaded,
  fileInputRef,
  uploadButtonClick,
  handleFileChange,
  handleAnalysisRequest,
}: {
  chatBarRef: React.RefObject<HTMLDivElement | null>;
  previewUrl: string | null;
  isLoading: boolean;
  hasUploaded: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  uploadButtonClick: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAnalysisRequest: () => void;
}) => {
  const uploadButtonStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    background: hasUploaded ? "#aaa" : "#6c757d",
    color: "white",
    cursor: isLoading ? "not-allowed" : "pointer",
    marginRight: "10px",
    borderRadius: 8,
    border: "none",
  };

  const sendButtonStyle: React.CSSProperties = {
    background: !hasUploaded || isLoading ? "#aaa" : "#28a745",
    color: "white",
    border: "none",
    borderRadius: "50%",
    width: "44px",
    height: "44px",
    fontSize: "20px",
    cursor: !hasUploaded || isLoading ? "not-allowed" : "pointer",
    marginLeft: "10px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    transition: "background 0.3s",
  };

  const bottomBarStyleBase: React.CSSProperties = {
    position: "fixed",
    bottom: 100,
    left: self.innerWidth * 0.1,
    right: 0,
    zIndex: 1000,
    boxShadow: "0 -2px 10px rgba(0,0,0,0.1)",
    background: "#ffffff",
    width: "80%",
    alignSelf: "center",
    borderRadius: 12,
    boxSizing: "border-box",
  };

  const inputRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  const chatInputStyle: React.CSSProperties = {
    flex: 1,
    minHeight: 44,
    maxHeight: 140,
    resize: "none" as const,
    padding: "10px 12px",
    border: "none",
    outline: "none",
    borderRadius: 8,
    background: "transparent",
    boxSizing: "border-box",
    fontSize: 14,
  };

  return (
    <div ref={chatBarRef} style={bottomBarStyleBase}>
      <div style={{ padding: 12, height: "100%" }}>
        {/* Image preview shown here and expands height dynamically */}
        {previewUrl && (
          <Image
            src={previewUrl}
            alt="preview"
            width={200}
            height={200}
            style={{
              borderRadius: 8,
              display: "block",
              margin: "8px auto",
              objectFit: "contain",
            }}
          />
        )}

        <div style={inputRowStyle}>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          {/* Upload Button with SVG icon */}
          <button
            onClick={uploadButtonClick}
            style={uploadButtonStyle}
            disabled={isLoading}
            aria-label="Upload Image"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 5 17 10" />
              <line x1="12" y1="5" x2="12" y2="19" />
            </svg>
            <span style={{ fontWeight: 600 }}>
              {hasUploaded ? "Uploaded ✓" : "Upload"}
            </span>
          </button>

          {/* Chat input expands to fill between buttons, no border */}
          <textarea
            placeholder="Add a message or leave empty and press Send to analyze uploaded image..."
            style={chatInputStyle}
            rows={1}
            disabled={isLoading}
          />

          {/* Send button */}
          <button
            onClick={handleAnalysisRequest}
            style={sendButtonStyle}
            disabled={!hasUploaded || isLoading}
            aria-label="Send for analysis"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07Zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
