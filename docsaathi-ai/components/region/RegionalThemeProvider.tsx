"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { RegionTheme } from "@/types/region";
import { DEFAULT_REGION, ALL_REGIONS, getRegionTheme } from "@/data/regionThemes";

interface RegionalThemeContextValue {
  theme: RegionTheme;
  setTheme: (newTheme: RegionTheme) => void;
  selectRegionById: (id: string) => void;
  isTransitioning: boolean;
  availableRegions: RegionTheme[];
}

const RegionalThemeContext = createContext<RegionalThemeContextValue | null>(null);

const STORAGE_KEY = "docsaathi_selected_region";

export function RegionalThemeProvider({
  children,
  initialRegion,
}: {
  children: React.ReactNode;
  initialRegion?: RegionTheme;
}) {
  const [theme, setCurrentTheme] = useState<RegionTheme>(() => {
    if (initialRegion) return initialRegion;
    if (typeof window !== "undefined") {
      try {
        const savedId = localStorage.getItem(STORAGE_KEY);
        if (savedId) {
          const found = getRegionTheme(savedId);
          if (found) return found;
        }
      } catch {
        // LocalStorage access restricted or unavailable
      }
    }
    return DEFAULT_REGION;
  });

  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  // Sync with localStorage on client mount if rendered via SSR
  useEffect(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId) {
        const found = getRegionTheme(savedId);
        if (found && found.id !== theme.id) {
          setCurrentTheme(found);
        }
      }
    } catch {
      // LocalStorage access restricted
    }
  }, [theme.id]);

  const setTheme = useCallback((newTheme: RegionTheme) => {
    if (newTheme.id === theme.id) return;

    // Trigger dynamic environment transition
    setIsTransitioning(true);

    // Swap theme halfway through the fade
    setTimeout(() => {
      setCurrentTheme(newTheme);
      try {
        localStorage.setItem(STORAGE_KEY, newTheme.id);
      } catch {
        // Ignore storage write error
      }
    }, 220);

    // Complete transition
    setTimeout(() => {
      setIsTransitioning(false);
    }, 600);
  }, [theme.id]);

  const selectRegionById = useCallback((id: string) => {
    const found = getRegionTheme(id);
    if (found) {
      setTheme(found);
    }
  }, [setTheme]);

  return (
    <RegionalThemeContext.Provider
      value={{
        theme,
        setTheme,
        selectRegionById,
        isTransitioning,
        availableRegions: ALL_REGIONS,
      }}
    >
      {children}
    </RegionalThemeContext.Provider>
  );
}

export function useRegionalTheme(): RegionalThemeContextValue {
  const context = useContext(RegionalThemeContext);
  if (!context) {
    throw new Error("useRegionalTheme must be used within a RegionalThemeProvider");
  }
  return context;
}
