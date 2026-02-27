import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getSession,
  updateSessionRoom,
  getSessionsByOccurrenceKey,
  updateSessionsRoomByOccurrenceKey,
} from "@/lib/coaching";
import { createDailyRoom, createDailyToken, startRecording } from "@/lib/daily";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const session = await getSession(id, user.id);

    if (!session) {
      return NextResponse.json(
        { error: "Sessie niet gevonden" },
        { status: 404 }
      );
    }

    // Check if user is participant
    const isClient = session.client.id === user.id;
    const isCoach = session.coach.id === user.id;

    if (!isClient && !isCoach && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Geen toegang tot deze sessie" },
        { status: 403 }
      );
    }

    let roomId = session.roomId;
    let roomUrl = session.roomUrl;
    const isGroupSession = !!session.recurrenceOccurrenceKey;
    const roomName = isGroupSession
      ? `group-${session.recurrenceOccurrenceKey}`
      : `session-${session.id}`;

    if (!roomId || !roomUrl) {
      try {
        if (isGroupSession) {
          // Groepssessie: kijk of een andere sessie van dezelfde occurrence al een room heeft
          const siblings = await getSessionsByOccurrenceKey(
            session.recurrenceOccurrenceKey!
          );
          const withRoom = siblings.find((s) => s.roomUrl && s.roomId);
          if (withRoom) {
            roomId = withRoom.roomId;
            roomUrl = withRoom.roomUrl;
            await updateSessionRoom(session.id, roomId!, roomUrl!);
          } else {
            const room = await createDailyRoom(
              session.id,
              session.scheduledAt,
              session.duration,
              {
                roomName,
                maxParticipants: 20,
              }
            );
            roomId = room.roomId;
            roomUrl = room.roomUrl;
            await updateSessionsRoomByOccurrenceKey(
              session.recurrenceOccurrenceKey!,
              roomId,
              roomUrl
            );
            try {
              await startRecording(roomName);
            } catch (e) {
              console.error("Start recording failed:", e);
            }
          }
        } else {
          const room = await createDailyRoom(
            session.id,
            session.scheduledAt,
            session.duration
          );
          roomId = room.roomId;
          roomUrl = room.roomUrl;
          await updateSessionRoom(session.id, roomId, roomUrl);
          try {
            await startRecording(roomName);
          } catch (e) {
            console.error("Start recording failed:", e);
          }
        }
      } catch (error) {
        console.error("Failed to create Daily room:", error);
        return NextResponse.json(
          {
            error:
              "Kon video room niet aanmaken. Controleer je Daily.co configuratie.",
          },
          { status: 500 }
        );
      }
    }

    const userName = `${user.firstName} ${user.lastName}`;
    const isOwner = isCoach || user.role === "ADMIN";
    const expiresAt = Math.floor(
      (session.scheduledAt.getTime() + session.duration * 60000 + 3600000) /
        1000
    );

    try {
      const token = await createDailyToken(
        roomName,
        userName,
        user.id,
        isOwner,
        expiresAt
      );

      return NextResponse.json({
        roomUrl,
        token,
        roomName,
      });
    } catch (error) {
      console.error("Failed to create Daily token:", error);
      return NextResponse.json(
        {
          error:
            "Kon toegangstoken niet aanmaken. Controleer je Daily.co configuratie.",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Get room error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
