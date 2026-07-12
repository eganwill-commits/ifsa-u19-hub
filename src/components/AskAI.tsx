"use client";
import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "ai"; text: string };

export default function AskAI() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: "Hi! Ask me anything about IFSA junior freeride — events, athletes, rankings, rules, weather at resorts, and more." }
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
      <style>{`
        .ask-ai-panel {
          position: fixed;
          bottom: 88px;
          right: 16px;
          left: 16px;
          max-width: 400px;
          margin-left: auto;
          height: 70vh;
          max-height: 520px;
          background: #0e0e0e;
          border: 1px solid #2a2a2a;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 8px 40px rgba(0,0,0,0.6);
          font-family: system-ui;
          overflow: hidden;
          z-index: 1000;
        }
        @media (min-width: 480px) {
          .ask-ai-panel {
            left: auto;
            width: 360px;
            height: 480px;
          }
        }
      `}</style>

      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1001,
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
        <div className="ask-ai-panel">
          {/* Header */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #2a2a2a", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <span style={{ fontSize: 18 }}>🏔️</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e8e8e8" }}>IFSA Assistant</div>
              <div style={{ fontSize: 11, color: "#555" }}>Events · Athletes · Rankings · Weather</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", color: "#555", fontSize: 18, cursor: "pointer", padding: 4, lineHeight: 1 }}
            >✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "88%",
                background: m.role === "user" ? "#ffcc00" : "#1a1a1a",
                color: m.role === "user" ? "#000" : "#e8e8e8",
                borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                padding: "8px 12px", fontSize: 13, lineHeight: 1.6,
                border: m.role === "ai" ? "1px solid #2a2a2a" : "none",
                wordBreak: "break-word",
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
          <div style={{ padding: "10px 12px", borderTop: "1px solid #2a2a2a", display: "flex", gap: 8, flexShrink: 0 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask a question..."
              style={{
                flex: 1, padding: "9px 12px", borderRadius: 8,
                border: "1px solid #2a2a2a", background: "#141414",
                color: "#e8e8e8", fontSize: 14, fontFamily: "system-ui", outline: "none",
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading}
              style={{
                padding: "9px 14px", borderRadius: 8, border: "none",
                background: loading ? "#333" : "#ffcc00",
                color: loading ? "#555" : "#000",
                fontWeight: 700, fontSize: 13, cursor: loading ? "not-allowed" : "pointer",
                flexShrink: 0,
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
