import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Archive, Pencil, Plus, RotateCcw, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { api } from "../api/client";
import { Team, TeamMember } from "../types";
import { IconActionButton } from "../components/IconActionButton";
import { PageLoading } from "../components/PageLoading";
import { TeamDialog } from "../components/TeamDialog";
import { PageTitle, SectionLabel } from "../components/Typography";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Teams() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [archivingTeam, setArchivingTeam] = useState<Team | null>(null);

  function load() {
    Promise.all([
      api.get<Team[]>("/api/teams"),
      api.get<TeamMember[]>("/api/team-members"),
    ]).then(([nextTeams, nextMembers]) => {
      setTeams(nextTeams);
      setMembers(nextMembers);
    });
  }

  useEffect(load, []);

  function startCreate() {
    setEditingTeam(null);
    setDialogOpen(true);
  }

  function startEdit(team: Team) {
    setEditingTeam(team);
    setDialogOpen(true);
  }

  async function archiveTeam() {
    if (!archivingTeam) return;
    await api.post(`/api/teams/${archivingTeam.id}/archive`);
    toast.success(`${archivingTeam.name} archived. Its members are now unassigned.`);
    setArchivingTeam(null);
    load();
  }

  async function restoreTeam(team: Team) {
    await api.post(`/api/teams/${team.id}/restore`);
    toast.success(`${team.name} restored`);
    load();
  }

  if (!teams || !members) return <PageLoading />;

  const activeTeams = teams.filter((team) => !team.archivedAt);
  const archivedTeams = teams.filter((team) => team.archivedAt);
  const unassignedCount = members.filter((member) => !member.deletedAt && !member.teamId).length;

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageTitle className="mb-2">Teams</PageTitle>
          <p className="text-sm text-muted-foreground">Create clear homes for the people you support.</p>
        </div>
        <Button onClick={startCreate}>
          <Plus />
          Create team
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {activeTeams.map((team) => (
          <Card key={team.id} className="flex min-h-48 flex-col">
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="truncate text-base">{team.name}</CardTitle>
                <CardDescription className="mt-1 line-clamp-2">
                  {team.description || "A shared home for this team."}
                </CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <IconActionButton label={`Edit ${team.name}`} icon={<Pencil />} onClick={() => startEdit(team)} />
                <IconActionButton label={`Archive ${team.name}`} icon={<Archive />} onClick={() => setArchivingTeam(team)} />
              </div>
            </CardHeader>
            <CardContent className="mt-auto flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UsersRound className="size-4" />
                {team.memberCount} {team.memberCount === 1 ? "member" : "members"}
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/teams/${team.id}`}>View team</Link>
              </Button>
            </CardContent>
          </Card>
        ))}

        <Card className="flex min-h-48 flex-col border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Unassigned</CardTitle>
            <CardDescription>People who do not currently have a primary team.</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UsersRound className="size-4" />
              {unassignedCount} {unassignedCount === 1 ? "member" : "members"}
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/teams/unassigned">View people</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {activeTeams.length === 0 && (
        <p className="mt-5 text-sm text-muted-foreground">Create your first team, then add people to it.</p>
      )}

      {archivedTeams.length > 0 && (
        <section className="mt-10">
          <SectionLabel>Archived teams</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {archivedTeams.map((team) => (
              <Card key={team.id} className="flex items-center justify-between gap-3 p-4 opacity-75">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{team.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Archived</p>
                </div>
                <IconActionButton
                  label={`Restore ${team.name}`}
                  icon={<RotateCcw />}
                  onClick={() => restoreTeam(team)}
                />
              </Card>
            ))}
          </div>
        </section>
      )}

      <TeamDialog
        team={editingTeam}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={load}
      />

      <AlertDialog open={!!archivingTeam} onOpenChange={(open) => !open && setArchivingTeam(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {archivingTeam?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The team will be hidden from active choices and its {archivingTeam?.memberCount || 0} members will become unassigned. Their check-ins and history will not change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={archiveTeam}>Archive team</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
