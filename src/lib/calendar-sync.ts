import { db } from "@/lib/db";

export type CalendarProvider = "google" | "microsoft" | "calendly";

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};

function getAppUrl() {
  return process.env.APP_URL || "http://localhost:3000";
}

function getConfig(provider: CalendarProvider) {
  if (provider === "google") {
    return {
      clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: [
        "openid",
        "email",
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    };
  }

  if (provider === "calendly") {
    return {
      clientId: process.env.CALENDLY_CLIENT_ID,
      clientSecret: process.env.CALENDLY_CLIENT_SECRET,
      authUrl: "https://auth.calendly.com/oauth/authorize",
      tokenUrl: "https://auth.calendly.com/oauth/token",
      scopes: ["users:read", "scheduled_events:read"],
    };
  }

  return {
    clientId: process.env.MICROSOFT_CALENDAR_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CALENDAR_CLIENT_SECRET,
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: ["offline_access", "User.Read", "Calendars.ReadWrite"],
  };
}

export function isCalendarProvider(value: string): value is CalendarProvider {
  return value === "google" || value === "microsoft" || value === "calendly";
}

export function getCalendarAuthorizationUrl(provider: CalendarProvider, state: string) {
  const config = getConfig(provider);
  if (!config.clientId) {
    throw new Error("Calendar client id is not configured");
  }

  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", `${getAppUrl()}/api/calendar/callback/${provider}`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scopes.join(" "));
  url.searchParams.set("state", state);
  if (provider === "google") {
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
  }
  return url.toString();
}

export async function connectCalendarProvider(input: {
  userId: string;
  provider: CalendarProvider;
  code: string;
}) {
  const config = getConfig(input.provider);
  if (!config.clientId || !config.clientSecret) {
    throw new Error("Calendar OAuth is not configured");
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: input.code,
      grant_type: "authorization_code",
      redirect_uri: `${getAppUrl()}/api/calendar/callback/${input.provider}`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Calendar token exchange failed: ${await response.text()}`);
  }

  const token = (await response.json()) as TokenResponse;
  const profile = await fetchCalendarProfile(input.provider, token.access_token);
  const expiresAt = token.expires_in
    ? new Date(Date.now() + token.expires_in * 1000)
    : null;

  return db.calendarConnection.upsert({
    where: {
      userId_provider: {
        userId: input.userId,
        provider: input.provider,
      },
    },
    create: {
      userId: input.userId,
      provider: input.provider,
      providerAccountId: profile.id,
      email: profile.email,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt,
      scope: token.scope,
      syncEnabled: true,
    },
    update: {
      providerAccountId: profile.id,
      email: profile.email,
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? undefined,
      expiresAt,
      scope: token.scope,
      syncEnabled: true,
    },
  });
}

export async function syncExternalCalendarEvents(userId: string) {
  const connections = await db.calendarConnection.findMany({
    where: { userId, syncEnabled: true },
  });

  let synced = 0;
  for (const connection of connections) {
    const accessToken = await getValidAccessToken(connection);
    const from = new Date();
    from.setDate(from.getDate() - 7);
    const to = new Date();
    to.setDate(to.getDate() + 90);

    const events =
      connection.provider === "google"
        ? await fetchGoogleEvents(accessToken, from, to)
        : connection.provider === "microsoft"
          ? await fetchMicrosoftEvents(accessToken, from, to)
          : await fetchCalendlyEvents(accessToken, connection.providerAccountId, from, to);

    for (const event of events) {
      await db.externalCalendarEvent.upsert({
        where: {
          connectionId_providerEventId: {
            connectionId: connection.id,
            providerEventId: event.providerEventId,
          },
        },
        create: {
          userId,
          connectionId: connection.id,
          provider: connection.provider,
          ...event,
        },
        update: {
          ...event,
          syncedAt: new Date(),
        },
      });
      synced += 1;
    }

    await db.calendarConnection.update({
      where: { id: connection.id },
      data: { lastSyncedAt: new Date() },
    });
  }

  return { connections: connections.length, synced };
}

export async function syncCoachingSessionsToConnectedCalendars(sessionIds: string[]) {
  const requested = await db.coachingSession.findMany({
    where: { id: { in: sessionIds }, status: "scheduled" },
    select: { id: true, coachId: true, recurrenceOccurrenceKey: true },
  });
  // A newly enrolled participant must not replace the existing invitee list.
  const sessions = await db.coachingSession.findMany({
    where: {
      status: "scheduled",
      OR: requested.map(session => session.recurrenceOccurrenceKey
        ? { coachId: session.coachId, recurrenceOccurrenceKey: session.recurrenceOccurrenceKey }
        : { id: session.id }),
    },
    include: {
      coach: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      client: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { scheduledAt: "asc" },
  });

  const groupedSessions = new Map<string, typeof sessions>();
  for (const session of sessions) {
    const syncKey = session.recurrenceOccurrenceKey || session.id;
    const groupKey = `${session.coachId}:${syncKey}`;
    groupedSessions.set(groupKey, [...(groupedSessions.get(groupKey) || []), session]);
  }

  let synced = 0;
  let failed = 0;
  const connectedCalendars = new Set<string>();
  for (const group of Array.from(groupedSessions.values())) {
    const first = group[0];
    if (!first) continue;
    const syncKey = first.recurrenceOccurrenceKey || first.id;

    const connections = await db.calendarConnection.findMany({
      where: { userId: first.coachId, syncEnabled: true },
    });

    for (const connection of connections) {
      if (connection.provider !== "google" && connection.provider !== "microsoft") continue;

      connectedCalendars.add(connection.id);
      try {
        const accessToken = await getValidAccessToken(connection);
        const existing = await db.syncedCalendarEvent.findUnique({
          where: {
            connectionId_syncKey: {
              connectionId: connection.id,
              syncKey,
            },
          },
        });
        const payload = buildCoachingCalendarEventPayload(syncKey, group);
        const result =
          connection.provider === "google"
            ? await upsertGoogleCalendarEvent(accessToken, existing?.providerEventId, payload)
            : await upsertMicrosoftCalendarEvent(accessToken, existing?.providerEventId, payload);

        await db.syncedCalendarEvent.upsert({
          where: {
            connectionId_syncKey: {
              connectionId: connection.id,
              syncKey,
            },
          },
          create: {
            userId: first.coachId,
            connectionId: connection.id,
            provider: connection.provider,
            syncKey,
            providerEventId: result.providerEventId,
            externalUrl: result.externalUrl,
          },
          update: {
            providerEventId: result.providerEventId,
            externalUrl: result.externalUrl,
            lastSyncedAt: new Date(),
          },
        });
        synced += 1;
      } catch (error) {
        failed += 1;
        console.error("Outbound calendar sync failed:", {
          connectionId: connection.id,
          provider: connection.provider,
          syncKey,
          error,
        });
      }
    }
  }

  return { sessions: sessions.length, synced, failed, connectedCalendars: connectedCalendars.size };
}

export async function syncUpcomingCoachingSessionsForUser(userId: string) {
  const sessions = await db.coachingSession.findMany({
    where: {
      coachId: userId,
      status: "scheduled",
      scheduledAt: { gte: new Date() },
    },
    select: { id: true },
    orderBy: { scheduledAt: "asc" },
    take: 500,
  });

  return syncCoachingSessionsToConnectedCalendars(sessions.map((session) => session.id));
}

export async function getValidAccessToken(connection: {
  id: string;
  provider: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
}) {
  if (!connection.expiresAt || connection.expiresAt.getTime() > Date.now() + 60_000) {
    return connection.accessToken;
  }

  if (!connection.refreshToken || !isCalendarProvider(connection.provider)) {
    return connection.accessToken;
  }

  const config = getConfig(connection.provider);
  if (!config.clientId || !config.clientSecret) {
    return connection.accessToken;
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: connection.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) return connection.accessToken;

  const token = (await response.json()) as TokenResponse;
  await db.calendarConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? undefined,
      expiresAt: token.expires_in
        ? new Date(Date.now() + token.expires_in * 1000)
        : undefined,
    },
  });
  return token.access_token;
}

async function fetchCalendarProfile(provider: CalendarProvider, accessToken: string) {
  const response = await fetch(
    provider === "google"
      ? "https://www.googleapis.com/oauth2/v2/userinfo"
      : provider === "microsoft"
        ? "https://graph.microsoft.com/v1.0/me"
        : "https://api.calendly.com/users/me",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!response.ok) return { id: null, email: null };
  const data = await response.json();
  if (provider === "calendly") {
    return {
      id: data.resource?.uri ?? null,
      email: data.resource?.email ?? null,
    };
  }
  return {
    id: data.id ?? null,
    email: data.email ?? data.userPrincipalName ?? data.mail ?? null,
  };
}

async function fetchGoogleEvents(accessToken: string, from: Date, to: Date) {
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", from.toISOString());
  url.searchParams.set("timeMax", to.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Google calendar sync failed: ${await response.text()}`);
  const data = await response.json();
  return (data.items ?? []).flatMap((event: any) => normalizeExternalEvent(event, "google"));
}

type CoachingCalendarPayload = {
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  attendeeEmails: string[];
};

function buildCoachingCalendarEventPayload(
  syncKey: string,
  sessions: Awaited<ReturnType<typeof db.coachingSession.findMany>>
): CoachingCalendarPayload {
  const first = sessions[0] as any;
  const startsAt = new Date(first.scheduledAt);
  const endsAt = new Date(startsAt.getTime() + first.duration * 60_000);
  const participants = sessions
    .map((session: any) => `${session.client.firstName} ${session.client.lastName}`.trim())
    .filter(Boolean)
    .join(", ");
  const externalParticipants = Array.from(
    new Set(sessions.flatMap((session: any) => session.externalAttendeeEmails ?? []))
  ).join(", ");
  const attendeeEmails = Array.from(
    new Set(
      sessions
        .flatMap((session: any) => [session.client.email, ...(session.externalAttendeeEmails ?? [])])
        .filter(Boolean)
    )
  );
  const appUrl = `${getAppUrl()}/coaching`;

  return {
    title: first.title || "Coaching sessie",
    description: [
      first.description,
      participants ? `Deelnemers: ${participants}` : null,
      externalParticipants ? `Externe deelnemers: ${externalParticipants}` : null,
      `Simply: ${appUrl}`,
      `Sync key: ${syncKey}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    startsAt,
    endsAt,
    attendeeEmails,
  };
}

async function upsertGoogleCalendarEvent(
  accessToken: string,
  providerEventId: string | undefined,
  payload: CoachingCalendarPayload
) {
  const body = {
    summary: payload.title,
    description: payload.description,
    start: { dateTime: payload.startsAt.toISOString() },
    end: { dateTime: payload.endsAt.toISOString() },
    reminders: {
      useDefault: false,
      overrides: [{ method: "popup", minutes: 15 }],
    },
    attendees: payload.attendeeEmails.map((email) => ({ email })),
  };

  const url = providerEventId
    ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${providerEventId}`
    : "https://www.googleapis.com/calendar/v3/calendars/primary/events";
  const googleUrl = new URL(url);
  googleUrl.searchParams.set("sendUpdates", "all");
  const response = await fetch(googleUrl.toString(), {
    method: providerEventId ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Google calendar write failed: ${await response.text()}`);
  const data = await response.json();
  return {
    providerEventId: data.id as string,
    externalUrl: (data.htmlLink as string | undefined) ?? null,
  };
}

async function upsertMicrosoftCalendarEvent(
  accessToken: string,
  providerEventId: string | undefined,
  payload: CoachingCalendarPayload
) {
  const body = {
    subject: payload.title,
    body: {
      contentType: "text",
      content: payload.description,
    },
    start: {
      dateTime: payload.startsAt.toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: payload.endsAt.toISOString(),
      timeZone: "UTC",
    },
    reminderMinutesBeforeStart: 15,
    isReminderOn: true,
    attendees: payload.attendeeEmails.map((email) => ({
      emailAddress: { address: email },
      type: "required",
    })),
  };

  const url = providerEventId
    ? `https://graph.microsoft.com/v1.0/me/events/${providerEventId}`
    : "https://graph.microsoft.com/v1.0/me/events";
  const response = await fetch(url, {
    method: providerEventId ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Microsoft calendar write failed: ${await response.text()}`);
  if (providerEventId && response.status === 204) {
    return { providerEventId, externalUrl: null };
  }
  const data = await response.json();
  return {
    providerEventId: data.id as string,
    externalUrl: (data.webLink as string | undefined) ?? null,
  };
}

async function fetchMicrosoftEvents(accessToken: string, from: Date, to: Date) {
  const url = new URL("https://graph.microsoft.com/v1.0/me/calendarView");
  url.searchParams.set("startDateTime", from.toISOString());
  url.searchParams.set("endDateTime", to.toISOString());
  url.searchParams.set("$top", "100");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Microsoft calendar sync failed: ${await response.text()}`);
  const data = await response.json();
  return (data.value ?? []).flatMap((event: any) => normalizeExternalEvent(event, "microsoft"));
}

async function fetchCalendlyEvents(
  accessToken: string,
  userUri: string | null,
  from: Date,
  to: Date
) {
  if (!userUri) return [];

  const events: any[] = [];
  let nextPage: string | null = null;

  do {
    const url: URL = nextPage
      ? new URL(nextPage)
      : new URL("https://api.calendly.com/scheduled_events");
    if (!nextPage) {
      url.searchParams.set("user", userUri);
      url.searchParams.set("status", "active");
      url.searchParams.set("min_start_time", from.toISOString());
      url.searchParams.set("max_start_time", to.toISOString());
      url.searchParams.set("sort", "start_time:asc");
      url.searchParams.set("count", "100");
    }

    const response: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error(`Calendly calendar sync failed: ${await response.text()}`);
    const data: any = await response.json();
    events.push(...(data.collection ?? []));
    nextPage = data.pagination?.next_page ?? null;
  } while (nextPage);

  return events.flatMap((event) => normalizeExternalEvent(event, "calendly"));
}

function normalizeExternalEvent(event: any, provider: CalendarProvider) {
  if (provider === "calendly") {
    if (!event.uri || !event.start_time || !event.end_time) return [];
    const location = Array.isArray(event.location)
      ? event.location.map((entry: any) => entry.location || entry.type).filter(Boolean).join(", ")
      : event.location?.location ?? event.location?.type ?? null;
    return [
      {
        providerEventId: event.uri,
        title: event.name ?? "Calendly afspraak",
        description: event.event_memberships
          ?.map((membership: any) => membership.user_name)
          .filter(Boolean)
          .join(", ") ?? null,
        location,
        startsAt: new Date(event.start_time),
        endsAt: new Date(event.end_time),
        isAllDay: false,
        externalUrl: event.uri,
      },
    ];
  }

  const startValue =
    provider === "google" ? event.start?.dateTime ?? event.start?.date : event.start?.dateTime;
  const endValue =
    provider === "google" ? event.end?.dateTime ?? event.end?.date : event.end?.dateTime;
  if (!event.id || !startValue || !endValue) return [];

  return [
    {
      providerEventId: event.id,
      title: event.summary ?? event.subject ?? "Externe afspraak",
      description: event.description ?? event.bodyPreview ?? null,
      location: event.location?.displayName ?? event.location ?? null,
      startsAt: new Date(startValue),
      endsAt: new Date(endValue),
      isAllDay: Boolean(event.start?.date && !event.start?.dateTime),
      externalUrl: event.htmlLink ?? event.webLink ?? null,
    },
  ];
}
