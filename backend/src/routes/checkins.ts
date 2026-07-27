import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

const router = Router();

const actionItemInput = z.object({
  id: z.string().optional(), // present if updating an existing (e.g. carried-over) item
  description: z.string().min(1),
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE"]).default("OPEN"),
  dueDate: z.string().datetime().optional().nullable(),
});

const talkingPointInput = z.object({
  id: z.string().optional(), // present if updating an existing (e.g. carried-over) point
  content: z.string().min(1),
  resolved: z.boolean().default(false),
});

const createSchema = z.object({
  teamMemberId: z.string().min(1),
  scheduledDate: z.string().datetime(),
});

const completeSchema = z.object({
  wins: z.string().optional(),
  challenges: z.string().optional(),
  growthNotes: z.string().optional(),
  actionItems: z.array(actionItemInput).default([]),
  talkingPoints: z.array(talkingPointInput).default([]),
});

// GET /api/check-ins?teamMemberId=xxx
router.get("/", async (req, res) => {
  const teamMemberId = req.query.teamMemberId as string | undefined;
  const checkIns = await prisma.checkIn.findMany({
    where: teamMemberId ? { teamMemberId } : undefined,
    orderBy: { scheduledDate: "desc" },
    include: { actionItems: true, teamMember: true },
  });
  res.json(checkIns);
});

// GET /api/check-ins/:id
router.get("/:id", async (req, res) => {
  const checkIn = await prisma.checkIn.findUnique({
    where: { id: req.params.id },
    include: { actionItems: true, talkingPoints: true, teamMember: true },
  });
  if (!checkIn) return res.status(404).json({ error: "Check-in not found" });
  res.json(checkIn);
});

// POST /api/check-ins  — start/schedule a new check-in
router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const checkIn = await prisma.checkIn.create({
    data: {
      teamMemberId: parsed.data.teamMemberId,
      scheduledDate: new Date(parsed.data.scheduledDate),
      status: "SCHEDULED",
    },
  });
  res.status(201).json(checkIn);
});

// POST /api/check-ins/:id/complete
// Records notes and this check-in's action items (new + carried-over/updated),
// then marks the check-in COMPLETED.
router.post("/:id/complete", async (req, res) => {
  const parsed = completeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const checkIn = await prisma.checkIn.findUnique({ where: { id: req.params.id } });
  if (!checkIn) return res.status(404).json({ error: "Check-in not found" });

  const { wins, challenges, growthNotes, actionItems, talkingPoints } = parsed.data;

  const result = await prisma.$transaction(async (tx: any) => {
    const updated = await tx.checkIn.update({
      where: { id: checkIn.id },
      data: {
        wins,
        challenges,
        growthNotes,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    for (const item of actionItems) {
      if (item.id) {
        await tx.actionItem.update({
          where: { id: item.id },
          data: {
            description: item.description,
            status: item.status,
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
            completedAt: item.status === "DONE" ? new Date() : null,
            checkInId: checkIn.id,
          },
        });
      } else {
        await tx.actionItem.create({
          data: {
            description: item.description,
            status: item.status,
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
            teamMemberId: checkIn.teamMemberId,
            checkInId: checkIn.id,
          },
        });
      }
    }

    for (const point of talkingPoints) {
      if (point.id) {
        await tx.talkingPoint.update({
          where: { id: point.id },
          data: {
            content: point.content,
            resolved: point.resolved,
            resolvedAt: point.resolved ? new Date() : null,
            checkInId: checkIn.id,
          },
        });
      } else {
        await tx.talkingPoint.create({
          data: {
            content: point.content,
            resolved: point.resolved,
            resolvedAt: point.resolved ? new Date() : null,
            teamMemberId: checkIn.teamMemberId,
            checkInId: checkIn.id,
          },
        });
      }
    }

    return tx.checkIn.findUnique({
      where: { id: checkIn.id },
      include: { actionItems: true, talkingPoints: true },
    });
  });

  res.json(result);
});

// DELETE /api/check-ins/:id
router.delete("/:id", async (req, res) => {
  try {
    await prisma.checkIn.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Check-in not found" });
  }
});

export default router;
