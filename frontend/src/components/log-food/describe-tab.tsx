"use client";

import { useState } from "react";
import { DetectedFoodItem, LogEntry, MealType } from "@/types";
import { api, ApiError } from "@/lib/api";
import { AiReviewList } from "./ai-review-list";

const EXAMPLES = ["2 rotis with dal and a bowl of curd", "Grande latte and a blueberry muffin", "150g grilled chicken with rice and broccoli"];

export function DescribeTab({
  mealType,
  logDate,
  onSaved,
}: {
  mealType: MealType;
  logDate: string;
  onSaved: (entries: LogEntry[]) => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<DetectedFoodItem[] | null>(null);
  const [source, setSource] = useState<"tavily" | "serpapi" | null>(null);

  async function handleAnalyze() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ items: DetectedFoodItem[]; source: "tavily" | "serpapi" }>(
        "/api/ai/analyze-text",
        { description: text.trim() }
      );
      setItems(res.items);
      setSource(res.source);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't parse that description");
    } finally {
      setLoading(false);
    }
  }

  if (items) {
    return (
      <>
        {source && (
          <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Estimated via web search ({source === "tavily" ? "Tavily" : "SerpApi"}) — this may be less precise than a direct estimate. Feel free to edit the numbers below.
          </p>
        )}
        <AiReviewList
          items={items}
          mealType={mealType}
          logDate={logDate}
          onSaved={onSaved}
          onDiscard={() => setItems(null)}
        />
      </>
    );
  }

  return (
    <div className="mt-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Describe what you ate, e.g. 2 eggs and toast with butter"
        rows={4}
        className="w-full resize-none rounded-2xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
      />

      <div className="mt-2 flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => setText(ex)}
            className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-500 hover:bg-neutral-200"
          >
            {ex}
          </button>
        ))}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <button
        onClick={handleAnalyze}
        disabled={loading || !text.trim()}
        className="btn-glow mt-4 w-full rounded-full bg-gradient-to-r from-lime-400 to-emerald-500 py-2.5 text-sm font-semibold text-black hover:brightness-105 disabled:opacity-60"
      >
        {loading ? "Searching for nutrition info..." : "🔍 Estimate calories"}
      </button>
      <p className="mt-2 text-center text-xs text-neutral-400">
        Uses web search (Tavily/SerpApi), not Gemini — Gemini is reserved for photo scans.
      </p>
    </div>
  );
}
