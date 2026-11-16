# App Store-voorbereiding — concept, 16 november 2026

Dit document is voorbereidend. Er is nog geen native build geüpload of door Apple goedgekeurd. Controleer inhoud en privacyantwoorden tegen de uiteindelijke release; digitale cursussen en groepscoaching vragen een beoordeling van de toepasselijke betaalregels.

## Metadata

Naam: Simply App

Ondertitel: Jouw begeleiding bij de hand

Support: https://simplyapp.be/support
Privacybeleid: https://simplyapp.be/privacy
Accountverwijdering: https://simplyapp.be/account-deletion
Bundle-ID: be.simplyapp.app

Conceptbeschrijving:

Simply App brengt je persoonlijke begeleiding samen op één plek. Volg de lessen waartoe je toegang hebt, bekijk je voedingsschema en houd je coaching bij.

- Volg cursuslessen en bekijk je voortgang.
- Bekijk geplande coachingsessies en voeg ze toe aan je agenda.
- Houd contact met je coach en vul de beschikbare formulieren en trackers in.
- Open de documenten die bij jouw begeleiding horen.

Je hebt een persoonlijk account met toegang nodig. De beschikbare onderdelen hangen af van jouw begeleiding. Simply App vervangt geen medische diagnose of behandeling.

Trefwoorden (concept): coaching,voeding,welzijn,begeleiding,cursus,leefstijl

## TestFlight — wat testen

Inloggen via e-mail en wachtwoord; opnieuw openen na afsluiten; lesvideo en voortgang; pdf opslaan; alle coachingsessies in Apple Agenda; camera/microfoon en geweigerde toestemmingen; bericht en upload; trackers na opnieuw inloggen; instellingen en verwijderverzoek; slechte verbinding en offline foutscherm. Test op een echte iPhone en rapporteer scherm, stappen, verwacht en werkelijk resultaat.

## Reviewinformatie — nog invullen

- Een speciaal reviewaccount met sterke wachtwoordlogin, zonder echte klantgegevens en zonder betaalstap. Controleer alle zichtbare community- en berichtenschermen op gegevens van echte mensen voordat dit account aan Apple wordt gegeven.
- Alleen een privécursus afschermen is niet genoeg als elders gedeelde klantinhoud zichtbaar is. Een reviewaccount wordt pas als veilig bruikbaar aangemerkt na controle van alle routes.
- Contactpersoon en telefoonnummer door de eigenaar controleren.
- Leg de concrete begeleiding en beschikbare functies feitelijk uit. Claim geen vrijstelling van in-app purchases zonder beoordeling van het daadwerkelijke aanbod.
- In de app: geen verkoopverwijzing op het inlogscherm. Wachtwoordlogin voorkomt afhankelijkheid van toegang tot een review-mailbox.
- Accountverwijdering: Instellingen → Account verwijderen, met handmatige afhandeling door de beheerder.

## Privacy-inventaris — nog geen definitieve App Privacy-antwoorden

Controleer minimaal: naam/e-mail/account-ID, gebruikersinhoud en privéberichten, intake/gezondheids- en fitnessgegevens, foto's/bestanden, cursusvoortgang, agenda, camera/microfoon, sessiemetadata en gekoppelde diensten. Beoordeel per gegeven of het wordt verzameld, gekoppeld aan een persoon, met dienstverleners gedeeld, bewaard en voor tracking gebruikt. De aanwezigheid van een SDK is op zichzelf geen volledig privacyantwoord.

Controleer de werkelijk ingeschakelde leveranciers: hosting (Vercel), database (Neon), opslag (R2), e-mail (Resend), videogesprekken (Daily), eventuele Drive-/Google-koppelingen, AI (OpenAI) en optionele fitnesskoppelingen. Onderzoek aparte registratie-, tracking- of marketingcode in de definitieve build. Geef geen ‘geen gegevens verzameld’-antwoord voor deze app.

## Resterende stappen

macOS-update → Xcode → Apple-team/signing → echte iPhone-test → archive/upload → TestFlight → screenshots en definitieve privacy-/leeftijds-/betalingsantwoorden → App Review. Een werkende website of Capacitor-container bewijst nog niet dat Apple de app accepteert.
