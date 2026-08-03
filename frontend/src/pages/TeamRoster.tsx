import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, UserMinus, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { api } from "../api/client";
import { Cadence, Team, TeamMember } from "../types";
import { IconActionButton } from "../components/IconActionButton";
import { MemberAvatar } from "../components/MemberAvatar";
import { PageLoading } from "../components/PageLoading";
import { PageTitle } from "../components/Typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const CADENCE_LABELS: Record<Cadence, string> = {
  WEEKLY: "Weekly",
  FORTNIGHTLY: "Fortnightly",
  MONTHLY: "Monthly",
};

export default function TeamRoster() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [moving, setMoving] = useState(false);

  const isUnassigned = id === "unassigned";

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

  if (!teams || !members) return <PageLoading />;

  const team = isUnassigned ? null : teams.find((item) => item.id === id);
  if (!isUnassigned && (!team || team.archivedAt)) {
    return <Navigate to="/teams" replace />;
  }

  const roster = members.filter(
    (member) => !member.deletedAt && (isUnassigned ? !member.teamId : member.teamId === id)
  );
  const candidates = isUnassigned
    ? []
    : members.filter((member) => !member.deletedAt && member.teamId !== id);

  async function moveMember() {
    if (!selectedMemberId || !team) return;
    const member = candidates.find((item) => item.id === selectedMemberId);
    if (!member) return;
    setMoving(true);
    try {
      await api.patch(`/api/team-members/${member.id}`, { teamId: team.id });
      toast.success(`${member.name} moved to ${team.name}`);
      setSelectedMemberId("");
      load();
    } finally {
      setMoving(false);
    }
  }

  async function unassignMember(member: TeamMember) {
    await api.patch(`/api/team-members/${member.id}`, { teamId: null });
    toast.success(`${member.name} is now unassigned`);
    load();
  }

  const title = isUnassigned ? "Unassigned people" : team?.name || "Team";

  return (
    <div className="animate-in fade-in duration-300">
      <Link
        to="/teams"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to teams
      </Link>

      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageTitle className="mb-2">{title}</PageTitle>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {isUnassigned
              ? "People who are ready to be placed in a primary team."
              : team?.description || "The people who belong to this primary team."}
          </p>
        </div>
        {!isUnassigned && candidates.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedMemberId || undefined} onValueChange={setSelectedMemberId}>
              <SelectTrigger className="w-[250px]" aria-label={`Choose a member to move to ${team?.name}`}>
                <SelectValue placeholder="Choose a person" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}{member.team ? ` · ${member.team.name}` : " · Unassigned"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={moveMember} disabled={!selectedMemberId || moving}>
              {moving ? "Moving…" : "Move to team"}
            </Button>
          </div>
        )}
      </div>

      {roster.length === 0 ? (
        <Card className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
            <UsersRound className="size-5" />
          </div>
          <p className="font-semibold">{isUnassigned ? "Everyone has a team" : "No members yet"}</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {isUnassigned
              ? "There are no people waiting to be assigned."
              : "Choose a person above to make this their primary team."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Cadence</TableHead>
                <TableHead>Next due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <MemberAvatar
                        id={member.id}
                        name={member.name}
                        avatarUrl={member.avatarUrl}
                        avatarSeed={member.avatarSeed}
                        size="sm"
                      />
                      <div>
                        <Link to={`/team/${member.id}`} className="font-semibold text-foreground hover:text-primary">
                          {member.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{member.role || "No role recorded"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{CADENCE_LABELS[member.cadence]}</TableCell>
                  <TableCell>
                    {member.checkInsOnHold && member.checkInsResumeOn
                      ? `Returns ${new Date(member.checkInsResumeOn).toLocaleDateString()}`
                      : new Date(member.nextDueDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.checkInsOnHold ? "warning" : member.active ? "success" : "secondary"}>
                      {member.checkInsOnHold ? member.checkInsHoldReason || "On leave" : member.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <IconActionButton
                        label={`Edit ${member.name}`}
                        icon={<Pencil />}
                        onClick={() => navigate(`/team/${member.id}/edit`)}
                      />
                      {!isUnassigned && (
                        <IconActionButton
                          label={`Move ${member.name} to Unassigned`}
                          icon={<UserMinus />}
                          onClick={() => unassignMember(member)}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
