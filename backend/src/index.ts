import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth";
import teamMemberRoutes from "./routes/teamMembers";
import checkInRoutes from "./routes/checkins";
import actionItemRoutes from "./routes/actionItems";
import talkingPointRoutes from "./routes/talkingPoints";
import reviewRoutes from "./routes/review";
import { requireAuth } from "./middleware/auth";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { avatarUploadDir } from "./middleware/avatarUpload";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/uploads", requireAuth, express.static(avatarUploadDir));

// Everything below requires an authenticated session.
app.use("/api/team-members", requireAuth, teamMemberRoutes);
app.use("/api/check-ins", requireAuth, checkInRoutes);
app.use("/api/action-items", requireAuth, actionItemRoutes);
app.use("/api/talking-points", requireAuth, talkingPointRoutes);
app.use("/api/review", requireAuth, reviewRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Check-in API listening on port ${port}`);
});
