export interface CalendarCandidateInput {
  id: string;
  summary?: string | null;
  htmlLink?: string | null;
  startsAt: string;
  endsAt: string;
  attendeeEmails: string[];
}

export interface RankedCalendarCandidate extends CalendarCandidateInput {
  matchScore: number;
  matchReasons: string[];
}

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2);
}

export function rankCalendarCandidates(
  events: CalendarCandidateInput[],
  member: { name: string; email?: string | null },
  around: Date
): RankedCalendarCandidate[] {
  const normalizedName = member.name.trim().toLowerCase();
  const tokens = nameTokens(member.name);
  const normalizedEmail = member.email?.trim().toLowerCase();

  return events
    .map((event) => {
      const summary = event.summary?.toLowerCase() || "";
      const attendeeMatch = !!(
        normalizedEmail &&
        event.attendeeEmails.some((email) => email.toLowerCase() === normalizedEmail)
      );
      const fullNameMatch = !!normalizedName && summary.includes(normalizedName);
      const tokenMatches = tokens.filter((token) => summary.includes(token)).length;
      const distanceDays = Math.abs(
        new Date(event.startsAt).getTime() - around.getTime()
      ) / (24 * 60 * 60 * 1000);

      let matchScore = 0;
      const matchReasons: string[] = [];
      if (attendeeMatch) {
        matchScore += 100;
        matchReasons.push("Employee email is invited");
      }
      if (fullNameMatch) {
        matchScore += 50;
        matchReasons.push("Name appears in the title");
      } else if (tokenMatches > 0) {
        matchScore += tokenMatches * 8;
        matchReasons.push("Title may match");
      }
      if (distanceDays <= 3) {
        matchScore += 10;
        matchReasons.push("Near the next due date");
      } else if (distanceDays <= 7) {
        matchScore += 5;
      } else if (distanceDays <= 14) {
        matchScore += 2;
      }

      return {
        ...event,
        matchScore,
        matchReasons,
      };
    })
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    });
}
