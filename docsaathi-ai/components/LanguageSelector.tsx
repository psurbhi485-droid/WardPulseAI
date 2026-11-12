"use client";

import React from "react";
import { LANGUAGES } from "@/types";
import type { Language } from "@/types";
import { Globe } from "lucide-react";

interface LanguageSelectorProps {
  selected: Language;
  onChange: (lang: Language) => void;
  compact?: boolean;
  className?: string;
}

export function LanguageSelector({
  selected,
  onChange,
  compact = false,
  className = "",
}: LanguageSelectorProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <Globe className="w-4 h-4 text-terracotta" style={{ color: "#C47C60" }} />
      </div>
      <select
        value={selected.code}
        onChange={(e) => {
          const lang = LANGUAGES.find((l) => l.code === e.target.value);
          if (lang) onChange(lang);
        }}
        className={`
          pl-9 pr-8 rounded-xl border-2 font-medium appearance-none cursor-pointer
          transition-all duration-200 focus:outline-none
          ${compact ? "py-1.5 text-sm" : "py-2.5 text-sm"}
        `}
        style={{
          borderColor: "#EBAF91",
          backgroundColor: "#FFF4EC",
          color: "#49352E",
        }}
        aria-label="Select language"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {compact ? lang.nativeName : `${lang.nativeName} · ${lang.name}`}
          </option>
        ))}
      </select>
      <div
        className="absolute inset-y-0 right-2 flex items-center pointer-events-none"
        style={{ color: "#C47C60" }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
