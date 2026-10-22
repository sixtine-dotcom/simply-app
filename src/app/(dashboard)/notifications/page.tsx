"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUserSummary } from "@/hooks/use-current-user";
import { getDashboardHomeHref } from "@/lib/current-user";
import { Bell, ChevronLeft, Calendar, ShieldAlert, TrendingUp } from "lucide-react";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useCurrentUserSummary();
  const backHref = getDashboardHomeHref(user?.role);

  useEffect(() => {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        if (data.notifications) setNotifications(data.notifications);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-8">
      <header className="border-b border-slate-200 pb-4">
        <Link href={backHref} className="inline-flex items-center text-xs text-slate-500 hover:text-slate-900">
          <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Terug
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-slate-950">Meldingen</h1>
        <p className="mt-1 text-xs text-slate-500">Herinneringen en updates.</p>
      </header>

      {loading ? (
        <p className="text-muted-foreground">Laden...</p>
      ) : notifications.length === 0 ? (
        <Card className="app-halo">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto opacity-50 mb-4" />
            Geen meldingen
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={n.link || "#"}
              onClick={() => !n.isRead && markRead(n.id)}
              className="block"
            >
              <Card
                className={
                  n.isRead
                    ? "app-halo opacity-80 hover:opacity-100"
                    : "app-halo border-primary/30 bg-primary/5"
                }
              >
                <CardContent className="p-4 flex gap-3">
                  {n.type === "session_reminder" && (
                    <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  )}
                  {n.type === "weekly_summary" && (
                    <TrendingUp className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  )}
                  {n.type === "security" && (
                    <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{n.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {n.body}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(n.createdAt).toLocaleString("nl-NL")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
