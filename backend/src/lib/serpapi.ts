import { DetectedFoodItem } from "./gemini";
import { extractNutritionEstimate } from "./nutrition-extract";

export class SerpApiError extends Error {}

interface SerpApiResponse {
  answer_box?: Record<string, unknown>;
  knowledge_graph?: Record<string, unknown>;
  organic_results?: { snippet?: string }[];
}

export async function analyzeFoodTextWithSerpApi(description: string): Promise<DetectedFoodItem[]> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    throw new SerpApiError("SerpApi is not configured on the server");
  }

  const params = new URLSearchParams({
    engine: "google",
    q: `${description} calories protein carbs fat nutrition facts`,
    api_key: apiKey,
  });

  let res: Response;
  try {
    res = await fetch(`https://serpapi.com/search?${params.toString()}`);
  } catch {
    throw new SerpApiError("Could not reach SerpApi");
  }

  if (!res.ok) {
    if (res.status === 429) throw new SerpApiError("SerpApi rate limit reached");
    throw new SerpApiError("SerpApi request failed");
  }

  const data = (await res.json()) as SerpApiResponse;
  const chunks: string[] = [];
  if (data.answer_box) chunks.push(JSON.stringify(data.answer_box));
  if (data.knowledge_graph) chunks.push(JSON.stringify(data.knowledge_graph));
  for (const r of data.organic_results ?? []) {
    if (r.snippet) chunks.push(r.snippet);
  }
  const text = chunks.join("\n");

  const estimate = extractNutritionEstimate(text);
  if (!estimate) {
    throw new SerpApiError("SerpApi couldn't find nutrition info for that");
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
