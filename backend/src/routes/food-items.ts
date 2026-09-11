import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";

export const foodItemsRouter = Router();

foodItemsRouter.use(requireAuth);

foodItemsRouter.get("/recent", async (req, res) => {
  const recentEntries = await prisma.logEntry.findMany({
    where: { userId: req.userId },
    orderBy: { loggedAt: "desc" },
    take: 40,
    include: { foodItem: true },
  });

  const seen = new Set<string>();
  const items = [];
  for (const entry of recentEntries) {
    if (seen.has(entry.foodItemId)) continue;
    seen.add(entry.foodItemId);
    items.push(entry.foodItem);
    if (items.length >= 10) break;
  }

  res.json(items);
});

foodItemsRouter.get("/", async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";

  if (!query) {
    const items = await prisma.foodItem.findMany({
      where: {
        OR: [{ createdByUserId: req.userId }, { source: "seed" }],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json(items);
    return;
  }

  const items = await prisma.foodItem.findMany({
    where: {
      name: { contains: query, mode: "insensitive" },
      OR: [{ createdByUserId: req.userId }, { source: "seed" }],
    },
    take: 20,
    orderBy: { name: "asc" },
  });

  res.json(items);
});

const createFoodSchema = z.object({
  name: z.string().min(1),
  brand: z.string().optional(),
  servingSize: z.number().positive(),
  servingUnit: z.string().min(1),
  caloriesPerServing: z.number().nonnegative(),
  proteinG: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
  fiberG: z.number().nonnegative().optional(),
  sugarG: z.number().nonnegative().optional(),
  sodiumMg: z.number().nonnegative().optional(),
  source: z.enum(["user", "ai"]).default("user"),
});

foodItemsRouter.post("/", async (req, res) => {
  const parsed = createFoodSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const { source, ...data } = parsed.data;

  const item = await prisma.foodItem.create({
    data: {
      ...data,
      source,
      createdByUserId: req.userId,
    },
  });

  res.status(201).json(item);
});
