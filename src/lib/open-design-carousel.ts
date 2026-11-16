import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CarouselSlide } from "./carousel-shared";
import { openDesignRequest, type OpenDesignConnection } from "./open-design";
import { writeOpenDesignBriefing } from "./open-design-briefing";

export type OpenDesignCarouselInput = { title: string; slides: CarouselSlide[]; photoUrl: string | null };

export function openDesignTextHash(input: OpenDesignCarouselInput) {
  return createHash("sha256").update(JSON.stringify({ title: input.title, slides: input.slides, photoUrl: input.photoUrl })).digest("hex");
}

export function openDesignSlideName(index: number) {
  return `slide-${String(index + 1).padStart(2, "0")}.html`;
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function richText(text: string) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
}

/** Editable HTML, one file per slide: stable names make round-trip export unambiguous. */
export function openDesignSlideHtml(input: OpenDesignCarouselInput, index: number, fontCss: string) {
  const slide = input.slides[index];
  const photo = slide.photo || input.photoUrl;
  const title = slide.title ?? "";
  const text = slide.text ?? "";
  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=1080, initial-scale=1"><title>${escapeHtml(input.title)} · ${index + 1}</title>
<style>${fontCss}
*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1350px;overflow:hidden}body{font-family:Montserrat,sans-serif;color:${photo ? "#fff" : "#3A322C"};background:#E6E1D9}
.photo,.shade{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.shade{background:rgba(20,24,18,.55)}
main{position:relative;z-index:1;display:flex;flex-direction:column;justify-content:center;height:100%;padding:100px 90px 150px}
h1{font-family:Playfair,serif;font-weight:400;font-size:${title.length > 90 ? 72 : 90}px;line-height:1.12;margin:0 0 48px;overflow-wrap:anywhere}
p{font-size:${text.length > 650 ? 36 : text.length > 350 ? 42 : 48}px;line-height:1.5;margin:0;overflow-wrap:anywhere}
.kicker{font-size:28px;margin-bottom:28px}footer{position:absolute;z-index:1;bottom:64px;left:90px;right:90px;display:flex;justify-content:space-between;border-top:1px solid currentColor;padding-top:24px;font-size:22px}
</style></head><body>${photo ? `<img class="photo" src="${escapeHtml(photo)}" alt=""><div class="shade"></div>` : ""}
<main>${slide.kicker ? `<p class="kicker">${richText(slide.kicker)}</p>` : ""}${title ? `<h1>${richText(title)}</h1>` : ""}${text ? `<p>${richText(text)}</p>` : ""}</main>
<footer><span>Simply in Balance</span><span>${index + 1} / ${input.slides.length}</span></footer></body></html>`;
}

export async function seedOpenDesignCarousel(connection: OpenDesignConnection, projectId: string, input: OpenDesignCarouselInput) {
  const fonts = await Promise.all([
    ["Montserrat", "montserrat-latin-400-normal.woff", 400],
    ["Montserrat", "montserrat-latin-700-normal.woff", 700],
    ["Playfair", "playfair-display-latin-400-normal.woff", 400],
  ].map(async ([name, file, weight]) => {
    const bytes = await readFile(path.join(process.cwd(), "src/lib/carousel-render/fonts", String(file)));
    return `@font-face{font-family:${name};font-weight:${weight};src:url(data:font/woff;base64,${bytes.toString("base64")}) format('woff');font-display:block}`;
  }));
  const base = `/api/projects/${encodeURIComponent(projectId)}/files`;
  const write = (name: string, content: string) => openDesignRequest(connection, base, { name, content, encoding: "utf8" });
  await writeOpenDesignBriefing(connection, projectId);
  await write("slides.json", JSON.stringify(input, null, 2));
  await write("FOTOS.md", `# Eigen foto's van Sixtine\n\nSixtine is het gezicht van Simply in Balance. Gebruik uitsluitend de geselecteerde foto's uit slides.json. photoUrl is de standaardfoto; slides[i].photo vervangt die per slide. De overige foto's uit haar collectie worden niet automatisch meegestuurd.\n\nGebruik een echte transparante PNG: verwijder eerst de achtergrond als die nog aanwezig is. Plaats Sixtine vrijstaand in een ontworpen compositie, vooral op cover en CTA. Een foto over de volledige slide of een donkere laag is geen achtergrondverwijdering. Ontbreekt de benodigde bewerking, meld dat en presenteer geen onbewerkte foto als afgewerkt ontwerp.\n\nBehoud haar gezicht, lichaam, kleding en uiterlijk. Geen vervangende portretten of stockfoto's. Houd gezicht en handen vrij van tekst. Bewaar het origineel; een vrijstaande versie is een afzonderlijk bestand. Neem geen personen of foto's uit Canva-voorbeelden over.\n`);
  await write("LEESMIJ.md", `# ${input.title}\n\nDeze carousel komt uit Simply in Balance. De teksten in slides.json zijn goedgekeurd.\n\nLees eerst STIJLBRIEFING.md en bekijk de bestaande Canva-voorbeelden in referenties/. Houd die vaste huisstijl aan; kies geen andere typografie, kleuren of ontwerpstijl per project. De volledige oorspronkelijke Canva-briefing staat in referenties/canva-briefing.md.\n\nWerk het ontwerp af in de bestanden slide-01.html tot en met ${openDesignSlideName(input.slides.length - 1)}. Behoud de bestandsnamen en het formaat 1080 × 1350 pixels. Elk HTML-bestand is één slide. Behoud alle goedgekeurde teksten, hun volgorde en eventuele foto’s. Het startbestand is een bewerkbare placeholder; de vaste Canva-huisstijl uit STIJLBRIEFING.md is leidend voor het afgewerkte ontwerp.\n\nOpen een slide in het voorbeeldvenster en vraag Open Design om het ontwerp volgens deze briefing af te werken. Ga daarna terug naar Simply en klik op ‘Haal slides op’. Er wordt niets automatisch gepubliceerd.\n`);
  // Sequential writes avoid competing artifact/version writes inside the desktop daemon.
  const starters: { fileName: string; sha256: string }[] = [];
  for (let i = 0; i < input.slides.length; i++) {
    const content = openDesignSlideHtml(input, i, fonts.join("\n"));
    const fileName = openDesignSlideName(i);
    await write(fileName, content);
    starters.push({ fileName, sha256: createHash("sha256").update(content).digest("hex") });
  }
  await write("startbestanden.json", JSON.stringify({ slides: starters }, null, 2));
}
