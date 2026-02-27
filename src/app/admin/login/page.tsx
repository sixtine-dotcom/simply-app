import { redirect } from "next/navigation";

/**
 * Makkelijk te onthouden: ga naar /admin/login om in te loggen voor het admin-panel.
 * Na inloggen kom je op /admin.
 */
export default function AdminLoginPage() {
  redirect("/login?next=/admin");
}
