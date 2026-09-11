"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Goals, LogEntry, MealType } from "@/types";
import { LogFoodSheet } from "@/components/log-food/log-food-sheet";
import { BottomNav } from "@/components/nav/bottom-nav";
import { ProgressRing } from "@/components/ui/progress-ring";
import { todayDateString } from "@/lib/calculations";
import { api } from "@/lib/api";

const MEALS: { type: MealType; label: string; emoji: string }[] = [
  { type: "breakfast", label: "Breakfast", emoji: "🌅" },
  { type: "lunch", label: "Lunch", emoji: "☀️" },
  { type: "dinner", label: "Dinner", emoji: "🌙" },
  { type: "snack", label: "Snacks", emoji: "🍎" },
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
  const [showLogSheet, setShowLogSheet] = useState(false);
  const [defaultMeal, setDefaultMeal] = useState<MealType>("breakfast");
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    if (date === initialDate) return;
    let cancelled = false;
    api.get<LogEntry[]>(`/api/log-entries?date=${date}`).then((data) => {
      if (!cancelled) setEntries(data);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // Gemini insight is fetched once per date (not on every log change) and
  // cached in localStorage, since free-tier Gemini quota is small (as low
  // as 20 requests/day) and refetching on every meal add burns through it fast.
  useEffect(() => {
    let cancelled = false;
    const cacheKey = `insight:${date}`;

    let cached: string | null = null;
    try {
      cached = localStorage.getItem(cacheKey);
    } catch {
      // localStorage unavailable (private mode, etc.) - just skip the cache
    }

    if (cached) {
      const cachedInsight = cached;
      Promise.resolve().then(() => {
        if (!cancelled) setInsight(cachedInsight);
      });
      return () => {
        cancelled = true;
      };
    }

    api
      .get<{ insight: string }>(`/api/ai/insight?date=${date}`)
      .then((res) => {
        if (cancelled) return;
        setInsight(res.insight);
        try {
          localStorage.setItem(cacheKey, res.insight);
        } catch {
          // ignore storage failures
        }
      })
      .catch(() => {
        if (!cancelled) setInsight(null);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  function refreshInsight() {
    try {
      localStorage.removeItem(`insight:${date}`);
    } catch {
      // ignore
    }
    setInsightLoading(true);
    api
      .get<{ insight: string }>(`/api/ai/insight?date=${date}`)
      .then((res) => {
        setInsight(res.insight);
        try {
          localStorage.setItem(`insight:${date}`, res.insight);
        } catch {
          // ignore
        }
      })
      .catch(() => setInsight(null))
      .finally(() => setInsightLoading(false));
  }

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
  const caloriePct = (totals.calories / (goals.dailyCalorieGoal || 1)) * 100;

  async function handleDelete(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await api.delete(`/api/log-entries/${id}`);
  }

  function handleAdded(newEntries: LogEntry[]) {
    setEntries((prev) => [...prev, ...newEntries]);
  }

  async function handleSignOut() {
    await api.post("/api/auth/logout");
    router.push("/login");
    router.refresh();
  }

  function openLogSheet(meal?: MealType) {
    setDefaultMeal(meal ?? "breakfast");
    setShowLogSheet(true);
  }

  const isToday = date === todayDateString();
  const initial = userName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-neutral-50 pb-32">
      <header className="bg-neutral-50">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 pb-2 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-500 text-sm font-bold text-black">
              {initial}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Hi, {userName.split(" ")[0]}</p>
              <p className="text-xl font-bold tracking-tight text-neutral-900">
                Calorie<span className="text-gradient-lime">Track</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-3">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => setDate((d) => shiftDate(d, -1))}
            className="rounded-full p-2 text-neutral-500 transition hover:bg-neutral-200/60 active:scale-95"
            aria-label="Previous day"
          >
            ←
          </button>
          <div className="text-center">
            <p className="font-semibold text-neutral-900">{formatDateLabel(date)}</p>
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
            className="rounded-full p-2 text-neutral-500 transition hover:bg-neutral-200/60 active:scale-95 disabled:opacity-30"
            aria-label="Next day"
            disabled={isToday}
          >
            →
          </button>
        </div>

        <div className="panel-dark animate-fade-in rounded-[32px] p-6 shadow-xl shadow-black/10">
          <div className="flex items-center gap-6">
            <ProgressRing
              pct={caloriePct}
              color={totals.calories > goals.dailyCalorieGoal ? "#f87171" : "#a3e635"}
              trackColor="rgba(255,255,255,0.1)"
            >
              <div className="text-center">
                <p className="text-3xl font-extrabold leading-none text-white">
                  {Math.round(totals.calories)}
                </p>
                <p className="mt-1.5 text-[11px] text-white/40">of {Math.round(goals.dailyCalorieGoal)}</p>
              </div>
            </ProgressRing>

            <div className="flex-1">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                  remaining < 0 ? "bg-red-400/15 text-red-300" : "bg-lime-400/15 text-lime-300"
                }`}
              >
                {remaining < 0 ? "over goal" : "remaining"}
              </span>
              <p className={`mt-2 text-3xl font-extrabold ${remaining < 0 ? "text-red-300" : "text-white"}`}>
                {remaining < 0 ? `+${Math.abs(remaining)}` : remaining}
                <span className="ml-1.5 text-sm font-medium text-white/40">kcal</span>
              </p>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-3 gap-4">
            <MacroBar label="Protein" consumed={totals.protein} goal={goals.proteinGoalG} color="var(--macro-protein)" />
            <MacroBar label="Carbs" consumed={totals.carbs} goal={goals.carbsGoalG} color="var(--macro-carbs)" />
            <MacroBar label="Fat" consumed={totals.fat} goal={goals.fatGoalG} color="var(--macro-fat)" />
          </div>
        </div>

        {insight && (
          <div className="animate-fade-in mt-4 flex items-start gap-3 rounded-3xl border border-lime-200/60 bg-white p-4 shadow-sm">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lime-100 text-base">
              ✨
            </span>
            <p className="flex-1 pt-1 text-sm leading-relaxed text-neutral-700">{insight}</p>
            <button
              onClick={refreshInsight}
              disabled={insightLoading}
              aria-label="Refresh insight"
              title="Refresh insight"
              className="mt-1 shrink-0 rounded-full p-1 text-neutral-300 hover:bg-neutral-100 hover:text-neutral-600 disabled:opacity-50"
            >
              {insightLoading ? (
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
              ) : (
                "↻"
              )}
            </button>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {MEALS.map((meal) => {
            const mealEntries = entries.filter((e) => e.mealType === meal.type);
            const mealCalories = mealEntries.reduce((sum, e) => sum + e.calories, 0);

            return (
              <div
                key={meal.type}
                className="rounded-[28px] border border-neutral-200/70 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2.5 font-semibold text-neutral-900">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-base">
                      {meal.emoji}
                    </span>
                    {meal.label}
                  </h3>
                  <span className="text-sm font-medium text-neutral-400">{Math.round(mealCalories)} kcal</span>
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
                  onClick={() => openLogSheet(meal.type)}
                  className="mt-3 w-full rounded-full border border-dashed border-neutral-300 py-2 text-sm font-medium text-neutral-500 transition hover:border-lime-500 hover:text-lime-700 hover:bg-lime-50"
                >
                  + Add food
                </button>
              </div>
            );
          })}
        </div>
      </main>

      <BottomNav onLog={() => openLogSheet()} />

      {showLogSheet && (
        <LogFoodSheet
          logDate={date}
          defaultMeal={defaultMeal}
          onClose={() => setShowLogSheet(false)}
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
      <div className="flex justify-between text-xs text-white/50">
        <span>{label}</span>
        <span className="text-white/70">
          {Math.round(consumed)}/{Math.round(goal)}g
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
