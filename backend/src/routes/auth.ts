import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import {
  AUTH_COOKIE_NAME,
  AuthedRequest,
  isEmailAllowed,
  requireAuth,
  signSession,
} from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const loginSchema = z.object({
  credential: z.string().min(1), // Google ID token from the frontend Sign-In button
});

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.COOKIE_SECURE === "true",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

router.post("/google", asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Missing Google credential" });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: parsed.data.credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) {
      return res.status(401).json({ error: "Google account email not verified" });
    }

    if (!isEmailAllowed(payload.email)) {
      return res.status(403).json({ error: "This account is not authorized to use this app" });
    }

    const token = signSession({ email: payload.email, name: payload.name });
    res.cookie(AUTH_COOKIE_NAME, token, cookieOptions);
    return res.json({ email: payload.email, name: payload.name });
  } catch (err) {
    console.error("Google auth verification failed", err);
    return res.status(401).json({ error: "Invalid Google credential" });
  }
}));

router.post("/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME);
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req: AuthedRequest, res) => {
  res.json({ user: req.user });
});

export default router;
