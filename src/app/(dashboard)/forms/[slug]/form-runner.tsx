"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

type Question = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  isRequired: boolean;
  placeholder: string | null;
  helperText: string | null;
  options: string[];
};

type FormRunnerProps = {
  form: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    introTitle: string | null;
    introDescription: string | null;
    submitButtonLabel: string | null;
    successTitle: string | null;
    successDescription: string | null;
    assignment: {
      id: string;
      title: string | null;
      isRequired: boolean;
      dueAt: string | null;
    };
    response: {
      id: string;
      status: string;
    } | null;
    isPreview?: boolean;
    questions: Question[];
  };
  initialAnswers: Record<string, unknown>;
};

export function FormRunner({ form, initialAnswers }: FormRunnerProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(form.response?.status === "SUBMITTED");

  const currentQuestion = form.questions[step];
  const progress = useMemo(
    () => Math.round(((step + 1) / Math.max(form.questions.length, 1)) * 100),
    [form.questions.length, step]
  );

  const updateAnswer = (questionId: string, value: unknown) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const validateCurrentStep = () => {
    if (!currentQuestion?.isRequired) return true;
    const value = answers[currentQuestion.id];
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined && String(value).trim() !== "";
  };

  const next = () => {
    if (!validateCurrentStep()) {
      toast({
        title: "Nog niet compleet",
        description: "Beantwoord eerst deze vraag voordat je verdergaat.",
        variant: "destructive",
      });
      return;
    }
    setStep((current) => Math.min(current + 1, form.questions.length - 1));
  };

  const submit = async () => {
    const requiredMissing = form.questions.some((question) => {
      if (!question.isRequired) return false;
      const value = answers[question.id];
      if (Array.isArray(value)) return value.length === 0;
      return value === null || value === undefined || String(value).trim() === "";
    });

    if (requiredMissing) {
      toast({
        title: "Vul eerst alle verplichte vragen in",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/forms/${form.slug}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submit: true,
          answers: form.questions.map((question) => ({
            questionId: question.id,
            value: answers[question.id] ?? "",
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Versturen mislukt");
      }
      setIsSubmitted(true);
      toast({
        title: "Formulier verzonden",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Versturen mislukt",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl app-panel p-10 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h1 className="mt-6 text-3xl font-semibold">{form.successTitle || "Bedankt"}</h1>
          <p className="mt-3 text-muted-foreground">
            {form.successDescription || "Je antwoorden zijn opgeslagen."}
          </p>
          <Button className="mt-8" asChild>
            <Link href="/forms">Terug naar formulieren</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/forms" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Terug naar formulieren
        </Link>

        <div className="rounded-[2.4rem] border border-stone-900 bg-stone-950 px-8 py-10 text-white shadow-[0_30px_90px_-55px_rgba(0,0,0,0.65)]">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Typeform-style intake</p>
          <h1 className="mt-5 font-display text-4xl tracking-tight">
            {form.introTitle || form.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/75">
            {form.introDescription || form.description || "Beantwoord de vragen hieronder stap voor stap."}
          </p>
          <div className="mt-8 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-3 text-sm text-white/65">
            Stap {step + 1} van {form.questions.length}
            {form.assignment.isRequired ? " · verplicht formulier" : ""}
            {form.assignment.dueAt
              ? ` · deadline ${new Date(form.assignment.dueAt).toLocaleDateString("nl-BE")}`
              : ""}
          </p>
        </div>

        {currentQuestion ? (
          <div className="app-panel p-8">
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Vraag {step + 1}</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight">{currentQuestion.title}</h2>
            {currentQuestion.description ? (
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                {currentQuestion.description}
              </p>
            ) : null}

            <div className="mt-8">{renderField(currentQuestion, answers[currentQuestion.id], updateAnswer)}</div>

            {currentQuestion.helperText ? (
              <p className="mt-3 text-sm text-muted-foreground">{currentQuestion.helperText}</p>
            ) : null}

            <div className="mt-10 flex flex-wrap gap-3">
              <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((current) => Math.max(current - 1, 0))}>
                Vorige
              </Button>
              {step < form.questions.length - 1 ? (
                <Button type="button" onClick={next}>
                  Volgende
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : form.isPreview ? (
                  <Button type="button" disabled>
                    Preview modus
                  </Button>
                ) : (
                  <Button type="button" onClick={() => void submit()} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {form.submitButtonLabel || "Versturen"}
                  </Button>
                )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function renderField(
  question: Question,
  value: unknown,
  updateAnswer: (questionId: string, value: unknown) => void
) {
  if (question.type === "LONG_TEXT") {
    return (
      <textarea
        className="min-h-[180px] w-full rounded-[1.5rem] border border-border bg-background px-5 py-4 text-lg"
        value={typeof value === "string" ? value : ""}
        placeholder={question.placeholder || ""}
        onChange={(event) => updateAnswer(question.id, event.target.value)}
      />
    );
  }

  if (question.type === "MULTIPLE_CHOICE" || question.type === "DROPDOWN") {
    return (
      <div className="space-y-3">
        {question.options.map((option) => (
          <label key={option} className="flex items-center gap-3 rounded-[1.25rem] border px-4 py-4 text-base">
            <input
              type="radio"
              checked={value === option}
              onChange={() => updateAnswer(question.id, option)}
            />
            {option}
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "CHECKBOXES") {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <div className="space-y-3">
        {question.options.map((option) => (
          <label key={option} className="flex items-center gap-3 rounded-[1.25rem] border px-4 py-4 text-base">
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={(event) =>
                updateAnswer(
                  question.id,
                  event.target.checked
                    ? [...selected, option]
                    : selected.filter((entry) => entry !== option)
                )
              }
            />
            {option}
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "YES_NO") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {["Ja", "Nee"].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => updateAnswer(question.id, option)}
            className={`rounded-[1.25rem] border px-5 py-5 text-left text-lg transition ${
              value === option ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    );
  }

  const inputType =
    question.type === "EMAIL"
      ? "email"
      : question.type === "PHONE"
        ? "tel"
        : question.type === "NUMBER"
          ? "number"
          : question.type === "DATE"
            ? "date"
            : "text";

  return (
    <input
      type={inputType}
      className="h-16 w-full rounded-[1.5rem] border border-border bg-background px-5 text-lg"
      value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
      placeholder={question.placeholder || ""}
      onChange={(event) => updateAnswer(question.id, event.target.value)}
    />
  );
}
