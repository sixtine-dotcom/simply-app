import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getLesson } from "@/lib/courses";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "@/components/courses/video-player";
import { LessonCompleteButton } from "./complete-button";
import { 
  ChevronLeft, 
  ChevronRight, 
  Lock,
  FileText,
  Download
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface LessonPageProps {
  params: Promise<{ slug: string; lessonId: string }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { slug, lessonId } = await params;
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }
  if (user.role === "ADMIN") redirect("/admin");

  const lesson = await getLesson(lessonId, user.id);

  if (!lesson) {
    notFound();
  }

  // If lesson is locked, show locked state
  if (lesson.isLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="font-display text-xl tracking-wider mb-2">
              DEZE LES IS NOG NIET BESCHIKBAAR
            </h1>
            <p className="text-muted-foreground mb-6">
              Deze les wordt beschikbaar op {formatDate(lesson.unlocksAt!)}
            </p>
            <Button asChild>
              <Link href={`/courses/${slug}`}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Terug naar cursus
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="p-4 md:p-6 flex items-center justify-between">
          <Link 
            href={`/courses/${slug}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{lesson.module.title}</span>
            <span className="sm:hidden">Terug</span>
          </Link>

          <div className="flex items-center gap-2">
            {lesson.previousLesson && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/courses/${slug}/lessons/${lesson.previousLesson.id}`}>
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Vorige</span>
                </Link>
              </Button>
            )}
            {lesson.nextLesson && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/courses/${slug}/lessons/${lesson.nextLesson.id}`}>
                  <span className="hidden sm:inline mr-1">Volgende</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 md:p-8">
        {/* Title */}
        <h1 className="font-display text-2xl md:text-3xl tracking-wider mb-6">
          {lesson.title.toUpperCase()}
        </h1>

        {/* Video */}
        {lesson.videoUrl && (
          <div className="mb-8">
            <VideoPlayer 
              url={lesson.videoUrl}
              provider={lesson.videoProvider}
              initialProgress={lesson.videoProgress}
            />
          </div>
        )}

        {/* Content */}
        {lesson.content && (
          <div className="prose prose-lg max-w-none mb-8">
            <LessonContent content={lesson.content} />
          </div>
        )}

        {/* Attachments / downloads */}
        {lesson.attachments && lesson.attachments.length > 0 && (
          <div className="mb-8">
            <h2 className="font-medium mb-4">Downloads</h2>
            <p className="text-sm text-muted-foreground mb-4">
              PDF&apos;s en andere bestanden die je kunt downloaden.
            </p>
            <div className="space-y-2">
              {lesson.attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={attachment.type === "pdf" || attachment.type === "file" ? attachment.name : undefined}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors"
                >
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{attachment.name}</span>
                  <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Complete Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t">
          <LessonCompleteButton 
            lessonId={lessonId}
            isCompleted={lesson.isCompleted}
          />

          {lesson.nextLesson && (
            <Button asChild>
              <Link href={`/courses/${slug}/lessons/${lesson.nextLesson.id}`}>
                Volgende les
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function LessonContent({ content }: { content: string }) {
  // Simple markdown-like rendering
  // In production, use a proper markdown renderer like react-markdown
  const lines = content.split("\n");
  
  return (
    <>
      {lines.map((line, index) => {
        // Headers
        if (line.startsWith("# ")) {
          return <h1 key={index} className="text-2xl font-display tracking-wider mt-8 mb-4">{line.slice(2)}</h1>;
        }
        if (line.startsWith("## ")) {
          return <h2 key={index} className="text-xl font-display tracking-wider mt-6 mb-3">{line.slice(3)}</h2>;
        }
        if (line.startsWith("### ")) {
          return <h3 key={index} className="text-lg font-medium mt-4 mb-2">{line.slice(4)}</h3>;
        }
        
        // Lists
        if (line.startsWith("- ")) {
          return <li key={index} className="ml-4">{line.slice(2)}</li>;
        }
        
        // Empty lines
        if (line.trim() === "") {
          return <br key={index} />;
        }
        
        // Regular paragraphs
        return <p key={index} className="mb-4">{line}</p>;
      })}
    </>
  );
}
