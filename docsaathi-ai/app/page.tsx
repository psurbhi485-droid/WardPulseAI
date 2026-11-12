"use client";

import React, { useState, useCallback } from "react";
import { LANGUAGES, DOCUMENT_CATEGORIES } from "@/types";
import type {
  Language,
  UploadedDocument,
  DocumentAnalysis,
  ChecklistItem,
} from "@/types";
import { FileUploadZone } from "@/components/FileUploadZone";
import { LanguageSelector } from "@/components/LanguageSelector";
import { DocumentResult } from "@/components/DocumentResult";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import {
  Loader2,
  AlertCircle,
  X,
  ArrowLeft,
  Sparkles,
  BookOpen,
  MessageCircle,
  Star,
  MapPin,
} from "lucide-react";
import {
  RegionalThemeProvider,
  useRegionalTheme,
  RegionalEnvironment,
  CartoonAssistant,
  RegionSelector,
  ThemeTransition,
} from "@/components/region";
import type { RegionTheme } from "@/types/region";

// ─── Loading Skeleton ──────────────────────────────────────────────────────────

function AnalysisLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-2xl p-5 h-32 shimmer" />
      <div className="rounded-2xl p-5 h-48 shimmer" />
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl p-5 h-28 shimmer" />
        <div className="rounded-2xl p-5 h-28 shimmer" />
      </div>
      <div className="rounded-2xl p-5 h-40 shimmer" />
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function AppHeader({
  language,
  onLanguageChange,
  onBack,
  showBack,
  onRegionClick,
  regionEmoji,
  regionName,
}: {
  language: Language;
  onLanguageChange: (l: Language) => void;
  onBack?: () => void;
  showBack: boolean;
  onRegionClick: () => void;
  regionEmoji: string;
  regionName: string;
}) {
  return (
    <header
      className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between gap-3"
      style={{
        background: "rgba(255,244,236,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid #F8DCCB",
        boxShadow: "0 1px 12px rgba(196,124,96,0.08)",
      }}
    >
      <div className="flex items-center gap-3">
        {showBack && onBack && (
          <button
            onClick={onBack}
            className="p-2 rounded-xl transition-all hover:scale-110 active:scale-95"
            style={{ background: "#F8DCCB", color: "#C47C60" }}
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: "linear-gradient(135deg, #C47C60, #EBAF91)" }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight" style={{ color: "#49352E" }}>
              DocSaathi AI
            </h1>
            <p className="text-xs opacity-60 hidden sm:block" style={{ color: "#8b6358" }}>
              Understand Documents. Know What to Do Next.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Region selector button */}
        <button
          onClick={onRegionClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105 active:scale-95"
          style={{
            background: "#F8DCCB",
            color: "#C47C60",
            border: "1px solid #EBAF91",
          }}
          aria-label={`Current region: ${regionName}. Click to change.`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{regionEmoji} {regionName}</span>
          <span className="sm:hidden">{regionEmoji}</span>
        </button>

        <LanguageSelector
          selected={language}
          onChange={onLanguageChange}
          compact
          className="flex-shrink-0"
        />
      </div>
    </header>
  );
}

// ─── Dashboard (Home) ─────────────────────────────────────────────────────────

function Dashboard({
  language,
  onFileSelected,
  isLoading,
  welcomeMessage,
  assistantState,
  theme,
  onLanguageChange,
}: {
  language: Language;
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  welcomeMessage: string;
  assistantState: "welcome" | "listening" | "thinking" | "idle";
  theme: RegionTheme;
  onLanguageChange?: (lang: Language) => void;
}) {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative pt-6 pb-2">
        <div className="text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-4 shadow-sm"
            style={{
              background: "#F8DCCB",
              color: "#C47C60",
              border: `1px solid ${theme.colors.accentLight || "#EBAF91"}`,
            }}
          >
            <span>{theme.emoji}</span>
            <span>{theme.name} Edition</span>
            <span className="opacity-50">·</span>
            <span>DocSaathi AI</span>
          </div>

          <h2
            className="text-3xl sm:text-4xl font-extrabold mb-2"
            style={{ color: "#49352E" }}
          >
            Welcome to DocSaathi AI
          </h2>

          <p className="text-lg font-medium" style={{ color: "#C47C60" }}>
            {welcomeMessage}
          </p>

          <p className="text-sm mt-1 italic opacity-85" style={{ color: "#8b6358" }}>
            &ldquo;{theme.tagline}&rdquo;
          </p>

          <p className="text-sm mt-3 max-w-md mx-auto" style={{ color: "#a0796b" }}>
            Upload any official document and get a clear, plain-language explanation
            in {language.name} — instantly.
          </p>

          {/* Regional suggested language quick-pills */}
          {theme.languages && theme.languages.length > 0 && (
            <div className="mt-3 flex items-center justify-center flex-wrap gap-1.5">
              <span className="text-xs opacity-70" style={{ color: "#8b6358" }}>
                Regional tongues:
              </span>
              {theme.languages.map((langName) => {
                const matched = LANGUAGES.find(
                  (l) =>
                    l.name.toLowerCase() === langName.toLowerCase() ||
                    l.nativeName.toLowerCase() === langName.toLowerCase()
                );
                return (
                  <button
                    key={langName}
                    type="button"
                    onClick={() => matched && onLanguageChange?.(matched)}
                    className="text-xs px-2.5 py-1 rounded-full font-medium transition-transform hover:scale-105 active:scale-95"
                    style={{
                      background:
                        language.name.toLowerCase() === langName.toLowerCase()
                          ? "#C47C60"
                          : "#FFF4EC",
                      color:
                        language.name.toLowerCase() === langName.toLowerCase()
                          ? "#FFF"
                          : "#C47C60",
                      border: "1px solid #EBAF91",
                    }}
                    title={matched ? `Switch language to ${matched.name}` : langName}
                  >
                    {langName}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* CartoonAssistant — integrated beside hero */}
        <div className="mt-4 flex justify-center lg:block lg:absolute lg:right-0 lg:top-0 lg:w-44 select-none">
          <CartoonAssistant theme={theme} state={assistantState} showSpeechBubble size="md" />
        </div>
      </div>

      {/* Upload section */}
      <div
        className="rounded-2xl p-6 shadow-md"
        style={{ background: "#FFFFFF", border: "1.5px solid #F8DCCB" }}
      >
        <h3 className="font-bold text-base mb-4 flex items-center gap-2" style={{ color: "#49352E" }}>
          <BookOpen className="w-5 h-5" style={{ color: "#C47C60" }} />
          Upload Your Document
        </h3>
        {isLoading ? (
          <div className="flex flex-col items-center gap-4 py-12">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md"
              style={{ background: "linear-gradient(135deg, #EBAF91, #C47C60)" }}
            >
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-semibold" style={{ color: "#49352E" }}>
                Analysing your document...
              </p>
              <p className="text-sm mt-1" style={{ color: "#8b6358" }}>
                DocSaathi is reading and understanding your document in {language.name}
              </p>
            </div>
            <div className="flex gap-2">
              {[0, 0.2, 0.4, 0.6].map((d) => (
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
          </div>
        ) : (
          <FileUploadZone onFileSelected={onFileSelected} isLoading={isLoading} />
        )}
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            icon: "🔍",
            title: "Instant Understanding",
            desc: "Get plain-language explanations of complex documents",
          },
          {
            icon: "🎙️",
            title: "Voice Assistant",
            desc: "Ask questions about your document using voice or text",
          },
          {
            icon: "🌐",
            title: "13 Languages",
            desc: "Explanations in Hindi, Tamil, Bengali and 10 more",
          },
        ].map(({ icon, title, desc }) => (
          <div
            key={title}
            className="rounded-2xl p-5 text-center card-hover shadow-sm"
            style={{ background: "#FFFFFF", border: "1.5px solid #F8DCCB" }}
          >
            <div className="text-3xl mb-3">{icon}</div>
            <h4 className="font-bold text-sm mb-1" style={{ color: "#49352E" }}>
              {title}
            </h4>
            <p className="text-xs" style={{ color: "#8b6358" }}>
              {desc}
            </p>
          </div>
        ))}
      </div>

      {/* Document categories */}
      <div>
        <h3 className="font-bold text-base mb-4 flex items-center gap-2" style={{ color: "#49352E" }}>
          <Star className="w-5 h-5" style={{ color: "#C47C60" }} />
          Document Categories We Support
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DOCUMENT_CATEGORIES.map((cat) => (
            <div
              key={cat.value}
              className="category-card rounded-2xl p-4 card-hover shadow-sm text-center"
              style={{ background: "#FFFFFF" }}
            >
              <div className="text-2xl mb-2">{cat.icon}</div>
              <p className="font-semibold text-xs" style={{ color: "#49352E" }}>
                {cat.label}
              </p>
              <p className="text-xs opacity-60 mt-1 hidden sm:block" style={{ color: "#8b6358" }}>
                {cat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main App (inner — uses regional theme hook) ──────────────────────────────

type AppView = "dashboard" | "result";
type MicState = "idle" | "listening" | "processing" | "speaking" | "error";

function DocSaathiApp() {
  const { theme, isTransitioning } = useRegionalTheme();

  const [language, setLanguage] = useState<Language>(LANGUAGES[0]);
  const [view, setView] = useState<AppView>("dashboard");
  const [uploadedDoc, setUploadedDoc] = useState<UploadedDocument | null>(null);
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"result" | "chat">("result");
  const [micState, setMicState] = useState<MicState>("idle");
  const [regionSelectorOpen, setRegionSelectorOpen] = useState(false);

  // Derive assistant character state from app state
  const assistantState: "welcome" | "listening" | "thinking" | "idle" =
    isLoading || isTransitioning
      ? "thinking"
      : micState === "listening"
      ? "listening"
      : view === "dashboard"
      ? "welcome"
      : "idle";

  const handleFileSelected = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);

      try {
        // Convert file to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Strip the data:...,base64, prefix
            const base64Data = result.split(",")[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Get preview URL for images
        const previewUrl =
          file.type !== "application/pdf"
            ? URL.createObjectURL(file)
            : undefined;

        const doc: UploadedDocument = {
          id: Date.now().toString(),
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: file.type !== "application/pdf" ? previewUrl ?? "" : "",
          uploadedAt: new Date(),
        };

        setUploadedDoc(doc);

        // Call API
        const res = await fetch("/api/analyze-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileData: base64,
            mimeType: file.type,
            language: language.name,
            languageCode: language.code,
          }),
        });

        const data = await res.json();

        if (!data.success || !data.analysis) {
          throw new Error(data.error ?? "Analysis failed. Please try again.");
        }

        setAnalysis(data.analysis);
        setChecklist(data.analysis.checklist ?? []);
        setView("result");
        setActiveTab("result");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to analyze document.";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [language]
  );

  const handleChecklistToggle = useCallback((id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  }, []);

  const handleBack = useCallback(() => {
    setView("dashboard");
    setUploadedDoc(null);
    setAnalysis(null);
    setChecklist([]);
    setError(null);
  }, []);

  const documentContextString = analysis
    ? JSON.stringify({
        title: analysis.title,
        summary: analysis.summary,
        explanation: analysis.explanation,
        importantDates: analysis.importantDates,
        feesAndPayments: analysis.feesAndPayments,
        eligibility: analysis.eligibility,
        requiredDocuments: analysis.requiredDocuments,
        warnings: analysis.warnings,
        checklist: analysis.checklist,
      })
    : "";

  const suggestedQuestions = [
    "What is this document about?",
    "What are the important deadlines?",
    "What documents do I need to submit?",
    "What are the fees involved?",
    "What should I do first?",
  ];

  return (
    <div className="min-h-screen relative" style={{ background: "#FFF4EC" }}>
      {/* Regional animated background — fixed, behind all content */}
      <RegionalEnvironment theme={theme} />

      {/* Theme transition overlay */}
      <ThemeTransition />

      <div className="relative z-10">
        <AppHeader
          language={language}
          onLanguageChange={setLanguage}
          onBack={handleBack}
          showBack={view === "result"}
          onRegionClick={() => setRegionSelectorOpen(true)}
          regionEmoji={theme.emoji}
          regionName={theme.name}
        />

        <main className="max-w-2xl mx-auto px-4 py-6">
          {/* Error banner */}
          {error && (
            <div
              className="mb-6 flex items-start gap-3 rounded-2xl px-5 py-4 animate-fade-in shadow-sm"
              style={{ background: "#fde8e8", border: "1.5px solid #e07a7a", color: "#7a1e1e" }}
              role="alert"
            >
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm">Analysis Failed</p>
                <p className="text-sm mt-0.5">{error}</p>
                <p className="text-xs mt-1 opacity-70">
                  Make sure your GEMINI_API_KEY is set in .env.local
                </p>
              </div>
              <button
                onClick={() => setError(null)}
                aria-label="Dismiss error"
                className="opacity-60 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Dashboard view */}
          {view === "dashboard" && (
            <Dashboard
              language={language}
              onFileSelected={handleFileSelected}
              isLoading={isLoading}
              welcomeMessage={theme.welcomeMessage}
              assistantState={assistantState}
              theme={theme}
              onLanguageChange={setLanguage}
            />
          )}

          {/* Results view */}
          {view === "result" && (
            <div className="space-y-6">
              {/* Tab switcher */}
              <div
                className="flex rounded-xl p-1 shadow-sm"
                style={{ background: "#F8DCCB" }}
                role="tablist"
              >
                {[
                  { id: "result", label: "Document Analysis", icon: BookOpen },
                  { id: "chat", label: "Ask DocSaathi", icon: MessageCircle },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={activeTab === id}
                    onClick={() => setActiveTab(id as "result" | "chat")}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                    style={{
                      background:
                        activeTab === id
                          ? "linear-gradient(135deg, #C47C60, #EBAF91)"
                          : "transparent",
                      color: activeTab === id ? "#fff" : "#8b6358",
                      boxShadow: activeTab === id ? "0 2px 8px rgba(196,124,96,0.3)" : "none",
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>

              {/* Loading skeleton */}
              {isLoading && <AnalysisLoadingSkeleton />}

              {/* Document result */}
              {!isLoading && analysis && activeTab === "result" && (
                <DocumentResult
                  analysis={analysis}
                  speechLang={language.speechLang ?? "en-IN"}
                  documentPreviewUrl={uploadedDoc?.dataUrl || undefined}
                  documentName={uploadedDoc?.name ?? "Document"}
                  checklist={checklist}
                  onChecklistToggle={handleChecklistToggle}
                />
              )}

              {/* Voice assistant / chat */}
              {!isLoading && analysis && activeTab === "chat" && (
                <VoiceAssistant
                  documentContext={documentContextString}
                  language={language}
                  suggestedQuestions={suggestedQuestions}
                  onMicStateChange={setMicState}
                />
              )}

              {/* Upload another */}
              {!isLoading && (
                <div
                  className="rounded-2xl p-5 shadow-sm"
                  style={{ background: "#FFFFFF", border: "1.5px solid #F8DCCB" }}
                >
                  <h3
                    className="font-bold text-sm mb-3"
                    style={{ color: "#49352E" }}
                  >
                    Analyse Another Document
                  </h3>
                  <FileUploadZone onFileSelected={handleFileSelected} />
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="text-center py-8 px-4" style={{ color: "#a0796b" }}>
          <p className="text-xs">
            🌸 DocSaathi AI — Built for every Indian citizen · AI explanations
            may not substitute professional legal advice.
          </p>
        </footer>
      </div>

      {/* Region selector modal */}
      {regionSelectorOpen && (
        <RegionSelector onClose={() => setRegionSelectorOpen(false)} />
      )}
    </div>
  );
}

// ─── Root export — wraps in provider ─────────────────────────────────────────

export default function HomePage() {
  return (
    <RegionalThemeProvider>
      <DocSaathiApp />
    </RegionalThemeProvider>
  );
}
