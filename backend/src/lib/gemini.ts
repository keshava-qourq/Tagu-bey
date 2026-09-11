const MODEL = "gemini-2.5-flash";

export class GeminiError extends Error {}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

async function callGemini<T>(parts: GeminiPart[], responseSchema: object): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError("Gemini is not configured on the server");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.2,
        },
      }),
    });
  } catch {
    throw new GeminiError("Could not reach Gemini");
  }

  if (!res.ok) {
    if (res.status === 429) throw new GeminiError("Gemini rate limit reached, please try again shortly");
    throw new GeminiError("Gemini request failed");
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new GeminiError("Gemini returned an unexpected response");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new GeminiError("Gemini returned an unparseable response");
  }
}

export interface DetectedFoodItem {
  name: string;
  servingSize: number;
  servingUnit: string;
  quantity: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

const FOOD_ITEM_SCHEMA = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    servingSize: { type: "NUMBER" },
    servingUnit: { type: "STRING" },
    quantity: { type: "NUMBER" },
    calories: { type: "NUMBER" },
    proteinG: { type: "NUMBER" },
    carbsG: { type: "NUMBER" },
    fatG: { type: "NUMBER" },
  },
  required: ["name", "servingSize", "servingUnit", "quantity", "calories", "proteinG", "carbsG", "fatG"],
};

const FOOD_LIST_SCHEMA = {
  type: "OBJECT",
  properties: {
    items: { type: "ARRAY", items: FOOD_ITEM_SCHEMA },
  },
  required: ["items"],
};

const NUTRITION_INSTRUCTIONS = `You are a nutrition estimation assistant embedded in a calorie tracking app.
For each distinct food you identify, estimate realistic values for a home-cooked or restaurant portion.
- "servingSize" and "servingUnit" describe one serving as you'd naturally describe it (e.g. 1 "piece", 100 "g", 1 "cup").
- "quantity" is how many of that serving are present in what was described/shown (usually 1).
- "calories", "proteinG", "carbsG", "fatG" are the totals for quantity servings combined (not per single serving) — i.e. the totals for everything you identified of that food.
- Keep food names short and natural (e.g. "Grilled Chicken Breast", "Steamed Rice").
- Only include foods that are actually present. If nothing edible is identifiable, return an empty items array.
- Give your best realistic estimate even with incomplete information — never refuse.`;

export async function analyzeFoodPhoto(imageBase64: string, mimeType: string): Promise<DetectedFoodItem[]> {
  const result = await callGemini<{ items: DetectedFoodItem[] }>(
    [
      { text: `${NUTRITION_INSTRUCTIONS}\n\nIdentify each distinct food in this photo and estimate its nutrition.` },
      { inlineData: { mimeType, data: imageBase64 } },
    ],
    FOOD_LIST_SCHEMA
  );
  return result.items ?? [];
}

export async function analyzeFoodText(description: string): Promise<DetectedFoodItem[]> {
  const result = await callGemini<{ items: DetectedFoodItem[] }>(
    [
      {
        text: `${NUTRITION_INSTRUCTIONS}\n\nParse the following food description into structured food entries. Description: "${description}"`,
      },
    ],
    FOOD_LIST_SCHEMA
  );
  return result.items ?? [];
}

export async function generateDailyInsight(params: {
  calories: number;
  calorieGoal: number;
  proteinG: number;
  proteinGoalG: number;
  carbsG: number;
  carbsGoalG: number;
  fatG: number;
  fatGoalG: number;
  mealsLogged: number;
}): Promise<string> {
  const result = await callGemini<{ insight: string }>(
    [
      {
        text: `You are a friendly, concise nutrition coach inside a calorie tracking app. Based on today's progress so far, write ONE short, encouraging, specific insight or tip (max 2 sentences, no markdown, no emoji spam - at most one emoji).
Today's progress:
- Calories: ${Math.round(params.calories)} / ${Math.round(params.calorieGoal)} kcal
- Protein: ${Math.round(params.proteinG)} / ${Math.round(params.proteinGoalG)} g
- Carbs: ${Math.round(params.carbsG)} / ${Math.round(params.carbsGoalG)} g
- Fat: ${Math.round(params.fatG)} / ${Math.round(params.fatGoalG)} g
- Meals logged: ${params.mealsLogged}

If very little has been logged, gently encourage logging. If a macro is notably behind or over, mention it specifically and give one practical suggestion.`,
      },
    ],
    {
      type: "OBJECT",
      properties: { insight: { type: "STRING" } },
      required: ["insight"],
    }
  );
  return result.insight;
}
