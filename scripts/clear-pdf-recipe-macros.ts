import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const recipes = await prisma.recipe.findMany({
    where: {
      imageUrl: {
        startsWith: "/uploads/pdf-recipes/",
      },
    },
    select: {
      id: true,
      title: true,
      imageUrl: true,
      calories: true,
      protein: true,
      carbs: true,
      fat: true,
    },
  });

  const affectedIds = recipes
    .filter((recipe) =>
      recipe.calories !== null ||
      recipe.protein !== null ||
      recipe.carbs !== null ||
      recipe.fat !== null
    )
    .map((recipe) => recipe.id);

  if (affectedIds.length > 0) {
    await prisma.recipe.updateMany({
      where: {
        id: { in: affectedIds },
      },
      data: {
        calories: null,
        protein: null,
        carbs: null,
        fat: null,
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        pdfRecipesFound: recipes.length,
        recipesCleared: affectedIds.length,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
