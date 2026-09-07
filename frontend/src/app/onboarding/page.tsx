"use client";

import { useMemo, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ActivityLevel,
  GoalType,
  Sex,
  calculateAge,
  calculateBMR,
  calculateCalorieGoal,
  calculateMacroGoals,
  calculateTDEE,
} from "@/lib/calculations";
import { api, ApiError } from "@/lib/api";

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: "sedentary", label: "Sedentary (little to no exercise)" },
  { value: "light", label: "Lightly active (1-3 days/week)" },
  { value: "moderate", label: "Moderately active (3-5 days/week)" },
  { value: "active", label: "Active (6-7 days/week)" },
  { value: "very_active", label: "Very active (physical job or 2x/day training)" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sex, setSex] = useState<Sex>("male");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [goalType, setGoalType] = useState<GoalType>("maintain");
  const [goalRate, setGoalRate] = useState("0.5");

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
    const dailyCalorieGoal = calculateCalorieGoal({
      tdee,
      goalType,
      goalRateKgPerWeek: rate,
    });
    const macros = calculateMacroGoals(dailyCalorieGoal);

    return { age, bmr: Math.round(bmr), tdee: Math.round(tdee), dailyCalorieGoal, ...macros };
  }, [dateOfBirth, sex, heightCm, weightKg, activityLevel, goalType, goalRate]);

  function handleContinue(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!preview) {
      setError("Please fill in all fields");
      return;
    }
    setStep(2);
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    const rate =
      goalType === "lose"
        ? -Math.abs(parseFloat(goalRate) || 0)
        : goalType === "gain"
          ? Math.abs(parseFloat(goalRate) || 0)
          : 0;

    try {
      await api.patch("/api/user/profile", {
        dateOfBirth,
        sex,
        heightCm: parseFloat(heightCm),
        currentWeightKg: parseFloat(weightKg),
        activityLevel,
        goalType,
        goalRateKgPerWeek: rate,
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        {step === 1 ? (
          <>
            <h1 className="text-2xl font-semibold text-neutral-900">Tell us about you</h1>
            <p className="mt-1 text-sm text-neutral-500">
              We&apos;ll use this to calculate your calorie and macro goals.
            </p>

            <form onSubmit={handleContinue} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700">Date of birth</label>
                <input
                  type="date"
                  required
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700">Sex</label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as Sex)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
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
                    required
                    min={50}
                    max={272}
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700">Weight (kg)</label>
                  <input
                    type="number"
                    required
                    min={20}
                    max={400}
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700">Activity level</label>
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
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
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                >
                  <option value="lose">Lose weight</option>
                  <option value="maintain">Maintain weight</option>
                  <option value="gain">Gain weight</option>
                </select>
              </div>

              {goalType !== "maintain" && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700">
                    Target rate (kg/week)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={0.1}
                    max={1.5}
                    required
                    value={goalRate}
                    onChange={(e) => setGoalRate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-neutral-400">
                    A safe range is typically 0.25–1 kg/week
                  </p>
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                Calculate my goals
              </button>
            </form>
          </>
        ) : (
          preview && (
            <>
              <h1 className="text-2xl font-semibold text-neutral-900">Your goals</h1>
              <p className="mt-1 text-sm text-neutral-500">
                Based on the Mifflin-St Jeor equation. You can fine-tune these later in settings.
              </p>

              <div className="mt-6 space-y-3">
                <div className="rounded-xl bg-neutral-50 p-4">
                  <div className="flex justify-between text-sm text-neutral-500">
                    <span>BMR</span>
                    <span>{preview.bmr} kcal/day</span>
                  </div>
                  <div className="mt-1 flex justify-between text-sm text-neutral-500">
                    <span>TDEE</span>
                    <span>{preview.tdee} kcal/day</span>
                  </div>
                </div>

                <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50 p-4 text-center">
                  <p className="text-sm text-emerald-700">Daily calorie goal</p>
                  <p className="text-3xl font-bold text-emerald-700">
                    {preview.dailyCalorieGoal} kcal
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-neutral-50 p-3">
                    <p className="text-xs text-neutral-500">Protein</p>
                    <p className="font-semibold text-neutral-900">{preview.proteinGoalG}g</p>
                  </div>
                  <div className="rounded-lg bg-neutral-50 p-3">
                    <p className="text-xs text-neutral-500">Carbs</p>
                    <p className="font-semibold text-neutral-900">{preview.carbsGoalG}g</p>
                  </div>
                  <div className="rounded-lg bg-neutral-50 p-3">
                    <p className="text-xs text-neutral-500">Fat</p>
                    <p className="font-semibold text-neutral-900">{preview.fatGoalG}g</p>
                  </div>
                </div>
              </div>

              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {loading ? "Saving..." : "Confirm & continue"}
                </button>
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}
