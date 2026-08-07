"use client";

import { useEffect, useState } from "react";
import { FileSpreadsheet, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AddUserForm } from "./add-user-form";
import { ImportCSVForm } from "./import-csv-form";

export function UserManagementDialog() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"single" | "csv">("single");

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="mr-2 h-4 w-4" />
        Gebruiker toevoegen
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-user-title"
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-white/70 bg-[#fbfaf7] shadow-2xl"
          >
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-[#fbfaf7]/95 px-6 py-5 backdrop-blur md:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Klantenbestand</p>
                <h2 id="add-user-title" className="mt-2 text-2xl font-semibold">Gebruiker toevoegen</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Venster sluiten">
                <X className="h-5 w-5" />
              </Button>
            </header>

            <div className="p-6 md:p-8">
              <div className="mb-6 grid grid-cols-2 rounded-2xl bg-muted p-1">
                <TabButton active={tab === "single"} onClick={() => setTab("single")}>
                  <UserPlus className="h-4 w-4" /> Eén gebruiker
                </TabButton>
                <TabButton active={tab === "csv"} onClick={() => setTab("csv")}>
                  <FileSpreadsheet className="h-4 w-4" /> CSV importeren
                </TabButton>
              </div>
              {tab === "single" ? <AddUserForm embedded /> : <ImportCSVForm embedded />}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition",
        active ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
