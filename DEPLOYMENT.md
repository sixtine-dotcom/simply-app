# Simply app – deployen naar productie

De eenvoudigste manier om de app live te zetten is met **Vercel**. Dat werkt goed met Next.js en heeft een gratis tier.

## Stap 1: Code op GitHub zetten

1. Maak een nieuw repository op [github.com](https://github.com)
2. In de terminal, in de map van je project:

```bash
cd "/Users/sixtineophoff/Documents/Simply app"
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/JOUW-GEBRUIKERSNAAM/JOUW-REPO-NAAM.git
git push -u origin main
```

> `.env.local` staat in `.gitignore` en wordt niet mee gepusht – dat is goed. Je vult de variabelen later in op Vercel.

## Stap 2: Project importeren in Vercel

1. Ga naar [vercel.com](https://vercel.com) en log in (bijv. met GitHub)
2. Klik op **Add New** → **Project**
3. Kies je Simply-repository
4. Klik **Import**

## Stap 3: Environment variables instellen

Onder **Environment Variables** vul je minstens deze in (dezelfde als in `.env.local`):

| Naam | Waarde | Opmerking |
|------|--------|-----------|
| `DATABASE_URL` | `postgresql://...` | Van je Neon-database |
| `AUTH_SECRET` | Lange random string | Bijv. `openssl rand -base64 32` |
| `RESEND_API_KEY` | `re_...` | Van resend.com |
| `APP_URL` | `https://jouw-app.vercel.app` | Of je eigen domein na deploy |

Na de eerste deploy kun je `APP_URL` aanpassen naar de echte URL die Vercel toewijst (bijv. `https://simply-in-balance.vercel.app`).

**Optioneel** (als je ze gebruikt):

- `EMAIL_FROM` – standaard: `Simply <noreply@simplyinbalance.com>`
- `SHOPIFY_*` – voor webhooks en producten
- Overige variabelen uit `.env.local` indien nodig

## Stap 4: Deployen

1. Klik **Deploy**
2. Wacht tot de build klaar is (ongeveer 1–2 minuten)
3. Je krijgt een URL zoals `https://simply-platform-xxx.vercel.app`

## Stap 5: APP_URL bijwerken

1. Ga in Vercel naar je project → **Settings** → **Environment Variables**
2. Pas `APP_URL` aan naar je echte Vercel-URL (of eigen domein)
3. Redeploy: **Deployments** → drie puntjes bij de laatste deploy → **Redeploy**

## Eigen domein (optioneel)

1. **Settings** → **Domains**
2. Voeg je domein toe (bijv. `app.simplyinbalance.com`)
3. Pas DNS aan zoals Vercel aangeeft
4. Update `APP_URL` naar dat domein

---

**Resend en afzenderdomein:** Voor productie moet je in Resend je domein verifiëren, zodat e-mails niet als spam worden gezien. Dat doe je in het Resend-dashboard onder **Domains**.
