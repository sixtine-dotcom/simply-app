import { FormStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { slugifyFormValue } from "@/lib/forms";

export async function ensureNutritionIntakeForCourse(params: {
  tenantId: string;
  courseId: string;
}) {
  const existingAssignment = await db.formAssignment.findFirst({
    where: {
      tenantId: params.tenantId,
      courseId: params.courseId,
      audienceType: "COURSE",
      blocksCourseAccess: true,
      isActive: true,
    },
    include: { form: true },
  });
  if (existingAssignment) return existingAssignment;

  const course = await db.course.findUnique({
    where: { id: params.courseId },
    select: { id: true, title: true },
  });
  if (!course) throw new Error("Cursus niet gevonden");

  const slug = slugifyFormValue(`voedingsintake-${params.courseId}`);
  let form = await db.form.findUnique({ where: { slug } });

  if (!form) {
    form = await db.form.create({
      data: {
        tenantId: params.tenantId,
        title: `Voedingsintake – ${course.title}`,
        slug,
        description: "Verplichte intake voor de voorbereiding van het persoonlijke voedingsschema.",
        status: FormStatus.PUBLISHED,
        introTitle: "Vertel ons wat we nodig hebben voor jouw voedingsschema",
        introDescription:
          "Neem rustig de tijd en antwoord zo volledig mogelijk. Je kunt tussendoor bewaren en later verdergaan.",
        submitButtonLabel: "Mijn gegevens veilig indienen",
        successTitle: "Je voedingsintake is ontvangen",
        successDescription:
          "Bedankt. Je antwoorden zijn opgeslagen en je traject wordt nu automatisch voor je vrijgegeven.",
        isOnboardingForm: true,
        questions: {
          create: [
            {
              title: "Welk voedingsschema past bij jou?",
              type: "MULTIPLE_CHOICE",
              position: 0,
              isRequired: true,
              options: ["Schema voor vrouwen", "Schema voor mannen"],
            },
            { title: "Wat is je geboortedatum?", type: "DATE", position: 1, isRequired: true },
            { title: "Wat is je lengte in centimeter?", type: "NUMBER", position: 2, isRequired: true, placeholder: "Bijv. 168" },
            { title: "Wat is je huidige gewicht in kilogram?", type: "NUMBER", position: 3, isRequired: true, placeholder: "Bijv. 72,5" },
            { title: "Wat wil je met je voedingsschema vooral bereiken?", type: "LONG_TEXT", position: 4, isRequired: true },
            {
              title: "Hoe actief ben je gemiddeld?",
              type: "MULTIPLE_CHOICE",
              position: 5,
              isRequired: true,
              options: ["Weinig actief", "Licht actief", "Gemiddeld actief", "Zeer actief", "Intensief sportend"],
            },
            { title: "Hoe ziet een typische dag met eten en drinken er voor jou uit?", type: "LONG_TEXT", position: 6, isRequired: true },
            {
              title: "Volg je een bepaalde voedingsstijl?",
              type: "CHECKBOXES",
              position: 7,
              isRequired: false,
              options: ["Geen specifieke stijl", "Vegetarisch", "Vegan", "Halal", "Koemelkvrij", "Glutenvrij", "Anders"],
            },
            { title: "Heb je allergieën of intoleranties?", type: "LONG_TEXT", position: 8, isRequired: true, placeholder: "Schrijf ‘geen’ als dit niet van toepassing is." },
            { title: "Welke voedingsmiddelen eet je echt niet graag of wil je vermijden?", type: "LONG_TEXT", position: 9, isRequired: false },
            { title: "Zijn er medische aandoeningen, klachten of recente operaties waarmee rekening moet worden gehouden?", type: "LONG_TEXT", position: 10, isRequired: false, helperText: "Deel alleen informatie die relevant is voor veilige begeleiding." },
            { title: "Gebruik je medicatie of supplementen die relevant kunnen zijn voor je voeding?", type: "LONG_TEXT", position: 11, isRequired: false },
            {
              title: "Is één van deze situaties op jou van toepassing?",
              type: "MULTIPLE_CHOICE",
              position: 12,
              isRequired: true,
              options: ["Nee", "Ik ben zwanger", "Ik geef borstvoeding", "Ik probeer zwanger te worden", "Zeg ik liever niet"],
            },
            { title: "Heb je regelmatig spijsverteringsklachten? Zo ja, welke?", type: "LONG_TEXT", position: 13, isRequired: false },
            { title: "Hoeveel uur slaap je gemiddeld en hoe ervaar je de kwaliteit van je slaap?", type: "LONG_TEXT", position: 14, isRequired: false },
            { title: "Is er nog iets dat belangrijk is om te weten voor jouw persoonlijke schema?", type: "LONG_TEXT", position: 15, isRequired: false },
            {
              title: "Ik bevestig dat mijn antwoorden zo volledig en correct mogelijk zijn en dat dit traject geen medische diagnose of behandeling vervangt.",
              type: "CHECKBOXES",
              position: 16,
              isRequired: true,
              options: ["Ik bevestig dit"],
            },
          ],
        },
      },
    });
  }

  return db.formAssignment.create({
    data: {
      tenantId: params.tenantId,
      formId: form.id,
      audienceType: "COURSE",
      courseId: params.courseId,
      title: "Verplichte voedingsintake",
      isRequired: true,
      blocksCourseAccess: true,
      isActive: true,
    },
    include: { form: true },
  });
}
