import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  AuthedRequest,
  signCalendarOAuthState,
  verifyCalendarOAuthState,
} from "../middleware/auth";
import {
  decryptCalendarToken,
  encryptCalendarToken,
  parseCalendarEncryptionKey,
} from "../utils/calendarTokenCrypto";
import {
  CalendarCandidateInput,
  rankCalendarCandidates,
} from "../utils/calendarEventMatcher";

const router = Router();

const CALENDAR_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
];

const callbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

const createEventSchema = z.object({
  teamMemberId: z.string().min(1),
  startsAt: z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(180).default(30),
  inviteAttendee: z.boolean().default(false),
});

const candidateQuerySchema = z.object({
  teamMemberId: z.string().min(1),
  around: z.string().datetime(),
});

const linkEventSchema = z.object({
  teamMemberId: z.string().min(1),
  googleEventId: z.string().min(1),
});

function frontendCalendarUrl(params: Record<string, string> = {}): string {
  const base = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || "http://localhost:5173";
  const url = new URL("/calendar", base);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

function calendarConfiguration():
  | {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
      encryptionKey: Buffer;
    }
  | undefined {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri =
    process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim() ||
    "http://localhost:4000/api/calendar/google/callback";

  if (!clientId || !clientSecret) return undefined;
  try {
    return {
      clientId,
      clientSecret,
      redirectUri,
      encryptionKey: parseCalendarEncryptionKey(
        process.env.CALENDAR_TOKEN_ENCRYPTION_KEY
      ),
    };
  } catch {
    return undefined;
  }
}

function oauthClient(config: NonNullable<ReturnType<typeof calendarConfiguration>>) {
  return new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);
}

function currentUserEmail(req: AuthedRequest): string {
  if (!req.user?.email) throw new Error("Authenticated user email is missing");
  return req.user.email.toLowerCase();
}

async function accessTokenFor(
  userEmail: string,
  config: NonNullable<ReturnType<typeof calendarConfiguration>>
): Promise<{ token: string; calendarId: string }> {
  const connection = await prisma.calendarConnection.findUnique({
    where: { userEmail },
  });
  if (!connection) {
    throw new Error("Google Calendar is not connected");
  }

  const client = oauthClient(config);
  client.setCredentials({
    refresh_token: decryptCalendarToken(
      connection.encryptedRefreshToken,
      config.encryptionKey
    ),
  });
  const accessToken = await client.getAccessToken();
  if (!accessToken.token) {
    throw new Error("Google Calendar access could not be refreshed");
  }
  return { token: accessToken.token, calendarId: connection.calendarId };
}

// GET /api/calendar/status
router.get("/status", asyncHandler(async (req: AuthedRequest, res) => {
  const userEmail = currentUserEmail(req);
  const connection = await prisma.calendarConnection.findUnique({
    where: { userEmail },
    select: {
      googleAccountEmail: true,
      connectedAt: true,
      calendarId: true,
    },
  });

  res.json({
    configured: !!calendarConfiguration(),
    connected: !!connection,
    accountEmail: connection?.googleAccountEmail ?? null,
    connectedAt: connection?.connectedAt ?? null,
    calendarId: connection?.calendarId ?? null,
  });
}));

// GET /api/calendar/connect
router.get("/connect", (req: AuthedRequest, res) => {
  const config = calendarConfiguration();
  if (!config) {
    return res.status(503).json({
      error: "Google Calendar integration has not been configured",
    });
  }

  const userEmail = currentUserEmail(req);
  const url = oauthClient(config).generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: CALENDAR_SCOPES,
    state: signCalendarOAuthState(userEmail),
    login_hint: userEmail,
  });
  return res.json({ url });
});

// GET /api/calendar/google/callback
router.get("/google/callback", asyncHandler(async (req: AuthedRequest, res) => {
  const config = calendarConfiguration();
  if (!config) {
    return res.redirect(frontendCalendarUrl({ error: "not_configured" }));
  }

  const parsed = callbackSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.redirect(frontendCalendarUrl({ error: "authorization_failed" }));
  }

  let stateEmail: string;
  try {
    stateEmail = verifyCalendarOAuthState(parsed.data.state).email.toLowerCase();
  } catch {
    return res.redirect(frontendCalendarUrl({ error: "invalid_state" }));
  }

  const userEmail = currentUserEmail(req);
  if (stateEmail !== userEmail) {
    return res.redirect(frontendCalendarUrl({ error: "account_mismatch" }));
  }

  try {
    const client = oauthClient(config);
    const { tokens } = await client.getToken(parsed.data.code);
    if (!tokens.id_token) {
      return res.redirect(frontendCalendarUrl({ error: "email_unavailable" }));
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: config.clientId,
    });
    const googleEmail = ticket.getPayload()?.email?.toLowerCase();
    if (!googleEmail || googleEmail !== userEmail) {
      return res.redirect(frontendCalendarUrl({ error: "account_mismatch" }));
    }

    const existing = await prisma.calendarConnection.findUnique({
      where: { userEmail },
      select: { encryptedRefreshToken: true },
    });
    const encryptedRefreshToken = tokens.refresh_token
      ? encryptCalendarToken(tokens.refresh_token, config.encryptionKey)
      : existing?.encryptedRefreshToken;

    if (!encryptedRefreshToken) {
      return res.redirect(frontendCalendarUrl({ error: "refresh_token_missing" }));
    }

    await prisma.calendarConnection.upsert({
      where: { userEmail },
      create: {
        userEmail,
        googleAccountEmail: googleEmail,
        encryptedRefreshToken,
        scope: tokens.scope,
      },
      update: {
        googleAccountEmail: googleEmail,
        encryptedRefreshToken,
        scope: tokens.scope,
        connectedAt: new Date(),
      },
    });

    return res.redirect(frontendCalendarUrl({ connected: "1" }));
  } catch (error) {
    console.error("Google Calendar authorization failed", error);
    return res.redirect(frontendCalendarUrl({ error: "authorization_failed" }));
  }
}));

// DELETE /api/calendar/connection
router.delete("/connection", asyncHandler(async (req: AuthedRequest, res) => {
  const userEmail = currentUserEmail(req);
  const config = calendarConfiguration();
  const connection = await prisma.calendarConnection.findUnique({
    where: { userEmail },
  });
  if (!connection) return res.status(204).send();

  if (config) {
    try {
      const token = decryptCalendarToken(
        connection.encryptedRefreshToken,
        config.encryptionKey
      );
      await oauthClient(config).revokeToken(token);
    } catch (error) {
      // Local removal must still succeed if Google has already revoked the grant.
      console.warn("Unable to revoke Google Calendar token during disconnect", error);
    }
  }

  await prisma.calendarConnection.delete({ where: { userEmail } });
  return res.status(204).send();
}));

// GET /api/calendar/events
router.get("/events", asyncHandler(async (req: AuthedRequest, res) => {
  const userEmail = currentUserEmail(req);
  const teamMemberId =
    typeof req.query.teamMemberId === "string" ? req.query.teamMemberId : undefined;
  const events = await prisma.checkInCalendarEvent.findMany({
    where: {
      userEmail,
      endsAt: { gte: new Date() },
      ...(teamMemberId ? { teamMemberId } : {}),
    },
    orderBy: { startsAt: "asc" },
    take: 12,
    include: {
      teamMember: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          avatarSeed: true,
        },
      },
    },
  });
  res.json(events);
}));

// GET /api/calendar/events/candidates
// Reads only a bounded window of upcoming events and returns minimal details
// required for an explicit user-selected link.
router.get("/events/candidates", asyncHandler(async (req: AuthedRequest, res) => {
  const parsed = candidateQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const config = calendarConfiguration();
  if (!config) {
    return res.status(503).json({
      error: "Google Calendar integration has not been configured",
    });
  }

  const teamMember = await prisma.teamMember.findUnique({
    where: { id: parsed.data.teamMemberId },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      deletedAt: true,
    },
  });
  if (!teamMember || teamMember.deletedAt) {
    return res.status(404).json({ error: "Team member not found" });
  }
  if (!teamMember.active) {
    return res.status(409).json({ error: "This team member is inactive" });
  }

  const around = new Date(parsed.data.around);
  const now = Date.now();
  const timeMin = new Date(
    Math.max(now, around.getTime() - 14 * 24 * 60 * 60 * 1000)
  );
  const timeMax = new Date(
    Math.max(now, around.getTime()) + 30 * 24 * 60 * 60 * 1000
  );
  const userEmail = currentUserEmail(req);

  try {
    const { token, calendarId } = await accessTokenFor(userEmail, config);
    const query = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "50",
    });
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${query}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!response.ok) {
      console.error("Google Calendar candidate lookup failed", response.status);
      return res.status(502).json({
        error:
          response.status === 401
            ? "Google Calendar needs to be reconnected"
            : "Google Calendar could not load upcoming events",
      });
    }

    const body = await response.json() as {
      items?: Array<{
        id?: string;
        status?: string;
        summary?: string | null;
        htmlLink?: string | null;
        start?: { dateTime?: string };
        end?: { dateTime?: string };
        attendees?: Array<{ email?: string }>;
      }>;
    };
    const candidates: CalendarCandidateInput[] = (body.items || [])
      .filter(
        (event) =>
          event.id &&
          event.status !== "cancelled" &&
          event.start?.dateTime &&
          event.end?.dateTime
      )
      .map((event) => ({
        id: event.id!,
        summary: event.summary || "Busy",
        htmlLink: event.htmlLink,
        startsAt: event.start!.dateTime!,
        endsAt: event.end!.dateTime!,
        attendeeEmails: (event.attendees || [])
          .map((attendee) => attendee.email)
          .filter((email): email is string => !!email),
      }));

    const linkedEvents = await prisma.checkInCalendarEvent.findMany({
      where: {
        userEmail,
        googleEventId: { in: candidates.map((candidate) => candidate.id) },
      },
      select: {
        id: true,
        googleEventId: true,
        teamMember: {
          select: { id: true, name: true },
        },
      },
    });
    const linkedByGoogleId = new Map(
      linkedEvents.map((event) => [event.googleEventId, event])
    );

    const ranked = rankCalendarCandidates(candidates, teamMember, around)
      .slice(0, 20)
      .map(({ attendeeEmails: _attendeeEmails, ...candidate }) => {
        const linked = linkedByGoogleId.get(candidate.id);
        return {
          ...candidate,
          linkedEventId: linked?.id ?? null,
          linkedTeamMember: linked?.teamMember ?? null,
        };
      });
    return res.json(ranked);
  } catch (error) {
    console.error("Google Calendar candidate lookup failed", error);
    return res.status(502).json({
      error: "Google Calendar could not be reached. Reconnect and try again.",
    });
  }
}));

// POST /api/calendar/events/link
router.post("/events/link", asyncHandler(async (req: AuthedRequest, res) => {
  const parsed = linkEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const config = calendarConfiguration();
  if (!config) {
    return res.status(503).json({
      error: "Google Calendar integration has not been configured",
    });
  }

  const teamMember = await prisma.teamMember.findUnique({
    where: { id: parsed.data.teamMemberId },
    select: { id: true, active: true, deletedAt: true },
  });
  if (!teamMember || teamMember.deletedAt) {
    return res.status(404).json({ error: "Team member not found" });
  }
  if (!teamMember.active) {
    return res.status(409).json({ error: "This team member is inactive" });
  }

  const userEmail = currentUserEmail(req);
  const existing = await prisma.checkInCalendarEvent.findUnique({
    where: {
      userEmail_googleEventId: {
        userEmail,
        googleEventId: parsed.data.googleEventId,
      },
    },
    include: {
      teamMember: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          avatarSeed: true,
        },
      },
    },
  });
  if (existing) {
    if (existing.teamMemberId !== teamMember.id) {
      return res.status(409).json({
        error: `This appointment is already linked to ${existing.teamMember.name}`,
      });
    }
    return res.json(existing);
  }

  try {
    const { token, calendarId } = await accessTokenFor(userEmail, config);
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(parsed.data.googleEventId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!response.ok) {
      console.error("Google Calendar event link lookup failed", response.status);
      return res.status(502).json({
        error:
          response.status === 404
            ? "That Google Calendar appointment no longer exists"
            : "Google Calendar could not load that appointment",
      });
    }

    const googleEvent = await response.json() as {
      id?: string;
      status?: string;
      htmlLink?: string | null;
      start?: { dateTime?: string };
      end?: { dateTime?: string };
    };
    if (
      !googleEvent.id ||
      googleEvent.status === "cancelled" ||
      !googleEvent.start?.dateTime ||
      !googleEvent.end?.dateTime
    ) {
      return res.status(400).json({
        error: "Only active, timed Google Calendar appointments can be linked",
      });
    }

    const event = await prisma.checkInCalendarEvent.create({
      data: {
        userEmail,
        teamMemberId: teamMember.id,
        googleEventId: googleEvent.id,
        htmlLink: googleEvent.htmlLink,
        startsAt: new Date(googleEvent.start.dateTime),
        endsAt: new Date(googleEvent.end.dateTime),
        createdByPulse: false,
      },
      include: {
        teamMember: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            avatarSeed: true,
          },
        },
      },
    });
    return res.status(201).json(event);
  } catch (error) {
    console.error("Google Calendar event linking failed", error);
    return res.status(502).json({
      error: "Google Calendar could not be reached. Reconnect and try again.",
    });
  }
}));

// POST /api/calendar/events
router.post("/events", asyncHandler(async (req: AuthedRequest, res) => {
  const parsed = createEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const config = calendarConfiguration();
  if (!config) {
    return res.status(503).json({
      error: "Google Calendar integration has not been configured",
    });
  }

  const startsAt = new Date(parsed.data.startsAt);
  if (startsAt.getTime() <= Date.now()) {
    return res.status(400).json({ error: "Calendar event must be in the future" });
  }
  const endsAt = new Date(
    startsAt.getTime() + parsed.data.durationMinutes * 60 * 1000
  );

  const teamMember = await prisma.teamMember.findUnique({
    where: { id: parsed.data.teamMemberId },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      deletedAt: true,
    },
  });
  if (!teamMember || teamMember.deletedAt) {
    return res.status(404).json({ error: "Team member not found" });
  }
  if (!teamMember.active) {
    return res.status(409).json({ error: "This team member is inactive" });
  }
  if (parsed.data.inviteAttendee && !teamMember.email) {
    return res.status(400).json({
      error: "Add an email address for this team member before inviting them",
    });
  }

  const userEmail = currentUserEmail(req);
  try {
    const { token, calendarId } = await accessTokenFor(userEmail, config);
    const pulseUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/team/${teamMember.id}/prepare`;
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=${parsed.data.inviteAttendee ? "all" : "none"}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: `Check-in with ${teamMember.name}`,
          description: `A thoughtful one-to-one check-in.\n\nPrepare in Pulse: ${pulseUrl}`,
          start: { dateTime: startsAt.toISOString() },
          end: { dateTime: endsAt.toISOString() },
          attendees:
            parsed.data.inviteAttendee && teamMember.email
              ? [{ email: teamMember.email }]
              : undefined,
          extendedProperties: {
            private: {
              pulseTeamMemberId: teamMember.id,
            },
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("Google Calendar event creation failed", response.status);
      const message =
        response.status === 401
          ? "Google Calendar needs to be reconnected"
          : "Google Calendar could not create the event";
      return res.status(502).json({ error: message });
    }

    const googleEvent = await response.json() as {
      id?: string;
      htmlLink?: string;
    };
    if (!googleEvent.id) {
      return res.status(502).json({ error: "Google Calendar returned an invalid event" });
    }

    const event = await prisma.checkInCalendarEvent.create({
      data: {
        userEmail,
        teamMemberId: teamMember.id,
        googleEventId: googleEvent.id,
        htmlLink: googleEvent.htmlLink,
        startsAt,
        endsAt,
        createdByPulse: true,
      },
      include: {
        teamMember: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            avatarSeed: true,
          },
        },
      },
    });
    return res.status(201).json(event);
  } catch (error) {
    console.error("Google Calendar event creation failed", error);
    return res.status(502).json({
      error: "Google Calendar could not be reached. Reconnect and try again.",
    });
  }
}));

// DELETE /api/calendar/events/:id
router.delete("/events/:id", asyncHandler(async (req: AuthedRequest, res) => {
  const userEmail = currentUserEmail(req);
  const event = await prisma.checkInCalendarEvent.findFirst({
    where: { id: req.params.id, userEmail },
  });
  if (!event) return res.status(404).json({ error: "Calendar event not found" });

  if (!event.createdByPulse) {
    await prisma.checkInCalendarEvent.delete({ where: { id: event.id } });
    return res.status(204).send();
  }

  const config = calendarConfiguration();
  if (!config) {
    return res.status(503).json({
      error: "Google Calendar integration has not been configured",
    });
  }

  try {
    const { token, calendarId } = await accessTokenFor(userEmail, config);
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(event.googleEventId)}?sendUpdates=all`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!response.ok && response.status !== 404 && response.status !== 410) {
      console.error("Google Calendar event deletion failed", response.status);
      return res.status(502).json({ error: "Google Calendar could not remove the event" });
    }

    await prisma.checkInCalendarEvent.delete({ where: { id: event.id } });
    return res.status(204).send();
  } catch (error) {
    console.error("Google Calendar event deletion failed", error);
    return res.status(502).json({
      error: "Google Calendar could not be reached. Reconnect and try again.",
    });
  }
}));

export default router;
