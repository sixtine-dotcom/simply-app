export interface CurrentUserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
  role: string;
  preferredLanguage: "nl" | "en";
  healthProfileCompleted: boolean;
  impersonation?: {
    isActive: true;
    adminUserId: string;
    adminEmail: string;
    adminName: string;
    targetUserId: string;
    targetEmail: string;
  } | null;
}

export async function fetchCurrentUserSummary() {
  const response = await fetch("/api/auth/me");
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Kon gebruiker niet laden");
  }

  return (data?.user ?? null) as CurrentUserSummary | null;
}

export function isAdminRole(role: string | null | undefined) {
  return role === "ADMIN" || role === "SUPERADMIN";
}

export function getDashboardHomeHref(role: string | null | undefined) {
  return isAdminRole(role) ? "/admin" : "/";
}
