"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { todayDateString } from "@/lib/calculations";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { Goals, LogEntry } from "@/types";

interface Profile {
  name: string;
  onboardingComplete: boolean;
  dailyCalorieGoal: number | null;
  proteinGoalG: number | null;
  carbsGoalG: number | null;
  fatGoalG: number | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<{
    userName: string;
    goals: Goals;
    entries: LogEntry[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const logDate = todayDateString();
        const [profile, entries] = await Promise.all([
          api.get<Profile>("/api/auth/me"),
          api.get<LogEntry[]>(`/api/log-entries?date=${logDate}`),
        ]);

        if (cancelled) return;

        if (!profile.onboardingComplete) {
          router.push("/onboarding");
          return;
        }

        setData({
          userName: profile.name,
          goals: {
            dailyCalorieGoal: profile.dailyCalorieGoal ?? 0,
            proteinGoalG: profile.proteinGoalG ?? 0,
            carbsGoalG: profile.carbsGoalG ?? 0,
            fatGoalG: profile.fatGoalG ?? 0,
          },
          entries,
        });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        setError("Failed to load your dashboard. Please try again.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-neutral-400">
        Loading...
      </div>
    );
  }

  return (
    <DashboardClient
      userName={data.userName}
      goals={data.goals}
      initialDate={todayDateString()}
      initialEntries={data.entries}
    />
  );
}
