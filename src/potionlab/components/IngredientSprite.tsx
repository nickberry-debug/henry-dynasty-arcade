// Shared sprite components for Potion Lab — render pixel-art from the
// Kenney food-kit pack instead of emoji. Used across the shelf,
// cauldron, recipes, results, and discoveries.
import type { Ingredient } from "../data/ingredients";
import type { Recipe } from "../data/recipes";
import { ingredientSpriteUrl, recipeSpriteUrl } from "../sprites";

interface IngredientSpriteProps {
  ingredient: Pick<Ingredient, "id" | "name" | "element" | "color">;
  size?: number;
  /** Drop-shadow under the sprite for grounded depth. */
  ground?: boolean;
  className?: string;
}

export function IngredientSprite({ ingredient, size = 36, ground = true, className }: IngredientSpriteProps) {
  const url = ingredientSpriteUrl(ingredient.id, ingredient.element);
  return (
    <img
      src={url}
      alt={ingredient.name}
      width={size}
      height={size}
      className={className}
      style={{
        width: size, height: size,
        objectFit: "contain",
        // Each ingredient gets a soft color-tinted shadow keyed off its
        // existing brand color, plus a grounded ellipse-style drop so
        // the sprite reads "sitting on the shelf" not "floating."
        filter: ground
          ? `drop-shadow(0 2px 3px ${ingredient.color}66) drop-shadow(0 1px 2px rgba(0,0,0,0.4))`
          : `drop-shadow(0 1px 2px ${ingredient.color}55)`,
        imageRendering: "auto",
      }}
      draggable={false}
    />
  );
}

interface RecipeSpriteProps {
  recipe: Pick<Recipe, "id" | "name" | "color">;
  size?: number;
  ground?: boolean;
  className?: string;
}

export function RecipeSprite({ recipe, size = 48, ground = true, className }: RecipeSpriteProps) {
  const url = recipeSpriteUrl(recipe.id);
  return (
    <img
      src={url}
      alt={recipe.name}
      width={size}
      height={size}
      className={className}
      style={{
        width: size, height: size,
        objectFit: "contain",
        filter: ground
          ? `drop-shadow(0 3px 5px ${recipe.color}77) drop-shadow(0 1px 2px rgba(0,0,0,0.5))`
          : `drop-shadow(0 1px 3px ${recipe.color}66)`,
        imageRendering: "auto",
      }}
      draggable={false}
    />
  );
}
