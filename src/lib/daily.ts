/**
 * Daily.co API integration
 * 
 * Creates video rooms and meeting tokens for coaching sessions
 */

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_URL = "https://api.daily.co/v1";

interface DailyRoom {
  id: string;
  name: string;
  url: string;
  config: {
    exp?: number;
    max_participants?: number;
    enable_chat?: boolean;
    enable_screenshare?: boolean;
  };
}

interface DailyToken {
  token: string;
}

/**
 * Create a Daily.co room for a coaching session
 * @param roomName - unique room name (default session-{sessionId}); for group use e.g. group-{occurrenceKey}
 * @param maxParticipants - default 2 for 1-on-1, use 20+ for group
 */
export async function createDailyRoom(
  sessionId: string,
  scheduledAt: Date,
  duration: number,
  options?: { roomName?: string; maxParticipants?: number }
): Promise<{ roomId: string; roomUrl: string }> {
  if (!DAILY_API_KEY) {
    throw new Error("DAILY_API_KEY is not configured");
  }

  const roomName = options?.roomName ?? `session-${sessionId}`;
  const maxParticipants = options?.maxParticipants ?? 2;

  // Room expires 1 hour after session end
  const expiresAt = Math.floor(
    (scheduledAt.getTime() + duration * 60000 + 3600000) / 1000
  );

  const response = await fetch(`${DAILY_API_URL}/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      name: roomName,
      privacy: "private",
      config: {
        exp: expiresAt,
        max_participants: maxParticipants,
        enable_chat: true,
        enable_screenshare: true,
        enable_recording: "cloud",
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Daily room: ${error}`);
  }

  const room: DailyRoom = await response.json();

  return {
    roomId: room.id,
    roomUrl: room.url,
  };
}

/**
 * Create a meeting token for a participant
 */
export async function createDailyToken(
  roomName: string,
  userName: string,
  userId: string,
  isOwner: boolean = false,
  expiresAt?: number
): Promise<string> {
  if (!DAILY_API_KEY) {
    throw new Error("DAILY_API_KEY is not configured");
  }

  const response = await fetch(`${DAILY_API_URL}/meeting-tokens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_name: userName,
        user_id: userId,
        is_owner: isOwner,
        exp: expiresAt,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Daily token: ${error}`);
  }

  const tokenData: DailyToken = await response.json();
  return tokenData.token;
}

/**
 * Start cloud recording for a room (auto-record sessions)
 */
export async function startRecording(roomName: string): Promise<void> {
  if (!DAILY_API_KEY) {
    throw new Error("DAILY_API_KEY is not configured");
  }

  const response = await fetch(
    `${DAILY_API_URL}/rooms/${encodeURIComponent(roomName)}/recordings/start`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        type: "cloud",
        layout: { preset: "default", max_cam_streams: 20 },
        maxDuration: 10800,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to start recording: ${err}`);
  }
}

/**
 * Get a time-limited playback URL for a recording
 */
export async function getRecordingAccessLink(
  recordingId: string,
  validForSecs: number = 3600
): Promise<{ download_link: string; expires: number }> {
  if (!DAILY_API_KEY) {
    throw new Error("DAILY_API_KEY is not configured");
  }

  const response = await fetch(
    `${DAILY_API_URL}/recordings/${encodeURIComponent(recordingId)}/access-link?valid_for_secs=${validForSecs}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to get recording link: ${err}`);
  }

  return response.json();
}
