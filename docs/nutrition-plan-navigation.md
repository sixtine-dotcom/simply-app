# Voedingsschema direct bereikbaar — 16 november 2026

- Eigen route `/nutrition-plan`, buiten Recepten. De zijbalk toont **Mijn voedingsschema** direct onder Mijn cursussen.
- De mobiele klantnavigatie toont **Mijn plan** met de volledige toegankelijke naam Mijn voedingsschema. Dit vervangt de minder frequente installatieactie in de zes bestaande tabposities; App installeren blijft in de desktopzijbalk en op `/app` beschikbaar.
- De receptenpagina verwijst niet meer naar het persoonlijke voedingsschema. De oude route `/recipes/nutrition-plan` verwijst door, en het dashboard gebruikt de nieuwe route.
- De actieve markering volgt nu ook navigatie zonder pagina-herlaadactie.
- Bestaande downloadrechten en beschikbaarheidsdatum blijven van toepassing. Download ondersteunt Unicode-bestandsnamen en geeft een herstelbare foutmelding bij een onbereikbaar bestand.

Gecontroleerd met tijdelijke testaccounts en een synthetische PDF: desktop/mobiele navigatie en actieve markering, echte bestandsdownload met Unicode-naam, oude link, scherm zonder beschikbaar schema en weigering voor anonieme bezoekers, een ander account en nog niet vrijgegeven schema's. TypeScript, gerichte ESLint en productiebuild gecontroleerd. Echte Capacitor/iPhone-bestandsoverdracht valt nog onder de native toesteltests.
