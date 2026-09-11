import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/require-auth";
import { prisma } from "../lib/prisma";
import { todayDateString } from "../lib/calculations";
import { analyzeFoodPhoto, generateDailyInsight, GeminiError, DetectedFoodItem } from "../lib/gemini";
import { analyzeFoodTextWithTavily } from "../lib/tavily";
import { analyzeFoodTextWithSerpApi } from "../lib/serpapi";
import { computeLocalInsight } from "../lib/local-insight";

export const aiRouter = Router();

aiRouter.use(requireAuth);

function handleGeminiError(err: unknown, res: import("express").Response) {
  if (err instanceof GeminiError) {
    res.status(502).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: "Something went wrong" });
}

/**
 * Text-description analysis uses Tavily -> SerpApi only, deliberately never
 * Gemini - Gemini's free tier has a very small daily quota, so it's reserved
 * entirely for photo analysis (which has no fallback: reverse image search
 * requires a public image URL this app can't provide). Tavily/SerpApi are
 * web search APIs, not generation models, so results are a rougher
 * best-effort estimate extracted from search text rather than a direct
 * structured answer.
 */
async function analyzeTextWithFallback(
  description: string
): Promise<{ items: DetectedFoodItem[]; source: "tavily" | "serpapi" }> {
  try {
    return { items: await analyzeFoodTextWithTavily(description), source: "tavily" };
  } catch {
    // fall through to the next provider
  }

  return { items: await analyzeFoodTextWithSerpApi(description), source: "serpapi" };
}

const photoSchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.string().min(1).default("image/jpeg"),
});

aiRouter.post("/analyze-photo", async (req, res) => {
  const parsed = photoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  try {
    const items = await analyzeFoodPhoto(parsed.data.imageBase64, parsed.data.mimeType);
    res.json({ items });
  } catch (err) {
    handleGeminiError(err, res);
  }
});

const textSchema = z.object({
  description: z.string().min(1).max(500),
});

aiRouter.post("/analyze-text", async (req, res) => {
  const parsed = textSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  try {
    const { items, source } = await analyzeTextWithFallback(parsed.data.description);
    res.json({ items, source });
  } catch {
    res.status(502).json({
      error: "Tavily and SerpApi are both currently unavailable. Please try again later or log this food manually.",
    });
  }
});

aiRouter.get("/insight", async (req, res) => {
  const logDate = typeof req.query.date === "string" ? req.query.date : todayDateString();

  const [user, entries] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.userId } }),
    prisma.logEntry.findMany({ where: { userId: req.userId, logDate } }),
  ]);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.proteinG,
      carbs: acc.carbs + e.carbsG,
      fat: acc.fat + e.fatG,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  try {
    const insight = await generateDailyInsight({
      calories: totals.calories,
      calorieGoal: user.dailyCalorieGoal ?? 0,
      proteinG: totals.protein,
      proteinGoalG: user.proteinGoalG ?? 0,
      carbsG: totals.carbs,
      carbsGoalG: user.carbsGoalG ?? 0,
      fatG: totals.fat,
      fatGoalG: user.fatGoalG ?? 0,
      mealsLogged: entries.length,
    });
    res.json({ insight, source: "gemini" });
  } catch {
    // Deterministic local fallback - no search API applies to generated coaching text.
    const insight = computeLocalInsight({
      calories: totals.calories,
      calorieGoal: user.dailyCalorieGoal ?? 0,
      proteinG: totals.protein,
      proteinGoalG: user.proteinGoalG ?? 0,
      mealsLogged: entries.length,
    });
    res.json({ insight, source: "local" });
  }
});
