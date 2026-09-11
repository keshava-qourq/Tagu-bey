export interface NutritionEstimate {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

// Matches "g", "gram", or "grams" - NOT `g(?:rams)?`, which only matches "g"
// or "grams" and silently fails on the singular "gram" (breaking the \b that
// follows), causing the whole clause to be skipped in favor of a looser,
// wrong match further down the text.
const GRAM_UNIT = "g(?:ram)?s?";

// Deliberately tight adjacency (only whitespace/colon/dash/"of" between the
// label and the number) rather than scanning an arbitrary N-char window.
// Search snippets mash together multiple sentences and even multiple
// disagreeing sources, so a loose window reliably grabs the wrong number
// from an adjacent clause (e.g. "of protein, 27 grams of carbs" matching
// "27" for protein). A tight match can miss an oddly-phrased mention, but
// that surfaces as a 0 the user can fill in - better than a wrong number
// presented with false confidence.
function extractGrams(text: string, keyword: string): number {
  // "12g protein" / "12 g of protein" / "12 grams protein"
  let m = text.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${GRAM_UNIT}\\s*(?:of\\s*)?${keyword}\\b`, "i"));
  if (m) return parseFloat(m[1]);

  // "protein: 12g" / "protein 12g" / "protein - 12 grams"
  m = text.match(new RegExp(`${keyword}\\b\\s*[:\\-]?\\s*(\\d+(?:\\.\\d+)?)\\s*${GRAM_UNIT}\\b`, "i"));
  if (m) return parseFloat(m[1]);

  return NaN;
}

function extractCalories(text: string): number {
  let m = text.match(/(\d+(?:\.\d+)?)\s*(?:kcal|calories?|cal)\b/i);
  if (m) return parseFloat(m[1]);

  m = text.match(/calories?\b\s*[:\-]?\s*(\d+(?:\.\d+)?)/i);
  if (m) return parseFloat(m[1]);

  return NaN;
}

/**
 * Best-effort extraction of a calorie/macro estimate from unstructured search
 * result text (a Tavily answer, or SerpApi snippets/knowledge graph text).
 * Returns null if no calorie figure could be found at all, since a fallback
 * result with 0 calories would be worse than surfacing an error.
 */
export function extractNutritionEstimate(text: string): NutritionEstimate | null {
  const calories = extractCalories(text);
  if (Number.isNaN(calories)) return null;

  const proteinG = extractGrams(text, "protein");
  const carbsG = extractGrams(text, "carb(?:ohydrate)?s?");
  const fatG = extractGrams(text, "fat");

  return {
    calories,
    proteinG: Number.isNaN(proteinG) ? 0 : proteinG,
    carbsG: Number.isNaN(carbsG) ? 0 : carbsG,
    fatG: Number.isNaN(fatG) ? 0 : fatG,
  };
}
