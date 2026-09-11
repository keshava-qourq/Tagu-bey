"use client";

import { useEffect, useMemo, useState } from "react";
import { Goals, LogEntry, MealType } from "@/types";
import { api } from "@/lib/api";
import { LogFoodSheet } from "@/components/log-food/log-food-sheet";

const MEALS: { type: MealType; label: string; emoji: string }[] = [
  { type: "breakfast", label: "Breakfast", emoji: "🌅" },
  { type: "lunch", label: "Lunch", emoji: "☀️" },
  { type: "dinner", label: "Dinner", emoji: "🌙" },
  { type: "snack", label: "Snacks", emoji: "🍎" },
];

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export function DayDetailSheet({
  date,
  goals,
  onClose,
}: {
  date: string;
  goals: Goals | null;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<LogEntry[] | null>(null);
  const [showLogSheet, setShowLogSheet] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get<LogEntry[]>(`/api/log-entries?date=${date}`).then((data) => {
      if (!cancelled) setEntries(data);
    });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const totals = useMemo(() => {
    return (entries ?? []).reduce(
      (acc, e) => ({
        calories: acc.calories + e.calories,
        protein: acc.protein + e.proteinG,
        carbs: acc.carbs + e.carbsG,
        fat: acc.fat + e.fatG,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [entries]);

  async function handleDelete(id: string) {
    setEntries((prev) => (prev ? prev.filter((e) => e.id !== id) : prev));
    await api.delete(`/api/log-entries/${id}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="animate-slide-up flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-[32px] bg-white shadow-2xl sm:rounded-[32px]">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold tracking-tight text-neutral-900">{formatFullDate(date)}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {entries === null ? (
            <p className="py-10 text-center text-sm text-neutral-400">Loading...</p>
          ) : (
            <>
              <div className="panel-dark mt-4 rounded-[28px] p-5 shadow-lg shadow-black/10">
                <p className="text-2xl font-extrabold text-white">
                  {Math.round(totals.calories)}
                  <span className="ml-1.5 text-sm font-medium text-white/40">
                    of {goals ? Math.round(goals.dailyCalorieGoal) : "—"} kcal
                  </span>
                </p>
                {goals && (
                  <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <div className="flex justify-between text-white/50">
                        <span>Protein</span>
                        <span className="text-white/70">
                          {Math.round(totals.protein)}/{Math.round(goals.proteinGoalG)}g
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (totals.protein / (goals.proteinGoalG || 1)) * 100)}%`,
                            backgroundColor: "var(--macro-protein)",
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-white/50">
                        <span>Carbs</span>
                        <span className="text-white/70">
                          {Math.round(totals.carbs)}/{Math.round(goals.carbsGoalG)}g
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (totals.carbs / (goals.carbsGoalG || 1)) * 100)}%`,
                            backgroundColor: "var(--macro-carbs)",
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-white/50">
                        <span>Fat</span>
                        <span className="text-white/70">
                          {Math.round(totals.fat)}/{Math.round(goals.fatGoalG)}g
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (totals.fat / (goals.fatGoalG || 1)) * 100)}%`,
                            backgroundColor: "var(--macro-fat)",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-3">
                {MEALS.map((meal) => {
                  const mealEntries = entries.filter((e) => e.mealType === meal.type);
                  if (mealEntries.length === 0) return null;
                  const mealCalories = mealEntries.reduce((sum, e) => sum + e.calories, 0);

                  return (
                    <div key={meal.type} className="rounded-2xl border border-neutral-200/70 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-2 font-medium text-neutral-900">
                          <span>{meal.emoji}</span> {meal.label}
                        </h3>
                        <span className="text-sm text-neutral-400">{Math.round(mealCalories)} kcal</span>
                      </div>
                      <ul className="mt-2 space-y-1.5">
                        {mealEntries.map((entry) => (
                          <li key={entry.id} className="flex items-center justify-between text-sm">
                            <p className="text-neutral-700">{entry.foodItem.name}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-neutral-500">{Math.round(entry.calories)} kcal</span>
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="text-neutral-300 hover:text-red-500"
                                aria-label="Delete entry"
                              >
                                ✕
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}

                {entries.length === 0 && (
                  <p className="py-6 text-center text-sm text-neutral-400">Nothing logged on this day.</p>
                )}
              </div>

              <button
                onClick={() => setShowLogSheet(true)}
                className="btn-glow mt-5 w-full rounded-full bg-gradient-to-r from-lime-400 to-emerald-500 py-2.5 text-sm font-semibold text-black hover:brightness-105"
              >
                + Log food for this day
              </button>
            </>
          )}
        </div>
      </div>

      {showLogSheet && (
        <LogFoodSheet
          logDate={date}
          onClose={() => setShowLogSheet(false)}
          onAdded={(newEntries) => setEntries((prev) => [...(prev ?? []), ...newEntries])}
        />
      )}
    </div>
  );
}
