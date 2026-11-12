"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { RegionTheme } from "@/types/region";
import { ALL_REGIONS, DEFAULT_REGION } from "@/data/regionThemes";
import { useRegionalTheme } from "./RegionalThemeProvider";

export interface RegionSelectorProps {
  currentRegion?: RegionTheme;
  onSelect?: (r: RegionTheme) => void;
  isOpen?: boolean;
  onClose: () => void;
}

export function RegionSelector({
  currentRegion: propCurrentRegion,
  onSelect: propOnSelect,
  isOpen = true,
  onClose,
}: RegionSelectorProps) {
  let contextTheme = DEFAULT_REGION;
  let contextSetTheme: ((r: RegionTheme) => void) | null = null;
  try {
    const ctx = useRegionalTheme();
    contextTheme = ctx.theme;
    contextSetTheme = ctx.setTheme;
  } catch {
    // outside provider
  }

  const currentRegion = propCurrentRegion || contextTheme;
  const onSelect = propOnSelect || ((r: RegionTheme) => contextSetTheme?.(r));

  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
      setQuery("");
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return ALL_REGIONS;
    return ALL_REGIONS.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.capital.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
    );
  }, [query]);

  const states = filtered.filter((r) => r.type === "state");
  const uts = filtered.filter((r) => r.type === "ut");

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ animation: "fadeIn 200ms ease" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        ref={overlayRef}
        role="dialog"
        aria-modal="true"
        aria-label="Select your region"
        className="relative z-10 w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: "#FFF4EC",
          border: "2px solid #EBAF91",
          animation: "slideUp 250ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "#F8DCCB", backgroundColor: "#F8DCCB" }}
        >
          <div>
            <h2
              className="text-xl font-bold"
              style={{ color: "#49352E" }}
            >
              Choose Your Region
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "#C47C60" }}>
              Select a state or union territory to personalise DocSaathi
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close region selector"
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:bg-black/10"
            style={{ color: "#49352E" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M2 2l14 14M16 2L2 16"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3" style={{ backgroundColor: "#FFF4EC" }}>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "#C47C60" }}
              viewBox="0 0 20 20"
              fill="none"
            >
              <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search states or capitals…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-shadow"
              style={{
                backgroundColor: "#FFF4EC",
                border: "1.5px solid #EBAF91",
                color: "#49352E",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.boxShadow = "0 0 0 3px #EBAF9166")
              }
              onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
            />
          </div>
        </div>

        {/* Scrollable region list */}
        <div className="overflow-y-auto flex-1 px-6 pb-6">
          {filtered.length === 0 && (
            <p className="text-center py-12 text-sm" style={{ color: "#C47C60" }}>
              No regions found for &ldquo;{query}&rdquo;
            </p>
          )}

          {states.length > 0 && (
            <Section
              title="States"
              regions={states}
              currentId={currentRegion.id}
              onSelect={onSelect}
              onClose={onClose}
            />
          )}
          {uts.length > 0 && (
            <Section
              title="Union Territories"
              regions={uts}
              currentId={currentRegion.id}
              onSelect={onSelect}
              onClose={onClose}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </div>
  );
}

// ─── Section sub-component ───────────────────────────────────────────────────

interface SectionProps {
  title: string;
  regions: RegionTheme[];
  currentId: string;
  onSelect: (r: RegionTheme) => void;
  onClose: () => void;
}

function Section({ title, regions, currentId, onSelect, onClose }: SectionProps) {
  return (
    <div className="mt-5">
      <h3
        className="text-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: "#C47C60" }}
      >
        {title} ({regions.length})
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {regions.map((region) => (
          <RegionCard
            key={region.id}
            region={region}
            isSelected={region.id === currentId}
            onSelect={() => {
              onSelect(region);
              onClose();
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Region card ──────────────────────────────────────────────────────────────

interface RegionCardProps {
  region: RegionTheme;
  isSelected: boolean;
  onSelect: () => void;
}

function RegionCard({ region, isSelected, onSelect }: RegionCardProps) {
  return (
    <button
      onClick={onSelect}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
      style={{
        backgroundColor: isSelected ? "#F8DCCB" : "#FFF4EC",
        border: isSelected ? "2px solid #C47C60" : "1.5px solid #EBAF91",
        boxShadow: isSelected ? "0 2px 8px #C47C6033" : "none",
        outline: "none",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.backgroundColor = "#F8DCCB88";
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.backgroundColor = "#FFF4EC";
      }}
      aria-pressed={isSelected}
      aria-label={`Select ${region.name}`}
    >
      <span className="text-2xl leading-none flex-shrink-0">{region.emoji}</span>
      <div className="min-w-0">
        <p
          className="text-sm font-semibold truncate"
          style={{ color: "#49352E" }}
        >
          {region.name}
        </p>
        <p
          className="text-xs truncate"
          style={{ color: "#C47C60" }}
        >
          {region.capital}
        </p>
      </div>
      {isSelected && (
        <svg
          className="ml-auto flex-shrink-0 w-4 h-4"
          style={{ color: "#C47C60" }}
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M3 8l3.5 3.5L13 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
