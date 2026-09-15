import path from "path";
import fs from "fs";
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
const isProduction = process.env.NODE_ENV === "production";

// In production the backend serves the frontend from the same origin (see
// the static-serving block below), so there's no cross-origin request to
// allow and CORS can be skipped entirely. In dev, Next.js may fall back to
// a different port (3001, 3002...) if another local project already holds
// 3000, so match any localhost origin instead of hardcoding one.
const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;

if (!isProduction) {
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || LOCALHOST_ORIGIN.test(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
    })
  );
}
app.use(express.json({ limit: "8mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api/user/profile", profileRouter);
app.use("/api/food-items", foodItemsRouter);
app.use("/api/log-entries", logEntriesRouter);
app.use("/api/weight-logs", weightLogsRouter);
app.use("/api/ai", aiRouter);

// The frontend's static export (`next build` with output: "export") is
// copied to backend/public at deploy time - see render.yaml - so frontend
// and backend serve from the same origin. That makes the auth cookie
// first-party, avoiding the cross-site cookie blocking that Safari (and,
// increasingly, Chrome) apply to a separately-hosted frontend.
const FRONTEND_DIST = path.join(__dirname, "../public");
if (fs.existsSync(FRONTEND_DIST)) {
  // Each page also has a same-named directory holding its RSC payload
  // chunks (e.g. both "dashboard.html" and a "dashboard/" dir exist), which
  // would otherwise shadow the page: express.static resolves "/dashboard"
  // to that directory before ever trying the ".html" extension fallback.
  // So extensionless GETs are matched to their ".html" file explicitly,
  // before falling through to the generic static middleware for everything
  // else (JS/CSS/images, and those same RSC payload directories).
  app.get(/^(?!\/api\/).*/, (req, res, next) => {
    if (path.extname(req.path)) return next();
    const htmlPath = path.join(FRONTEND_DIST, req.path === "/" ? "index.html" : `${req.path}.html`);
    if (fs.existsSync(htmlPath)) {
      res.sendFile(htmlPath);
    } else {
      next();
    }
  });
  app.use(express.static(FRONTEND_DIST));
  app.use((_req, res) => {
    res.status(404).sendFile(path.join(FRONTEND_DIST, "404.html"));
  });
} else {
  // Local dev: frontend runs separately via `next dev` on its own port.
  app.get("/", (_req, res) => res.json({ status: "ok" }));
}

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
