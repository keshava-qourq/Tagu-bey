"use client";

import { DaySummary } from "@/types";
import { todayDateString } from "@/lib/calculations";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function cellClasses(hasData: boolean, overGoal: boolean, isToday: boolean, isSelected: boolean) {
  const base = "flex flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-xs transition";
  const ring = isSelected ? " ring-2 ring-lime-500" : isToday ? " ring-1 ring-neutral-300" : "";
  if (!hasData) return `${base} text-neutral-300 hover:bg-neutral-100${ring}`;
  if (overGoal) return `${base} bg-red-50 text-red-600 hover:bg-red-100${ring}`;
  return `${base} bg-lime-50 text-lime-800 hover:bg-lime-100${ring}`;
}

export function MonthGrid({
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
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();
  const today = todayDateString();

  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-neutral-400">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`blank-${i}`} />;
          const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
          const summary = summaries[dateStr];
          const hasData = !!summary && summary.calories > 0;
          const overGoal = hasData && goal != null && summary.calories > goal;

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={cellClasses(hasData, overGoal, dateStr === today, dateStr === selectedDate)}
            >
              <span className="font-semibold">{day}</span>
              {hasData && <span className="text-[10px] leading-none">{Math.round(summary.calories)}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
