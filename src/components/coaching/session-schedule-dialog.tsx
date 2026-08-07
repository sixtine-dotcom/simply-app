"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  Clock,
  Loader2,
  Save,
  Users,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ScheduleMode = "individual" | "group";

type CalendarPreviewItem = {
  id: string;
  title: string;
  subtitle: string;
  startsAt: string;
  endsAt: string;
  type: "simply" | "external";
};

type UserOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type CourseOption = {
  id: string;
  title: string;
  _count?: {
    enrollments?: number;
  };
};

type ParticipantGroup = {
  id: string;
  title: string;
  participantIds: string[];
  participantCount: number;
};

type IndividualForm = {
  clientIds: string[];
  externalAttendeeEmails: string[];
  coachId: string;
  title: string;
  description: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
};

type GroupForm = {
  courseId: string;
  title: string;
  description: string;
  scheduleMode: "weekly" | "biweekly" | "monthly" | "custom";
  dayOfWeek: number;
  startTime: string;
  duration: string;
  startDate: string;
  endDate: string;
  customDates: string[];
};

const SCHEDULE_MODES = [
  { value: "weekly", label: "Wekelijks" },
  { value: "biweekly", label: "Tweewekelijks" },
  { value: "monthly", label: "Maandelijks" },
  { value: "custom", label: "Flexibel" },
] as const;

const DAYS = [
  { value: 1, label: "Maandag" },
  { value: 2, label: "Dinsdag" },
  { value: 3, label: "Woensdag" },
  { value: 4, label: "Donderdag" },
  { value: 5, label: "Vrijdag" },
  { value: 6, label: "Zaterdag" },
  { value: 0, label: "Zondag" },
];

const DURATION_OPTIONS = [15, 30, 45, 60, 75, 90, 120];
const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours = Math.floor(index / 2);
  const minutes = index % 2 === 0 ? "00" : "30";
  return `${String(hours).padStart(2, "0")}:${minutes}`;
});

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addMinutes(timeValue: string, minutes: number) {
  const [hours, currentMinutes] = timeValue.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, currentMinutes + minutes, 0, 0);
  return date.toTimeString().slice(0, 5);
}

function getDurationMinutes(dateValue: string, startTime: string, endTime: string) {
  if (!dateValue || !startTime || !endTime) return null;
  const startsAt = new Date(`${dateValue}T${startTime}`);
  const endsAt = new Date(`${dateValue}T${endTime}`);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return null;
  return Math.round((endsAt.getTime() - startsAt.getTime()) / 60000);
}

function formatDuration(minutes: number | null) {
  if (!minutes || minutes <= 0) return "Kies begin- en eindtijd";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${minutes} minuten`;
  return `${hours} uur${rest ? ` ${rest} minuten` : ""}`;
}

function formatTimeOption(timeValue: string) {
  return timeValue;
}

function getInitialIndividualForm(): IndividualForm {
  const now = new Date();
  const roundedHour = new Date(now);
  roundedHour.setMinutes(now.getMinutes() > 30 ? 60 : 30, 0, 0);
  const startTime = roundedHour.toTimeString().slice(0, 5);
  return {
    clientIds: [],
    externalAttendeeEmails: [],
    coachId: "",
    title: "",
    description: "",
    scheduledDate: formatDateInput(now),
    startTime,
    endTime: addMinutes(startTime, 30),
  };
}

function getInitialGroupForm(): GroupForm {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 56);
  return {
    courseId: "",
    title: "",
    description: "",
    scheduleMode: "weekly",
    dayOfWeek: 1,
    startTime: "19:30",
    duration: "60",
    startDate: formatDateInput(now),
    endDate: formatDateInput(end),
    customDates: [formatDateInput(now)],
  };
}

export function SessionScheduleDialog({ items = [] }: { items?: CalendarPreviewItem[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [mode, setMode] = useState<ScheduleMode | null>(null);
  const [processedSlotKey, setProcessedSlotKey] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<UserOption[]>([]);
  const [coaches, setCoaches] = useState<UserOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [participantGroups, setParticipantGroups] = useState<ParticipantGroup[]>([]);
  const [individualForm, setIndividualForm] = useState<IndividualForm>(getInitialIndividualForm);
  const [groupForm, setGroupForm] = useState<GroupForm>(getInitialGroupForm);
  const slotDate = searchParams.get("slotDate") || "";
  const slotStart = searchParams.get("start") || "";
  const slotKey = `${searchParams.get("newEvent") || ""}:${slotDate}:${slotStart}`;

  useEffect(() => {
    if (searchParams.get("newEvent") !== "individual" || !slotDate || !slotStart) return;
    if (processedSlotKey === slotKey) return;

    setIndividualForm((current) => ({
      ...current,
      scheduledDate: slotDate,
      startTime: slotStart,
      endTime: addMinutes(slotStart, 30),
    }));
    setMode("individual");
    setIsMenuOpen(false);
    setProcessedSlotKey(slotKey);
  }, [processedSlotKey, searchParams, slotDate, slotKey, slotStart]);

  useEffect(() => {
    if (!mode) return;

    fetch("/api/admin/users?role=CLIENT")
      .then((res) => res.json())
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch(console.error);

    fetch("/api/admin/users?role=COACH")
      .then((res) => res.json())
      .then((data) => setCoaches(Array.isArray(data) ? data : []))
      .catch(console.error);

    fetch("/api/admin/courses")
      .then((res) => res.json())
      .then((data) => setCourses(Array.isArray(data) ? data : []))
      .catch(console.error);

    fetch("/api/admin/sessions/participant-groups")
      .then((res) => res.json())
      .then((data) => setParticipantGroups(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, [mode]);

  const selectedDate = mode === "group" ? groupForm.startDate : individualForm.scheduledDate;
  const dayItems = useMemo(
    () =>
      items
        .map((item) => ({
          ...item,
          startsAtDate: new Date(item.startsAt),
          endsAtDate: new Date(item.endsAt),
        }))
        .filter((item) => formatDateInput(item.startsAtDate) === selectedDate)
        .sort((a, b) => a.startsAtDate.getTime() - b.startsAtDate.getTime()),
    [items, selectedDate]
  );

  const duration = getDurationMinutes(
    individualForm.scheduledDate,
    individualForm.startTime,
    individualForm.endTime
  );

  const close = () => {
    if (!isLoading) setMode(null);
  };

  const submitIndividual = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      if (!duration || duration < 5) {
        throw new Error("Eindtijd moet minstens 5 minuten na de begintijd liggen");
      }

      const scheduledAt = new Date(
        `${individualForm.scheduledDate}T${individualForm.startTime}`
      );

      const response = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientIds: individualForm.clientIds,
          externalAttendeeEmails: individualForm.externalAttendeeEmails,
          coachId: individualForm.coachId || undefined,
          title: individualForm.title || undefined,
          description: individualForm.description || undefined,
          scheduledAt: scheduledAt.toISOString(),
          duration,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kon sessie niet plannen");

      toast({ title: "Sessie gepland", description: "De afspraak staat in de agenda." });
      setIndividualForm(getInitialIndividualForm());
      setMode(null);
      router.refresh();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon sessie niet plannen",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const submitGroup = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/sessions/recurring-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: groupForm.courseId,
          title: groupForm.title,
          description: groupForm.description,
          scheduleMode: groupForm.scheduleMode,
          dayOfWeek: groupForm.dayOfWeek,
          startTime: groupForm.startTime,
          duration: parseInt(groupForm.duration, 10),
          startDate: groupForm.startDate,
          endDate: groupForm.endDate,
          customDates: groupForm.customDates.filter(Boolean),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kon groepssessies niet plannen");

      toast({
        title: "Groepssessies gepland",
        description: data.message || "De reeks staat in de agenda.",
      });
      setGroupForm(getInitialGroupForm());
      setMode(null);
      router.refresh();
    } catch (error) {
      toast({
        title: "Fout",
        description:
          error instanceof Error ? error.message : "Kon groepssessies niet plannen",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="relative">
        <Button
          onClick={() => setIsMenuOpen((current) => !current)}
          className="h-10 rounded-md bg-[#12483b] px-4 text-white hover:bg-[#0f3d32]"
        >
          <CalendarPlus className="mr-2 h-4 w-4" />
          Nieuw
        </Button>
        {isMenuOpen ? (
          <div className="absolute right-0 top-12 z-40 w-72 rounded-md border bg-background py-2 shadow-xl">
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted"
              onClick={() => {
                setMode("individual");
                setIsMenuOpen(false);
              }}
            >
              <UserRound className="h-4 w-4 text-muted-foreground" />
              <span>
                <span className="block font-medium">Gebeurtenis</span>
                <span className="block text-xs text-muted-foreground">Individuele sessie of kleine groep</span>
              </span>
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted"
              onClick={() => {
                setMode("group");
                setIsMenuOpen(false);
              }}
            >
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>
                <span className="block font-medium">Reeks</span>
                <span className="block text-xs text-muted-foreground">Groepssessies met herhaling</span>
              </span>
            </button>
          </div>
        ) : null}
      </div>

      {mode ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 p-3 pt-10 backdrop-blur-sm md:p-6 md:pt-12"
          role="dialog"
          aria-modal="true"
          aria-labelledby="schedule-dialog-title"
        >
          <div className="w-full max-w-5xl rounded-lg border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <h2 id="schedule-dialog-title" className="text-base font-semibold text-foreground">
                Nieuwe gebeurtenis
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  form={mode === "individual" ? "individual-session-form" : "group-session-form"}
                  type="submit"
                  disabled={isLoading}
                  className="bg-[#12483b] hover:bg-[#0f3d32]"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Opslaan
                </Button>
                <Button variant="ghost" size="sm" onClick={close} aria-label="Sluiten">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-b bg-muted/10 px-4 py-2.5">
              <Button
                type="button"
                variant={mode === "individual" ? "default" : "outline"}
                onClick={() => setMode("individual")}
                className={mode === "individual" ? "bg-[#12483b] hover:bg-[#0f3d32]" : ""}
              >
                <UserRound className="mr-2 h-4 w-4" />
                Gebeurtenis
              </Button>
              <Button
                type="button"
                variant={mode === "group" ? "default" : "outline"}
                onClick={() => setMode("group")}
                className={mode === "group" ? "bg-[#12483b] hover:bg-[#0f3d32]" : ""}
              >
                <Users className="mr-2 h-4 w-4" />
                Reeks
              </Button>
            </div>

            <div className="grid max-h-[calc(100vh-180px)] gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              {mode === "individual" ? (
                <IndividualSessionForm
                  form={individualForm}
                  setForm={setIndividualForm}
                  clients={clients}
                  coaches={coaches}
                  participantGroups={participantGroups}
                  duration={duration}
                  onSubmit={submitIndividual}
                />
              ) : (
                <GroupSessionForm
                  form={groupForm}
                  setForm={setGroupForm}
                  courses={courses}
                  onSubmit={submitGroup}
                />
              )}

              <CalendarPreview selectedDate={selectedDate} items={dayItems} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function IndividualSessionForm({
  form,
  setForm,
  clients,
  coaches,
  participantGroups,
  duration,
  onSubmit,
}: {
  form: IndividualForm;
  setForm: (form: IndividualForm) => void;
  clients: UserOption[];
  coaches: UserOption[];
  participantGroups: ParticipantGroup[];
  duration: number | null;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form id="individual-session-form" onSubmit={onSubmit} className="space-y-3">
      <IconField icon={<CalendarPlus className="h-5 w-5" />}>
        <Input
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          placeholder="Titel toevoegen"
          className="h-9 border-0 border-b px-0 text-base shadow-none focus-visible:ring-0"
          autoFocus
        />
      </IconField>

      <IconField icon={<Users className="h-5 w-5" />}>
        <ParticipantSelector
          clients={clients}
          participantGroups={participantGroups}
          selectedClientIds={form.clientIds}
          externalEmails={form.externalAttendeeEmails}
          onClientChange={(clientIds) => setForm({ ...form, clientIds })}
          onExternalEmailChange={(externalAttendeeEmails) =>
            setForm({ ...form, externalAttendeeEmails })
          }
        />
      </IconField>

      <IconField icon={<Clock className="h-5 w-5" />}>
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Datum">
            <Input
              type="date"
              value={form.scheduledDate}
              onChange={(event) => setForm({ ...form, scheduledDate: event.target.value })}
              required
            />
          </Field>
          <Field label="Begin">
            <TimeSelect
              value={form.startTime}
              onChange={(value) =>
                setForm({
                  ...form,
                  startTime: value,
                  endTime:
                    getDurationMinutes(form.scheduledDate, value, form.endTime) &&
                    getDurationMinutes(form.scheduledDate, value, form.endTime)! > 0
                      ? form.endTime
                      : addMinutes(value, 30),
                })
              }
              required
            />
          </Field>
          <Field label="Einde">
            <TimeSelect
              value={form.endTime}
              onChange={(value) => setForm({ ...form, endTime: value })}
              required
            />
          </Field>
          <Field label="Duur">
            <div className="flex min-h-10 items-center rounded-md border bg-muted/20 px-3 text-sm text-muted-foreground">
              {formatDuration(duration)}
            </div>
          </Field>
        </div>
      </IconField>

      {coaches.length > 0 ? (
        <IconField icon={<UserRound className="h-5 w-5" />}>
          <Field label="Coach">
            <select
              value={form.coachId}
              onChange={(event) => setForm({ ...form, coachId: event.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Huidige gebruiker / admin</option>
              {coaches.map((coach) => (
                <option key={coach.id} value={coach.id}>
                  {coach.firstName} {coach.lastName} ({coach.email})
                </option>
              ))}
            </select>
          </Field>
        </IconField>
      ) : null}

      <IconField icon={<CalendarDays className="h-5 w-5" />}>
        <div className="rounded-sm border border-[#d1d1d1] bg-white">
          <Textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Beschrijving toevoegen"
            className="min-h-[260px] resize-y border-0 bg-white p-4 text-sm leading-6 shadow-none focus-visible:ring-1 focus-visible:ring-[#12483b]"
          />
        </div>
      </IconField>
    </form>
  );
}

function ParticipantSelector({
  clients,
  participantGroups,
  selectedClientIds,
  externalEmails,
  onClientChange,
  onExternalEmailChange,
}: {
  clients: UserOption[];
  participantGroups: ParticipantGroup[];
  selectedClientIds: string[];
  externalEmails: string[];
  onClientChange: (clientIds: string[]) => void;
  onExternalEmailChange: (emails: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const allClientIds = clients.map((client) => client.id);
  const selectedSet = new Set(selectedClientIds);
  const allClientsSelected =
    allClientIds.length > 0 && allClientIds.every((id) => selectedSet.has(id));

  const setClientIds = (clientIds: string[]) => {
    onClientChange(Array.from(new Set(clientIds)).filter(Boolean));
  };

  const toggleAllClients = (checked: boolean) => {
    setClientIds(checked ? allClientIds : []);
  };

  const toggleGroup = (group: ParticipantGroup, checked: boolean) => {
    setClientIds(
      checked
        ? [...selectedClientIds, ...group.participantIds]
        : selectedClientIds.filter((id) => !group.participantIds.includes(id))
    );
  };

  const toggleClient = (clientId: string, checked: boolean) => {
    setClientIds(
      checked
        ? [...selectedClientIds, clientId]
        : selectedClientIds.filter((id) => id !== clientId)
    );
  };

  const summary =
    selectedClientIds.length === 0 && externalEmails.length === 0
      ? "Vereiste deelnemers uitnodigen"
      : allClientsSelected
        ? `Alle klanten (${selectedClientIds.length})${externalEmails.length ? ` + ${externalEmails.length} extern` : ""}`
        : `${selectedClientIds.length + externalEmails.length} deelnemer${selectedClientIds.length + externalEmails.length === 1 ? "" : "s"} geselecteerd`;

  const addExternalEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    onExternalEmailChange(Array.from(new Set([...externalEmails, email])));
    setEmailInput("");
  };

  const removeExternalEmail = (email: string) => {
    onExternalEmailChange(externalEmails.filter((entry) => entry !== email));
  };

  return (
    <div className="space-y-2">
      <Label>Deelnemers uitnodigen *</Label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="flex min-h-10 w-full items-center justify-between gap-3 border-b border-input bg-background py-2 text-left text-sm"
        >
          <span className={selectedClientIds.length ? "text-foreground" : "text-muted-foreground"}>
            {summary}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {isOpen ? (
          <div className="mt-2 overflow-hidden rounded-md border bg-background shadow-xl">
            <div className="max-h-80 overflow-y-auto p-2">
              <div className="px-3 py-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Externe deelnemers
                </p>
                <div className="mt-2 flex gap-2">
                  <Input
                    type="email"
                    value={emailInput}
                    onChange={(event) => setEmailInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === "," || event.key === "Tab") {
                        event.preventDefault();
                        addExternalEmail();
                      }
                    }}
                    placeholder="naam@email.com"
                    className="h-9 rounded-sm"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addExternalEmail}>
                    Voeg toe
                  </Button>
                </div>
                {externalEmails.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {externalEmails.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 rounded-full bg-[#e7f1ed] px-2.5 py-1 text-xs text-[#123b32]"
                      >
                        {email}
                        <button
                          type="button"
                          onClick={() => removeExternalEmail(email)}
                          className="rounded-full px-1 hover:bg-[#d4e5de]"
                          aria-label={`${email} verwijderen`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="my-1 border-t" />

              <label className="flex cursor-pointer items-start gap-3 rounded-sm px-3 py-2.5 text-sm hover:bg-muted">
                <input
                  type="checkbox"
                  checked={allClientsSelected}
                  disabled={allClientIds.length === 0}
                  onChange={(event) => toggleAllClients(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#12483b]"
                />
                <span>
                  <span className="block font-medium">Alle klanten</span>
                  <span className="block text-xs text-muted-foreground">
                    {clients.length} klant{clients.length === 1 ? "" : "en"}
                  </span>
                </span>
              </label>

              <div className="my-1 border-t" />

              <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase text-muted-foreground">
                Groepen
              </p>
              {participantGroups.length > 0 ? (
                participantGroups.map((group) => {
                  const selectedCount = group.participantIds.filter((id) =>
                    selectedSet.has(id)
                  ).length;
                  const checked =
                    group.participantIds.length > 0 &&
                    selectedCount === group.participantIds.length;

                  return (
                    <label
                      key={group.id}
                      className="flex cursor-pointer items-start gap-3 rounded-sm px-3 py-2.5 text-sm hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={group.participantIds.length === 0}
                        onChange={(event) => toggleGroup(group, event.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[#12483b]"
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{group.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          {selectedCount}/{group.participantCount} geselecteerd
                        </span>
                      </span>
                    </label>
                  );
                })
              ) : (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  Geen groepen gevonden.
                </p>
              )}

              <div className="my-1 border-t" />

              <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase text-muted-foreground">
                Individuele klanten
              </p>
              {clients.length > 0 ? (
                clients.map((client) => (
                  <label
                    key={client.id}
                    className="flex cursor-pointer items-start gap-3 rounded-sm px-3 py-2.5 text-sm hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSet.has(client.id)}
                      onChange={(event) => toggleClient(client.id, event.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[#12483b]"
                    />
                    <span className="min-w-0">
                      <span className="block truncate">
                        {client.firstName} {client.lastName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {client.email}
                      </span>
                    </span>
                  </label>
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  Geen klanten gevonden.
                </p>
              )}
            </div>
            <div className="flex items-center justify-between border-t bg-muted/20 px-3 py-2">
              <span className="text-xs text-muted-foreground">
                {selectedClientIds.length + externalEmails.length} geselecteerd
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setClientIds([]);
                  onExternalEmailChange([]);
                }}
              >
                Selectie wissen
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GroupSessionForm({
  form,
  setForm,
  courses,
  onSubmit,
}: {
  form: GroupForm;
  setForm: (form: GroupForm) => void;
  courses: CourseOption[];
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form id="group-session-form" onSubmit={onSubmit} className="space-y-3">
      <IconField icon={<Users className="h-5 w-5" />}>
        <Field label="Cursus / traject *">
          <select
            value={form.courseId}
            onChange={(event) => {
              const course = courses.find((entry) => entry.id === event.target.value);
              setForm({
                ...form,
                courseId: event.target.value,
                title: form.title || (course ? `Groepscoaching ${course.title}` : ""),
              });
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
          >
            <option value="">Selecteer cursus</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </Field>
      </IconField>

      <IconField icon={<CalendarPlus className="h-5 w-5" />}>
        <Input
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          placeholder="Titel toevoegen"
          className="h-9 border-0 border-b px-0 text-base shadow-none focus-visible:ring-0"
          required
        />
      </IconField>

      <IconField icon={<Clock className="h-5 w-5" />}>
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Herhaling">
            <select
              value={form.scheduleMode}
              onChange={(event) =>
                setForm({
                  ...form,
                  scheduleMode: event.target.value as GroupForm["scheduleMode"],
                })
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {SCHEDULE_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Vanaf">
            <Input
              type="date"
              value={form.startDate}
              onChange={(event) => setForm({ ...form, startDate: event.target.value })}
              required
            />
          </Field>
          <Field label="Tot en met">
            <Input
              type="date"
              value={form.endDate}
              onChange={(event) => setForm({ ...form, endDate: event.target.value })}
              required
            />
          </Field>
          <Field label="Starttijd">
            <TimeSelect
              value={form.startTime}
              onChange={(value) => setForm({ ...form, startTime: value })}
              required
            />
          </Field>
        </div>
      </IconField>

      {form.scheduleMode === "weekly" || form.scheduleMode === "biweekly" ? (
        <IconField icon={<CalendarDays className="h-5 w-5" />}>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Dag van de week">
              <select
                value={form.dayOfWeek}
                onChange={(event) =>
                  setForm({ ...form, dayOfWeek: parseInt(event.target.value, 10) })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {DAYS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Duur">
              <DurationPicker form={form} setForm={setForm} />
            </Field>
          </div>
        </IconField>
      ) : (
        <IconField icon={<CalendarDays className="h-5 w-5" />}>
          <div className="space-y-3">
            <Field label="Duur">
              <DurationPicker form={form} setForm={setForm} />
            </Field>
            {form.scheduleMode === "custom" ? (
              <div className="space-y-2">
                <Label>Flexibele datums</Label>
                {form.customDates.map((date, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="date"
                      value={date}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          customDates: form.customDates.map((entry, entryIndex) =>
                            entryIndex === index ? event.target.value : entry
                          ),
                        })
                      }
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setForm({
                          ...form,
                          customDates:
                            form.customDates.length > 1
                              ? form.customDates.filter((_, entryIndex) => entryIndex !== index)
                              : [""],
                        })
                      }
                    >
                      Verwijder
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForm({ ...form, customDates: [...form.customDates, ""] })}
                >
                  Datum toevoegen
                </Button>
              </div>
            ) : null}
          </div>
        </IconField>
      )}

      <IconField icon={<CalendarDays className="h-5 w-5" />}>
        <div className="rounded-sm border border-[#d1d1d1] bg-white">
          <Textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Beschrijving toevoegen"
            className="min-h-[260px] resize-y border-0 bg-white p-4 text-sm leading-6 shadow-none focus-visible:ring-1 focus-visible:ring-[#12483b]"
          />
        </div>
      </IconField>
    </form>
  );
}

function TimeSelect({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="h-10 w-full appearance-none rounded-sm border border-[#bdbdbd] bg-white px-3 pr-9 text-sm text-[#242424] shadow-none outline-none transition focus:border-[#12483b] focus:ring-1 focus:ring-[#12483b]"
      >
        {TIME_OPTIONS.map((time) => (
          <option key={time} value={time}>
            {formatTimeOption(time)}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-[#616161]" />
    </div>
  );
}

function DurationPicker({ form, setForm }: { form: GroupForm; setForm: (form: GroupForm) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
      <select
        value={DURATION_OPTIONS.includes(parseInt(form.duration, 10)) ? form.duration : "custom"}
        onChange={(event) =>
          setForm({
            ...form,
            duration: event.target.value === "custom" ? form.duration : event.target.value,
          })
        }
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        {DURATION_OPTIONS.map((minutes) => (
          <option key={minutes} value={minutes}>
            {minutes < 60
              ? `${minutes} minuten`
              : `${Math.floor(minutes / 60)} uur${minutes % 60 ? ` ${minutes % 60} minuten` : ""}`}
          </option>
        ))}
        <option value="custom">Aangepast</option>
      </select>
      <Input
        type="number"
        min="5"
        max="1440"
        step="5"
        value={form.duration}
        onChange={(event) => setForm({ ...form, duration: event.target.value })}
      />
    </div>
  );
}

function CalendarPreview({
  selectedDate,
  items,
}: {
  selectedDate: string;
  items: Array<
    CalendarPreviewItem & {
      startsAtDate: Date;
      endsAtDate: Date;
    }
  >;
}) {
  const date = new Date(`${selectedDate}T00:00:00`);

  return (
    <aside className="rounded-lg border bg-background">
      <div className="flex items-center justify-between border-b bg-muted/10 px-3 py-2.5">
        <div>
          <p className="text-sm font-semibold">
            {date.toLocaleDateString("nl-NL", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
          <p className="text-xs text-muted-foreground">Beschikbaarheid coach</p>
        </div>
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="max-h-[430px] overflow-y-auto">
        {Array.from({ length: 14 }, (_, index) => index + 7).map((hour) => {
          const hourItems = items.filter((item) => item.startsAtDate.getHours() === hour);
          return (
            <div key={hour} className="grid min-h-14 grid-cols-[48px_1fr] border-b">
              <div className="border-r px-2 py-2 text-xs text-muted-foreground">
                {String(hour).padStart(2, "0")}
              </div>
              <div className="space-y-1.5 p-1.5">
                {hourItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-sm border-l-4 px-2 py-1.5 text-xs",
                      item.type === "simply"
                        ? "border-[#12483b] bg-[#e7f1ed] text-[#123b32]"
                        : "border-slate-400 bg-slate-100 text-slate-900"
                    )}
                  >
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 opacity-80">
                      {formatTime(item.startsAtDate)} - {formatTime(item.endsAtDate)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function IconField({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-3 md:grid-cols-[36px_1fr]">
      <div className="hidden pt-2 text-muted-foreground md:block">{icon}</div>
      <div>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
