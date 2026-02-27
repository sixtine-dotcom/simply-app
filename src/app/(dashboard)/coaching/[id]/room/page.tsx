import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSession } from "@/lib/coaching";
import { VideoRoomLoader } from "@/components/coaching/video-room-loader";

interface VideoRoomPageProps {
  params: Promise<{ id: string }>;
}

export default async function VideoRoomPage({ params }: VideoRoomPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }

  const session = await getSession(id, user.id);

  if (!session) {
    notFound();
  }

  // Check if user is participant
  const isClient = session.client.id === user.id;
  const isCoach = session.coach.id === user.id;

  if (!isClient && !isCoach && user.role !== "ADMIN") {
    redirect("/coaching");
  }

  const userName = `${user.firstName} ${user.lastName}`;

  return <VideoRoomLoader sessionId={session.id} userName={userName} />;
}
