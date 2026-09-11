"use client";

import { DaySummary } from "@/types";
import { todayDateString } from "@/lib/calculations";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function DayAgenda({
  year,
  month,
  summaries,
  goal,
  selectedDate,
  onSelectDate,
}: {
  year: number;
  month: number;
  summaries: Record<string, DaySummary>;
  goal: number | null;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayDateString();

  return (
    <div className="space-y-1.5">
      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
        const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
        const d = new Date(year, month, day);
        const summary = summaries[dateStr];
        const hasData = !!summary && summary.calories > 0;
        const overGoal = hasData && goal != null && summary.calories > goal;
        const pct = hasData && goal ? Math.min(100, (summary.calories / goal) * 100) : 0;
        const isToday = dateStr === today;
        const isSelected = dateStr === selectedDate;

        return (
          <button
            key={dateStr}
            onClick={() => onSelectDate(dateStr)}
            className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-2.5 text-left transition ${
              isSelected ? "border-lime-400 bg-lime-50" : "border-neutral-200/70 bg-white hover:bg-neutral-50"
            }`}
          >
            <div className="w-11 shrink-0 text-center">
              <p className={`text-xs ${isToday ? "font-bold text-lime-700" : "text-neutral-400"}`}>
                {d.toLocaleDateString(undefined, { weekday: "short" })}
              </p>
              <p className={`text-lg font-bold leading-none ${isToday ? "text-lime-700" : "text-neutral-800"}`}>
                {day}
              </p>
            </div>

            <div className="min-w-0 flex-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className={`h-full rounded-full ${overGoal ? "bg-red-400" : "bg-lime-400"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <span className={`shrink-0 text-sm font-semibold ${hasData ? (overGoal ? "text-red-500" : "text-neutral-700") : "text-neutral-300"}`}>
              {hasData ? `${Math.round(summary.calories)} kcal` : "—"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
