import { readFile } from "node:fs/promises";
import path from "node:path";
import { openDesignRequest, type OpenDesignConnection } from "./open-design";

const BRIEFING_DIR = path.join(process.cwd(), "src/lib/carousel-render/briefing");

export const OPEN_DESIGN_CAROUSEL_PROMPT = "Ontwerp deze Instagram-carousel voor Simply in Balance. Lees STIJLBRIEFING.md, FOTOS.md, slides.json en referenties/canva-sjablonen.md. Gebruik Sixtine vrijstaand met werkelijk verwijderde achtergrond in een ontworpen compositie; geen volledige donkere foto als standaardachtergrond. Werk de technische startbestanden zichtbaar uit tot verzorgde redactionele slides. Behoud alle goedgekeurde teksten en bestandsnamen. Controleer het gerenderde resultaat en publiceer niets.";

export function loadOpenDesignStyleBrief() {
  return readFile(path.join(BRIEFING_DIR, "STIJLBRIEFING.md"), "utf8");
}

export async function loadOpenDesignBriefingFiles() {
  const files = [
    "STIJLBRIEFING.md",
    "referenties/canva-briefing.md",
    "referenties/canva-workflow.md",
    "referenties/canva-sjablonen.md",
    "referenties/canva-reflux.jpg",
    "referenties/canva-buikvet-menopauze.jpg",
  ];
  return Promise.all(files.map(async (name) => {
    const bytes = await readFile(path.join(BRIEFING_DIR, name));
    const encoding = name.endsWith(".jpg") ? "base64" as const : "utf8" as const;
    return { name, encoding, content: bytes.toString(encoding) };
  }));
}

/** The same versioned brief and Canva references accompany every new project. */
export async function writeOpenDesignBriefing(connection: OpenDesignConnection, projectId: string) {
  const files = await loadOpenDesignBriefingFiles();
  for (const file of files) {
    await openDesignRequest(connection, `/api/projects/${encodeURIComponent(projectId)}/files`, file);
  }
}
