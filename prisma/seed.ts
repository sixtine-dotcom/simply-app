import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

// Helper function to calculate week number
function getWeekNumber(date: Date): { weekNumber: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { weekNumber, year: d.getUTCFullYear() };
}

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@simplyinbalance.com" },
    update: {},
    create: {
      email: "admin@simplyinbalance.com",
      firstName: "Simply",
      lastName: "Admin",
      role: Role.ADMIN,
      emailVerified: new Date(),
    },
  });
  console.log("✅ Created admin user:", admin.email);

  // Create coach user
  const coach = await prisma.user.upsert({
    where: { email: "coach@simplyinbalance.com" },
    update: {},
    create: {
      email: "coach@simplyinbalance.com",
      firstName: "Emma",
      lastName: "Coach",
      role: Role.COACH,
      emailVerified: new Date(),
    },
  });
  console.log("✅ Created coach user:", coach.email);

  // Create demo client
  const client = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      firstName: "Sarah",
      lastName: "Demo",
      role: Role.CLIENT,
      emailVerified: new Date(),
    },
  });
  console.log("✅ Created demo client:", client.email);

  // Create courses - Simply Challenge (7 weeks like on simplyinbalance.com)
  const resetChallenge = await prisma.course.upsert({
    where: { slug: "simply-challenge" },
    update: {},
    create: {
      title: "Simply Challenge",
      slug: "simply-challenge",
      description: "Klachtenvrij en lichter in 7 weken! Met de Simply resetmethode werk je aan hormonale balans, darmherstel en een duurzame leefstijl die je volhoudt.",
      isPublished: true,
      drippingEnabled: true,
      drippingUnit: "weeks",
      modules: {
        create: [
          {
            title: "Welkom & Voorbereiding",
            description: "Welkom bij de Simply Challenge! Leer hoe het programma werkt en bereid je voor.",
            position: 0,
            unlockAfterDays: 0,
            lessons: {
              create: [
                {
                  title: "Welkom bij de Simply Challenge",
                  content: "# Welkom! 🌿\n\nSuper dat je meedoet aan de Simply Challenge!\n\nIn deze 7 weken gaan we samen werken aan:\n- Hormonale balans\n- Darmherstel\n- Een leefstijl die je volhoudt\n\nBekijk de video waarin ik (Sixtine) uitleg hoe het programma werkt en wat je kunt verwachten.",
                  position: 0,
                  videoUrl: "https://www.loom.com/share/example-welcome",
                  videoProvider: "loom",
                },
                {
                  title: "De Simply Methode uitgelegd",
                  content: "# De Simply Methode\n\nMijn orthomoleculaire aanpak focust op het herstellen van je lichaam van binnenuit.\n\n## Wat maakt deze methode anders?\n\n- We kijken naar de oorzaak, niet alleen de symptomen\n- Persoonlijke aanpak met ruimte voor jouw situatie\n- Praktische tools die je blijft gebruiken\n\n## De 3 pijlers\n\n1. Voeding & Suppletie\n2. Beweging & Herstel\n3. Mindset & Stressmanagement",
                  position: 1,
                },
                {
                  title: "Je startpunt bepalen",
                  content: "# Je Startpunt 📊\n\nVoordat we beginnen is het belangrijk om je startpunt vast te leggen.\n\n## Wat ga je doen?\n\n1. Vul je wekelijkse check-in in met:\n   - Je gewicht\n   - Lichaamsomtrekken (taille, heup)\n   - Voor-foto's (voor jezelf)\n\n2. Noteer je huidige klachten en energieniveau\n\n3. Stel je persoonlijke doelen\n\nDit helpt je om je voortgang te zien en gemotiveerd te blijven!",
                  position: 2,
                },
              ],
            },
          },
          {
            title: "Week 1: Voeding Basics",
            description: "De basis van gezonde voeding: macro's, eiwitten en je caloriebehoefte.",
            position: 1,
            unlockAfterDays: 0,
            lessons: {
              create: [
                {
                  title: "Macro's simpel uitgelegd",
                  content: "# Macro's Simpel Uitgelegd\n\nMacro's zijn de drie hoofdgroepen voedingsstoffen die je lichaam nodig heeft:\n\n## 1. Eiwitten 💪\n- Bouwstenen voor spieren, huid, haar\n- 1.6-2g per kg lichaamsgewicht\n- Voorbeelden: kip, vis, eieren, kwark\n\n## 2. Koolhydraten 🍞\n- Energie voor je lichaam\n- Kies voor complexe koolhydraten\n- Voorbeelden: havermout, rijst, groenten\n\n## 3. Vetten 🥑\n- Essentieel voor hormonen\n- Kies gezonde vetten\n- Voorbeelden: avocado, noten, olijfolie",
                  position: 0,
                },
                {
                  title: "Jouw caloriebehoefte berekenen",
                  content: "# Jouw Caloriebehoefte\n\nOm te weten hoeveel je moet eten, berekenen we je persoonlijke caloriebehoefte.\n\n## Stap 1: BMR (basaal metabolisme)\nDit is wat je lichaam in rust verbrandt.\n\n## Stap 2: Activiteitsniveau\nVermenigvuldig met je activiteitsfactor.\n\n## Stap 3: Je doel\n- Afvallen: -300 tot -500 kcal\n- Aankomen: +300 tot +500 kcal\n- Onderhouden: gelijk houden\n\n💡 Tip: Start nooit te laag! Je lichaam heeft energie nodig om goed te functioneren.",
                  position: 1,
                },
                {
                  title: "Eiwitten: hoeveel en wanneer",
                  content: "# Eiwitten: De Basis 💪\n\nEiwitten zijn essentieel voor:\n- Spieropbouw en -behoud\n- Verzadiging\n- Hormoonproductie\n- Herstel\n\n## Hoeveel heb je nodig?\n\nMijn advies: **1.6-2 gram per kg lichaamsgewicht**\n\nVoorbeeld: 70 kg → 112-140 gram eiwit per dag\n\n## Timing\n\nVerdeel je eiwitten over de dag:\n- Ontbijt: 25-30g\n- Lunch: 30-35g\n- Diner: 35-40g\n- Snacks: 15-25g\n\n## Goede bronnen\n- Kip/kalkoen\n- Vis\n- Eieren\n- Griekse yoghurt/kwark\n- Peulvruchten",
                  position: 2,
                },
                {
                  title: "Praktische voedingstips",
                  content: "# Praktische Tips voor Elke Dag\n\n## Meal prep\n- Bereid 2-3 dagen vooruit\n- Kook extra groenten en eiwitten\n- Houd gezonde snacks bij de hand\n\n## Boodschappen\n- Maak een lijst en houd je eraan\n- Shop het liefst aan de buitenkant van de supermarkt\n- Lees etiketten (let op suiker en E-nummers)\n\n## Uit eten\n- Bekijk de menukaart vooraf\n- Vraag om aanpassingen\n- Eet een gezonde snack vooraf\n\n## Cravings\n- Drink eerst een glas water\n- Wacht 10 minuten\n- Kies een gezonder alternatief",
                  position: 3,
                },
              ],
            },
          },
          {
            title: "Week 2: Darmgezondheid",
            description: "Alles over je darmen en hoe je ze gezond houdt.",
            position: 2,
            unlockAfterDays: 1, // Week 2
            lessons: {
              create: [
                {
                  title: "Je darmen: de basis",
                  content: "# Je Darmen: De Basis van Gezondheid\n\nWist je dat 70-80% van je immuunsysteem in je darmen zit?\n\n## Waarom darmen zo belangrijk zijn\n- Opname van voedingsstoffen\n- Productie van hormonen (o.a. serotonine)\n- Bescherming tegen ziekteverwekkers\n- Communicatie met je brein (darm-brein-as)\n\n## Signalen van ongezonde darmen\n- Opgeblazen gevoel\n- Onregelmatige stoelgang\n- Vermoeidheid\n- Huidproblemen\n- Stemmingswisselingen",
                  position: 0,
                },
                {
                  title: "Voeding voor gezonde darmen",
                  content: "# Voeding voor Gezonde Darmen\n\n## Wat helpt\n- Vezels: groenten, fruit, volkoren\n- Fermented foods: zuurkool, kimchi, kefir\n- Prebiotica: ui, knoflook, prei\n- Voldoende water\n\n## Wat je beter kunt beperken\n- Bewerkte voeding\n- Toegevoegde suikers\n- Kunstmatige zoetstoffen\n- Overmatig alcohol\n\n## Tip\nVoeg geleidelijk vezels toe om je darmen te laten wennen!",
                  position: 1,
                },
              ],
            },
          },
          {
            title: "Week 3: Hormonen in Balans",
            description: "Leer alles over je hormonen en hoe je ze in balans brengt.",
            position: 3,
            unlockAfterDays: 2, // Week 3
            lessons: {
              create: [
                {
                  title: "Hormonen uitgelegd",
                  content: "# Hormonen: De Dirigenten van Je Lichaam\n\nHormonen regelen bijna alles in je lichaam:\n- Energie\n- Stemming\n- Slaap\n- Gewicht\n- Vruchtbaarheid\n\n## Belangrijke hormonen voor vrouwen\n- Oestrogeen\n- Progesteron\n- Cortisol (stress)\n- Insuline\n- Schildklierhormonen",
                  position: 0,
                },
              ],
            },
          },
          {
            title: "Week 4: Beweging & Herstel",
            description: "Effectieve beweging en het belang van herstel.",
            position: 4,
            unlockAfterDays: 3, // Week 4
            lessons: {
              create: [
                {
                  title: "Bewegen zonder stress",
                  content: "# Bewegen Zonder Stress\n\nBewegen hoeft geen straf te zijn! Het gaat om beweging die bij jou past.\n\n## Vormen van beweging\n- Krachttraining\n- Wandelen\n- Yoga/pilates\n- Zwemmen\n- Fietsen\n\n## Mijn tips\n- Start met 3x per week\n- Luister naar je lichaam\n- Combineer kracht en cardio\n- Herstel is net zo belangrijk!",
                  position: 0,
                },
              ],
            },
          },
          {
            title: "Week 5: Slaap & Stress",
            description: "De impact van slaap en stress op je gezondheid.",
            position: 5,
            unlockAfterDays: 4, // Week 5
            lessons: {
              create: [
                {
                  title: "Beter slapen",
                  content: "# Beter Slapen\n\nSlaap is essentieel voor:\n- Herstel van je lichaam\n- Hormoonbalans\n- Gewichtsbeheer\n- Mentale gezondheid\n\n## Slaaphygiëne tips\n- Vaste slaaptijden\n- Geen schermen 1 uur voor bed\n- Koele, donkere slaapkamer\n- Ontspannend avondritueel",
                  position: 0,
                },
              ],
            },
          },
          {
            title: "Week 6: Suppletie",
            description: "Welke supplementen kunnen helpen en wanneer.",
            position: 6,
            unlockAfterDays: 5, // Week 6
            lessons: {
              create: [
                {
                  title: "Basisuppletie",
                  content: "# Suppletie: De Basics\n\n## Waarom supplementen?\nZelfs met een gezond dieet kun je tekorten hebben door:\n- Uitgeputte bodems\n- Stress\n- Medicijngebruik\n\n## Basis supplementen\n- Vitamine D3 (zeker in de winter)\n- Omega-3\n- Magnesium\n- Probiotica\n\n⚠️ Raadpleeg altijd een professional voordat je start met supplementen!",
                  position: 0,
                },
              ],
            },
          },
          {
            title: "Week 7: Volhouden & Afsluiting",
            description: "Hoe je dit volhoudt en wat nu?",
            position: 7,
            unlockAfterDays: 6, // Week 7
            lessons: {
              create: [
                {
                  title: "Van challenge naar lifestyle",
                  content: "# Van Challenge naar Lifestyle 🌿\n\nGefeliciteerd! Je hebt de Simply Challenge voltooid!\n\n## Wat heb je geleerd?\n- De basis van gezonde voeding\n- Het belang van darmgezondheid\n- Hoe je hormonen in balans houdt\n- Beweging en herstel\n- Stressmanagement\n\n## Hoe nu verder?\n\n1. Blijf je check-ins doen\n2. Houd je goede gewoontes vast\n3. Wees lief voor jezelf bij een terugval\n4. Blijf actief in de community\n\n## Wat nu?\n- 1-op-1 begeleiding\n- Verdiepende modules\n- Community support",
                  position: 0,
                },
                {
                  title: "Bedankt! 💚",
                  content: "# Bedankt voor je deelname!\n\nIk ben zo trots op je dat je deze stappen hebt gezet naar een gezonder leven.\n\nOnthoud: het gaat niet om perfect zijn, maar om consistent kleine stapjes zetten.\n\nHeb je vragen? Je kunt me altijd bereiken via de community of een 1-op-1 gesprek plannen.\n\nLiefs,\nSixtine 🌿",
                  position: 1,
                },
              ],
            },
          },
        ],
      },
    },
  });
  console.log("✅ Created course:", resetChallenge.title);

  // 1-op-1 traject template
  const oneOnOne = await prisma.course.upsert({
    where: { slug: "1-op-1-traject" },
    update: {},
    create: {
      title: "1-op-1 Traject",
      slug: "1-op-1-traject",
      description: "Persoonlijke begeleiding op maat. Dit traject wordt aangepast aan jouw specifieke situatie en doelen.",
      isPublished: true,
      isPrivate: true,
      modules: {
        create: [
          {
            title: "Jouw Persoonlijke Plan",
            position: 0,
            lessons: {
              create: [
                {
                  title: "Welkom bij je traject",
                  content: "# Welkom bij je 1-op-1 Traject 🌿\n\nSuper dat je voor persoonlijke begeleiding hebt gekozen!\n\nIn dit traject werk ik samen met jou aan je specifieke doelen. Dit is jouw ruimte waar ik materiaal, adviezen en opdrachten voor je zal plaatsen.\n\n## Wat kun je verwachten?\n- Persoonlijk voedingsadvies\n- Wekelijkse check-ins\n- Directe ondersteuning via chat\n- Video calls voor begeleiding",
                  position: 0,
                },
              ],
            },
          },
        ],
      },
    },
  });
  console.log("✅ Created course:", oneOnOne.title);

  // Create enrollments for demo client
  await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: client.id,
        courseId: resetChallenge.id,
      },
    },
    update: {},
    create: {
      userId: client.id,
      courseId: resetChallenge.id,
      startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // Started 2 weeks ago
      endDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000), // 5 weeks left (7 weeks total)
    },
  });
  console.log("✅ Created enrollment for demo client");

  // Create some progress
  const introModule = await prisma.module.findFirst({
    where: { courseId: resetChallenge.id, position: 0 },
    include: { lessons: true },
  });

  if (introModule) {
    for (const lesson of introModule.lessons) {
      await prisma.progress.upsert({
        where: {
          userId_lessonId: {
            userId: client.id,
            lessonId: lesson.id,
          },
        },
        update: {},
        create: {
          userId: client.id,
          lessonId: lesson.id,
          completedAt: new Date(),
        },
      });
    }
  }
  console.log("✅ Created progress for demo client");

  // Create community spaces
  const announcements = await prisma.space.upsert({
    where: { slug: "aankondigingen" },
    update: {},
    create: {
      name: "Aankondigingen",
      slug: "aankondigingen",
      description: "Belangrijke updates en nieuws van Simply",
      iconEmoji: "📢",
      isPublic: true,
      isHostOnly: true,
      position: 0,
    },
  });

  const algemeen = await prisma.space.upsert({
    where: { slug: "algemeen" },
    update: {},
    create: {
      name: "Algemeen",
      slug: "algemeen",
      description: "Algemene discussies en vragen",
      iconEmoji: "💬",
      isPublic: true,
      isHostOnly: false,
      position: 1,
    },
  });

  await prisma.space.upsert({
    where: { slug: "successen" },
    update: {},
    create: {
      name: "Successen",
      slug: "successen",
      description: "Deel je successen en vier mee!",
      iconEmoji: "🎉",
      isPublic: true,
      isHostOnly: false,
      position: 2,
    },
  });

  await prisma.space.upsert({
    where: { slug: "recepten" },
    update: {},
    create: {
      name: "Recepten Delen",
      slug: "recepten",
      description: "Deel je favoriete gezonde recepten",
      iconEmoji: "🍽️",
      isPublic: true,
      isHostOnly: false,
      position: 3,
    },
  });
  console.log("✅ Created community spaces");

  // Add client to spaces
  await prisma.spaceMember.upsert({
    where: {
      userId_spaceId: {
        userId: client.id,
        spaceId: announcements.id,
      },
    },
    update: {},
    create: {
      userId: client.id,
      spaceId: announcements.id,
    },
  });

  await prisma.spaceMember.upsert({
    where: {
      userId_spaceId: {
        userId: client.id,
        spaceId: algemeen.id,
      },
    },
    update: {},
    create: {
      userId: client.id,
      spaceId: algemeen.id,
    },
  });
  console.log("✅ Added demo client to spaces");

  // Create some posts
  await prisma.post.create({
    data: {
      spaceId: announcements.id,
      authorId: admin.id,
      content: "🌿 Welkom bij de Simply Family!\n\nSuper dat je erbij bent. In deze community kun je:\n\n• Vragen stellen aan mij en andere deelnemers\n• Je successen delen en anderen inspireren\n• Tips en recepten uitwisselen\n• Steun vinden wanneer het even tegenzit\n\nBekijk eerst je dashboard om te zien wat er allemaal mogelijk is. En vergeet niet je wekelijkse check-in te doen!\n\nLiefs, Sixtine 💚",
      isPinned: true,
    },
  });

  await prisma.post.create({
    data: {
      spaceId: announcements.id,
      authorId: admin.id,
      content: "📢 Nieuwe module beschikbaar!\n\nDe module over hormoonbalans is nu live. Hierin leer je:\n\n• Hoe je hormonen werken\n• De invloed van voeding op je cyclus\n• Praktische tips voor elke fase\n\nBekijk hem via Mijn Cursussen → Simply Challenge",
    },
  });

  await prisma.post.create({
    data: {
      spaceId: algemeen.id,
      authorId: client.id,
      content: "Hoi allemaal! 👋\n\nIk ben Sarah en net begonnen met de Simply Challenge. Ik ben benieuwd naar jullie ervaringen!\n\nWat vonden jullie het lastigst in het begin? En hebben jullie tips voor meal prep?",
    },
  });

  // Add space membership for client to successen space
  const successen = await prisma.space.findUnique({ where: { slug: "successen" } });
  if (successen) {
    await prisma.spaceMember.upsert({
      where: {
        userId_spaceId: {
          userId: client.id,
          spaceId: successen.id,
        },
      },
      update: {},
      create: {
        userId: client.id,
        spaceId: successen.id,
      },
    });

    await prisma.post.create({
      data: {
        spaceId: successen.id,
        authorId: client.id,
        content: "🎉 Week 2 check-in gedaan!\n\nIk merk nu al verschil in mijn energie. De ochtenden zijn zoveel makkelijker geworden sinds ik mijn ontbijt heb aangepast.\n\n-1.5kg en vooral: geen 3-uur-dip meer! 💪",
      },
    });
  }

  console.log("✅ Created posts");

  // Create a coaching session
  const sessionDate = new Date();
  sessionDate.setDate(sessionDate.getDate() + 7);
  sessionDate.setHours(10, 0, 0, 0);

  await prisma.coachingSession.create({
    data: {
      clientId: client.id,
      coachId: coach.id,
      title: "Intake gesprek",
      scheduledAt: sessionDate,
      duration: 45,
      status: "scheduled",
    },
  });
  console.log("✅ Created coaching session");

  // Create sample tracker data for demo client
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Nutrition logs (last 7 days)
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    await prisma.nutritionLog.upsert({
      where: {
        userId_date: {
          userId: client.id,
          date,
        },
      },
      update: {},
      create: {
        userId: client.id,
        date,
        calories: 1800 + Math.floor(Math.random() * 200),
        protein: 120 + Math.floor(Math.random() * 20),
        carbs: 150 + Math.floor(Math.random() * 30),
        fat: 60 + Math.floor(Math.random() * 10),
      },
    });
  }

  // Habit logs (last 7 days)
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    await prisma.habitLog.upsert({
      where: {
        userId_date: {
          userId: client.id,
          date,
        },
      },
      update: {},
      create: {
        userId: client.id,
        date,
        waterGlasses: 6 + Math.floor(Math.random() * 4),
        steps: 8000 + Math.floor(Math.random() * 4000),
        supplements: Math.random() > 0.2, // 80% chance
      },
    });
  }

  // Check-ins (last 3 weeks)
  const { weekNumber, year } = getWeekNumber(today);
  for (let i = 0; i < 3; i++) {
    const checkInWeek = weekNumber - i;
    const checkInYear = checkInWeek < 1 ? year - 1 : year;
    const actualWeek = checkInWeek < 1 ? 52 + checkInWeek : checkInWeek;
    
    const checkInDate = new Date(today);
    checkInDate.setDate(checkInDate.getDate() - i * 7);

    await prisma.checkIn.upsert({
      where: {
        userId_weekNumber_year: {
          userId: client.id,
          weekNumber: actualWeek,
          year: checkInYear,
        },
      },
      update: {},
      create: {
        userId: client.id,
        weekNumber: actualWeek,
        year: checkInYear,
        date: checkInDate,
        weight: 68.5 - i * 0.3,
        waist: 75 - i * 0.5,
        hip: 95 - i * 0.3,
        notes: i === 0 ? "Goede voortgang! Voel me energieker." : undefined,
      },
    });
  }

  // Symptom logs (last 7 days)
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    await prisma.symptomLog.upsert({
      where: {
        userId_date: {
          userId: client.id,
          date,
        },
      },
      update: {},
      create: {
        userId: client.id,
        date,
        energy: 6 + Math.floor(Math.random() * 3),
        cravings: 4 + Math.floor(Math.random() * 3),
        digestion: 7 + Math.floor(Math.random() * 2),
        sleep: 6 + Math.floor(Math.random() * 3),
        mood: 7 + Math.floor(Math.random() * 2),
      },
    });
  }

  console.log("✅ Created tracker data for demo client");

  // Create some recipes
  await prisma.recipe.upsert({
    where: { slug: "overnight-oats" },
    update: {},
    create: {
      title: "Overnight Oats",
      slug: "overnight-oats",
      description: "Een makkelijk en voedzaam ontbijt dat je de avond ervoor klaarmaakt.",
      calories: 350,
      protein: 25,
      carbs: 40,
      fat: 12,
      servings: 1,
      prepTime: 5,
      cookTime: 0,
      category: "ontbijt",
      tags: ["high-protein", "meal-prep", "vegetarisch"],
      ingredients: [
        { amount: "50", unit: "g", ingredient: "havermout" },
        { amount: "150", unit: "ml", ingredient: "melk naar keuze" },
        { amount: "100", unit: "g", ingredient: "Griekse yoghurt" },
        { amount: "1", unit: "el", ingredient: "chiazaad" },
        { amount: "1", unit: "tl", ingredient: "honing" },
        { amount: "", unit: "", ingredient: "Vers fruit naar keuze" },
      ],
      instructions: [
        { step: 1, text: "Meng havermout, melk, yoghurt en chiazaad in een pot of kom." },
        { step: 2, text: "Voeg de honing toe en roer goed door." },
        { step: 3, text: "Dek af en zet minimaal 4 uur (of overnight) in de koelkast." },
        { step: 4, text: "Voeg voor het serveren vers fruit toe." },
      ],
      isPublished: true,
    },
  });

  await prisma.recipe.upsert({
    where: { slug: "griekse-salade-met-kip" },
    update: {},
    create: {
      title: "Griekse Salade met Kip",
      slug: "griekse-salade-met-kip",
      description: "Een frisse en eiwitrijke salade perfect voor de lunch.",
      calories: 420,
      protein: 35,
      carbs: 15,
      fat: 25,
      servings: 2,
      prepTime: 15,
      cookTime: 15,
      category: "lunch",
      tags: ["high-protein", "low-carb", "glutenvrij"],
      ingredients: [
        { amount: "300", unit: "g", ingredient: "kipfilet" },
        { amount: "1", unit: "", ingredient: "komkommer" },
        { amount: "200", unit: "g", ingredient: "cherry tomaten" },
        { amount: "100", unit: "g", ingredient: "feta" },
        { amount: "50", unit: "g", ingredient: "zwarte olijven" },
        { amount: "1/2", unit: "", ingredient: "rode ui" },
        { amount: "2", unit: "el", ingredient: "olijfolie" },
        { amount: "1", unit: "el", ingredient: "citroensap" },
      ],
      instructions: [
        { step: 1, text: "Bak de kipfilet gaar in een pan met wat olie. Laat afkoelen en snijd in plakjes." },
        { step: 2, text: "Snijd de komkommer, tomaten en ui in stukjes." },
        { step: 3, text: "Meng alle groenten in een grote kom." },
        { step: 4, text: "Voeg de kip, feta en olijven toe." },
        { step: 5, text: "Maak een dressing van olijfolie en citroensap en schenk over de salade." },
      ],
      isPublished: true,
    },
  });

  await prisma.recipe.upsert({
    where: { slug: "protein-pancakes" },
    update: {},
    create: {
      title: "Protein Pancakes",
      slug: "protein-pancakes",
      description: "Fluffy pancakes met extra eiwit - perfect na je workout!",
      calories: 380,
      protein: 30,
      carbs: 35,
      fat: 10,
      servings: 2,
      prepTime: 5,
      cookTime: 10,
      category: "ontbijt",
      tags: ["high-protein", "post-workout"],
      ingredients: [
        { amount: "1", unit: "", ingredient: "banaan" },
        { amount: "2", unit: "", ingredient: "eieren" },
        { amount: "30", unit: "g", ingredient: "proteine poeder (vanille)" },
        { amount: "30", unit: "g", ingredient: "havermout" },
        { amount: "1/2", unit: "tl", ingredient: "bakpoeder" },
      ],
      instructions: [
        { step: 1, text: "Blend alle ingrediënten tot een glad beslag." },
        { step: 2, text: "Verhit een pan op medium vuur met een beetje kokosolie." },
        { step: 3, text: "Schep het beslag in de pan en bak tot er bubbels verschijnen." },
        { step: 4, text: "Draai om en bak nog 1-2 minuten." },
        { step: 5, text: "Serveer met vers fruit en een druppel honing." },
      ],
      isPublished: true,
    },
  });
  console.log("✅ Created recipes");

  // Create feature flags
  await prisma.featureFlag.upsert({
    where: { key: "ai_chat" },
    update: {},
    create: {
      key: "ai_chat",
      isEnabled: true,
      description: "SIX AI chat functionality",
    },
  });

  await prisma.featureFlag.upsert({
    where: { key: "whatsapp" },
    update: {},
    create: {
      key: "whatsapp",
      isEnabled: false,
      description: "WhatsApp messaging integration",
    },
  });

  await prisma.featureFlag.upsert({
    where: { key: "voice_memos" },
    update: {},
    create: {
      key: "voice_memos",
      isEnabled: false,
      description: "Voice memo recording in chat",
    },
  });
  console.log("✅ Created feature flags");

  console.log("\n🎉 Database seeded successfully!");
  console.log("\nDemo accounts:");
  console.log("- Admin: admin@simplyinbalance.com");
  console.log("- Coach: coach@simplyinbalance.com");
  console.log("- Client: demo@example.com");
  console.log("\nUse magic link login to authenticate.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
