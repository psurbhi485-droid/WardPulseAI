"use client";

import React from "react";
import type { DocumentAnalysis, ChecklistItem } from "@/types";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { SpeechPlayer } from "./SpeechPlayer";
import {
  Calendar,
  DollarSign,
  CheckSquare,
  FileText,
  AlertTriangle,
  Users,
  Info,
} from "lucide-react";
import { DOCUMENT_CATEGORIES } from "@/types";

interface DocumentResultProps {
  analysis: DocumentAnalysis;
  speechLang: string;
  documentPreviewUrl?: string;
  documentName: string;
  checklist: ChecklistItem[];
  onChecklistToggle: (id: string) => void;
  className?: string;
}

function SectionCard({
  icon,
  title,
  items,
  accentColor,
  emptyMessage,
}: {
  icon: React.ReactNode;
  title: string;
  items: { title: string; content: string; priority?: string }[];
  accentColor: string;
  emptyMessage?: string;
}) {
  if (items.length === 0 && !emptyMessage) return null;

  return (
    <div
      className="rounded-2xl p-5 shadow-sm card-hover animate-fade-in"
      style={{ background: "#FFFFFF", border: "1.5px solid #F8DCCB" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: accentColor, opacity: 0.9 }}
        >
          {icon}
        </div>
        <h3 className="font-bold text-base" style={{ color: "#49352E" }}>
          {title}
        </h3>
      </div>
      {items.length === 0 ? (
        <p className="text-sm italic opacity-60" style={{ color: "#8b6358" }}>
          {emptyMessage}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div
              key={i}
              className="rounded-xl p-3"
              style={{
                background: item.priority === "high" ? "#FFF0EB" : "#FEFAF7",
                borderLeft: `3px solid ${item.priority === "high" ? "#C47C60" : "#EBAF91"}`,
              }}
            >
              <p className="font-semibold text-sm mb-0.5" style={{ color: "#49352E" }}>
                {item.title}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "#6b4a3e" }}>
                {item.content}
              </p>
              {item.priority === "high" && (
                <span
                  className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: "#C47C60", color: "#fff" }}
                >
                  Important
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DocumentResult({
  analysis,
  speechLang,
  documentPreviewUrl,
  documentName,
  checklist,
  onChecklistToggle,
  className = "",
}: DocumentResultProps) {
  const categoryInfo = DOCUMENT_CATEGORIES.find((c) => c.value === analysis.category);
  const { speechState, isSupported, currentRate, setCurrentRate, speak, pause, resume, stop, replay } =
    useSpeechSynthesis({ lang: speechLang });

  const completedCount = checklist.filter((i) => i.completed).length;
  const progressPct = checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Document info header */}
      <div
        className="rounded-2xl p-5 shadow-sm animate-scale-in"
        style={{
          background: "linear-gradient(135deg, #49352E, #6b4a3e)",
          color: "#fff",
        }}
      >
        <div className="flex items-start gap-4">
          {/* Preview thumbnail */}
          {documentPreviewUrl && (
            <div
              className="w-16 h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-md"
              style={{ border: "2px solid rgba(255,255,255,0.2)" }}
            >
              <img
                src={documentPreviewUrl}
                alt="Document preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-2xl">{categoryInfo?.icon ?? "📄"}</span>
              <span
                className="text-xs font-medium px-2 py-1 rounded-full"
                style={{ background: "rgba(235,175,145,0.3)", color: "#EBAF91" }}
              >
                {categoryInfo?.label ?? "Document"}
              </span>
            </div>
            <h2 className="font-bold text-xl leading-tight mb-1 truncate">
              {analysis.title || documentName}
            </h2>
            <p className="text-sm opacity-80 leading-relaxed line-clamp-3">
              {analysis.summary}
            </p>
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div
        className="rounded-2xl p-5 shadow-sm animate-fade-in"
        style={{ background: "#FFFFFF", border: "1.5px solid #F8DCCB" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #EBAF91, #C47C60)" }}
          >
            <Info className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-bold text-base" style={{ color: "#49352E" }}>
            Simple Explanation
          </h3>
        </div>
        <div className="prose-peach text-sm leading-relaxed mb-4" style={{ color: "#6b4a3e" }}>
          {analysis.explanation}
        </div>
        {/* TTS for explanation */}
        <SpeechPlayer
          text={analysis.explanation}
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
        />
      </div>

      {/* Important Dates */}
      <SectionCard
        icon={<Calendar className="w-4 h-4 text-white" />}
        title="Important Dates & Deadlines"
        items={analysis.importantDates}
        accentColor="linear-gradient(135deg, #e07a5a, #C47C60)"
        emptyMessage="No specific dates mentioned in this document."
      />

      {/* Fees & Payments */}
      <SectionCard
        icon={<DollarSign className="w-4 h-4 text-white" />}
        title="Fees & Payment Information"
        items={analysis.feesAndPayments}
        accentColor="linear-gradient(135deg, #5a8f6b, #7cbf8e)"
        emptyMessage="No fee information found in this document."
      />

      {/* Eligibility */}
      <SectionCard
        icon={<Users className="w-4 h-4 text-white" />}
        title="Eligibility Requirements"
        items={analysis.eligibility}
        accentColor="linear-gradient(135deg, #5a7a8f, #7cabcf)"
        emptyMessage="No eligibility information found in this document."
      />

      {/* Required Documents */}
      <SectionCard
        icon={<FileText className="w-4 h-4 text-white" />}
        title="Required Documents"
        items={analysis.requiredDocuments}
        accentColor="linear-gradient(135deg, #8f5a7a, #bf7aab)"
        emptyMessage="No document list found."
      />

      {/* Warnings */}
      {analysis.warnings.length > 0 && (
        <div
          className="rounded-2xl p-5 shadow-sm animate-fade-in"
          style={{
            background: "#FFF3EB",
            border: "2px solid #C47C60",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #C47C60, #e07a5a)" }}
            >
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-bold text-base" style={{ color: "#49352E" }}>
              ⚠️ Important Warnings
            </h3>
          </div>
          <div className="space-y-3">
            {analysis.warnings.map((w, i) => (
              <div
                key={i}
                className="rounded-xl p-3"
                style={{ background: "#FDE8DC", borderLeft: "3px solid #C47C60" }}
              >
                <p className="font-semibold text-sm mb-0.5" style={{ color: "#7a2e1e" }}>
                  {w.title}
                </p>
                <p className="text-sm" style={{ color: "#8b4a3e" }}>
                  {w.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Checklist */}
      {checklist.length > 0 && (
        <div
          className="rounded-2xl p-5 shadow-sm animate-fade-in"
          style={{ background: "#FFFFFF", border: "1.5px solid #F8DCCB" }}
        >
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #C47C60, #EBAF91)" }}
              >
                <CheckSquare className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-base" style={{ color: "#49352E" }}>
                Action Checklist
              </h3>
            </div>
            <span className="text-sm font-medium" style={{ color: "#C47C60" }}>
              {completedCount}/{checklist.length} done
            </span>
          </div>

          {/* Progress bar */}
          <div
            className="w-full h-2 rounded-full mb-4 overflow-hidden"
            style={{ background: "#F8DCCB" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, #EBAF91, #C47C60)",
              }}
            />
          </div>

          <div className="space-y-2">
            {checklist.map((item) => (
              <label
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.01]"
                style={{
                  background: item.completed ? "#F0F8F4" : "#FEFAF7",
                  border: `1.5px solid ${item.completed ? "#7cbf8e" : "#F8DCCB"}`,
                  opacity: item.completed ? 0.8 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => onChecklistToggle(item.id)}
                  className="mt-0.5 w-4 h-4 rounded cursor-pointer"
                  style={{ accentColor: "#C47C60" }}
                  aria-label={item.text}
                />
                <span
                  className="text-sm leading-relaxed flex-1"
                  style={{
                    color: item.completed ? "#5a8f6b" : "#49352E",
                    textDecoration: item.completed ? "line-through" : "none",
                  }}
                >
                  {item.text}
                </span>
                {item.priority === "urgent" && !item.completed && (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: "#C47C60", color: "#fff" }}
                  >
                    Urgent
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
