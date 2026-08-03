import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Camera, Check, ChevronDown, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { avatarChoiceSeeds } from "../lib/avatarIcons";
import { CLIFTON_STRENGTH_OPTIONS } from "../lib/cliftonStrengths";
import { Cadence, CliftonStrength, TeamMember } from "../types";
import { MemberAvatar } from "../components/MemberAvatar";
import { PageLoading } from "../components/PageLoading";
import { PageTitle } from "../components/Typography";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const FIELD_LABEL = "mb-1.5 block text-sm font-medium text-foreground";

type StrengthSelection = CliftonStrength | "";

function strengthSelections(strengths: CliftonStrength[] = []): StrengthSelection[] {
  return strengths.length < 5 ? [...strengths, ""] : strengths.slice(0, 5);
}

export default function EditTeamMember() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<TeamMember | null>(null);
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
  const [showIllustrations, setShowIllustrations] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    let ignore = false;

    api.get<TeamMember>(`/api/team-members/${id}`)
      .then((nextMember) => {
        if (ignore) return;
        setMember(nextMember);
        setForm({
          name: nextMember.name,
          role: nextMember.role || "",
          email: nextMember.email || "",
          cadence: nextMember.cadence,
          notes: nextMember.notes || "",
        });
        setSelectedAvatarSeed(nextMember.avatarSeed || null);
        setStrengths(strengthSelections(nextMember.cliftonStrengths));
      })
      .catch(() => {
        if (ignore) return;
        toast.error("We couldn't load that team member.");
        navigate("/team", { replace: true });
      });

    return () => {
      ignore = true;
    };
  }, [id, navigate]);

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
      navigate(`/team/${member.id}`);
    } catch {
      toast.error("We couldn't save these changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!member) return <PageLoading />;

  const hasActivePhoto = Boolean(avatarFile || (!removePhoto && member.avatarUrl));

  return (
    <div className="mx-auto max-w-[1080px] animate-in fade-in duration-300">
      <Link
        to={`/team/${member.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to {member.name}
      </Link>

      <PageTitle className="mb-2">Edit team member</PageTitle>
      <p className="mb-7 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Keep {member.name}&apos;s profile useful for the conversations you have together.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile details</CardTitle>
                <CardDescription>The essentials used across check-ins and reminders.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5">
                <div>
                  <label htmlFor="member-name" className={FIELD_LABEL}>Name</label>
                  <Input
                    id="member-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="member-role" className={FIELD_LABEL}>Role</label>
                    <Input
                      id="member-role"
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className={FIELD_LABEL}>Check-in cadence</label>
                    <Select
                      value={form.cadence}
                      onValueChange={(value) => setForm({ ...form, cadence: value as Cadence })}
                    >
                      <SelectTrigger className="w-full" aria-label="Check-in cadence">
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
                  <label htmlFor="member-email" className={FIELD_LABEL}>Email</label>
                  <Input
                    id="member-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
                <CardDescription>Private context that helps you support this person well.</CardDescription>
              </CardHeader>
              <CardContent>
                <label htmlFor="member-notes" className="sr-only">Notes</label>
                <Textarea
                  id="member-notes"
                  rows={7}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Add helpful context, preferences, or things to remember…"
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Photo and avatar</CardTitle>
                <CardDescription>Make their profile easy to recognise at a glance.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    className="group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label={`Choose a photo for ${form.name}`}
                  >
                    <MemberAvatar
                      id={member.id}
                      name={form.name || "?"}
                      avatarUrl={avatarPreview || (removePhoto ? null : member.avatarUrl)}
                      avatarSeed={selectedAvatarSeed}
                      size="lg"
                      className="size-16 text-lg"
                    />
                    <span className="absolute right-0 bottom-0 flex size-6 items-center justify-center rounded-full border-2 border-card bg-foreground text-background shadow-sm transition-transform group-hover:scale-105">
                      <Camera className="size-3" aria-hidden="true" />
                    </span>
                  </button>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{form.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">JPG, PNG or WebP · 5 MB max</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={chooseAvatar}
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    {hasActivePhoto ? "Change photo" : "Add photo"}
                  </Button>
                  {hasActivePhoto && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={clearPhoto}
                    >
                      <Trash2 className="size-3.5" />
                      Remove
                    </Button>
                  )}
                </div>

                <div className="mt-4 border-t border-border pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="-ml-3 text-muted-foreground"
                    aria-expanded={showIllustrations}
                    onClick={() => setShowIllustrations((visible) => !visible)}
                  >
                    <ChevronDown
                      className={`size-4 transition-transform ${showIllustrations ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                    {showIllustrations ? "Hide illustrations" : "Choose illustration"}
                  </Button>

                  {showIllustrations && (
                    <div className="mt-3 flex flex-wrap gap-2.5" aria-label="Avatar illustrations">
                      {avatarChoiceSeeds(member.id).map((seed, index) => {
                        const isSelected = !hasActivePhoto && selectedAvatarSeed === seed;
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
                              className={isSelected ? "ring-2 ring-foreground ring-offset-2" : "ring-black/10"}
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
                        aria-pressed={!hasActivePhoto && selectedAvatarSeed === null}
                      >
                        <MemberAvatar
                          id={member.id}
                          name={form.name || "?"}
                          size="md"
                          className={!hasActivePhoto && selectedAvatarSeed === null ? "ring-2 ring-foreground ring-offset-2" : "ring-black/10"}
                        />
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top strengths</CardTitle>
                <CardDescription>Record their shared CliftonStrengths themes in rank order.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2.5">
                {strengths.map((strength, index) => (
                  <div key={`${index}-${strength}`} className="flex items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-overlay-subtle text-xs font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <Select
                      value={strength || undefined}
                      onValueChange={(value) => selectStrength(index, value as CliftonStrength)}
                    >
                      <SelectTrigger className="min-w-0 flex-1" aria-label={`Strength ${index + 1}`}>
                        <SelectValue placeholder="Choose a strength" />
                      </SelectTrigger>
                      <SelectContent>
                        {CLIFTON_STRENGTH_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            disabled={strengths.some(
                              (selected, selectedIndex) => selectedIndex !== index && selected === option.value
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
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 py-4">
          <Button type="button" variant="outline" onClick={() => navigate(`/team/${member.id}`)}>
            Cancel
          </Button>
          <Button type="submit" variant="success" disabled={saving || !form.name.trim()}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
