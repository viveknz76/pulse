import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

const router = Router();

const updateSchema = z.object({
  description: z.string().min(1).optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

// GET /api/action-items?status=OPEN&teamMemberId=xxx
router.get("/", async (req, res) => {
  const { status, teamMemberId } = req.query as { status?: string; teamMemberId?: string };
  const items = await prisma.actionItem.findMany({
    where: {
      carriedOverTo: { is: null },
      ...(status ? { status: status as any } : {}),
      ...(teamMemberId ? { teamMemberId } : {}),
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: { teamMember: true },
  });
  res.json(items);
});

// PATCH /api/action-items/:id
router.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { dueDate, ...rest } = parsed.data;
  try {
    const item = await prisma.actionItem.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        ...(rest.status === "DONE" ? { completedAt: new Date() } : {}),
      },
    });
    res.json(item);
  } catch {
    res.status(404).json({ error: "Action item not found" });
  }
});

/**
 * POST /api/action-items/:id/carry-over
 * Creates a fresh OPEN action item linked back to this one (for rolling an
 * incomplete item into the next check-in), and marks the old one as carried
 * over rather than losing it.
 */
router.post("/:id/carry-over", async (req, res) => {
  const original = await prisma.actionItem.findUnique({ where: { id: req.params.id } });
  if (!original) return res.status(404).json({ error: "Action item not found" });

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
});

// DELETE /api/action-items/:id
router.delete("/:id", async (req, res) => {
  try {
    await prisma.actionItem.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Action item not found" });
  }
});

export default router;
