import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

const teamSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).optional().or(z.literal("")),
});

async function hasNameConflict(name: string, excludeId?: string) {
  const existing = await prisma.team.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(existing);
}

router.get("/", asyncHandler(async (_req, res) => {
  const teams = await prisma.team.findMany({
    orderBy: [{ archivedAt: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { members: { where: { deletedAt: null } } },
      },
    },
  });

  res.json(teams.map(({ _count, ...team }) => ({
    ...team,
    memberCount: _count.members,
  })));
}));

router.post("/", asyncHandler(async (req, res) => {
  const parsed = teamSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (await hasNameConflict(parsed.data.name)) {
    return res.status(409).json({ error: "A team with this name already exists" });
  }

  const team = await prisma.team.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
    },
  });
  res.status(201).json({ ...team, memberCount: 0 });
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const parsed = teamSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.team.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Team not found" });
  if (existing.archivedAt) return res.status(400).json({ error: "Restore this team before editing it" });
  if (parsed.data.name && await hasNameConflict(parsed.data.name, existing.id)) {
    return res.status(409).json({ error: "A team with this name already exists" });
  }

  const team = await prisma.team.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description || null }
        : {}),
    },
    include: { _count: { select: { members: { where: { deletedAt: null } } } } },
  });
  const { _count, ...rest } = team;
  res.json({ ...rest, memberCount: _count.members });
}));

router.post("/:id/archive", asyncHandler(async (req, res) => {
  const existing = await prisma.team.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Team not found" });
  if (existing.archivedAt) return res.status(400).json({ error: "Team is already archived" });

  const [, team] = await prisma.$transaction([
    prisma.teamMember.updateMany({ where: { teamId: existing.id }, data: { teamId: null } }),
    prisma.team.update({ where: { id: existing.id }, data: { archivedAt: new Date() } }),
  ]);
  res.json({ ...team, memberCount: 0 });
}));

router.post("/:id/restore", asyncHandler(async (req, res) => {
  const existing = await prisma.team.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Team not found" });
  if (!existing.archivedAt) return res.status(400).json({ error: "Team is not archived" });

  const team = await prisma.team.update({
    where: { id: existing.id },
    data: { archivedAt: null },
  });
  res.json({ ...team, memberCount: 0 });
}));

export default router;
