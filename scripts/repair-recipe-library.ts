/** Reviewed recovery for Simply Receptenbundel.pdf. Dry run by default.
 * node --env-file=.env --env-file=.env.local --import tsx scripts/repair-recipe-library.ts [--apply]
 * First run extract-recipe-bundle-images.py into .tmp/recipe-bundle-originals.
 * Add --photos-only to update only the existing bundle images.
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { uploadToR2, isR2Configured } from '../src/lib/r2';
import { normalizeRecipeTags } from '../src/lib/recipe-tags';
import recovered from './data/recovered-pdf-recipes.json';
import images from './data/recipe-bundle-images.json';

const db = new PrismaClient();
const apply = process.argv.includes('--apply');
const photosOnly = process.argv.includes('--photos-only');
const noSourcePhoto = new Set(['mugcake', 'muhammara']);
const fingerprint = (r: { ingredients: unknown; instructions: unknown }) =>
  JSON.stringify([r.ingredients, r.instructions]);

async function retry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try { return await operation(); }
    catch (error) { if (attempt >= 3) throw error; }
  }
}

async function main() {
  const rows = await db.recipe.findMany({ orderBy: { createdAt: 'asc' } });
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!Array.isArray(row.ingredients) || !row.ingredients.length || !Array.isArray(row.instructions) || !row.instructions.length) continue;
    const key = fingerprint(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const pairs = (photosOnly ? [] : Array.from(groups.values())).filter(g => g.length > 1).flatMap(group => {
    const keep = group.find(r => images.some(i => i.slug === r.slug)) ?? group.find(r => r.imageUrl) ?? group[0];
    return group.filter(r => r.id !== keep.id).map(remove => ({ keep, remove }));
  });
  const missing = (photosOnly ? [] : recovered).filter(r => !rows.some(x => x.slug === r.slug));
  // Every image mapping must resolve before writes; only known source-less pages may lack a file.
  for (const item of images) {
    if (!rows.some(r => r.slug === item.slug) && !missing.some(r => r.slug === item.slug)) throw new Error(`Unknown recipe: ${item.slug}`);
    if (!noSourcePhoto.has(item.slug) && !existsSync(`.tmp/recipe-bundle-originals/${item.slug}.jpg`)) throw new Error(`Missing extracted photo: ${item.slug}`);
  }
  console.log(JSON.stringify({ add: missing.map(r => r.title), merge: pairs.map(p => ({ keep: p.keep.slug, remove: p.remove.slug, identicalIngredientsAndInstructions: true })), photos: images.length - noSourcePhoto.size, noSourcePhoto: Array.from(noSourcePhoto) }, null, 2));
  if (!apply) return;
  if (!isR2Configured()) throw new Error('R2 not configured');
  const backup = `.tmp-recipe-repair-backup-${Date.now()}.json`;
  writeFileSync(backup, JSON.stringify({ recipes: rows, groceryItems: await db.groceryItem.findMany({ where: { recipeId: { not: null } } }), mealPlanItems: await db.mealPlanItem.findMany({ where: { recipeId: { not: null } } }), favorites: await db.userFavoriteRecipe.findMany({ where: { recipeId: { not: null } } }) }, null, 2), { mode: 0o600 });
  console.log(`Backup: ${backup}`);
  const uploaded = new Map<string, string>();
  // Upload and verify before changing database references. Content-addressed keys make reruns safe.
  for (const item of images) {
    if (noSourcePhoto.has(item.slug)) continue;
    const body = readFileSync(`.tmp/recipe-bundle-originals/${item.slug}.jpg`);
    const hash = createHash('sha256').update(body).digest('hex').slice(0, 12);
    const { url } = await retry(() => uploadToR2({ key: `recipe-bundle/${item.slug}-${hash}.jpg`, body, contentType: 'image/jpeg' }));
    const res = await retry(() => fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15000) }));
    if (!res.ok || !res.headers.get('content-type')?.startsWith('image/')) throw new Error(`Photo not public: ${item.slug} (${res.status})`);
    uploaded.set(item.slug, url);
    if (uploaded.size % 20 === 0) console.log(`Uploaded and verified ${uploaded.size} photos`);
  }
  await db.$transaction(async tx => {
    for (const recipe of missing) {
      const { page, ...data } = recipe;
      await tx.recipe.create({ data: { ...data, imageUrl: uploaded.get(recipe.slug)!, tags: normalizeRecipeTags(data), isPublished: true } });
    }
    for (const [slug, imageUrl] of Array.from(uploaded)) {
      await tx.recipe.update({ where: { slug }, data: { imageUrl } });
    }
    for (const slug of Array.from(noSourcePhoto)) {
      // The prior importer generated blank/text crops for these pages, not photos.
      await tx.recipe.updateMany({ where: { slug, imageUrl: { startsWith: '/uploads/pdf-recipes/' } }, data: { imageUrl: null } });
    }
    for (const { keep, remove } of pairs) {
      const currentKeep = await tx.recipe.findUniqueOrThrow({ where: { id: keep.id } });
      const currentRemove = await tx.recipe.findUniqueOrThrow({ where: { id: remove.id } });
      if (fingerprint(currentKeep) !== fingerprint(currentRemove)) throw new Error(`Recipe changed during repair: ${remove.slug}`);
      await tx.groceryItem.updateMany({ where: { recipeId: remove.id }, data: { recipeId: keep.id } });
      await tx.mealPlanItem.updateMany({ where: { recipeId: remove.id }, data: { recipeId: keep.id } });
      for (const favorite of await tx.userFavoriteRecipe.findMany({ where: { recipeId: remove.id } })) {
        const existing = await tx.userFavoriteRecipe.findUnique({ where: { userId_recipeId: { userId: favorite.userId, recipeId: keep.id } } });
        if (existing) await tx.userFavoriteRecipe.delete({ where: { id: favorite.id } });
        else await tx.userFavoriteRecipe.update({ where: { id: favorite.id }, data: { recipeId: keep.id } });
      }
      await tx.recipe.delete({ where: { id: remove.id } });
    }
  }, { timeout: 60000 });
  const result = await db.recipe.findMany();
  console.log(JSON.stringify({ total: result.length, published: result.filter(r => r.isPublished).length, withoutPhotos: result.filter(r => !r.imageUrl).map(r => r.title), localPhotoUrls: result.filter(r => r.imageUrl?.startsWith('/uploads/')).length }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
