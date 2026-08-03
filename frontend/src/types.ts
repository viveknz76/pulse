import type { CliftonStrength } from "./lib/cliftonStrengths";

export type { CliftonStrength } from "./lib/cliftonStrengths";

export type Cadence = "WEEKLY" | "FORTNIGHTLY" | "MONTHLY";
export type CheckInStatus = "SCHEDULED" | "COMPLETED" | "SKIPPED";
export type ActionItemStatus = "OPEN" | "IN_PROGRESS" | "DONE";

export interface Team {
  id: string;
  name: string;
  description?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
}

export interface TeamMember {
  id: string;
  name: string;
  role?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  cadence: Cadence;
  active: boolean;
  startDate: string;
  notes?: string | null;
  checkInsPausedAt?: string | null;
  checkInsResumeOn?: string | null;
  checkInsHoldReason?: string | null;
  checkInsOnHold: boolean;
  nextDueDate: string;
  lastCompletedAt?: string | null;
  activeCheckInId?: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
  cliftonStrengths: CliftonStrength[];
  teamId?: string | null;
  team?: Pick<Team, "id" | "name" | "archivedAt"> | null;
  checkIns?: CheckIn[];
  actionItems?: ActionItem[];
  talkingPoints?: TalkingPoint[];
}

export interface CheckIn {
  id: string;
  teamMemberId: string;
  scheduledDate: string;
  completedAt?: string | null;
  status: CheckInStatus;
  wins?: string | null;
  challenges?: string | null;
  decisions?: string | null;
  growthNotes?: string | null;
  privateNotes?: string | null;
  energyLevel?: number | null;
  actionItems: ActionItem[];
  talkingPoints?: TalkingPoint[];
  teamMember?: TeamMember;
}

export interface PrivateWin {
  id: string;
  text: string;
  date: string;
  teamMember: Pick<TeamMember, "id" | "name" | "avatarUrl" | "avatarSeed">;
}

export interface TalkingPoint {
  id: string;
  content: string;
  resolved: boolean;
  resolvedAt?: string | null;
  recurring: boolean;
  teamMemberId: string;
  checkInId?: string | null;
  createdAt: string;
}

export interface ActionItem {
  id: string;
  description: string;
  status: ActionItemStatus;
  dueDate?: string | null;
  completedAt?: string | null;
  teamMemberId: string;
  checkInId?: string | null;
  teamMember?: TeamMember;
  createdAt: string;
}

export interface ReviewData {
  weekStart: string;
  weekEnd: string;
  overdue: ActionItem[];
  dueThisWeek: ActionItem[];
  upcoming: ActionItem[];
  noDueDate: ActionItem[];
  recentlyCompleted: ActionItem[];
  checkInsDueThisWeek: { teamMember: TeamMember; nextDueDate: string }[];
}

export interface CalendarConnectionStatus {
  configured: boolean;
  connected: boolean;
  accountEmail?: string | null;
  connectedAt?: string | null;
  calendarId?: string | null;
}

export interface CheckInCalendarEvent {
  id: string;
  teamMemberId: string;
  googleEventId: string;
  htmlLink?: string | null;
  startsAt: string;
  endsAt: string;
  createdByPulse: boolean;
  teamMember: Pick<TeamMember, "id" | "name" | "avatarUrl" | "avatarSeed">;
}

export interface CalendarEventCandidate {
  id: string;
  summary: string;
  htmlLink?: string | null;
  startsAt: string;
  endsAt: string;
  matchScore: number;
  matchReasons: string[];
  linkedEventId?: string | null;
  linkedTeamMember?: Pick<TeamMember, "id" | "name"> | null;
}
