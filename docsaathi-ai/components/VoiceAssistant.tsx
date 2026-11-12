"use client";

import React, { useState, useRef, useEffect } from "react";
import type { ChatMessage, Language, MicState } from "@/types";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { MicButton } from "./MicButton";
import { SpeechPlayer } from "./SpeechPlayer";
import { Send, User, Bot, AlertCircle } from "lucide-react";

interface VoiceAssistantProps {
  documentContext: string;
  language: Language;
  suggestedQuestions?: string[];
  className?: string;
  onMicStateChange?: (state: MicState) => void;
}

function MessageBubble({
  message,
  speechLang,
}: {
  message: ChatMessage;
  speechLang: string;
}) {
  const isUser = message.role === "user";
  const { speechState, isSupported, currentRate, setCurrentRate, speak, pause, resume, stop, replay } =
    useSpeechSynthesis({ lang: speechLang });

  return (
    <div
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} animate-fade-in`}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm"
        style={{
          background: isUser
            ? "linear-gradient(135deg, #C47C60, #EBAF91)"
            : "linear-gradient(135deg, #49352E, #8b6358)",
        }}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-2`}>
        <div
          className="rounded-2xl px-4 py-3 shadow-sm text-sm leading-relaxed"
          style={{
            background: isUser ? "linear-gradient(135deg, #C47C60, #EBAF91)" : "#FFFFFF",
            color: isUser ? "#fff" : "#49352E",
            borderRadius: isUser ? "1rem 1rem 0.25rem 1rem" : "1rem 1rem 1rem 0.25rem",
            border: isUser ? "none" : "1.5px solid #F8DCCB",
          }}
        >
          {message.isLoading ? (
            <div className="flex gap-1 items-center py-1">
              {[0, 0.2, 0.4].map((d) => (
                <div
                  key={d}
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: "#C47C60",
                    animation: `waveform 0.8s ease-in-out infinite ${d}s`,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{message.content}</div>
          )}
        </div>

        {/* TTS for assistant messages */}
        {!isUser && !message.isLoading && message.content && (
          <SpeechPlayer
            text={message.content}
            speechState={speechState}
            isSupported={isSupported}
            speechLang={speechLang}
            currentRate={currentRate}
            onRateChange={setCurrentRate}
            onPlay={speak}
            onPause={pause}
            onResume={resume}
            onStop={stop}
            onReplay={replay}
            showSpeedControl={false}
          />
        )}

        <span className="text-xs opacity-50" style={{ color: "#8b6358" }}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

export function VoiceAssistant({
  documentContext,
  language,
  suggestedQuestions = [],
  className = "",
  onMicStateChange,
}: VoiceAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello! I'm DocSaathi. I've analyzed your document and I'm ready to answer your questions${language.code !== "en" ? ` in ${language.name}` : ""}. What would you like to know?`,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    micState,
    transcript,
    interimTranscript,
    errorMessage: micError,
    isSupported: micSupported,
    startListening,
    stopListening,
    cancelListening,
    setTranscript,
  } = useSpeechRecognition(language.speechLang ?? "en-IN");

  // Sync micState to parent for assistant animation
  useEffect(() => {
    onMicStateChange?.(micState);
  }, [micState, onMicStateChange]);

  // Sync transcript to input
  useEffect(() => {
    if (transcript) {
      setInputText(transcript);
    }
  }, [transcript]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    const loadingMessage: ChatMessage = {
      id: Date.now().toString() + "-loading",
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInputText("");
    setTranscript("");
    setIsLoading(true);
    setApiError(null);

    try {
      const history = messages
        .filter((m) => !m.isLoading)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/ask-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text.trim(),
          documentContext,
          language: language.name,
          languageCode: language.code,
          conversationHistory: history,
        }),
      });

      const data = await res.json();

      if (!data.success || !data.answer) {
        throw new Error(data.error ?? "No response received.");
      }

      const assistantMessage: ChatMessage = {
        id: Date.now().toString() + "-reply",
        role: "assistant",
        content: data.answer,
        timestamp: new Date(),
      };

      setMessages((prev) => [
        ...prev.filter((m) => !m.isLoading),
        assistantMessage,
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to get a response.";
      setApiError(msg);
      setMessages((prev) => prev.filter((m) => !m.isLoading));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  return (
    <div
      className={`flex flex-col rounded-2xl overflow-hidden shadow-lg ${className}`}
      style={{ border: "1.5px solid #F8DCCB", background: "#FEFAF7" }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{
          background: "linear-gradient(135deg, #49352E, #6b4a3e)",
          borderBottom: "1px solid #EBAF91",
        }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #C47C60, #EBAF91)" }}
        >
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">DocSaathi AI</h3>
          <p className="text-xs opacity-70 text-white">
            Answering in {language.name} · {language.nativeName}
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: 420, minHeight: 240 }}>
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            speechLang={language.speechLang ?? "en-IN"}
          />
        ))}
        {apiError && (
          <div
            className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm animate-fade-in"
            style={{ background: "#fde8e8", border: "1.5px solid #e07a7a", color: "#7a1e1e" }}
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {apiError}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions */}
      {suggestedQuestions.length > 0 && messages.length <= 2 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="text-xs px-3 py-1.5 rounded-full font-medium transition-all hover:scale-105 active:scale-95"
              style={{
                background: "#F8DCCB",
                color: "#C47C60",
                border: "1px solid #EBAF91",
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Mic error */}
      {micError && (
        <div
          className="mx-4 mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
          style={{ background: "#fde8e8", color: "#7a1e1e" }}
        >
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {micError}
        </div>
      )}

      {/* Input area */}
      <div
        className="p-4 flex gap-3 items-end"
        style={{ borderTop: "1.5px solid #F8DCCB", background: "#FFFFFF" }}
      >
        {/* Microphone */}
        <MicButton
          micState={micState}
          isSupported={micSupported}
          onStart={startListening}
          onStop={stopListening}
          onCancel={cancelListening}
          size="sm"
          showLabel={false}
          className="flex-shrink-0"
        />

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={inputText + (interimTranscript ? ` [${interimTranscript}]` : "")}
            onChange={(e) => {
              const v = e.target.value.replace(/ \[.*?\]$/, "");
              setInputText(v);
              setTranscript(v);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask DocSaathi anything about your document..."
            className="w-full resize-none rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
            style={{
              background: "#FFF4EC",
              border: "1.5px solid #EBAF91",
              color: "#49352E",
              minHeight: 44,
              maxHeight: 120,
            }}
            rows={1}
            aria-label="Type your question"
            disabled={isLoading}
          />
          {interimTranscript && (
            <span className="absolute right-3 top-3 text-xs opacity-50 italic" style={{ color: "#C47C60" }}>
              listening...
            </span>
          )}
        </div>

        {/* Send */}
        <button
          onClick={() => sendMessage(inputText)}
          disabled={!inputText.trim() || isLoading}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #C47C60, #EBAF91)" }}
          aria-label="Send message"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
