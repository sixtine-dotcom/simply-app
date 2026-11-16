# Simply App testen en lanceren

Bijgewerkt: 16 november 2026. Gewenste publieke lancering: rond 16 december 2026.

## Wat is een installeerbare testapp?

Een echte iPhone-app die je vóór de openbare lancering via Apple's TestFlight installeert. De testversie staat niet openbaar in de App Store. De app gebruikt dezelfde online Simply-omgeving als de browser; wijzigingen moeten dus online worden gepubliceerd voordat je ze op je telefoon ziet.

Een website op je beginscherm is bruikbaar om nu al te testen, maar vervangt de tests van de echte iPhone-app niet.

## Herstelpunten en broncode

- Alle lokale wijzigingen van vóór deze voorbereiding zijn vastgelegd in commit `5511a8c`.
- GitHub: `sixtine-dotcom/simply-app`, branch `release/test-launch-2026-11-16`.
- Aanvullend lokaal herstelbestand: `~/Documents/Simply backups/simply-app-2026-11-16.bundle`.
- Geheimen, signing keys en persoonlijke uploads horen niet in Git. Databasegegevens en object storage zijn afzonderlijke opslag; een Git-back-up is daarvan geen back-up.
- Native iconen en splashscreens worden nu ook als bronbestanden bewaard.

## Wat Sixtine voor de iPhone moet doen

1. Werk eerst macOS bij via Systeeminstellingen → Algemeen → Software-update. De aangeboden Xcode-versie vraagt een nieuwere macOS-versie dan nu geïnstalleerd. Open daarna de App Store en installeer **Xcode** (van Apple).
2. Open Xcode één keer. Rond de eerste installatie af en accepteer zelf de Apple-voorwaarden. Installeer de gevraagde iOS-onderdelen.
3. Ga naar https://developer.apple.com/account en log in met je Apple Account.
4. Het **Apple Developer Program** en toegang tot App Store Connect zijn volgens de ontvangen Apple-mails geactiveerd. Gebruik het Apple Account dat bij dit lidmaatschap hoort.
5. Ga naar https://appstoreconnect.apple.com en controleer of je binnen kunt. Ontbrekende overeenkomsten moet de accounthouder zelf accepteren.
6. Open Xcode → Settings → Accounts en voeg hetzelfde Apple Account toe. Deel geen wachtwoorden of verificatiecodes in de chat.
7. Installeer **TestFlight** (van Apple) op je iPhone. De uitnodiging volgt pas nadat de ondertekende testbuild is geüpload en verwerkt.
8. Laat weten wanneer Xcode geïnstalleerd is en welk ontwikkelaarsteam zichtbaar is. Dan kunnen signing, de appregistratie en de upload worden afgerond.

Appnaam: **Simply App**. Bundle-ID: **be.simplyapp.app**. Deze identifier moet in jouw Apple-team geregistreerd en beschikbaar zijn.

## Technische iPhone-volgorde na accountactivatie

1. `npm run mobile:check` uitvoeren.
2. `npm run ios:sync`, daarna `npm run ios:open`.
3. In Xcode target App → Signing & Capabilities: het juiste betaalde ontwikkelaarsteam selecteren. Geen willekeurige team-ID invullen.
4. Op een echte iPhone bouwen en inloggen, camera, microfoon, navigatie en bestanden testen.
5. Appregistratie aanmaken in App Store Connect met de juiste bundle-ID.
6. Xcode → Product → Archive → Distribute App → App Store Connect.
7. In App Store Connect → TestFlight de verwerkte build kiezen, testinformatie invullen en testers toevoegen. Externe tests kunnen een beta-review vereisen.

## Android

Android Studio is op deze Mac geïnstalleerd. De eerste Setup Wizard/SDK-licenties zijn nog nodig. Open Android Studio en kies Standard Setup. Controleer onder SDK Manager dat Android API 36, Build Tools en Platform Tools zijn geïnstalleerd.

- Lokaal toestel testen: `npm run android:sync`, `npm run android:build:debug`.
- Play Store-build: eigen signing key configureren en `npm run android:build`.
- Privéconfiguratie in `android/keystore.properties` (niet in Git): `storeFile`, `storePassword`, `keyAlias`, `keyPassword`.
- Alternatief: `SIMPLY_ANDROID_KEYSTORE`, `SIMPLY_ANDROID_STORE_PASSWORD`, `SIMPLY_ANDROID_KEY_ALIAS`, `SIMPLY_ANDROID_KEY_PASSWORD` als omgevingsvariabelen.
- Verlies de upload key en wachtwoorden niet; maak daarvan een afzonderlijke versleutelde back-up.
- Eerst Play Internal Testing; controleer in het eigen Google-account of een gesloten test met 12 testers gedurende 14 dagen vereist is.

## Testvolgorde met een klantaccount

Gebruik gecontroleerde testdata. Een actie op de online omgeving kan echte gegevens wijzigen.

1. Uitloggen, opnieuw inloggen en app volledig afsluiten/heropenen.
2. Verkeerd wachtwoord, verlopen inloglink en account zonder toegang testen.
3. Intake opslaan, terugkeren en controleren dat de antwoorden behouden blijven.
4. Cursus openen, video afspelen, pauzeren, volledig scherm en terug navigeren.
5. Voedingsschema openen/downloaden en werkelijk in Bestanden bewaren.
6. Coaching openen en alle sessies aan Apple Agenda toevoegen; controleer datum, tijdzone en deelnamelink.
7. Coachingsgesprek met een tweede toestel: camera/microfoon toestaan, weigeren en weer herstellen; geen opname van echte klanten voor tests.
8. Community lezen, bericht/foto plaatsen en controleren met het andere account.
9. Berichten tussen klant en coach; klanten mogen elkaar niet privé berichten.
10. Recepten, favorieten en trackers opslaan; controleer na uitloggen opnieuw.
11. Foto kiezen/maken, pdf openen en externe links openen.
12. Wifi uit/aan, slechte verbinding, toetsenbord, grote tekst en kleine iPhone controleren.

Leg problemen vast met scherm, stappen, verwacht resultaat en eventueel een screenshot. Markeer echte telefoontests pas als uitgevoerd nadat iemand ze heeft doorlopen.

## Nog te doen vóór openbare store-inzending

- Werkende accountverwijdering vanuit de app en de benodigde publieke verwijderingsinformatie voor Google.
- Privacybeleid, Apple App Privacy en Google Data Safety afstemmen op de werkelijke verwerking, inclusief gezondheidsinformatie en leveranciers.
- Aankoop-/Shopify-links en betaalstromen toetsen aan de toepasselijke storevoorwaarden.
- Echte iPhone-/Android-testresultaten, inclusief camera/microfoon en downloads.
- Testaccount voor reviewers met gevulde, niet-persoonlijke testdata en bereikbare backend.
- Storebeschrijving, leeftijdsclassificatie, support-URL en screenshots van de echte app.
- Native kwaliteit en meerwaarde beoordelen; goedkeuring van een webcontainer is niet gegarandeerd.
- Databaseback-up/herstelprocedure en uploadopslag afzonderlijk controleren.
- Notificaties zijn nog geen bevestigde native pushfunctionaliteit; niet als werkend aan testers beloven.

## Richtplanning

- 16–22 november: online testbasis, Apple-account/Xcode, eerste iPhone-build.
- 23–29 november: klantentest op echte telefoons; belangrijkste fouten oplossen.
- 30 november–6 december: hertest, privacy/accountverwijdering, storeteksten en screenshots.
- Uiterlijk rond 7 december: indienen, zodat er marge is vóór 16 december.

Dit zijn streefdata. Accountverificatie, beta-review en store-review worden door Apple/Google bepaald.

## Officiële bronnen

- https://developer.apple.com/testflight/
- https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/
- https://developer.apple.com/app-store/review/guidelines/
- https://support.google.com/googleplay/android-developer/answer/14151465
- https://capacitorjs.com/docs/getting-started/environment-setup

## Databaseback-up van deze voorbereiding

Op 16 november 2026 is een PostgreSQL-back-up gemaakt in `~/Library/Application Support/Simply App/Backups/`. De map is alleen toegankelijk voor de Mac-gebruiker en het dumpbestand is niet aan Git of Vercel toegevoegd. De inhoudsopgave van het archief is gecontroleerd met `pg_restore --list`; een volledige hersteltest is nog niet uitgevoerd. Nieuwe back-up: `node --env-file=.env --env-file=.env.local scripts/backup-database.mjs`.

De databaseback-up bevat records en bestandsverwijzingen, niet de pdf-/foto-/videobestanden in R2/object storage. Voor die bestanden blijft een afzonderlijke opslagback-up nodig.

## Accountbeveiliging en verwijdering (16 november)

- Inloggen via persoonlijke e-maillink blijft beschikbaar. Een wachtwoord instellen kan via Instellingen; bij een oudere sessie is een nieuwe inloglink of het huidige wachtwoord nodig. Andere sessies worden ingetrokken bij wijziging.
- Aanmeldpogingen met wachtwoord hebben een gedeelde database-limiet. Wachtwoorden staan alleen als scrypt-hash opgeslagen.
- Klanten kunnen in Instellingen een verwijderverzoek doen. Dit wordt **handmatig** afgehandeld via `/admin/account-deletions`; beheerders krijgen een interne melding. Verwijder eerst persoonlijke uploads, opnames en externe accounts/koppelingen. Controleer apart eventuele administratieve bewaarplichten. Vink dit pas af wanneer dat werkelijk gebeurd is.
- Na definitieve verwerking verwijdert de app het klantaccount en gekoppelde gegevens, sessies en privégesprekken. Gedeelde teaminhoud blokkeert automatische afhandeling. De bevestigingsmail wordt pas na verwerking verzonden; een mislukte mail moet handmatig worden opgevolgd.
- Publieke instructies: `https://simplyapp.be/account-deletion`; support: `https://simplyapp.be/support`.
- Deze workflow is geen automatische verwijdering uit alle externe systemen of oudere back-ups. Het beheer daarvan blijft een echte handeling.
