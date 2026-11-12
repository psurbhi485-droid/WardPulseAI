"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { SpeechState } from "@/types";

interface UseSpeechSynthesisOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
}

export function useSpeechSynthesis({
  lang = "en-IN",
  rate = 1,
  pitch = 1,
}: UseSpeechSynthesisOptions = {}) {
  const [speechState, setSpeechState] = useState<SpeechState>("idle");
  const [isSupported, setIsSupported] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentRate, setCurrentRate] = useState(rate);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const textRef = useRef<string>("");

  useEffect(() => {
    setIsSupported("speechSynthesis" in window);

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const findBestVoice = useCallback(
    (targetLang: string): SpeechSynthesisVoice | null => {
      const voices = window.speechSynthesis.getVoices();
      // Try exact match first
      let voice = voices.find((v) => v.lang === targetLang);
      // Try language prefix (e.g., "hi" matches "hi-IN")
      if (!voice) {
        const prefix = targetLang.split("-")[0];
        voice = voices.find((v) => v.lang.startsWith(prefix));
      }
      // Fall back to English
      if (!voice) {
        voice = voices.find((v) => v.lang.startsWith("en"));
      }
      return voice ?? null;
    },
    []
  );

  const speak = useCallback(
    (text: string, speakLang?: string) => {
      if (!("speechSynthesis" in window)) {
        setSpeechState("error");
        return;
      }

      window.speechSynthesis.cancel();
      setSpeechState("loading");
      textRef.current = text;

      const utterance = new SpeechSynthesisUtterance(text);
      const targetLang = speakLang ?? lang;
      const voice = findBestVoice(targetLang);

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = targetLang;
      }

      utterance.rate = currentRate;
      utterance.pitch = pitch;

      utterance.onstart = () => setSpeechState("playing");
      utterance.onend = () => setSpeechState("idle");
      utterance.onerror = (e) => {
        if (e.error !== "interrupted") {
          setSpeechState("error");
        }
      };
      utterance.onpause = () => setSpeechState("paused");
      utterance.onresume = () => setSpeechState("playing");

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [lang, currentRate, pitch, findBestVoice]
  );

  const pause = useCallback(() => {
    window.speechSynthesis?.pause();
    setSpeechState("paused");
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis?.resume();
    setSpeechState("playing");
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeechState("idle");
  }, []);

  const replay = useCallback(
    (speakLang?: string) => {
      if (textRef.current) {
        speak(textRef.current, speakLang);
      }
    },
    [speak]
  );

  return {
    speechState,
    isSupported,
    availableVoices,
    currentRate,
    setCurrentRate,
    speak,
    pause,
    resume,
    stop,
    replay,
  };
}
