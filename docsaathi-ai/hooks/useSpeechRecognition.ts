"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { MicState } from "@/types";

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export function useSpeechRecognition(lang: string = "en-IN") {
  const [micState, setMicState] = useState<MicState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef("");

  useEffect(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setErrorMessage("Speech recognition is not supported in your browser. Please type your question.");
      setMicState("error");
      return;
    }

    // Stop any existing session
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    finalTranscriptRef.current = "";
    setInterimTranscript("");
    setErrorMessage(null);

    recognition.onstart = () => {
      setMicState("listening");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = finalTranscriptRef.current;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }

      finalTranscriptRef.current = final;
      setInterimTranscript(interim);
      setTranscript(final);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let msg = "Speech recognition error.";
      switch (event.error) {
        case "no-speech":
          msg = "No speech detected. Please try again.";
          break;
        case "audio-capture":
          msg = "Microphone not found or access denied.";
          break;
        case "not-allowed":
          msg = "Microphone permission denied. Please allow microphone access.";
          break;
        case "network":
          msg = "Network error during speech recognition.";
          break;
        case "language-not-supported":
          msg = `The selected language is not supported for voice input. Please type your question.`;
          break;
        default:
          msg = `Speech error: ${event.error}`;
      }
      setErrorMessage(msg);
      setMicState("error");
    };

    recognition.onend = () => {
      if (micState === "listening") {
        setMicState("idle");
      }
      setInterimTranscript("");
      // Merge final transcript into displayed transcript
      const full = finalTranscriptRef.current.trim();
      if (full) setTranscript(full);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setErrorMessage("Could not start speech recognition.");
      setMicState("error");
    }
  }, [lang, micState]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setMicState("idle");
    setInterimTranscript("");
  }, []);

  const cancelListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    setMicState("idle");
    setTranscript("");
    setInterimTranscript("");
    finalTranscriptRef.current = "";
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    finalTranscriptRef.current = "";
    setInterimTranscript("");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  return {
    micState,
    transcript,
    interimTranscript,
    errorMessage,
    isSupported,
    startListening,
    stopListening,
    cancelListening,
    clearTranscript,
    setTranscript,
  };
}
