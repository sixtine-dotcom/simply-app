"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { getContactInfoFields, getContactFieldError, getQuestionAnswerError, hasFormAnswer as hasAnswer } from "@/lib/form-fields";

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
  userFirstName?: string;
};

type Phase = "welcome" | "question" | "success";

const AUTO_ADVANCE_DELAY_MS = 320;
const CHOICE_TYPES = new Set(["MULTIPLE_CHOICE", "DROPDOWN", "YES_NO"]);

function splitParagraphs(text: string | null | undefined) {
  if (!text?.trim()) return [];
  return text
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isQuestionAnswered(question: Question, value: unknown) {
  return !getQuestionAnswerError(question, value);
}

export function FormRunner({ form, initialAnswers, userFirstName }: FormRunnerProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [phase, setPhase] = useState<Phase>(
    form.response?.status === "SUBMITTED" ? "success" : "welcome"
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const currentQuestion = form.questions[questionIndex];
  const totalQuestions = form.questions.length;
  const hasStarted = Object.keys(initialAnswers).some((key) => hasAnswer(initialAnswers[key]));
  const introParagraphs = splitParagraphs(form.introDescription || form.description);
  const successParagraphs = splitParagraphs(form.successDescription);

  const progress = useMemo(() => {
    if (phase === "welcome") return 0;
    if (phase === "success") return 100;
    if (!totalQuestions) return 100;
    return Math.round(((questionIndex + 1) / totalQuestions) * 100);
  }, [phase, questionIndex, totalQuestions]);

  const updateAnswer = useCallback((questionId: string, value: unknown) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
    setShowValidation(false);
  }, []);

  const validateCurrentStep = useCallback(() => {
    if (phase !== "question" || !currentQuestion) return true;
    return isQuestionAnswered(currentQuestion, answers[currentQuestion.id]);
  }, [answers, currentQuestion, phase]);

  const goToQuestion = useCallback(
    (nextIndex: number) => {
      if (isAnimating) return;
      setIsAnimating(true);
      window.setTimeout(() => {
        setQuestionIndex(nextIndex);
        setShowValidation(false);
        setIsAnimating(false);
      }, 180);
    },
    [isAnimating]
  );

  const submitForm = useCallback(async (answersOverride?: Record<string, unknown>) => {
    if (form.isPreview) return;

    const payload = answersOverride ?? answers;
    const requiredMissing = form.questions.some((question) => {
      return !isQuestionAnswered(question, payload[question.id]);
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
            value: payload[question.id] ?? "",
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Versturen mislukt");
      }
      setPhase("success");
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Versturen mislukt",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, form.isPreview, form.questions, form.slug, toast]);

  const goNext = useCallback(() => {
    if (phase === "welcome") {
      if (!totalQuestions) {
        setPhase("success");
        return;
      }
      setPhase("question");
      return;
    }

    if (!validateCurrentStep()) {
      setShowValidation(true);
      toast({
        title: "Nog even invullen",
        description: "Beantwoord deze vraag om verder te gaan.",
        variant: "destructive",
      });
      return;
    }

    if (questionIndex < totalQuestions - 1) {
      goToQuestion(questionIndex + 1);
      return;
    }

    void submitForm();
  }, [goToQuestion, phase, questionIndex, submitForm, toast, totalQuestions, validateCurrentStep]);

  const goBack = useCallback(() => {
    if (phase === "question" && questionIndex === 0) {
      setPhase("welcome");
      return;
    }
    if (phase === "question" && questionIndex > 0) {
      goToQuestion(questionIndex - 1);
    }
  }, [goToQuestion, phase, questionIndex]);

  const selectChoice = useCallback(
    (question: Question, value: unknown) => {
      const nextAnswers = { ...answers, [question.id]: value };
      updateAnswer(question.id, value);
      if (CHOICE_TYPES.has(question.type) && question.type !== "CHECKBOXES") {
        window.setTimeout(() => {
          if (questionIndex < totalQuestions - 1) {
            goToQuestion(questionIndex + 1);
          } else if (!form.isPreview) {
            void submitForm(nextAnswers);
          }
        }, AUTO_ADVANCE_DELAY_MS);
      }
    },
    [answers, form.isPreview, goToQuestion, questionIndex, submitForm, totalQuestions, updateAnswer]
  );

  useEffect(() => {
    if (phase !== "question") return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 220);
    return () => window.clearTimeout(timer);
  }, [phase, questionIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      const target = event.target as HTMLElement | null;
      if (target?.hasAttribute("data-contact-field")) {
        const fields = Array.from(target.closest("[data-contact-info]")?.querySelectorAll<HTMLInputElement>("input[data-contact-field]") || []);
        const nextField = fields[fields.indexOf(target as HTMLInputElement) + 1];
        if (nextField) {
          event.preventDefault();
          nextField.focus();
          return;
        }
      }
      const isTextarea = target?.tagName === "TEXTAREA";
      if (isTextarea && event.shiftKey) return;
      if (target?.tagName === "BUTTON") return;

      event.preventDefault();
      goNext();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext]);

  const primaryActionLabel =
    phase === "welcome"
      ? hasStarted
        ? "Ga verder"
        : "Start"
      : questionIndex < totalQuestions - 1
        ? "OK"
        : form.isPreview
          ? "Preview"
          : form.submitButtonLabel || "Versturen";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#f3f3f1] text-[#191919] md:left-72 md:z-40">
      <div className="border-b border-black/[0.06] bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link
            href="/forms"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#666] transition hover:bg-black/[0.04] hover:text-[#173622]"
            aria-label="Terug naar formulieren"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.08]">
              <div
                className="h-full rounded-full bg-[#173622] transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          {phase === "question" && totalQuestions > 0 ? (
            <span className="shrink-0 text-[11px] font-medium tabular-nums text-[#888]">
              {questionIndex + 1}/{totalQuestions}
            </span>
          ) : (
            <span className="shrink-0 text-[11px] font-medium text-[#888]">{form.title}</span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div
            key={`${phase}-${questionIndex}`}
            className={cn(
              "w-full max-w-[680px]",
              isAnimating ? "opacity-0" : "form-step-enter"
            )}
          >
            {phase === "welcome" ? (
              <WelcomeScreen
                title={form.introTitle || form.title}
                paragraphs={introParagraphs.length ? introParagraphs : ["Beantwoord een paar korte vragen. Het duurt maar een minuutje."]}
                isRequired={form.assignment.isRequired}
                dueAt={form.assignment.dueAt}
                questionCount={totalQuestions}
              />
            ) : null}

            {phase === "question" && currentQuestion ? (
              <QuestionScreen
                question={currentQuestion}
                index={questionIndex}
                value={answers[currentQuestion.id]}
                userFirstName={userFirstName}
                showValidation={showValidation}
                inputRef={inputRef}
                onChange={(value) => updateAnswer(currentQuestion.id, value)}
                onSelectChoice={(value) => selectChoice(currentQuestion, value)}
              />
            ) : null}

            {phase === "success" ? (
              <SuccessScreen
                title={form.successTitle || "Bedankt!"}
                paragraphs={
                  successParagraphs.length
                    ? successParagraphs
                    : ["Je antwoorden zijn veilig opgeslagen.", "We nemen het van hier verder."]
                }
                userFirstName={userFirstName}
              />
            ) : null}
          </div>
        </div>
      </div>

      {phase !== "success" ? (
        <div className="border-t border-black/[0.06] bg-white/90 px-5 py-4 backdrop-blur-md sm:px-8">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <button
              type="button"
              onClick={goBack}
              disabled={phase === "welcome"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 text-[#666] transition hover:border-[#173622]/30 hover:text-[#173622] disabled:invisible"
              aria-label="Vorige stap"
            >
              <ArrowUp className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => void goNext()}
                disabled={isSubmitting || (phase === "question" && form.isPreview && questionIndex === totalQuestions - 1)}
                className="inline-flex h-12 min-w-[132px] items-center justify-center gap-2 rounded-full bg-[#173622] px-7 text-sm font-semibold text-white shadow-[0_10px_30px_-16px_rgba(23,54,34,0.85)] transition hover:bg-[#21492e] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {primaryActionLabel}
                {!isSubmitting ? <Check className="h-4 w-4" /> : null}
              </button>
              <span className="text-[10px] text-[#999]">
                druk op <kbd className="rounded border border-black/10 bg-white px-1.5 py-0.5 font-sans">Enter ↵</kbd>
              </span>
            </div>

            <div className="h-11 w-11" aria-hidden="true" />
          </div>
        </div>
      ) : (
        <div className="border-t border-black/[0.06] bg-white/90 px-5 py-5 backdrop-blur-md sm:px-8">
          <div className="mx-auto flex max-w-3xl justify-center">
            <Link
              href="/forms"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-[#173622] px-7 text-sm font-semibold text-white transition hover:bg-[#21492e]"
            >
              Terug naar formulieren
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function WelcomeScreen({
  title,
  paragraphs,
  isRequired,
  dueAt,
  questionCount,
}: {
  title: string;
  paragraphs: string[];
  isRequired: boolean;
  dueAt: string | null;
  questionCount: number;
}) {
  return (
    <div className="text-center">
      <div className="relative mx-auto h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-[0_20px_50px_-30px_rgba(17,28,20,0.55)] sm:h-32 sm:w-32">
        <Image
          src="/simply-dashboard-plant.jpg"
          alt=""
          fill
          className="object-cover"
          sizes="128px"
          priority
        />
      </div>
      <h1 className="mt-8 text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-[#191919]">
        {title}
      </h1>
      <div className="mx-auto mt-6 max-w-xl space-y-4 text-base leading-7 text-[#5f5f5f] sm:text-lg sm:leading-8">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#8a8a8a]">
        {questionCount > 0 ? <span>{questionCount} vragen</span> : null}
        {isRequired ? <span>· Verplicht</span> : null}
        {dueAt ? <span>· Deadline {new Date(dueAt).toLocaleDateString("nl-BE")}</span> : null}
      </div>
    </div>
  );
}

function SuccessScreen({
  title,
  paragraphs,
  userFirstName,
}: {
  title: string;
  paragraphs: string[];
  userFirstName?: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#edf4ee] text-[#173622] shadow-[0_20px_50px_-30px_rgba(23,54,34,0.45)]">
        <Check className="h-9 w-9" strokeWidth={2.5} />
      </div>
      {userFirstName ? (
        <p className="mt-8 text-sm font-medium text-[#173622]">Bedankt, {userFirstName}!</p>
      ) : null}
      <h1 className="mt-3 text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-[#191919]">
        {title}
      </h1>
      <div className="mx-auto mt-6 max-w-xl space-y-4 text-base leading-7 text-[#5f5f5f] sm:text-lg sm:leading-8">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}

function QuestionScreen({
  question,
  index,
  value,
  userFirstName,
  showValidation,
  inputRef,
  onChange,
  onSelectChoice,
}: {
  question: Question;
  index: number;
  value: unknown;
  userFirstName?: string;
  showValidation: boolean;
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  onChange: (value: unknown) => void;
  onSelectChoice: (value: unknown) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#173622]">
        <span>{index + 1}</span>
        <span className="text-[#173622]/50">→</span>
        {question.isRequired ? (
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#173622]/70">
            Verplicht
          </span>
        ) : null}
      </div>

      {index > 0 && userFirstName ? (
        <p className="mb-3 text-sm text-[#737373]">Fijn, {userFirstName}.</p>
      ) : null}

      <h2 className="text-[clamp(1.65rem,4.2vw,2.65rem)] font-semibold leading-[1.12] tracking-[-0.025em] text-[#191919]">
        {question.title}
      </h2>

      {question.description ? (
        <p className="mt-3 max-w-2xl text-base leading-7 text-[#666] sm:text-lg">
          {question.description}
        </p>
      ) : null}

      <div className={cn("mt-8", showValidation && !isQuestionAnswered(question, value) && "rounded-2xl ring-2 ring-red-300/70 ring-offset-4")}>
        {renderField(question, value, onChange, onSelectChoice, inputRef, showValidation)}
      </div>

      {question.helperText ? (
        <p className="mt-4 text-sm leading-6 text-[#888]">{question.helperText}</p>
      ) : null}

      {showValidation && !isQuestionAnswered(question, value) ? (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">{getQuestionAnswerError(question, value)}</p>
      ) : null}
    </div>
  );
}

function renderField(
  question: Question,
  value: unknown,
  onChange: (value: unknown) => void,
  onSelectChoice: (value: unknown) => void,
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
  showValidation: boolean
) {
  if (question.type === "CONTACT_INFO") {
    const fields = getContactInfoFields(question.options);
    const contact = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
    return (
      <div data-contact-info className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        {fields.map((field, index) => {
          const error = showValidation ? getContactFieldError(field.key, contact[field.key], question.isRequired) : null;
          const id = `${question.id}-${field.key}`;
          return (
            <div key={field.key} className={field.key === "company" ? "sm:col-span-2" : undefined}>
              <label htmlFor={id} className="block text-sm font-medium text-[#444]">
                {field.label}{question.isRequired ? <span aria-hidden="true" className="ml-1 text-[#173622]">*</span> : null}
              </label>
              <input
                ref={index === 0 ? inputRef as React.RefObject<HTMLInputElement> : undefined}
                id={id}
                name={field.key}
                type={field.type}
                autoComplete={field.autoComplete}
                data-contact-field
                required={question.isRequired}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
                value={typeof contact[field.key] === "string" ? contact[field.key] as string : ""}
                onChange={(event) => onChange({ ...contact, [field.key]: event.target.value })}
                className={cn("mt-1 w-full min-w-0 border-0 border-b-2 bg-transparent py-2 text-xl text-[#191919] outline-none transition focus:border-[#173622]", error ? "border-red-400" : "border-black/15")}
              />
              {error ? <p id={`${id}-error`} className="mt-1 text-sm text-red-600">{error}</p> : null}
            </div>
          );
        })}
      </div>
    );
  }
  if (question.type === "LONG_TEXT") {
    return (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        className="w-full resize-none border-0 border-b-2 border-black/15 bg-transparent py-3 text-xl leading-8 text-[#191919] outline-none transition placeholder:text-[#b0b0b0] focus:border-[#173622]"
        rows={4}
        value={typeof value === "string" ? value : ""}
        placeholder={question.placeholder || "Typ je antwoord..."}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (question.type === "MULTIPLE_CHOICE" || question.type === "DROPDOWN") {
    return (
      <div className="space-y-2.5">
        {question.options.map((option, optionIndex) => (
          <ChoiceOption
            key={option}
            label={option}
            letter={String.fromCharCode(65 + optionIndex)}
            selected={value === option}
            onSelect={() => onSelectChoice(option)}
            delayMs={optionIndex * 40}
          />
        ))}
      </div>
    );
  }

  if (question.type === "CHECKBOXES") {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <div className="space-y-2.5">
        {question.options.map((option, optionIndex) => (
          <ChoiceOption
            key={option}
            label={option}
            letter={String.fromCharCode(65 + optionIndex)}
            selected={selected.includes(option)}
            multiple
            onSelect={() =>
              onChange(
                selected.includes(option)
                  ? selected.filter((entry) => entry !== option)
                  : [...selected, option]
              )
            }
            delayMs={optionIndex * 40}
          />
        ))}
      </div>
    );
  }

  if (question.type === "YES_NO") {
    return (
      <div className="grid gap-2.5 sm:grid-cols-2">
        {["Ja", "Nee"].map((option, optionIndex) => (
          <ChoiceOption
            key={option}
            label={option}
            letter={String.fromCharCode(65 + optionIndex)}
            selected={value === option}
            onSelect={() => onSelectChoice(option)}
            delayMs={optionIndex * 40}
          />
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
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type={inputType}
      className="w-full border-0 border-b-2 border-black/15 bg-transparent py-3 text-2xl font-medium text-[#191919] outline-none transition placeholder:font-normal placeholder:text-[#b0b0b0] focus:border-[#173622] sm:text-3xl"
      value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
      placeholder={question.placeholder || "Typ je antwoord..."}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function ChoiceOption({
  label,
  letter,
  selected,
  multiple = false,
  onSelect,
  delayMs = 0,
}: {
  label: string;
  letter: string;
  selected: boolean;
  multiple?: boolean;
  onSelect: () => void;
  delayMs?: number;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ animationDelay: `${delayMs}ms` }}
      className={cn(
        "form-choice-enter flex w-full items-center gap-4 rounded-xl border px-4 py-4 text-left text-base transition sm:px-5 sm:py-[1.15rem] sm:text-lg",
        selected
          ? "border-[#173622] bg-[#edf4ee] text-[#173622] shadow-[0_12px_30px_-24px_rgba(23,54,34,0.8)]"
          : "border-black/10 bg-white hover:border-[#173622]/25 hover:bg-[#fafcf9]"
      )}
    >
      <span
        className={cn(
          "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-semibold",
          selected
            ? "border-[#173622] bg-[#173622] text-white"
            : "border-black/10 bg-[#f5f5f3] text-[#666]"
        )}
      >
        {letter}
      </span>
      <span className="min-w-0 flex-1">{label}</span>
      {selected && multiple ? <Check className="h-4 w-4 shrink-0" /> : null}
    </button>
  );
}
