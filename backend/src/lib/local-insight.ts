export function computeLocalInsight(params: {
  calories: number;
  calorieGoal: number;
  proteinG: number;
  proteinGoalG: number;
  mealsLogged: number;
}): string {
  const { calories, calorieGoal, proteinG, proteinGoalG, mealsLogged } = params;

  if (mealsLogged === 0) {
    return "You haven't logged anything yet today — log a meal to start tracking your progress.";
  }

  const caloriePct = calorieGoal > 0 ? (calories / calorieGoal) * 100 : 0;
  const proteinPct = proteinGoalG > 0 ? (proteinG / proteinGoalG) * 100 : 0;

  if (caloriePct > 110) {
    return `You're about ${Math.round(caloriePct - 100)}% over your calorie goal today — a lighter next meal can help balance it out.`;
  }
  if (proteinPct < 50 && caloriePct > 40) {
    return `You're at ${Math.round(caloriePct)}% of your calorie goal but only ${Math.round(proteinPct)}% of your protein goal — try adding a protein-rich food to your next meal.`;
  }
  if (caloriePct < 50) {
    return `You're at ${Math.round(caloriePct)}% of your calorie goal so far — plenty of room left today.`;
  }
  return `You're at ${Math.round(caloriePct)}% of your calorie goal — right on track. Keep it up!`;
}
