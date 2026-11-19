import { useRef, useState } from 'react';

import { useShake } from '@/hooks/use-shake';
import { getRandomRecipe } from '@/services/mealdb';
import { useSettings } from '@/view-models/settings';

type SurpriseRecipeOptions = {
  /** Called with the random recipe's id; the screen decides where to show it. */
  onFound: (recipeId: string) => void;
  onError: (error: unknown) => void;
};

/**
 * "Surprise me": fetches a random recipe from TheMealDB, either from a button or by shaking the
 * phone (the accelerometer), unless shaking is turned off in the settings.
 */
export function useSurpriseRecipe({ onFound, onError }: SurpriseRecipeOptions) {
  const { settings } = useSettings();
  const [isPicking, setIsPicking] = useState(false);
  // A ref as well as state, because several shakes can arrive before React re-renders.
  const isPickingRef = useRef(false);

  const surprise = async () => {
    if (isPickingRef.current) {
      return;
    }
    isPickingRef.current = true;
    setIsPicking(true);
    try {
      const recipe = await getRandomRecipe();
      onFound(recipe.id);
    } catch (error) {
      onError(error);
    } finally {
      isPickingRef.current = false;
      setIsPicking(false);
    }
  };

  const hasAccelerometer = useShake(() => void surprise(), settings.shakeForRecipe);

  return {
    surprise,
    isPicking,
    /** Whether shaking works right now, so the screen can mention it. */
    canShake: hasAccelerometer && settings.shakeForRecipe,
  };
}
