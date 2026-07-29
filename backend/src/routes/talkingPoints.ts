import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";
import { shouldCreateRecurringSuccessor } from "../utils/talkingPointRecurrence";

const router = Router();

const createSchema = z.object({
  teamMemberId: z.string().min(1),
  content: z.string().min(1),
  recurring: z.boolean().default(false),
});

const updateSchema = z.object({
  content: z.string().min(1).optional(),
  resolved: z.boolean().optional(),
  recurring: z.boolean().optional(),
});

// GET /api/talking-points?teamMemberId=xxx&resolved=false
router.get("/", asyncHandler(async (req, res) => {
  const { teamMemberId, resolved } = req.query as { teamMemberId?: string; resolved?: string };
  const points = await prisma.talkingPoint.findMany({
    where: {
      deletedAt: null,
      teamMember: { deletedAt: null },
      OR: [{ checkInId: null }, { checkIn: { deletedAt: null } }],
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

  const point = await prisma.$transaction(async (tx) => {
    const existing = await tx.talkingPoint.findUnique({
      where: { id: req.params.id },
      include: { renewedTo: true },
    });
    if (!existing || existing.deletedAt) return null;

    const updated = await tx.talkingPoint.update({
      where: { id: existing.id },
      data: {
        ...parsed.data,
        ...(parsed.data.resolved !== undefined
          ? { resolvedAt: parsed.data.resolved ? new Date() : null }
          : {}),
      },
    });

    if (
      shouldCreateRecurringSuccessor({
        finalizingOccurrence: parsed.data.resolved === true,
        recurring: updated.recurring,
        resolved: updated.resolved,
        successorExists: !!existing.renewedTo,
      })
    ) {
      await tx.talkingPoint.create({
        data: {
          content: updated.content,
          recurring: true,
          teamMemberId: updated.teamMemberId,
          renewedFromId: updated.id,
        },
      });
    }

    return updated;
  });
  if (!point) return res.status(404).json({ error: "Talking point not found" });
  res.json(point);
}));

// DELETE /api/talking-points/:id  — soft delete.
router.delete("/:id", asyncHandler(async (req, res) => {
  await prisma.talkingPoint.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date() },
  });
  res.status(204).send();
}));

export default router;
