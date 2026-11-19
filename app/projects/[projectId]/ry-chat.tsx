"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  sendRYMessage,
  getOrCreateRYConversation,
  getRYMessages,
  type RYMessage,
} from "@/app/projects/actions";

export default function RYChat({ projectId }: { projectId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<RYMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversation = useCallback(async () => {
    const result = await getOrCreateRYConversation(projectId);
    if (result.success) {
      setConversationId(result.conversation.id);
      const messagesResult = await getRYMessages(result.conversation.id);
      if (messagesResult.success) {
        setMessages(messagesResult.messages);
      } else {
        setError(messagesResult.message);
      }
    } else {
      setError(result.message);
    }
  }, [projectId]);

  useEffect(() => {
    async function init() {
      await loadConversation();
    }
    init();
  }, [loadConversation]);

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = inputValue.trim();
    if (!content || !conversationId || isLoading) return;

    setIsLoading(true);
    setError(null);

    const userMessage: RYMessage = {
      id: "temp-" + crypto.randomUUID(),
      conversation_id: conversationId,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    try {
      const result = await sendRYMessage(projectId, conversationId, content);

      if (result.success) {
        setMessages((prev) => [...prev, result.message]);
      } else {
        setError(result.message || "Failed to send message.");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to send message.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative">
      {/* Floating RY Launcher */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 rounded-full bg-stride-olive text-stride-olive-contrast px-4 py-3 text-sm font-medium shadow-lg hover:bg-stride-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2"
        aria-label="Open RY Coach"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 01-2-2H7l-2 3v2a2 2 0 002 2h12a2 2 0 002-2z" />
          <path d="M7 13v2a2 2 0 002 2h8a2 2 0 002-2v-2z" />
        </svg>
        <span className="ml-2">RY</span>
      </button>

      {/* Slide-out Chat Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-label="Close chat"
          />
          {/* Panel */}
          <div className="absolute right-0 top-0 h-full w-full max-w-[600px] bg-stride-ivory border-l border-stride-stone shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stride-stone bg-stride-ivory/50">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-stride-mint px-2.5 py-1 text-xs font-medium text-stride-dark">
                  RY Coach
                </div>
                <span className="text-sm font-medium text-stride-dark">
                  Project {projectId.substring(0, 8)}…
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full px-2.5 py-1 text-stride-dark hover:bg-stride-stone/20 transition-colors"
                aria-label="Close"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-stride-ivory">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="rounded-full bg-stride-mint/30 p-4 mb-4">
                    <svg className="w-8 h-8 text-stride-olive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 01-2-2H7l-2 3v2a2 2 0 002 2h12a2 2 0 002-2z" />
                      <path d="M7 13v2a2 2 0 002 2h8a2 2 0 002-2v-2z" />
                    </svg>
                  </div>
                  <h3 className="font-serif text-lg font-bold text-stride-dark mb-2">
                    Start a conversation with RY
                  </h3>
                  <p className="text-sm text-stride-dark/70 max-w-xs leading-relaxed">
                    RY is your AI coach. Ask questions about your project, get feedback on your ideas, or ask for help with the current stage.
                  </p>
                </div>
              )}
              {error && (
                <div className="rounded-lg border border-stride-dark/20 bg-stride-dark/5 p-4 text-sm text-stride-dark">
                  {error}
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`flex-1 rounded-lg px-4 py-3 text-sm ${msg.role === "user" ? "bg-stride-olive text-stride-olive-contrast" : "bg-stride-stone text-stride-dark"}`}>
                    {msg.content}
                  </div>
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${msg.role === "user" ? "bg-stride-olive text-stride-olive-contrast" : "bg-stride-mint text-stride-dark"}`}>
                      {msg.role === "user" ? "Y" : "R"}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-4 border-t border-stride-stone bg-white">
              <div className="flex gap-2">
                <textarea
                  id="ry-input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask RY anything about your project…"
                  className="flex-1 rounded-lg border border-stride-stone px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive transition-colors"
                  rows={1}
                  disabled={isLoading}
                />
                <button type="submit" disabled={isLoading || !inputValue.trim()} className={`rounded-full px-6 py-3 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 ${isLoading || !inputValue.trim() ? "bg-stride-sage text-stride-sage/60 cursor-not-allowed" : "bg-stride-olive text-stride-olive-contrast hover:bg-stride-dark"}`}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 19L19 5L5 5" />
                    <path d="M12 19l7-7" />
                  </svg>
                </button>
              </div>
              {isLoading && (
                <div className="flex items-center gap-2 pt-2 text-xs text-stride-dark/60">
                  <div className="w-3 h-3 rounded-full bg-stride-stone animate-pulse"></div>
                  <span>Thinking…</span>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
