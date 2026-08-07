"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  BookOpen,
  MessageSquare,
  TrendingUp,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AnalyticsData = {
  overview: {
    totalUsers: number;
    newUsersLast30: number;
    newUsersLast7: number;
    totalEnrollments: number;
    activeEnrollments: number;
    totalLessonCompletions: number;
    recentLogins: number;
    communityPosts: number;
    communityPostsLast30: number;
    coachingSessionsTotal: number;
    coachingSessionsCompleted: number;
  };
  memberGrowthChart: { date: string; count: number }[];
  courseStats: { title: string; enrollments: number; avgCompletion: number }[];
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  const { overview } = data;

  return (
    <div className="p-6 md:p-8 lg:p-12">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl tracking-wider text-foreground">ANALYTICS</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Platform-inzichten van de afgelopen 30 dagen
          </p>
        </div>

        {/* KPI grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Users className="h-5 w-5 text-blue-500" />}
            label="Totaal leden"
            value={overview.totalUsers}
            sub={`+${overview.newUsersLast30} deze maand`}
            color="blue"
            href="/admin/users"
          />
          <StatCard
            icon={<Zap className="h-5 w-5 text-amber-500" />}
            label="Actief (7 dagen)"
            value={overview.recentLogins}
            sub={`van ${overview.totalUsers} totaal`}
            color="amber"
            href="/admin/users"
          />
          <StatCard
            icon={<BookOpen className="h-5 w-5 text-green-500" />}
            label="Actieve enrollments"
            value={overview.activeEnrollments}
            sub={`${overview.totalLessonCompletions} lessen voltooid`}
            color="green"
            href="/admin/courses"
          />
          <StatCard
            icon={<Video className="h-5 w-5 text-purple-500" />}
            label="Coaching sessies"
            value={overview.coachingSessionsTotal}
            sub={`${overview.coachingSessionsCompleted} afgerond`}
            color="purple"
            href="/admin/sessions"
          />
        </div>

        {/* Charts row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Member growth */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Ledengroei (30 dagen)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data.memberGrowthChart}>
                  <defs>
                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2D5A27" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2D5A27" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      fontSize: 12,
                    }}
                    formatter={(v) => [`${v} nieuw`, "Leden"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#2D5A27"
                    strokeWidth={2}
                    fill="url(#colorGrowth)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Course completion */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Cursus voltooiingspercentage
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.courseStats.length === 0 ? (
                <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
                  Nog geen cursusdata beschikbaar
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.courseStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="title"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={120}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                      formatter={(v) => [`${v}%`, "Gem. voltooiing"]}
                    />
                    <Bar dataKey="avgCompletion" fill="#2D5A27" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Community + Coaching stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-8 w-8 text-primary/40" />
                <div>
                  <p className="text-2xl font-bold">{overview.communityPosts}</p>
                  <p className="text-xs text-muted-foreground">Community posts totaal</p>
                  <p className="text-xs text-green-600">+{overview.communityPostsLast30} deze maand</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary/40" />
                <div>
                  <p className="text-2xl font-bold">{overview.newUsersLast7}</p>
                  <p className="text-xs text-muted-foreground">Nieuwe leden (7 dagen)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary/40" />
                <div>
                  <p className="text-2xl font-bold">{overview.totalLessonCompletions}</p>
                  <p className="text-xs text-muted-foreground">Lessen afgerond (totaal)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  color: string;
  href?: string;
}) {
  const card = (
    <Card className={href ? "hover:border-primary/30 transition-colors cursor-pointer" : undefined}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-bold tabular-nums">{value.toLocaleString("nl-BE")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
  if (href) return <Link href={href} className="block">{card}</Link>;
  return card;
}
