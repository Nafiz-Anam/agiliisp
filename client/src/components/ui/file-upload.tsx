"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(/\/v1$/, "");

interface FileUploadProps {
  /** Current file URL (if already uploaded) */
  value?: string | null;
  /** Accepted file types, e.g. "image/*,.pdf" */
  accept?: string;
  /** Max file size in MB */
  maxSizeMB?: number;
  /** Label shown in the drop zone */
  label?: string;
  /** Called when a file is selected (parent handles the actual upload) */
  onFileSelect?: (file: File) => void;
  /** Called when remove is clicked */
  onRemove?: () => void;
  /** Disable interaction */
  disabled?: boolean;
  /** Show compact variant */
  compact?: boolean;
}

function getFullUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url}`;
}

function isPdf(url: string): boolean {
  return url.toLowerCase().endsWith(".pdf");
}

function isImage(url: string): boolean {
  return /\.(jpe?g|png|gif|webp)$/i.test(url);
}

export function FileUpload({
  value,
  accept = "image/*,.pdf",
  maxSizeMB = 10,
  label = "Drop file here or click to upload",
  onFileSelect,
  onRemove,
  disabled = false,
  compact = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File too large. Max ${maxSizeMB}MB.`);
        return;
      }
      onFileSelect?.(file);
    },
    [maxSizeMB, onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  // If there's a current value, show preview
  if (value) {
    const fullUrl = getFullUrl(value);
    return (
      <div className={cn("relative group border border-slate-200 rounded-lg overflow-hidden", compact ? "h-24" : "h-36")}>
        {isImage(value) ? (
          <img
            src={fullUrl}
            alt="Uploaded file"
            className="w-full h-full object-cover"
          />
        ) : isPdf(value) ? (
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center h-full gap-2 text-slate-500 hover:text-blue-600 transition-colors"
          >
            <FileText className="h-8 w-8" />
            <span className="text-xs font-medium">View PDF</span>
          </a>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
            <FileText className="h-8 w-8" />
            <span className="text-xs">File uploaded</span>
          </div>
        )}
        {onRemove && !disabled && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  // Empty drop zone
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer",
          compact ? "h-24 px-3" : "h-36 px-4",
          dragOver
            ? "border-blue-400 bg-blue-50"
            : "border-slate-200 hover:border-slate-300 bg-slate-50/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Upload className={cn("text-slate-400", compact ? "h-5 w-5" : "h-6 w-6")} />
        <span className={cn("text-slate-500 text-center", compact ? "text-[11px]" : "text-xs")}>
          {label}
        </span>
        <span className="text-[10px] text-slate-400">
          Max {maxSizeMB}MB
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ─── Helper: Upload a file via API (uses Axios for token refresh support) ──

import api from "@/lib/api";

export async function uploadFileToApi({
  file,
  url,
  fieldName,
  onProgress,
}: {
  file: File;
  url: string;
  fieldName: string;
  onProgress?: (percent: number) => void;
}): Promise<any> {
  const formData = new FormData();
  formData.append(fieldName, file);

  const { data } = await api.post(url, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress
      ? (e) => { if (e.total) onProgress(Math.round((e.loaded / e.total) * 100)); }
      : undefined,
  });
  return data;
}

// ─── Helper: Upload multiple files in a single request ───────

export async function uploadMultipleFiles({
  files,
  url,
  onProgress,
}: {
  files: Record<string, File>;
  url: string;
  onProgress?: (percent: number) => void;
}): Promise<any> {
  const formData = new FormData();
  for (const [fieldName, file] of Object.entries(files)) {
    formData.append(fieldName, file);
  }

  const { data } = await api.post(url, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress
      ? (e) => { if (e.total) onProgress(Math.round((e.loaded / e.total) * 100)); }
      : undefined,
  });
  return data;
}
