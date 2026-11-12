"use client";

import React, { useCallback, useRef, useState } from "react";
import { Upload, Camera, FileText, Image as ImageIcon, X, AlertCircle } from "lucide-react";

interface FileUploadZoneProps {
  onFileSelected: (file: File) => void;
  isLoading?: boolean;
  className?: string;
}

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
const MAX_SIZE_MB = 10;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadZone({
  onFileSelected,
  isLoading = false,
  className = "",
}: FileUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `Unsupported file type: ${file.type || "unknown"}. Please upload a PDF, JPG, JPEG or PNG.`;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File is too large (${formatFileSize(file.size)}). Maximum size is ${MAX_SIZE_MB} MB.`;
    }
    return null;
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      const error = validateFile(file);
      if (error) {
        setValidationError(error);
        return;
      }
      setValidationError(null);
      onFileSelected(file);
    },
    [validateFile, onFileSelected]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = ""; // reset input
    },
    [handleFile]
  );

  return (
    <div className={className}>
      {/* Main drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload document – click or drag and drop"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
        className={`
          relative rounded-2xl border-2 border-dashed cursor-pointer
          transition-all duration-300 p-8 text-center
          flex flex-col items-center justify-center gap-4 min-h-[220px]
          ${isLoading ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.01]"}
        `}
        style={{
          borderColor: isDragging ? "#C47C60" : "#EBAF91",
          backgroundColor: isDragging
            ? "rgba(196,124,96,0.08)"
            : "#FEFAF7",
          transition: "border-color 0.2s, background-color 0.2s, transform 0.2s",
        }}
      >
        {/* Upload icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md animate-float"
          style={{ background: "linear-gradient(135deg, #EBAF91, #C47C60)" }}
        >
          <Upload className="w-8 h-8 text-white" />
        </div>

        <div>
          <p className="font-semibold text-lg mb-1" style={{ color: "#49352E" }}>
            {isDragging ? "Drop your document here" : "Upload your document"}
          </p>
          <p className="text-sm" style={{ color: "#8b6358" }}>
            Drag & drop or{" "}
            <span className="underline font-medium" style={{ color: "#C47C60" }}>
              click to browse
            </span>
          </p>
          <p className="text-xs mt-1 opacity-70" style={{ color: "#8b6358" }}>
            PDF, JPG, JPEG, PNG · Max {MAX_SIZE_MB} MB
          </p>
        </div>

        {/* File type icons */}
        <div className="flex gap-3">
          {[
            { icon: FileText, label: "PDF" },
            { icon: ImageIcon, label: "JPG" },
            { icon: ImageIcon, label: "PNG" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium"
              style={{ background: "#F8DCCB", color: "#C47C60" }}
            >
              <Icon className="w-4 h-4" />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Camera capture button */}
      <button
        onClick={() => cameraInputRef.current?.click()}
        disabled={isLoading}
        className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all duration-200 hover:scale-[1.01] active:scale-95 disabled:opacity-50"
        style={{
          background: "#F8DCCB",
          color: "#C47C60",
          border: "1.5px solid #EBAF91",
        }}
        aria-label="Capture document with camera"
      >
        <Camera className="w-4 h-4" />
        Capture with Camera
      </button>

      {/* Validation error */}
      {validationError && (
        <div
          className="mt-3 flex items-start gap-2 rounded-xl px-4 py-3 text-sm animate-fade-in"
          style={{ background: "#fde8e8", border: "1.5px solid #e07a7a", color: "#7a1e1e" }}
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{validationError}</span>
          <button
            onClick={() => setValidationError(null)}
            className="ml-auto"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={ACCEPTED_EXTENSIONS.join(",")}
        onChange={onFileChange}
        aria-hidden="true"
      />
      <input
        ref={cameraInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={onFileChange}
        aria-hidden="true"
      />
    </div>
  );
}
