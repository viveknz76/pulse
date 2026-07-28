import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

const updateSchema = z.object({
  description: z.string().min(1).optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

const listQuerySchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE"]).optional(),
  teamMemberId: z.string().optional(),
});

// GET /api/action-items?status=OPEN&teamMemberId=xxx
router.get("/", asyncHandler(async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { status, teamMemberId } = parsed.data;
  const items = await prisma.actionItem.findMany({
    where: {
      carriedOverTo: { is: null },
      deletedAt: null,
      teamMember: { deletedAt: null },
      OR: [{ checkInId: null }, { checkIn: { deletedAt: null } }],
      ...(status ? { status } : {}),
      ...(teamMemberId ? { teamMemberId } : {}),
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: { teamMember: true },
  });
  res.json(items);
}));

// PATCH /api/action-items/:id
router.patch("/:id", asyncHandler(async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { dueDate, ...rest } = parsed.data;
  const item = await prisma.actionItem.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      ...(rest.status === "DONE" ? { completedAt: new Date() } : {}),
    },
  });
  res.json(item);
}));

/**
 * POST /api/action-items/:id/carry-over
 * Creates a fresh OPEN action item linked back to this one (for rolling an
 * incomplete item into the next check-in), and marks the old one as carried
 * over rather than losing it.
 */
router.post("/:id/carry-over", asyncHandler(async (req, res) => {
  const original = await prisma.actionItem.findUnique({ where: { id: req.params.id } });
  if (!original || original.deletedAt) return res.status(404).json({ error: "Action item not found" });

  const created = await prisma.actionItem.create({
    data: {
      description: original.description,
      status: "OPEN",
      dueDate: original.dueDate,
      teamMemberId: original.teamMemberId,
      carriedOverFromId: original.id,
    },
  });

  res.status(201).json(created);
}));

// DELETE /api/action-items/:id  — soft delete.
router.delete("/:id", asyncHandler(async (req, res) => {
  await prisma.actionItem.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date() },
  });
  res.status(204).send();
}));

export default router;
