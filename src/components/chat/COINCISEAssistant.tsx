"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  MessageSquare,
  X,
  Send,
  Loader2,
  HelpCircle,
  ChevronRight,
  Bot,
  User,
  AlertCircle,
  ExternalLink,
  Minimize2,
  Maximize2,
  RotateCcw,
} from "lucide-react";
import { getUnifiedDashboardMetrics } from "@/lib/data-service";
import { getOnboardingData } from "@/lib/onboarding-service";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  isAIGenerated?: boolean;
  configurationRequired?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "How do I add a financial transaction?",
  "Where can I find my receivables?",
  "What does my Credro score mean?",
  "How do I understand my cash-flow forecast?",
  "Why am I receiving a cash-shortage alert?",
  "How do I update my business information?",
  "Where can I find my reports?",
];

export function COINCISEAssistant() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      sender: "assistant",
      text: "Hello! I am your **COINCISE Assistant**. How can I help you navigate the platform or understand your financial dashboard today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized]);

  // Don't show assistant on standalone onboarding screen
  if (pathname === "/onboarding") {
    return null;
  }

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Gather lightweight live context for accurate responses
      const metrics = getUnifiedDashboardMetrics();
      const onboarding = getOnboardingData();

      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          context: {
            currentPath: pathname,
            businessName: onboarding.profile.tradeName || onboarding.profile.mcaLegalName,
            availableCash: metrics.availableCash,
            minimumReserve: onboarding.openingFinances.minimumReserve,
          },
        }),
      });

      const data = await res.json();

      if (res.ok && data.response) {
        const assistantMsg: Message = {
          id: `asst-${Date.now()}`,
          sender: "assistant",
          text: data.response,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isAIGenerated: data.isAIGenerated,
          configurationRequired: data.configurationRequired,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error(data.error || "Failed to receive response.");
      }
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : "Error contacting assistant";
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "assistant",
          text: `⚠️ I encountered an issue: ${errText}. Please check your connection or verify that \`GEMINI_API_KEY\` is set in \`.env.local\`.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* 1. Floating Action Button (Unobtrusive bottom-right) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/25 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 group border border-white/20"
          aria-label="Open COINCISE Assistant"
        >
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-amber-200 group-hover:rotate-12 transition-transform" />
          </div>
          <span className="tracking-wide">Ask Assistant</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      )}

      {/* 2. Floating Chat Panel */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-200 shadow-2xl rounded-2xl border border-slate-200/90 bg-white flex flex-col overflow-hidden ${
            isMinimized
              ? "bottom-5 right-5 w-72 h-14"
              : "bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 md:w-[420px] h-[540px] max-h-[85vh]"
          }`}
        >
          {/* Chat Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-xs text-white tracking-wide">COINCISE Assistant</h3>
                  <span className="text-[9px] uppercase font-bold tracking-wider px-1 py-0.2 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                    Gemini
                  </span>
                </div>
                {!isMinimized && (
                  <p className="text-[10px] text-slate-400 font-medium">In-App Navigation & Guidance</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMinimized((prev) => !prev)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Chat Body (When not minimized) */}
          {!isMinimized && (
            <>
              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${
                      msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                        msg.sender === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-900 text-amber-300"
                      }`}
                    >
                      {msg.sender === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-blue-600 text-white rounded-tr-xs"
                          : "bg-white border border-slate-200/80 text-slate-800 rounded-tl-xs"
                      }`}
                    >
                      <div className="whitespace-pre-line prose-xs">{msg.text}</div>

                      {msg.configurationRequired && (
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-amber-700">
                          <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>Tip: Set GEMINI_API_KEY in .env.local for full AI responses</span>
                        </div>
                      )}

                      <div
                        className={`text-[9px] mt-1 flex items-center justify-end gap-1 ${
                          msg.sender === "user" ? "text-blue-200" : "text-slate-400"
                        }`}
                      >
                        <span>{msg.timestamp}</span>
                        {msg.isAIGenerated && <span>• AI</span>}
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-amber-300 flex items-center justify-center shrink-0">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs px-3.5 py-2.5 text-xs text-slate-500 flex items-center gap-2 shadow-xs">
                      <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                      <span>COINCISE Assistant is thinking...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Questions Section */}
              {messages.length <= 3 && (
                <div className="px-4 py-2 bg-white border-t border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <HelpCircle className="w-3 h-3 text-slate-400" />
                    Suggested Questions
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto py-0.5">
                    {SUGGESTED_QUESTIONS.map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(q)}
                        disabled={isLoading}
                        className="text-[11px] text-slate-600 hover:text-blue-700 hover:bg-blue-50 bg-slate-100/90 border border-slate-200/70 rounded-full px-2.5 py-1 text-left transition-colors font-medium flex items-center gap-1"
                      >
                        <span>{q}</span>
                        <ChevronRight className="w-2.5 h-2.5 opacity-50" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Input Footer */}
              <div className="p-3 bg-white border-t border-slate-100">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask how to navigate COINCISE..."
                    disabled={isLoading}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white transition-all disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading}
                    className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white flex items-center justify-center transition-all shrink-0 shadow-xs"
                    title="Send message"
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </button>
                </form>
                <div className="mt-1.5 text-[10px] text-slate-400 text-center">
                  Assistant guides navigation and explanations; it cannot modify transactions or make payments.
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
