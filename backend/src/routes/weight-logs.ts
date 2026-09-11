import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";
import { todayDateString } from "../lib/calculations";

export const weightLogsRouter = Router();

weightLogsRouter.use(requireAuth);

weightLogsRouter.get("/", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 90, 365);

  const logs = await prisma.weightLog.findMany({
    where: { userId: req.userId },
    orderBy: { logDate: "desc" },
    take: limit,
  });

  res.json(logs.reverse());
});

const createSchema = z.object({
  weightKg: z.number().positive(),
  logDate: z.string().min(1).default(() => todayDateString()),
});

weightLogsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const { weightKg, logDate } = parsed.data;

  const log = await prisma.weightLog.upsert({
    where: { userId_logDate: { userId: req.userId!, logDate } },
    update: { weightKg },
    create: { userId: req.userId!, logDate, weightKg },
  });

  const latest = await prisma.weightLog.findFirst({
    where: { userId: req.userId },
    orderBy: { logDate: "desc" },
  });
  if (latest && latest.logDate === logDate) {
    await prisma.user.update({ where: { id: req.userId }, data: { currentWeightKg: weightKg } });
  }

  res.status(201).json(log);
});
