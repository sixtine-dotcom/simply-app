import assert from "node:assert/strict";
import { test } from "node:test";
import { openDesignSlideHtml, openDesignSlideName, openDesignTextHash, type OpenDesignCarouselInput } from "../../src/lib/open-design-carousel";
import { connectOpenDesign, openDesignRunForProject } from "../../src/lib/open-design";
import { loadOpenDesignBriefingFiles, loadOpenDesignStyleBrief, writeOpenDesignBriefing } from "../../src/lib/open-design-briefing";

const input: OpenDesignCarouselInput = {
  title: "Goedgekeurd & bewaard",
  photoUrl: null,
  slides: [
    { type: "hook", title: 'Een <script>alert("x")</script> & titel', text: "Ook de kleine hooktekst blijft behouden." },
    { type: "cta", kicker: "Tot slot", title: "Jouw vraag", text: 'Comment **basis**\nEn lees verder.', keyword: "basis" },
  ],
};

test("starter preserves hook body and all slide fields without executable user markup", () => {
  const hook = openDesignSlideHtml(input, 0, "");
  assert.ok(hook.includes("Ook de kleine hooktekst blijft behouden."));
  assert.ok(hook.includes("&lt;script&gt;"));
  assert.ok(!hook.includes("<script>"));
  const cta = openDesignSlideHtml(input, 1, "");
  assert.ok(cta.includes("Tot slot"));
  assert.ok(cta.includes("Jouw vraag"));
  assert.ok(cta.includes("<strong>basis</strong><br>"));
  assert.ok(cta.includes("height:1350px"));
});

test("text fingerprint detects edited content, order and photos", () => {
  const original = openDesignTextHash(input);
  assert.equal(original, openDesignTextHash(structuredClone(input)));
  assert.notEqual(original, openDesignTextHash({ ...input, title: "Nieuwe titel" }));
  assert.notEqual(original, openDesignTextHash({ ...input, slides: [...input.slides].reverse() }));
  assert.notEqual(original, openDesignTextHash({ ...input, photoUrl: "https://example.com/photo.jpg" }));
  assert.equal(openDesignSlideName(9), "slide-10.html");
});

test("a selected personal slide photo overrides the carousel photo without borrowing reference images", () => {
  const withPhotos = { ...input, photoUrl: "https://photos.example.com/sixtine.jpg", slides: [input.slides[0], { ...input.slides[1], photo: "https://photos.example.com/sixtine-detail.jpg" }] };
  const first = openDesignSlideHtml(withPhotos, 0, "");
  assert.ok(first.includes('src="https://photos.example.com/sixtine.jpg"'));
  const second = openDesignSlideHtml(withPhotos, 1, "");
  assert.ok(second.includes('src="https://photos.example.com/sixtine-detail.jpg"'));
  assert.ok(!second.includes('src="https://photos.example.com/sixtine.jpg"'));
  assert.ok(!openDesignSlideHtml(input, 0, "").includes('<img class="photo"'));
});

test("connection rejects remote addresses and hosted deployments before fetching", async () => {
  const before = { url: process.env.OPENDESIGN_DAEMON_URL, vercel: process.env.VERCEL };
  try {
    delete process.env.VERCEL;
    process.env.OPENDESIGN_DAEMON_URL = "http://example.com:7456";
    await assert.rejects(connectOpenDesign, /lokaal http-adres/);
    process.env.VERCEL = "1";
    await assert.rejects(connectOpenDesign, /localhost/);
  } finally {
    if (before.url === undefined) delete process.env.OPENDESIGN_DAEMON_URL; else process.env.OPENDESIGN_DAEMON_URL = before.url;
    if (before.vercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = before.vercel;
  }
});

test("every project receives the fixed brief, original Canva sources and real visual references", async () => {
  const files = await loadOpenDesignBriefingFiles();
  assert.equal(files.length, 6);
  const brief = await loadOpenDesignStyleBrief();
  assert.ok(brief.length <= 5000, "Open Design project instructions allow at most 5000 characters");
  assert.equal(files.find((file) => file.name === "STIJLBRIEFING.md")?.content, brief);
  assert.ok(brief.includes("Noto Serif Display Extra Condensed"));
  assert.ok(brief.includes("Montserrat"));
  assert.ok(brief.includes("Geen stockbeelden, gegenereerde portretten"));
  assert.ok(brief.includes("verwijder de fotoachtergrond"));
  assert.ok(brief.includes("Startbestanden zijn technische placeholders"));
  assert.ok(brief.includes("slides.json"));
  assert.ok(brief.includes("referenties/canva-sjablonen.md"));
  const templates = files.find((file) => file.name === "referenties/canva-sjablonen.md")!.content;
  assert.equal((templates.match(/^\d+\. \[/gm) ?? []).length, 9);
  assert.ok(templates.includes("nog niet visueel geïnspecteerd"));
  assert.ok(templates.includes("DAHXZ5e-kPk"));
  const references = files.filter((file) => file.name.endsWith(".jpg"));
  assert.equal(references.length, 2);
  for (const file of references) {
    assert.equal(file.encoding, "base64");
    assert.equal(Buffer.from(file.content, "base64").subarray(0, 2).toString("hex"), "ffd8");
  }
  const originalFetch = globalThis.fetch;
  const writes: { name: string; encoding: string; content: string }[] = [];
  try {
    globalThis.fetch = async (_url, init) => {
      writes.push(JSON.parse(String(init?.body)));
      return new Response("{}", { status: 200 });
    };
    await writeOpenDesignBriefing({ daemonUrl: "http://127.0.0.1:7456", webUrl: null }, "project");
    assert.deepEqual(writes, files);
    assert.ok(writes.every((file) => !file.name.endsWith(".html") && file.name !== "slides.json"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("design status distinguishes billing failure and rejects a run belonging to another project", async () => {
  const originalFetch = globalThis.fetch;
  const connection = { daemonUrl: "http://127.0.0.1:7456", webUrl: null };
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ id: "run", projectId: "project", status: "failed", errorCode: "AMR_INSUFFICIENT_BALANCE" }), { status: 200 });
    const failed = await openDesignRunForProject(connection, "project", "run");
    assert.equal(failed?.needsCredit, true);
    assert.ok(failed?.error?.includes("onvoldoende AMR-tegoed"));
    assert.equal(await openDesignRunForProject(connection, "another-project", "run"), null);
    globalThis.fetch = async () => new Response(JSON.stringify({ runs: [] }), { status: 200 });
    assert.equal(await openDesignRunForProject(connection, "project"), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
