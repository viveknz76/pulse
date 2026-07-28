import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { api } from "../api/client";
import { ActionItem, ActionItemStatus, CheckIn, TalkingPoint } from "../types";
import { PageTitle } from "../components/Typography";
import { PageLoading } from "../components/PageLoading";
import { IconActionButton } from "../components/IconActionButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DraftActionItem {
  id?: string; // set when this is an existing action item being carried over/edited
  description: string;
  status: ActionItemStatus;
  dueDate: string; // yyyy-mm-dd for the <input type="date">
}

interface DraftTalkingPoint {
  id?: string; // set when this is an existing (e.g. carried-over) talking point
  content: string;
  resolved: boolean;
}

function toDateInput(value?: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

const FIELD_LABEL = "mb-2 block text-[0.88rem] font-semibold text-foreground";
const FIELD_HINT = "mb-3 text-[0.85rem] text-muted-foreground";

export default function CheckInForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [checkIn, setCheckIn] = useState<CheckIn | null>(null);
  const [wins, setWins] = useState("");
  const [challenges, setChallenges] = useState("");
  const [growthNotes, setGrowthNotes] = useState("");
  const [items, setItems] = useState<DraftActionItem[]>([]);
  const [points, setPoints] = useState<DraftTalkingPoint[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  async function loadCheckIn() {
    if (!id) return;
    const ci = await api.get<CheckIn>(`/api/check-ins/${id}`);
    setCheckIn(ci);
    setWins(ci.wins || "");
    setChallenges(ci.challenges || "");
    setGrowthNotes(ci.growthNotes || "");

    // Pull in this person's still-open action items from prior check-ins so
    // they can be reviewed/updated/carried over as part of this one.
    const openItems = await api.get<ActionItem[]>(
      `/api/action-items?teamMemberId=${ci.teamMemberId}&status=OPEN`
    );
    const inProgressItems = await api.get<ActionItem[]>(
      `/api/action-items?teamMemberId=${ci.teamMemberId}&status=IN_PROGRESS`
    );
    const priorOpen = [...openItems, ...inProgressItems].filter((a) => a.checkInId !== ci.id);
    // Items already saved against this check-in from an earlier draft save.
    const alreadyHere = ci.actionItems || [];

    setItems(
      [...alreadyHere, ...priorOpen].map((a) => ({
        id: a.id,
        description: a.description,
        status: a.status,
        dueDate: toDateInput(a.dueDate),
      }))
    );

    // Pull in this person's still-open talking points so they can be
    // checked off (or left for next time) as part of this check-in.
    const openPoints = await api.get<TalkingPoint[]>(
      `/api/talking-points?teamMemberId=${ci.teamMemberId}&resolved=false`
    );
    const priorOpenPoints = openPoints.filter((t) => t.checkInId !== ci.id);
    const alreadyHerePoints = ci.talkingPoints || [];

    setPoints(
      [...alreadyHerePoints, ...priorOpenPoints].map((t) => ({
        id: t.id,
        content: t.content,
        resolved: t.resolved,
      }))
    );
  }

  useEffect(() => {
    loadCheckIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function addItem() {
    setItems([...items, { description: "", status: "OPEN", dueDate: "" }]);
  }

  function updateItem(index: number, patch: Partial<DraftActionItem>) {
    setItems(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function addPoint() {
    setPoints([...points, { content: "", resolved: false }]);
  }

  function updatePoint(index: number, patch: Partial<DraftTalkingPoint>) {
    setPoints(points.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function removePoint(index: number) {
    setPoints(points.filter((_, i) => i !== index));
  }

  function buildPayload() {
    return {
      wins,
      challenges,
      growthNotes,
      actionItems: items
        .filter((it) => it.description.trim())
        .map((it) => ({
          id: it.id,
          description: it.description.trim(),
          status: it.status,
          dueDate: it.dueDate ? new Date(it.dueDate).toISOString() : null,
        })),
      talkingPoints: points
        .filter((p) => p.content.trim())
        .map((p) => ({ id: p.id, content: p.content.trim(), resolved: p.resolved })),
    };
  }

  async function handleSaveDraft() {
    if (!checkIn) return;
    setSavingDraft(true);
    try {
      await api.post(`/api/check-ins/${checkIn.id}/save`, buildPayload());
      await loadCheckIn();
      setLastSavedAt(new Date());
      toast.success("Draft saved — come back anytime to finish it.");
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleComplete() {
    if (!checkIn) return;
    setSaving(true);
    try {
      await api.post(`/api/check-ins/${checkIn.id}/complete`, buildPayload());
      navigate(`/team/${checkIn.teamMemberId}`);
    } finally {
      setSaving(false);
    }
  }

  if (!checkIn) return <PageLoading />;

  return (
    <div className="max-w-[680px] animate-in fade-in duration-300">
      <PageTitle size="md">Check-in — {checkIn.teamMember?.name}</PageTitle>

      <div className="mb-6">
        <label className={FIELD_LABEL}>Talking points</label>
        <p className={FIELD_HINT}>
          Things to bring up in this check-in — check them off as you cover them, or leave open to
          carry into the next one.
        </p>
        {points.map((point, index) => (
          <div key={point.id ?? `new-point-${index}`} className="mb-2.5 flex items-center gap-2">
            <Checkbox
              checked={point.resolved}
              onCheckedChange={(checked) => updatePoint(index, { resolved: checked === true })}
            />
            <Input
              className={cn("flex-1", point.resolved && "text-muted-foreground line-through")}
              placeholder="Something to discuss"
              value={point.content}
              onChange={(e) => updatePoint(index, { content: e.target.value })}
            />
            <IconActionButton
              label="Remove"
              icon={<Trash2 />}
              variant="danger"
              onClick={() => removePoint(index)}
            />
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addPoint}>
          + Add talking point
        </Button>
      </div>

      <div className="mb-6">
        <label className={FIELD_LABEL}>Wins</label>
        <Textarea
          rows={3}
          value={wins}
          onChange={(e) => setWins(e.target.value)}
          placeholder="What's gone well since the last check-in?"
        />
      </div>

      <div className="mb-6">
        <label className={FIELD_LABEL}>Challenges</label>
        <Textarea
          rows={3}
          value={challenges}
          onChange={(e) => setChallenges(e.target.value)}
          placeholder="What's been difficult or blocked?"
        />
      </div>

      <div className="mb-6">
        <label className={FIELD_LABEL}>Growth</label>
        <Textarea
          rows={3}
          value={growthNotes}
          onChange={(e) => setGrowthNotes(e.target.value)}
          placeholder="Development, learning, career growth notes"
        />
      </div>

      <div className="mb-6">
        <label className={FIELD_LABEL}>Action items</label>
        <p className={FIELD_HINT}>
          Includes any open items carried over from previous check-ins — update their status or
          add new ones.
        </p>
        {items.map((item, index) => (
          <div key={item.id ?? `new-${index}`} className="mb-2.5 flex items-center gap-2">
            <Input
              className="flex-1"
              placeholder="Action item description"
              value={item.description}
              onChange={(e) => updateItem(index, { description: e.target.value })}
            />
            <Select
              value={item.status}
              onValueChange={(value) => updateItem(index, { status: value as ActionItemStatus })}
            >
              <SelectTrigger className="w-[130px] shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                <SelectItem value="DONE">Done</SelectItem>
              </SelectContent>
            </Select>
            <Input
              className="w-[150px] shrink-0"
              type="date"
              value={item.dueDate}
              onChange={(e) => updateItem(index, { dueDate: e.target.value })}
            />
            <IconActionButton
              label="Remove"
              icon={<Trash2 />}
              variant="danger"
              onClick={() => removeItem(index)}
            />
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addItem}>
          + Add action item
        </Button>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <Button size="lg" variant="success" onClick={handleComplete} disabled={saving || savingDraft}>
          {saving ? "Completing…" : "Complete check-in"}
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={handleSaveDraft}
          disabled={saving || savingDraft}
        >
          {savingDraft ? "Saving…" : "Save draft"}
        </Button>
        {lastSavedAt && (
          <span className="text-[0.8rem] text-muted-foreground">
            Saved at {lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  );
}
