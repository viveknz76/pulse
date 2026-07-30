# ADR-001: Delegated Google Calendar integration

**Status:** Accepted
**Date:** 2026-07-30
**Decider:** Pulse owner

## Context

Pulse is a private, single-user check-in application. The owner uses a RICADO
Google Workspace calendar and wants scheduled check-ins to become real calendar
events without Pulse importing unrelated calendar content.

Google Sign-In currently authenticates Pulse with an ID token. That token proves
identity but cannot create Calendar events and does not provide offline access.

## Decision

Use a separate Google OAuth authorization-code flow with offline access and the
least-privilege `calendar.events` scope.

- The connected Google account must match the signed-in Pulse account.
- Store the refresh token encrypted with AES-256-GCM.
- Create events only after an explicit user action.
- Do not invite the team member unless the user explicitly opts in.
- Record Google event IDs locally so Pulse can show and remove events it created.
- Do not continuously read or import Calendar events.
- Only when explicitly requested, search a bounded date window and let the user link
  an existing timed appointment.
- Track whether Pulse created or only linked an event so unlinking can never
  delete an existing appointment from Google Calendar.

## Options considered

### Google Calendar deep link

Low complexity and no token storage, but cannot confirm event creation, show
connected status, or manage Pulse-created events.

### Delegated OAuth with `calendar.events`

Moderate complexity. Supports a durable connection and event management while
limiting access to event operations.

### Full calendar synchronization

High complexity and unnecessary for the initial goal. It would require reading
calendars, incremental sync cursors, conflict handling, and background workers.

## Consequences

- Google Calendar API must be enabled for the existing Google Cloud project.
- The OAuth client needs a client secret and exact backend callback URI.
- A separate encryption key is required in the runtime environment.
- If the encryption key is changed, the calendar must be reconnected.
- Two-way synchronization and automatic recurrence remain future enhancements.
- Existing-appointment matching is suggestive only; the user must confirm the link.
