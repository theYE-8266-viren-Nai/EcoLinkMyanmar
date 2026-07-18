import { z } from "zod";

type OpenRouterResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

function parseJsonContent(content: string) {
  const trimmed = content.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("OpenRouter returned a response without JSON content.");
  return JSON.parse(match[0]);
}

export async function generateOpenRouterStructured<T>(input: {
  apiKey: string;
  model: string;
  prompt: string;
  file: File;
  outputSchema: z.ZodType<T>;
}): Promise<T> {
  const imageData = Buffer.from(await input.file.arrayBuffer()).toString("base64");
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "EcoLink AI Scanner",
    },
    body: JSON.stringify({
      model: input.model,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: input.prompt },
          {
            type: "image_url",
            image_url: { url: `data:${input.file.type};base64,${imageData}` },
          },
        ],
      }],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  const payload = await response.json() as OpenRouterResponse;
  if (!response.ok) {
    const error = new Error(payload.error?.message ?? "OpenRouter request failed") as Error & { statusCode: number };
    error.statusCode = response.status;
    throw error;
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter returned an empty structured response.");
  return input.outputSchema.parse(parseJsonContent(content));
}
