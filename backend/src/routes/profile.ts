import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";
import {
  calculateAge,
  calculateBMR,
  calculateCalorieGoal,
  calculateMacroGoals,
  calculateTDEE,
} from "../lib/calculations";

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get("/", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const { passwordHash: _passwordHash, ...profile } = user;
  res.json(profile);
});

const onboardingSchema = z.object({
  dateOfBirth: z.string(),
  sex: z.enum(["male", "female", "other"]),
  heightCm: z.number().positive(),
  currentWeightKg: z.number().positive(),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  goalType: z.enum(["lose", "maintain", "gain"]),
  goalRateKgPerWeek: z.number(),
  dailyCalorieGoalOverride: z.number().positive().optional(),
  proteinGoalGOverride: z.number().nonnegative().optional(),
  carbsGoalGOverride: z.number().nonnegative().optional(),
  fatGoalGOverride: z.number().nonnegative().optional(),
});

profileRouter.patch("/", async (req, res) => {
  const parsed = onboardingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const data = parsed.data;
  const dateOfBirth = new Date(data.dateOfBirth);
  const age = calculateAge(dateOfBirth);

  const bmr = calculateBMR({
    sex: data.sex,
    weightKg: data.currentWeightKg,
    heightCm: data.heightCm,
    age,
  });
  const tdee = calculateTDEE(bmr, data.activityLevel);

  const dailyCalorieGoal =
    data.dailyCalorieGoalOverride ??
    calculateCalorieGoal({
      tdee,
      goalType: data.goalType,
      goalRateKgPerWeek: data.goalRateKgPerWeek,
    });

  const defaultMacros = calculateMacroGoals(dailyCalorieGoal);

  const user = await prisma.user.update({
    where: { id: req.userId },
    data: {
      dateOfBirth,
      sex: data.sex,
      heightCm: data.heightCm,
      currentWeightKg: data.currentWeightKg,
      activityLevel: data.activityLevel,
      goalType: data.goalType,
      goalRateKgPerWeek: data.goalRateKgPerWeek,
      bmr,
      tdee,
      dailyCalorieGoal,
      proteinGoalG: data.proteinGoalGOverride ?? defaultMacros.proteinGoalG,
      carbsGoalG: data.carbsGoalGOverride ?? defaultMacros.carbsGoalG,
      fatGoalG: data.fatGoalGOverride ?? defaultMacros.fatGoalG,
      onboardingComplete: true,
    },
  });

  const { passwordHash: _passwordHash, ...profile } = user;
  res.json(profile);
});
