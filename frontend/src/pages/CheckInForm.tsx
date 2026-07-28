import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Gauge,
  ListChecks,
  Mail,
  MessagesSquare,
  Save,
  Sparkles,
  Trash2,
  Waypoints,
} from "lucide-react";
import { api } from "../api/client";
import { ActionItem, ActionItemStatus, CheckIn, TalkingPoint } from "../types";
import { PageTitle } from "../components/Typography";
import { PageLoading } from "../components/PageLoading";
import { IconActionButton } from "../components/IconActionButton";
import { DatePicker } from "../components/DatePicker";
import { CompletionCelebration } from "../components/CompletionCelebration";
import { EnergyPulse } from "../components/EnergyPulse";
import { GuidedJourney, JourneyStep } from "../components/GuidedJourney";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { buildCheckInSummaryText } from "@/lib/checkInSummary";
import { energyLevelLabel } from "@/lib/energyPulse";

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

const JOURNEY_STEPS: JourneyStep[] = [
  {
    label: "Arrive",
    eyebrow: "Start with the human signal",
    title: "How are you both arriving?",
    description:
      "Pause before the agenda. A quick energy check can change how you hold the conversation.",
    Icon: Gauge,
  },
  {
    label: "Connect",
    eyebrow: "Make space for what matters",
    title: "What needs to be heard today?",
    description:
      "Bring forward the topics that deserve attention. Check them off as you talk, or carry them onward.",
    Icon: MessagesSquare,
  },
  {
    label: "Reflect",
    eyebrow: "See the whole picture",
    title: "What is working—and what is getting in the way?",
    description:
      "Celebrate meaningful progress, then make room for challenges without rushing to solve them.",
    Icon: Sparkles,
  },
  {
    label: "Align",
    eyebrow: "Turn conversation into clarity",
    title: "What are you learning and deciding together?",
    description:
      "Capture the choices and growth that will matter after today’s conversation is over.",
    Icon: Waypoints,
  },
  {
    label: "Commit",
    eyebrow: "Leave with shared ownership",
    title: "What happens next?",
    description:
      "Turn good intentions into clear commitments, with an owner’s next move and a useful date.",
    Icon: ListChecks,
  },
  {
    label: "Review",
    eyebrow: "Close the loop",
    title: "Does this feel true to the conversation?",
    description:
      "Take one quiet pass through what you captured. You can revisit any step before completing.",
    Icon: CheckCircle2,
  },
];

function ReviewCard({
  label,
  value,
  onEdit,
}: {
  label: string;
  value?: string | null;
  onEdit: () => void;
}) {
  return (
    <div className="rounded-xl bg-muted/55 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-semibold text-brand-strong hover:underline"
        >
          Edit
        </button>
      </div>
      <p
        className={cn(
          "text-sm leading-relaxed whitespace-pre-line",
          !value?.trim() && "text-muted-foreground"
        )}
      >
        {value?.trim() || "Nothing captured yet"}
      </p>
    </div>
  );
}

export default function CheckInForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [checkIn, setCheckIn] = useState<CheckIn | null>(null);
  const [wins, setWins] = useState("");
  const [challenges, setChallenges] = useState("");
  const [decisions, setDecisions] = useState("");
  const [growthNotes, setGrowthNotes] = useState("");
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [items, setItems] = useState<DraftActionItem[]>([]);
  const [points, setPoints] = useState<DraftTalkingPoint[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [deletedActionItemIds, setDeletedActionItemIds] = useState<string[]>([]);
  const [deletedTalkingPointIds, setDeletedTalkingPointIds] = useState<string[]>([]);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const loadCheckIn = useCallback(async (shouldIgnore: () => boolean = () => false) => {
    if (!id) return;
    const ci = await api.get<CheckIn>(`/api/check-ins/${id}`);

    // Pull in this person's still-open action items from prior check-ins so
    // they can be reviewed/updated/carried over as part of this one.
    const [openItems, inProgressItems, openPoints] = await Promise.all([
      api.get<ActionItem[]>(
        `/api/action-items?teamMemberId=${ci.teamMemberId}&status=OPEN`
      ),
      api.get<ActionItem[]>(
        `/api/action-items?teamMemberId=${ci.teamMemberId}&status=IN_PROGRESS`
      ),
      api.get<TalkingPoint[]>(
        `/api/talking-points?teamMemberId=${ci.teamMemberId}&resolved=false`
      ),
    ]);

    if (shouldIgnore()) return;

    const priorOpen = [...openItems, ...inProgressItems].filter((a) => a.checkInId !== ci.id);
    // Items already saved against this check-in from an earlier draft save.
    const alreadyHere = ci.actionItems || [];

    setCheckIn(ci);
    setWins(ci.wins || "");
    setChallenges(ci.challenges || "");
    setDecisions(ci.decisions || "");
    setGrowthNotes(ci.growthNotes || "");
    setEnergyLevel(ci.energyLevel ?? null);
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
    const priorOpenPoints = openPoints.filter((t) => t.checkInId !== ci.id);
    const alreadyHerePoints = ci.talkingPoints || [];

    setPoints(
      [...alreadyHerePoints, ...priorOpenPoints].map((t) => ({
        id: t.id,
        content: t.content,
        resolved: t.resolved,
      }))
    );
    setDeletedActionItemIds([]);
    setDeletedTalkingPointIds([]);
    const storedStep = Number(window.localStorage.getItem(`pulse-check-in-step:${ci.id}`));
    if (Number.isInteger(storedStep) && storedStep >= 0 && storedStep < JOURNEY_STEPS.length) {
      setCurrentStep(storedStep);
    }
  }, [id]);

  useEffect(() => {
    let ignore = false;

    void loadCheckIn(() => ignore).catch(() => {
      if (!ignore) toast.error("Unable to load this check-in. Please try again.");
    });

    return () => {
      ignore = true;
    };
  }, [loadCheckIn]);

  function addItem() {
    setItems((current) => [...current, { description: "", status: "OPEN", dueDate: "" }]);
  }

  function updateItem(index: number, patch: Partial<DraftActionItem>) {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    );
  }

  function removeItem(index: number) {
    const item = items[index];
    if (item.id) {
      setDeletedActionItemIds((ids) => [...new Set([...ids, item.id!])]);
    }
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function addPoint() {
    setPoints((current) => [...current, { content: "", resolved: false }]);
  }

  function updatePoint(index: number, patch: Partial<DraftTalkingPoint>) {
    setPoints((current) =>
      current.map((point, pointIndex) =>
        pointIndex === index ? { ...point, ...patch } : point
      )
    );
  }

  function removePoint(index: number) {
    const point = points[index];
    if (point.id) {
      setDeletedTalkingPointIds((ids) => [...new Set([...ids, point.id!])]);
    }
    setPoints((current) => current.filter((_, pointIndex) => pointIndex !== index));
  }

  function buildSummaryText(): string {
    if (!checkIn) return "";
    return buildCheckInSummaryText({
      teamMemberName: checkIn.teamMember?.name || "",
      date: new Date(),
      wins,
      challenges,
      decisions,
      growthNotes,
      energyLevel,
      talkingPoints: points,
      actionItems: items,
    });
  }

  function buildPayload() {
    return {
      wins,
      challenges,
      decisions,
      growthNotes,
      energyLevel,
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
      deletedActionItemIds,
      deletedTalkingPointIds,
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
      window.localStorage.removeItem(`pulse-check-in-step:${checkIn.id}`);
      setSummaryText(buildSummaryText());
      setSummaryOpen(true);
    } finally {
      setSaving(false);
    }
  }

  function moveToStep(step: number) {
    const nextStep = Math.max(0, Math.min(step, JOURNEY_STEPS.length - 1));
    setCurrentStep(nextStep);
    if (checkIn) {
      window.localStorage.setItem(`pulse-check-in-step:${checkIn.id}`, String(nextStep));
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSummaryClose() {
    setSummaryOpen(false);
    if (checkIn) navigate(`/team/${checkIn.teamMemberId}`);
  }

  async function handleCopySummary() {
    await navigator.clipboard.writeText(summaryText);
    toast.success("Summary copied to clipboard");
  }

  async function handleSendSummaryEmail() {
    if (!checkIn || sendingEmail) return;
    setSendingEmail(true);
    try {
      const dateLabel = new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      await api.post(`/api/check-ins/${checkIn.id}/send-summary`, {
        subject: `Check-in summary — ${checkIn.teamMember?.name} — ${dateLabel}`,
        body: summaryText,
      });
      toast.success(`Summary emailed to ${checkIn.teamMember?.email}`);
    } catch {
      toast.error("Unable to send the email. Please try again.");
    } finally {
      setSendingEmail(false);
    }
  }

  if (!checkIn) return <PageLoading />;

  return (
    <div className="max-w-[760px] animate-in fade-in duration-300">
      <PageTitle size="md" className="mb-1">
        Check-in with {checkIn.teamMember?.name}
      </PageTitle>
      <p className="mb-7 text-sm text-muted-foreground">
        A little space to listen, reflect, and leave aligned. Everything here is optional.
      </p>

      <GuidedJourney
        steps={JOURNEY_STEPS}
        currentStep={currentStep}
        onStepChange={moveToStep}
      >
        {currentStep === 0 && (
          <div>
            <EnergyPulse value={energyLevel} onChange={setEnergyLevel} embedded />
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              This is a conversation cue, not a score. Use it to decide whether today needs more
              listening, more energy, or simply a gentler pace.
            </p>
          </div>
        )}

        {currentStep === 1 && (
          <div>
            {points.length === 0 && (
              <div className="mb-4 rounded-xl bg-muted/55 px-4 py-5 text-center">
                <p className="text-sm font-medium">No talking points waiting.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add what feels important, or continue when the conversation is already clear.
                </p>
              </div>
            )}
            {points.map((point, index) => (
              <div
                key={point.id ?? `new-point-${index}`}
                className="mb-2.5 flex items-center gap-2"
              >
                <Checkbox
                  checked={point.resolved}
                  onCheckedChange={(checked) => updatePoint(index, { resolved: checked === true })}
                  aria-label={`Mark “${point.content || "talking point"}” as discussed`}
                />
                <Input
                  className={cn("flex-1", point.resolved && "text-muted-foreground line-through")}
                  placeholder="Something worth talking about"
                  value={point.content}
                  onChange={(e) => updatePoint(index, { content: e.target.value })}
                />
                <IconActionButton
                  label="Remove talking point"
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
        )}

        {currentStep === 2 && (
          <div className="grid gap-6">
            <div>
              <label className={FIELD_LABEL}>What felt worth celebrating?</label>
              <p className={FIELD_HINT}>
                Progress, effort, a brave moment, or something that made work feel lighter.
              </p>
              <Textarea
                rows={4}
                value={wins}
                onChange={(e) => setWins(e.target.value)}
                placeholder="A win we want to remember…"
              />
            </div>
            <div>
              <label className={FIELD_LABEL}>Where did things feel hard?</label>
              <p className={FIELD_HINT}>
                Name friction, uncertainty, or support that would make a difference.
              </p>
              <Textarea
                rows={4}
                value={challenges}
                onChange={(e) => setChallenges(e.target.value)}
                placeholder="Something getting in the way…"
              />
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="grid gap-6">
            <div>
              <label className={FIELD_LABEL}>What did you decide together?</label>
              <p className={FIELD_HINT}>
                Capture choices, agreements, and direction you should not have to reconstruct
                later.
              </p>
              <Textarea
                rows={4}
                value={decisions}
                onChange={(e) => setDecisions(e.target.value)}
                placeholder="We agreed that…"
              />
            </div>
            <div>
              <label className={FIELD_LABEL}>Where is growth showing up?</label>
              <p className={FIELD_HINT}>
                Notice learning, confidence, feedback, or the next edge to explore.
              </p>
              <Textarea
                rows={4}
                value={growthNotes}
                onChange={(e) => setGrowthNotes(e.target.value)}
                placeholder="A strength growing, or an opportunity to explore…"
              />
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div>
            {items.length === 0 && (
              <div className="mb-4 rounded-xl bg-muted/55 px-4 py-5 text-center">
                <p className="text-sm font-medium">No commitments captured yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add a next step only when it genuinely helps move the conversation forward.
                </p>
              </div>
            )}
            {items.map((item, index) => (
              <div
                key={item.id ?? `new-${index}`}
                className="mb-3 rounded-xl bg-muted/45 p-3"
              >
                <div className="flex items-start gap-2">
                  <Input
                    className="flex-1 bg-card"
                    placeholder="A clear next step"
                    value={item.description}
                    onChange={(e) => updateItem(index, { description: e.target.value })}
                  />
                  <IconActionButton
                    label="Remove commitment"
                    icon={<Trash2 />}
                    variant="danger"
                    onClick={() => removeItem(index)}
                  />
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Select
                    value={item.status}
                    onValueChange={(value) =>
                      updateItem(index, { status: value as ActionItemStatus })
                    }
                  >
                    <SelectTrigger className="w-full bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                      <SelectItem value="DONE">Done</SelectItem>
                    </SelectContent>
                  </Select>
                  <DatePicker
                    className="w-full bg-card"
                    value={item.dueDate}
                    onChange={(dueDate) => updateItem(index, { dueDate })}
                  />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addItem}>
              + Add commitment
            </Button>
            {items.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Open commitments from earlier check-ins appear here too, so nothing quietly slips
                away.
              </p>
            )}
          </div>
        )}

        {currentStep === 5 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <ReviewCard
              label="Starting energy"
              value={energyLevelLabel(energyLevel)}
              onEdit={() => moveToStep(0)}
            />
            <ReviewCard
              label="Talking points"
              value={points
                .filter((point) => point.content.trim())
                .map((point) => `${point.resolved ? "✓" : "○"} ${point.content.trim()}`)
                .join("\n")}
              onEdit={() => moveToStep(1)}
            />
            <ReviewCard label="Wins" value={wins} onEdit={() => moveToStep(2)} />
            <ReviewCard label="Challenges" value={challenges} onEdit={() => moveToStep(2)} />
            <ReviewCard label="Decisions" value={decisions} onEdit={() => moveToStep(3)} />
            <ReviewCard label="Growth" value={growthNotes} onEdit={() => moveToStep(3)} />
            <div className="sm:col-span-2">
              <ReviewCard
                label="Commitments"
                value={items
                  .filter((item) => item.description.trim())
                  .map((item) => `• ${item.description.trim()}`)
                  .join("\n")}
                onEdit={() => moveToStep(4)}
              />
            </div>
          </div>
        )}

        <div className="mt-7 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => moveToStep(currentStep - 1)}
              >
                <ChevronLeft />
                Back
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={saving || savingDraft}
            >
              <Save />
              {savingDraft ? "Saving…" : "Save draft"}
            </Button>
          </div>

          <div className="sm:ml-auto">
            {currentStep < JOURNEY_STEPS.length - 1 ? (
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={() => moveToStep(currentStep + 1)}
              >
                Continue to {JOURNEY_STEPS[currentStep + 1].label}
                <ChevronRight />
              </Button>
            ) : (
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={handleComplete}
                disabled={saving || savingDraft}
              >
                <CheckCircle2 />
                {saving ? "Completing…" : "Complete check-in"}
              </Button>
            )}
          </div>
        </div>

        {lastSavedAt && (
          <p className="mt-3 text-right text-xs text-muted-foreground">
            Draft saved at{" "}
            {lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </GuidedJourney>

      <Dialog open={summaryOpen} onOpenChange={(open) => !open && handleSummaryClose()}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader className="items-center text-center">
            <CompletionCelebration />
            <DialogTitle className="text-xl">A meaningful check-in, complete.</DialogTitle>
            <DialogDescription>
              You captured the conversation and what comes next. The summary is ready to share
              with {checkIn.teamMember?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-brand-strong uppercase">
            <span className="h-px flex-1 bg-brand-border" />
            Ready to share
            <span className="h-px flex-1 bg-brand-border" />
          </div>
          <div className="relative">
            <pre className="max-h-[360px] overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-overlay-subtle p-4 pr-20 font-sans text-sm">
              {summaryText}
            </pre>
            <div className="absolute top-2 right-2 flex gap-1">
              <IconActionButton
                label={
                  checkIn.teamMember?.email
                    ? "Send email"
                    : "No email on file for this team member"
                }
                icon={<Mail />}
                onClick={handleSendSummaryEmail}
                disabled={sendingEmail || !checkIn.teamMember?.email}
                className="bg-card"
              />
              <IconActionButton
                label="Copy summary"
                icon={<Copy />}
                onClick={handleCopySummary}
                className="bg-card"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSummaryClose}>
              Finish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
