import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { TeamMember } from "../types";
import { MemberAvatar } from "../components/MemberAvatar";
import { PageLoading } from "../components/PageLoading";
import { PageTitle, SectionLabel } from "../components/Typography";
import { StatusDot } from "../components/StatusDot";
import { EditMemberDialog } from "../components/EditMemberDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TeamMemberDetail() {
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<TeamMember | null>(null);
  const [newPoint, setNewPoint] = useState("");
  const [addingPoint, setAddingPoint] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingPointId, setEditingPointId] = useState<string | null>(null);
  const [editingPointContent, setEditingPointContent] = useState("");
  const [savingPoint, setSavingPoint] = useState(false);
  const navigate = useNavigate();

  function load() {
    if (id) api.get<TeamMember>(`/api/team-members/${id}`).then(setMember);
  }

  useEffect(load, [id]);

  async function startCheckIn() {
    if (!member) return;
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
      load();
    } finally {
      setAddingPoint(false);
    }
  }

  async function resolveTalkingPoint(pointId: string) {
    await api.patch(`/api/talking-points/${pointId}`, { resolved: true });
    load();
  }

  async function removeTalkingPoint(pointId: string) {
    await api.delete(`/api/talking-points/${pointId}`);
    load();
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
      load();
    } finally {
      setSavingPoint(false);
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
          <Button onClick={startCheckIn}>Start check-in</Button>
        </div>
      </div>

      {member.notes && (
        <p className="mb-8 rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
          {member.notes}
        </p>
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
                  <button
                    type="submit"
                    className="cursor-pointer text-[0.8rem] font-semibold text-primary transition-opacity hover:opacity-70 disabled:opacity-50"
                    disabled={savingPoint || !editingPointContent.trim()}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="cursor-pointer text-[0.8rem] font-semibold text-muted-foreground transition-opacity hover:opacity-70"
                    onClick={cancelEditPoint}
                  >
                    Cancel
                  </button>
                </form>
              </li>
            ) : (
              <li
                key={t.id}
                className="flex items-center gap-2.5 border-b border-border py-3.5 text-sm last:border-b-0"
              >
                <StatusDot status="OPEN" />
                <span className="flex-1">{t.content}</span>
                <button
                  className="cursor-pointer text-[0.8rem] font-semibold text-muted-foreground transition-opacity hover:opacity-70"
                  onClick={() => startEditPoint(t.id, t.content)}
                >
                  Edit
                </button>
                <button
                  className="cursor-pointer text-[0.8rem] font-semibold text-primary transition-opacity hover:opacity-70"
                  onClick={() => resolveTalkingPoint(t.id)}
                >
                  Mark discussed
                </button>
                <button
                  className="cursor-pointer text-[0.8rem] font-semibold text-destructive transition-opacity hover:opacity-70"
                  onClick={() => removeTalkingPoint(t.id)}
                >
                  Remove
                </button>
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
        {completedCheckIns.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-border border-l-2 border-l-primary bg-card p-6"
          >
            <div className="mb-2.5 text-[0.85rem] font-semibold text-foreground">
              {new Date(c.completedAt || c.scheduledDate).toLocaleDateString()}
            </div>
            {c.wins && (
              <p className="my-1.5 text-[0.92rem] leading-relaxed">
                <strong>Wins</strong> — {c.wins}
              </p>
            )}
            {c.challenges && (
              <p className="my-1.5 text-[0.92rem] leading-relaxed">
                <strong>Challenges</strong> — {c.challenges}
              </p>
            )}
            {c.growthNotes && (
              <p className="my-1.5 text-[0.92rem] leading-relaxed">
                <strong>Growth</strong> — {c.growthNotes}
              </p>
            )}
            {c.actionItems.length > 0 && (
              <p className="my-1.5 text-[0.92rem] leading-relaxed">
                <strong>Actions</strong> — {c.actionItems.map((a) => a.description).join("; ")}
              </p>
            )}
          </div>
        ))}
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
