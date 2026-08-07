import Link from "next/link";

export function AdminHubCard({
  icon,
  title,
  description,
  href,
  cta,
  active = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  cta: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-[1.6rem] border p-5 transition-colors ${
        active
          ? "border-stone-900 bg-stone-950 text-white shadow-lg"
          : "border-border bg-background/90 hover:border-primary/30"
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className={active ? "text-white" : "text-primary"}>{icon}</span>
        {title}
      </div>
      <p className={`mt-3 text-sm leading-6 ${active ? "text-white/75" : "text-muted-foreground"}`}>
        {description}
      </p>
      <div className={`mt-4 text-sm font-medium ${active ? "text-white" : "text-foreground"}`}>
        {cta}
      </div>
    </Link>
  );
}
