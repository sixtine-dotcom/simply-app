# Simply Platform - Setup Instructies

Status note: practical local setup guide.

For product scope and current implementation status, use:
- `docs/FEATURE-INVENTORY.md`
- `docs/DESKTOP-IMPLEMENTATION-STATUS.md`
- `docs/README.md`

---

## Waar vind ik de app en inlog-URL?

| Situatie | URL van de app | Inloggen (admin) |
|----------|----------------|-------------------|
| **Lokaal (op je computer)** | `http://localhost:3000` | **http://localhost:3000/admin/login** |
| **Live (gehost)** | Staat in **`.env.local`** bij `APP_URL` | **`[jouw-APP_URL]/admin/login`** |

- **Admin inlog (makkelijk te onthouden):** ga altijd naar **`/admin/login`**.  
  - Lokaal: **http://localhost:3000/admin/login**  
  - Live: **`[jouw app-URL]/admin/login`** (bijv. `https://app.simplyinbalance.com/admin/login`)  
  Je komt dan op de inlogpagina; na inloggen ga je direct naar het admin-panel.
- **Gewone inlog:** **`/login`** (zelfde pagina, zonder directe doorverwijzing naar admin).
- **Lokaal starten:** in de map *Simply app* run `npm run dev`, daarna in de browser **http://localhost:3000/admin/login** openen.
- **Package manager:** deze repo werkt met `npm` of `pnpm`. In dit bestand gebruiken we `npm` voor eenvoud.
- **Live URL vinden:** in **`.env.local`** bij **`APP_URL`**, of in het dashboard van je hosting (Vercel/Netlify) bij je project de live URL opzoeken.

---

## Stap 1: Installeer Node.js

Je hebt **Node.js** nodig om de app te draaien.

### Mac (aanbevolen: via Homebrew)
```bash
brew install node
```

### Of download direct:
Ga naar: **https://nodejs.org/**
Download de **LTS versie** (Long Term Support)
Installeer het bestand

### Controleer of het werkt:
```bash
node --version
npm --version
```

Je zou iets moeten zien zoals: `v20.x.x` en `10.x.x`

---

## Stap 2: Installeer Dependencies

Open een terminal en ga naar je projectmap:

```bash
cd "/Users/sixtineophoff/Documents/Simply app"
npm install
```

Dit kan een paar minuten duren.

---

## Stap 3: Start de Database

Kies **één** van deze twee opties.

### Optie A: Database zonder Docker (gratis cloud – aanbevolen als je geen Docker hebt)

1. Ga naar **https://neon.tech** en maak een gratis account.
2. Klik op **Create a project**, geef het een naam (bijv. "Simply") en kies een regio (bijv. EU).
3. Na het aanmaken zie je een **Connection string**. Kies **"Connection string"** (niet "Pooled" tenzij je weet wat je doet) en kopieer de URL. Die ziet er zo uit:
   ```
   postgresql://gebruiker:wachtwoord@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
4. Open in dit project het bestand **`.env.local`**.
5. Vervang de regel `DATABASE_URL=...` door je gekopieerde URL, bijvoorbeeld:
   ```
   DATABASE_URL="postgresql://gebruiker:wachtwoord@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
   ```
   (Zet de URL tussen aanhalingstekens als er speciale tekens in het wachtwoord staan.)
6. Sla het bestand op. Je hoeft **geen** Docker te starten; de database draait in de cloud.

Daarna: ga door naar **Stap 4**.

### Optie B: Database met Docker (lokaal)

1. Installeer **Docker Desktop** als je dat nog niet hebt: **https://www.docker.com/products/docker-desktop**
2. Start Docker Desktop.
3. In de projectmap:
   ```bash
   docker compose up -d
   ```
   of:
   ```bash
   npm run db:start
   ```

---

## Stap 4: Setup Database

```bash
npm run db:push
npm run db:seed
```

---

## Stap 5: Start de App

```bash
npm run dev
```

Je zou moeten zien:
```
✓ Ready in 2.3s
○ Local: http://localhost:3000
```

---

## Stap 6: Open in Browser

Ga naar: **http://localhost:3000**

---

## Optioneel: Cloudflare R2 Storage

Uploads werken lokaal zonder R2 via `public/uploads`. Voor productie (en persistente uploads) activeer Cloudflare R2.

### 1. Cloudflare account + bucket

1. Ga naar [Cloudflare Dashboard → R2](https://dash.cloudflare.com/?to=/:account/r2/overview).
2. Log in met Wrangler (eenmalig):

```bash
npm run r2:login
```

3. Maak de bucket (EU-regio, past bij Simply):

```bash
npm run r2:create-bucket
```

Als de bucket al bestaat, sla deze stap over.

### 2. API token (S3 credentials)

1. In R2 → **Manage R2 API Tokens** → **Create API token**.
2. Permissions: **Object Read & Write** op bucket `simply-uploads` (of Admin als je meerdere buckets beheert).
3. Noteer **Access Key ID** en **Secret Access Key**.
4. Je **Account ID** staat in de R2-overzichtspagina (nodig voor de endpoint-URL).

### 3. Publieke URL (voor afbeeldingen/video in de app)

Uploads worden via `R2_PUBLIC_URL` getoond. Kies één optie:

- **R2 public bucket URL**: bucket → Settings → **Public access** → Enable → kopieer de public URL (zonder trailing slash).
- **Custom domain** (bijv. `cdn.simplyinbalance.com`): bucket → Settings → **Custom Domains** → voeg domein toe en gebruik die URL als `R2_PUBLIC_URL`.

### 4. `.env.local` vullen

```env
R2_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET="simply-uploads"
R2_PUBLIC_URL="https://jouw-public-r2-url-of-cdn-domein"
```

### 5. Testen

```bash
npm run r2:verify
```

Zodra alle R2-velden gevuld zijn, gebruikt `/api/upload` automatisch R2 (zichtbaar als `storage: "r2"` in de API-response). Start de dev-server opnieuw na het aanpassen van `.env.local`.

Op Vercel: voeg dezelfde `R2_*` variabelen toe onder Project → Settings → Environment Variables.

---

## Demo Accounts

Na het seeden kun je inloggen met:

- **Admin**: `admin@simplyinbalance.com`
- **Coach**: `coach@simplyinbalance.com`
- **Klant**: `demo@example.com`

Gebruik de magic link login (check de terminal voor de link in development).

---

## Problemen?

- **"command not found: npm"** → Installeer Node.js (Stap 1)
- **"Can't reach database server at localhost:5432"** of **"Cannot connect to database"**  
  → Je database draait niet. Kies één van deze:
  1. **Zonder Docker:** gebruik **Optie A** hierboven (gratis database op Neon.tech) en zet die URL in `.env.local` als `DATABASE_URL`.
  2. **Met Docker:** start Docker Desktop en run `docker compose up -d` of `npm run db:start`.
- **Port 3000 already in use** → Stop andere apps of verander de poort in `package.json`
