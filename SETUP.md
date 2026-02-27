# Simply Platform - Setup Instructies

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
