"use client";

import { useState } from "react";
import { DetectedFoodItem, FoodItem, LogEntry, MealType } from "@/types";
import { api, ApiError } from "@/lib/api";

interface EditableItem extends DetectedFoodItem {
  key: string;
}

export function AiReviewList({
  items,
  mealType,
  logDate,
  onSaved,
  onDiscard,
}: {
  items: DetectedFoodItem[];
  mealType: MealType;
  logDate: string;
  onSaved: (entries: LogEntry[]) => void;
  onDiscard: () => void;
}) {
  const [editable, setEditable] = useState<EditableItem[]>(
    items.map((item, i) => ({ ...item, key: `${i}-${item.name}` }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: string, patch: Partial<EditableItem>) {
    setEditable((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function remove(key: string) {
    setEditable((prev) => prev.filter((it) => it.key !== key));
  }

  const totalCalories = editable.reduce((sum, it) => sum + (Number(it.calories) || 0), 0);

  async function handleSave() {
    if (editable.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const entries: LogEntry[] = [];
      for (const item of editable) {
        const foodItem = await api.post<{ id: string }>("/api/food-items", {
          name: item.name,
          servingSize: Number(item.servingSize) || 1,
          servingUnit: item.servingUnit || "serving",
          caloriesPerServing: (Number(item.calories) || 0) / (Number(item.quantity) || 1),
          proteinG: (Number(item.proteinG) || 0) / (Number(item.quantity) || 1),
          carbsG: (Number(item.carbsG) || 0) / (Number(item.quantity) || 1),
          fatG: (Number(item.fatG) || 0) / (Number(item.quantity) || 1),
          source: "ai",
        });
        const entry = await api.post<LogEntry>("/api/log-entries", {
          foodItemId: foodItem.id,
          logDate,
          mealType,
          quantity: Number(item.quantity) || 1,
        });
        entries.push(entry);
      }
      onSaved(entries);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save items");
    } finally {
      setSaving(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mt-6 text-center">
        <p className="text-sm text-neutral-500">
          Couldn&apos;t identify any food. Try a clearer photo or a different description.
        </p>
        <button
          onClick={onDiscard}
          className="mt-4 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 animate-fade-in">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        Review &amp; edit before saving
      </p>

      <div className="mt-3 space-y-3">
        {editable.map((item) => (
          <ReviewItemCard
            key={item.key}
            item={item}
            onChange={(patch) => update(item.key, patch)}
            onRemove={() => remove(item.key)}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl bg-lime-50 px-3.5 py-2.5 text-sm">
        <span className="text-lime-800">Total</span>
        <span className="font-semibold text-lime-800">{Math.round(totalCalories)} kcal</span>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-3">
        <button
          onClick={onDiscard}
          className="flex-1 rounded-full border border-neutral-300 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Back
        </button>
        <button
          onClick={handleSave}
          disabled={saving || editable.length === 0}
          className="btn-glow flex-1 rounded-full bg-gradient-to-r from-lime-400 to-emerald-500 py-2 text-sm font-semibold text-black hover:brightness-105 disabled:opacity-60"
        >
          {saving ? "Saving..." : `Save ${editable.length} item${editable.length === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}

function ReviewItemCard({
  item,
  onChange,
  onRemove,
}: {
  item: EditableItem;
  onChange: (patch: Partial<EditableItem>) => void;
  onRemove: () => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleSearch() {
    setActionError(null);
    if (!searchOpen) {
      setSearchOpen(true);
      setSearching(true);
      try {
        const results = await api.get<FoodItem[]>(`/api/food-items?q=${encodeURIComponent(item.name)}`);
        setSearchResults(results);
      } catch {
        setActionError("Search failed");
      } finally {
        setSearching(false);
      }
      return;
    }
    setSearchOpen(false);
  }

  function applySearchResult(food: FoodItem) {
    onChange({
      name: food.name,
      servingSize: food.servingSize,
      servingUnit: food.servingUnit,
      quantity: 1,
      calories: food.caloriesPerServing,
      proteinG: food.proteinG,
      carbsG: food.carbsG,
      fatG: food.fatG,
    });
    setSearchOpen(false);
  }

  async function handleReanalyze() {
    setActionError(null);
    setReanalyzing(true);
    try {
      const res = await api.post<{ items: DetectedFoodItem[]; source: "tavily" | "serpapi" }>(
        "/api/ai/analyze-text",
        { description: item.name }
      );
      const match = res.items[0];
      if (!match) {
        setActionError("Couldn't estimate that");
        return;
      }
      onChange(match);
      setActionError(`Estimated via web search (${res.source === "tavily" ? "Tavily" : "SerpApi"}) — double-check these numbers.`);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Re-estimate failed");
    } finally {
      setReanalyzing(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-3">
      <div className="flex items-start justify-between gap-1.5">
        <input
          value={item.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-neutral-900 focus:border-neutral-300 focus:bg-white focus:outline-none"
        />
        <button
          onClick={handleSearch}
          aria-label="Search database for this name"
          title="Search database for this name"
          className="shrink-0 rounded-full p-1 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700"
        >
          🔍
        </button>
        <button
          onClick={handleReanalyze}
          disabled={reanalyzing}
          aria-label="Re-estimate via web search"
          title="Re-estimate via web search (Tavily/SerpApi)"
          className="shrink-0 rounded-full p-1 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 disabled:opacity-50"
        >
          {reanalyzing ? (
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
          ) : (
            "✨"
          )}
        </button>
        <button
          onClick={onRemove}
          aria-label="Remove item"
          className="shrink-0 rounded-full p-1 text-neutral-300 hover:text-red-500"
        >
          ✕
        </button>
      </div>

      {searchOpen && (
        <div className="mt-1.5 max-h-40 overflow-y-auto rounded-lg border border-neutral-200 bg-white">
          {searching && <p className="p-2 text-center text-xs text-neutral-400">Searching...</p>}
          {!searching && searchResults.length === 0 && (
            <p className="p-2 text-center text-xs text-neutral-400">No matches in your food database</p>
          )}
          {!searching &&
            searchResults.map((food) => (
              <button
                key={food.id}
                onClick={() => applySearchResult(food)}
                className="flex w-full items-center justify-between px-2.5 py-1.5 text-left text-xs hover:bg-neutral-50"
              >
                <span className="text-neutral-800">
                  {food.name}{" "}
                  <span className="text-neutral-400">
                    ({food.servingSize} {food.servingUnit})
                  </span>
                </span>
                <span className="text-neutral-500">{Math.round(food.caloriesPerServing)} kcal</span>
              </button>
            ))}
        </div>
      )}

      {actionError && <p className="mt-1 text-xs text-red-600">{actionError}</p>}

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-neutral-500">
        <label className="flex items-center gap-1">
          Qty
          <input
            type="number"
            step="0.25"
            min="0.1"
            value={item.quantity}
            onChange={(e) => onChange({ quantity: Number(e.target.value) })}
            className="w-16 rounded border border-neutral-200 bg-white px-1.5 py-1 text-neutral-800"
          />
        </label>
        <label className="flex items-center gap-1">
          Serving
          <input
            type="text"
            value={`${item.servingSize} ${item.servingUnit}`}
            onChange={(e) => {
              const [size, ...rest] = e.target.value.split(" ");
              onChange({
                servingSize: Number(size) || item.servingSize,
                servingUnit: rest.join(" ") || item.servingUnit,
              });
            }}
            className="w-24 rounded border border-neutral-200 bg-white px-1.5 py-1 text-neutral-800"
          />
        </label>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs">
        <MacroInput label="kcal" value={item.calories} onChange={(v) => onChange({ calories: v })} />
        <MacroInput label="P" value={item.proteinG} onChange={(v) => onChange({ proteinG: v })} />
        <MacroInput label="C" value={item.carbsG} onChange={(v) => onChange({ carbsG: v })} />
        <MacroInput label="F" value={item.fatG} onChange={(v) => onChange({ fatG: v })} />
      </div>
    </div>
  );
}

function MacroInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded border border-neutral-200 bg-white px-1 py-1 text-center text-neutral-800"
      />
      <p className="mt-0.5 text-neutral-400">{label}</p>
    </div>
  );
}
