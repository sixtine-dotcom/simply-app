# Simply App — mobiele controle

## Wat al klaarstaat

- Capacitor 8.6.2 voor iOS en Android (bijgewerkt op 16 november 2026).
- App-ID: `be.simplyapp.app`.
- Appnaam: `Simply App`.
- Productiewebsite in de native app: `https://simplyapp.be`.
- iOS- en Android-projecten, app-iconen en splashscreens aanwezig.
- Android target API 36, geschikt voor nieuwe Play Store-inzendingen vanaf 31 augustus 2026.
- PWA-installatie met icoon, volledig scherm en iPhone-instructie.

## Wat vandaag getest kan worden

1. Open op de telefoon `https://simplyapp.be/app`.
2. iPhone: Safari → Deel → Zet op beginscherm.
3. Android: Chrome → App installeren/toevoegen aan startscherm.
4. Test login, cursusvideo, community, formulieren, uploads, downloads en externe links.

## Lokale blockers voor een echte native build

- Volledige Xcode ontbreekt; alleen Command Line Tools zijn actief.
- Java/JDK wordt met Android Studio meegeleverd.
- Android Studio is geïnstalleerd; Android SDK en eerste Setup Wizard/licentieacceptatie ontbreken nog.
- Er zijn nog geen Apple signing team/provisioning-profielen ingesteld.
- Er is nog geen Android release-keystore/Play App Signing-configuratie.

## Vragen voor de developer

1. Installeren we Xcode en Android Studio op deze Mac en welke JDK-versie gebruiken we voor Capacitor 8?
2. Is `be.simplyapp.app` definitief en is die identifier vrij in Apple Developer en Google Play Console?
3. Houden we de app als live webcontainer of bundelen we een deel lokaal voor betere offlinewerking?
4. Welke native meerwaarde voegen we vóór Apple-review toe: pushmeldingen, camera/uploads, offline lessen, downloads of biometrisch inloggen?
5. Werken magic links, Gmail/Google OAuth, Instagram/Facebook OAuth en externe betaalpagina's correct vanuit de iOS/Android WebView?
6. Hoe configureren we Universal Links en Android App Links voor `simplyapp.be`?
7. Welke betaalstromen vallen onder Apple/Google in-app purchase en welke zijn uitsluitend toegang tot eerder gekochte coaching/cursussen?
8. Is een functie voor accountverwijdering in de app nodig en zijn privacybeleid, voorwaarden en support-URL definitief?
9. Welke persoonsgegevens moeten in Apple App Privacy en Google Play Data Safety worden aangegeven?
10. Wie beheert Apple Developer, App Store Connect, Google Play Console, certificaten, signing keys en hersteltoegang?
11. Welke testaccounts en volledig gevulde testdata geven we aan Apple/Google Review?
12. Hoe regelen we versienummers, TestFlight, Play Internal Testing en automatische builds?

## Voor indiening nog nodig

- Apple Developer-lidmaatschap en Google Play Developer-account.
- Storeteksten, categorie, leeftijdsclassificatie, privacy-antwoorden en screenshots.
- iPhone- en Android-tests op echte toestellen.
- TestFlight-build en Play Internal Testing-build.
- Review van lege pagina's, foutmeldingen, testinhoud en niet-werkende links.

## Actuele testrelease

Zie `testen-en-lanceren.md` voor de stappen voor Sixtine en `RELEASE-2026-11-16.md` voor de uitgevoerde technische voorbereiding. Camera-/microfoontoestemmingen en een offline foutscherm zijn toegevoegd; echte toesteltests blijven nodig.
