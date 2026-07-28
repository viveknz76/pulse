import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { validateJwtSecret } from "../utils/validateJwtSecret";

export interface AuthedRequest extends Request {
  user?: { email: string; name?: string };
}

const JWT_SECRET = validateJwtSecret(process.env.JWT_SECRET);
export const AUTH_COOKIE_NAME = "checkin_session";

export function signSession(payload: { email: string; name?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { email: string; name?: string };
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

/** Checks whether a Google-verified email is allowed to use this app. */
export function isEmailAllowed(email: string): boolean {
  const allowedEmails = (process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const allowedDomain = (process.env.ALLOWED_DOMAIN || "").trim().toLowerCase();
  const allowDomainAccess = process.env.ALLOW_DOMAIN_ACCESS === "true";

  const normalized = email.toLowerCase();
  if (allowedEmails.includes(normalized)) return true;
  if (allowDomainAccess && allowedDomain && normalized.endsWith(`@${allowedDomain}`)) return true;

  // If neither is configured, fail closed (nobody allowed) rather than open.
  return false;
}
