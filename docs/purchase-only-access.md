# Toegang na aankoop

Gecontroleerd op 16 november 2026.

## Beleid

- Geen openbare registratie, ook niet via een directe POST naar `/api/auth/register` of als `tenant_admin`.
- `/register` verwijst naar inloggen met uitleg dat toegang volgt na aankoop.
- Een externe Clerk-identiteit maakt geen lokale app-gebruiker aan. Een bestaand account vereist een geverifieerd e-mailadres en toegekende toegang.
- Een Shopify-klant/contact of nieuwsbriefinschrijving maakt geen app-account aan.
- Alleen een ondertekend Shopify `orders/paid`-bericht met `financial_status=paid` en minstens één aan een cursus gekoppeld product geeft automatisch toegang.
- Nieuwe klanten krijgen een eenmalige activatielink; die werkt alleen voor het al door de server aangemaakte account. Bestaande actieve klanten krijgen een inloglink voor hun cursustoegang.
- Oude openbare registratietokens worden geweigerd. Activatietokens kunnen niet als magic-linktoken worden gebruikt.
- Een activatietoken kan één keer worden gebruikt en controleert of de gekochte cursus nog is toegewezen.
- Een mislukt mailverzoek resulteert in een webhookfout zodat Shopify opnieuw kan proberen. Geslaagde verzendingen worden per order vastgelegd om opeenvolgende webhookherhalingen te dedupliceren. Dit is geen garantie op precies één verzending bij gelijktijdige webhooks of een fout ná mailbezorging.
- Klanten hebben een cursustoewijzing of een expliciete beheerdersuitnodiging nodig, ook bij een bestaande sessie of een aangevraagde inloglink. Beheerders kunnen dus testaccounts, teamleden en handmatig verleende toegang blijven beheren.

## Nog nodig voor echte automatische aankooptoegang

Bij controle waren er **nul Shopify-productkoppelingen**. Er bestaat momenteel alleen de cursus ‘Simply Challenge 15de editie’. Er wordt geen willekeurig product aan die bestaande cursus gekoppeld.

De eigenaar moet aangeven welk websiteproduct bij welke app-cursus hoort. Stel de product-ID/cursuskoppeling daarna in via het cursusbeheer. Controleer in Shopify ook dat betaalde orders naar `/api/webhooks/shopify` worden gestuurd met het juiste webhookgeheim. De servercode alleen bewijst niet dat Shopify dit event al verstuurt.

Een echte aankoop-/mailtest met een afgesproken testorder blijft nodig. De automatische regressietest gebruikt een geheugen-database en onderschept alle mailverzoeken; er worden geen echte klantaccounts of mails aangemaakt.

## Verificatie

`npx tsx scripts/tests/purchase-access.ts`

Controleert ongeldige webhookhandtekeningen, onbetaalde orders, niet-gekoppelde producten, contact-only accounts, aankoopactivatie, herhaalde webhooks na activatie, mailherstel, oude registratie-links, token-doelbinding, eenmalig gebruik en expliciete beheerdersuitnodigingen.
