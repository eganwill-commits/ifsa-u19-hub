"use client";
import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "ai"; text: string };

export default function AskAI() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: "Hi! Ask me anything about IFSA junior freeride events, athletes, or rankings." }
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "ai", text: data.answer ?? "Sorry, something went wrong." }]);
    } catch {
      setMessages((m) => [...m, { role: "ai", text: "Error connecting to assistant." }]);
    }
    setLoading(false);
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1000,
          width: 52, height: 52, borderRadius: "50%",
          background: "#ffcc00", border: "none", cursor: "pointer",
          fontSize: 22, boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        title="Ask AI"
      >
        {open ? "✕" : "💬"}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 88, right: 24, zIndex: 1000,
          width: 340, maxHeight: 480,
          background: "#0e0e0e", border: "1px solid #2a2a2a",
          borderRadius: 16, display: "flex", flexDirection: "column",
          boxShadow: "0 8px 40px rgba(0,0,0,0.6)", fontFamily: "system-ui",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #2a2a2a", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>🏔️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e8e8e8" }}>IFSA Assistant</div>
              <div style={{ fontSize: 11, color: "#555" }}>Ask about events, athletes, rankings</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                background: m.role === "user" ? "#ffcc00" : "#1a1a1a",
                color: m.role === "user" ? "#000" : "#e8e8e8",
                borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                padding: "8px 12px", fontSize: 13, lineHeight: 1.5,
                border: m.role === "ai" ? "1px solid #2a2a2a" : "none",
              }}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: "flex-start", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px 12px 12px 2px", padding: "8px 12px", fontSize: 13, color: "#555" }}>
                Thinking...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid #2a2a2a", display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask a question..."
              style={{
                flex: 1, padding: "8px 12px", borderRadius: 8,
                border: "1px solid #2a2a2a", background: "#141414",
                color: "#e8e8e8", fontSize: 13, fontFamily: "system-ui", outline: "none",
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading}
              style={{
                padding: "8px 14px", borderRadius: 8, border: "none",
                background: loading ? "#333" : "#ffcc00",
                color: loading ? "#555" : "#000",
                fontWeight: 700, fontSize: 13, cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}