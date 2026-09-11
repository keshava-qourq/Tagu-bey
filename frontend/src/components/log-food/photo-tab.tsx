"use client";

import { useRef, useState } from "react";
import { DetectedFoodItem, LogEntry, MealType } from "@/types";
import { api, ApiError } from "@/lib/api";
import { resizeImageToBase64 } from "@/lib/image";
import { AiReviewList } from "./ai-review-list";

export function PhotoTab({
  mealType,
  logDate,
  onSaved,
}: {
  mealType: MealType;
  logDate: string;
  onSaved: (entries: LogEntry[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<DetectedFoodItem[] | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setItems(null);
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    try {
      const { base64, mimeType } = await resizeImageToBase64(file);
      const res = await api.post<{ items: DetectedFoodItem[] }>("/api/ai/analyze-photo", {
        imageBase64: base64,
        mimeType,
      });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't analyze that photo");
    } finally {
      setLoading(false);
    }
  }

  if (items) {
    return (
      <AiReviewList
        items={items}
        mealType={mealType}
        logDate={logDate}
        onSaved={onSaved}
        onDiscard={() => {
          setItems(null);
          setPreview(null);
        }}
      />
    );
  }

  return (
    <div className="mt-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {preview ? (
        <div className="relative overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Selected food" className="h-56 w-full object-cover" />
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 text-white">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              <p className="text-sm">Analyzing with Gemini...</p>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex h-56 w-full flex-col items-center justify-center gap-3 rounded-[28px] border-2 border-dashed border-neutral-300 text-neutral-500 transition hover:border-lime-500 hover:text-lime-700 hover:bg-lime-50/50"
        >
          <CameraIcon />
          <span className="text-sm font-medium">Take or upload a food photo</span>
          <span className="text-xs text-neutral-400">Gemini will estimate calories &amp; macros</span>
        </button>
      )}

      {!preview && (
        <p className="mt-2 text-center text-xs text-neutral-400">
          Limited to 20 photo scans per day on the free Gemini tier — Describe and Search don&apos;t use Gemini, so they&apos;re unaffected.
        </p>
      )}

      {error && (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => inputRef.current?.click()}
            className="text-sm font-medium text-lime-700 hover:underline"
          >
            Try another photo
          </button>
        </div>
      )}

      {preview && !loading && !items && !error && (
        <button
          onClick={() => inputRef.current?.click()}
          className="mt-3 w-full rounded-lg border border-neutral-300 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
        >
          Choose a different photo
        </button>
      )}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path
        d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h7l1 1.5H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
