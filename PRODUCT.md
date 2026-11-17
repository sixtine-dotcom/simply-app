# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

De primaire gebruikers zijn klanten van Simply in Balance die deelnemen aan een traject. Zij gebruiken het platform om hun intake af te ronden, lessen en voedingsmateriaal te volgen, coaching te ontvangen en deel te nemen aan hun community.

Sixtine en toekomstige medewerkers gebruiken de afzonderlijke beheeromgeving om klanten, trajecten, content, communicatie, events en toegang te beheren. Beheerders en klanten hebben duidelijk gescheiden rollen en navigatie.

## Product Purpose

Simply App brengt de volledige klantreis van Simply in Balance samen: van aankoop en activatie tot intake, trajecttoegang, lesmateriaal, community, coaching en opvolging. Succes betekent dat een klant zonder technische uitleg begrijpt wat zij nu moet doen, terwijl Sixtine de volledige werking in één overzichtelijke beheeromgeving kan aansturen.

## Positioning

Het platform vertaalt Sixtines eigen Simply Lifestyle-methodiek en persoonlijke begeleiding naar één doorlopende digitale ervaring. Het is geen generieke cursusomgeving: toegang, intake, voedingsschema's, trajectdata, coaching en communities volgen de concrete Simply Challenge-workflow.

## Operating Context

- Klanten kopen producten via Shopify en worden daarna aan het juiste traject en de juiste groep toegewezen.
- Trajecten hebben vaste start- en einddata; lesmateriaal en communities worden pas zichtbaar wanneer de voorwaarden zijn vervuld.
- Een verplichte intake gaat vooraf aan toegang tot het traject en het voedingsschema.
- Beheerders werken hoofdzakelijk op desktop; klanten gebruiken zowel desktop als mobiel.
- De applicatie wordt als webplatform gebouwd en kan via Capacitor in mobiele stores worden verpakt.
- De primaire taal van de interface is Nederlands.
- Communityleden worden stil toegevoegd: geen openbare toetredingsberichten, meldingen of nieuweledentellers. Klanten kunnen andere deelnemers niet opzoeken of taggen, ook niet na eerdere activiteit. Namen blijven zichtbaar bij de eigen berichten en reacties in de community. De volledige ledenadministratie blijft in het beheer.

## Capabilities and Constraints

- Gescheiden klant- en beheerdersomgevingen met rollen voor klanten, admins en toekomstige medewerkers.
- Cursussen, modules, lessen, communities, coaching, intakeformulieren, recepten, trackers, berichten en meldingen.
- Shopify is de betaal- en aankoopbron; Stripe-checkout maakt geen deel uit van de applicatie.
- Automatische toewijzing aan trajecten en communities op basis van aankopen en tags blijft een kernworkflow.
- Beheerfuncties omvatten klanten, producten, trajecten en omzet, e-mailcampagnes, events en contentplanning.
- SIX beantwoordt alleen vragen op basis van Sixtines goedgekeurde kennis en escaleert onbeantwoorde, persoonlijke of medische vragen.
- Nieuwe designverbeteringen gebeuren steeds per afzonderlijke pagina, gevolgd door evaluatie voordat een volgende pagina wordt aangepast.
- Een eventuele toekomstige positionering als verkoopbaar platform voor andere coaches is nog niet beslist en mag de huidige Simply in Balance-ervaring niet vertroebelen.

## Brand Commitments

- Productnaam: Simply App; merk en zichtbare afzender: Simply in Balance.
- De toon is persoonlijk, warm, deskundig, duidelijk en niet technisch.
- Bestaande merkassets omvatten het bladlogo, plantenfotografie en de e-mailassets in `public/`.
- Montserrat en The Seasons zijn bevestigde merklettertypes waar technisch en licentiematig beschikbaar.
- De interface moet aanvoelen als een high-end technologieproduct, zonder overbodige grote blokken, decoratieve statistieken of uitleg die de hoofdtaak vertraagt.

## Evidence on Hand

- Werkende Next.js-applicatie met bestaande klant- en beheerroutes in `src/app/`.
- Merkassets in `public/`, waaronder `logo.svg`, `simply-leaf-logo.jpg` en de plantenbanner.
- Bestaande cursus-, community-, klanten- en trajectgegevens in de applicatiedatabase.
- Door de gebruiker aangeleverde screenshots van gewenste community- en beheerpatronen dienen als functionele referentie; ze zijn geen toestemming om andere merken letterlijk te kopiëren.
- Toekomstige claims, resultaten en testimonials mogen niet worden verzonnen.

## Product Principles

1. De volgende actie van de gebruiker is altijd onmiddellijk duidelijk.
2. Toon alleen informatie die nodig is om de taak op die pagina uit te voeren.
3. Klanttoegang volgt automatisch de aankoop, intake en trajectplanning.
4. De klantenervaring blijft eenvoudig, terwijl complex beheer in de backoffice wordt opgevangen.
5. Verbeter het platform gecontroleerd per pagina en behoud werkende functionaliteit tijdens ieder ontwerptraject.

## Accessibility & Inclusion

De interface moet zonder technische voorkennis bruikbaar zijn, duidelijke Nederlandse labels gebruiken en op desktop en mobiel leesbaar en bedienbaar blijven.
