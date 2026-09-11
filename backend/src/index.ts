import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth";
import { profileRouter } from "./routes/profile";
import { foodItemsRouter } from "./routes/food-items";
import { logEntriesRouter } from "./routes/log-entries";
import { weightLogsRouter } from "./routes/weight-logs";
import { aiRouter } from "./routes/ai";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";
const isProduction = process.env.NODE_ENV === "production";

// In dev, Next.js may fall back to a different port (3001, 3002...) if
// another local project is already holding 3000, so match any localhost
// origin instead of hardcoding one. Production stays locked to FRONTEND_URL.
const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;

app.use(
  cors({
    origin: isProduction ? FRONTEND_URL : (origin, callback) => {
      if (!origin || LOCALHOST_ORIGIN.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "8mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
// Elastic Beanstalk's basic health check hits "/" by default.
app.get("/", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api/user/profile", profileRouter);
app.use("/api/food-items", foodItemsRouter);
app.use("/api/log-entries", logEntriesRouter);
app.use("/api/weight-logs", weightLogsRouter);
app.use("/api/ai", aiRouter);

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
