import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Check, Copy, Mail, Pencil, Trash2, X } from "lucide-react";
import { api } from "../api/client";
import { CheckIn, TeamMember } from "../types";
import { MemberAvatar } from "../components/MemberAvatar";
import { PageLoading } from "../components/PageLoading";
import { PageTitle, SectionLabel } from "../components/Typography";
import { StatusDot } from "../components/StatusDot";
import { EditMemberDialog } from "../components/EditMemberDialog";
import { IconActionButton } from "../components/IconActionButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { buildCheckInSummaryText } from "@/lib/checkInSummary";
import { energyLevelLabel } from "@/lib/energyPulse";

function timeAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? "s" : ""} ago`;
  }
  const years = Math.floor(days / 365);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

function HistoryField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <p className="text-[0.92rem] leading-relaxed whitespace-pre-line">{children}</p>
    </div>
  );
}

export default function TeamMemberDetail() {
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<TeamMember | null>(null);
  const [newPoint, setNewPoint] = useState("");
  const [addingPoint, setAddingPoint] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingPointId, setEditingPointId] = useState<string | null>(null);
  const [editingPointContent, setEditingPointContent] = useState("");
  const [savingPoint, setSavingPoint] = useState(false);
  const [sendingSummaryIds, setSendingSummaryIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const load = useCallback(async (shouldIgnore: () => boolean = () => false) => {
    if (!id) return;

    try {
      const nextMember = await api.get<TeamMember>(`/api/team-members/${id}`);
      if (!shouldIgnore()) setMember(nextMember);
    } catch {
      if (!shouldIgnore()) toast.error("Unable to load this team member. Please try again.");
    }
  }, [id]);

  useEffect(() => {
    let ignore = false;
    setMember(null);
    void load(() => ignore);

    return () => {
      ignore = true;
    };
  }, [load]);

  async function startCheckIn() {
    if (!member) return;
    if (member.activeCheckInId) {
      navigate(`/check-ins/${member.activeCheckInId}`);
      return;
    }
    const checkIn = await api.post<{ id: string }>("/api/check-ins", {
      teamMemberId: member.id,
      scheduledDate: new Date().toISOString(),
    });
    navigate(`/check-ins/${checkIn.id}`);
  }

  async function addTalkingPoint(e: FormEvent) {
    e.preventDefault();
    if (!member || !newPoint.trim()) return;
    setAddingPoint(true);
    try {
      await api.post("/api/talking-points", { teamMemberId: member.id, content: newPoint.trim() });
      setNewPoint("");
      await load();
    } finally {
      setAddingPoint(false);
    }
  }

  async function resolveTalkingPoint(pointId: string) {
    await api.patch(`/api/talking-points/${pointId}`, { resolved: true });
    await load();
  }

  async function removeTalkingPoint(pointId: string) {
    await api.delete(`/api/talking-points/${pointId}`);
    await load();
  }

  function startEditPoint(pointId: string, content: string) {
    setEditingPointId(pointId);
    setEditingPointContent(content);
  }

  function cancelEditPoint() {
    setEditingPointId(null);
    setEditingPointContent("");
  }

  async function saveEditPoint(e: FormEvent) {
    e.preventDefault();
    if (!editingPointId || !editingPointContent.trim()) return;
    setSavingPoint(true);
    try {
      await api.patch(`/api/talking-points/${editingPointId}`, {
        content: editingPointContent.trim(),
      });
      cancelEditPoint();
      await load();
    } finally {
      setSavingPoint(false);
    }
  }

  function buildSummaryForCheckIn(c: CheckIn): string {
    return buildCheckInSummaryText({
      teamMemberName: member?.name || "",
      date: new Date(c.completedAt || c.scheduledDate),
      wins: c.wins,
      challenges: c.challenges,
      growthNotes: c.growthNotes,
      energyLevel: c.energyLevel,
      talkingPoints: c.talkingPoints || [],
      actionItems: c.actionItems,
    });
  }

  async function copyCheckInSummary(c: CheckIn) {
    if (!member) return;
    await navigator.clipboard.writeText(buildSummaryForCheckIn(c));
    toast.success("Summary copied to clipboard");
  }

  async function sendCheckInSummaryEmail(c: CheckIn) {
    if (!member || sendingSummaryIds.has(c.id)) return;
    setSendingSummaryIds((ids) => new Set(ids).add(c.id));
    try {
      const dateLabel = new Date(c.completedAt || c.scheduledDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      await api.post(`/api/check-ins/${c.id}/send-summary`, {
        subject: `Check-in summary — ${member.name} — ${dateLabel}`,
        body: buildSummaryForCheckIn(c),
      });
      toast.success(`Summary emailed to ${member.email}`);
    } catch {
      toast.error("Unable to send the email. Please try again.");
    } finally {
      setSendingSummaryIds((ids) => {
        const next = new Set(ids);
        next.delete(c.id);
        return next;
      });
    }
  }

  if (!member) return <PageLoading />;

  const completedCheckIns = (member.checkIns || []).filter((c) => c.status === "COMPLETED");
  const openActionItems = (member.actionItems || []).filter((a) => a.status !== "DONE");
  const openTalkingPoints = (member.talkingPoints || []).filter((t) => !t.resolved);

  return (
    <div className="animate-in fade-in duration-300">
      <Link
        to="/team"
        className="text-[0.82rem] font-semibold text-muted-foreground transition-colors hover:text-primary"
      >
        ← Team
      </Link>
      <div className="mt-1.5 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <MemberAvatar id={member.id} name={member.name} size="lg" />
          <div>
            <PageTitle size="sm">{member.name}</PageTitle>
            {member.role && (
              <p className="mt-0.5 text-[0.9rem] text-[var(--muted-foreground-2)]">{member.role}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button onClick={startCheckIn}>
            {member.activeCheckInId ? "Resume check-in" : "Start check-in"}
          </Button>
        </div>
      </div>

      {member.notes && (
        <Card className="mb-8 p-4 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
          {member.notes}
        </Card>
      )}

      <SectionLabel>Talking points ({openTalkingPoints.length})</SectionLabel>
      <form className="mb-4 flex gap-2.5" onSubmit={addTalkingPoint}>
        <Input
          className="flex-1"
          placeholder="Something to bring up next check-in…"
          value={newPoint}
          onChange={(e) => setNewPoint(e.target.value)}
        />
        <Button type="submit" disabled={addingPoint || !newPoint.trim()}>
          Add
        </Button>
      </form>
      {openTalkingPoints.length === 0 && (
        <p className="text-sm text-muted-foreground">No talking points queued up.</p>
      )}
      {openTalkingPoints.length > 0 && (
        <ul className="mb-10 rounded-xl border border-border bg-card px-5">
          {openTalkingPoints.map((t) =>
            editingPointId === t.id ? (
              <li key={t.id} className="border-b border-border py-3.5 last:border-b-0">
                <form className="flex items-center gap-2.5" onSubmit={saveEditPoint}>
                  <StatusDot status="OPEN" />
                  <Input
                    autoFocus
                    className="flex-1"
                    value={editingPointContent}
                    onChange={(e) => setEditingPointContent(e.target.value)}
                  />
                  <IconActionButton
                    label="Save"
                    icon={<Check />}
                    type="submit"
                    variant="success"
                    disabled={savingPoint || !editingPointContent.trim()}
                  />
                  <IconActionButton label="Cancel" icon={<X />} onClick={cancelEditPoint} />
                </form>
              </li>
            ) : (
              <li
                key={t.id}
                className="flex items-center gap-2.5 border-b border-border py-3.5 text-sm last:border-b-0"
              >
                <StatusDot status="OPEN" />
                <span className="flex-1">{t.content}</span>
                <IconActionButton
                  label="Edit"
                  icon={<Pencil />}
                  onClick={() => startEditPoint(t.id, t.content)}
                />
                <IconActionButton
                  label="Mark discussed"
                  icon={<Check />}
                  variant="primary"
                  onClick={() => resolveTalkingPoint(t.id)}
                />
                <IconActionButton
                  label="Remove"
                  icon={<Trash2 />}
                  variant="danger"
                  onClick={() => removeTalkingPoint(t.id)}
                />
              </li>
            )
          )}
        </ul>
      )}

      <SectionLabel>Open action items ({openActionItems.length})</SectionLabel>
      {openActionItems.length === 0 && (
        <p className="text-sm text-muted-foreground">No open action items.</p>
      )}
      {openActionItems.length > 0 && (
        <ul className="mb-10 rounded-xl border border-border bg-card px-5">
          {openActionItems.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2.5 border-b border-border py-3.5 text-sm last:border-b-0"
            >
              <StatusDot status={a.status} />
              <span className="flex-1">{a.description}</span>
              {a.dueDate && (
                <span className="text-sm text-muted-foreground">
                  due {new Date(a.dueDate).toLocaleDateString()}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <SectionLabel>Check-in history</SectionLabel>
      {completedCheckIns.length === 0 && (
        <p className="text-sm text-muted-foreground">No completed check-ins yet.</p>
      )}
      <div className="flex flex-col gap-4">
        {completedCheckIns.map((c) => {
          const date = c.completedAt || c.scheduledDate;
          const talkingPoints = c.talkingPoints || [];
          const hasNarrative = !!(c.energyLevel || c.wins || c.challenges || c.growthNotes);
          const hasStructured = talkingPoints.length > 0 || c.actionItems.length > 0;

          return (
            <Card key={c.id}>
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle>
                    {new Date(date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </CardTitle>
                  <CardDescription>{timeAgo(date)}</CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <IconActionButton
                    label={member.email ? "Send email" : "No email on file for this team member"}
                    icon={<Mail />}
                    onClick={() => sendCheckInSummaryEmail(c)}
                    disabled={sendingSummaryIds.has(c.id) || !member.email}
                  />
                  <IconActionButton
                    label="Copy summary"
                    icon={<Copy />}
                    onClick={() => copyCheckInSummary(c)}
                  />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {hasNarrative && (
                  <div className="flex flex-col gap-3">
                    {c.energyLevel && (
                      <HistoryField label="Starting pulse">
                        {energyLevelLabel(c.energyLevel)}
                      </HistoryField>
                    )}
                    {c.wins && <HistoryField label="Wins">{c.wins}</HistoryField>}
                    {c.challenges && <HistoryField label="Challenges">{c.challenges}</HistoryField>}
                    {c.growthNotes && <HistoryField label="Growth">{c.growthNotes}</HistoryField>}
                  </div>
                )}

                {hasStructured && (
                  <div
                    className={cn(
                      "flex flex-col gap-4",
                      hasNarrative && "border-t border-border pt-4"
                    )}
                  >
                    {talkingPoints.length > 0 && (
                      <div>
                        <div className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          Talking points ({talkingPoints.length})
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {talkingPoints.map((t) => (
                            <div key={t.id} className="flex items-center gap-2 text-[0.92rem]">
                              <StatusDot status={t.resolved ? "DONE" : "OPEN"} />
                              <span className={cn("flex-1", !t.resolved && "text-muted-foreground")}>
                                {t.content}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {c.actionItems.length > 0 && (
                      <div>
                        <div className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          Action items ({c.actionItems.length})
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {c.actionItems.map((a) => (
                            <div key={a.id} className="flex items-center gap-2 text-[0.92rem]">
                              <StatusDot status={a.status} />
                              <span className="flex-1">{a.description}</span>
                              {a.dueDate && (
                                <span className="text-xs text-muted-foreground">
                                  due {new Date(a.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!hasNarrative && !hasStructured && (
                  <p className="text-sm text-muted-foreground">No notes recorded for this check-in.</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <EditMemberDialog
        member={member}
        open={editing}
        onOpenChange={setEditing}
        onSaved={load}
      />
    </div>
  );
}
