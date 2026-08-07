import { PrismaClient } from "@prisma/client";
import { normalizeRecipeTags } from "../src/lib/recipe-tags";

const prisma = new PrismaClient();

async function main() {
  const recipes = await prisma.recipe.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      tags: true,
      ingredients: true,
      carbs: true,
    },
  });

  let updated = 0;
  const changed: Array<{ title: string; before: string[]; after: string[] }> = [];

  for (const recipe of recipes) {
    const nextTags = normalizeRecipeTags({
      title: recipe.title,
      description: recipe.description,
      tags: recipe.tags,
      ingredients: recipe.ingredients as Array<{ ingredient?: string; amount?: string; unit?: string }>,
      carbs: recipe.carbs,
    });

    const before = [...recipe.tags].sort();
    const after = [...nextTags].sort();

    if (JSON.stringify(before) === JSON.stringify(after)) {
      continue;
    }

    await prisma.recipe.update({
      where: { id: recipe.id },
      data: { tags: after },
    });

    updated += 1;
    changed.push({ title: recipe.title, before, after });
  }

  console.log(JSON.stringify({ updated, changed: changed.slice(0, 80) }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
