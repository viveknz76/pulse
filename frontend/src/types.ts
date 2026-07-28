export type Cadence = "WEEKLY" | "FORTNIGHTLY" | "MONTHLY";
export type CheckInStatus = "SCHEDULED" | "COMPLETED" | "SKIPPED";
export type ActionItemStatus = "OPEN" | "IN_PROGRESS" | "DONE";

export interface TeamMember {
  id: string;
  name: string;
  role?: string | null;
  email?: string | null;
  cadence: Cadence;
  active: boolean;
  startDate: string;
  notes?: string | null;
  nextDueDate: string;
  lastCompletedAt?: string | null;
  activeCheckInId?: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
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
  growthNotes?: string | null;
  energyLevel?: number | null;
  actionItems: ActionItem[];
  talkingPoints?: TalkingPoint[];
  teamMember?: TeamMember;
}

export interface TalkingPoint {
  id: string;
  content: string;
  resolved: boolean;
  resolvedAt?: string | null;
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
