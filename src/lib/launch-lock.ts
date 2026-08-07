const DEFAULT_ALLOWED_EMAILS = [
  "sixtine@simplyinbalance.com",
];

function parseEmailList(value: string | undefined) {
  return (value || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isLaunchLockEnabled() {
  return process.env.LAUNCH_LOCK_ENABLED === "true";
}

export function getLaunchAllowedEmails() {
  return new Set([
    ...DEFAULT_ALLOWED_EMAILS,
    ...parseEmailList(process.env.LAUNCH_ALLOWED_EMAILS),
  ]);
}

export function isEmailAllowedDuringLaunch(email: string) {
  if (!isLaunchLockEnabled()) return true;
  return getLaunchAllowedEmails().has(email.trim().toLowerCase());
}

export function launchLockMessage() {
  return "Het platform staat nog in pre-launch. Alleen testaccounts hebben momenteel toegang.";
}
