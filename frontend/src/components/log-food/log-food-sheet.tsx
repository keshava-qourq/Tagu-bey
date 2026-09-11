"use client";

import { useState } from "react";
import { LogEntry, MealType } from "@/types";
import { PhotoTab } from "./photo-tab";
import { DescribeTab } from "./describe-tab";
import { SearchTab } from "./search-tab";

const MEAL_OPTIONS: { type: MealType; label: string }[] = [
  { type: "breakfast", label: "Breakfast" },
  { type: "lunch", label: "Lunch" },
  { type: "dinner", label: "Dinner" },
  { type: "snack", label: "Snack" },
];

const TABS = [
  { key: "photo", label: "Photo", icon: "📷" },
  { key: "describe", label: "Describe", icon: "📝" },
  { key: "search", label: "Search", icon: "🔍" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function LogFoodSheet({
  logDate,
  defaultMeal = "breakfast",
  onClose,
  onAdded,
}: {
  logDate: string;
  defaultMeal?: MealType;
  onClose: () => void;
  onAdded: (entries: LogEntry[]) => void;
}) {
  const [mealType, setMealType] = useState<MealType>(defaultMeal);
  const [tab, setTab] = useState<TabKey>("photo");

  function handleSaved(entries: LogEntry[]) {
    onAdded(entries);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="animate-slide-up flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-[32px] bg-white shadow-2xl sm:rounded-[32px]">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold tracking-tight text-neutral-900">Log food</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <div className="mt-4 flex gap-2 overflow-x-auto">
            {MEAL_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                onClick={() => setMealType(opt.type)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                  mealType === opt.type
                    ? "bg-gradient-to-r from-lime-400 to-emerald-500 text-black"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-2xl bg-neutral-100 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium transition ${
                  tab === t.key ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
                }`}
              >
                <span>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {tab === "photo" && <PhotoTab mealType={mealType} logDate={logDate} onSaved={handleSaved} />}
          {tab === "describe" && <DescribeTab mealType={mealType} logDate={logDate} onSaved={handleSaved} />}
          {tab === "search" && <SearchTab mealType={mealType} logDate={logDate} onSaved={handleSaved} />}
        </div>
      </div>
    </div>
  );
}
