"use client";

import { useEffect, useState } from "react";
import { FoodItem, LogEntry, MealType } from "@/types";
import { api, ApiError } from "@/lib/api";

interface AddFoodModalProps {
  mealType: MealType;
  logDate: string;
  onClose: () => void;
  onAdded: (entry: LogEntry) => void;
}

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export function AddFoodModal({ mealType, logDate, onClose, onAdded }: AddFoodModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await api.get<FoodItem[]>(`/api/food-items?q=${encodeURIComponent(query)}`));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  async function handleAddEntry() {
    if (!selected) return;
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      setError("Enter a valid quantity");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const entry = await api.post<LogEntry>("/api/log-entries", {
        foodItemId: selected.id,
        logDate,
        mealType,
        quantity: qty,
      });
      onAdded(entry);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add food");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">
            Add to {MEAL_LABELS[mealType]}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {!selected && !showCustomForm && (
          <>
            <input
              autoFocus
              type="text"
              placeholder="Search for a food, e.g. samosa"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mt-4 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />

            <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
              {loading && <p className="py-4 text-center text-sm text-neutral-400">Searching...</p>}
              {!loading && results.length === 0 && (
                <p className="py-4 text-center text-sm text-neutral-400">
                  {query ? "No matches found" : "Start typing to search"}
                </p>
              )}
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-neutral-50"
                >
                  <span>
                    <span className="font-medium text-neutral-900">{item.name}</span>
                    <span className="ml-1 text-neutral-400">
                      ({item.servingSize} {item.servingUnit})
                    </span>
                  </span>
                  <span className="text-neutral-500">{Math.round(item.caloriesPerServing)} kcal</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCustomForm(true)}
              className="mt-4 w-full rounded-lg border border-dashed border-neutral-300 py-2 text-sm font-medium text-neutral-600 hover:border-emerald-500 hover:text-emerald-600"
            >
              Can&apos;t find it? Add a custom food
            </button>
          </>
        )}

        {selected && (
          <div className="mt-4">
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="font-medium text-neutral-900">{selected.name}</p>
              <p className="text-sm text-neutral-500">
                {selected.servingSize} {selected.servingUnit} · {Math.round(selected.caloriesPerServing)} kcal ·{" "}
                P{Math.round(selected.proteinG)}g C{Math.round(selected.carbsG)}g F{Math.round(selected.fatG)}g
              </p>
            </div>

            <label className="mt-4 block text-sm font-medium text-neutral-700">
              Quantity (in servings of {selected.servingSize} {selected.servingUnit})
            </label>
            <input
              type="number"
              step="0.25"
              min="0.25"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />

            {quantity && !isNaN(parseFloat(quantity)) && (
              <p className="mt-2 text-sm text-neutral-500">
                = {Math.round(selected.caloriesPerServing * parseFloat(quantity))} kcal
              </p>
            )}

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setSelected(null)}
                className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Back
              </button>
              <button
                onClick={handleAddEntry}
                disabled={submitting}
                className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        )}

        {showCustomForm && (
          <CustomFoodForm
            initialName={query}
            onCancel={() => setShowCustomForm(false)}
            onCreated={(item) => {
              setShowCustomForm(false);
              setSelected(item);
            }}
          />
        )}
      </div>
    </div>
  );
}

function CustomFoodForm({
  initialName,
  onCancel,
  onCreated,
}: {
  initialName: string;
  onCancel: () => void;
  onCreated: (item: FoodItem) => void;
}) {
  const [name, setName] = useState(initialName);
  const [servingSize, setServingSize] = useState("1");
  const [servingUnit, setServingUnit] = useState("serving");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    const payload = {
      name,
      servingSize: parseFloat(servingSize),
      servingUnit,
      caloriesPerServing: parseFloat(calories) || 0,
      proteinG: parseFloat(protein) || 0,
      carbsG: parseFloat(carbs) || 0,
      fatG: parseFloat(fat) || 0,
    };
    if (!payload.name || !payload.servingSize) {
      setError("Name and serving size are required");
      return;
    }

    setSubmitting(true);
    try {
      const item = await api.post<FoodItem>("/api/food-items", payload);
      onCreated(item);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create food");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-neutral-700">Food name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Serving size</label>
          <input
            type="number"
            value={servingSize}
            onChange={(e) => setServingSize(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Unit</label>
          <input
            type="text"
            value={servingUnit}
            onChange={(e) => setServingUnit(e.target.value)}
            placeholder="g, piece, cup..."
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">Calories per serving</label>
        <input
          type="number"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Protein (g)</label>
          <input
            type="number"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Carbs (g)</label>
          <input
            type="number"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Fat (g)</label>
          <input
            type="number"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Save food"}
        </button>
      </div>
    </div>
  );
}
