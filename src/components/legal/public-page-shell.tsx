import Link from "next/link";
import { publicAppConfig } from "@/lib/public-app";

type PublicPageShellProps = {
  title: string;
  description: string;
  updatedAt: string;
  children: React.ReactNode;
};

export function PublicPageShell({
  title,
  description,
  updatedAt,
  children,
}: PublicPageShellProps) {
  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#172018]">
      <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-8 sm:px-8 sm:py-12">
        <header className="border-b border-[#dfe5da] pb-6">
          <Link href="/" className="text-sm font-semibold text-[#2D5A27]">
            {publicAppConfig.name}
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-[#172018] sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#516053]">{description}</p>
          <p className="mt-4 text-xs font-medium uppercase tracking-normal text-[#6b756d]">
            Laatst bijgewerkt: {updatedAt}
          </p>
        </header>
        <div className="prose prose-neutral mt-8 max-w-none prose-headings:text-[#172018] prose-p:text-[#3f4a41] prose-li:text-[#3f4a41] prose-a:text-[#2D5A27]">
          {children}
        </div>
      </section>
    </main>
  );
}
