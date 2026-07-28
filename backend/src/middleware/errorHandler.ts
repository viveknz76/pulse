import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import multer from "multer";
import { AvatarUploadError } from "./avatarUpload";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (res.headersSent) {
    return _next(err);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        return res.status(409).json({ error: "A record with those details already exists" });
      case "P2003":
        return res.status(409).json({ error: "The operation conflicts with a related record" });
      case "P2025":
        return res.status(404).json({ error: "Record not found" });
    }
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Avatar must be smaller than 5 MB."
        : "Unable to upload that avatar.";
    return res.status(400).json({ error: message });
  }

  if (err instanceof AvatarUploadError) {
    return res.status(400).json({ error: err.message });
  }

  console.error("Unhandled API error", err);
  return res.status(500).json({ error: "Internal server error" });
}
