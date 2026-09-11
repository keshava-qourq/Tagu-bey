import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";
import { todayDateString } from "../lib/calculations";

export const logEntriesRouter = Router();

logEntriesRouter.use(requireAuth);

logEntriesRouter.get("/", async (req, res) => {
  const logDate = typeof req.query.date === "string" ? req.query.date : todayDateString();

  const entries = await prisma.logEntry.findMany({
    where: { userId: req.userId, logDate },
    include: { foodItem: true },
    orderBy: { loggedAt: "asc" },
  });

  res.json(entries);
});

const summarySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

logEntriesRouter.get("/summary", async (req, res) => {
  const parsed = summarySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "start and end (YYYY-MM-DD) are required" });
    return;
  }
  const { start, end } = parsed.data;

  const grouped = await prisma.logEntry.groupBy({
    by: ["logDate"],
    where: { userId: req.userId, logDate: { gte: start, lte: end } },
    _sum: { calories: true, proteinG: true, carbsG: true, fatG: true },
  });

  const days = grouped.map((g) => ({
    logDate: g.logDate,
    calories: g._sum.calories ?? 0,
    proteinG: g._sum.proteinG ?? 0,
    carbsG: g._sum.carbsG ?? 0,
    fatG: g._sum.fatG ?? 0,
  }));

  res.json(days);
});

const createEntrySchema = z.object({
  foodItemId: z.string().min(1),
  logDate: z.string().min(1),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  quantity: z.number().positive(),
});

logEntriesRouter.post("/", async (req, res) => {
  const parsed = createEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const { foodItemId, logDate, mealType, quantity } = parsed.data;

  const foodItem = await prisma.foodItem.findUnique({ where: { id: foodItemId } });
  if (!foodItem) {
    res.status(404).json({ error: "Food item not found" });
    return;
  }

  const entry = await prisma.logEntry.create({
    data: {
      userId: req.userId!,
      foodItemId,
      logDate,
      mealType,
      quantity,
      calories: foodItem.caloriesPerServing * quantity,
      proteinG: foodItem.proteinG * quantity,
      carbsG: foodItem.carbsG * quantity,
      fatG: foodItem.fatG * quantity,
    },
    include: { foodItem: true },
  });

  res.status(201).json(entry);
});

const updateEntrySchema = z.object({
  quantity: z.number().positive().optional(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
});

logEntriesRouter.patch("/:id", async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.logEntry.findUnique({ where: { id }, include: { foodItem: true } });
  if (!existing || existing.userId !== req.userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const parsed = updateEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const quantity = parsed.data.quantity ?? existing.quantity;
  const foodItem = existing.foodItem;

  const entry = await prisma.logEntry.update({
    where: { id },
    data: {
      quantity,
      mealType: parsed.data.mealType ?? existing.mealType,
      calories: foodItem.caloriesPerServing * quantity,
      proteinG: foodItem.proteinG * quantity,
      carbsG: foodItem.carbsG * quantity,
      fatG: foodItem.fatG * quantity,
    },
    include: { foodItem: true },
  });

  res.json(entry);
});

logEntriesRouter.delete("/:id", async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.logEntry.findUnique({ where: { id } });
  if (!existing || existing.userId !== req.userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await prisma.logEntry.delete({ where: { id } });
  res.json({ success: true });
});
