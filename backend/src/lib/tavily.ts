import { DetectedFoodItem } from "./gemini";
import { extractNutritionEstimate } from "./nutrition-extract";

export class TavilyError extends Error {}

interface TavilyResponse {
  answer?: string;
  results?: { content?: string }[];
}

export async function analyzeFoodTextWithTavily(description: string): Promise<DetectedFoodItem[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new TavilyError("Tavily is not configured on the server");
  }

  let res: Response;
  try {
    res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: `${description} - total calories, protein, carbs and fat in grams`,
        search_depth: "basic",
        include_answer: true,
        max_results: 5,
      }),
    });
  } catch {
    throw new TavilyError("Could not reach Tavily");
  }

  if (!res.ok) {
    if (res.status === 429) throw new TavilyError("Tavily rate limit reached");
    throw new TavilyError("Tavily request failed");
  }

  const data = (await res.json()) as TavilyResponse;
  const text = [data.answer, ...(data.results ?? []).map((r) => r.content)].filter(Boolean).join("\n");

  const estimate = extractNutritionEstimate(text);
  if (!estimate) {
    throw new TavilyError("Tavily couldn't find nutrition info for that");
  }

  return [
    {
      name: description,
      servingSize: 1,
      servingUnit: "serving",
      quantity: 1,
      ...estimate,
    },
  ];
}
