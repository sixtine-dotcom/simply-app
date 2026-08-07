"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormQuestionType, FormStatus, Role } from "@prisma/client";
import {
  AlignLeft,
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  CopyPlus,
  Download,
  Eye,
  GripVertical,
  Hash,
  ImageIcon,
  List,
  Loader2,
  Mail,
  Phone,
  Plus,
  Save,
  Text,
  ToggleLeft,
  Trash2,
  Upload,
  User,
  Video,
  X,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { FORM_QUESTION_TYPE_OPTIONS, slugifyFormValue } from "@/lib/forms";

type BuilderData = {
  form: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    status: FormStatus;
    introTitle: string | null;
    introDescription: string | null;
    submitButtonLabel: string | null;
    successTitle: string | null;
    successDescription: string | null;
    isOnboardingForm: boolean;
    questions: Array<{
      id: string;
      title: string;
      description: string | null;
      type: FormQuestionType;
      position: number;
      isRequired: boolean;
      placeholder: string | null;
      helperText: string | null;
      options: string[];
    }>;
    assignments: Array<{
      id: string;
      audienceType: "ROLE" | "COURSE" | "SPACE" | "USER";
      audienceRole: Role | null;
      courseId: string | null;
      spaceId: string | null;
      userId: string | null;
      title: string | null;
      isRequired: boolean;
      blocksCourseAccess: boolean;
      startsAt: string | Date | null;
      dueAt: string | Date | null;
      isActive: boolean;
    }>;
    responses: Array<{
      id: string;
      status: string;
      updatedAt: string | Date;
      submittedAt: string | Date | null;
      assignment: {
        id: string;
        title: string | null;
        audienceType: string;
        isRequired: boolean;
        dueAt: string | Date | null;
      } | null;
      user: {
        firstName: string;
        lastName: string;
        email: string;
      };
      answerPreview: Array<{
        questionTitle: string;
        value: string;
      }>;
    }>;
    responseStats: {
      totalResponses: number;
      totalAssignments: number;
      submittedResponses: number;
    };
  };
  audiences: {
    roles: Role[];
    courses: Array<{ id: string; title: string; slug: string }>;
    spaces: Array<{ id: string; name: string; slug: string; isActive: boolean }>;
    users: Array<{ id: string; firstName: string; lastName: string; email: string; role: string }>;
  };
};

const DEFAULT_QUESTION = {
  title: "Nieuwe vraag",
  description: "",
  type: "SHORT_TEXT" as FormQuestionType,
  isRequired: false,
  placeholder: "",
  helperText: "",
  options: [],
};

export function FormBuilder({
  initialData,
  embedded = false,
}: {
  initialData: BuilderData;
  embedded?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: initialData.form.title,
    slug: initialData.form.slug,
    description: initialData.form.description || "",
    status: initialData.form.status,
    introTitle: initialData.form.introTitle || initialData.form.title,
    introDescription: initialData.form.introDescription || "",
    submitButtonLabel: initialData.form.submitButtonLabel || "Versturen",
    successTitle: initialData.form.successTitle || "Bedankt",
    successDescription: initialData.form.successDescription || "",
    isOnboardingForm: initialData.form.isOnboardingForm,
  });
  const [questions, setQuestions] = useState(
    initialData.form.questions.map((question) => ({
      ...question,
      description: question.description || "",
      placeholder: question.placeholder || "",
      helperText: question.helperText || "",
      options: question.options.length > 0 ? question.options : [""],
    }))
  );
  const [assignments, setAssignments] = useState(
    initialData.form.assignments.map((assignment) => ({
      ...assignment,
      title: assignment.title || "",
      startsAt: assignment.startsAt ? toDateTimeInputValue(assignment.startsAt) : "",
      dueAt: assignment.dueAt ? toDateTimeInputValue(assignment.dueAt) : "",
    }))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const completionRate =
    initialData.form.responseStats.totalAssignments > 0
      ? Math.round(
          (initialData.form.responseStats.submittedResponses /
            initialData.form.responseStats.totalAssignments) *
            100
        )
      : 0;

  const addQuestion = (type: FormQuestionType = "SHORT_TEXT") => {
    const defaultOptions =
      ["MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN"].includes(type) ? [""] :
      type === "CONTACT_INFO" ? ["firstName", "lastName", "email"] :
      type === "FILE_UPLOAD" ? ["image", "video"] :
      [];
    setQuestions((current) => [
      ...current,
      {
        id: `new-${Date.now()}`,
        position: current.length,
        ...DEFAULT_QUESTION,
        type,
        options: defaultOptions,
      },
    ]);
    setShowTypePicker(false);
  };

  const duplicateQuestion = (index: number) => {
    setQuestions((current) => {
      const target = current[index];
      return [
        ...current.slice(0, index + 1),
        {
          ...target,
          id: `new-${Date.now()}`,
          title: `${target.title} kopie`,
        },
        ...current.slice(index + 1),
      ].map((question, position) => ({ ...question, position }));
    });
  };

  const updateQuestion = (index: number, patch: Partial<(typeof questions)[number]>) => {
    setQuestions((current) =>
      current.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...patch } : question
      )
    );
  };

  const moveQuestionUp = (index: number) => {
    if (index === 0) return;
    setQuestions((current) => {
      const next = [...current];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((question, position) => ({ ...question, position }));
    });
  };

  const removeQuestion = (index: number) => {
    setQuestions((current) =>
      current.filter((_, questionIndex) => questionIndex !== index).map((question, position) => ({
        ...question,
        position,
      }))
    );
  };

  const addAssignment = () => {
    setAssignments((current) => [
      ...current,
      {
        id: `new-${Date.now()}`,
        audienceType: "ROLE" as const,
        audienceRole: "CLIENT" as Role,
        courseId: null,
        spaceId: null,
        userId: null,
        title: "",
        isRequired: true,
        blocksCourseAccess: false,
        startsAt: "",
        dueAt: "",
        isActive: true,
      },
    ]);
  };

  const updateAssignment = (index: number, patch: Partial<(typeof assignments)[number]>) => {
    setAssignments((current) =>
      current.map((assignment, assignmentIndex) =>
        assignmentIndex === index ? { ...assignment, ...patch } : assignment
      )
    );
  };

  const save = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/forms/${initialData.form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          slug: slugifyFormValue(form.slug),
          questions: questions.map((question, index) => ({
            id: question.id.startsWith("new-") ? undefined : question.id,
            title: question.title,
            description: question.description || null,
            type: question.type,
            position: index,
            isRequired: question.isRequired,
            placeholder: question.placeholder || null,
            helperText: question.helperText || null,
            options: question.options.filter(Boolean),
          })),
          assignments: assignments.map((assignment) => ({
            id: assignment.id.startsWith("new-") ? undefined : assignment.id,
            audienceType: assignment.audienceType,
            audienceRole: assignment.audienceType === "ROLE" ? assignment.audienceRole : null,
            courseId: assignment.audienceType === "COURSE" ? assignment.courseId : null,
            spaceId: assignment.audienceType === "SPACE" ? assignment.spaceId : null,
            userId: assignment.audienceType === "USER" ? assignment.userId : null,
            title: assignment.title || null,
            isRequired: assignment.isRequired,
            blocksCourseAccess: assignment.blocksCourseAccess,
            startsAt: assignment.startsAt || null,
            dueAt: assignment.dueAt || null,
            isActive: assignment.isActive,
          })),
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Opslaan mislukt");
      }

      toast({
        title: "Opgeslagen",
        description: "Formulier en toewijzingen zijn bijgewerkt.",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Opslaan mislukt",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    const confirmed = window.confirm("Wil je dit formulier verwijderen?");
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/forms/${initialData.form.id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Verwijderen mislukt");
      }
      router.push("/admin/forms");
      router.refresh();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Verwijderen mislukt",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={embedded ? "" : "min-h-screen bg-[linear-gradient(180deg,#faf7f2_0%,#ffffff_100%)] p-6 md:p-8 lg:p-12"}>
      {showTypePicker && (
        <QuestionTypePicker
          onSelect={addQuestion}
          onClose={() => setShowTypePicker(false)}
        />
      )}
      <div className={embedded ? "space-y-4 [&_input]:h-9 [&_select]:h-9" : "mx-auto max-w-7xl space-y-4 [&_input]:h-9 [&_select]:h-9"}>
        {embedded ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/90 p-3.5">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Builder status</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Werk vragen, assignments en submitflow hier uit binnen dezelfde form workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" asChild>
                <Link href={`/forms/${form.slug}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Link>
              </Button>
              <Button onClick={() => void save()} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Opslaan
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <Link
                href="/admin/forms"
                className="inline-flex items-center text-sm text-muted-foreground transition hover:text-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Terug naar formulieren
              </Link>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight">{form.title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Bouw je formulier stap voor stap, wijs het toe per doelgroep en preview de member-flow rechts.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" asChild>
                <Link href={`/forms/${form.slug}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <a href={`/api/admin/forms/${initialData.form.id}/responses?format=csv`}>
                  <Download className="mr-2 h-4 w-4" />
                  Exporteer CSV
                </a>
              </Button>
              <Button onClick={() => void save()} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Opslaan
              </Button>
              <Button variant="outline" onClick={() => void remove()} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Verwijderen
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base">Formulierinstellingen</CardTitle>
                <CardDescription>De basisinformatie en submit-flow van je formulier.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 p-4 pt-2 md:grid-cols-2">
                <Field label="Titel">
                  <Input
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        title: event.target.value,
                        slug:
                          !current.slug || current.slug === slugifyFormValue(current.title)
                            ? slugifyFormValue(event.target.value)
                            : current.slug,
                      }))
                    }
                  />
                </Field>
                <Field label="Slug">
                  <Input
                    value={form.slug}
                    onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                  />
                </Field>
                <Field label="Status">
                  <select
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, status: event.target.value as FormStatus }))
                    }
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </Field>
                <Field label="Submit knop">
                  <Input
                    value={form.submitButtonLabel}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, submitButtonLabel: event.target.value }))
                    }
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Beschrijving">
                    <textarea
                      className="min-h-[84px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, description: event.target.value }))
                      }
                    />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label="Intro titel">
                    <Input
                      value={form.introTitle}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, introTitle: event.target.value }))
                      }
                    />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label="Intro tekst">
                    <textarea
                      className="min-h-[84px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={form.introDescription}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, introDescription: event.target.value }))
                      }
                    />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-start justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                    <div>
                      <p className="font-medium text-foreground">Gebruik als onboardingformulier</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Markeer dit formulier als intake/onboardingflow voor nieuwe leden.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={form.isOnboardingForm}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, isOnboardingForm: event.target.checked }))
                      }
                    />
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                <div>
                  <CardTitle className="text-base">Vragen</CardTitle>
                  <CardDescription>Bouw de flow zoals in een Typeform-builder.</CardDescription>
                </div>
                <Button type="button" onClick={() => setShowTypePicker(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Vraag toevoegen
                </Button>
              </CardHeader>
              <CardContent className="space-y-2.5 p-4 pt-2">
                {questions.map((question, index) => (
                  <Card key={question.id} className="rounded-lg border-border/70 shadow-none">
                    <CardContent className="space-y-3 p-3.5">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Vraag {index + 1}</p>
                            <p className="text-sm text-foreground">{question.title}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="icon" onClick={() => moveQuestionUp(index)}>
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="outline" size="icon" onClick={() => duplicateQuestion(index)}>
                            <CopyPlus className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="outline" size="icon" onClick={() => removeQuestion(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <Field label="Vraagtitel">
                        <Input
                          value={question.title}
                          onChange={(event) => updateQuestion(index, { title: event.target.value })}
                        />
                      </Field>
                      <Field label="Type">
                        <select
                          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                          value={question.type}
                          onChange={(event) =>
                            updateQuestion(index, {
                              type: event.target.value as FormQuestionType,
                              options:
                                event.target.value === "MULTIPLE_CHOICE" ||
                                event.target.value === "CHECKBOXES" ||
                                event.target.value === "DROPDOWN"
                                  ? question.options.length > 0
                                    ? question.options
                                    : [""]
                                  : event.target.value === "CONTACT_INFO"
                                  ? ["firstName", "lastName", "email"]
                                  : event.target.value === "FILE_UPLOAD"
                                  ? ["image", "video"]
                                  : [],
                            })
                          }
                        >
                          {FORM_QUESTION_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      {question.type !== "CONTACT_INFO" && question.type !== "FILE_UPLOAD" && (
                        <Field label="Beschrijving">
                          <textarea
                            className="min-h-[72px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                            value={question.description}
                            onChange={(event) =>
                              updateQuestion(index, { description: event.target.value })
                            }
                          />
                        </Field>
                      )}

                      {(question.type === "SHORT_TEXT" || question.type === "LONG_TEXT") && (
                        <div className="grid gap-4 md:grid-cols-2">
                          <Field label="Placeholder">
                            <Input
                              value={question.placeholder}
                              onChange={(event) =>
                                updateQuestion(index, { placeholder: event.target.value })
                              }
                            />
                          </Field>
                          <Field label="Max. karakters (leeg = geen limiet)">
                            <Input
                              type="number"
                              min={1}
                              placeholder="bv. 280"
                              value={question.options[0] ?? ""}
                              onChange={(event) =>
                                updateQuestion(index, {
                                  options: event.target.value ? [event.target.value] : [],
                                })
                              }
                            />
                          </Field>
                        </div>
                      )}

                      {question.type !== "SHORT_TEXT" &&
                        question.type !== "LONG_TEXT" &&
                        question.type !== "CONTACT_INFO" &&
                        question.type !== "FILE_UPLOAD" &&
                        question.type !== "MULTIPLE_CHOICE" &&
                        question.type !== "CHECKBOXES" &&
                        question.type !== "DROPDOWN" && (
                          <Field label="Helpertekst">
                            <Input
                              value={question.helperText}
                              onChange={(event) =>
                                updateQuestion(index, { helperText: event.target.value })
                              }
                            />
                          </Field>
                        )}

                      <label className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={question.isRequired}
                          onChange={(event) =>
                            updateQuestion(index, { isRequired: event.target.checked })
                          }
                        />
                        Verplicht beantwoorden
                      </label>

                      {(question.type === "MULTIPLE_CHOICE" ||
                        question.type === "CHECKBOXES" ||
                        question.type === "DROPDOWN") && (
                        <div className="space-y-2">
                          <Label>Opties</Label>
                          {question.options.map((option, optionIndex) => (
                            <div key={`${question.id}-${optionIndex}`} className="flex gap-2">
                              <Input
                                value={option}
                                onChange={(event) =>
                                  updateQuestion(index, {
                                    options: question.options.map((entry, idx) =>
                                      idx === optionIndex ? event.target.value : entry
                                    ),
                                  })
                                }
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                  updateQuestion(index, {
                                    options: question.options.filter((_, idx) => idx !== optionIndex),
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              updateQuestion(index, {
                                options: [...question.options, ""],
                              })
                            }
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Optie toevoegen
                          </Button>
                        </div>
                      )}

                      {question.type === "CONTACT_INFO" && (
                        <ContactInfoFieldSelector
                          selected={question.options}
                          onChange={(fields) => updateQuestion(index, { options: fields })}
                        />
                      )}

                      {question.type === "FILE_UPLOAD" && (
                        <FileUploadTypeSelector
                          selected={question.options}
                          onChange={(types) => updateQuestion(index, { options: types })}
                        />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Toewijzingen</CardTitle>
                  <CardDescription>
                    Bepaal wie dit formulier ziet, wanneer het live gaat en of het verplicht is.
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" onClick={addAssignment}>
                  <Plus className="mr-2 h-4 w-4" />
                  Toewijzing toevoegen
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {assignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nog geen toewijzingen. Zonder doelgroep zien leden dit formulier niet.
                  </p>
                ) : (
                  assignments.map((assignment, index) => (
                    <Card key={assignment.id}>
                      <CardContent className="space-y-4 p-5">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Toewijzing {index + 1}</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              setAssignments((current) =>
                                current.filter((_, itemIndex) => itemIndex !== index)
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <Field label="Doelgroep">
                            <select
                              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                              value={assignment.audienceType}
                              onChange={(event) =>
                                updateAssignment(index, {
                                  audienceType: event.target.value as (typeof assignment)["audienceType"],
                                  audienceRole: event.target.value === "ROLE" ? "CLIENT" : null,
                                  courseId: null,
                                  spaceId: null,
                                  userId: null,
                                })
                              }
                            >
                              <option value="ROLE">Rol</option>
                              <option value="COURSE">Cursusdeelnemers</option>
                              <option value="SPACE">Community groep</option>
                              <option value="USER">Specifiek lid</option>
                            </select>
                          </Field>
                          <Field label="Label">
                            <Input
                              value={assignment.title}
                              onChange={(event) =>
                                updateAssignment(index, { title: event.target.value })
                              }
                              placeholder="Bijv. Week 1 intake"
                            />
                          </Field>
                        </div>

                        {assignment.audienceType === "ROLE" ? (
                          <Field label="Rol">
                            <select
                              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                              value={assignment.audienceRole || "CLIENT"}
                              onChange={(event) =>
                                updateAssignment(index, { audienceRole: event.target.value as Role })
                              }
                            >
                              {initialData.audiences.roles.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                          </Field>
                        ) : null}

                        {assignment.audienceType === "COURSE" ? (
                          <Field label="Cursus">
                            <select
                              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                              value={assignment.courseId || ""}
                              onChange={(event) =>
                                updateAssignment(index, { courseId: event.target.value || null })
                              }
                            >
                              <option value="">Selecteer cursus</option>
                              {initialData.audiences.courses.map((course) => (
                                <option key={course.id} value={course.id}>
                                  {course.title}
                                </option>
                              ))}
                            </select>
                          </Field>
                        ) : null}

                        {assignment.audienceType === "SPACE" ? (
                          <Field label="Community groep">
                            <select
                              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                              value={assignment.spaceId || ""}
                              onChange={(event) =>
                                updateAssignment(index, { spaceId: event.target.value || null })
                              }
                            >
                              <option value="">Selecteer community</option>
                              {initialData.audiences.spaces.map((space) => (
                                <option key={space.id} value={space.id}>
                                  {space.name}
                                  {space.isActive ? "" : " (non-actief)"}
                                </option>
                              ))}
                            </select>
                          </Field>
                        ) : null}

                        {assignment.audienceType === "USER" ? (
                          <Field label="Specifiek lid">
                            <select
                              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                              value={assignment.userId || ""}
                              onChange={(event) =>
                                updateAssignment(index, { userId: event.target.value || null })
                              }
                            >
                              <option value="">Selecteer lid</option>
                              {initialData.audiences.users.map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.firstName} {user.lastName} · {user.email}
                                </option>
                              ))}
                            </select>
                          </Field>
                        ) : null}

                        <div className="grid gap-4 md:grid-cols-2">
                          <Field label="Start op">
                            <Input
                              type="datetime-local"
                              value={assignment.startsAt}
                              onChange={(event) =>
                                updateAssignment(index, { startsAt: event.target.value })
                              }
                            />
                          </Field>
                          <Field label="Verplicht vóór">
                            <Input
                              type="datetime-local"
                              value={assignment.dueAt}
                              onChange={(event) =>
                                updateAssignment(index, { dueAt: event.target.value })
                              }
                            />
                          </Field>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="flex items-center gap-3 rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={assignment.isRequired}
                              onChange={(event) =>
                                updateAssignment(index, { isRequired: event.target.checked })
                              }
                            />
                            Verplicht invullen
                          </label>
                          <label className="flex items-center gap-3 rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={assignment.isActive}
                              onChange={(event) =>
                                updateAssignment(index, { isActive: event.target.checked })
                              }
                            />
                            Toewijzing actief
                          </label>
                        </div>
                        {assignment.audienceType === "COURSE" && assignment.isRequired ? (
                          <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
                            <input
                              type="checkbox"
                              className="mt-0.5 h-4 w-4"
                              checked={assignment.blocksCourseAccess}
                              onChange={(event) =>
                                updateAssignment(index, { blocksCourseAccess: event.target.checked })
                              }
                            />
                            <span>
                              <strong className="block">Blokkeer cursus tot dit formulier is ingediend</strong>
                              De klant ziet de opdracht meteen, maar lessen en gekoppelde community blijven vergrendeld.
                            </span>
                          </label>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Response-overzicht</CardTitle>
                <CardDescription>Volg completion en exporteer antwoorden voor analyse.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <ResponseStatCard
                  label="Toewijzingen"
                  value={String(initialData.form.responseStats.totalAssignments)}
                />
                <ResponseStatCard
                  label="Responses"
                  value={String(initialData.form.responseStats.totalResponses)}
                />
                <ResponseStatCard label="Completion" value={`${completionRate}%`} />
              </CardContent>
            </Card>

            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>Zo voelt de invulflow voor een lid aan.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-[2rem] border bg-stone-950 px-5 py-6 text-white">
                  <p className="text-xs uppercase tracking-[0.28em] text-white/60">Typeform-style flow</p>
                  <h2 className="mt-3 text-2xl font-semibold">{form.introTitle || form.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-white/70">
                    {form.introDescription || "Beschrijf hier wat iemand gaat invullen en waarom het belangrijk is."}
                  </p>
                </div>

                {questions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Voeg eerst vragen toe.</p>
                ) : (
                  questions.slice(0, 3).map((question, index) => (
                    <div key={question.id} className="rounded-[1.5rem] border bg-white p-5 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                        Stap {index + 1}
                      </p>
                      <p className="mt-3 text-xl font-semibold">{question.title}</p>
                      {question.description ? (
                        <p className="mt-2 text-sm text-muted-foreground">{question.description}</p>
                      ) : null}
                      <div className="mt-4 rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                        {renderPreviewLabel(question)}
                      </div>
                    </div>
                  ))
                )}

                <div className="rounded-[1.5rem] border bg-muted/20 p-5 text-sm">
                  <p className="font-medium text-foreground">Toewijzingen</p>
                  <p className="mt-2 text-muted-foreground">
                    {assignments.length === 0
                      ? "Nog geen doelgroep geselecteerd."
                      : `${assignments.length} actieve doelgroep(en) ingesteld.`}
                  </p>
                </div>

                {initialData.form.responses.length > 0 ? (
                  <div className="rounded-[1.5rem] border bg-muted/20 p-5">
                    <p className="font-medium text-foreground">Recente antwoorden</p>
                    <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                      {initialData.form.responses.slice(0, 4).map((response) => (
                        <div key={response.id} className="rounded-2xl bg-white/80 p-3">
                          <p className="font-medium text-foreground">
                            {response.user.firstName} {response.user.lastName}
                          </p>
                          <p className="text-xs">{response.user.email}</p>
                          <p className="mt-1 text-xs">
                            {response.assignment?.title || response.assignment?.audienceType || "Vrije response"}
                            {response.assignment?.isRequired ? " · verplicht" : ""}
                          </p>
                          {response.answerPreview.length > 0 ? (
                            <div className="mt-2 space-y-1.5">
                              {response.answerPreview.map((answer) => (
                                <div key={`${response.id}-${answer.questionTitle}`}>
                                  <p className="text-[11px] font-medium text-foreground">{answer.questionTitle}</p>
                                  <p className="text-xs">{answer.value || "Geen antwoord"}</p>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ResponseStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-muted/20 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function renderPreviewLabel(question: {
  type: FormQuestionType;
  options: string[];
  placeholder: string;
}) {
  if (question.type === "MULTIPLE_CHOICE" || question.type === "DROPDOWN") {
    return question.options.filter(Boolean).join(" · ") || "Keuze-opties";
  }

  if (question.type === "CHECKBOXES") {
    return question.options.filter(Boolean).join(" · ") || "Checkbox-opties";
  }

  if (question.type === "YES_NO") {
    return "Ja / Nee";
  }

  if (question.type === "CONTACT_INFO") {
    const labels: Record<string, string> = {
      firstName: "Voornaam", lastName: "Achternaam", email: "E-mail",
      phone: "Telefoon", company: "Bedrijf",
    };
    return question.options.length > 0
      ? question.options.map((f) => labels[f] || f).join(" · ")
      : "Contactvelden";
  }

  if (question.type === "FILE_UPLOAD") {
    const labels: Record<string, string> = { image: "Afbeelding", video: "Video" };
    return question.options.length > 0
      ? question.options.map((t) => labels[t] || t).join(" of ")
      : "Bestand uploaden";
  }

  return question.placeholder || "Antwoordveld";
}

function toDateTimeInputValue(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

const QUESTION_TYPE_CATEGORIES = [
  {
    label: "Contact",
    types: [
      { value: "EMAIL" as FormQuestionType, label: "E-mail", icon: Mail, description: "Vraag om een e-mailadres" },
      { value: "PHONE" as FormQuestionType, label: "Telefoon", icon: Phone, description: "Vraag om een telefoonnummer" },
    ],
  },
  {
    label: "Tekst",
    types: [
      { value: "SHORT_TEXT" as FormQuestionType, label: "Korte tekst", icon: Text, description: "Één regel vrije invoer" },
      { value: "LONG_TEXT" as FormQuestionType, label: "Lange tekst", icon: AlignLeft, description: "Meerdere regels vrije tekst" },
    ],
  },
  {
    label: "Keuze",
    types: [
      { value: "MULTIPLE_CHOICE" as FormQuestionType, label: "Meerkeuze", icon: List, description: "Kies één of meer opties" },
      { value: "CHECKBOXES" as FormQuestionType, label: "Checkboxen", icon: CheckSquare, description: "Meerdere selecteerbare vakjes" },
      { value: "DROPDOWN" as FormQuestionType, label: "Dropdown", icon: ChevronDown, description: "Keuze uit een uitklapmenu" },
      { value: "YES_NO" as FormQuestionType, label: "Ja / Nee", icon: ToggleLeft, description: "Eenvoudige ja/nee keuze" },
    ],
  },
  {
    label: "Overig",
    types: [
      { value: "NUMBER" as FormQuestionType, label: "Nummer", icon: Hash, description: "Numerieke invoer" },
      { value: "DATE" as FormQuestionType, label: "Datum", icon: CalendarDays, description: "Kies een datum" },
    ],
  },
  {
    label: "Speciaal",
    types: [
      { value: "CONTACT_INFO" as FormQuestionType, label: "Contactgegevens", icon: User, description: "Voornaam, achternaam, e-mail, etc." },
      { value: "FILE_UPLOAD" as FormQuestionType, label: "Bestand uploaden", icon: Upload, description: "Klant uploadt afbeelding of video" },
    ],
  },
];

function ContactInfoFieldSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (fields: string[]) => void;
}) {
  const fields = [
    { value: "firstName", label: "Voornaam" },
    { value: "lastName", label: "Achternaam" },
    { value: "email", label: "E-mailadres" },
    { value: "phone", label: "Telefoonnummer" },
    { value: "company", label: "Bedrijfsnaam" },
  ];

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Contactvelden</Label>
      <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-2">
        {fields.map((field) => (
          <label key={field.value} className="flex items-center gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={selected.includes(field.value)}
              onChange={() => toggle(field.value)}
            />
            {field.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function FileUploadTypeSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (types: string[]) => void;
}) {
  const types = [
    { value: "image", label: "Afbeelding", icon: ImageIcon },
    { value: "video", label: "Video", icon: Video },
  ];

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Toegestane bestandstypen</Label>
      <div className="flex gap-3">
        {types.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => toggle(value)}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-all ${
              selected.includes(value)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-muted/20 text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function QuestionTypePicker({
  onSelect,
  onClose,
}: {
  onSelect: (type: FormQuestionType) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl rounded-[2rem] border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg tracking-wide">Vraagtype kiezen</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          <div className="space-y-6">
            {QUESTION_TYPE_CATEGORIES.map((category) => (
              <div key={category.label}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {category.label}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {category.types.map(({ value, label, icon: Icon, description }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => onSelect(value)}
                      className="group flex flex-col items-start gap-2 rounded-2xl border border-border bg-muted/30 p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background shadow-sm group-hover:bg-primary/10 transition-colors">
                        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-tight">{label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground leading-tight">{description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
