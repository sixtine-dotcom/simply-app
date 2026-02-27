# Simply Platform - UX & Information Architecture

## 1. Navigation Structure

### 1.1 Main Navigation (Sidebar - Left)
```
┌─────────────────────────────────────────┐
│  [SIMPLY LOGO]                          │
├─────────────────────────────────────────┤
│  🏠 Dashboard                           │
│  📚 Mijn Cursussen                      │
│  👥 Community                           │
│  💬 Berichten                           │
│  📅 Coaching                            │
│  ────────────────                       │
│  📊 Mijn Omgeving (Trackers)            │
│     ├─ Voeding                          │
│     ├─ Check-ins                        │
│     ├─ Habits                           │
│     ├─ Cyclus                           │
│     └─ Symptomen                        │
│  🍽️ Recepten                            │
│  🤖 SIX AI                              │
│  ────────────────                       │
│  ⚙️ Instellingen                        │
│  🚪 Uitloggen                           │
└─────────────────────────────────────────┘
```

### 1.2 Admin Navigation (Additional)
```
│  ────────────────                       │
│  👑 ADMIN                               │
│     ├─ Gebruikers                       │
│     ├─ Cursussen beheren                │
│     ├─ Community beheren                │
│     ├─ Sessies overzicht                │
│     ├─ Recepten beheren                 │
│     ├─ SIX AI Knowledge Base            │
│     ├─ WhatsApp logs                    │
│     └─ Instellingen                     │
└─────────────────────────────────────────┘
```

---

## 2. Page Wireframe Descriptions

### 2.1 Dashboard (Client)
```
┌──────────────────────────────────────────────────────────────┐
│  Welkom terug, [Naam]! 👋                                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐           │
│  │ MIJN CURSUSSEN      │  │ COMMUNITY UPDATES   │           │
│  │                     │  │                     │           │
│  │ [Course Card 1]     │  │ • Nieuwe post in    │           │
│  │ Progress: 45%       │  │   Algemeen          │           │
│  │ [────────░░░]       │  │ • 3 nieuwe DMs      │           │
│  │                     │  │                     │           │
│  │ [Course Card 2]     │  └─────────────────────┘           │
│  │ Begint over 3 dagen │                                    │
│  └─────────────────────┘  ┌─────────────────────┐           │
│                           │ COACHING            │           │
│  ┌─────────────────────┐  │                     │           │
│  │ DAGELIJKSE CHECK    │  │ Volgende sessie:    │           │
│  │                     │  │ Ma 15 jan, 10:00    │           │
│  │ Water: ○○○○○○○○     │  │ [Toevoegen agenda]  │           │
│  │ Eiwit: 45g / 120g   │  │                     │           │
│  │ Suppletie: ✓        │  └─────────────────────┘           │
│  └─────────────────────┘                                    │
│                           ┌─────────────────────┐           │
│  ┌─────────────────────┐  │ SIX TIP VAN DE DAG  │           │
│  │ WEKELIJKSE CHECK-IN │  │                     │           │
│  │                     │  │ "Wist je dat..."    │           │
│  │ ⚠️ Nog niet ingevuld │  │                     │           │
│  │ [Nu invullen →]     │  │ [Vraag aan SIX →]   │           │
│  └─────────────────────┘  └─────────────────────┘           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Components:**
- Welcome header with user's first name
- Course cards showing enrolled courses with progress bars
- Quick access to daily habit tracking
- Weekly check-in reminder (if not completed)
- Upcoming coaching session
- Community notification summary
- SIX AI tip of the day

---

### 2.2 Course Overview (Mijn Cursussen)
```
┌──────────────────────────────────────────────────────────────┐
│  MIJN CURSUSSEN                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [Image]  8 WEKEN RESET CHALLENGE                       │ │
│  │          ━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░ 68%       │ │
│  │          Toegang tot: 15 maart 2026                    │ │
│  │          [Ga verder →]                                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [Image]  HORMOON BALANS PROGRAMMA                      │ │
│  │          ━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░ 25%       │ │
│  │          Onbeperkte toegang                            │ │
│  │          [Ga verder →]                                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [Image]  1-OP-1 TRAJECT                         🔒     │ │
│  │          Privé cursusmateriaal                         │ │
│  │          [Bekijken →]                                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

### 2.3 Course Detail (Single Course)
```
┌──────────────────────────────────────────────────────────────┐
│  ← Terug naar cursussen                                      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           [Hero Image / Video]                         │ │
│  │                                                        │ │
│  │           8 WEKEN RESET CHALLENGE                      │ │
│  │           Je voortgang: 68%                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  MODULE 1: INTRODUCTIE                           ✓ Voltooid │
│  ├── Les 1: Welkom                                    ✓    │
│  ├── Les 2: Hoe werkt dit programma                   ✓    │
│  └── Les 3: Je startpunt bepalen                      ✓    │
│                                                              │
│  MODULE 2: VOEDING BASICS                        ▶ Actief   │
│  ├── Les 1: Macro's uitgelegd                         ✓    │
│  ├── Les 2: Jouw caloriebehoefte                      ✓    │
│  ├── Les 3: Eiwitten & timing                         ●    │
│  └── Les 4: Praktische tips                           ○    │
│                                                              │
│  MODULE 3: BEWEGING                              🔒 Week 3   │
│  ├── Les 1: Coming soon...                            🔒   │
│  └── ...                                                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**States:**
- ✓ Completed
- ● Current (in progress)
- ○ Available (not started)
- 🔒 Locked (dripping - shows unlock date)

---

### 2.4 Lesson View
```
┌──────────────────────────────────────────────────────────────┐
│  ← Module 2: Voeding Basics                                  │
│                                                              │
│  LES 3: EIWITTEN & TIMING                                   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │              [VIDEO PLAYER - Loom/Upload]              │ │
│  │                                                        │ │
│  │               advancement timeline player               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ────────────────────────────────────────────────────────── │
│                                                              │
│  ## Waarom eiwitten zo belangrijk zijn                      │
│                                                              │
│  Lorem ipsum dolor sit amet, consectetur adipiscing elit.   │
│  Eiwitten zijn de bouwstenen van je lichaam...              │
│                                                              │
│  [Image: protein sources]                                    │
│                                                              │
│  ### Timing tips                                            │
│  - Spreiding over de dag                                    │
│  - Na training extra belangrijk                             │
│                                                              │
│  ────────────────────────────────────────────────────────── │
│                                                              │
│  ┌────────────────┐                    ┌────────────────┐   │
│  │ ← Vorige les   │                    │ Volgende les → │   │
│  └────────────────┘                    └────────────────┘   │
│                                                              │
│            [ ✓ Markeer als voltooid ]                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

### 2.5 Community Overview
```
┌──────────────────────────────────────────────────────────────┐
│  COMMUNITY                                                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [Spaces sidebar]          │  [Feed / Space content]        │
│                            │                                 │
│  📢 Aankondigingen         │  ALGEMEEN                       │
│  💬 Algemeen               │  ─────────────────────────────  │
│  🍽️ Recepten delen         │                                 │
│  💪 Successen              │  [+ Nieuwe post]                │
│  🏃 Challenge groep        │                                 │
│                            │  ┌─────────────────────────┐   │
│  ─────────────             │  │ [Avatar] Sarah          │   │
│  🔒 Premium only           │  │ 2 uur geleden           │   │
│  🔒 VIP Coaching           │  │                         │   │
│                            │  │ Vandaag mijn eerste     │   │
│                            │  │ meal prep gedaan! 🎉    │   │
│                            │  │                         │   │
│                            │  │ [Image]                 │   │
│                            │  │                         │   │
│                            │  │ ♥ 12  💬 5  [Reageer]  │   │
│                            │  └─────────────────────────┘   │
│                            │                                 │
│                            │  ┌─────────────────────────┐   │
│                            │  │ [Avatar] Admin/Simply   │   │
│                            │  │ Gisteren                │   │
│                            │  │                         │   │
│                            │  │ 📢 Nieuwe module live!  │   │
│                            │  │                         │   │
│                            │  └─────────────────────────┘   │
│                            │                                 │
└──────────────────────────────────────────────────────────────┘
```

---

### 2.6 Direct Messages
```
┌──────────────────────────────────────────────────────────────┐
│  BERICHTEN                                                   │
├──────────────────────────────────────────────────────────────┤
│                            │                                 │
│  [Conversations list]      │  [Chat view]                    │
│                            │                                 │
│  🔍 Zoek gesprek...        │  💬 Sarah van den Berg          │
│                            │  ─────────────────────────────  │
│  ┌──────────────────┐      │                                 │
│  │ [●] Sarah        │      │  [message bubbles]              │
│  │ Super, dankjewel!│      │                                 │
│  └──────────────────┘      │  Sarah: Hoi! Ik had een vraag  │
│                            │         over de eiwitten...     │
│  ┌──────────────────┐      │                                 │
│  │ Coach Emma       │      │  Jij: Natuurlijk, vertel!      │
│  │ Tot maandag!     │      │                                 │
│  └──────────────────┘      │  Sarah: Super, dankjewel!      │
│                            │                                 │
│  ┌──────────────────┐      │  ─────────────────────────────  │
│  │ [+] Nieuw gesprek│      │                                 │
│  └──────────────────┘      │  [Type bericht...] [🎤] [Send]  │
│                            │                                 │
└──────────────────────────────────────────────────────────────┘
```

---

### 2.7 Coaching Sessions
```
┌──────────────────────────────────────────────────────────────┐
│  COACHING                                                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  AANKOMENDE SESSIES                                         │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  📅 Maandag 15 januari 2026                            │ │
│  │  🕙 10:00 - 10:45                                      │ │
│  │  👤 Met: Coach Emma                                    │ │
│  │                                                        │ │
│  │  [📥 Download .ics]  [▶ Start sessie]                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  EERDERE SESSIES                                            │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  📅 Maandag 8 januari 2026  ✓ Voltooid                │ │
│  │  👤 Coach Emma                                         │ │
│  │  📝 Notities beschikbaar                               │ │
│  │  [Bekijk notities →]                                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

### 2.8 Trackers - Voeding
```
┌──────────────────────────────────────────────────────────────┐
│  VOEDING TRACKER                                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  VANDAAG: 15 januari 2026           [← ] [ Kalender ] [→ ]  │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │ CALORIEËN           │  │ EIWITTEN            │          │
│  │                     │  │                     │          │
│  │    1450 / 1800      │  │    85g / 120g       │          │
│  │    ━━━━━━━━━░░░     │  │    ━━━━━━━░░░░      │          │
│  │                     │  │                     │          │
│  │ [+ Toevoegen]       │  │ [+ Toevoegen]       │          │
│  └─────────────────────┘  └─────────────────────┘          │
│                                                              │
│  VANDAAG GELOGD                                             │
│  ─────────────────────────────────────────────────────────  │
│  Ontbijt     │ Havermout + ei      │ 450 kcal │ 25g eiwit  │
│  Lunch       │ Salade met kip      │ 520 kcal │ 35g eiwit  │
│  Snack       │ Kwark               │ 180 kcal │ 18g eiwit  │
│  Diner       │ (nog niet ingevuld) │          │            │
│                                                              │
│  [+ Maaltijd toevoegen]                                     │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│  WEEK OVERZICHT                                             │
│  [Graph showing 7-day kcal/protein trend]                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

### 2.9 Trackers - Weekly Check-in
```
┌──────────────────────────────────────────────────────────────┐
│  WEKELIJKSE CHECK-IN                                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  WEEK 6 - 15 januari 2026                                   │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  GEWICHT                           OMTREKKEN                 │
│  ┌───────────────────────┐        ┌───────────────────────┐ │
│  │ Huidig: ___ kg        │        │ Taille: ___ cm        │ │
│  │                       │        │ Heup:   ___ cm        │ │
│  │ Vorige week: 72.5 kg  │        │ Arm:    ___ cm        │ │
│  └───────────────────────┘        └───────────────────────┘ │
│                                                              │
│  FOTO'S                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                       │
│  │  VOOR   │ │  ZIJKANT │ │ ACHTER  │                       │
│  │  [📷]   │ │   [📷]   │ │  [📷]   │                       │
│  │ Upload  │ │  Upload  │ │ Upload  │                       │
│  └─────────┘ └─────────┘ └─────────┘                       │
│                                                              │
│  HOE VOEL JE JE DEZE WEEK?                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [Textarea for notes]                                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Opslaan]                                                  │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│  MIJN PROGRESSIE                                            │
│  [Graph: weight over time]                                  │
│  [Photo comparison: Week 1 vs Now]                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

### 2.10 Recipes
```
┌──────────────────────────────────────────────────────────────┐
│  RECEPTEN                                     🛒 Lijst (3)   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [🔍 Zoek recept...]  [Filter: Ontbijt ▼] [High protein ▼]  │
│                                                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │ [Image]    │ │ [Image]    │ │ [Image]    │              │
│  │            │ │            │ │            │              │
│  │ Overnight  │ │ Griekse    │ │ Protein    │              │
│  │ Oats       │ │ Salade     │ │ Pancakes   │              │
│  │            │ │            │ │            │              │
│  │ 🔥 350kcal │ │ 🔥 420kcal │ │ 🔥 380kcal │              │
│  │ 💪 25g     │ │ 💪 32g     │ │ 💪 28g     │              │
│  │            │ │            │ │            │              │
│  │ [+ Lijst]  │ │ [+ Lijst]  │ │ [✓ In lijst]│              │
│  └────────────┘ └────────────┘ └────────────┘              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

### 2.11 SIX AI Chat
```
┌──────────────────────────────────────────────────────────────┐
│  SIX AI                                                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  💬 TIP VAN DE DAG                                     │ │
│  │  Wist je dat eiwitten je langer verzadigd houden?      │ │
│  │  Probeer bij elke maaltijd minstens 25g eiwit te eten. │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  [You]: Hoeveel eiwit heb ik nodig per dag?                 │
│                                                              │
│  [SIX]: Op basis van jouw gegevens en de Simply-            │
│         richtlijnen adviseer ik 1.6-2g eiwit per kg         │
│         lichaamsgewicht. Voor jou betekent dat              │
│         ongeveer 110-140g per dag.                          │
│                                                              │
│         Verdeel dit over 4-5 momenten voor optimale         │
│         opname. Check Module 2 Les 3 voor meer tips! 📚     │
│                                                              │
│         [👍] [👎]                                            │
│                                                              │
│  [You]: Mag ik supplementen gebruiken?                      │
│                                                              │
│  [SIX]: Supplementen kunnen een aanvulling zijn, maar       │
│         echte voeding heeft altijd de voorkeur...           │
│                                                              │
│         ⚠️ Voor specifiek medisch advies over               │
│         supplementen raadpleeg altijd je arts of            │
│         diëtist.                                            │
│                                                              │
│         [👍] [👎]                                            │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│  [Stel je vraag aan SIX...]                        [Send]   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Design System

### 3.1 Colors
```
Primary:      #FFFFFF (White - main background)
Secondary:    #F9F9F9 (Off-white - cards/sections)
Accent:       #2D5A27 (Forest green - from tropical theme)
Text:         #1A1A1A (Near black)
Text Light:   #6B7280 (Gray)
Success:      #10B981 (Green)
Warning:      #F59E0B (Amber)
Error:        #EF4444 (Red)
Border:       #E5E7EB (Light gray)
```

### 3.2 Typography
```
Headlines:    "The Seasons" - UPPERCASE
Body:         "Montserrat" - Regular/Medium
Sizes:
  - H1: 32px / 40px line-height
  - H2: 24px / 32px line-height
  - H3: 20px / 28px line-height
  - Body: 16px / 24px line-height
  - Small: 14px / 20px line-height
```

### 3.3 Components
```
Cards:        white bg, 8px radius, subtle shadow (0 1px 3px rgba(0,0,0,0.1))
Buttons:      8px radius, 16px/24px padding
Inputs:       8px radius, 1px border, 12px/16px padding
Avatars:      Circular, 40px default
Progress:     6px height, rounded, green fill
```

### 3.4 Spacing
```
Base unit:    4px
Common:       8, 12, 16, 24, 32, 48, 64px
Page padding: 24px (mobile), 48px (desktop)
Card padding: 16px (mobile), 24px (desktop)
```
