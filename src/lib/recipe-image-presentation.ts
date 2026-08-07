type RecipeImagePresentation = {
  detailClipPath?: string;
  cardClipPath?: string;
  objectPosition?: string;
};

const PDF_RECIPE_IMAGE_PRESENTATION: Record<string, RecipeImagePresentation> = {
  pittigeovenschotelmetpompoenenkippengehakt: {
    detailClipPath: "inset(0 0 31% 0)",
    cardClipPath: "inset(0 0 28% 0)",
    objectPosition: "center top",
  },
  "quinoasalademetpompoen-kerstomaat-babyspinazie-zwarte-olijven-noten-4-personen": {
    detailClipPath: "inset(0 0 20% 0)",
    cardClipPath: "inset(4% 0 20% 0)",
    objectPosition: "center 18%",
  },
  "quinoasalademetgegrildetofueneengember-citroen-dressing-4-personen": {
    detailClipPath: "inset(0 0 20% 0)",
    cardClipPath: "inset(4% 0 20% 0)",
    objectPosition: "center 20%",
  },
};

export function getRecipeImagePresentation(slug: string, imageUrl?: string | null) {
  const isPdfRecipeImage = imageUrl?.startsWith("/uploads/pdf-recipes/") ?? false;
  const config = PDF_RECIPE_IMAGE_PRESENTATION[slug];

  if (!isPdfRecipeImage || !config) {
    return {
      isPdfRecipeImage: false,
      detailClipPath: undefined,
      cardClipPath: undefined,
      objectPosition: undefined,
    };
  }

  return {
    isPdfRecipeImage: true,
    detailClipPath: config.detailClipPath,
    cardClipPath: config.cardClipPath,
    objectPosition: config.objectPosition,
  };
}
