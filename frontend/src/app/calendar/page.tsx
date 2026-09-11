"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Goals, DaySummary } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { BottomNav } from "@/components/nav/bottom-nav";
import { LogFoodSheet } from "@/components/log-food/log-food-sheet";
import { MonthGrid } from "@/components/calendar/month-grid";
import { DayAgenda } from "@/components/calendar/day-agenda";
import { DayDetailSheet } from "@/components/calendar/day-detail-sheet";
import { todayDateString } from "@/lib/calculations";

type ViewMode = "month" | "day";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function monthRange(year: number, month: number) {
  const start = `${year}-${pad(month + 1)}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${pad(month + 1)}-${pad(lastDay)}`;
  return { start, end };
}

export default function CalendarPage() {
  const router = useRouter();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [view, setView] = useState<ViewMode>("month");
  const [summaries, setSummaries] = useState<Record<string, DaySummary>>({});
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goals | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showLogSheet, setShowLogSheet] = useState(false);

  useEffect(() => {
    api
      .get<Goals>("/api/user/profile")
      .then((p) => setGoals(p))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.push("/login");
      });
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    const { start, end } = monthRange(cursor.year, cursor.month);
    api
      .get<DaySummary[]>(`/api/log-entries/summary?start=${start}&end=${end}`)
      .then((days) => {
        if (cancelled) return;
        const map: Record<string, DaySummary> = {};
        for (const d of days) map[d.logDate] = d;
        setSummaries(map);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [cursor]);

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const isCurrentMonth = cursor.year === now.getFullYear() && cursor.month === now.getMonth();

  return (
    <div className="min-h-screen bg-neutral-50 pb-32">
      <PageHeader icon="🗓️" title="Calendar" subtitle="See how each day added up" />

      <main className="mx-auto max-w-2xl px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => shiftMonth(-1)}
            className="rounded-full p-2 text-neutral-500 transition hover:bg-neutral-200/60 active:scale-95"
            aria-label="Previous month"
          >
            ←
          </button>
          <div className="text-center">
            <p className="font-semibold text-neutral-900">{monthLabel}</p>
            {!isCurrentMonth && (
              <button
                onClick={() => setCursor({ year: now.getFullYear(), month: now.getMonth() })}
                className="text-xs font-medium text-emerald-600 hover:underline"
              >
                Jump to this month
              </button>
            )}
          </div>
          <button
            onClick={() => shiftMonth(1)}
            className="rounded-full p-2 text-neutral-500 transition hover:bg-neutral-200/60 active:scale-95"
            aria-label="Next month"
          >
            →
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-2xl bg-neutral-100 p-1">
          {(["month", "day"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-xl py-2 text-sm font-medium capitalize transition ${
                view === v ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
              }`}
            >
              {v} view
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-[28px] border border-neutral-200/70 bg-white p-4 shadow-sm">
          {loading ? (
            <p className="py-10 text-center text-sm text-neutral-400">Loading...</p>
          ) : view === "month" ? (
            <MonthGrid
              year={cursor.year}
              month={cursor.month}
              summaries={summaries}
              goal={goals?.dailyCalorieGoal ?? null}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          ) : (
            <DayAgenda
              year={cursor.year}
              month={cursor.month}
              summaries={summaries}
              goal={goals?.dailyCalorieGoal ?? null}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          )}
        </div>

        <div className="mt-3 flex items-center justify-center gap-4 text-xs text-neutral-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-lime-300" /> at or under goal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-300" /> over goal
          </span>
        </div>
      </main>

      <BottomNav onLog={() => setShowLogSheet(true)} />

      {selectedDate && (
        <DayDetailSheet date={selectedDate} goals={goals} onClose={() => setSelectedDate(null)} />
      )}

      {showLogSheet && (
        <LogFoodSheet logDate={todayDateString()} onClose={() => setShowLogSheet(false)} onAdded={() => {}} />
      )}
    </div>
  );
}
