"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, ChevronLeft, Calendar, TrendingUp } from "lucide-react";

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
    <div className="p-6 md:p-8 lg:p-12 max-w-2xl">
      <Link
        href="/"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Terug
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl tracking-wider flex items-center gap-2">
          <Bell className="h-6 w-6" />
          MELDINGEN
        </h1>
        <p className="mt-2 text-muted-foreground">
          Herinneringen en updates (o.a. 1u15 voor coaching)
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Laden...</p>
      ) : notifications.length === 0 ? (
        <Card>
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
                    ? "opacity-80 hover:opacity-100"
                    : "border-primary/30 bg-primary/5"
                }
              >
                <CardContent className="p-4 flex gap-3">
                  {n.type === "session_reminder" && (
                    <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  )}
                  {n.type === "weekly_summary" && (
                    <TrendingUp className="h-5 w-5 text-primary shrink-0 mt-0.5" />
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
  );
}
