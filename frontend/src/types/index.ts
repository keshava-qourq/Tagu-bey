export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface FoodItem {
  id: string;
  name: string;
  brand: string | null;
  servingSize: number;
  servingUnit: string;
  caloriesPerServing: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
}

export interface LogEntry {
  id: string;
  userId: string;
  foodItemId: string;
  foodItem: FoodItem;
  logDate: string;
  mealType: MealType;
  quantity: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  loggedAt: string;
}

export interface Goals {
  dailyCalorieGoal: number;
  proteinGoalG: number;
  carbsGoalG: number;
  fatGoalG: number;
}

export interface WeightLog {
  id: string;
  userId: string;
  weightKg: number;
  logDate: string;
}

export interface DaySummary {
  logDate: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface DetectedFoodItem {
  name: string;
  servingSize: number;
  servingUnit: string;
  quantity: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  onboardingComplete: boolean;
  dateOfBirth: string | null;
  sex: "male" | "female" | "other" | null;
  heightCm: number | null;
  currentWeightKg: number | null;
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active" | null;
  goalType: "lose" | "maintain" | "gain" | null;
  goalRateKgPerWeek: number | null;
  bmr: number | null;
  tdee: number | null;
  dailyCalorieGoal: number | null;
  proteinGoalG: number | null;
  carbsGoalG: number | null;
  fatGoalG: number | null;
}
