import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Check, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { Cadence, CliftonStrength, TeamMember } from "../types";
import { avatarChoiceSeeds } from "../lib/avatarIcons";
import { CLIFTON_STRENGTH_OPTIONS } from "../lib/cliftonStrengths";
import { MemberAvatar } from "./MemberAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FIELD_LABEL = "mb-1.5 block text-sm font-medium text-foreground";

type StrengthSelection = CliftonStrength | "";

function strengthSelections(strengths: CliftonStrength[] = []): StrengthSelection[] {
  return strengths.length < 5 ? [...strengths, ""] : strengths.slice(0, 5);
}

interface EditMemberDialogProps {
  member: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditMemberDialog({ member, open, onOpenChange, onSaved }: EditMemberDialogProps) {
  const [form, setForm] = useState({
    name: "",
    role: "",
    email: "",
    cadence: "FORTNIGHTLY" as Cadence,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [strengths, setStrengths] = useState<StrengthSelection[]>([""]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [selectedAvatarSeed, setSelectedAvatarSeed] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (member) {
      setForm({
        name: member.name,
        role: member.role || "",
        email: member.email || "",
        cadence: member.cadence,
        notes: member.notes || "",
      });
      setAvatarFile(null);
      setAvatarPreview(null);
      setRemovePhoto(false);
      setSelectedAvatarSeed(member.avatarSeed || null);
      setStrengths(strengthSelections(member.cliftonStrengths));
    }
  }, [member]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  function chooseAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Avatar must be smaller than 5 MB.");
      return;
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setRemovePhoto(false);
  }

  function clearPhoto() {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemovePhoto(true);
  }

  function selectGeneratedAvatar(seed: string | null) {
    clearPhoto();
    setSelectedAvatarSeed(seed);
  }

  function selectStrength(index: number, strength: CliftonStrength) {
    const next = [...strengths];
    next[index] = strength;
    const selected = next.filter((value): value is CliftonStrength => Boolean(value));
    setStrengths(strengthSelections(selected));
  }

  function removeStrength(index: number) {
    const selected = strengths.filter(
      (value, strengthIndex): value is CliftonStrength =>
        strengthIndex !== index && Boolean(value)
    );
    setStrengths(strengthSelections(selected));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!member || !form.name.trim()) return;
    setSaving(true);
    try {
      await api.patch(`/api/team-members/${member.id}`, {
        name: form.name.trim(),
        role: form.role.trim(),
        email: form.email.trim(),
        cadence: form.cadence,
        notes: form.notes.trim(),
        avatarSeed: selectedAvatarSeed,
        cliftonStrengths: strengths.filter(
          (strength): strength is CliftonStrength => Boolean(strength)
        ),
      });
      if (avatarFile) {
        const body = new FormData();
        body.append("avatar", avatarFile);
        await api.upload(`/api/team-members/${member.id}/avatar`, body);
      } else if (removePhoto && member.avatarUrl) {
        await api.delete(`/api/team-members/${member.id}/avatar`);
      }
      toast.success(`${form.name.trim()} updated`);
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const hasActivePhoto = Boolean(
    avatarFile || (!removePhoto && member?.avatarUrl)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit team member</DialogTitle>
            <DialogDescription>Update {member?.name}'s details.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="rounded-xl border border-border bg-muted/35 p-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label={`Choose a photo for ${form.name || "this team member"}`}
                >
                  <MemberAvatar
                    id={member?.id || form.name}
                    name={form.name || "?"}
                    avatarUrl={avatarPreview || (removePhoto ? null : member?.avatarUrl)}
                    avatarSeed={selectedAvatarSeed}
                    size="lg"
                    className="size-16 text-lg"
                  />
                  <span className="absolute right-0 bottom-0 flex size-6 items-center justify-center rounded-full border-2 border-card bg-foreground text-background shadow-sm transition-transform group-hover:scale-105">
                    <Camera className="size-3" aria-hidden="true" />
                  </span>
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">Avatar</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Add a photo or choose an illustration.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {avatarPreview || (!removePhoto && member?.avatarUrl)
                        ? "Change photo"
                        : "Add photo"}
                    </Button>
                    {(avatarPreview || (!removePhoto && member?.avatarUrl)) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={clearPhoto}
                      >
                        <Trash2 className="size-3.5" />
                        Remove photo
                      </Button>
                    )}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={chooseAvatar}
                />
              </div>

              <div className="mt-4 border-t border-border pt-3.5">
                <p className="mb-2.5 text-xs font-semibold text-muted-foreground">
                  Choose an illustration
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {member &&
                    avatarChoiceSeeds(member.id).map((seed, index) => {
                      const isSelected =
                        !hasActivePhoto && selectedAvatarSeed === seed;
                      return (
                        <button
                          key={seed}
                          type="button"
                          onClick={() => selectGeneratedAvatar(seed)}
                          className="relative rounded-full outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                          aria-label={`Use illustration ${index + 1}`}
                          aria-pressed={isSelected}
                        >
                          <MemberAvatar
                            id={member.id}
                            name={form.name || member.name}
                            avatarSeed={seed}
                            size="md"
                            className={
                              isSelected
                                ? "ring-2 ring-foreground ring-offset-2"
                                : "ring-black/10"
                            }
                          />
                          {isSelected && (
                            <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-foreground text-background ring-2 ring-card">
                              <Check className="size-2.5" aria-hidden="true" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  <button
                    type="button"
                    onClick={() => selectGeneratedAvatar(null)}
                    className="relative rounded-full outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label="Use initials"
                    aria-pressed={
                      !hasActivePhoto && selectedAvatarSeed === null
                    }
                  >
                    <MemberAvatar
                      id={member?.id || form.name}
                      name={form.name || "?"}
                      size="md"
                      className={
                        !hasActivePhoto && selectedAvatarSeed === null
                          ? "ring-2 ring-foreground ring-offset-2"
                          : "ring-black/10"
                      }
                    />
                    <span className="sr-only">Initials</span>
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className={FIELD_LABEL}>Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={FIELD_LABEL}>Role</label>
                <Input
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className={FIELD_LABEL}>Cadence</label>
                <Select
                  value={form.cadence}
                  onValueChange={(value) => setForm({ ...form, cadence: value as Cadence })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="FORTNIGHTLY">Fortnightly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className={FIELD_LABEL}>Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="rounded-xl border border-border bg-muted/35 p-4">
              <label className={FIELD_LABEL}>CliftonStrengths Top 5</label>
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                Record the themes this person has shared, in rank order.
              </p>
              <div className="grid gap-2">
                {strengths.map((strength, index) => (
                  <div key={`${index}-${strength}`} className="flex items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-overlay-subtle text-xs font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <Select
                      value={strength || undefined}
                      onValueChange={(value) => selectStrength(index, value as CliftonStrength)}
                    >
                      <SelectTrigger className="flex-1" aria-label={`Strength ${index + 1}`}>
                        <SelectValue placeholder="Choose a strength" />
                      </SelectTrigger>
                      <SelectContent>
                        {CLIFTON_STRENGTH_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            disabled={strengths.some(
                              (selected, selectedIndex) =>
                                selectedIndex !== index && selected === option.value
                            )}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {strength && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove strength ${index + 1}`}
                        onClick={() => removeStrength(index)}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className={FIELD_LABEL}>Notes</label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Private notes about this person (optional)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="success" disabled={saving || !form.name.trim()}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
