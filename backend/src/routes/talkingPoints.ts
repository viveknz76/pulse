import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

const createSchema = z.object({
  teamMemberId: z.string().min(1),
  content: z.string().min(1),
});

const updateSchema = z.object({
  content: z.string().min(1).optional(),
  resolved: z.boolean().optional(),
});

// GET /api/talking-points?teamMemberId=xxx&resolved=false
router.get("/", asyncHandler(async (req, res) => {
  const { teamMemberId, resolved } = req.query as { teamMemberId?: string; resolved?: string };
  const points = await prisma.talkingPoint.findMany({
    where: {
      deletedAt: null,
      teamMember: { deletedAt: null },
      ...(teamMemberId ? { teamMemberId } : {}),
      ...(resolved !== undefined ? { resolved: resolved === "true" } : {}),
    },
    orderBy: { createdAt: "asc" },
  });
  res.json(points);
}));

// POST /api/talking-points
router.post("/", asyncHandler(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const point = await prisma.talkingPoint.create({ data: parsed.data });
  res.status(201).json(point);
}));

// PATCH /api/talking-points/:id
router.patch("/:id", asyncHandler(async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const point = await prisma.talkingPoint.update({
      where: { id: req.params.id },
      data: {
        ...parsed.data,
        ...(parsed.data.resolved !== undefined
          ? { resolvedAt: parsed.data.resolved ? new Date() : null }
          : {}),
      },
    });
    res.json(point);
  } catch {
    res.status(404).json({ error: "Talking point not found" });
  }
}));

// DELETE /api/talking-points/:id  — soft delete.
router.delete("/:id", asyncHandler(async (req, res) => {
  try {
    await prisma.talkingPoint.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Talking point not found" });
  }
}));

export default router;
