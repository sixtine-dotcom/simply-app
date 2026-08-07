"use client";

import { createContext, useContext, useEffect, useMemo } from "react";

export type AppLanguage = "nl" | "en";

type LocaleContextValue = {
  language: AppLanguage;
  t: (key: LocaleKey) => string;
};

const translations = {
  nl: {
    sidebar_dashboard: "Dashboard",
    sidebar_my_courses: "Mijn Cursussen",
    sidebar_community: "Community",
    sidebar_forms: "Formulieren",
    sidebar_messages: "Berichten",
    sidebar_coaching: "Coaching",
    sidebar_overview: "Overzicht",
    sidebar_weekly_overview: "Weekoverzicht",
    sidebar_nutrition: "Voeding",
    sidebar_checkins: "Check-ins",
    sidebar_progress: "Voortgang",
    sidebar_progress_photos: "Progressiefoto's",
    sidebar_habits: "Habits",
    sidebar_cycle: "Cyclus",
    sidebar_symptoms: "Symptomen",
    sidebar_products_library: "Producten & kennisbank",
    sidebar_recipes: "Recepten",
    sidebar_member_area: "Mijn Omgeving",
    sidebar_settings: "Instellingen",
    sidebar_notifications: "Meldingen",
    sidebar_logout: "Uitloggen",
    sidebar_core: "Core",
    sidebar_tools: "Tools",
    sidebar_admin_workspace: "Admin workspace",
    sidebar_member_experience: "Member experience",
    sidebar_admin_description: "Website, sales, products and people in one creator operating system.",
    sidebar_member_description: "Je traject, community en coaching strak op één plek.",
    sidebar_open_client_view: "Open client view",
    mobile_environment: "Omgeving",
    settings_language_title: "Taal",
    settings_language_description: "Kies of je platform in het Nederlands of Engels getoond wordt.",
    settings_language_label: "Platformtaal",
    settings_language_nl: "Nederlands",
    settings_language_en: "Engels",
    settings_saved: "Je profiel is bijgewerkt.",
  },
  en: {
    sidebar_dashboard: "Dashboard",
    sidebar_my_courses: "My Courses",
    sidebar_community: "Community",
    sidebar_forms: "Forms",
    sidebar_messages: "Messages",
    sidebar_coaching: "Coaching",
    sidebar_overview: "Overview",
    sidebar_weekly_overview: "Weekly Overview",
    sidebar_nutrition: "Nutrition",
    sidebar_checkins: "Check-ins",
    sidebar_progress: "Progress",
    sidebar_progress_photos: "Progress Photos",
    sidebar_habits: "Habits",
    sidebar_cycle: "Cycle",
    sidebar_symptoms: "Symptoms",
    sidebar_products_library: "Products & Knowledge Base",
    sidebar_recipes: "Recipes",
    sidebar_member_area: "My Area",
    sidebar_settings: "Settings",
    sidebar_notifications: "Notifications",
    sidebar_logout: "Log out",
    sidebar_core: "Core",
    sidebar_tools: "Tools",
    sidebar_admin_workspace: "Admin workspace",
    sidebar_member_experience: "Member experience",
    sidebar_admin_description: "Website, sales, products and people in one creator operating system.",
    sidebar_member_description: "Your program, community and coaching in one calm workspace.",
    sidebar_open_client_view: "Open client view",
    mobile_environment: "Area",
    settings_language_title: "Language",
    settings_language_description: "Choose whether the platform is shown in Dutch or English.",
    settings_language_label: "Platform language",
    settings_language_nl: "Dutch",
    settings_language_en: "English",
    settings_saved: "Your profile has been updated.",
  },
} as const;

type LocaleKey = keyof typeof translations.nl;

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  language,
  children,
}: {
  language: AppLanguage;
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      language,
      t: (key) => translations[language][key],
    }),
    [language]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return context;
}
