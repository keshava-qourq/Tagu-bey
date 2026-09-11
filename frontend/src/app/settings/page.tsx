"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import {
  ActivityLevel,
  GoalType,
  Sex,
  calculateAge,
  calculateBMR,
  calculateCalorieGoal,
  calculateMacroGoals,
  calculateTDEE,
  todayDateString,
} from "@/lib/calculations";
import { Profile } from "@/types";
import { BottomNav } from "@/components/nav/bottom-nav";
import { LogFoodSheet } from "@/components/log-food/log-food-sheet";
import { PageHeader } from "@/components/ui/page-header";

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: "sedentary", label: "Sedentary" },
  { value: "light", label: "Lightly active" },
  { value: "moderate", label: "Moderately active" },
  { value: "active", label: "Active" },
  { value: "very_active", label: "Very active" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showLogSheet, setShowLogSheet] = useState(false);

  const [sex, setSex] = useState<Sex>("male");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [goalType, setGoalType] = useState<GoalType>("maintain");
  const [goalRate, setGoalRate] = useState("0.5");

  useEffect(() => {
    api
      .get<Profile>("/api/user/profile")
      .then((p) => {
        setProfile(p);
        setSex(p.sex ?? "male");
        setHeightCm(p.heightCm ? String(p.heightCm) : "");
        setWeightKg(p.currentWeightKg ? String(p.currentWeightKg) : "");
        setDateOfBirth(p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : "");
        setActivityLevel(p.activityLevel ?? "moderate");
        setGoalType(p.goalType ?? "maintain");
        setGoalRate(p.goalRateKgPerWeek ? String(Math.abs(p.goalRateKgPerWeek)) : "0.5");
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.push("/login");
      });
  }, [router]);

  const preview = useMemo(() => {
    const h = parseFloat(heightCm);
    const w = parseFloat(weightKg);
    if (!dateOfBirth || !h || !w) return null;

    const age = calculateAge(new Date(dateOfBirth));
    const bmr = calculateBMR({ sex, weightKg: w, heightCm: h, age });
    const tdee = calculateTDEE(bmr, activityLevel);
    const rate =
      goalType === "lose"
        ? -Math.abs(parseFloat(goalRate) || 0)
        : goalType === "gain"
          ? Math.abs(parseFloat(goalRate) || 0)
          : 0;
    const dailyCalorieGoal = calculateCalorieGoal({ tdee, goalType, goalRateKgPerWeek: rate });
    const macros = calculateMacroGoals(dailyCalorieGoal);
    return { dailyCalorieGoal, ...macros };
  }, [dateOfBirth, sex, heightCm, weightKg, activityLevel, goalType, goalRate]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const rate =
      goalType === "lose"
        ? -Math.abs(parseFloat(goalRate) || 0)
        : goalType === "gain"
          ? Math.abs(parseFloat(goalRate) || 0)
          : 0;

    try {
      const updated = await api.patch<Profile>("/api/user/profile", {
        dateOfBirth,
        sex,
        heightCm: parseFloat(heightCm),
        currentWeightKg: parseFloat(weightKg),
        activityLevel,
        goalType,
        goalRateKgPerWeek: rate,
      });
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await api.post("/api/auth/logout");
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-32">
      <PageHeader icon="⚙️" title="Settings" subtitle="Update your profile & goals" />

      <main className="mx-auto max-w-2xl px-4 py-3">
        {!profile ? (
          <p className="py-10 text-center text-sm text-neutral-400">Loading...</p>
        ) : (
          <div className="animate-fade-in space-y-4">
            <div className="panel-dark flex items-center gap-3 rounded-[28px] p-5 shadow-xl shadow-black/10">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-500 text-sm font-bold text-black">
                {profile.name.trim().charAt(0).toUpperCase() || "?"}
              </div>
              <div>
                <p className="font-semibold text-white">{profile.name}</p>
                <p className="text-sm text-white/40">{profile.email}</p>
              </div>
            </div>

            <div className="space-y-4 rounded-[28px] border border-neutral-200/70 bg-white p-5 shadow-sm">
              <div>
                <label className="block text-sm font-medium text-neutral-700">Date of birth</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700">Sex</label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as Sex)}
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700">Height (cm)</label>
                  <input
                    type="number"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700">Weight (kg)</label>
                  <input
                    type="number"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700">Activity level</label>
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
                >
                  {ACTIVITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700">Goal</label>
                <select
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value as GoalType)}
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
                >
                  <option value="lose">Lose weight</option>
                  <option value="maintain">Maintain weight</option>
                  <option value="gain">Gain weight</option>
                </select>
              </div>

              {goalType !== "maintain" && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700">Target rate (kg/week)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={0.1}
                    max={1.5}
                    value={goalRate}
                    onChange={(e) => setGoalRate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
                  />
                </div>
              )}

              {preview && (
                <div className="rounded-2xl bg-lime-50 p-3 text-sm text-lime-800">
                  New goal: <span className="font-semibold">{preview.dailyCalorieGoal} kcal</span> · P
                  {preview.proteinGoalG}g C{preview.carbsGoalG}g F{preview.fatGoalG}g
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
              {saved && <p className="text-sm text-emerald-600">Saved!</p>}

              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-glow w-full rounded-full bg-gradient-to-r from-lime-400 to-emerald-500 py-2.5 text-sm font-semibold text-black hover:brightness-105 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full rounded-[28px] border border-neutral-200 bg-white py-3 text-sm font-medium text-red-500 shadow-sm hover:bg-red-50"
            >
              Sign out
            </button>
          </div>
        )}
      </main>

      <BottomNav onLog={() => setShowLogSheet(true)} />

      {showLogSheet && (
        <LogFoodSheet logDate={todayDateString()} onClose={() => setShowLogSheet(false)} onAdded={() => {}} />
      )}
    </div>
  );
}
