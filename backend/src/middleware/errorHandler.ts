import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";

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

  console.error("Unhandled API error", err);
  return res.status(500).json({ error: "Internal server error" });
}
