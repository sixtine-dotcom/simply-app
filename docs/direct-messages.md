# Privéberichten

Deelnemers (`CLIENT` en `STUDENT`) communiceren onderling via de community. Een privégesprek heeft precies twee actieve gebruikers van dezelfde organisatie, waarvan minstens één tot het beheer-/begeleidingsteam behoort (`SUPERADMIN`, `ADMIN`, `STAFF`, `COACH`, `SUPPORT`). Teamleden kunnen deelnemers individueel benaderen; deelnemers kunnen reageren en het team of hun coach benaderen.

`src/lib/message-policy.ts` bevat de gedeelde regel. `src/lib/messages.ts` past die toe op aanmaken, contacten zoeken, gesprekkenlijsten, rechtstreeks openen, geschiedenis ophalen en berichten versturen. Ook bestaande deelnemersgesprekken verdwijnen uit de lijst en worden ontoegankelijk via pagina en API. De opgeslagen geschiedenis wordt niet verwijderd. De community gebruikt afzonderlijke routes en blijft beschikbaar.

De ontvangerslijst gebruikt dezelfde rol- en organisatiegrenzen. Een rolwijziging of soft delete wordt bij een volgende aanvraag opnieuw gecontroleerd. Een beheerder krijgt geen toegang tot een gesprek waarvan die geen deelnemer is.

Verificatie:

```sh
npx tsx --test scripts/tests/message-policy.ts
npx tsx scripts/tests/messages-integration.ts
```

De integratiecheck vereist een lokale Simply-server (standaard poort 3000; overschrijven met `MESSAGES_TEST_BASE_URL`). De check maakt herkenbare testaccounts en gesprekken aan en verwijdert ze na afloop. Er worden geen berichten aan echte gebruikers gestuurd.
