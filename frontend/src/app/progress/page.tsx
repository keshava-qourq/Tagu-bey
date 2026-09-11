"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { todayDateString } from "@/lib/calculations";
import { WeightLog } from "@/types";
import { WeightChart } from "@/components/progress/weight-chart";
import { BottomNav } from "@/components/nav/bottom-nav";
import { LogFoodSheet } from "@/components/log-food/log-food-sheet";
import { PageHeader } from "@/components/ui/page-header";

export default function ProgressPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<WeightLog[] | null>(null);
  const [weightInput, setWeightInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLogSheet, setShowLogSheet] = useState(false);

  useEffect(() => {
    api
      .get<WeightLog[]>("/api/weight-logs?limit=90")
      .then(setLogs)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.push("/login");
      });
  }, [router]);

  const latest = logs && logs.length > 0 ? logs[logs.length - 1] : null;
  const first = logs && logs.length > 0 ? logs[0] : null;
  const delta = latest && first ? latest.weightKg - first.weightKg : 0;

  async function handleLogWeight(e: FormEvent) {
    e.preventDefault();
    const weightKg = parseFloat(weightInput);
    if (!weightKg || weightKg <= 0) {
      setError("Enter a valid weight");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const log = await api.post<WeightLog>("/api/weight-logs", {
        weightKg,
        logDate: todayDateString(),
      });
      setLogs((prev) => {
        const withoutToday = (prev ?? []).filter((l) => l.logDate !== log.logDate);
        return [...withoutToday, log].sort((a, b) => a.logDate.localeCompare(b.logDate));
      });
      setWeightInput("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to log weight");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-32">
      <PageHeader icon="📈" title="Progress" subtitle="Track your weight trend over time" />

      <main className="mx-auto max-w-2xl px-4 py-3">
        {logs === null ? (
          <p className="py-10 text-center text-sm text-neutral-400">Loading...</p>
        ) : (
          <>
            <div className="panel-dark animate-fade-in rounded-[32px] p-6 shadow-xl shadow-black/10">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-3xl font-extrabold text-white">
                    {latest ? `${latest.weightKg.toFixed(1)} kg` : "—"}
                  </p>
                  <p className="text-sm text-white/40">
                    {latest ? `as of ${formatDate(latest.logDate)}` : "No entries yet"}
                  </p>
                </div>
                {logs.length > 1 && (
                  <div
                    className={`rounded-full px-3 py-1 text-right text-sm font-semibold ${
                      delta <= 0 ? "bg-lime-400/15 text-lime-300" : "bg-amber-400/15 text-amber-300"
                    }`}
                  >
                    {delta > 0 ? "+" : ""}
                    {delta.toFixed(1)} kg
                  </div>
                )}
              </div>

              <div className="mt-5">
                <WeightChart logs={logs} />
              </div>
            </div>

            <form
              onSubmit={handleLogWeight}
              className="mt-4 flex items-center gap-3 rounded-[28px] border border-neutral-200/70 bg-white p-4 shadow-sm"
            >
              <input
                type="number"
                step="0.1"
                min="1"
                placeholder="Today's weight (kg)"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="flex-1 rounded-full border border-neutral-300 px-4 py-2.5 text-sm focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
              />
              <button
                type="submit"
                disabled={saving}
                className="btn-glow rounded-full bg-gradient-to-r from-lime-400 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-black hover:brightness-105 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Log"}
              </button>
            </form>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </>
        )}
      </main>

      <BottomNav onLog={() => setShowLogSheet(true)} />

      {showLogSheet && (
        <LogFoodSheet logDate={todayDateString()} onClose={() => setShowLogSheet(false)} onAdded={() => {}} />
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
