export type Sex = "male" | "female" | "other";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type GoalType = "lose" | "maintain" | "gain";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const KCAL_PER_KG_FAT = 7700;

export function calculateAge(dateOfBirth: Date, on: Date = new Date()): number {
  let age = on.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = on.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && on.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}

/** Mifflin-St Jeor equation */
export function calculateBMR(params: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
}): number {
  const { sex, weightKg, heightCm, age } = params;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === "male") return base + 5;
  if (sex === "female") return base - 161;
  // "other": midpoint of the male/female offset, a neutral default
  return base - 78;
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

export function calculateCalorieGoal(params: {
  tdee: number;
  goalType: GoalType;
  goalRateKgPerWeek: number;
}): number {
  const { tdee, goalType, goalRateKgPerWeek } = params;
  if (goalType === "maintain") return Math.round(tdee);
  const dailyAdjustment = (goalRateKgPerWeek * KCAL_PER_KG_FAT) / 7;
  return Math.round(tdee + dailyAdjustment);
}

/** Default macro split: 30% protein / 40% carbs / 30% fat, converted to grams */
export function calculateMacroGoals(dailyCalorieGoal: number) {
  return {
    proteinGoalG: Math.round((dailyCalorieGoal * 0.3) / 4),
    carbsGoalG: Math.round((dailyCalorieGoal * 0.4) / 4),
    fatGoalG: Math.round((dailyCalorieGoal * 0.3) / 9),
  };
}

export function todayDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
