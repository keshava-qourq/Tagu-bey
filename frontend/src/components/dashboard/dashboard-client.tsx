"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Goals, LogEntry, MealType } from "@/types";
import { AddFoodModal } from "@/components/dashboard/add-food-modal";
import { todayDateString } from "@/lib/calculations";
import { api } from "@/lib/api";

const MEALS: { type: MealType; label: string }[] = [
  { type: "breakfast", label: "Breakfast" },
  { type: "lunch", label: "Lunch" },
  { type: "dinner", label: "Dinner" },
  { type: "snack", label: "Snacks" },
];

function formatDateLabel(dateStr: string): string {
  const today = todayDateString();
  if (dateStr === today) return "Today";

  const d = new Date(dateStr + "T00:00:00");
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === todayDateString(yesterday)) return "Yesterday";

  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return todayDateString(d);
}

export function DashboardClient({
  userName,
  goals,
  initialDate,
  initialEntries,
}: {
  userName: string;
  goals: Goals;
  initialDate: string;
  initialEntries: LogEntry[];
}) {
  const router = useRouter();
  const [date, setDate] = useState(initialDate);
  const [entries, setEntries] = useState<LogEntry[]>(initialEntries);
  const [loading, setLoading] = useState(false);
  const [activeMeal, setActiveMeal] = useState<MealType | null>(null);

  useEffect(() => {
    if (date === initialDate) return;
    let cancelled = false;
    setLoading(true);
    api
      .get<LogEntry[]>(`/api/log-entries?date=${date}`)
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const totals = useMemo(() => {
    return entries.reduce(
      (acc, e) => ({
        calories: acc.calories + e.calories,
        protein: acc.protein + e.proteinG,
        carbs: acc.carbs + e.carbsG,
        fat: acc.fat + e.fatG,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [entries]);

  const remaining = Math.round(goals.dailyCalorieGoal - totals.calories);
  const caloriePct = Math.min(100, (totals.calories / (goals.dailyCalorieGoal || 1)) * 100);

  async function handleDelete(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await api.delete(`/api/log-entries/${id}`);
  }

  function handleAdded(entry: LogEntry) {
    setEntries((prev) => [...prev, entry]);
    setActiveMeal(null);
  }

  async function handleSignOut() {
    await api.post("/api/auth/logout");
    router.push("/login");
    router.refresh();
  }

  const isToday = date === todayDateString();

  return (
    <div className="min-h-screen bg-neutral-50 pb-16">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-lg font-semibold text-neutral-900">CalorieTrack</p>
            <p className="text-sm text-neutral-500">Hi, {userName}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm font-medium text-neutral-500 hover:text-neutral-800"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {/* Date navigation */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => setDate((d) => shiftDate(d, -1))}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
            aria-label="Previous day"
          >
            ←
          </button>
          <div className="text-center">
            <p className="font-medium text-neutral-900">{formatDateLabel(date)}</p>
            {!isToday && (
              <button
                onClick={() => setDate(todayDateString())}
                className="text-xs font-medium text-emerald-600 hover:underline"
              >
                Jump to today
              </button>
            )}
          </div>
          <button
            onClick={() => setDate((d) => shiftDate(d, 1))}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
            aria-label="Next day"
            disabled={isToday}
          >
            →
          </button>
        </div>

        {/* Calorie summary */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-3xl font-bold text-neutral-900">{Math.round(totals.calories)}</p>
              <p className="text-sm text-neutral-500">of {Math.round(goals.dailyCalorieGoal)} kcal</p>
            </div>
            <div className="text-right">
              <p
                className={`text-xl font-semibold ${remaining < 0 ? "text-red-600" : "text-emerald-600"}`}
              >
                {remaining < 0 ? `+${Math.abs(remaining)}` : remaining}
              </p>
              <p className="text-sm text-neutral-500">{remaining < 0 ? "over" : "remaining"}</p>
            </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className={`h-full rounded-full transition-all ${totals.calories > goals.dailyCalorieGoal ? "bg-red-500" : "bg-emerald-500"}`}
              style={{ width: `${caloriePct}%` }}
            />
          </div>

          {/* Macros */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            <MacroBar label="Protein" consumed={totals.protein} goal={goals.proteinGoalG} color="bg-sky-500" />
            <MacroBar label="Carbs" consumed={totals.carbs} goal={goals.carbsGoalG} color="bg-amber-500" />
            <MacroBar label="Fat" consumed={totals.fat} goal={goals.fatGoalG} color="bg-purple-500" />
          </div>
        </div>

        {/* Meals */}
        <div className="mt-6 space-y-4">
          {loading && <p className="text-center text-sm text-neutral-400">Loading...</p>}
          {MEALS.map((meal) => {
            const mealEntries = entries.filter((e) => e.mealType === meal.type);
            const mealCalories = mealEntries.reduce((sum, e) => sum + e.calories, 0);

            return (
              <div key={meal.type} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-neutral-900">{meal.label}</h3>
                  <span className="text-sm text-neutral-400">{Math.round(mealCalories)} kcal</span>
                </div>

                {mealEntries.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {mealEntries.map((entry) => (
                      <li key={entry.id} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="text-neutral-800">{entry.foodItem.name}</p>
                          <p className="text-xs text-neutral-400">
                            {entry.quantity} × {entry.foodItem.servingSize} {entry.foodItem.servingUnit}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-neutral-600">{Math.round(entry.calories)} kcal</span>
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
                )}

                <button
                  onClick={() => setActiveMeal(meal.type)}
                  className="mt-3 w-full rounded-lg border border-dashed border-neutral-300 py-1.5 text-sm font-medium text-neutral-500 hover:border-emerald-500 hover:text-emerald-600"
                >
                  + Add food
                </button>
              </div>
            );
          })}
        </div>
      </main>

      {activeMeal && (
        <AddFoodModal
          mealType={activeMeal}
          logDate={date}
          onClose={() => setActiveMeal(null)}
          onAdded={handleAdded}
        />
      )}
    </div>
  );
}

function MacroBar({
  label,
  consumed,
  goal,
  color,
}: {
  label: string;
  consumed: number;
  goal: number;
  color: string;
}) {
  const pct = Math.min(100, (consumed / (goal || 1)) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs text-neutral-500">
        <span>{label}</span>
        <span>
          {Math.round(consumed)}/{Math.round(goal)}g
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
